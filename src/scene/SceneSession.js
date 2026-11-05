import { Similarity, parseSimilarity, isLocalId, isGlobalId } from './similarity.js';

/** Thrown when a document or a command has at least one error diagnostic. */
class SceneValidationError extends Error {
	constructor(diagnostics) {
		const errors = diagnostics.filter(item => item.severity === 'error');
		super(errors.map(item => item.message).join('\n'));
		this.name = 'SceneValidationError';
		this.diagnostics = diagnostics;
	}
}

function clone(value) {
	return JSON.parse(JSON.stringify(value));
}

function push(diagnostics, severity, code, path, message) {
	diagnostics.push({ severity, code, path, message });
}

function majorVersion(version) {
	const major = Number(String(version).split('.')[0]);
	return Number.isFinite(major) ? major : NaN;
}

function activationOf(node) {
	const activation = node.activation || {};
	const mode = activation.mode === 'exclusive' ? 'exclusive' : 'stack';
	return { mode, required: mode === 'exclusive' && activation.required !== false };
}

/** Check one frozen asset: root group, tree, sources, presets, and lens references. */
function validateAsset(asset, path, diagnostics) {
	if (!asset || asset.format !== 'openlime-asset') {
		push(diagnostics, 'error', 'FORMAT', path + '/format', 'Asset format must be openlime-asset.');
		return;
	}
	if (majorVersion(asset.formatVersion) !== 1) {
		push(diagnostics, 'error', 'VERSION', path + '/formatVersion', 'Unsupported asset formatVersion.');
	}
	if (!isGlobalId(asset.id)) {
		push(diagnostics, 'error', 'ASSET_ID', path + '/id', 'Asset id must be a URI or URN.');
	}
	const nodes = asset.nodes || {};
	const rootId = asset.root;
	if (!isLocalId(rootId) || !nodes[rootId]) {
		push(diagnostics, 'error', 'ROOT', path + '/root', 'Asset root must name a node.');
		return;
	}
	if (nodes[rootId].type !== 'group') {
		push(diagnostics, 'error', 'ROOT_TYPE', path + '/nodes/' + rootId, 'The asset root must be a group.');
	}
	if (nodes[rootId].spatial?.toParent) {
		push(diagnostics, 'error', 'ROOT_PLACEMENT', path + '/nodes/' + rootId + '/spatial/toParent', 'The asset root must not define toParent.');
	}
	if (!isGlobalId(nodes[rootId].spatial?.space?.id)) {
		push(diagnostics, 'error', 'ASSET_SPACE', path + '/nodes/' + rootId + '/spatial/space/id', 'The asset root must declare spatial.space.id.');
	}

	const parentOf = new Map();
	for (const [id, node] of Object.entries(nodes)) {
		if (!isLocalId(id)) push(diagnostics, 'error', 'NODE_ID', path + '/nodes/' + id, 'Node id is not a local id.');
		if (node.type !== 'group' && node.type !== 'layer') {
			push(diagnostics, 'error', 'NODE_TYPE', path + '/nodes/' + id, 'Node type must be group or layer.');
		}
		if (node.spatial?.toParent) parseSimilarity(node.spatial.toParent, path + '/nodes/' + id + '/spatial/toParent', diagnostics);
		for (const childId of node.children || []) {
			if (!nodes[childId]) {
				push(diagnostics, 'error', 'MISSING_CHILD', path + '/nodes/' + id + '/children', `Missing child "${childId}".`);
				continue;
			}
			if (parentOf.has(childId)) {
				push(diagnostics, 'error', 'TWO_PARENTS', path + '/nodes/' + childId, `Node "${childId}" has two parents.`);
			}
			parentOf.set(childId, id);
		}
		if (node.type === 'layer') validateLayer(node, nodes, asset.sources || {}, path + '/nodes/' + id, diagnostics);
	}
	if (parentOf.has(rootId)) {
		push(diagnostics, 'error', 'ROOT_CHILD', path + '/root', 'The asset root cannot also be a child.');
	}
	for (const id of Object.keys(nodes)) {
		if (id !== rootId && !parentOf.has(id)) {
			push(diagnostics, 'error', 'ORPHAN', path + '/nodes/' + id, `Node "${id}" is not in the tree.`);
		}
	}
	const color = new Map();
	const visit = (id) => {
		const state = color.get(id);
		if (state === 'gray') {
			push(diagnostics, 'error', 'CYCLE', path + '/nodes/' + id, `Cycle at node "${id}".`);
			return;
		}
		if (state === 'black') return;
		color.set(id, 'gray');
		for (const childId of nodes[id].children || []) if (nodes[childId]) visit(childId);
		color.set(id, 'black');
	};
	if (nodes[rootId]) visit(rootId);
	validateLenses(asset, path, diagnostics);
}

