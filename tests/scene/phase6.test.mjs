import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneSession, SceneValidationError } from '../../src/scene/SceneSession.js';
import { SceneProjection } from '../../src/scene/SceneProjection.js';
import { adapters } from '../../src/scene/adapters.js';

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

/** Ephemeral channels adapter used only by these tests (not a real LayerBRDF). */
const testChannelsAdapter = {
	type: 'openlime:test-channels',
	layerType: 'test-channels',
	sourceBinding: 'channels',
	channelRoles: { required: ['kd', 'normals'], optional: ['ks'] },
	knownOptions: [],
	defaultShader: 'standard',
	shaders: ['standard'],
	modes: [],
	parameters: {},
	controls: [],
	sourceFingerprint() {
		return {};
	},
	buildLayerFields(ctx) {
		const channels = {};
		for (const [role, source] of Object.entries(ctx.channels || {})) {
			channels[role] = {
				url: ctx.resolveUrl(source),
				layout: source.layout?.type || source.layout || 'image'
			};
		}
		return { channels };
	}
};

function channelsAsset(overrides = {}) {
	return {
		format: 'openlime-asset',
		formatVersion: '1.0.0',
		id: 'urn:example:channels',
		sources: {
			kd: { id: 'urn:example:source:kd', uri: 'kd.jpg', bounds: { width: 64, height: 64 } },
			n: { id: 'urn:example:source:n', uri: 'n.jpg', revision: '1', bounds: { width: 64, height: 64 } },
			ks: { id: 'urn:example:source:ks', uri: 'ks.jpg', bounds: { width: 64, height: 64 } }
		},
		root: 'root',
		nodes: {
			root: {
				type: 'group',
				activation: { mode: 'stack' },
				children: ['mat'],
				spatial: { space: { id: 'urn:example:frame:channels:root', type: 'cartesian2d' } }
			},
			mat: {
				type: 'layer',
				renderer: {
					type: 'openlime:test-channels',
					sources: { kd: 'kd', normals: 'n', ks: 'ks' }
				},
				renderings: [{ id: 'shade' }],
				defaultRendering: 'shade'
			}
		},
		...overrides
	};
}

function withTestChannels(run) {
	adapters.push(testChannelsAdapter);
	try {
		return run();
	} finally {
		const index = adapters.indexOf(testChannelsAdapter);
		if (index >= 0) adapters.splice(index, 1);
	}
}

test('channels binding resolves roles into layer fields', () => {
	withTestChannels(() => {
		const document = channelsAsset();
		const session = SceneSession.open(scene([
			{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
		]));
		const { target, created } = project(session, {
			resolveUrl(source) { return 'https://cdn.example/' + source.uri; }
		});
		assert.equal(target.layers['only/mat'].type, 'test-channels');
		assert.deepEqual(created[0].channels, {
			kd: { url: 'https://cdn.example/kd.jpg', layout: 'image' },
			normals: { url: 'https://cdn.example/n.jpg', layout: 'image' },
			ks: { url: 'https://cdn.example/ks.jpg', layout: 'image' }
		});
	});
});

test('channels binding rejects a missing required role', () => {
	withTestChannels(() => {
		const document = channelsAsset();
		delete document.nodes.mat.renderer.sources.normals;
		assert.throws(
			() => SceneSession.open(scene([
				{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
			])),
			(error) => error instanceof SceneValidationError
				&& error.diagnostics.some(item => item.code === 'MISSING_CHANNEL')
		);
	});
});

test('channels source key changes when a channel uri or revision changes', () => {
	withTestChannels(() => {
		const document = channelsAsset();
		const session = SceneSession.open(scene([
			{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
		]));
		const { projection } = project(session);
		const firstKey = projection.sourceRecord('only/mat').key;

		document.sources.n.revision = '2';
		const revised = SceneSession.open(scene([
			{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
		]));
		const revisedKey = project(revised).projection.sourceRecord('only/mat').key;
		assert.notEqual(firstKey, revisedKey);

		document.sources.n.revision = '1';
		document.sources.kd.uri = 'kd-v2.jpg';
		const moved = SceneSession.open(scene([
			{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
		]));
		assert.notEqual(firstKey, project(moved).projection.sourceRecord('only/mat').key);
	});
});

function rilsrAsset(overrides = {}) {
	return {
		format: 'openlime-asset',
		formatVersion: '1.0.0',
		id: 'urn:example:rilsr',
		sources: {
			rilsr: {
				id: 'urn:example:source:rilsr',
				uri: 'info.json',
				layout: { type: 'deepzoom' },
				bounds: { width: 128, height: 128 }
			}
		},
		root: 'root',
		nodes: {
			root: {
				type: 'group',
				activation: { mode: 'stack' },
				children: ['base'],
				spatial: { space: { id: 'urn:example:frame:rilsr:root', type: 'cartesian2d' } }
			},
			base: {
				type: 'layer',
				renderer: { type: 'openlime:rilsr', source: 'rilsr' },
				renderings: [
					{ id: 'relight', mode: 'light' },
					{ id: 'edges', mode: 'edge' }
				],
				defaultRendering: 'relight'
			}
		},
		...overrides
	};
}

test('RILSR adapter projects url, layout, and light presets', () => {
	const document = rilsrAsset();
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	]));
	const { target, created, projection } = project(session, {
		resolveUrl(source) { return 'https://cdn.example/' + source.uri; }
	});
	assert.equal(target.layers['only/base'].type, 'rilsr');
	assert.equal(target.layers['only/base'].url, 'https://cdn.example/info.json');
	assert.equal(target.layers['only/base'].layout, 'deepzoom');
	assert.equal(created[0].normals, undefined);
	assert.equal(projection.sourceRecord('only/base').type, 'openlime:rilsr');

	session.setLayerRendering('only', 'base', 'edges');
	assert.equal(target.layers['only/base'].mode, 'edge');
});

test('RILSR rejects modes the adapter does not offer', () => {
	const document = rilsrAsset();
	document.nodes.base.renderings.push({ id: 'bogus', mode: 'relief' });
	document.nodes.base.defaultRendering = 'bogus';
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	]));
	assert.throws(
		() => project(session),
		(error) => error instanceof SceneValidationError
			&& error.diagnostics.some(item => item.code === 'PRESET_MODE')
	);
});

