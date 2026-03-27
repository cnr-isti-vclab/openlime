/* FROM: https://stackoverflow.com/questions/40650306/how-to-draw-a-smooth-continuous-line-with-mouse-using-html-canvas-and-javascript */

/**
 * A [x, y, xc, yc] point.
 * @typedef BezierPoint
 * @property {number} p.0 The x-coordinate.
 * @property {number} p.1 The y-coordinate.
 * @property {number} p.2 The x-coordinate of the control point.
 * @property {number} p.3 The y-coordinate of the control point.
 */

/**
 * Simplifies a polyline via the Douglas-Peucker algorithm.
 * @param {Array<Point>} points A polyline.
 * @param {*} tolerance The tolerance is the maximum distance between the original polyline and the simplified polyline.
 * It has the same metric as the point coordinates.  
 * @returns {Array<Point>} The simplified polyline.
 */
function simplify(points, tolerance) {
	let tolerance2 = Math.pow(tolerance, 2);

    var simplify1 = function(start, end) { // recursize simplifies points from start to end
        var index, i, xx , yy, dx, dy, ddx, ddy,  t, dist, dist1;
        let p1 = points[start];
        let p2 = points[end];   
        xx = p1.x;
        yy = p1.y;
        ddx = p2.x - xx;
        ddy = p2.y - yy;
        dist1 = ddx * ddx + ddy * ddy;
        let maxDist = tolerance2;
        for (var i = start + 1; i < end; i++) {
            let p = points[i];
            if (ddx !== 0 || ddy !== 0) {
                t = ((p.x - xx) * ddx + (p.y - yy) * ddy) / dist1;
                if (t > 1) {
                    dx = p.x - p2.x;
                    dy = p.y - p2.y;
                } else 
                if (t > 0) {
                    dx = p.x - (xx + ddx * t);
                    dy = p.y - (yy + ddy * t);
                } else {
                    dx = p.x - xx;
                    dy = p.y - yy;
                }
            } else{
                dx = p.x - xx;
                dy = p.y - yy;
            }
            dist = dx * dx + dy * dy 
            if (dist > maxDist) {
                index = i;
                maxDist = dist;
            }
        }

        if (maxDist > tolerance2) { 
            if (index - start > 1){
                simplify1(start, index);
            }
            newLine.push(points[index]);
            if (end - index > 1){
                simplify1(index, end);
            }
        }
    }    
    var end = points.length - 1;
    var newLine = [points[0]];
    simplify1(0, end);
    newLine.push(points[end]);
    return newLine;
}

/**
 * Ramer-Douglas-Peucker polyline simplification.
 * Alias of `simplify(...)` exported with an explicit algorithm name.
 * @param {Array<Point>} points A polyline.
 * @param {number} tolerance Maximum allowed deviation from the original polyline.
 * @returns {Array<Point>} The simplified polyline.
 */
function ramerDouglasPeucker(points, tolerance) {
	return simplify(points, tolerance);
}

/**
 *  Uses Bezier Curve to smooth a polyline
 * @param {Array<Point>} points A polyline.
 * @param {number} cornerThres The angular threshold (in degrees). Two segments are smoothed if their angle is less then the threshold.
 * @param {bool} match Whether the smoothed curve should traverse the original points or approximate them.
 * @returns {Array<BezierPoint>} The smoothed polyline.
 */
function smooth(points, cornerThres, match) {
	cornerThres *= 3.1415/180;
	let newPoints = []; // array for new points

	if(points.length <= 2)
		return points.map((p) => [p.x, p.y]);

	let nx1, ny1, nx2, ny2, dist1, dist2;

	function dot(x, y, xx, yy) {  // get do product
		// dist1,dist2,nx1,nx2,ny1,ny2 are the length and  normals and used outside function
		// normalise both vectors
		
		dist1 = Math.sqrt(x * x + y * y); // get length
		if (dist1  > 0) {  // normalise
			nx1 = x / dist1 ;
			ny1 = y / dist1 ;
		} else {
			nx1 = 1;  // need to have something so this will do as good as anything
			ny1 = 0;
		}
		dist2  = Math.sqrt(xx * xx + yy * yy);
		if (dist2  > 0) {
			nx2 = xx / dist2;
			ny2 = yy / dist2;
		} else {
			nx2 = 1;
			ny2 = 0;
		}
		return Math.acos(nx1 * nx2 + ny1 * ny2 ); // dot product
	}

	let p1 = points[0];
	let endP = points[points.length-1];
	let i = 0;  // start from second poitn if line not closed
	let closed = false;
	let len = Math.hypot(p1.x- endP.x, p1.y-endP.y);
	
	if(len < Math.SQRT2){  // end points are the same. Join them in coordinate space
		endP =  p1;
		i = 0;			 // start from first point if line closed
		p1 = points[points.length-2];
		closed = true;
	}	   
	newPoints.push([points[i].x,points[i].y])
	for(; i < points.length-1; i++){
		let p2 = points[i];
		let p3 = points[i + 1];
		let angle = Math.abs(dot(p2.x - p1.x, p2.y - p1.y, p3.x - p2.x, p3.y - p2.y));
		if(dist1 !== 0){  // dist1 and dist2 come from dot function
			if( angle < cornerThres){ // bend it if angle between lines is small
				  if(match){
					  dist1 = Math.min(dist1,dist2);
					  dist2 = dist1;
				  }
				  // use the two normalized vectors along the lines to create the tangent vector
				  let x = (nx1 + nx2) / 2;  
				  let y = (ny1 + ny2) / 2;
				  len = Math.sqrt(x * x + y * y);  // normalise the tangent
				  if(len === 0){
					  newPoints.push([p2.x,p2.y]);								  
				  } else {
					  x /= len;
					  y /= len;
					  if(newPoints.length > 0){
						  var np = newPoints[newPoints.length-1];
						  np.push(p2.x-x*dist1*0.25);
						  np.push(p2.y-y*dist1*0.25);
					  }
					  newPoints.push([  // create the new point with the new bezier control points.
							p2.x,
							p2.y,
							p2.x+x*dist2*0.25,
							p2.y+y*dist2*0.25
					  ]);
				  }
			} else {
				newPoints.push([p2.x,p2.y]);			
			}
		}
		p1 = p2;
	}  
	if(closed){ // if closed then copy first point to last.
		p1 = [];
		for(i = 0; i < newPoints[0].length; i++){
			p1.push(newPoints[0][i]);
		}
		newPoints.push(p1);
	}else{
		newPoints.push([points[points.length-1].x,points[points.length-1].y]);	  
	}
	return newPoints;	
}

