import { SceneValidationError } from './SceneSession.js';
import { adapterFor, validateRendererOptions } from './adapters.js';

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
 * Projects effective leaves onto a canvas.
 * Each leaf gets its own layer object. A shared source key records that two
 * leaves read the same pixels. derive() is left for a second shader context.
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
		this.resolveUrl = options.resolveUrl || (source => source.uri || '');
		this.getLocalBounds = options.getLocalBounds || null;
		this.byNode = new Map();
		this.bySource = new Map();
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
		if (diagnostics.some(item => item.severity === 'error')) throw new SceneValidationError(diagnostics);

		const wanted = new Set(planned.map(item => item.node.qualifiedId));
		for (const id of [...this.byNode.keys()]) {
			if (!wanted.has(id)) this.drop(id);
		}

		for (const item of planned) {
			let entry = this.byNode.get(item.node.qualifiedId);
			if (!entry || entry.key !== item.key) {
				if (entry) this.drop(item.node.qualifiedId);
				const layer = this.createLayer(item.options);
				entry = { layer, key: item.key };
				this.byNode.set(item.node.qualifiedId, entry);
				this.rememberSource(item, item.node.qualifiedId);
				this.attach(item.node.qualifiedId, layer);
			}
			assignTransform(entry.layer, item.similarity);
			entry.layer.visible = item.visible;
			entry.layer.zindex = item.zindex;
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
		return {
			node,
			key,
			similarity,
			visible,
			zindex,
			source,
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

	/** Stop listening and remove the projected layers. */
	dispose() {
		if (this.unsubscribe) this.unsubscribe();
		this.unsubscribe = null;
		for (const id of [...this.byNode.keys()]) this.drop(id);
	}
}

export { SceneProjection };
