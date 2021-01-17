'use strict';
var point_circles = [];
var last_clicked_point = -1;
var canvas = document.getElementById('plot');
var ctx = canvas.getContext('2d');
var points = readPoints();
var splines = makeSplines(points);
var transform_x;
var transform_y;
var inv_transform_x;
var inv_transform_y;
var radius = 6;
var x_data = [];
var y_data = [];
draw(points, splines);

function transpose(matrix) {
    return matrix[0].map((col, i) => matrix.map(row => row[i]));
}

function sort_points(points) {
    points.sort((point1, point2) => point1[0] - point2[0]);
}

function changeColor(old_circle, color) {
    // TODO 
    let circle = new Path2D();
    let x = old_circle.x;
    let y = old_circle.y;
    circle.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill(circle);
}

function readPoints() {
    let text = document.getElementById("points").value;
    let points = text.split('\n');
    for (let i = 0; i < points.length; i++) {
        points[i] = points[i].split(',');
        for (let j = 0; j < 2; j++) {
            points[i][j] = parseFloat(points[i][j].trim());
        }
    }
    points = transpose(points);
    sort_points(points);
    return points
}

function writePoints(points) {
    let tr_points = transpose(points);
    for (let i=0; i<tr_points.length; i++) {
        for (let j=0; j<tr_points[i].length; j++){
            tr_points[i][j] = tr_points[i][j].toString();
        }
        tr_points[i] = tr_points[i].join(', ');
    }
    tr_points = tr_points.join('\n');
    document.getElementById("points").value = tr_points;
}

function makeSplines(points) {
    let x = points[0];
    let y = points[1];
    const n = x.length;
    let splines = new Array(n);
    for (let i = 0; i < n; i++) {
        splines[i] = {
            a: y[i],
            b: null,
            c: null,
            d: null,
            x: x[i]
        }
    }
    splines[0].c = splines[n - 1].c = 0;

    let alpha = new Array(n - 1).fill(0);
    let beta = new Array(n - 1).fill(0);
    for (let i = 1; i < n - 1; ++i) {
        let hi = x[i] - x[i - 1];
        let hi1 = x[i + 1] - x[i];
        let A = hi;
        let C = 2.0 * (hi + hi1);
        let B = hi1;
        let F = 6.0 * ((y[i + 1] - y[i]) / hi1 - (y[i] - y[i - 1]) / hi);
        let z = (A * alpha[i - 1] + C);
        alpha[i] = -B / z;
        beta[i] = (F - A * beta[i - 1]) / z;
    }

    for (let i = n - 2; i > 0; --i) {
        splines[i].c = alpha[i] * splines[i + 1].c + beta[i];
    }

    for (let i = n - 1; i > 0; --i) {
        let hi = x[i] - x[i - 1];
        splines[i].d = (splines[i].c - splines[i - 1].c) / hi;
        splines[i].b = hi * (2.0 * splines[i].c + splines[i - 1].c) / 6.0 + (y[i] - y[i - 1]) / hi;
    }
    splines.splice(0, 1);
    return splines
}

function interpolate(x, s) {
    let dx = x - s.x;
    return s.a + (s.b + (s.c / 2.0 + s.d * dx / 6.0) * dx) * dx;
}
 

