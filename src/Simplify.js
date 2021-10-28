/* FROM: https://stackoverflow.com/questions/40650306/how-to-draw-a-smooth-continuous-line-with-mouse-using-html-canvas-and-javascript */


function simplify(points, length) {
	let length2 = Math.pow(length, 2);

    var simplify1 = function(start, end) { // recursize simplifies points from start to end
        var index, i, xx , yy, dx, dy, ddx, ddy,  t, dist, dist1;
        let p1 = points[start];
        let p2 = points[end];   
        xx = p1.x;
        yy = p1.y;
        ddx = p2.x - xx;
        ddy = p2.y - yy;
        dist1 = ddx * ddx + ddy * ddy;
        let maxDist = length2;
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

        if (maxDist > length2) { 
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
	return d.join();
}

export { simplify, smooth, smoothToPath }