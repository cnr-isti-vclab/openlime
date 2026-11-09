import { SceneValidationError, lensControllerId } from './SceneSession.js';
import { adapterFor, validateRendererOptions, validatePreset } from './adapters.js';

const FIT_POLICIES = ['active', 'all', 'declared'];

/** Every layer node in depth-first order, including ones that are currently hidden. */
function structuralLeaves(session) {
	const leaves = [];
	const walk = (id) => {
		const node = session.getNode(id);
		if (!node) return;
		if (node.type === 'layer') leaves.push(node);
		for (const childId of node.children) walk(childId);
	};
	walk('');
	return leaves;
}

/** Copy x, y, a, z onto the layer transform. Does not replace the Transform object. */
function assignTransform(layer, similarity) {
	if (!layer.transform) layer.transform = {};
	layer.transform.x = similarity.x;
	layer.transform.y = similarity.y;
	layer.transform.a = similarity.a;
	layer.transform.z = similarity.z;
}

function emptyBox() {
	return { xLow: Infinity, yLow: Infinity, xHigh: -Infinity, yHigh: -Infinity, empty: true };
}

function mergePoint(box, point) {
	box.xLow = Math.min(box.xLow, point.x);
	box.yLow = Math.min(box.yLow, point.y);
	box.xHigh = Math.max(box.xHigh, point.x);
	box.yHigh = Math.max(box.yHigh, point.y);
	box.empty = false;
}

function centerBox(width, height) {
	return { xLow: -width / 2, yLow: -height / 2, xHigh: width / 2, yHigh: height / 2 };
}

function asFitBox(box) {
	if (!box) return null;
	const fitted = { xLow: box.xLow, yLow: box.yLow, xHigh: box.xHigh, yHigh: box.yHigh };
	Object.defineProperty(fitted, 'width', { value() { return this.xHigh - this.xLow; } });
	Object.defineProperty(fitted, 'height', { value() { return this.yHigh - this.yLow; } });
	return fitted;
}

function finiteBox(value) {
	if (!value) return null;
	if (Number.isFinite(value.width) && Number.isFinite(value.height) && value.width > 0 && value.height > 0) {
		return centerBox(value.width, value.height);
	}
	const { xLow, yLow, xHigh, yHigh } = value;
	if ([xLow, yLow, xHigh, yHigh].every(Number.isFinite) && xLow < xHigh && yLow < yHigh) {
		return { xLow, yLow, xHigh, yHigh };
	}
	return null;
}

/**
 * Projects effective leaves onto a canvas and mounts enabled lenses.
 * Each main leaf gets its own layer. A lens foreground that shares a source
 * calls derive(), so the two contexts do not share a shader object.
 * Lens children stay on the lens and out of Canvas.layers.
 */
class SceneProjection {
	constructor(session, target, options = {}) {
		if (typeof options.createLayer !== 'function') {
			throw new Error('SceneProjection needs a createLayer function.');
		}
		if (!target || typeof target.layers !== 'object' || target.layers == null) {
			throw new Error('SceneProjection needs a target with a layers object.');
		}
		this.session = session;
		this.target = target;
		this.createLayer = options.createLayer;
		this.createController = options.createController || null;
		this.releaseController = options.releaseController || null;
		this.createLens = options.createLens || (spec => ({
			type: 'lens',
			overlay: true,
			layers: [],
			camera: spec.camera || null,
			activeLayerIndex: 0,
			center: [0, 0],
			radius: 100,
			setCenter(x, y) { this.center = [x, y]; },
			setRadius(radius) { this.radius = radius; },
			setActiveLayer(index) { this.activeLayerIndex = index; }
		}));
		this.resolveUrl = options.resolveUrl || (source => source.uri || '');
		this.getLocalBounds = options.getLocalBounds || null;
		this.byNode = new Map();
		this.bySource = new Map();
		this.owners = new Map();
		this.lenses = new Map();
		this.lensChildren = new Map();
		this.fitBounds = null;
		this.redraws = 0;
		this.reconcile();
		this.unsubscribe = session.addListener(() => this.reconcile());
	}

	/** The canvas layer for a qualified id, or null if it has not been created. */
	layer(qualifiedId) {
		return this.byNode.get(qualifiedId)?.layer || null;
	}

	/** Shared source entry for this leaf. Several leaves may point at the same record. */
	sourceRecord(qualifiedId) {
		const entry = this.byNode.get(qualifiedId);
		return entry ? this.bySource.get(entry.key) || null : null;
	}

