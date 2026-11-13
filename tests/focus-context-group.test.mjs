import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FocusContextGroup } from '../src/FocusContextGroup.js';

function mockController({ id, zindex = 0, inside = false, visible = true, active = true, enableDirectContextControl = true }) {
	return {
		id,
		active,
		enableDirectContextControl,
		lensLayer: { visible, zindex },
		isInsideLens() { return { inside, border: false }; }
	};
}

test('first registered controller becomes active', () => {
	const group = new FocusContextGroup();
	const a = mockController({ id: 'a' });
	const b = mockController({ id: 'b' });
	group.register(a);
	group.register(b);
	assert.equal(group.active, a);
});

test('lens hit promotes that controller and ignores the other', () => {
	const group = new FocusContextGroup();
	const a = mockController({ id: 'a', inside: false, zindex: 1 });
	const b = mockController({ id: 'b', inside: true, zindex: 2 });
	group.register(a);
	group.register(b);
	assert.equal(group.roleFor(a, { x: 0, y: 0 }), 'ignore');
	assert.equal(group.roleFor(b, { x: 0, y: 0 }), 'lens');
	assert.equal(group.active, b);
});

test('higher zindex wins when lenses overlap', () => {
	const group = new FocusContextGroup();
	const low = mockController({ id: 'low', inside: true, zindex: 1 });
	const high = mockController({ id: 'high', inside: true, zindex: 5 });
	group.register(low);
	group.register(high);
	assert.equal(group.hitWinner({ x: 0, y: 0 }), high);
	assert.equal(group.roleFor(low, { x: 0, y: 0 }), 'ignore');
	assert.equal(group.roleFor(high, { x: 0, y: 0 }), 'lens');
});

test('outside every lens only the active controller gets context', () => {
	const group = new FocusContextGroup();
	const a = mockController({ id: 'a', inside: false });
	const b = mockController({ id: 'b', inside: false });
	group.register(a);
	group.register(b);
	assert.equal(group.roleFor(a, { x: 0, y: 0 }), 'context');
	assert.equal(group.roleFor(b, { x: 0, y: 0 }), 'ignore');
});

test('unregister promotes the next controller', () => {
	const group = new FocusContextGroup();
	const a = mockController({ id: 'a' });
	const b = mockController({ id: 'b' });
	group.register(a);
	group.register(b);
	group.unregister(a);
	assert.equal(group.active, b);
	assert.deepEqual(group.controllers, [b]);
});

test('hidden lenses are skipped for hits', () => {
	const group = new FocusContextGroup();
	const hidden = mockController({ id: 'hidden', inside: true, visible: false, zindex: 9 });
	const visible = mockController({ id: 'visible', inside: true, zindex: 1 });
	group.register(hidden);
	group.register(visible);
	assert.equal(group.hitWinner({ x: 0, y: 0 }), visible);
});