/**
 * Converts a smoothed polyline into an SVG path.
 * @param {Array<BezierPoint>} smoothed The smoothed polyline.
 * @returns {Array<String>} The SVG path.
 */
function smoothToPath(smoothed) {
	let p = smoothed[0];
	let d = [`M${p[0].toFixed(1)} ${p[1].toFixed(1)}`];
	let p1;
	for(let i = 0; i < smoothed.length-1; i++) {
		p = smoothed[i];
		p1 = smoothed[i+1];	
		if(p.length == 2)
			d.push(`l${(p1[0]-p[0]).toFixed(1)} ${(p1[1]-p[1]).toFixed(1)}`)
		else if(p.length == 4) 
			d.push(`q${(p[2]-p[0]).toFixed(1)} ${(p[3]-p[1]).toFixed(1)} ${(p1[0]-p[0]).toFixed(1)} ${(p1[1]-p[1]).toFixed(1)}`)
		else
			d.push(`c${(p[2]-p[0]).toFixed(1)} ${(p[3]-p[1]).toFixed(1)} ${(p[4]-p[0]).toFixed(1)} ${(p[5]-p[1]).toFixed(1)} ${(p1[0]-p[0]).toFixed(1)} ${(p1[1]-p[1]).toFixed(1)}`);
	}
	return d.join(' ');
}

function _median(values) {
	if (!Array.isArray(values) || values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return (sorted.length % 2) ? sorted[mid] : 0.5 * (sorted[mid - 1] + sorted[mid]);
}

/**
 * Selectively relaxes dense local zig-zags while preserving broad curve shape.
 *
 * The filter acts only on vertices that satisfy both conditions:
 * 1) incident segments are locally short (dense sampling), and
 * 2) turn is sharp enough (cosine threshold).
 *
 * It returns a new point array and does not mutate the input.
 *
 * @param {Array<Point>} points Polyline points.
 * @param {Object} [options]
 * @param {boolean} [options.closed=false] Treat the polyline as closed.
 * @param {number} [options.strength=0.34] Relaxation amount in [0, 1].
 * @param {number} [options.denseFactor=1.8] Density threshold multiplier over median segment length.
 * @param {number} [options.sharpCosThreshold=0.35] Max allowed cosine for a corner to be relaxed.
 * @returns {Array<Point>} Relaxed points.
 */
function relaxDenseZigZagPoints(points, options = {}) {
	if (!Array.isArray(points) || points.length < 3) return points;

	const {
		closed = false,
		strength = 0.34,
		denseFactor = 1.8,
		sharpCosThreshold = 0.35,
	} = options;

	const n = points.length;
	const segmentLens = [];
	for (let i = 1; i < n; i++) {
		const dx = points[i].x - points[i - 1].x;
		const dy = points[i].y - points[i - 1].y;
		segmentLens.push(Math.hypot(dx, dy));
	}
	if (closed && n > 2) {
		const dx = points[0].x - points[n - 1].x;
		const dy = points[0].y - points[n - 1].y;
		segmentLens.push(Math.hypot(dx, dy));
	}

	const med = Math.max(1e-6, _median(segmentLens));
	const denseMax = med * Math.max(0.01, Number(denseFactor) || 1.8);
	const relax = Math.max(0, Math.min(1, Number(strength) || 0.34));
	const sharpCut = Number(sharpCosThreshold);

	const src = points.map(p => ({ x: Number(p.x), y: Number(p.y) }));
	const out = src.map(p => ({ x: p.x, y: p.y }));
	const start = closed ? 0 : 1;
	const end = closed ? n : n - 1;

	for (let i = start; i < end; i++) {
		const iPrev = (i - 1 + n) % n;
		const iNext = (i + 1) % n;
		const prev = src[iPrev];
		const cur = src[i];
		const next = src[iNext];

		const v1x = cur.x - prev.x;
		const v1y = cur.y - prev.y;
		const v2x = next.x - cur.x;
		const v2y = next.y - cur.y;
		const l1 = Math.hypot(v1x, v1y);
		const l2 = Math.hypot(v2x, v2y);
		if (l1 < 1e-6 || l2 < 1e-6) continue;

		const localDense = l1 <= denseMax && l2 <= denseMax;
		if (!localDense) continue;

		const cos = (v1x * v2x + v1y * v2y) / (l1 * l2);
		if (cos > sharpCut) continue;

		const tx = 0.5 * (prev.x + next.x);
		const ty = 0.5 * (prev.y + next.y);
		out[i].x = cur.x + relax * (tx - cur.x);
		out[i].y = cur.y + relax * (ty - cur.y);
	}

	return out;
}

export { simplify, ramerDouglasPeucker, smooth, smoothToPath, relaxDenseZigZagPoints }