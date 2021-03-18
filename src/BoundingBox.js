
class BoundingBox {
    constructor(options) {
        Object.assign(this, {
            xLow: 1e20,
            yLow: 1e20,
            xHigh: -1e20, 
            yHigh: -1e20 });
        Object.assign(this, options);
    }

    fromArray(x) {
        this.xLow = x[0];
        this.yLow = x[1]; 
        this.xHigh = x[2];
        this.yHigh  = x[3];
    }
    
    toEmpty() {
        this.xLow = 1e20;
        this.yLow = 1e20; 
        this.xHigh = -1e20;
        this.yHigh  = -1e20;
    }

    isEmpty() {
        return this.xLow > this.xHigh || this.yLow > this.yHigh;
    }

    toArray() {
        return [this.xLow, this.yLow, this.xHigh, this. yHigh];
    }

    toString() {
        return this.xLow.toString() + " " + this.yLow.toString() + " " + this.xHigh.toString() + " " + this.yHigh.toString();
    }

    mergeBox(box) {
		if (box == null) {
            return this;
        } else {
            this.xLow = Math.min(this.xLow,  box.xLow);
            this.yLow = Math.min(this.yLow,  box.yLow);
            this.xHigh = Math.max(this.xHigh, box.xHigh);
            this.yHigh = Math.max(this.yHigh, box.yHigh);
        }
    }

    mergePoint(p) {
        this.xLow = Math.min(this.xLow, p.x);
        this.yLow = Math.min(this.yLow, p.y);
        this.xHigh = Math.max(this.xHigh, p.x);
        this.yHigh = Math.max(this.yHigh, p.y);
    }
    
    shift(dx, dy) {
        this.xLow += dx;
        this.yLow += dy;
        this.xHigh += dx;
        this.yHigh += dy;
    }

    quantize(size) {
        this.xLow =  Math.floor(this.xLow/side);
        this.yLow =  Math.floor(this.yLow/side);
        this.xHigh = Math.floor((this.xHigh-1)/side) + 1;
        this.yHigh = Math.floor((this.yHigh-1)/side) + 1;
    }

    width() {
        return this.xHigh - this.xLow;
    }
    
    height() {
        return this.yHigh - this.yLow;
    }

    center() {
        return [(this.xLow+this.xHigh)/2, (this.yLow+this.yHigh)/2];
    }

    corner(i) {
        // To avoid the switch
        let v = this.toArray();
        return [ v[0 + (i&0x1)<<1],  v[1 + (i&0x2)] ];
    }

    print() {
        console.log("BOX=" + this.xLow.toFixed(2) + ", " + this.yLow.toFixed(2) + ", " + this.xHigh.toFixed(2) + ", " + this.yHigh.toFixed(2))
    }

}

export{ BoundingBox }