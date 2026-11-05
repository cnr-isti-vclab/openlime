/**
 * Tree UI for a mounted scene.
 * It reads the live graph and calls session commands. It does not set layer.visible.
 */

/** Nested description of the scene tree, including effective visibility and the controls each row offers. */
function sceneTreeModel(session) {
	return rowModel(session, session.getNode(''));
}

function rowModel(session, node) {
	const parent = node.parent == null ? null : session.getNode(node.parent);
	const exclusiveParent = parent?.activation?.mode === 'exclusive';
	const row = {
		qualifiedId: node.qualifiedId,
		instanceId: node.instanceId,
		nodeId: node.nodeId,
		role: node.role === 'node' ? node.type : node.role,
		label: node.label || node.qualifiedId || 'Scene',
		effective: session.effectiveEnabled(node.qualifiedId),
		enabled: ownEnabled(session, node),
		control: node.role === 'scene' ? 'none' : (exclusiveParent ? 'radio' : 'checkbox'),
		selected: exclusiveParent && parentSelection(session, parent) === node.nodeId,
		groupId: exclusiveParent ? parent.nodeId : null,
		renderings: [],
		lenses: [],
		children: node.children.map(id => rowModel(session, session.getNode(id)))
	};
	if (node.type === 'layer') {
		row.renderings = renderingModels(session, node);
		row.lenses = lensModels(session, node);
	}
	return row;
}

function ownEnabled(session, node) {
	if (node.role === 'scene') return true;
	if (node.role === 'instance') return session.state.instances[node.instanceId].enabled !== false;
	return session.state.assets[node.instanceId].enabled[node.nodeId] !== false;
}

function parentSelection(session, parent) {
	return session.state.assets[parent.instanceId].selections[parent.nodeId];
}

function renderingModels(session, node) {
	const active = session.state.assets[node.instanceId].layers[node.nodeId]?.rendering || node.defaultRendering;
	return (node.renderings || []).map(rendering => ({
		id: rendering.id,
		label: rendering.label || rendering.id,
		active: rendering.id === active,
		controls: rendering.id === active ? controlModels(session, node, rendering) : []
	}));
}

function controlModels(session, node, rendering) {
	const stored = session.state.assets[node.instanceId].layers[node.nodeId]?.renderingState?.[rendering.id]?.controls || {};
	return (rendering.exposeControls || []).map(id => ({
		id,
		value: stored[id] || rendering.controls?.[id] || [0, 0]
	}));
}

function lensModels(session, node) {
	const profiles = session.lensProfiles(node.instanceId);
	const state = session.state.assets[node.instanceId].lenses || {};
	return Object.entries(profiles)
		.filter(([, profile]) => profile.host === node.nodeId)
		.map(([id, profile]) => ({
			id,
			label: profile.label || id,
			enabled: state[id]?.enabled === true,
			slots: ['background', 'foreground'].map(slot => ({
				slot,
				selected: state[id]?.[slot] || profile[slot]?.default,
				choices: (profile[slot]?.choices || []).map(choice => ({
					id: choice.id,
					label: choice.label || choice.id
				}))
			}))
		}));
}

/**
 * Apply one tree action to the session.
 * @param {Object} session
 * @param {Object} action
 */
function applyTreeAction(session, action) {
	if (!action) return;
	if (action.type === 'enabled') {
		if (action.role === 'instance') session.setInstanceEnabled(action.instanceId, action.enabled);
		else session.setNodeEnabled(action.instanceId, action.nodeId, action.enabled);
		return;
	}
	if (action.type === 'select') {
		session.selectGroupChild(action.instanceId, action.groupId, action.childId);
		return;
	}
	if (action.type === 'rendering') {
		session.setLayerRendering(action.instanceId, action.nodeId, action.renderingId);
		return;
	}
	if (action.type === 'control') {
		session.setLayerControl(action.instanceId, action.nodeId, action.renderingId, action.controlId, action.value);
		return;
	}
	if (action.type === 'lens') {
		session.setLensEnabled(action.instanceId, action.lensId, action.enabled);
		return;
	}
	if (action.type === 'lens-choice') {
		session.selectLensChoice(action.instanceId, action.lensId, action.slot, action.choiceId);
	}
}

/** Read a tree action from a changed input. Returns null when the element is not a tree control. */
function actionFromInput(input) {
	const data = input?.dataset;
	if (!data?.action) return null;
	if (data.action === 'enabled') {
		return { type: 'enabled', role: data.role, instanceId: data.instanceId, nodeId: data.nodeId, enabled: !!input.checked };
	}
	if (data.action === 'select') {
		return { type: 'select', instanceId: data.instanceId, groupId: data.groupId, childId: data.childId };
	}
	if (data.action === 'rendering') {
		return { type: 'rendering', instanceId: data.instanceId, nodeId: data.nodeId, renderingId: input.value };
	}
	if (data.action === 'control') {
		const value = String(data.value || '0,0').split(',').map(Number);
		value[Number(data.axis)] = Number(input.value);
		return {
			type: 'control',
			instanceId: data.instanceId,
			nodeId: data.nodeId,
			renderingId: data.renderingId,
			controlId: data.controlId,
			value
		};
	}
	if (data.action === 'lens') {
		return { type: 'lens', instanceId: data.instanceId, lensId: data.lensId, enabled: !!input.checked };
	}
	if (data.action === 'lens-choice') {
		return { type: 'lens-choice', instanceId: data.instanceId, lensId: data.lensId, slot: data.slot, choiceId: input.value };
	}
	return null;
}