	/** Pixel space to scene space: assetToLocal first, then the node world transform. */
	canvasTransform(node) {
		const world = this.session.worldTransform(node.qualifiedId);
		return node.assetToLocal ? node.assetToLocal.compose(world) : world;
	}

	/** Rebuild the draw list from the graph and request one redraw. Hidden leaves stay cached. */
	reconcile() {
		const policy = this.session.scene.viewer?.fitPolicy || 'active';
		if (!FIT_POLICIES.includes(policy)) {
			throw new SceneValidationError([{
				severity: 'error',
				code: 'FIT_POLICY',
				path: '/viewer/fitPolicy',
				message: `Unknown fit policy "${policy}".`
			}]);
		}
		const diagnostics = [];
		const leaves = structuralLeaves(this.session);
		const planned = leaves.map((node, zindex) => this.planLeaf(node, zindex, diagnostics));
		const lensPlans = this.planLenses(diagnostics);
		if (diagnostics.some(item => item.severity === 'error')) throw new SceneValidationError(diagnostics);
		this.applyBackgrounds(planned, lensPlans);

		const wanted = new Set(planned.map(item => item.node.qualifiedId));
		for (const id of [...this.byNode.keys()]) {
			if (!wanted.has(id)) this.drop(id);
		}

		for (const item of planned) {
			let entry = this.byNode.get(item.node.qualifiedId);
			if (!entry || entry.key !== item.key) {
				if (entry) this.drop(item.node.qualifiedId);
				const layer = this.materialize(item, false);
				entry = { layer, key: item.key };
				this.byNode.set(item.node.qualifiedId, entry);
				this.rememberSource(item, item.node.qualifiedId);
				this.attach(item.node.qualifiedId, layer);
			}
			assignTransform(entry.layer, item.similarity);
			entry.layer.visible = item.visible;
			entry.layer.zindex = item.zindex;
			this.applyPreset(entry.layer, item);
		}

		const activeLensIds = new Set(lensPlans.filter(lens => lens.active).map(lens => lens.canvasId));
		for (const id of [...this.lenses.keys()]) {
			if (!activeLensIds.has(id)) this.dropLens(id);
		}
		for (const lens of lensPlans) {
			if (lens.active) this.syncLens(lens);
		}

		this.fitBounds = this.computeFit(planned);
		this.applyFit(planned);
		this.redraws += 1;
		if (typeof this.target.requestRedraw === 'function') this.target.requestRedraw();
		if (typeof this.target.emit === 'function') this.target.emit('update');
	}

	/** Resolve adapter, source key, visibility, and the layer options for one leaf. */
	planLeaf(node, zindex, diagnostics) {
		const asset = this.session.assetByInstance.get(node.instanceId);
		const spec = asset.nodes[node.nodeId];
		const renderer = spec.renderer || {};
		const path = '/nodes/' + node.nodeId + '/renderer';
		const adapter = adapterFor(renderer.type);
		if (!adapter) {
			diagnostics.push({
				severity: 'error',
				code: 'RENDERER_UNKNOWN',
				path: path + '/type',
				message: `No adapter for renderer "${renderer.type}".`
			});
			return null;
		}
		validateRendererOptions(adapter, renderer.options, path, diagnostics);
		const source = asset.sources?.[renderer.source];
		if (!source || !source.uri) {
			diagnostics.push({
				severity: 'error',
				code: 'MISSING_SOURCE',
				path: path + '/source',
				message: `Layer "${node.nodeId}" needs a source with a uri.`
			});
			return null;
		}
		if (diagnostics.some(item => item.severity === 'error')) return null;

		const pixelOptions = adapter.pixelOptions(renderer.options || {});
		const uri = this.resolveUrl(source, asset);
		const layout = source.layout?.type || source.layout || 'image';
		const key = JSON.stringify({
			type: adapter.type,
			uri,
			revision: source.revision || '',
			layout,
			options: pixelOptions
		});
		const similarity = this.canvasTransform(node);
		const visible = this.session.effectiveEnabled(node.qualifiedId);
		const preset = this.presetFor(node, null, diagnostics);
		if (!preset) return null;
		return {
			node,
			adapter,
			key,
			similarity,
			visible,
			zindex,
			source,
			preset,
			record: { type: adapter.type, uri, revision: source.revision || '', layout, options: pixelOptions },
			options: {
				type: adapter.layerType,
				url: uri,
				layout,
				label: spec.label,
				visible,
				zindex,
				normals: pixelOptions.normals,
				transform: { x: similarity.x, y: similarity.y, a: similarity.a, z: similarity.z }
			}
		};
	}

