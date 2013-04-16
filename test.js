var EtherDream = require('./etherdream.js').EtherDream;

function sendframe(connection, data, callback) {
	console.log('send frame');
	connection.write(data, 30000, function() {
		console.log('frame written.');
		callback();
	});
}

var IP = '192.168.1.52';
var PORT = 7765;
var CIRCLE_POINTS = 700;

console.log('Connecting to '+IP+':'+PORT+' ...');

EtherDream.connect(IP, PORT, function(conn) {

	console.log('Connected', conn);
	if (!conn) {
		return;
	}

	function colorsin(pos) {
		var res = (Math.sin(pos) + 1) * 32768;
		if (res < 0) return 0;
		if (res > 65535) return 65535;
		return res;
	}

	function nextframe(phase) {
		var framedata = [];
		for(var i=0; i<CIRCLE_POINTS; i++) {
			var pt = {};
			var ip = i * 2.0 * Math.PI / CIRCLE_POINTS;
			pt.x = Math.sin(phase + ip * 4) * 20000;
			pt.y = Math.cos(phase * 0.3 + ip * 3) * 20000;
			pt.r = colorsin(ip + phase);
			pt.g = colorsin(ip + (2.0 * Math.PI / 3.0) + phase);
			pt.b = colorsin(ip + (4.0 * Math.PI / 3.0) + phase);
			framedata.push(pt);
		}

		console.log('send frame, phase='+phase);
		conn.write(framedata, 30000, function() {
			// console.log('frame written.');
			nextframe(phase + 1.0 / 50.0);
		});
	};

	nextframe(0);

});







