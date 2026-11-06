import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneSession, SceneValidationError } from '../../src/scene/SceneSession.js';
import { SceneProjection } from '../../src/scene/SceneProjection.js';

function asset() {
	return {
		format: 'openlime-asset',
		formatVersion: '1.0.0',
		id: 'urn:example:lighthouse',
		sources: {
			color: { id: 'urn:example:source:color', uri: 'color.jpg' },
			infra: { id: 'urn:example:source:infra', uri: 'infra.jpg' },
			rti: { id: 'urn:example:source:rti', uri: 'info.json' }
		},
		root: 'root',
		nodes: {
			root: {
				type: 'group',
				activation: { mode: 'stack' },
				children: ['study', 'rti'],
				spatial: { space: { id: 'urn:example:frame:lighthouse:root', type: 'cartesian2d', crs: 'EPSG:0' } }
			},
			study: {
				type: 'group',
				activation: { mode: 'exclusive', required: true },
				children: ['color', 'infra']
			},
			color: {
				type: 'layer',
				renderer: { type: 'openlime:image', source: 'color' },
				renderings: [{ id: 'color' }],
				defaultRendering: 'color'
			},
			infra: {
				type: 'layer',
				renderer: { type: 'openlime:image', source: 'infra' },
				renderings: [{ id: 'color' }],
				defaultRendering: 'color'
			},
			rti: {
				type: 'layer',
				renderer: { type: 'openlime:rti', source: 'rti' },
				renderings: [
					{ id: 'relight', shader: 'rti', mode: 'light' },
					{ id: 'normals', shader: 'rti', mode: 'normals' }
				],
				defaultRendering: 'relight'
			}
		},
		lensProfiles: {
			inspect: {
				type: 'openlime:circular-lens',
				host: 'rti',
				background: {
					default: 'host',
					choices: [{ id: 'host', target: { kind: 'layer', node: 'rti', rendering: 'relight' } }]
				},
				foreground: {
					default: 'study',
					choices: [{
						id: 'study',
						target: {
							kind: 'subtree',
							node: 'study',
							stateOverrides: { selections: { study: 'infra' } }
						}
					}]
				},
				geometry: { coordinateSpace: 'asset', defaultCenter: [0, 0], defaultRadius: 40 }
			}
		},
		initialState: { lenses: { inspect: { enabled: true } } }
	};
}

function open(document = asset()) {
	return SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [{ id: 'only', asset: document.id, document, transform: { type: 'identity' } }]
	});
}

function project(session) {
	const target = { layers: {} };
	const projection = new SceneProjection(session, target, {
		createLayer(options) {
			const layer = {
				...options,
				transform: { ...(options.transform || {}) },
				sourceLayer: options.sourceLayer || null,
				derive(extra) {
					return { ...extra, transform: { ...(extra.transform || {}) }, sourceLayer: layer, derived: true };
				}
			};
			return layer;
		}
	});
	return { target, projection };
}

test('a subtree target draws each selected leaf and not the group', () => {
	const session = open();
	const { target, projection } = project(session);
	const stack = target.layers['lens:only/inspect'].layers[0];
	assert.equal(stack.type, 'stack');
	assert.equal(stack.layers.length, 1);
	assert.equal(stack.layers[0].url, 'infra.jpg');
	assert.equal(stack.layers[0].derived, true);
	assert.equal(stack.layers[0].sourceLayer, target.layers['only/infra']);
	assert.equal(target.layers['only/study'], undefined);
	assert.equal(Object.values(target.layers).includes(stack), false);
	assert.equal(Object.values(target.layers).includes(stack.layers[0]), false);
	assert.equal(target.layers['only/color'].visible, true);
	assert.equal(target.layers['only/infra'].visible, false);
	const visited = [];
	projection.visitLayers(layer => visited.push(layer));
	assert.ok(visited.includes(stack.layers[0]));
});

test('an enabled override shows a disabled leaf only inside the subtree', () => {
	const document = asset();
	document.lensProfiles.inspect.foreground.choices[0].target.stateOverrides = { enabled: { infra: true } };
	document.nodes.study.activation = { mode: 'stack' };
	document.initialState.enabled = { infra: false };
	const session = open(document);
	const { target } = project(session);
	const stack = target.layers['lens:only/inspect'].layers[0];
	const urls = stack.layers.map(layer => layer.url).sort();
	assert.deepEqual(urls, ['color.jpg', 'infra.jpg']);
	assert.equal(target.layers['only/infra'].visible, false);
	assert.equal(session.state.assets.only.enabled.infra, false);
});

test('rejects a mismatched CRS label and still rejects affine2d', () => {
	const document = asset();
	document.nodes.study.spatial = { space: { crs: 'EPSG:1' } };
	assert.throws(() => open(document), (error) => {
		return error instanceof SceneValidationError && error.diagnostics.some(item => item.code === 'CRS_INCOMPATIBLE');
	});
	const affine = asset();
	affine.nodes.color.spatial = { toParent: { type: 'affine2d', matrix: [1, 0, 0, 1, 0, 0] } };
	assert.throws(() => open(affine), (error) => {
		return error instanceof SceneValidationError && error.diagnostics.some(item => item.code === 'TRANSFORM_AFFINE_UNSUPPORTED');
	});
});
