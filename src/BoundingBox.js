/**
 * Represents an axis-aligned rectangular bounding box that can be wrapped tightly around geometric elements.
 * The box is defined by two opposite vertices (low and high corners) and provides a comprehensive set of
 * utility methods for manipulating and analyzing bounding boxes.
 */
class BoundingBox {
    /**
     * Creates a new BoundingBox instance.
     * @param {Object} [options] - Configuration options for the bounding box
     * @param {number} [options.xLow=1e20] - X coordinate of the lower corner
     * @param {number} [options.yLow=1e20] - Y coordinate of the lower corner
     * @param {number} [options.xHigh=-1e20] - X coordinate of the upper corner
     * @param {number} [options.yHigh=-1e20] - Y coordinate of the upper corner
     */
    constructor(options) {
        Object.assign(this, {
            xLow: 1e20,
            yLow: 1e20,
            xHigh: -1e20,
            yHigh: -1e20
        });
        Object.assign(this, options);
    }

    /**
     * Initializes the bounding box from an array of coordinates.
     * @param {number[]} x - Array containing coordinates in order [xLow, yLow, xHigh, yHigh]
     */
    fromArray(x) {
        this.xLow = x[0];
        this.yLow = x[1];
        this.xHigh = x[2];
        this.yHigh = x[3];
    }

    /**
     * Resets the bounding box to an empty state by setting coordinates to extreme values.
     */
    toEmpty() {
        this.xLow = 1e20;
        this.yLow = 1e20;
        this.xHigh = -1e20;
        this.yHigh = -1e20;
    }

    /**
     * Checks if the bounding box is empty (has no valid area).
     * A box is considered empty if its low corner coordinates are greater than its high corner coordinates.
     * @returns {boolean} True if the box is empty, false otherwise
     */
    isEmpty() {
        return this.xLow >= this.xHigh || this.yLow >= this.yHigh;
    }

    /**
     * Converts the bounding box coordinates to an array.
     * @returns {number[]} Array of coordinates in order [xLow, yLow, xHigh, yHigh]
     */
    toArray() {
        return [this.xLow, this.yLow, this.xHigh, this.yHigh];
    }

    /**
      * Creates a space-separated string representation of the bounding box coordinates.
      * @returns {string} String in format "xLow yLow xHigh yHigh"
      */
    toString() {
        return this.xLow.toString() + " " + this.yLow.toString() + " " + this.xHigh.toString() + " " + this.yHigh.toString();
    }

    /**
     * Enlarges this bounding box to include another bounding box.
     * If this box is empty, it will adopt the dimensions of the input box.
     * If the input box is null, no changes are made.
     * @param {BoundingBox|null} box - The bounding box to merge with this one
     */
    mergeBox(box) {
        if (box == null)
            return;

        if (this.isEmpty())
            Object.assign(this, box);
        else {
            this.xLow = Math.min(this.xLow, box.xLow);
            this.yLow = Math.min(this.yLow, box.yLow);
            this.xHigh = Math.max(this.xHigh, box.xHigh);
            this.yHigh = Math.max(this.yHigh, box.yHigh);
        }
    }

    /**
     * Enlarges this bounding box to include a point.
     * @param {{x: number, y: number}} p - The point to include in the bounding box
     */
    mergePoint(p) {
        this.xLow = Math.min(this.xLow, p.x);
        this.yLow = Math.min(this.yLow, p.y);
        this.xHigh = Math.max(this.xHigh, p.x);
        this.yHigh = Math.max(this.yHigh, p.y);
    }

    /**
     * Moves the bounding box by the specified displacement.
     * @param {number} dx - Displacement along the x-axis
     * @param {number} dy - Displacement along the y-axis
     */
    shift(dx, dy) {
        this.xLow += dx;
        this.yLow += dy;
        this.xHigh += dx;
        this.yHigh += dy;
    }

    /**
     * Quantizes the bounding box coordinates by dividing by a specified value and rounding down.
     * This creates a grid-aligned bounding box.
     * @param {number} side - The value to divide coordinates by
     */
    quantize(side) {
        this.xLow = Math.floor(this.xLow / side);
        this.yLow = Math.floor(this.yLow / side);
        this.xHigh = Math.floor((this.xHigh - 1) / side) + 1;
        this.yHigh = Math.floor((this.yHigh - 1) / side) + 1;
    }