/**
 * Renders the scene tree into a container and keeps it in step with session commands.
 */
class SceneTree {
	constructor(session, container) {
		this.session = session;
		this.container = container;
		this.container.classList.add('openlime-scene-tree');
		this.onChange = (event) => {
			const action = actionFromInput(event.target);
			if (action) applyTreeAction(this.session, action);
		};
		this.container.addEventListener('change', this.onChange);
		this.unsubscribe = session.addListener(() => this.render());
		this.render();
	}

	/** Draw the current model. Called again after every successful command. */
	render() {
		const documentRef = this.container.ownerDocument;
		this.container.replaceChildren(renderRow(documentRef, sceneTreeModel(this.session)));
	}

	dispose() {
		this.container.removeEventListener('change', this.onChange);
		if (this.unsubscribe) this.unsubscribe();
		this.unsubscribe = null;
		this.container.replaceChildren();
	}
}

function renderRow(documentRef, row) {
	const item = documentRef.createElement('li');
	item.className = 'openlime-scene-node';
	item.dataset.role = row.role;
	item.dataset.effective = row.effective ? 'true' : 'false';
	item.dataset.qualifiedId = row.qualifiedId;

	const heading = documentRef.createElement('div');
	heading.className = 'openlime-scene-heading';
	if (row.control === 'none') {
		const title = documentRef.createElement('span');
		title.textContent = row.label;
		heading.append(title);
	} else {
		heading.append(renderToggle(documentRef, row));
	}
	item.append(heading);

	if (row.renderings.length > 1) item.append(renderRenderings(documentRef, row));
	const active = row.renderings.find(rendering => rendering.active);
	for (const control of active?.controls || []) item.append(renderControl(documentRef, row, active, control));
	for (const lens of row.lenses) item.append(renderLens(documentRef, row, lens));

	if (row.children.length) {
		const list = documentRef.createElement('ul');
		for (const child of row.children) list.append(renderRow(documentRef, child));
		item.append(list);
	}
	return item;
}

function renderToggle(documentRef, row) {
	const label = documentRef.createElement('label');
	const input = documentRef.createElement('input');
	input.type = row.control === 'radio' ? 'radio' : 'checkbox';
	input.dataset.instanceId = row.instanceId || '';
	if (row.control === 'radio') {
		input.name = 'exclusive:' + row.instanceId + '/' + row.groupId;
		input.dataset.action = 'select';
		input.dataset.groupId = row.groupId;
		input.dataset.childId = row.nodeId;
		input.checked = row.selected;
	} else {
		input.dataset.action = 'enabled';
		input.dataset.role = row.role === 'instance' ? 'instance' : 'node';
		input.dataset.nodeId = row.nodeId || '';
		input.checked = row.enabled;
	}
	const text = documentRef.createElement('span');
	text.textContent = row.label;
	label.append(input, text);
	return label;
}

function renderRenderings(documentRef, row) {
	const select = documentRef.createElement('select');
	select.dataset.action = 'rendering';
	select.dataset.instanceId = row.instanceId;
	select.dataset.nodeId = row.nodeId;
	for (const rendering of row.renderings) {
		const option = documentRef.createElement('option');
		option.value = rendering.id;
		option.textContent = rendering.label;
		option.selected = rendering.active;
		select.append(option);
	}
	return select;
}

function renderControl(documentRef, row, rendering, control) {
	const wrap = documentRef.createElement('label');
	wrap.className = 'openlime-scene-control';
	const name = documentRef.createElement('span');
	name.textContent = control.id;
	wrap.append(name);
	control.value.forEach((component, axis) => {
		const input = documentRef.createElement('input');
		input.type = 'number';
		input.step = '0.1';
		input.value = String(component);
		input.dataset.action = 'control';
		input.dataset.instanceId = row.instanceId;
		input.dataset.nodeId = row.nodeId;
		input.dataset.renderingId = rendering.id;
		input.dataset.controlId = control.id;
		input.dataset.axis = String(axis);
		input.dataset.value = control.value.join(',');
		wrap.append(input);
	});
	return wrap;
}

function renderLens(documentRef, row, lens) {
	const block = documentRef.createElement('div');
	block.className = 'openlime-scene-lens';
	const toggle = documentRef.createElement('label');
	const input = documentRef.createElement('input');
	input.type = 'checkbox';
	input.checked = lens.enabled;
	input.dataset.action = 'lens';
	input.dataset.instanceId = row.instanceId;
	input.dataset.lensId = lens.id;
	const text = documentRef.createElement('span');
	text.textContent = lens.label;
	toggle.append(input, text);
	block.append(toggle);
	if (lens.enabled) {
		for (const slot of lens.slots) block.append(renderSlot(documentRef, row, lens, slot));
	}
	return block;
}

function renderSlot(documentRef, row, lens, slot) {
	const label = documentRef.createElement('label');
	const text = documentRef.createElement('span');
	text.textContent = slot.slot;
	const select = documentRef.createElement('select');
	select.dataset.action = 'lens-choice';
	select.dataset.instanceId = row.instanceId;
	select.dataset.lensId = lens.id;
	select.dataset.slot = slot.slot;
	for (const choice of slot.choices) {
		const option = documentRef.createElement('option');
		option.value = choice.id;
		option.textContent = choice.label;
		option.selected = choice.id === slot.selected;
		select.append(option);
	}
	label.append(text, select);
	return label;
}

export { SceneTree, sceneTreeModel, applyTreeAction, actionFromInput };