	/** The document preset for a layer, plus control overrides. Null when the preset is not applicable. */
	presetFor(node, override, diagnostics) {
		const assetState = this.session.state.assets[node.instanceId];
		const spec = this.session.assetByInstance.get(node.instanceId).nodes[node.nodeId];
		const adapter = adapterFor(spec.renderer?.type);
		const renderings = node.renderings || [];
		const renderingId = override?.rendering || assetState?.layers?.[node.nodeId]?.rendering || node.defaultRendering;
		const preset = renderings.find(item => item.id === renderingId);
		if (!preset || !adapter) {
			diagnostics.push({
				severity: 'error',
				code: 'PRESET_UNKNOWN',
				path: '/nodes/' + node.nodeId + '/renderings',
				message: `Layer "${node.nodeId}" has no preset "${renderingId}".`
			});
			return null;
		}
		validatePreset(adapter, preset, '/nodes/' + node.nodeId + '/renderings/' + preset.id, diagnostics);
		const stateControls = assetState?.layers?.[node.nodeId]?.renderingState?.[preset.id]?.controls || {};
		const slotControls = override?.controls || {};
		return {
			...preset,
			shader: preset.shader || adapter.defaultShader,
			controls: { ...(preset.controls || {}), ...stateControls, ...slotControls }
		};
	}

	/** Enabled lenses whose host is effectively active replace that host's main preset. */
	planLenses(diagnostics) {
		const plans = [];
		for (const instance of this.session.scene.assets || []) {
			const asset = this.session.assetByInstance.get(instance.id);
			const lensState = this.session.state.assets[instance.id]?.lenses || {};
			for (const [profileId, profile] of Object.entries(asset?.lensProfiles || {})) {
				const state = lensState[profileId];
				if (!state) continue;
				const hostQualifiedId = instance.id + '/' + profile.host;
				const background = this.planChoice(instance.id, profile, state, 'background', diagnostics);
				const foreground = this.planChoice(instance.id, profile, state, 'foreground', diagnostics);
				plans.push({
					canvasId: 'lens:' + instance.id + '/' + profileId,
					profileId,
					instanceId: instance.id,
					hostQualifiedId,
					active: state.enabled === true && this.session.effectiveEnabled(hostQualifiedId),
					background,
					foreground,
					geometry: this.sceneGeometry(instance.id, state.geometry),
					controller: lensControllerId(profile)
				});
			}
		}
		return plans;
	}

	planChoice(instanceId, profile, state, slot, diagnostics) {
		const choiceId = state[slot];
		const choice = (profile[slot]?.choices || []).find(item => item.id === choiceId);
		if (!choice) {
			diagnostics.push({
				severity: 'error',
				code: 'LENS_CHOICE',
				path: '/lensProfiles/' + profile.host + '/' + slot,
				message: `Lens slot "${slot}" has no choice "${choiceId}".`
			});
			return null;
		}
		const target = choice.target || {};
		if (target.kind === 'subtree') return this.planSubtree(instanceId, target, diagnostics);
		const node = this.session.getNode(instanceId + '/' + target.node);
		if (!node || node.type !== 'layer') return null;
		const described = this.planLeaf(node, 0, diagnostics);
		if (!described) return null;
		const rendering = target.kind === 'active-layer' ? null : target.rendering;
		const preset = this.presetFor(node, {
			rendering,
			controls: state.slotState?.[slot]?.controls || {}
		}, diagnostics);
		if (!preset) return null;
		return { ...described, preset, node };
	}