function validateLayer(node, nodes, sources, path, diagnostics) {
	const sourceKey = node.renderer?.source;
	if (sourceKey && !sources[sourceKey]) {
		push(diagnostics, 'error', 'MISSING_SOURCE', path + '/renderer/source', `Unknown source "${sourceKey}".`);
	}
	const renderings = node.renderings || [];
	const ids = new Set();
	for (const rendering of renderings) {
		if (!isLocalId(rendering.id) || ids.has(rendering.id)) {
			push(diagnostics, 'error', 'RENDERING_ID', path + '/renderings', 'Rendering ids must be unique local ids.');
		}
		ids.add(rendering.id);
	}
	if (!node.defaultRendering || !ids.has(node.defaultRendering)) {
		push(diagnostics, 'error', 'DEFAULT_RENDERING', path + '/defaultRendering', 'defaultRendering must name a preset of this layer.');
	}
}

function validateLenses(asset, path, diagnostics) {
	for (const [id, profile] of Object.entries(asset.lensProfiles || {})) {
		const host = asset.nodes[profile.host];
		if (!host || host.type !== 'layer') {
			push(diagnostics, 'error', 'LENS_HOST', path + '/lensProfiles/' + id + '/host', `Lens "${id}" host must be a layer in this asset.`);
		}
		for (const slot of ['background', 'foreground']) {
			const choiceList = profile[slot]?.choices || [];
			if (choiceList.length === 0) {
				push(diagnostics, 'error', 'LENS_CHOICES', path + '/lensProfiles/' + id + '/' + slot, `Lens "${id}" ${slot} needs at least one choice.`);
			}
			const choiceIds = new Set();
			for (const choice of choiceList) {
				if (!choice.id || choiceIds.has(choice.id)) {
					push(diagnostics, 'error', 'LENS_CHOICE', path + '/lensProfiles/' + id + '/' + slot, `Lens "${id}" ${slot} choice ids must be unique.`);
				}
				choiceIds.add(choice.id);
				const target = choice.target || {};
				if (target.kind === 'subtree') {
					push(diagnostics, 'error', 'LENS_SUBTREE', path + '/lensProfiles/' + id, `Lens "${id}" subtree targets are not implemented.`);
					continue;
				}
				const targetNode = asset.nodes[target.node];
				if (!targetNode || targetNode.type !== 'layer') {
					push(diagnostics, 'error', 'LENS_TARGET', path + '/lensProfiles/' + id, `Lens "${id}" points at missing layer "${target.node}".`);
					continue;
				}
				const renderingIds = new Set((targetNode.renderings || []).map(rendering => rendering.id));
				if (target.kind === 'layer' && !renderingIds.has(target.rendering)) {
					push(diagnostics, 'error', 'LENS_RENDERING', path + '/lensProfiles/' + id, `Lens "${id}" rendering "${target.rendering}" is not on "${target.node}".`);
				}
			}
			if (!choiceIds.has(profile[slot]?.default)) {
				push(diagnostics, 'error', 'LENS_DEFAULT', path + '/lensProfiles/' + id + '/' + slot + '/default', `Lens "${id}" ${slot} default is not a choice.`);
			}
		}
		const space = profile.geometry?.coordinateSpace || 'asset';
		if (space !== 'asset') {
			push(diagnostics, 'error', 'LENS_SPACE', path + '/lensProfiles/' + id + '/geometry/coordinateSpace', `Lens coordinate space "${space}" is not supported. Use "asset".`);
		}
		if (profile.type && profile.type !== 'openlime:circular-lens') {
			push(diagnostics, 'error', 'LENS_TYPE', path + '/lensProfiles/' + id + '/type', `Unsupported lens type "${profile.type}".`);
		}
	}
}

