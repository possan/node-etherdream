var EtherDream = require('./etherdream.js').EtherDream;

function sendframe(connection, data, callback) {
	console.log('send frame');
	connection.write(data, 30000, function() {
		console.log('frame written.');
		callback();
	});
}

var IP = '192.168.2.4';
var PORT = 7765;

if (process.argv.length < 3) {
	console.log('node countdown.js 15:00');
	return;
}

var	time = process.argv[2];

var timestr = (new Date()).toISOString().substring(0,10)+' '+time;
console.log('deadline', timestr);
var deadline = Date.parse(timestr);
console.log('deadline', deadline);

// var deadline = Date.parse("2014-01-26 12:45");
console.log(deadline);

console.log('Connecting to '+IP+':'+PORT+' ...');

EtherDream.connect(IP, PORT, function(conn) {

	if (!conn) {
		return;
	}

	function drawline(framedata, x0,y0, x1,y1, r,g,b) {
		var dx = Math.abs(x1 - x0);
		var dy = Math.abs(y1 - y0);
		var d = Math.round(4 + (Math.sqrt(dx*dx + dy*dy) / 200));

		var jumpframes = 10;
		var stopframes = 20;
		var lineframes = 10;

		for(var i=0; i<jumpframes; i++) {
			var pt = {};
			pt.x = x0;
			pt.y = y0;
			pt.r = 0;
			pt.g = 0;
			pt.b = 0;
			pt.control = 0;
			pt.i = 0;
			pt.u1 = 0;
			pt.u2 = 0;
			framedata.push(pt);
		}

		for(var i=0; i<lineframes; i++) {
			var pt = {};
			pt.x = (x0 + (x1 - x0) * (i / (lineframes - 1)));
			pt.y = (y0 + (y1 - y0) * (i / (lineframes - 1)));
			pt.r = r;
			pt.g = g;
			pt.b = b;
			pt.control = 0;
			pt.i = 0;
			pt.u1 = 0;
			pt.u2 = 0;
			framedata.push(pt);
		}

		for(var i=0; i<stopframes; i++) {
			var pt = {};
			pt.x = x1;
			pt.y = y1;
			pt.r = 0;
			pt.g = 0;
			pt.b = 0;
			pt.control = 0;
			pt.i = 0;
			pt.u1 = 0;
			pt.u2 = 0;
			framedata.push(pt);
		}
	}

	var segdata = [
		[1,1,0,1,1,1,1], // 0
		[0,1,0,0,0,1,0], // 1
		[1,1,1,1,1,0,0], // 2
		[1,1,1,0,1,1,0], // 3
		[0,1,1,0,0,1,1], // 4
		[1,0,1,0,1,1,1], // 5
		[1,0,1,1,1,1,1], // 6
		[1,1,0,0,0,1,0], // 7
		[1,1,1,1,1,1,1], // 8
		[1,1,1,0,0,1,1], // 9
	]

	function drawDigit(framedata,n,x,y,w,h,r,g,b) {
		h = -h;
		w = -w;
		//  0000
		// 6    1
		// 6    1
		//  2222
		// 3    5
		// 3    5
		//  4444
		var segs = segdata[n];
		if (segs[0] == 1) drawline(framedata, x-w,y-h, x+w,y-h, r,g,b);
		if (segs[1] == 1) drawline(framedata, x+w,y-h, x+w,y, r,g,b);
		if (segs[2] == 1) drawline(framedata, x+w,y, x-w,y,	r,g,b);
		if (segs[3] == 1) drawline(framedata, x-w,y, x-w,y+h, r,g,b);
		if (segs[4] == 1) drawline(framedata, x-w,y+h, x+w,y+h, r,g,b);
		if (segs[5] == 1) drawline(framedata, x+w,y+h, x+w,y, r,g,b);
		if (segs[6] == 1) drawline(framedata, x-w,y, x-w,y-h, r,g,b);
	}

	function nextframe(phase) {
		var framedata = [];
		var shouldfill = conn.fullness < 1000;

		var dt = Math.round(0 + (deadline - new Date()) / 1000.0);
		if (dt < 0) dt = 0;
		//	console.log(dt);
		/*
		var hours = dt.getHours();
		var mins = dt.getMinutes();
		var secs = dt.getSeconds();
		var ms = dt.getMilliseconds();
		*/

		// console.log('nextframe', phase, shouldfill, conn.fullness, conn.points_in_buffer, dt, hours,mins,secs);

		if (shouldfill) {
			var rr = 65535; // 32760 + 32000 * Math.sin(phase / 60.5);
			var gg = 0; // 32760 + 32000 * Math.sin(phase / 90.3);
			var bb = 0; // 32000 * Math.sin(phase / 370.1);

			var phasestr = '0000000' + Math.round(dt).toString();
			phasestr = phasestr.substring(phasestr.length - 3);

			var n0 = phasestr[0] - '0';
			var n1 = phasestr[1] - '0';
			var n2 = phasestr[2] - '0';
			console.log('phasestr', phasestr, n0, n1, n2);

			drawDigit(framedata, n2, -15000, 0, 5000, 10000, 65535,0,0);
			drawDigit(framedata, n1, 0, 0, 5000, 10000, 65535,0,0);
			drawDigit(framedata, n0, 15000, 0, 5000, 10000, 65535,0,0);

			phase ++;
		}

		conn.write(framedata, 10000, function() {
			nextframe(phase);
		});
	};

	// setInterval(function() {
	nextframe(0);
	//}, 50);

});







