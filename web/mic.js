window.addEventListener('load', function() {

	console.log('load.');

	function colorsin(pos) {
		var res = (Math.sin(pos) + 1) * 32768;
		if (res < 0) return 0;
		if (res > 65535) return 65535;
		return res;
	}

	var i = 0;
	var phase = 0;
	var CIRCLE_POINTS = 100;
	var waveformdata = [0];

	function pointStreamer(numpoints, callback) {
		var framedata = [];

		// var BP = 10;
		// for(var k=0; k<BP; k++) {
		// 	pt.x = -30000;
		// 	pt.y = 0;
		// 	pt.r = 0;
		// 	pt.g = 0;//(colorsin(ip * 10 + phase * 8) < 30000) ? 0 : 65535;
		// 	pt.b = 0;
		// 	pt.i = 0;
		// 	framedata.push(pt);
		// }


		for(var k=0; k<numpoints; k++) {
			var pt = {};
			var ip = phase * 400.0;// * 2.0 * Math.PI / CIRCLE_POINTS;
			var rr = 0 + 20000 * (waveformdata[Math.floor(phase * 17000.0) % waveformdata.length]) / 64.0;//Math.sin(phase * 3.0 + ip * 5.0);
			if (rr > 32760)
				rr = 32760;
			if (rr < -32760)
				rr = -32760;
			pt.x = 30000 * Math.cos(ip);
			pt.y = rr;// * Math.cos(ip);
			// pt.x += Math.sin(phase * 0.025 + ip * 3.0) * 20000;
			// pt.y += Math.cos(phase * 0.012 + ip * 2.01) * 20000;
			// pt.r = colorsin(ip * 20 + phase * 8);
			// pt.g = colorsin(ip + phase * 7);
			// pt.b = colorsin(ip * 18 + phase * 4 );
			pt.r = Math.abs(40000 - Math.abs(pt.x));
			pt.g = pt.r;//(colorsin(ip * 10 + phase * 8) < 30000) ? 0 : 65535;
			pt.b = 0;
			pt.i = 65535;
			pt.control = 0;

			framedata.push(pt);
			i += 0.1;
			phase += 0.1 / 3250.0;
		}

		// for(var k=0; k<BP; k++) {
		// 	pt.x = 30000;
		// 	pt.y = 0;
		// 	pt.r = 0;
		// 	pt.g = 0;//(colorsin(ip * 10 + phase * 8) < 30000) ? 0 : 65535;
		// 	pt.b = 0;
		// 	pt.i = 0;
		// 	framedata.push(pt);
		// }

		callback(framedata);
	}

	var laser = new Laser();
	laser.adapter = new LaserWSProxy('ws://localhost:19521');
	laser.renderer = new LaserPreview(document.getElementById('laserpreview'), 400, 400);
	// laser.adapter._queuePoints([1,2,3]);
	laser.startStreaming(pointStreamer.bind(this));


	console.log('request media');
	navigator.webkitGetUserMedia({ video: false, audio: true }, function(localMediaStream) {
		console.log('got media', localMediaStream);

		var context = new AudioContext();
		var analyser = context.createAnalyser();
		var mediaStreamSource = context.createMediaStreamSource(localMediaStream);

		mediaStreamSource.connect(analyser);
		analyser.fftSize = 512;
		var dataArray = new Uint8Array(analyser.frequencyBinCount);

		setInterval(function() {
			analyser.getByteTimeDomainData(dataArray);
			// console.log(dataArray);
			for(var k=0; k<analyser.frequencyBinCount; k++) {
				var tv = (dataArray[k] - 128) * 5.0;
				waveformdata[k] = ((waveformdata[k] || 0) * 3 + tv) / 4;
			}
		}, 20);

	}, function() {

	});

});