    /**
     * Calculates the width of the bounding box.
     * @returns {number} The difference between xHigh and xLow
     */
    width() {
        return Math.max(0, this.xHigh - this.xLow);
    }

    /**
     * Calculates the height of the bounding box.
     * @returns {number} The difference between yHigh and yLow
     */
    height() {
        return Math.max(0, this.yHigh - this.yLow);
    }

    /**
     * Calculates the area of the bounding box.
     * @returns {number} The area (width × height)
     */
    area() {
        return this.width() * this.height();
    }

    /**
     * Calculates the center point of the bounding box.
     * @returns {{x: number, y: number}} The coordinates of the center point
     */
    center() {
        return { x: (this.xLow + this.xHigh) / 2, y: (this.yLow + this.yHigh) / 2 };
    }

    /**
     * Gets the coordinates of a specific corner of the bounding box.
     * @param {number} i - Corner index (0: bottom-left, 1: bottom-right, 2: top-left, 3: top-right)
     * @returns {{x: number, y: number}} The coordinates of the specified corner
     */
    corner(i) {
        // To avoid the switch
        let v = this.toArray();
        return { x: v[0 + (i & 0x1) << 1], y: v[1 + (i & 0x2)] };
    }

    /**
     * Checks if this bounding box intersects with another bounding box.
     * @param {BoundingBox} box - The other bounding box to check intersection with
     * @returns {boolean} True if the boxes intersect, false otherwise
     */
    intersects(box) {
        if (!box || box.isEmpty() || this.isEmpty()) {
            return false;
        }
        return (
            this.xLow <= box.xHigh &&
            this.xHigh >= box.xLow &&
            this.yLow <= box.yHigh &&
            this.yHigh >= box.yLow
        );
    }

    /**
     * Calculates the intersection of this bounding box with another box.
     * @param {BoundingBox} box - The other bounding box
     * @returns {BoundingBox|null} A new bounding box representing the intersection, or null if there is no intersection
     */
    intersection(box) {
        if (!this.intersects(box)) {
            return null;
        }

        return new BoundingBox({
            xLow: Math.max(this.xLow, box.xLow),
            yLow: Math.max(this.yLow, box.yLow),
            xHigh: Math.min(this.xHigh, box.xHigh),
            yHigh: Math.min(this.yHigh, box.yHigh)
        });
    }

    /**
     * Creates a clone of this bounding box.
     * @returns {BoundingBox} A new BoundingBox instance with the same coordinates
     */
    clone() {
        return new BoundingBox({
            xLow: this.xLow,
            yLow: this.yLow,
            xHigh: this.xHigh,
            yHigh: this.yHigh
        });
    }

    /**
     * Checks if a point is contained within this bounding box.
     * A point is considered inside if its coordinates are greater than or equal to 
     * the low corner and less than or equal to the high corner.
     * 
     * @param {{x: number, y: number}} p - The point to check
     * @param {number} [epsilon=0] - Optional tolerance value for boundary checks
     * @returns {boolean} True if the point is inside the box, false otherwise
     * 
     * @example
     * // Check if a point is inside a box
     * const box = new BoundingBox({xLow: 0, yLow: 0, xHigh: 10, yHigh: 10});
     * const point = {x: 5, y: 5};
     * const isInside = box.containsPoint(point); // true
     * 
     * // Using epsilon tolerance for boundary cases
     * const boundaryPoint = {x: 10.001, y: 10};
     * const isInsideWithTolerance = box.containsPoint(boundaryPoint, 0.01); // true
     */
    containsPoint(p, epsilon = 0) {
        if (this.isEmpty()) {
            return false;
        }

        return (
            p.x >= this.xLow - epsilon &&
            p.x <= this.xHigh + epsilon &&
            p.y >= this.yLow - epsilon &&
            p.y <= this.yHigh + epsilon
        );
    };


    /**
     * Prints the bounding box coordinates to the console in a formatted string.
     * Output format: "BOX=xLow, yLow, xHigh, yHigh" with values rounded to 2 decimal places
     */
    print() {
        console.log("BOX=" + this.xLow.toFixed(2) + ", " + this.yLow.toFixed(2) + ", " + this.xHigh.toFixed(2) + ", " + this.yHigh.toFixed(2))
    }

}

export { BoundingBox }
