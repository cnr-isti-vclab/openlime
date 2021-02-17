class Lens {
    constructor(x = 0, y = 0, r = 100, border = 10) {
            this.x = x;
            this.y = y;
            this.radius = r;
            this.border = border;
    }

    isInside(p) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const d2 = dx*dx + dy*dy;
        return d2 < this.radius * this.radius;
    }

}

export {Lens}