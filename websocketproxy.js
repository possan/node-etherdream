var WebSocketServer = require('ws').Server;
var EtherDream = require('./etherdream.js').EtherDream;

var pointbuffer = [];
var buffersize = 5000;

var wss = new WebSocketServer({ port: 19521 }); // 19521 = 4C 41 = L A

wss.on('connection', function(ws) {
	function sendBufferSize() {
	    ws.send(JSON.stringify({ buffersize: buffersize }));
	}

    ws.on('message', function(message) {
        // console.log('received: %s', message);
        var data = null;
        try {
        	data = JSON.parse(message);
		} catch(e) {
		}

		if (data && data.points) {
			// console.log('Got ' + data.points.length + ' points.');
			pointbuffer = pointbuffer.concat(data.points);
		}

		sendBufferSize();
    });

	sendBufferSize();
});

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

		function pointStreamer(numpoints, callback) {
			buffersize = numpoints * 1;
			// console.log('Trying to send ' + numpoints + ' points.');
			var subset = pointbuffer.splice(0, numpoints);
			callback(subset);
		}

		conn.streamPoints(25000, pointStreamer.bind(this));
	});
});