function resolveAsset(instance, index, options, diagnostics) {
	if (instance.document) return instance.document;
	const provided = options.assets && options.assets[instance.asset];
	if (provided) return provided;
	push(diagnostics, 'error', 'ASSET_UNRESOLVED', '/assets/' + index, `Asset "${instance.asset}" is not inline and was not provided.`);
	return null;
}

/** Check the scene envelope: id, scene space, and the flat list of asset instances. */
function validateScene(scene, diagnostics) {
	if (!scene || scene.format !== 'openlime-scene') {
		push(diagnostics, 'error', 'FORMAT', '/format', 'Scene format must be openlime-scene.');
		return;
	}
	if (majorVersion(scene.formatVersion) !== 1) {
		push(diagnostics, 'error', 'VERSION', '/formatVersion', 'Unsupported scene formatVersion.');
	}
	if (!isGlobalId(scene.id)) push(diagnostics, 'error', 'SCENE_ID', '/id', 'Scene id must be a URI or URN.');
	if (!isGlobalId(scene.root?.spatial?.space?.id)) {
		push(diagnostics, 'error', 'SCENE_SPACE', '/root/spatial/space/id', 'The scene root must declare spatial.space.id.');
	}
	if (!Array.isArray(scene.assets) || scene.assets.length === 0) {
		push(diagnostics, 'error', 'ASSETS', '/assets', 'A scene needs at least one asset instance.');
	}
	const seen = new Set();
	for (const instance of scene.assets || []) {
		if (!isLocalId(instance.id)) push(diagnostics, 'error', 'INSTANCE_ID', '/assets', 'Instance id is not a local id.');
		if (seen.has(instance.id)) push(diagnostics, 'error', 'INSTANCE_ID', '/assets', `Duplicate instance id "${instance.id}".`);
		seen.add(instance.id);
		if (!isGlobalId(instance.asset)) push(diagnostics, 'error', 'INSTANCE_ASSET', '/assets/' + instance.id, 'Instance asset must be a URI or URN.');
		if (instance.document && instance.document.id !== instance.asset) {
			push(diagnostics, 'error', 'INSTANCE_ASSET', '/assets/' + instance.id, 'Inline asset id does not match the instance asset id.');
		}
		parseSimilarity(instance.transform, '/assets/' + instance.id + '/transform', diagnostics);
	}
}

/**
 * Build the live graph: scene root, one instance group per asset, then the frozen nodes.
 * Qualified ids are `instanceId/nodeId`. The scene root id is `''`.
 */
function buildGraph(scene, assetByInstance, diagnostics) {
	const nodes = new Map();
	const sceneRoot = {
		qualifiedId: '',
		instanceId: null,
		nodeId: null,
		role: 'scene',
		type: 'group',
		parent: null,
		children: [],
		local: new Similarity(),
		activation: null
	};
	nodes.set('', sceneRoot);

	for (const instance of scene.assets) {
		const asset = assetByInstance.get(instance.id);
		if (!asset) continue;
		const placement = parseSimilarity(instance.transform, '/assets/' + instance.id + '/transform', diagnostics) || new Similarity();
		const instanceNode = {
			qualifiedId: instance.id,
			instanceId: instance.id,
			nodeId: null,
			role: 'instance',
			type: 'group',
			parent: '',
			children: [],
			local: placement,
			activation: null,
			assetId: asset.id
		};
		nodes.set(instance.id, instanceNode);
		sceneRoot.children.push(instance.id);

		const pending = [asset.root];
		const created = new Set();
		while (pending.length) {
			const nodeId = pending.shift();
			if (created.has(nodeId)) continue;
			const spec = asset.nodes[nodeId];
			const parentNodeId = findParent(asset, nodeId);
			const parentQualified = parentNodeId ? instance.id + '/' + parentNodeId : instance.id;
			const qualifiedId = instance.id + '/' + nodeId;
			const local = parseSimilarity(spec.spatial?.toParent, '/nodes/' + nodeId + '/spatial/toParent', diagnostics) || new Similarity();
			const assetToLocal = spec.type === 'layer'
				? parseSimilarity(spec.spatial?.assetToLocal, '/nodes/' + nodeId + '/spatial/assetToLocal', diagnostics) || new Similarity()
				: null;
			nodes.set(qualifiedId, {
				qualifiedId,
				instanceId: instance.id,
				nodeId,
				role: 'node',
				type: spec.type,
				parent: parentQualified,
				children: [],
				local,
				assetToLocal,
				activation: spec.type === 'group' ? activationOf(spec) : null,
				renderings: spec.type === 'layer' ? spec.renderings : null,
				defaultRendering: spec.defaultRendering || null
			});
			created.add(nodeId);
			for (const childId of spec.children || []) pending.push(childId);
		}
		for (const nodeId of created) {
			const spec = asset.nodes[nodeId];
			const qualifiedId = instance.id + '/' + nodeId;
			for (const childId of spec.children || []) {
				nodes.get(qualifiedId).children.push(instance.id + '/' + childId);
			}
		}
		instanceNode.children.push(instance.id + '/' + asset.root);
	}
	return nodes;
}