function draw(points, splines) {
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    x_data = points[0];
    y_data = points[1];

    let x_min = Math.min.apply(null, x_data);
    let y_min = Math.min.apply(null, y_data);
    let x_max = Math.max.apply(null, x_data);
    let y_max = Math.max.apply(null, y_data);

    let n_interp = parseFloat(document.getElementById('n_interp').value);
    let x_interp = new Array(n_interp);
    let y_interp = new Array(n_interp);
    let cur_spline = 0;
    for (let i = 0; i < n_interp; i++) {
        x_interp[i] = x_min + i * (x_max - x_min) / (n_interp - 1);
        if (x_interp[i] > splines[cur_spline].x) {
            cur_spline += 1;
        }
        y_interp[i] = interpolate(x_interp[i], splines[cur_spline]);
    }

    x_min = Math.min(x_min, Math.min.apply(null, x_interp));
    y_min = Math.min(y_min, Math.min.apply(null, y_interp));
    x_max = Math.max(x_max, Math.max.apply(null, x_interp));
    y_max = Math.max(y_max, Math.max.apply(null, y_interp));

    let size = 500;


    
    let point_border = 100;
    // to canvas coordinates
    transform_x = x => (x - x_min) * (size - point_border) / (x_max - x_min) + point_border / 2;
    transform_y = y => size - (y - y_min) * (size - point_border) / (y_max - y_min) - point_border / 2;
    // from canvas coordinates
    inv_transform_x = x => (x - point_border/2) * (x_max - x_min) / (size - point_border) + x_min;
    inv_transform_y = y => -(y - size + point_border/2) *(y_max-y_min) / (size-point_border) + y_min ;

    x_data = x_data.map(transform_x);
    y_data = y_data.map(transform_y);
    x_interp = x_interp.map(transform_x);
    y_interp = y_interp.map(transform_y);
    // border

    // limits
    ctx.font = "20px Arial";
    ctx.fillStyle = "black"
    ctx.fillText(x_min.toString()+', '+y_min.toString(), 10, size-10);
    ctx.fillText(x_max.toString()+', '+y_max.toString(), size-200, 30);
    ctx.beginPath();
    let limit_length = 10;
    ctx.moveTo(point_border/2, size-point_border/2-limit_length);
    ctx.lineTo(point_border/2, size-point_border/2);
    ctx.lineTo(point_border/2+limit_length, size-point_border/2);
    ctx.stroke();

    ctx.moveTo(size-point_border/2-limit_length, point_border/2);
    ctx.lineTo(size-point_border/2, point_border/2);
    ctx.lineTo(size-point_border/2, point_border/2+limit_length);
    ctx.stroke();
    
    // points
    drawCircles(x_data, y_data);
    // interpolation
    ctx.beginPath();
    ctx.moveTo(x_interp[0], y_interp[0]);
    for (let i = 1; i < n_interp; i++) {

        ctx.lineTo(x_interp[i], y_interp[i]);
    }
    ctx.stroke();

}

function drawCircles() {
    point_circles = [];
    for (let i = 0; i < x_data.length; i++) {
        point_circles.push(new Path2D());
        point_circles[i].arc(x_data[i], y_data[i], radius, 0, 2 * Math.PI, false);
        point_circles[i].x = x_data[i];
        point_circles[i].y = y_data[i];
        ctx.fillStyle = 'black';
        ctx.fill(point_circles[i]);
    }
}


function find_circle(x,y) {
    for (let i=0; i<point_circles.length; i++) {
        if (ctx.isPointInPath(point_circles[i], x, y ) ) {
            return i
        }
    }
    return -1
}

canvas.onmouseout = function(e) {
    document.body.style.cursor = 'default';
}

canvas.onmousemove = function(e) {
    let circle_idx = find_circle(e.layerX, e.layerY);
    
    if (last_clicked_point>=0) {
        document.body.style.cursor = 'crosshair';
    }
    else if (circle_idx>=0) {
        document.body.style.cursor = 'grab';
        changeColor(point_circles[circle_idx], 'pink');
    }
    else {
        document.body.style.cursor = 'default';
        drawCircles(x_data, y_data);
    }

}

function addPoint(x,y) {
    points[0].push(inv_transform_x(x));
    points[1].push(inv_transform_y(y));
    let tr_points = transpose(points);
    sort_points(tr_points);
    points = transpose(tr_points);
    writePoints(points);
    splines = makeSplines(points);
    draw(points, splines);
}

function removePoint(idx) {
    points[0].splice(idx, 1);
    points[1].splice(idx, 1);
}

canvas.onclick = function(e) {
    let circle_idx = find_circle(e.layerX, e.layerY);
    if (last_clicked_point>=0) {
        removePoint(circle_idx);
        addPoint(e.layerX, e.layerY);
        last_clicked_point = -1;
    }
    else if (circle_idx>=0) {
        last_clicked_point = circle_idx;
        changeColor(point_circles[circle_idx], 'red')
    }

    else {
        addPoint(e.layerX, e.layerY);
    }
}


// TODO make mins and maxes user defined