	/**
	 * Leaves of a group, each with its own layer description.
	 * The group itself is not a layer. Overrides apply only inside this lens context.
	 */
	planSubtree(instanceId, target, diagnostics) {
		const group = this.session.getNode(instanceId + '/' + target.node);
		if (!group || group.type !== 'group') {
			diagnostics.push({
				severity: 'error',
				code: 'LENS_TARGET',
				path: '/lensProfiles',
				message: `Subtree target "${target.node}" must be a group.`
			});
			return null;
		}
		const overrides = target.stateOverrides || {};
		const leaves = [];
		const describe = (node) => {
			const described = this.planLeaf(node, leaves.length, diagnostics);
			if (!described) return;
			const rendering = overrides.layers?.[node.nodeId]?.rendering;
			if (rendering) {
				const preset = this.presetFor(node, { rendering }, diagnostics);
				if (preset) described.preset = preset;
			}
			leaves.push(described);
		};
		const walk = (node) => {
			if (node.type === 'layer') {
				describe(node);
				return;
			}
			if (node.activation?.mode === 'exclusive') {
				const selected = overrides.selections?.[node.nodeId] ?? this.session.state.assets[instanceId].selections[node.nodeId];
				const child = selected ? this.session.getNode(instanceId + '/' + selected) : null;
				if (child && this.subtreeIncludes(instanceId, child, overrides)) walk(child);
				return;
			}
			for (const childId of node.children) {
				const child = this.session.getNode(childId);
				if (child && this.subtreeIncludes(instanceId, child, overrides)) walk(child);
			}
		};
		walk(group);
		return {
			kind: 'subtree',
			node: group,
			leaves,
			key: leaves.map(leaf => leaf.node.qualifiedId + ':' + leaf.key + ':' + leaf.preset?.id).join('|')
		};
	}

	/** Session enabled flags, replaced by a lens override when the target sets one. */
	subtreeIncludes(instanceId, node, overrides) {
		if (node.role !== 'node') return false;
		const override = overrides.enabled?.[node.nodeId];
		if (override === false) return false;
		if (override === true) return true;
		return this.session.state.assets[instanceId].enabled[node.nodeId] !== false;
	}

	/** Map an asset-space lens circle through the instance placement. LayerLens then projects it to the viewport. */
	sceneGeometry(instanceId, geometry) {
		const placement = this.session.worldTransform(instanceId);
		const center = geometry?.center || [0, 0];
		const placed = placement.apply(center[0] || 0, center[1] || 0);
		return { center: [placed.x, placed.y], radius: (geometry?.radius || 0) * placement.z };
	}

	/** The background target occupies the host's canvas slot. The host's own preset is not drawn again. */
	applyBackgrounds(planned, lensPlans) {
		for (const lens of lensPlans) {
			if (!lens.active || !lens.background || lens.background.kind === 'subtree') continue;
			const host = planned.find(item => item && item.node.qualifiedId === lens.hostQualifiedId);
			if (!host) continue;
			const background = lens.background;
			host.key = background.key;
			host.adapter = background.adapter;
			host.similarity = background.similarity;
			host.source = background.source;
			host.record = background.record;
			host.preset = background.preset;
			host.options = {
				...background.options,
				visible: host.visible,
				zindex: host.zindex,
				transform: {
					x: background.similarity.x,
					y: background.similarity.y,
					a: background.similarity.a,
					z: background.similarity.z
				}
			};
		}
	}

	/** Create a primary layer, or derive a second context that must own its shader. */
	materialize(item, derive) {
		const owner = this.owners.get(item.key);
		let layer;
		if (derive && owner) {
			layer = typeof owner.derive === 'function'
				? owner.derive(item.options)
				: this.createLayer({ ...item.options, sourceLayer: owner });
			layer.sourceLayer = layer.sourceLayer || owner;
			if (!layer.shader || layer.shader === owner.shader) layer.shader = null;
		} else {
			layer = this.createLayer(item.options);
			if (!this.owners.has(item.key)) this.owners.set(item.key, layer);
		}
		this.applyPreset(layer, item);
		return layer;
	}

	/** Copy the preset onto the layer. The shader object stays with that layer. */
	applyPreset(layer, item) {
		const preset = item.preset;
		if (!preset) return;
		layer.renderingId = preset.id;
		layer.mode = preset.mode || null;
		layer.shaderId = preset.shader;
		if (!layer.shader) layer.shader = { id: preset.shader, mode: layer.mode };
		layer.shader.id = preset.shader;
		if (typeof layer.shader.setMode === 'function' && preset.mode) layer.shader.setMode(preset.mode);
		else layer.shader.mode = layer.mode;
		layer.parameters = { ...(preset.parameters || {}) };
		const controls = preset.controls || {};
		if (typeof layer.setControl === 'function') {
			for (const [name, value] of Object.entries(controls)) {
				if (layer.controls?.[name]?.current && Array.isArray(value)) layer.setControl(name, value, 0);
			}
		} else {
			layer.controls = { ...controls };
		}
		const adapter = item.adapter;
		if (adapter) {
			for (const [name, value] of Object.entries(preset.parameters || {})) {
				const method = adapter.parameters[name];
				if (method && typeof layer[method] === 'function') layer[method](value);
				else if (method && typeof layer.shader?.[method] === 'function') layer.shader[method](value);
			}
		}
		if (typeof layer.setMode === 'function' && preset.mode) layer.setMode(preset.mode);
	}

