import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneSession, SceneValidationError } from '../../src/scene/SceneSession.js';
import { SceneProjection } from '../../src/scene/SceneProjection.js';

function asset(overrides = {}) {
	return {
		format: 'openlime-asset',
		formatVersion: '1.0.0',
		id: 'urn:example:lighthouse',
		sources: {
			img: { id: 'urn:example:source:lighthouse', uri: 'lighthouse.jpg', bounds: { width: 100, height: 100 } }
		},
		root: 'root',
		nodes: {
			root: {
				type: 'group',
				activation: { mode: 'stack' },
				children: ['base'],
				spatial: { space: { id: 'urn:example:frame:lighthouse:root', type: 'cartesian2d' } }
			},
			base: {
				type: 'layer',
				renderer: { type: 'openlime:image', source: 'img' },
				renderings: [{ id: 'color' }],
				defaultRendering: 'color'
			}
		},
		...overrides
	};
}

function scene(instances, overrides = {}) {
	return {
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: instances,
		...overrides
	};
}

function project(session, options = {}) {
	const target = { layers: {}, redraws: 0, requestRedraw() { this.redraws += 1; } };
	const created = [];
	const projection = new SceneProjection(session, target, {
		createLayer(layerOptions) {
			created.push(layerOptions);
			return { ...layerOptions, transform: { ...layerOptions.transform } };
		},
		...options
	});
	return { target, created, projection };
}

function boxCoords(box) {
	return { xLow: box.xLow, yLow: box.yLow, xHigh: box.xHigh, yHigh: box.yHigh };
}

test('copies the composed similarity onto the layer transform', () => {
	const document = asset();
	document.nodes.base.spatial = {
		toParent: { type: 'similarity2d', translation: [10, 0] },
		assetToLocal: { type: 'similarity2d', scale: 2 }
	};
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'similarity2d', rotation: 90 } }
	]));
	const { target, projection } = project(session);
	const layer = target.layers['only/base'];
	assert.equal(layer.transform.z, 2);
	assert.equal(layer.transform.a, 90);
	assert.ok(Math.abs(layer.transform.x) < 1e-9);
	assert.ok(Math.abs(layer.transform.y - 10) < 1e-9);
	assert.equal(projection.layer('only/base'), layer);
});

test('gives each instance its own layer and keeps one source record', () => {
	const document = asset();
	const session = SceneSession.open(scene([
		{ id: 'left', asset: document.id, document, transform: { type: 'identity' } },
		{ id: 'right', asset: document.id, document, transform: { type: 'similarity2d', translation: [200, 0] } }
	]));
	const { target, created, projection } = project(session);
	const left = target.layers['left/base'];
	const right = target.layers['right/base'];
	assert.notEqual(left, right);
	assert.equal(left.sourceLayer, undefined);
	assert.equal(right.sourceLayer, undefined);
	assert.equal(created.length, 2);
	assert.equal(projection.sourceRecord('left/base'), projection.sourceRecord('right/base'));
	assert.deepEqual(projection.sourceRecord('left/base').nodes, ['left/base', 'right/base']);

	session.setInstanceEnabled('left', false);
	assert.equal(target.layers['left/base'], left);
	assert.equal(left.visible, false);
	assert.equal(right.visible, true);
	assert.equal(created.length, 2);
});

test('hiding a group hides its leaves and keeps a child that was already off', () => {
	const document = asset();
	document.nodes.root.children = ['pair'];
	document.nodes.pair = { type: 'group', activation: { mode: 'stack' }, children: ['base', 'other'] };
	document.nodes.other = {
		type: 'layer',
		renderer: { type: 'openlime:image', source: 'img' },
		renderings: [{ id: 'color' }],
		defaultRendering: 'color'
	};
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	]));
	const { target, projection } = project(session);
	assert.equal(target.layers['only/base'].zindex, 0);
	assert.equal(target.layers['only/other'].zindex, 1);

	session.setNodeEnabled('only', 'pair', false);
	assert.equal(target.layers['only/base'].visible, false);
	assert.equal(target.layers['only/other'].visible, false);
	session.setNodeEnabled('only', 'base', false);
	session.setNodeEnabled('only', 'pair', true);
	assert.equal(target.layers['only/base'].visible, false);
	assert.equal(target.layers['only/other'].visible, true);
	assert.equal(target.layers['only/other'].zindex, 1);
	assert.equal(projection.redraws, 4);
	assert.equal(target.redraws, 4);
});

