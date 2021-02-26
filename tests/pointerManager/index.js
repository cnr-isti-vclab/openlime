import { PointerManager } from '../../src/PointerManager.js'

const mouseTarget = '-480px -160px';
const targetsList = ['0px 0px', '-160px 0px', '-320px 0px', '-480px 0px', '0px -160px', '-160px -160px', '-320px -160px'];
const colorsList = ['#800', '#080', '#008', '#840', '#088', '#808', '#880'];

// const eventTarget = document.getElementById('infoDiv');
const targetsDiv = document.getElementById('targetsDiv');
// infoDiv.innerHTML = "waiting for events...";
const infoDiv = document.getElementById('info');
const hoverDiv = document.getElementById('hover');

let inertialTimer = null;

const pointers = new Map();

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
                targetsList[listIndex], "touch " + e.pointerId,
                colorsList[listIndex]);
        }
    });
    targetsDiv.innerHTML = gfx;
}


function capturePan(e) {
    const key = e.pointerType + e.idx;
    pointers.set(key, { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType, pointerId: e.pointerId });
    infoDiv.innerHTML = `Received ${e.type}  From: ${e.pointerId}  Idx = ${e.idx}`;
    hoverDiv.innerHTML = '';
    drawEvent();
    inertialTimer = setInterval(() => {
        pointerManager.updateInertia(performance.now());
    }, 15);
    return true;
}

function panMove(e) {
    const key = e.pointerType + e.idx;
    pointers.set(key, { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType, pointerId: e.pointerId });
    infoDiv.innerHTML = `Received  ${e.type}  From:  ${e.pointerId}  Idx = ${e.idx} <br/>
    SpeedX ${e.speedX} <br/>
    SpeedY ${e.speedY}`;
    drawEvent();
}

function panEnd(e) {
    const key = e.pointerType + e.idx;
    if (pointers.has(key)) {
        pointers.delete(key);
        drawEvent();
    }
    infoDiv.innerHTML = "";
    clearInterval(inertialTimer);
}

const pointerManager = new PointerManager(targetsDiv);
// pointerManager.register('pan', capturePan, panMove, panEnd, true);

const handlers = {
    priority: 0,
    fingerHover: (e) => {
        infoDiv.innerHTML = "";
        hoverDiv.innerHTML = "Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
    },
    fingerSingleTap: (e) => {
        const key = e.pointerType + e.idx;
        if (pointers.has(key)) {
            pointers.delete(key);
            drawEvent();
        }
        infoDiv.innerHTML = "Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
        hoverDiv.innerHTML = '';
    },
    fingerDoubleTap: (e) => {
        const key = e.pointerType + e.idx;
        if (pointers.has(key)) {
            pointers.delete(key);
            drawEvent();
        }
        infoDiv.innerHTML = "Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
        hoverDiv.innerHTML = '';
    },
    fingerHold: (e) => {
        const key = e.pointerType + e.idx;
        if (pointers.has(key)) {
            pointers.delete(key);
            drawEvent();
        }
        infoDiv.innerHTML = "Received " + e.type + "  From: " + e.pointerId + "  Idx = " + e.idx;
        hoverDiv.innerHTML = '';
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

