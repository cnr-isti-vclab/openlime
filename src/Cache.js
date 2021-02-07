/* Cache holds the images and the tile textures.
 *  Each tile has a priority 0 and above means it is visible, 
 * negative depends on how far from the border and how more zoomed you need to go.
*/

class _Cache {
	constructor(options) {
		Object.assign(this, {
		});

		Object.assign(this, options);
		this.tiles = [];
	}

	flush(layer) {
	}
}
