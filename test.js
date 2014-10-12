var EtherDream = require('./etherdream.js').EtherDream;

function sendframe(connection, data, callback) {
	console.log('send frame');
	connection.write(data, 30000, function() {
		console.log('frame written.');
		callback();
	});
}

var CIRCLE_POINTS = 100;

console.log('Looking for EtherDream hosts...')
EtherDream.findFirst(function(all) {
	if (all.length == 0) {
		console.log('Didn\'t find any EtherDream on the network.');
		return;
	}

	EtherDream.connect(all[0].ip, all[0].port, function(conn) {

		console.log('Connected.');
		if (!conn) {
			return;
		}

		function colorsin(pos) {
			var res = (Math.sin(pos) + 1) * 32768;
			if (res < 0) return 0;
			if (res > 65535) return 65535;
			return res;
		}

		var i = 0;
		var phase = 0;

		function pointStreamer(numpoints, callback) {
			// console.log('Generate ' + numpoints + ' points..');
			var framedata = [];
			for(var k=0; k<numpoints; k++) {
				var pt = {};
				var ip = i * 2.0 * Math.PI / CIRCLE_POINTS;
				pt.x = Math.sin(phase * 0.15 + ip * 4.0) * 10000;
				pt.y = Math.cos(phase * 0.21 + ip * 3.01) * 10000;
				pt.x += Math.sin(phase * 0.025 + ip * 3.0) * 20000;
				pt.y += Math.cos(phase * 0.012 + ip * 2.01) * 20000;
				pt.r = colorsin(ip + phase);
				pt.g = colorsin(ip + phase * 3);
				pt.b = colorsin(ip + phase * 2 );
				framedata.push(pt);
				i += 0.1;
				phase += 0.1 / 3250.0;
			}
			callback(framedata);
		}

		conn.streamPoints(35000, pointStreamer.bind(this));
	});
})







