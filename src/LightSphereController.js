class LightSphereController {
    constructor(parent, options) {
        options = Object.assign({
            width: 128,
            height: 128,
            top: 60,
            right: 0,
            thetaMin: 0
        }, options);
        Object.assign(this, options);
        this.parent = parent;
        this.layers = [];
        if (typeof (this.parent) == 'string')
            this.parent = document.querySelector(this.parent);

        this.lightDir = [0, 0];

        this.containerElement = document.createElement('div');
        this.containerElement.style = `padding: 0; position: absolute; width: ${this.width}px; height: ${this.height}px; top:${this.top}px; right:${this.right}px; z-index: 200; touch-action: none; visibility: visible;`;
        this.containerElement.classList.add('openlime-lsc');

        const sd = (this.width * 0.5) * (1 - 0.8);
        this.dlCanvas = document.createElement('canvas');
        this.dlCanvas.width = this.width;
        this.dlCanvas.height = this.height;
        // this.dlCanvas.style = ''
        this.dlCanvasCtx = this.dlCanvas.getContext("2d");
        this.dlGradient = '';
        this.containerElement.appendChild(this.dlCanvas);
        this.parent.appendChild(this.containerElement);

        this.r = this.width * 0.5;
        this.thetaMinRad = this.thetaMin / 180.0 * Math.PI;
        this.rmax = this.r * Math.cos(this.thetaMinRad);

        this.interactLightDir(this.width * 0.5, this.height * 0.5);

        this.pointerDown = false;
        this.dlCanvas.addEventListener("pointerdown", (e) => {
            this.pointerDown = true;
            const rect = this.dlCanvas.getBoundingClientRect();
            let clickPosX =
                (this.dlCanvas.width * (e.clientX - rect.left)) /
                rect.width;
            let clickPosY =
                (this.dlCanvas.height * (e.clientY - rect.top)) /
                rect.height;
            this.interactLightDir(clickPosX, clickPosY);
            e.preventDefault();
        });

        this.dlCanvas.addEventListener("pointermove", (e) => {
            if (this.pointerDown) {
                const rect = this.dlCanvas.getBoundingClientRect();
                let clickPosX =
                    (this.dlCanvas.width * (e.clientX - rect.left)) /
                    rect.width;
                let clickPosY =
                    (this.dlCanvas.height * (e.clientY - rect.top)) /
                    rect.height;
                this.interactLightDir(clickPosX, clickPosY);
                e.preventDefault();
            }
        });

        this.dlCanvas.addEventListener("pointerup", (e) => {
            this.pointerDown = false;
        });

        this.dlCanvas.addEventListener("pointerout", (e) => {
            this.pointerDown = false;
        });

    }

    addLayer(l) {
        this.layers.push(l);
    }

    show() {
        return this.containerElement.style.visibility = 'visible';
    }

    hide() {
        return this.containerElement.style.visibility = 'hidden';
    }

    computeGradient() {
        const x = (this.lightDir[0] + 1.0) * this.dlCanvas.width * 0.5;
        const y = (-this.lightDir[1] + 1.0) * this.dlCanvas.height * 0.5;
        this.dlGradient = this.dlCanvasCtx.createRadialGradient(
            x, y, this.dlCanvas.height / 8.0,
            x, y, this.dlCanvas.width / 1.2
        );
        this.dlGradient.addColorStop(0, "white");
        this.dlGradient.addColorStop(1, "blue");
    }

    interactLightDir(x, y) {
        let xc = x - this.r;
        let yc = this.r - y;
        const phy = Math.atan2(yc, xc);
        let l = Math.sqrt(xc * xc + yc * yc);
        l = l > this.rmax ? this.rmax : l;
        xc = l * Math.cos(this.thetaMinRad) * Math.cos(phy);
        yc = l * Math.cos(this.thetaMinRad) * Math.sin(phy);
        x = xc + this.r;
        y = this.r - yc;
        this.lightDir[0] = 2 * (x / this.dlCanvas.width - 0.5);
        this.lightDir[1] = 2 * (1 - y / this.dlCanvas.height - 0.5);
        // console.log('LD ', this.lightDir);
        for (const l of this.layers) {
            if (l.controls.light) l.setControl('light', this.lightDir, 5);
        }
        this.computeGradient();
        this.drawLightSelector(x, y);
    }

    drawLightSelector(x, y) {
        this.dlCanvasCtx.clearRect(0, 0, this.dlCanvas.width, this.dlCanvas.height);
        this.dlCanvasCtx.beginPath();

        this.dlCanvasCtx.arc(
            this.dlCanvas.width / 2,
            this.dlCanvas.height / 2,
            this.dlCanvas.width / 2,
            0,
            2 * Math.PI
        );
        this.dlCanvasCtx.fillStyle = this.dlGradient;
        this.dlCanvasCtx.fill();

        this.dlCanvasCtx.beginPath();
        this.dlCanvasCtx.arc(x, y, this.dlCanvas.width / 30, 0, 2 * Math.PI);
        this.dlCanvasCtx.strokeStyle = "red";
        this.dlCanvasCtx.lineWidth = 2;
        this.dlCanvasCtx.stroke();
    }
}

export { LightSphereController }