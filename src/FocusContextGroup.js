/**
 * Coordinates multiple ControllerFocusContext instances that share one camera.
 *
 * Interaction rules:
 * 1. A click/hit inside a visible lens is handled by that lens (highest zindex wins
 *    when lenses overlap) and that controller becomes active.
 * 2. A click outside every lens is handled only by the active controller's
 *    Focus+Context path (camera + its own lens). Other lenses stay put in scene space.
 * 3. The first registered controller is active until a lens hit promotes another.
 */
class FocusContextGroup {
	constructor() {
		this.controllers = [];
		this.active = null;
	}

	register(controller) {
		if (!this.controllers.includes(controller)) this.controllers.push(controller);
		if (!this.active) this.active = controller;
	}

	unregister(controller) {
		this.controllers = this.controllers.filter((item) => item !== controller);
		if (this.active === controller) this.active = this.controllers[0] || null;
	}

	setActive(controller) {
		if (this.controllers.includes(controller)) this.active = controller;
	}

	/** Controllers that can currently receive pointer hits. */
	candidates() {
		return this.controllers.filter((controller) =>
			controller.active !== false && controller.lensLayer && controller.lensLayer.visible);
	}

	/** Highest-zindex lens containing the scene point, or null. */
	hitWinner(scenePoint) {
		const hits = this.candidates().filter((controller) => {
			try {
				return controller.isInsideLens(scenePoint).inside;
			} catch {
				return false;
			}
		});
		hits.sort((a, b) => (b.lensLayer.zindex || 0) - (a.lensLayer.zindex || 0));
		return hits[0] || null;
	}

	/**
	 * Role for one controller on a pointer at `scenePoint`.
	 * Calling this for the lens winner also promotes it to active.
	 * @returns {'lens'|'context'|'ignore'}
	 */
	roleFor(controller, scenePoint) {
		const winner = this.hitWinner(scenePoint);
		if (winner) {
			if (winner === controller) {
				this.setActive(controller);
				return 'lens';
			}
			return 'ignore';
		}
		if (controller === this.active && controller.enableDirectContextControl) return 'context';
		return 'ignore';
	}
}

/** 
 * Kind of singletone for each camera.
 * Use weakmap so camera is released from the map when not used anymore
 */
const groupsByCamera = new WeakMap(); 

/** Shared group for all FocusContext controllers bound to the same camera. */
function focusContextGroupFor(camera) {
	if (!camera) throw new Error('focusContextGroupFor requires a camera');
	let group = groupsByCamera.get(camera);
	if (!group) {
		group = new FocusContextGroup();
		groupsByCamera.set(camera, group);
	}
	return group;
}

export { FocusContextGroup, focusContextGroupFor };
