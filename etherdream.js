(function(ns) {

	/*

	typedef struct dac_point {
		uint16_t control;
		int16_t x;
		int16_t y;
		uint16_t r;
		uint16_t g;
		uint16_t b;
		uint16_t i;
		uint16_t u1;
		uint16_t u2;
	} dac_point_t;

	struct etherdream_point {
		int16_t x;
		int16_t y;
		uint16_t r;
		uint16_t g;
		uint16_t b;
		uint16_t i;
		uint16_t u1;
		uint16_t u2;
	}; // 4+4+4+4 = 16 bytes

	struct dac_broadcast {
		uint8_t mac_address[6];
		uint16_t hw_revision;
		uint16_t sw_revision;
		uint16_t buffer_capacity;
		uint32_t max_point_rate;
	        struct dac_status status;
	} __attribute__ ((packed));

	struct begin_command {
		uint8_t command;	// 'b' (0x62)
		uint16_t low_water_mark;
		uint32_t point_rate;
	} __attribute__ ((packed));

	struct queue_command {
		uint8_t command;	// 'q' (0x74)
		uint32_t point_rate;
	} __attribute__ ((packed));

	struct data_command {
		uint8_t command;	// 'd' (0x64)
		uint16_t npoints;
		struct dac_point data[];
	} __attribute__ ((packed));

	struct data_command_header {
		uint8_t command;	// 'd' (0x64)
		uint16_t npoints;
	} __attribute__ ((packed));

	struct dac_response {
		uint8_t response;
		uint8_t command;
		struct dac_status dac_status;
	} __attribute__ ((packed)); // 2 + 16

	struct dac_status {
		uint8_t protocol;
		uint8_t light_engine_state;
		uint8_t playback_state;
		uint8_t source;
		uint16_t light_engine_flags;
		uint16_t playback_flags;
		uint16_t source_flags;
		uint16_t buffer_fullness;
		uint32_t point_rate;
		uint32_t point_count;
	} __attribute__ ((packed)); // 20 bytes 4+4+4+4+4

	#define RESP_ACK		'a'
	#define RESP_NAK_FULL		'F'
	#define RESP_NAK_INVL		'I'
	#define RESP_NAK_ESTOP		'!'

	#define CONNCLOSED_USER		(1)
	#define CONNCLOSED_UNKNOWNCMD	(2)
	#define CONNCLOSED_SENDFAIL	(3)
	#define CONNCLOSED_MASK		(0xF)

	#define DAC_CTRL_RATE_CHANGE    0x8000
	*/

	var dgram = require('dgram');
	var net = require('net');

	var STANDARD_RESPONSE_SIZE = 22;
	var DAC_CTRL_RATE_CHANGE = 0x8000;

	var parseStandardResponse = function(data) {
		var st = {
			// dac_response
			response: String.fromCharCode(data[0]),
			command: String.fromCharCode(data[1]),
			// dac_status
			status: {
				protocol: data[2],
				light_engine_state: data[3],
				playback_state: data[4],
				source: data[5]
			}
		};
		st.success = st.response == 'a';
		return st;
	};

	var EtherConn = function(ip) {
		var self = this;
		this.queue = [];
		this.inputqueue = [];
		this.timer = 0;
		this.acks = 0;
		this.begun = false;
		this._send = function(sendcommand, responsesize, sendcallback) {
			self.queue.push({
				sent: false,
				received: false,
				responsesize: responsesize,
				command: sendcommand,
				callback: sendcallback
			});
		};
		this._popqueue = function() {
			// pending command?
			if (self.currentcommand != null) {
				return;
			}
			// pop one.
			if (self.queue.length > 0) {
				self.currentcommand = self.queue.splice(0, 1)[0];
				self.currentcommand.sent = true;
				if (self.currentcommand.command != null) {

					var buf = new Buffer(self.currentcommand.command, 'binary');

					// console.log('SENDING: '+JSON.stringify(self.currentcommand.command));
					// for( var i=0; i<buf.length; i++)
					// 	if (i<100)
					// 		console.log('buf',i,buf[i]);
					// console.log('\n\n');
					self.client.write(buf);
				}
			}
		};
		this._popinputqueue = function() {
			if (self.currentcommand != null) {
				if (self.currentcommand.sent && !self.currentcommand.received) {
					if (self.inputqueue.length >= self.currentcommand.responsesize) {
						var response = self.inputqueue.splice(0, self.currentcommand.responsesize);

						self.currentcommand.received = true;
						self.currentcommand.callback(response);
						self.currentcommand = null;

						setTimeout(function() {
							self._popqueue();
						}, 1);
					}
				}
			}
			if (self.inputqueue.length > 0) {
				setTimeout(function() {
					self._popinputqueue();
				}, 1);
			}
		}
		// this._queuecomm
	}

	EtherConn.prototype.connect = function(ip, port, callback) {
		var self = this;

		this.client = net.connect(
			{
				host: ip,
				port: port
			},
			function() {
				//'connect' listener
				console.log('SOCKET CONNECT: client connected');

				self._send(null, STANDARD_RESPONSE_SIZE, function(data) {
					var st = parseStandardResponse(data);
					// console.log('got initial status', data, st);

					self._send('p', STANDARD_RESPONSE_SIZE, function(data2) {
						var st2 = parseStandardResponse(data2);
						// console.log('got p', data2, st2);

						self._send('v', 32, function(data2) {
							// console.log('got version', data2.toString());

							setTimeout(function() {
								callback(true);
							}, 1);
						});
					});
				});

				self._popqueue();
			}
		);

		this.client.on('data', function(data) {
			// console.log('SOCKET DATA:', data.toString(), data.length, self.currentcommand);
			// console.log('\n\n');
			for(var i=0; i<data.length; i++)
				self.inputqueue.push(data[i]);
			self._popinputqueue();
		});

		this.client.on('error', function(data) {
			console.log('SOCKET ERROR:', data.toString());

			setTimeout(function() {
				callback(false);
			}, 1);
		});

		this.client.on('end', function() {
			console.log('SOCKET END: client disconnected');
		});
	}

	function writeUnsignedInt32 (n) {
		n = Math.round(n);
		var a = (n >> 0) & 65535;
		var b = (n >> 16) & 65535;
		return writeUnsignedInt16(a) + writeUnsignedInt16(b);
	}

	function writeUnsignedInt16 (n) {
		n = Math.round(n);
		if (n < 0)
			n = 0;
		if (n > 65535)
			n = 65535;
		var a = (n >> 0) & 255;
		var b = (n >> 8) & 255;
		return String.fromCharCode(a) + String.fromCharCode(b);
	}

	function writeSignedInt16 (n) {
		n = Math.round(n);
		if (n < -32767)
			n = -32767;
		if (n > 32767)
			n = 32767;
		if (n < 0)
			n = 65535 + n;
		var a = (n >> 0) & 255;
		var b = (n >> 8) & 255;
		return String.fromCharCode(a) + String.fromCharCode(b);
	}

	EtherConn.prototype.write = function(data, speed, callback) {

		// console.log('sending points');
		// console.log('n-points', data.length);
		// console.log('draw rate', speed);

		data[0].control = (data[0].control || 0) | DAC_CTRL_RATE_CHANGE;

		var self = this;
		var packeddata = '';

		var offset = 0;
		var left = data.length;

		while(offset < data.length) {

			var batch = Math.min( 80, left ); // data.length
			if (batch > 0) {

				// queue command
				packeddata += 'q';
				packeddata += writeUnsignedInt16(speed); // rate
				packeddata += writeUnsignedInt16(0); // low watermark?
				// packeddata += writeUnsignedInt32(speed); // rate

				// var offset = 0;

				// data command header
				packeddata += 'd';
				packeddata += writeUnsignedInt16(batch); // npoints

				// points
				for (var i=0; i<batch; i++) {
					var p = data[offset + i];
					packeddata += writeUnsignedInt16(p.control || 0);
					packeddata += writeSignedInt16(p.x || 0);
					packeddata += writeSignedInt16(p.y || 0);
					packeddata += writeUnsignedInt16(p.r || 0);
					packeddata += writeUnsignedInt16(p.g || 0);
					packeddata += writeUnsignedInt16(p.b || 0);
					packeddata += writeUnsignedInt16(p.i || 0);
					packeddata += writeUnsignedInt16(p.u1 || 0);
					packeddata += writeUnsignedInt16(p.u2 || 0);
				}

				left -= batch;
				offset += batch;

				self.acks ++;
			}
		}

		function waitack() {
			// console.log('waiting for '+self.acks+' acks...');
			self._send(null, STANDARD_RESPONSE_SIZE, function(data2) {
				var st = parseStandardResponse(data2);
				// console.log('got ack?', st);
				if ((st.response == 'a' || st.response == 'I') && st.command == 'd') {
					self.acks --;
					if (self.acks > 0) {
						var st2 = parseStandardResponse(data2);
						// console.log('got status 2', data2, st2);
						setTimeout(function() {
							waitack();
						}, 0);
					} else {

						if (self.begun) {

							setTimeout(function() {
								// send one begin?
								callback(self);
							}, 0);

						} else {
							//	self.begun =
								//  if (st3.status.playback_state == 0)
								// console.log('got begin', data3, st3);

								setTimeout(function() {
									// send one begin?
									callback(self);
								}, 0);
						}
					}
				} else {
					setTimeout(function() {
						waitack();
					}, 0);
				}
			});
		}
		var begincommand = 'b' + writeUnsignedInt16(0) + writeUnsignedInt32(speed);
		// console.log('Sending begin command: ' + JSON.stringify(begincommand) );
		self._send(begincommand, STANDARD_RESPONSE_SIZE, function(data3) {
			var st3 = parseStandardResponse(data3);

			self._send('p', STANDARD_RESPONSE_SIZE, function(data3) {
				var st3 = parseStandardResponse(data3);
				//  if (st3.status.playback_state == 0)
				// console.log('got p', data3, st3);

				self._send(packeddata, 0, function(data) {
					// console.log('sent frame packet');
					waitack();
				});

			});

		});
	}

	EtherConn.prototype.close = function() {
		if (this.client) {
			this.client.close();
		}
	}



	var EtherDream = {};

	EtherDream.find = function(callback) {

		var ips = [];
		var all = [];

		var server = dgram.createSocket("udp4");

		server.on("message", function (msg, rinfo) {

			var ip = rinfo.address;
			if (ips.indexOf(ip) != -1)
				return;
			ips.push(ip);

			var twohex = function(n) {
				var s = n.toString(16);
				if (s.length == 1)
					s = '0'+s;
				return s;
			}

			var name = 'EtherDream @ '
				+ twohex(msg[0]) + ':'
				+ twohex(msg[1]) + ':'
				+ twohex(msg[2]) + ':'
				+ twohex(msg[3]) + ':'
				+ twohex(msg[4]) + ':'
				+ twohex(msg[5]);

			all.push({
				ip: ip,
				port: 7765,
				name: name,
				hw_revision: msg[6],
				sw_revision: msg[7],
			});
		});

		server.bind(7654);

		// wait two seconds for data to come back...

		setTimeout(function() {
			server.close();
			callback(all);
		}, 1500);
	}

	EtherDream.connect = function(ip, port, callback) {
		var conn = new EtherConn();
		conn.connect(ip, port, function(success) {
			callback(success ? conn : null);
		});
	}

	ns.EtherDream = EtherDream;

})(exports);