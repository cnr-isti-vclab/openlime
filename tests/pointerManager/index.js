import { PointerManager } from '../../src/PointerManager.js'

const mouseTarget = '-480px -160px';
const targetsList = ['0px 0px', '-160px 0px', '-320px 0px', '-480px 0px', '0px -160px', '-160px -160px', '-320px -160px'];
const colorsList = ['#800', '#080', '#008', '#840', '#088', '#808', '#880'];

// const eventTarget = document.getElementById('infoDiv');
const targetsDiv = document.getElementById('targetsDiv');
// infoDiv.innerHTML = "waiting for events...";
const infoDiv = document.getElementById('info');
const hoverDiv = document.getElementById('hover');

const pointers = new Map();

function keyenc(k1, k2) {
    return `${k1}_${k2}`;
}

function GetTargetSpan(x, y, bkgPos, label, color) {
    x -= 80;
    y -= 80;
    return '<span class="targetSpan" style="left:' + x + 'px;top:' + y +
        'px;color:' + color + ';background-position: ' + bkgPos + ';">' +
        label + '</span>';
}

function drawEvent() {
    let gfx = "";
    pointers.forEach((e, key) => {
        if (e.pointerType == 'mouse') {
            gfx = GetTargetSpan(e.clientX, e.clientY, mouseTarget, "mouse", "#080");
        } else {
            const listIndex = e.pointerId % targetsList.length;
            gfx += GetTargetSpan(e.clientX, e.clientY,
                targetsList[listIndex], e.pointerType + " " + e.pointerId,  
                colorsList[listIndex]);
        }
    });
    targetsDiv.innerHTML = gfx;
}

window.addEventListener('contextmenu', (e) => e.preventDefault(), false);


const panHandlers = {
    priority: 100,
    panStart: (e) => {
        const key = keyenc(e.pointerType, e.idx);
        pointers.set(key, { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType, pointerId: e.pointerId });
        infoDiv.innerHTML = `PAN Received ${e.type}  From: ${e.pointerId}  Idx = ${e.idx}`;
        hoverDiv.innerHTML = '';
        drawEvent();
        e.preventDefault();
    },
    panMove: (e) => {
        const key = keyenc(e.pointerType, e.idx);
        pointers.set(key, { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType, pointerId: e.pointerId });
        infoDiv.innerHTML = `PAN Received  ${e.type}  From:  ${e.pointerId}  Idx = ${e.idx} <br/>
    SpeedX ${e.speedX} <br/>
    SpeedY ${e.speedY}`;
        drawEvent();
    },
    panEnd: (e) => {
        const key = keyenc(e.pointerType, e.idx);
        if (pointers.has(key)) {
            pointers.delete(key);
            drawEvent();
        }
        infoDiv.innerHTML = "";
    }
}

const pointerManager = new PointerManager(targetsDiv);
pointerManager.onPan(panHandlers);

const pinchHandlers = {
    priority: 1000,
    pinchStart: (e1, e2) => {
        const key1 = keyenc(e1.pointerType, e1.idx);
        pointers.set(key1, { clientX: e1.clientX, clientY: e1.clientY, pointerType: e1.pointerType, pointerId: e1.pointerId });
        const key2 = keyenc(e2.pointerType, e2.idx);
        pointers.set(key2, { clientX: e2.clientX, clientY: e2.clientY, pointerType: e2.pointerType, pointerId: e2.pointerId });
        drawEvent();
        e1.preventDefault();
        e2.preventDefault();
    },
    pinchMove: (e1, e2) => {
        const key1 = keyenc(e1.pointerType, e1.idx);
        pointers.set(key1, { clientX: e1.clientX, clientY: e1.clientY, pointerType: e1.pointerType, pointerId: e1.pointerId });
        const key2 = keyenc(e2.pointerType, e2.idx);
        pointers.set(key2, { clientX: e2.clientX, clientY: e2.clientY, pointerType: e2.pointerType, pointerId: e2.pointerId });
        infoDiv.innerHTML = `PINCH Received  ${e1.type} ${e2.type}  Idx = ${e1.idx} ${e2.idx}<br/>
    SpeedX ${e1.speedX} ${e2.speedX}<br/>
    SpeedY ${e1.speedY} ${e2.speedY}`;
        drawEvent();
    },
    pinchEnd: (e1, e2) => {
        const key1 = keyenc(e1.pointerType, e1.idx);
        const key2 = keyenc(e2.pointerType, e2.idx);
        if (pointers.has(key1)) {
            pointers.delete(key1);
        }
        if (pointers.has(key2)) {
            pointers.delete(key2);
        }
        drawEvent();
        infoDiv.innerHTML = "";
    },
};

pointerManager.onPinch(pinchHandlers);

const handlers = {
    priority: 2000,
    fingerHover: (e) => {
        infoDiv.innerHTML = "HOVER Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
        hoverDiv.innerHTML = "";
        e.preventDefault();
    },
    fingerSingleTap: (e) => {
        const key = e.pointerType + e.idx;
        if (pointers.has(key)) {
            pointers.delete(key);
            drawEvent();
        }
        infoDiv.innerHTML = "SINGLETAP Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
        hoverDiv.innerHTML = '';
        e.preventDefault();
    },
    fingerDoubleTap: (e) => {
        const key = e.pointerType + e.idx;
        if (pointers.has(key)) {
            pointers.delete(key);
            drawEvent();
        }
        infoDiv.innerHTML = "DOUBLETAP Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
        hoverDiv.innerHTML = '';
        e.preventDefault();
    },
    fingerHold: (e) => {
        const key = e.pointerType + e.idx;
        if (pointers.has(key)) {
            pointers.delete(key);
            drawEvent();
        }
        infoDiv.innerHTML = "HOLD Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
        hoverDiv.innerHTML = '';
        e.preventDefault();
    },
    mouseWheel: (e) => {
        infoDiv.innerHTML = "WHEEL Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
        hoverDiv.innerHTML = '';
        e.preventDefault();
    }
};

pointerManager.onEvent(handlers);

// pointerManager.on('fingerHover fingerSingleTap fingerDoubleTap fingerHold', (e) => {
//     infoDiv.innerHTML = "";
//     if (e.type == 'fingerHover') {
//         hoverDiv.innerHTML = "Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
//     } else {
//         const key = e.pointerType + e.idx;
//         if (pointers.has(key)) {
//             pointers.delete(key);
//             drawEvent();
//         }
//         infoDiv.innerHTML = "Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
//         hoverDiv.innerHTML = '';
//     }
// });

