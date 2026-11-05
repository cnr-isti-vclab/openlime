import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneSession } from '../../src/scene/SceneSession.js';
import { sceneTreeModel, applyTreeAction, actionFromInput } from '../../src/scene/SceneTree.js';

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
				label: 'Lighthouse',
				activation: { mode: 'stack' },
				children: ['study', 'rti'],
				spatial: { space: { id: 'urn:example:frame:lighthouse:root', type: 'cartesian2d' } }
			},
			study: {
				type: 'group',
				label: 'Technical study',
				activation: { mode: 'exclusive', required: true },
				children: ['color', 'infra']
			},
			color: {
				type: 'layer',
				label: 'Visible',
				renderer: { type: 'openlime:image', source: 'color' },
				renderings: [{ id: 'color', label: 'Color' }],
				defaultRendering: 'color'
			},
			infra: {
				type: 'layer',
				label: 'Infrared',
				renderer: { type: 'openlime:image', source: 'infra' },
				renderings: [{ id: 'color', label: 'Color' }],
				defaultRendering: 'color'
			},
			rti: {
				type: 'layer',
				label: 'RTI',
				renderer: { type: 'openlime:rti', source: 'rti' },
				renderings: [
					{ id: 'relight', label: 'Relight', shader: 'rti', mode: 'light', controls: { light: [0, 0] }, exposeControls: ['light'] },
					{ id: 'normals', label: 'Normals', shader: 'rti', mode: 'normals' }
				],
				defaultRendering: 'relight'
			}
		},
		lensProfiles: {
			inspect: {
				type: 'openlime:circular-lens',
				label: 'Inspection',
				host: 'rti',
				background: { default: 'light', choices: [{ id: 'light', label: 'Light', target: { kind: 'layer', node: 'rti', rendering: 'relight' } }] },
				foreground: {
					default: 'normals',
					choices: [
						{ id: 'normals', label: 'Normals', target: { kind: 'layer', node: 'rti', rendering: 'normals' } },
						{ id: 'infra', label: 'Infrared', target: { kind: 'layer', node: 'infra', rendering: 'color' } }
					]
				},
				geometry: { coordinateSpace: 'asset', defaultCenter: [0, 0], defaultRadius: 80 }
			}
		}
	};
}

function session() {
	const document = asset();
	return SceneSession.open({
		format: 'openlime-scene',
		formatVersion: '1.0.0',
		id: 'urn:example:wall',
		label: 'Wall',
		root: { spatial: { space: { id: 'urn:example:frame:wall:root', type: 'cartesian2d' } } },
		assets: [
			{ id: 'left', label: 'Left', asset: document.id, document, transform: { type: 'similarity2d', translation: [-400, 0] } },
			{ id: 'right', label: 'Right', asset: document.id, document, transform: { type: 'similarity2d', translation: [400, 0] } }
		]
	});
}

function find(row, qualifiedId) {
	if (row.qualifiedId === qualifiedId) return row;
	for (const child of row.children) {
		const found = find(child, qualifiedId);
		if (found) return found;
	}
	return null;
}

test('the tree lists both instances and keeps a group toggle on the subtree', () => {
	const mounted = session();
	const before = sceneTreeModel(mounted);
	assert.equal(before.label, 'Wall');
	assert.equal(find(before, 'left').label, 'Left');
	assert.equal(find(before, 'right').label, 'Right');
	assert.equal(find(before, 'left/study').control, 'checkbox');
	assert.equal(find(before, 'left/color').control, 'radio');
	assert.equal(find(before, 'left/color').selected, true);
	assert.equal(find(before, 'left/infra').selected, false);

	applyTreeAction(mounted, actionFromInput({
		dataset: { action: 'enabled', role: 'node', instanceId: 'left', nodeId: 'study' },
		checked: false
	}));
	const after = sceneTreeModel(mounted);
	assert.equal(find(after, 'left/color').enabled, true);
	assert.equal(find(after, 'left/color').effective, false);
	assert.equal(find(after, 'left/rti').effective, true);
	assert.equal(find(after, 'right/color').effective, true);
});

test('exclusive selection, presets, light, and the lens go through the tree actions', () => {
	const mounted = session();
	applyTreeAction(mounted, actionFromInput({
		dataset: { action: 'select', instanceId: 'left', groupId: 'study', childId: 'infra' },
		checked: true
	}));
	applyTreeAction(mounted, actionFromInput({
		dataset: { action: 'rendering', instanceId: 'left', nodeId: 'rti' },
		value: 'normals'
	}));
	applyTreeAction(mounted, actionFromInput({
		dataset: { action: 'lens', instanceId: 'left', lensId: 'inspect' },
		checked: true
	}));
	applyTreeAction(mounted, actionFromInput({
		dataset: { action: 'lens-choice', instanceId: 'left', lensId: 'inspect', slot: 'foreground' },
		value: 'infra'
	}));
	applyTreeAction(mounted, actionFromInput({
		dataset: { action: 'control', instanceId: 'right', nodeId: 'rti', renderingId: 'relight', controlId: 'light', axis: '0', value: '0,0' },
		value: '0.4'
	}));

	const model = sceneTreeModel(mounted);
	assert.equal(find(model, 'left/infra').selected, true);
	assert.equal(find(model, 'left/color').effective, false);
	const leftRti = find(model, 'left/rti');
	assert.equal(leftRti.renderings.find(item => item.active).id, 'normals');
	assert.equal(leftRti.lenses[0].enabled, true);
	assert.equal(leftRti.lenses[0].slots[1].selected, 'infra');
	assert.equal(find(model, 'right/rti').lenses[0].enabled, false);
	assert.deepEqual(find(model, 'right/rti').renderings[0].controls[0].value, [0.4, 0]);
	assert.equal(find(model, 'left/color').lenses.length, 0);
});
