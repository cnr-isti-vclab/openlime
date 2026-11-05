import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneSession, SceneValidationError, legacyManifestToAsset } from '../../src/scene/SceneSession.js';

function asset(overrides = {}) {
	return {
		format: 'openlime-asset',
		formatVersion: '1.0.0',
		id: 'urn:example:lighthouse',
		sources: {
			img: { id: 'urn:example:source:lighthouse', uri: 'lighthouse.jpg' }
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

test('composes a node transform before its placement', () => {
	const document = asset();
	document.nodes.base.spatial = { toParent: { type: 'similarity2d', translation: [10, 0] } };
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'similarity2d', rotation: 90 } }
	]));
	const origin = session.worldTransform('only/base').apply(0, 0);
	assert.ok(Math.abs(origin.x) < 1e-9);
	assert.ok(Math.abs(origin.y - 10) < 1e-9);
	const local = session.assetTransform('only/base');
	assert.equal(local.x, 10);
	assert.equal(local.a, 0);
});

test('disabling a group hides descendants and restores their flags', () => {
	const document = asset();
	document.nodes.root.children = ['pair'];
	document.nodes.pair = { type: 'group', activation: { mode: 'stack' }, children: ['base', 'other'] };
	document.nodes.other = {
		type: 'layer',
		renderer: { type: 'openlime:image', source: 'img' },
		renderings: [{ id: 'color' }],
		defaultRendering: 'color'
	};
	const session = openWith(document);
	session.setNodeEnabled('only', 'pair', false);
	assert.equal(session.effectiveEnabled('only/base'), false);
	assert.equal(session.effectiveEnabled('only/other'), false);
	session.setNodeEnabled('only', 'base', false);
	session.setNodeEnabled('only', 'pair', true);
	assert.equal(session.effectiveEnabled('only/base'), false);
	assert.equal(session.effectiveEnabled('only/other'), true);
});

test('disabling a leaf leaves its sibling visible', () => {
	const document = asset();
	document.nodes.root.children = ['base', 'other'];
	document.nodes.other = {
		type: 'layer',
		renderer: { type: 'openlime:image', source: 'img' },
		renderings: [{ id: 'color' }],
		defaultRendering: 'color'
	};
	const session = openWith(document);
	session.setNodeEnabled('only', 'base', false);
	assert.equal(session.effectiveEnabled('only/base'), false);
	assert.equal(session.effectiveEnabled('only/other'), true);
	assert.deepEqual(session.activeLeaves().map(leaf => leaf.qualifiedId), ['only/other']);
});

test('disabling one instance leaves the other rendered', () => {
	const document = asset();
	const session = SceneSession.open(scene([
		{ id: 'left', asset: document.id, document, transform: { type: 'similarity2d', translation: [-40, 0] } },
		{ id: 'right', asset: document.id, document, transform: { type: 'similarity2d', translation: [40, 0] } }
	]));
	session.setInstanceEnabled('left', false);
	const leaves = session.activeLeaves().map(leaf => leaf.qualifiedId);
	assert.deepEqual(leaves, ['right/base']);
	assert.equal(session.effectiveEnabled('right/base'), true);
});

test('a required exclusive group keeps one active child', () => {
	const document = asset();
	document.nodes.root.activation = { mode: 'exclusive', required: true };
	document.nodes.root.children = ['base', 'other'];
	document.nodes.other = {
		type: 'layer',
		renderer: { type: 'openlime:image', source: 'img' },
		renderings: [{ id: 'color' }],
		defaultRendering: 'color'
	};
	const session = openWith(document);
	assert.equal(session.effectiveEnabled('only/base'), true);
	assert.equal(session.effectiveEnabled('only/other'), false);
	session.selectGroupChild('only', 'root', 'other');
	assert.equal(session.effectiveEnabled('only/base'), false);
	assert.equal(session.effectiveEnabled('only/other'), true);
	assert.throws(() => session.selectGroupChild('only', 'root', null));
	assert.equal(session.state.assets.only.selections.root, 'other');
});