function findParent(asset, nodeId) {
	for (const [id, node] of Object.entries(asset.nodes)) {
		if ((node.children || []).includes(nodeId)) return id;
	}
	return null;
}

/** Initial camera, instance placement, enabled flags, and exclusive selections. */
function freshState(scene, assetByInstance, diagnostics) {
	const state = {
		camera: { x: 0, y: 0, z: 1, a: 0, ...(scene.initialState?.camera || {}) },
		instances: {},
		assets: {}
	};
	for (const instance of scene.assets) {
		const asset = assetByInstance.get(instance.id);
		if (!asset) continue;
		const initial = clone(asset.initialState || {});
		const enabled = { ...(initial.enabled || {}) };
		const selections = { ...(initial.selections || {}) };
		for (const [id, node] of Object.entries(asset.nodes)) {
			const activation = activationOf(node);
			if (node.type !== 'group' || activation.mode !== 'exclusive') continue;
			const children = node.children || [];
			const selected = selections[id];
			if (selected != null && !children.includes(selected)) {
				push(diagnostics, 'error', 'EXCLUSIVE_SELECTION', '/nodes/' + id, `Selection "${selected}" is not a child of "${id}".`);
			} else if (selected == null) {
				if (activation.required && children.length) {
					selections[id] = children[0];
					push(diagnostics, 'warning', 'EXCLUSIVE_DEFAULTED', '/nodes/' + id, `Exclusive group "${id}" had no selection. The first child was selected.`);
				} else selections[id] = null;
			}
		}
		state.instances[instance.id] = {
			enabled: scene.initialState?.instances?.[instance.id]?.enabled !== false,
			transform: instance.transform || { type: 'identity' }
		};
		state.assets[instance.id] = {
			enabled,
			selections,
			layers: initial.layers || {},
			lenses: normalizeLenses(asset, initial.lenses || {}, diagnostics)
		};
	}
	return state;
}

/** Fill lens choice, geometry, and enabled flags. At most one enabled profile per host. */
function normalizeLenses(asset, stored, diagnostics) {
	const lenses = {};
	const enabledHost = new Map();
	for (const [id, profile] of Object.entries(asset.lensProfiles || {})) {
		const previous = stored[id] || {};
		const geometry = previous.geometry || {};
		let enabled = previous.enabled === true;
		if (enabled && enabledHost.has(profile.host)) {
			enabled = false;
			push(diagnostics, 'warning', 'LENS_HOST_EXCLUSIVE', '/lensProfiles/' + id, `Host "${profile.host}" already has an enabled lens. "${id}" was turned off.`);
		}
		if (enabled) enabledHost.set(profile.host, id);
		lenses[id] = {
			enabled,
			background: previous.background || profile.background?.default || null,
			foreground: previous.foreground || profile.foreground?.default || null,
			slotState: previous.slotState || { background: {}, foreground: {} },
			geometry: {
				center: geometry.center || profile.geometry?.defaultCenter || [0, 0],
				radius: geometry.radius === undefined ? (profile.geometry?.defaultRadius ?? 100) : geometry.radius
			}
		};
	}
	return lenses;
}

/**
 * A mounted scene: frozen documents, the live graph, and mutable state.
 * Commands go through `transaction` and notify listeners once on success.
 */
class SceneSession {
	constructor(scene, assetByInstance, nodes, state, diagnostics) {
		this.scene = scene;
		this.assetByInstance = assetByInstance;
		this.nodes = nodes;
		this.state = state;
		this.diagnostics = diagnostics;
		this.listeners = new Set();
	}