	/** One step above the highest projected leaf, shared by every lens overlay. */
	overlayZIndex() {
		let top = -1;
		for (const entry of this.byNode.values()) {
			const z = entry.layer?.zindex;
			if (Number.isFinite(z)) top = Math.max(top, z);
		}
		return top + 1;
	}

	/** Mount one lens overlay. Its foreground child is not registered on the canvas. */
	syncLens(plan) {
		let entry = this.lenses.get(plan.canvasId);
		if (!entry) {
			const lens = this.createLens({ camera: this.target.camera, geometry: plan.geometry });
			if (!Array.isArray(lens.layers)) lens.layers = [];
			entry = { lens, child: null, key: null, controller: null };
			this.lenses.set(plan.canvasId, entry);
			this.attach(plan.canvasId, lens);
			lens.controllerType = plan.controller;
			if (this.createController) {
				entry.controller = this.createController({
					type: plan.controller,
					lensLayer: lens,
					camera: this.target.camera || null,
					canvas: this.target
				});
			}
		}
		const foreground = plan.foreground;
		if (foreground.kind === 'subtree') this.syncSubtree(entry, plan, foreground);
		else this.syncForegroundLayer(entry, plan, foreground);
		entry.lens.layers = [entry.child];
		if (typeof entry.lens.setActiveLayer === 'function') entry.lens.setActiveLayer(0);
		else entry.lens.activeLayerIndex = 0;
		const [x, y] = plan.geometry.center;
		if (typeof entry.lens.setCenter === 'function') entry.lens.setCenter(x, y);
		else entry.lens.center = [x, y];
		// Canvas paints by zindex only. A lens must follow every leaf, or a later instance covers it.
		entry.lens.zindex = this.overlayZIndex();
		if (typeof entry.lens.setRadius === 'function') entry.lens.setRadius(plan.geometry.radius);
		else entry.lens.radius = plan.geometry.radius;
		this.lensChildren.set(plan.canvasId, entry.child);
		if (entry.child.id && this.target.layers[entry.child.id] === entry.child) delete this.target.layers[entry.child.id];
		if (typeof this.target.attachLayerRendererContext === 'function') this.target.attachLayerRendererContext(entry.lens);
	}

	/** One derived layer for a single-layer foreground. */
	syncForegroundLayer(entry, plan, foreground) {
		if (!entry.child || entry.key !== foreground.key) {
			entry.child = this.materialize(foreground, true);
			entry.key = foreground.key;
			this.rememberSource(foreground, plan.canvasId + ':foreground');
		} else {
			this.applyPreset(entry.child, foreground);
		}
		assignTransform(entry.child, foreground.similarity);
		entry.child.visible = true;
	}

	/**
	 * One stack of derived leaves. The stack is what the lens draws.
	 * Neither the stack nor its leaves are registered on the canvas.
	 */
	syncSubtree(entry, plan, foreground) {
		if (!entry.child || entry.child.type !== 'stack' || entry.key !== foreground.key) {
			const layers = foreground.leaves.map(leaf => {
				const layer = this.materialize(leaf, true);
				assignTransform(layer, leaf.similarity);
				layer.visible = true;
				this.rememberSource(leaf, plan.canvasId + ':foreground:' + leaf.node.nodeId);
				return layer;
			});
			entry.child = {
				type: 'stack',
				id: plan.canvasId + ':stack',
				layers,
				draw(transform, viewport) {
					let done = true;
					for (const layer of this.layers) {
						if (layer.visible === false) continue;
						if (typeof layer.draw === 'function') done = layer.draw(transform, viewport) && done;
					}
					return done;
				}
			};
			entry.key = foreground.key;
		} else {
			foreground.leaves.forEach((leaf, index) => {
				const layer = entry.child.layers[index];
				this.applyPreset(layer, leaf);
				assignTransform(layer, leaf.similarity);
				layer.visible = true;
			});
		}
	}