test('rejects cycles, two parents, affine transforms, and broken lenses', () => {
	const cycled = asset();
	cycled.nodes.root.children = ['loop'];
	cycled.nodes.loop = { type: 'group', children: ['root'] };
	assert.throws(() => openWith(cycled), SceneValidationError);

	const doubled = asset();
	doubled.nodes.extra = { type: 'group', children: ['base'] };
	doubled.nodes.root.children = ['base', 'extra'];
	assert.throws(() => openWith(doubled), SceneValidationError);

	const affine = asset();
	affine.nodes.base.spatial = { toParent: { type: 'affine2d', matrix: [1, 0, 0, 1, 0, 0] } };
	assert.throws(() => openWith(affine), SceneValidationError);

	const lens = asset();
	lens.lensProfiles = {
		inspect: {
			host: 'missing',
			background: { default: 'a', choices: [{ id: 'a', target: { kind: 'layer', node: 'missing', rendering: 'color' } }] },
			foreground: { default: 'b', choices: [{ id: 'b', target: { kind: 'layer', node: 'base', rendering: 'color' } }] }
		}
	};
	assert.throws(() => openWith(lens), SceneValidationError);
});

test('maps asset space and scene space through placement', () => {
	const document = asset();
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'similarity2d', translation: [100, 0], scale: 2 } }
	]));
	const scenePoint = session.assetToScene('only', { x: 10, y: 0 });
	assert.equal(scenePoint.x, 120);
	assert.equal(scenePoint.y, 0);
	const back = session.sceneToAsset('only', scenePoint);
	assert.ok(Math.abs(back.x - 10) < 1e-9);
	assert.ok(Math.abs(back.y) < 1e-9);
});

test('changing placement does not change the asset-local transform', () => {
	const document = asset();
	document.nodes.base.spatial = { toParent: { type: 'similarity2d', translation: [5, 0], scale: 2 } };
	const original = JSON.stringify(document);
	const session = openWith(document);
	const before = session.assetTransform('only/base');
	session.setAssetTransform('only', { type: 'similarity2d', translation: [100, 0] });
	const after = session.assetTransform('only/base');
	assert.equal(after.x, before.x);
	assert.equal(after.z, before.z);
	assert.equal(session.worldTransform('only/base').apply(0, 0).x, 105);
	assert.equal(JSON.stringify(document), original);
	assert.throws(() => session.setAssetTransform('only', { type: 'similarity2d', scale: 0 }));
	assert.equal(session.worldTransform('only/base').apply(0, 0).x, 105);
});

test('round-trips visibility and the active preset', () => {
	const document = asset();
	document.nodes.base.renderings.push({ id: 'normals', mode: 'normals' });
	const session = openWith(document);
	session.setNodeEnabled('only', 'base', false);
	session.setLayerRendering('only', 'base', 'normals');
	const saved = session.exportState();
	const again = openWith(document);
	again.importState(saved);
	assert.equal(again.effectiveEnabled('only/base'), false);
	assert.equal(again.state.assets.only.layers.base.rendering, 'normals');
});

test('converts a flat manifest into one stack-rooted asset', () => {
	const converted = legacyManifestToAsset({
		layers: {
			above: { type: 'image', url: 'b.jpg', zindex: 2, transform: { x: 4, y: 0, z: 1, a: 0 } },
			below: { type: 'image', url: 'a.jpg', zindex: 1, visible: false }
		}
	});
	assert.equal(converted.nodes.root.type, 'group');
	assert.deepEqual(converted.nodes.root.children, ['below', 'above']);
	assert.equal(converted.initialState.enabled.below, false);
	const session = SceneSession.open(scene([
		{ id: 'old', asset: converted.id, document: converted }
	]));
	assert.equal(session.assetTransform('old/above').x, 4);
	assert.equal(session.effectiveEnabled('old/below'), false);
});

function openWith(document) {
	return SceneSession.open(scene([
		{ id: 'only', asset: document.id, document }
	]));
}
