import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneSession, SceneValidationError } from '../../src/scene/SceneSession.js';
import { SceneProjection } from '../../src/scene/SceneProjection.js';

function rendering(id, mode, extra = {}) {
	return { id, label: id, shader: 'rti', mode, ...extra };
}

function document() {
	return {
		format: 'openlime-asset',
		formatVersion: '1.0.0',
		id: 'urn:example:lighthouse',
		sources: {
			rti: { id: 'urn:example:source:rti', uri: 'info.json', layout: { type: 'deepzoom' }, bounds: { width: 100, height: 100 } },
			photo: { id: 'urn:example:source:photo', uri: 'photo.jpg', bounds: { width: 40, height: 40 } },
			infra: { id: 'urn:example:source:infra', uri: 'infra.jpg', bounds: { width: 40, height: 40 } }
		},
		root: 'root',
		nodes: {
			root: {
				type: 'group',
				activation: { mode: 'stack' },
				children: ['rti', 'photo', 'infra'],
				spatial: { space: { id: 'urn:example:frame:lighthouse:root', type: 'cartesian2d' } }
			},
			rti: {
				type: 'layer',
				renderer: { type: 'openlime:rti', source: 'rti' },
				renderings: [
					rendering('relight', 'light', { controls: { light: [0, 0] }, exposeControls: ['light'] }),
					rendering('normals', 'normals'),
					rendering('specular', 'specular', { parameters: { specularExponent: 40 } })
				],
				defaultRendering: 'relight'
			},
			photo: {
				type: 'layer',
				renderer: { type: 'openlime:image', source: 'photo' },
				renderings: [{ id: 'color', label: 'Color' }],
				defaultRendering: 'color'
			},
			infra: {
				type: 'layer',
				renderer: { type: 'openlime:image', source: 'infra' },
				renderings: [{ id: 'color', label: 'Color' }],
				defaultRendering: 'color'
			}
		},
		lensProfiles: {
			inspect: {
				type: 'openlime:circular-lens',
				host: 'rti',
				background: {
					default: 'rti-light',
					choices: [{ id: 'rti-light', target: { kind: 'layer', node: 'rti', rendering: 'relight' } }]
				},
				foreground: {
					default: 'rti-normals',
					choices: [
						{ id: 'rti-normals', target: { kind: 'layer', node: 'rti', rendering: 'normals' } },
						{ id: 'rti-specular', target: { kind: 'layer', node: 'rti', rendering: 'specular' } },
						{ id: 'infra', target: { kind: 'layer', node: 'infra', rendering: 'color' } },
						{ id: 'photo', target: { kind: 'layer', node: 'photo', rendering: 'color' } }
					]
				},
				geometry: { shape: 'circle', coordinateSpace: 'asset', defaultCenter: [10, 0], defaultRadius: 180 }
			},
			other: {
				type: 'openlime:circular-lens',
				host: 'rti',
				background: {
					default: 'rti-light',
					choices: [{ id: 'rti-light', target: { kind: 'layer', node: 'rti', rendering: 'relight' } }]
				},
				foreground: {
					default: 'rti-normals',
					choices: [{ id: 'rti-normals', target: { kind: 'layer', node: 'rti', rendering: 'normals' } }]
				},
				geometry: { coordinateSpace: 'asset', defaultCenter: [0, 0], defaultRadius: 40 }
			}
		},
		initialState: {
			enabled: { infra: false },
			lenses: { inspect: { enabled: true } }
		}
	};
}

function open(extra = {}) {
	const asset = document();
	Object.assign(asset, extra);
	return SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [{
			id: 'only',
			asset: asset.id,
			document: asset,
			transform: { type: 'similarity2d', translation: [100, 0], scale: 2 }
		}]
	});
}

function project(session, extra = {}) {
	const created = [];
	const target = { layers: {}, redraws: 0, requestRedraw() { this.redraws += 1; } };
	const projection = new SceneProjection(session, target, {
		createLayer(options) {
			const layer = {
				...options,
				transform: { ...(options.transform || {}) },
				sourceLayer: options.sourceLayer || null,
				derive(extra) {
					return {
						type: extra.type,
						url: extra.url,
						layout: extra.layout,
						label: extra.label,
						visible: extra.visible,
						zindex: extra.zindex,
						normals: extra.normals,
						transform: { ...(extra.transform || {}) },
						sourceLayer: layer,
						derived: true
					};
				}
			};
			created.push(layer);
			return layer;
		},
		...extra
	});
	return { target, created, projection };
}