test('a rejected command does not redraw or move the layer', () => {
	const document = asset();
	document.nodes.base.spatial = { toParent: { type: 'similarity2d', translation: [5, 0], scale: 2 } };
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'similarity2d', translation: [100, 0] } }
	]));
	const { target, projection } = project(session);
	const layer = target.layers['only/base'];
	assert.equal(layer.transform.x, 105);
	assert.equal(layer.transform.z, 2);
	assert.throws(() => session.setAssetTransform('only', { type: 'similarity2d', scale: 0 }), SceneValidationError);
	assert.equal(layer.transform.x, 105);
	assert.equal(projection.redraws, 1);
});

test('placement update reuses the layer and moves the fit box', () => {
	const document = asset();
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	], { viewer: { fitPolicy: 'active' } }));
	const { target, projection } = project(session);
	assert.deepEqual(boxCoords(projection.fitBounds), { xLow: -50, yLow: -50, xHigh: 50, yHigh: 50 });
	assert.equal(typeof projection.fitBounds.isEmpty, 'function');
	session.setAssetTransform('only', { type: 'similarity2d', translation: [200, 0] });
	assert.equal(target.layers['only/base'].transform.x, 200);
	assert.deepEqual(boxCoords(projection.fitBounds), { xLow: 150, yLow: -50, xHigh: 250, yHigh: 50 });
});

test('fit all keeps hidden leaves and declared uses the scene extent', () => {
	const document = asset();
	document.nodes.root.children = ['base', 'other'];
	document.sources.other = { id: 'urn:example:source:other', uri: 'other.jpg', bounds: { width: 20, height: 20 } };
	document.nodes.other = {
		type: 'layer',
		renderer: { type: 'openlime:image', source: 'other' },
		renderings: [{ id: 'color' }],
		defaultRendering: 'color',
		spatial: { toParent: { type: 'similarity2d', translation: [200, 0] } }
	};
	const all = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	], { viewer: { fitPolicy: 'all' } }));
	const allProjection = project(all).projection;
	all.setNodeEnabled('only', 'other', false);
	assert.deepEqual(boxCoords(allProjection.fitBounds), { xLow: -50, yLow: -50, xHigh: 210, yHigh: 50 });

	const declared = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	], {
		viewer: { fitPolicy: 'declared' },
		root: {
			spatial: {
				space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' },
				extent: { xLow: -10, yLow: -5, xHigh: 30, yHigh: 15 }
			}
		}
	}));
	assert.deepEqual(boxCoords(project(declared).projection.fitBounds), { xLow: -10, yLow: -5, xHigh: 30, yHigh: 15 });
});

test('active fit ignores a hidden instance of a shared source', () => {
	const document = asset();
	const session = SceneSession.open(scene([
		{ id: 'left', asset: document.id, document, transform: { type: 'identity' } },
		{ id: 'right', asset: document.id, document, transform: { type: 'similarity2d', translation: [200, 0] } }
	], { viewer: { fitPolicy: 'active' } }));
	const { projection } = project(session);
	assert.equal(projection.fitBounds.xHigh, 250);
	session.setInstanceEnabled('right', false);
	assert.deepEqual(boxCoords(projection.fitBounds), { xLow: -50, yLow: -50, xHigh: 50, yHigh: 50 });
});

