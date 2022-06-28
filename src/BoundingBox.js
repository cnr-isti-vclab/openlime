/**
 * The bounding box is a rectangular box that is wrapped as tightly as possible around a geometric element. It is oriented parallel to the axes.
 * It is defined by two opposite vertices. The class It includes a comprehensive set of functions for various processing tasks related to bounding boxes.
 * 
 */
class BoundingBox {
    /**
     * Instantiates a **BoundingBox** object.
     * @param {Object} [options] An object literal defining the bounding box.
     * @param {number} xLow=1e20 The x coordinate of the low corner a rectangle.
     * @param {number} yLow=1e20 The y coordinate of the low corner a rectangle.
     * @param {number} xHigh=-1e20 The x coordinate of the high corner a rectangle.
     * @param {number} xHigh=-1e20 The y coordinate of the high corner a rectangle.
     */
    constructor(options) {
        Object.assign(this, {
            xLow: 1e20,
            yLow: 1e20,
            xHigh: -1e20, 
            yHigh: -1e20 });
        Object.assign(this, options);
    }

    /**
     * Defines a bonding box from an array of four elements.
     * @param {Array<number>} x The array of four elements with the two corners ([xLow, yLow, xHigh, yHigh]).
     */
    fromArray(x) {
        this.xLow = x[0];
        this.yLow = x[1]; 
        this.xHigh = x[2];
        this.yHigh  = x[3];
    }
    
    /**
     * Empties a bounding box.
     */
    toEmpty() {
        this.xLow = 1e20;
        this.yLow = 1e20; 
        this.xHigh = -1e20;
        this.yHigh  = -1e20;
    }

    /**
     * Tests weather the bounding box is empty.
     * @returns {bool} The test result.
     */
    isEmpty() {
        return this.xLow > this.xHigh || this.yLow > this.yHigh;
    }

    /**
     * Returns an array of four elements containg the low and high corners.
     * @returns {Array<number>} The array of corners.
     */
    toArray() {
        return [this.xLow, this.yLow, this.xHigh, this. yHigh];
    }

    /**
     * Returns a text string with the corner coordinates separated by a space.
     * @returns {string} The string of corners.
     */
    toString() {
        return this.xLow.toString() + " " + this.yLow.toString() + " " + this.xHigh.toString() + " " + this.yHigh.toString();
    }

    /**
     * Merges a `box` to `this` BoundingBox.
     * @param {BoundingBox} box The bounding box to be merged. 
     */
    mergeBox(box) {
		if (box == null) {
            return;
        } else {
            this.xLow = Math.min(this.xLow,  box.xLow);
            this.yLow = Math.min(this.yLow,  box.yLow);
            this.xHigh = Math.max(this.xHigh, box.xHigh);
            this.yHigh = Math.max(this.yHigh, box.yHigh);
        }
    }

    /**
     * Merges a point `p`{x, y} to `this` BoundingBox.
     * @param {{x, y}} p The point to be merged. 
     */
    mergePoint(p) {
        this.xLow = Math.min(this.xLow, p.x);
        this.yLow = Math.min(this.yLow, p.y);
        this.xHigh = Math.max(this.xHigh, p.x);
        this.yHigh = Math.max(this.yHigh, p.y);
    }
    
    /**
     * Translates the bounding box by a displacement vector (dx, dy).
     * @param {number} dx Displacement along the x-axis.
     * @param {number} dy Displacement along the y-axis.
     */
    shift(dx, dy) {
        this.xLow += dx;
        this.yLow += dy;
        this.xHigh += dx;
        this.yHigh += dy;
    }

    /**
     * Divides by `side` and truncates the corner coordinates.
     * @param {*} side The value to divide by.
     */
    quantize(side) {
        this.xLow =  Math.floor(this.xLow/side);
        this.yLow =  Math.floor(this.yLow/side);
        this.xHigh = Math.floor((this.xHigh-1)/side) + 1;
        this.yHigh = Math.floor((this.yHigh-1)/side) + 1;
    }

    /**
     * Returns the bounding box width.
     * @returns {number} The width value.
     */
    width() {
        return this.xHigh - this.xLow;
    }
    
    /**
     * Returns the bounding box height.
     * @returns {number} The height value.
     */
    height() {
        return this.yHigh - this.yLow;
    }

    /**
     * Returns the bounding box center.
     * @returns {number} The center value.
     */
    center() {
        return [(this.xLow+this.xHigh)/2, (this.yLow+this.yHigh)/2];
    }

    /**
     * Returns the i-th corner.
     * @param {number} i The index of the corner. 
     * @returns {Array<number>} A [x, y] pair.
     */
    corner(i) {
        // To avoid the switch
        let v = this.toArray();
        return [ v[0 + (i&0x1)<<1],  v[1 + (i&0x2)] ];
    }

    intersects(box) {
        return xLow <= box.xHigh && xHigh >= box.xLow && yLow <= box.yHigh && yHigh >= box.yLow;
    }
    /**
     * Prints out the bounding box corners in the console.
     */
    print() {
        console.log("BOX=" + this.xLow.toFixed(2) + ", " + this.yLow.toFixed(2) + ", " + this.xHigh.toFixed(2) + ", " + this.yHigh.toFixed(2))
    }

}

export{ BoundingBox }
