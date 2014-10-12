var EtherDream = require('./etherdream.js').EtherDream;

function sendframe(connection, data, callback) {
	console.log('send frame');
	connection.write(data, 30000, function() {
		console.log('frame written.');
		callback();
	});
}

console.log('Looking for EtherDream hosts...')
EtherDream.findFirst(function(all) {
	if (all.length == 0) {
		console.log('Didn\'t find any EtherDream on the network.');
		return;
	}

	console.log('Found', all);

	EtherDream.connect(all[0].ip, all[0].port, function(conn) {

		// console.log('Connected', conn);
		if (!conn) {
			return;
		}

		function drawline(framedata, x0,y0, x1,y1, r,g,b) {
			var dx = Math.abs(x1 - x0);
			var dy = Math.abs(y1 - y0);
			var d = Math.round(4 + (Math.sqrt(dx*dx + dy*dy) / 400));

			var jumpframes = 15;
			var stopframes = 15;
			var lineframes = 25 + d;

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

		function renderframe(phase, callback) {
			var framedata = [];

			var radii = 450;
			var offset = 10000;
			var keys = 7;

			for(var key=0; key<keys; key++) {
				var bx = -25000 + (50000 * key / (keys-1));
				var by = 0;

				var rr = 0;
				var gg = 65535;
				var bb = 0;

				drawline(
					framedata,
					bx-radii, by,
					bx, by-radii,
					rr, gg, bb
				);

				drawline(
					framedata,
					bx, by-radii,
					bx+radii, by,
					rr, gg, bb
				);

				drawline(
					framedata,
					bx+radii, by,
					bx, by+radii,
					rr, gg, bb
				);

				drawline(
					framedata,
					bx, by+radii,
					bx-radii, by,
					rr, gg, bb
				);

			}
			callback(framedata);
		};

		var g_phase = 0;
		function frameProvider(callback) {
			g_phase += 1;
			renderframe(g_phase, callback);
		}

		conn.streamFrames(30000, frameProvider.bind(this));

	});
});







