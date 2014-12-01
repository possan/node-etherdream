var EtherDream = require('./etherdream.js').EtherDream;
var fs = require('fs');

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

		var all_points = JSON.parse(fs.readFileSync('points.json', 'UTF-8'));
		// do any remapping of json object to array here

		console.log('Loaded ' + all_points.length + ' points.');

		var i = 0;

		function pointStreamer(numpoints, callback) {
			var framedata = [];
			for(var k=0; k<numpoints; k++) {
				var pt = all_points[i];
				// do any transformation here
				i ++;
				i %= all_points.length;
				framedata.push(pt);
			}
			callback(framedata);
		}

		conn.streamPoints(35000, pointStreamer.bind(this));
	});
})
