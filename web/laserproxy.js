var Laser = function() {
	this.adapter = null;
	this.renderer = null;
	this.buffersize = 5000;
	this.pointbuffer = [];
}

Laser.prototype.startStreaming = function(providerFunction) {
	console.log('Laser::startStreaming');
	this.providerFunction = providerFunction;
	this._queueTick();
}

Laser.prototype._queueTick =function() {
	setTimeout(this._tick.bind(this), 1);
}

Laser.prototype._tick = function() {
	var _this = this;
	this._fillBuffer(this.buffersize, function() {
		_this._sendBuffer(function() {
			_this._queueTick();
		});
	});
}

Laser.prototype._sendBuffer = function(callback) {
	// console.log('Laser::_sendBuffer', this.pointbuffer.length);
	// remove some points to send...
	var _this = this;
	var pts = this.pointbuffer.splice(0, this.buffersize);
	// console.log('Sending ' + pts.length + ' points...');
	this.renderer.addPoints(pts);
	this.adapter._sendAndGetStatus(pts, function(response) {
		// console.log('Got', response);

		if (typeof(response.buffersize) !== 'undefined') {
			_this.buffersize = response.buffersize;
		}

		callback();
	});
}

Laser.prototype._fillBuffer = function(N, callback) {
	// console.log('Laser::_fillBuffer', N);
	if (this.pointbuffer.length < this.buffersize) {
		this._fetchPoints(N, function(pts) {
			// console.log('got pts:', pts);
			setTimeout(callback, 0);
		});
	} else {
		setTimeout(callback, 1);
	}
}

Laser.prototype._fetchPoints = function(N, callback) {
	var _this = this;
	this.providerFunction(N, function(pts) {
		_this.pointbuffer = _this.pointbuffer.concat(pts);
		callback(_this);
	});
}





var LaserPreview = function(element, width, height) {
	this.element = element;
	this.canvas = document.createElement('canvas');
	this.canvas.width = width;
	this.canvas.height = height;
	this.ctx = this.canvas.getContext('2d');
	this.element.appendChild(this.canvas);
	this.width = width;
	this.height = height;
	this.newpoints = [];
	this._tick();
	this.lastpoint = { x: 0, y: 0, r: 0, g: 0, b: 0 };
}

LaserPreview.prototype.addPoints = function(pts) {
	// console.log('LaserPreview::addPoints', pts);
	this.newpoints = this.newpoints.concat(pts);
	// pts.forEach(this.addPoint.bind(this));
}

// LaserPreview.prototype.addPoint = function(pt) {
// 	console.log('LaserPreview::addPoint', pt);
// 	this.newpoints.push(pt);
// }

LaserPreview.prototype._tick = function() {

	// fade background a bit...
	this.ctx.globalAlpha = 0.2;

	this.ctx.fillStyle = '#000';
	this.ctx.fillRect(0, 0, this.width, this.height);

	this.ctx.globalAlpha = 1.0;

	if (this.newpoints.length > 0) {

		var hw = this.width / 2;
		var hh = this.height / 2;

		for(var i=0; i<this.newpoints.length; i++) {
			var pt = this.newpoints[i];

			var newpoint = {
				x: hw + hw * pt.x / 32768,
				y: hh - hh * pt.y / 32768,
				r: Math.round(pt.r * 255 / 65536),
				g: Math.round(pt.g * 255 / 65536),
				b: Math.round(pt.b * 255 / 65536),
			}

			// if (!pt.blanking) {
			this.ctx.strokeStyle = 'rgb('+newpoint.r+','+newpoint.g+','+newpoint.b+')';
			this.ctx.beginPath();
		    this.ctx.moveTo(this.lastpoint.x, this.lastpoint.y);
		    this.ctx.lineTo(newpoint.x, newpoint.y);
		    this.ctx.closePath();
		    this.ctx.stroke();
			// }

			this.lastpoint.x = newpoint.x;
			this.lastpoint.y = newpoint.y;
		}

		this.newpoints = [];
	}

	requestAnimationFrame(this._tick.bind(this));
	// setTimeout(this._tick.bind(this), 30);
}




var LaserWSProxy = function(url) {
	this.ws = null;
	this.connect(url);
	this.lastcallback = null;
}

LaserWSProxy.prototype._gotResponse = function(data) {
	if (this.lastcallback) {
		this.lastcallback(data);
		this.lastcallback = null;
	}
}

LaserWSProxy.prototype._sendAndGetStatus = function(pts, callback) {
	this.lastcallback = callback;
	this.ws.send(JSON.stringify({points: pts}));
}

LaserWSProxy.prototype.connect = function(url) {
	console.log('LaserWSProxy::connect', url);
	var _this = this;
	this.url = url;
	this.ws = new WebSocket(url);
	this.ws.onopen = function (event) {
		console.log('LaserWSProxy::connected.');
	};
	this.ws.onmessage = function (event) {
		// console.log('got websocket data', event.data);
		_this._gotResponse(JSON.parse(event.data));
	}
	this.ws.onclose = function() {
		console.log('LaserWSProxy::disconnected.');
		setTimeout(function() {
			_this.connect(_this.url);
		}, 3000);
	}
}