test('offers only the listed presets and applies the active one', () => {
	const session = open();
	const ids = session.getNode('only/rti').renderings.map(item => item.id);
	assert.deepEqual(ids, ['relight', 'normals', 'specular']);
	assert.throws(() => session.setLayerRendering('only', 'rti', 'gray_diffuse'), /Unknown rendering/);
	const { target } = project(session);
	assert.equal(target.layers['only/rti'].mode, 'light');
	assert.equal(target.layers['only/rti'].shaderId, 'rti');
	session.setLayerRendering('only', 'rti', 'specular');
	assert.equal(target.layers['only/rti'].mode, 'light');
	session.setLensEnabled('only', 'inspect', false);
	assert.equal(target.layers['only/rti'].mode, 'specular');
	assert.equal(target.layers['only/rti'].parameters.specularExponent, 40);
});

test('rejects a mode or parameter the adapter does not offer', () => {
	const asset = document();
	asset.nodes.rti.renderings.push(rendering('relief', 'relief'));
	asset.nodes.rti.defaultRendering = 'relief';
	const session = SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [{ id: 'only', asset: asset.id, document: asset, transform: { type: 'identity' } }]
	});
	assert.throws(() => project(session), SceneValidationError);

	const parameter = document();
	parameter.nodes.rti.renderings[0].parameters = { gloss: 1 };
	const again = SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [{ id: 'only', asset: parameter.id, document: parameter, transform: { type: 'identity' } }]
	});
	assert.throws(() => project(again), (error) => error instanceof SceneValidationError && error.diagnostics.some(item => item.code === 'PRESET_PARAMETER'));
});

test('a lens foreground shares the source and owns a second shader', () => {
	const session = open();
	const { target, created, projection } = project(session);
	const host = target.layers['only/rti'];
	const lens = target.layers['lens:only/inspect'];
	const child = lens.layers[0];
	assert.equal(created.length, 3);
	assert.equal(child.derived, true);
	assert.equal(child.sourceLayer, host);
	assert.notEqual(child.shader, host.shader);
	assert.equal(child.mode, 'normals');
	assert.equal(host.mode, 'light');
	assert.equal(Object.values(target.layers).includes(child), false);
	assert.ok(projection.sourceRecord('only/rti').nodes.includes('lens:only/inspect:foreground'));
	const visited = [];
	projection.visitLayers(layer => visited.push(layer));
	assert.ok(visited.includes(child));
});

test('switching the foreground leaves unrelated layers in place', () => {
	const session = open();
	const { target, created, projection } = project(session);
	const host = target.layers['only/rti'];
	const photo = target.layers['only/photo'];
	const child = target.layers['lens:only/inspect'].layers[0];
	const redraws = projection.redraws;
	session.selectLensChoice('only', 'inspect', 'foreground', 'rti-specular');
	assert.equal(target.layers['only/rti'], host);
	assert.equal(target.layers['only/photo'], photo);
	assert.equal(target.layers['lens:only/inspect'].layers[0], child);
	assert.equal(child.mode, 'specular');
	assert.equal(created.length, 3);
	assert.equal(projection.redraws, redraws + 1);
	assert.throws(() => session.selectLensChoice('only', 'inspect', 'foreground', 'missing'));
	assert.equal(projection.redraws, redraws + 1);
});

test('slot controls do not overwrite the main preset control', () => {
	const session = open();
	const { target } = project(session);
	session.setLayerControl('only', 'rti', 'relight', 'light', [0.2, -0.1]);
	session.setLensControl('only', 'inspect', 'foreground', 'light', [1, 0]);
	assert.deepEqual(target.layers['only/rti'].controls.light, [0.2, -0.1]);
	assert.deepEqual(target.layers['lens:only/inspect'].layers[0].controls.light, [1, 0]);
});

test('a hidden leaf can fill the lens without joining the main draw', () => {
	const session = open();
	const { target } = project(session);
	session.selectLensChoice('only', 'inspect', 'foreground', 'infra');
	const hidden = target.layers['only/infra'];
	const child = target.layers['lens:only/inspect'].layers[0];
	assert.equal(hidden.visible, false);
	assert.notEqual(child, hidden);
	assert.equal(child.sourceLayer, hidden);
	assert.equal(child.visible, true);
	assert.equal(Object.values(target.layers).includes(child), false);
	assert.equal(child.url, 'infra.jpg');
});

