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

console.log('Connecting to '+IP+':'+PORT+' ...');

EtherDream.connect(IP, PORT, function(conn) {

	// console.log('Connected', conn);
	if (!conn) {
		return;
	}

	function drawline(framedata, x0,y0, x1,y1, r,g,b) {
		var dx = Math.abs(x1 - x0);
		var dy = Math.abs(y1 - y0);
		var d = Math.round(4 + (Math.sqrt(dx*dx + dy*dy) / 400));

		var jumpframes = 5;
		var stopframes = d;
		var lineframes = 5;

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

	function Walker() {
		this.x = -30000 + Math.random() * 60000;
		this.y = -30000 + Math.random() * 60000;
		this.dx = -500 + Math.random() * 1000;
		this.dy = -500 + Math.random() * 1000;
		this.step = function() {
			this.x += this.dx;
			this.y += this.dy;
			if (this.x > 32000) {
				this.dx = -Math.abs(this.dx);
			}
			if (this.x < -32000) {
				this.dx = Math.abs(this.dx);
			}
			if (this.y > 32000) {
				this.dy = -Math.abs(this.dy);
			}
			if (this.y < -32000) {
				this.dy = Math.abs(this.dy);
			}
		}
	}

	function LineDummy(r,g,b) {
		this.v0 = new Walker();
		this.v1 = new Walker();
		this.r = r;//Math.random() * 65535;
		this.g = g;//Math.random() * 65535;
		this.b = b;//Math.random() * 65535;
		this.step = function() {
			this.v0.step();
			this.v1.step();
		}
		this.draw = function(framedata) {
			drawline(
				framedata,
				this.v0.x,
				this.v0.y,
				this.v1.x,
				this.v1.y,
				this.r,
				this.g,
				this.b);
		}
	}

	var lines = [
		// new LineDummy(65535,0,0),
		new LineDummy(0,65535,0),
		new LineDummy(0,65535,0),
		new LineDummy(0,65535,0),
		//	new LineDummy(0,0,65535),
		//	new LineDummy(65535,65535,65535)
	];

	function nextframe(phase) {
		var framedata = [];
		var shouldfill = conn.fullness < 1000;

		var dt = new Date();
		var hours = dt.getHours();
		var mins = dt.getMinutes();
		var secs = dt.getSeconds();
		var ms = dt.getMilliseconds();

		console.log('nextframe', phase, shouldfill, conn.fullness, conn.points_in_buffer, dt, hours,mins,secs);

		if (shouldfill) {

			var rr = 65535; // 32760 + 32000 * Math.sin(phase / 60.5);
			var gg = 0; // 32760 + 32000 * Math.sin(phase / 90.3);
			var bb = 0; // 32000 * Math.sin(phase / 370.1);
			/*
			for(var k=0; k<60; k++) {
				var c = Math.cos(k * Math.PI / 30.0);
				var s = -Math.sin(k * Math.PI / 30.0);
				drawline(framedata,
					32000*s,32000*c,
					32760*s,32760*c,
					65535,65535,65535);
			}
			*/

			for(var k=0; k<12; k++) {
				var c = Math.cos(k * Math.PI / 6.0);
				var s = -Math.sin(k * Math.PI / 6.0);
				drawline(framedata,
					30000*s,30000*c,
					32760*s,32760*c,
					rr,gg,bb
					);
			}

			// sec
			var k = secs;
			var c = Math.cos(k * Math.PI / 30.0);
			var s = -Math.sin(k * Math.PI / 30.0);
			drawline(framedata,
				0,0,
				30000*s,30000*c,
				rr,gg,bb
				//0,0,32768
				);

			// minutes
			var k = mins;
			var c = Math.cos(k * Math.PI / 30.0);
			var s = -Math.sin(k * Math.PI / 30.0);
			drawline(framedata,
				0,0,
				20000*s,20000*c,
				rr,gg,bb
				);

			// hours
			var k = hours;
			var c = Math.cos(k * Math.PI / 6.0);
			var s = -Math.sin(k * Math.PI / 6.0);
			drawline(framedata,
				0,0,
				15000*s,15000*c,
				// 65535,65535,32768
				rr,gg,bb
				);

			/*
			// ms
			var k = ms * 1;
			var c = Math.cos(k * Math.PI / 500.0);
			var s = -Math.sin(k * Math.PI / 500.0);
			drawline(framedata,
				0,0,
				15000*s,15000*c,
				// 65535,65535,32768
				rr,gg,bb
				);
			*/

			/*
			for(var k=0; k<lines.length; k++) {
				lines[k].step();
				lines[k].draw(framedata);
			}
			*/
		}

		conn.write(framedata, 7000, function() {
			nextframe(phase + 1);
		});
	};

	// setInterval(function() {
	nextframe(0);
	//}, 50);

});







