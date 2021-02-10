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

    toViewport(transform, viewport) {
        const c = 
        [this.x * transform.z + transform.x * transform.z + viewport.w/2, 
         this.y * transform.z + transform.y * transform.z + viewport.h/2];

        return [c[0], viewport.h - c[1], this.radius * transform.z, this.border];
    }

}

export {Lens}