test('an image and an RTI can share one lens without rebuilding the other leaves', () => {
	const session = open();
	const { target, created } = project(session);
	const photo = target.layers['only/photo'];
	const host = target.layers['only/rti'];
	session.selectLensChoice('only', 'inspect', 'foreground', 'photo');
	const child = target.layers['lens:only/inspect'].layers[0];
	assert.equal(target.layers['only/photo'], photo);
	assert.equal(target.layers['only/rti'], host);
	assert.equal(child.sourceLayer, photo);
	assert.equal(child.url, 'photo.jpg');
	assert.equal(created.length, 3);
});

test('the lens follows placement and suspends while its host is inactive', () => {
	const session = open();
	const { target } = project(session);
	const lens = target.layers['lens:only/inspect'];
	assert.deepEqual(lens.center, [120, 0]);
	assert.equal(lens.radius, 360);
	session.setNodeEnabled('only', 'rti', false);
	assert.equal(target.layers['lens:only/inspect'], undefined);
	assert.equal(session.state.assets.only.lenses.inspect.enabled, true);
	assert.equal(target.layers['only/rti'].visible, false);
	session.setNodeEnabled('only', 'rti', true);
	assert.equal(target.layers['lens:only/inspect'].radius, 360);
	assert.equal(target.layers['only/rti'].mode, 'light');
});

test('each instance lens is placed on that copy and draws above the leaves', () => {
	const asset = document();
	const session = SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [
			{ id: 'left', asset: asset.id, document: asset, transform: { type: 'similarity2d', translation: [-400, 0] } },
			{ id: 'right', asset: asset.id, document: asset, transform: { type: 'similarity2d', translation: [400, 0] } }
		]
	});
	const { target } = project(session);
	const top = Math.max(...Object.values(target.layers).filter(layer => !String(layer.id).startsWith('lens:')).map(layer => layer.zindex));
	const left = target.layers['lens:left/inspect'];
	const right = target.layers['lens:right/inspect'];
	assert.ok(left.zindex > top);
	assert.ok(right.zindex > top);
	assert.deepEqual(left.center, [-390, 0]);
	assert.deepEqual(right.center, [410, 0]);
});

test('enabling a second lens on the same host turns the first one off', () => {
	const session = open();
	const { target } = project(session);
	session.setLensEnabled('only', 'other', true);
	assert.equal(session.state.assets.only.lenses.inspect.enabled, false);
	assert.equal(session.state.assets.only.lenses.other.enabled, true);
	assert.equal(target.layers['lens:only/inspect'], undefined);
	assert.ok(target.layers['lens:only/other']);
});

test('the lens controller is named by the asset', () => {
	const session = open();
	const made = [];
	const released = [];
	const { target } = project(session, {
		createController(spec) {
			made.push(spec);
			return { type: spec.type };
		},
		releaseController(controller) { released.push(controller.type); }
	});
	assert.equal(made[0].type, 'openlime:controller-lens');
	assert.equal(made[0].lensLayer, target.layers['lens:only/inspect']);
	assert.equal(made[0].canvas, target);
	assert.equal(target.layers['lens:only/inspect'].controllerType, 'openlime:controller-lens');
	session.setNodeEnabled('only', 'rti', false);
	assert.deepEqual(released, ['openlime:controller-lens']);

	const focus = document();
	focus.lensProfiles.inspect.controller = 'openlime:controller-focus-context';
	const focusMade = [];
	const focusSession = SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [{ id: 'only', asset: focus.id, document: focus, transform: { type: 'identity' } }]
	});
	const { target: focusTarget } = project(focusSession, {
		createController(spec) {
			focusMade.push(spec.type);
			return { type: spec.type };
		}
	});
	assert.equal(focusTarget.layers['lens:only/inspect'].controllerType, 'openlime:controller-focus-context');
	assert.deepEqual(focusMade, ['openlime:controller-focus-context']);

	const unknown = document();
	unknown.lensProfiles.inspect.controller = 'openlime:controller-pan';
	assert.throws(() => SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [{ id: 'only', asset: unknown.id, document: unknown, transform: { type: 'identity' } }]
	}), error => error.diagnostics.some(item => item.code === 'LENS_CONTROLLER'));
});

test('rejects viewport lens space and a subtree that is not a group', () => {
	const space = document();
	space.lensProfiles.inspect.geometry.coordinateSpace = 'viewport-css';
	assert.throws(() => SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [{ id: 'only', asset: space.id, document: space, transform: { type: 'identity' } }]
	}), SceneValidationError);

	const subtree = document();
	subtree.lensProfiles.inspect.foreground.choices[0].target = { kind: 'subtree', node: 'rti' };
	assert.throws(() => SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [{ id: 'only', asset: subtree.id, document: subtree, transform: { type: 'identity' } }]
	}), SceneValidationError);
});