test('applyFit installs a BoundingBox on the camera', () => {
	const document = asset();
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	], { viewer: { fitPolicy: 'active' } }));
	const camera = {
		viewport: { dx: 100, dy: 100 },
		boundingBox: null,
		updateBounds(box) { this.boundingBox = box; }
	};
	const target = { layers: {}, camera, requestRedraw() {} };
	const projection = new SceneProjection(session, target, {
		createLayer(layerOptions) {
			return { ...layerOptions, transform: { ...layerOptions.transform }, width: 100, height: 100 };
		}
	});
	assert.equal(typeof camera.boundingBox.isEmpty, 'function');
	assert.equal(camera.boundingBox.isEmpty(), false);
	assert.deepEqual(boxCoords(camera.boundingBox), boxCoords(projection.fitBounds));
});

test('RTI normals changes the source key and unknown options are rejected', () => {
	const document = asset();
	document.sources.rti = { id: 'urn:example:source:rti', uri: 'info.json', layout: { type: 'deepzoom' } };
	document.nodes.root.children = ['base', 'normals'];
	document.nodes.normals = {
		type: 'layer',
		renderer: { type: 'openlime:rti', source: 'rti', options: { normals: true } },
		renderings: [{ id: 'relight', mode: 'light' }],
		defaultRendering: 'relight'
	};
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	]));
	const { target, projection } = project(session);
	assert.equal(target.layers['only/normals'].type, 'rti');
	assert.equal(target.layers['only/normals'].layout, 'deepzoom');
	assert.equal(target.layers['only/normals'].normals, true);
	assert.notEqual(projection.sourceRecord('only/base').key, projection.sourceRecord('only/normals').key);

	document.nodes.base.renderer.options = { sharpen: true };
	const rejected = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	]));
	assert.throws(() => project(rejected), SceneValidationError);
});

test('a resolver replaces the delivery url and leaves the stored uri', () => {
	const document = asset();
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	]));
	const { target } = project(session, {
		resolveUrl(source) { return 'https://cdn.example/' + source.uri; }
	});
	assert.equal(target.layers['only/base'].url, 'https://cdn.example/lighthouse.jpg');
	assert.equal(session.assetByInstance.get('only').sources.img.uri, 'lighthouse.jpg');
});

test('autofit writes the active box onto the camera once per command', () => {
	const document = asset();
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	], { viewer: { fitPolicy: 'active', autofit: true } }));
	const camera = { viewport: { dx: 200, dy: 100 }, updates: 0, updateBounds(box, minScale) { this.box = box; this.minScale = minScale; this.updates += 1; } };
	const target = { layers: {}, camera, requestRedraw() {} };
	new SceneProjection(session, target, {
		createLayer(layerOptions) { return { ...layerOptions, transform: { ...layerOptions.transform } }; }
	});
	assert.equal(camera.box.width(), 100);
	assert.equal(camera.box.height(), 100);
	assert.equal(camera.minScale, 1);
	session.setNodeEnabled('only', 'base', false);
	assert.equal(camera.updates, 1);
});

test('legacy import keeps z order and visibility without using the flat merge', () => {
	const session = SceneSession.openLegacy({
		layers: {
			above: { type: 'image', url: 'b.jpg', zindex: 2 },
			below: { type: 'image', url: 'a.jpg', zindex: 1, visible: false }
		},
		events: [{}],
		plugins: [{}],
		connections: [{}]
	});
	const { target } = project(session);
	assert.equal(target.layers['legacy/below'].visible, false);
	assert.equal(target.layers['legacy/below'].zindex, 0);
	assert.equal(target.layers['legacy/above'].zindex, 1);
	assert.equal(target.layers['legacy/above'].url, 'b.jpg');
	const codes = session.diagnostics.map(item => item.code);
	assert.ok(codes.includes('LEGACY_LOCAL_IDS'));
	assert.ok(codes.includes('EVENTS_DROPPED'));
	assert.ok(codes.includes('PLUGINS_DROPPED'));
	assert.ok(codes.includes('CONNECTIONS_DROPPED'));
});