test('two RILSR instances share one source record', () => {
	const document = rilsrAsset();
	const session = SceneSession.open(scene([
		{ id: 'left', asset: document.id, document, transform: { type: 'identity' } },
		{ id: 'right', asset: document.id, document, transform: { type: 'similarity2d', translation: [200, 0] } }
	]));
	const { target, projection } = project(session);
	assert.notEqual(target.layers['left/base'], target.layers['right/base']);
	assert.equal(projection.sourceRecord('left/base'), projection.sourceRecord('right/base'));
});

function neuralAsset(overrides = {}) {
	return {
		format: 'openlime-asset',
		formatVersion: '1.0.0',
		id: 'urn:example:neural',
		sources: {
			neural: {
				id: 'urn:example:source:neural',
				uri: 'config.json',
				layout: { type: 'deepzoom' },
				bounds: { width: 256, height: 256 }
			}
		},
		root: 'root',
		nodes: {
			root: {
				type: 'group',
				activation: { mode: 'stack' },
				children: ['base'],
				spatial: { space: { id: 'urn:example:frame:neural:root', type: 'cartesian2d' } }
			},
			base: {
				type: 'layer',
				renderer: { type: 'openlime:neural', source: 'neural' },
				renderings: [
					{ id: 'relight', shader: 'neural', controls: { light: [0.2, 0.1] } },
					{ id: 'rgb', shader: 'standard' }
				],
				defaultRendering: 'relight'
			}
		},
		...overrides
	};
}

test('Neural adapter projects url, layout, and optional tuning fields', () => {
	const document = neuralAsset();
	document.nodes.base.renderer.options = { convergenceSpeed: 1.1, maxTiles: 20 };
	const session = SceneSession.open(scene([
		{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }
	]));
	const { target, created, projection } = project(session, {
		resolveUrl(source) { return 'https://cdn.example/' + source.uri; }
	});
	assert.equal(target.layers['only/base'].type, 'neural');
	assert.equal(target.layers['only/base'].url, 'https://cdn.example/config.json');
	assert.equal(target.layers['only/base'].layout, 'deepzoom');
	assert.equal(created[0].convergenceSpeed, 1.1);
	assert.equal(created[0].maxTiles, 20);
	assert.equal(projection.sourceRecord('only/base').type, 'openlime:neural');

	session.setLayerRendering('only', 'base', 'rgb');
	assert.equal(target.layers['only/base'].shaderId, 'standard');
});

test('Neural rejects modes and bad option types', () => {
	const withMode = neuralAsset();
	withMode.nodes.base.renderings.push({ id: 'bogus', mode: 'light' });
	withMode.nodes.base.defaultRendering = 'bogus';
	const session = SceneSession.open(scene([
		{ id: 'only', asset: withMode.id, document: withMode, transform: { type: 'identity' } }
	]));
	assert.throws(
		() => project(session),
		(error) => error instanceof SceneValidationError
			&& error.diagnostics.some(item => item.code === 'PRESET_MODE')
	);

	const badOpt = neuralAsset();
	badOpt.nodes.base.renderer.options = { maxTiles: 'many' };
	const again = SceneSession.open(scene([
		{ id: 'only', asset: badOpt.id, document: badOpt, transform: { type: 'identity' } }
	]));
	assert.throws(
		() => project(again),
		(error) => error instanceof SceneValidationError
			&& error.diagnostics.some(item => item.code === 'RENDERER_OPTION')
	);
});

test('two Neural instances share one source record', () => {
	const document = neuralAsset();
	const session = SceneSession.open(scene([
		{ id: 'left', asset: document.id, document, transform: { type: 'identity' } },
		{ id: 'right', asset: document.id, document, transform: { type: 'similarity2d', translation: [200, 0] } }
	]));
	const { target, projection } = project(session);
	assert.notEqual(target.layers['left/base'], target.layers['right/base']);
	assert.equal(projection.sourceRecord('left/base'), projection.sourceRecord('right/base'));
});