	/** Called once after a successful command. Returns an unsubscribe function. */
	addListener(listener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	publish() {
		for (const listener of this.listeners) listener();
	}

	/** Mount one asset file as a scene with a single identity placement. */
	static openAsset(assetDocument, options = {}) {
		return SceneSession.open(syntheticScene(assetDocument, options), options);
	}

	/** Import a flat manifest. Events, plugins, and connections are dropped. */
	static openLegacy(manifest, options = {}) {
		const id = options.assetId || 'urn:openlime:legacy';
		const session = SceneSession.open(syntheticScene(legacyManifestToAsset(manifest, id), {
			sceneId: options.sceneId || 'urn:openlime:legacy:scene',
			instanceId: options.instanceId || 'legacy',
			viewer: manifest.viewer
		}), options);
		if (manifest.events) push(session.diagnostics, 'warning', 'EVENTS_DROPPED', '/events', 'Legacy events are dropped.');
		if (manifest.plugins) push(session.diagnostics, 'warning', 'PLUGINS_DROPPED', '/plugins', 'Legacy plugins are dropped.');
		if (manifest.connections) push(session.diagnostics, 'warning', 'CONNECTIONS_DROPPED', '/connections', 'Unresolved legacy connections are dropped.');
		push(session.diagnostics, 'warning', 'LEGACY_LOCAL_IDS', '/id', 'This import minted local ids. Annotation reuse needs a host asset id.');
		return session;
	}

	/**
	 * Open an openlime-scene document.
	 * Pass missing assets in `options.assets`, keyed by asset id. Inline `document` wins.
	 */
	static open(sceneDocument, options = {}) {
		const diagnostics = [];
		const scene = clone(sceneDocument);
		validateScene(scene, diagnostics);
		const assetByInstance = new Map();
		for (let index = 0; index < (scene.assets || []).length; index++) {
			const instance = scene.assets[index];
			const asset = resolveAsset(instance, index, options, diagnostics);
			if (!asset) continue;
			validateAsset(asset, '/assets/' + instance.id + '/document', diagnostics);
			assetByInstance.set(instance.id, clone(asset));
		}
		if (diagnostics.some(item => item.severity === 'error')) throw new SceneValidationError(diagnostics);
		const nodes = buildGraph(scene, assetByInstance, diagnostics);
		const state = freshState(scene, assetByInstance, diagnostics);
		if (diagnostics.some(item => item.severity === 'error')) throw new SceneValidationError(diagnostics);
		return new SceneSession(scene, assetByInstance, nodes, state, diagnostics);
	}

	getNode(qualifiedId) {
		return this.nodes.get(qualifiedId) || null;
	}

	getParent(qualifiedId) {
		const node = this.getNode(qualifiedId);
		return node && node.parent != null ? this.getNode(node.parent) : null;
	}

	getChildren(qualifiedId) {
		const node = this.getNode(qualifiedId);
		return node ? node.children.map(id => this.getNode(id)) : [];
	}

	getAncestors(qualifiedId) {
		const ancestors = [];
		let parent = this.getParent(qualifiedId);
		while (parent) {
			ancestors.push(parent);
			parent = parent.parent != null ? this.getNode(parent.parent) : null;
		}
		return ancestors;
	}

	getDescendants(qualifiedId) {
		const descendants = [];
		const walk = (id) => {
			for (const childId of this.getNode(id).children) {
				descendants.push(this.getNode(childId));
				walk(childId);
			}
		};
		if (this.getNode(qualifiedId)) walk(qualifiedId);
		return descendants;
	}

	/** Parent enabled, own flag, and exclusive selection. Descendant flags are not cleared. */
	effectiveEnabled(qualifiedId) {
		const node = this.getNode(qualifiedId);
		if (!node) return false;
		if (node.role === 'scene') return true;
		const parentActive = this.effectiveEnabled(node.parent);
		if (!parentActive) return false;
		const parent = this.getNode(node.parent);
		if (parent.role === 'node' && parent.activation?.mode === 'exclusive') {
			const selection = this.state.assets[parent.instanceId].selections[parent.nodeId];
			if (selection !== node.nodeId) return false;
		}
		if (node.role === 'instance') return this.state.instances[node.instanceId].enabled !== false;
		return this.state.assets[node.instanceId].enabled[node.nodeId] !== false;
	}

	/** Transform inside the asset. Placement is not included. */
	assetTransform(qualifiedId) {
		const node = this.getNode(qualifiedId);
		if (!node || node.role !== 'node') return new Similarity();
		const parent = this.getNode(node.parent);
		if (parent.role === 'instance') return node.local.copy();
		return node.local.compose(this.assetTransform(parent.qualifiedId));
	}

	/** Local transform first, then ancestors, then the instance placement. */
	worldTransform(qualifiedId) {
		const node = this.getNode(qualifiedId);
		if (!node || node.role === 'scene') return new Similarity();
		return node.local.compose(this.worldTransform(node.parent));
	}

	/** Effectively visible layers, back to front. Groups stay on the graph and are omitted here. */
	activeLeaves() {
		const leaves = [];
		const walk = (id) => {
			const node = this.getNode(id);
			if (node.type === 'layer' && this.effectiveEnabled(id)) {
				leaves.push({ qualifiedId: id, zindex: leaves.length });
			}
			for (const childId of node.children) walk(childId);
		};
		walk('');
		return leaves;
	}

	/** Map a point from one instance's asset space into scene space. */
	assetToScene(instanceId, point) {
		const placed = this.worldTransform(instanceId).apply(point.x, point.y);
		return { x: placed.x, y: placed.y };
	}

	/** Inverse of `assetToScene` for the same instance. */
	sceneToAsset(instanceId, point) {
		const placed = this.worldTransform(instanceId).inverse().apply(point.x, point.y);
		return { x: placed.x, y: placed.y };
	}

	/** Plain snapshot of camera, instances, and per-asset state. */
	exportState() {
		return clone(this.state);
	}

	/** Replace state in one transaction. Unknown instances throw and roll back. */
	importState(next) {
		this.transaction(() => {
			if (next.camera) Object.assign(this.state.camera, next.camera);
			for (const [instanceId, instanceState] of Object.entries(next.instances || {})) {
				if (!this.state.instances[instanceId]) throw new Error(`Unknown instance "${instanceId}".`);
				if ('enabled' in instanceState) this.state.instances[instanceId].enabled = instanceState.enabled !== false;
				if (instanceState.transform) this.applyPlacement(instanceId, instanceState.transform);
			}
			for (const [instanceId, assetState] of Object.entries(next.assets || {})) {
				if (!this.state.assets[instanceId]) throw new Error(`Unknown instance "${instanceId}".`);
				if (assetState.enabled) Object.assign(this.state.assets[instanceId].enabled, assetState.enabled);
				if (assetState.selections) {
					for (const [groupId, childId] of Object.entries(assetState.selections)) {
						this.assignSelection(instanceId, groupId, childId);
					}
				}
				if (assetState.layers) this.state.assets[instanceId].layers = clone(assetState.layers);
				if (assetState.lenses) this.state.assets[instanceId].lenses = clone(assetState.lenses);
			}
		});
	}

	/** Show or hide one asset instance. Other instances are left alone. */
	setInstanceEnabled(instanceId, enabled) {
		this.transaction(() => {
			if (!this.state.instances[instanceId]) throw new Error(`Unknown instance "${instanceId}".`);
			this.state.instances[instanceId].enabled = !!enabled;
		});
	}

	/** Toggle one asset node. A group hides its subtree without clearing descendant flags. */
	setNodeEnabled(instanceId, nodeId, enabled) {
		this.transaction(() => {
			const node = this.requireNode(instanceId, nodeId);
			if (node.role !== 'node') throw new Error(`"${nodeId}" is not an asset node.`);
			this.state.assets[instanceId].enabled[nodeId] = !!enabled;
		});
	}

	/** Select the active child of an exclusive group. Null is allowed only when the group is optional. */
	selectGroupChild(instanceId, groupId, childId) {
		this.transaction(() => {
			this.assignSelection(instanceId, groupId, childId);
		});
	}

	/** Select a preset listed on the layer. The projection applies it on the next reconcile. */
	setLayerRendering(instanceId, nodeId, renderingId) {
		this.transaction(() => {
			const node = this.requireNode(instanceId, nodeId);
			const known = (node.renderings || []).some(rendering => rendering.id === renderingId);
			if (!known) throw new Error(`Unknown rendering "${renderingId}".`);
			const layers = this.state.assets[instanceId].layers;
			layers[nodeId] = { ...(layers[nodeId] || {}), rendering: renderingId };
		});
	}

	/** Set one control on a layer preset. Slot controls stay on the lens state. */
	setLayerControl(instanceId, nodeId, renderingId, controlId, value) {
		this.transaction(() => {
			const rendering = this.renderingOf(instanceId, nodeId, renderingId);
			this.assertControl(rendering, controlId);
			const layers = this.state.assets[instanceId].layers;
			const entry = { ...(layers[nodeId] || {}) };
			const renderingState = { ...(entry.renderingState || {}) };
			const current = { ...(renderingState[renderingId] || {}) };
			current.controls = { ...(current.controls || {}), [controlId]: value };
			renderingState[renderingId] = current;
			entry.renderingState = renderingState;
			layers[nodeId] = entry;
		});
	}

	/** Enable one lens. Another enabled profile on the same host is turned off in this transaction. */
	setLensEnabled(instanceId, profileId, enabled) {
		this.transaction(() => {
			const profile = this.lensProfile(instanceId, profileId);
			const lenses = this.state.assets[instanceId].lenses;
			if (enabled) {
				for (const [otherId, other] of Object.entries(this.lensProfiles(instanceId))) {
					if (otherId !== profileId && other.host === profile.host) lenses[otherId].enabled = false;
				}
			}
			lenses[profileId].enabled = !!enabled;
		});
	}

	/** Select the choice id of one lens slot. */
	selectLensChoice(instanceId, profileId, slot, choiceId) {
		this.transaction(() => {
			const profile = this.lensProfile(instanceId, profileId);
			if (slot !== 'background' && slot !== 'foreground') throw new Error(`Unknown lens slot "${slot}".`);
			const choices = profile[slot]?.choices || [];
			if (!choices.some(choice => choice.id === choiceId)) throw new Error(`Unknown ${slot} choice "${choiceId}".`);
			this.state.assets[instanceId].lenses[profileId][slot] = choiceId;
		});
	}

	/** Set a control on one lens slot without changing the layer's main preset state. */
	setLensControl(instanceId, profileId, slot, controlId, value) {
		this.transaction(() => {
			const profile = this.lensProfile(instanceId, profileId);
			if (slot !== 'background' && slot !== 'foreground') throw new Error(`Unknown lens slot "${slot}".`);
			const choice = (profile[slot]?.choices || []).find(item => item.id === this.state.assets[instanceId].lenses[profileId][slot]);
			const node = this.requireNode(instanceId, choice?.target?.node);
			const renderingId = choice?.target?.rendering || node.defaultRendering;
			this.assertControl(this.renderingOf(instanceId, node.nodeId, renderingId), controlId);
			const lens = this.state.assets[instanceId].lenses[profileId];
			const slotState = { ...(lens.slotState || {}) };
			const current = { ...(slotState[slot] || {}) };
			current.controls = { ...(current.controls || {}), [controlId]: value };
			slotState[slot] = current;
			lens.slotState = slotState;
		});
	}

	/** Move one instance. Asset-local transforms and the source document stay unchanged. */
	setAssetTransform(instanceId, transform) {
		this.transaction(() => {
			this.applyPlacement(instanceId, transform);
		});
	}

	applyPlacement(instanceId, transform) {
		const diagnostics = [];
		const parsed = parseSimilarity(transform, '/assets/' + instanceId + '/transform', diagnostics);
		if (!parsed || diagnostics.length) throw new SceneValidationError(diagnostics);
		const node = this.getNode(instanceId);
		if (!node || node.role !== 'instance') throw new Error(`Unknown instance "${instanceId}".`);
		node.local = parsed;
		this.state.instances[instanceId].transform = clone(transform);
	}

	assignSelection(instanceId, groupId, childId) {
		const group = this.requireNode(instanceId, groupId);
		if (group.activation?.mode !== 'exclusive') throw new Error(`"${groupId}" is not an exclusive group.`);
		if (childId == null) {
			if (group.activation.required) throw new Error(`"${groupId}" requires a selection.`);
			this.state.assets[instanceId].selections[groupId] = null;
			return;
		}
		const child = this.getNode(instanceId + '/' + childId);
		if (!child || child.parent !== group.qualifiedId) throw new Error(`"${childId}" is not a child of "${groupId}".`);
		this.state.assets[instanceId].selections[groupId] = childId;
	}

	lensProfiles(instanceId) {
		return this.assetByInstance.get(instanceId)?.lensProfiles || {};
	}

	lensProfile(instanceId, profileId) {
		const profile = this.lensProfiles(instanceId)[profileId];
		if (!profile) throw new Error(`Unknown lens "${profileId}".`);
		if (!this.state.assets[instanceId]?.lenses[profileId]) throw new Error(`Unknown lens "${profileId}".`);
		return profile;
	}

	renderingOf(instanceId, nodeId, renderingId) {
		const node = this.requireNode(instanceId, nodeId);
		const rendering = (node.renderings || []).find(item => item.id === renderingId);
		if (!rendering) throw new Error(`Unknown rendering "${renderingId}".`);
		return rendering;
	}

	assertControl(rendering, controlId) {
		if (Array.isArray(rendering.exposeControls) && !rendering.exposeControls.includes(controlId)) {
			throw new Error(`Control "${controlId}" is not exposed by "${rendering.id}".`);
		}
	}

	requireNode(instanceId, nodeId) {
		const node = this.getNode(instanceId + '/' + nodeId);
		if (!node) throw new Error(`Unknown node "${instanceId}/${nodeId}".`);
		return node;
	}

	/** Run `change`. On failure restore state and placements. On success notify listeners once. */
	transaction(change) {
		const previous = clone(this.state);
		const locals = new Map();
		for (const [id, node] of this.nodes) locals.set(id, node.local.copy());
		try {
			change();
		} catch (error) {
			this.state = previous;
			for (const [id, local] of locals) this.nodes.get(id).local = local;
			throw error;
		}
		try {
			this.publish();
		} catch (error) {
			this.state = previous;
			for (const [id, local] of locals) this.nodes.get(id).local = local;
			try { this.publish(); } catch { /* The original command error is the one to report. */ }
			throw error;
		}
	}
}

/** Wrap one asset as a scene with a single instance at identity placement. */
function syntheticScene(asset, options = {}) {
	const spaceId = asset.nodes?.[asset.root]?.spatial?.space?.id;
	return {
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: options.sceneId || asset.id + ':scene',
		root: { spatial: { space: { id: spaceId ? spaceId + ':scene' : 'urn:openlime:scene', type: 'cartesian2d' }, ...(options.extent ? { extent: options.extent } : {}) } },
		viewer: options.viewer,
		assets: [{
			id: options.instanceId || 'asset',
			asset: asset.id,
			document: asset,
			transform: { type: 'identity' }
		}]
	};
}

/** Turn a flat `layers` map into one stack-rooted asset. Ids are document-local. */
function legacyManifestToAsset(manifest, id = 'urn:openlime:legacy') {
	const entries = Object.entries(manifest.layers || {});
	entries.sort((a, b) => (a[1].zindex || 0) - (b[1].zindex || 0));
	const nodes = {
		root: { type: 'group', activation: { mode: 'stack' }, children: entries.map(([layerId]) => layerId), spatial: { space: { id: id + ':space', type: 'cartesian2d' } } }
	};
	const sources = {};
	for (const [layerId, layer] of entries) {
		const sourceKey = 'source-' + layerId;
		sources[sourceKey] = { id: id + ':source:' + layerId, uri: layer.url || '', layout: layer.layout ? { type: layer.layout } : undefined };
		const spatial = layer.transform ? {
			toParent: {
				type: 'similarity2d',
				translation: [layer.transform.x || 0, layer.transform.y || 0],
				rotation: layer.transform.a || 0,
				scale: layer.transform.z === undefined ? 1 : layer.transform.z
			}
		} : {};
		nodes[layerId] = {
			type: 'layer',
			label: layer.label,
			renderer: { type: 'openlime:' + (layer.type || 'image'), source: sourceKey },
			renderings: [{ id: 'default', label: 'Default', mode: layer.mode }],
			defaultRendering: 'default',
			spatial
		};
	}
	const enabled = {};
	for (const [layerId, layer] of entries) if (layer.visible === false) enabled[layerId] = false;
	return {
		format: 'openlime-asset',
		formatVersion: '1.0.0',
		id,
		root: 'root',
		sources,
		nodes,
		initialState: { enabled }
	};
}

export { SceneSession, SceneValidationError, legacyManifestToAsset };
