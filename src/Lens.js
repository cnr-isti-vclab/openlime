class Lens {
    constructor(options) {
        if(options)
            Object.assign(this, options);
            
        if (!this.center) {
            this.center = [0, 0];
        }
        if (!this.radius) {
            this.radius = 100;
        }
        if (!this.border) {
            this.border = 10;
        }
    }

    isInside(x, y) {
        const dx = x - this.center[0];
        const dy = y - this.center[1];
        const d2 = dx*dx + dy*dy;

        const res = d2 < this.radius * this.radius;
        console.log("Is inside " + x + ", " + y + " vs " + this.center[0] + ", " + this.center[1] + ", r " + this.radius + " ? = " + res);
        return res;
    }

    toVector() {
        return [this.center[0], this.center[1], this.radius, this.border];
    }
}

export {Lens}