	dropLens(id) {
		const entry = this.lenses.get(id);
		if (entry?.controller && this.releaseController) this.releaseController(entry.controller);
		this.lenses.delete(id);
		this.lensChildren.delete(id);
		for (const [key, record] of [...this.bySource.entries()]) {
			record.nodes = record.nodes.filter(nodeId => nodeId !== id + ':foreground' && !String(nodeId).startsWith(id + ':foreground:'));
			if (record.nodes.length === 0) this.bySource.delete(key);
		}
		if (entry?.child && this.owners.get(entry.key) === entry.child) this.owners.delete(entry.key);
		if (typeof this.target.removeLayer === 'function') this.target.removeLayer(id);
		else delete this.target.layers[id];
	}

	/**
	 * Visit canvas layers and lens-owned children, matching Canvas.restoreLayerWebGL.
	 * Children are reached even though they are absent from Canvas.layers.
	 */
	visitLayers(visitor) {
		const walk = (layer) => {
			if (!layer) return;
			visitor(layer);
			for (const child of layer.layers || []) walk(child);
		};
		for (const layer of Object.values(this.target.layers)) walk(layer);
	}

	rememberSource(item, qualifiedId) {
		let record = this.bySource.get(item.key);
		if (!record) {
			record = { ...item.record, key: item.key, nodes: [] };
			this.bySource.set(item.key, record);
		}
		if (!record.nodes.includes(qualifiedId)) record.nodes.push(qualifiedId);
	}

	attach(id, layer) {
		layer.id = id;
		if (typeof this.target.addLayer === 'function') this.target.addLayer(id, layer);
		else this.target.layers[id] = layer;
	}

	drop(id) {
		const entry = this.byNode.get(id);
		this.byNode.delete(id);
		if (entry) {
			const record = this.bySource.get(entry.key);
			if (record) {
				record.nodes = record.nodes.filter(nodeId => nodeId !== id);
				if (record.nodes.length === 0) this.bySource.delete(entry.key);
			}
		}
		if (typeof this.target.removeLayer === 'function') this.target.removeLayer(id);
		else delete this.target.layers[id];
	}

	localBounds(layer, source) {
		if (this.getLocalBounds) return finiteBox(this.getLocalBounds(layer, source));
		if (layer && Number.isFinite(layer.width) && layer.width > 0 && Number.isFinite(layer.height) && layer.height > 0) {
			return centerBox(layer.width, layer.height);
		}
		return finiteBox(source.bounds);
	}

	/** Bounds for `active` leaves, every leaf (`all`), or the declared scene extent. */
	computeFit(planned) {
		const policy = this.session.scene.viewer?.fitPolicy || 'active';
		if (policy === 'declared') return asFitBox(finiteBox(this.session.scene.root?.spatial?.extent));
		const box = emptyBox();
		for (const item of planned) {
			if (!item) continue;
			if (policy === 'active' && !item.visible) continue;
			const layer = this.byNode.get(item.node.qualifiedId)?.layer;
			const local = this.localBounds(layer, item.source);
			if (!local) continue;
			for (const corner of [
				[local.xLow, local.yLow],
				[local.xHigh, local.yLow],
				[local.xLow, local.yHigh],
				[local.xHigh, local.yHigh]
			]) {
				mergePoint(box, item.similarity.apply(corner[0], corner[1]));
			}
		}
		return box.empty ? null : asFitBox(box);
	}

	/** Pass `fitBounds` to the camera unless `autofit` is false or the camera is missing. */
	applyFit(planned) {
		const viewer = this.session.scene.viewer || {};
		const camera = this.target.camera;
		if (!this.fitBounds || viewer.autofit === false || !camera?.viewport || typeof camera.updateBounds !== 'function') return;
		let minScale = Infinity;
		const policy = viewer.fitPolicy || 'active';
		for (const item of planned) {
			if (!item) continue;
			if (policy === 'active' && !item.visible) continue;
			if (this.localBounds(this.byNode.get(item.node.qualifiedId)?.layer, item.source)) {
				minScale = Math.min(minScale, item.similarity.z);
			}
		}
		camera.updateBounds(this.fitBounds, Number.isFinite(minScale) ? minScale : 0);
	}

	/** Stop listening and remove the projected layers, including lens overlays. */
	dispose() {
		if (this.unsubscribe) this.unsubscribe();
		this.unsubscribe = null;
		for (const id of [...this.lenses.keys()]) this.dropLens(id);
		for (const id of [...this.byNode.keys()]) this.drop(id);
	}
}

export { SceneProjection };
