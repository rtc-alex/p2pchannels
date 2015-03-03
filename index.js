var
	EventEmitter = require('events').EventEmitter,
	socketio = require("socket.io"),
	socketioClient = require('socket.io-client'),
	util = require('util'),
	uuid = require('node-uuid');

function verifyRFC4122UUID(uuid) {
	return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
}

function P2PChannels() {
	EventEmitter(this);

	this._discoveryServices = [];
	this._remotes = [];
	this.subjects = [];
	this.uuid = uuid.v4();
}

util.inherits(P2PChannels, EventEmitter);

P2PChannels.prototype.protocolVersionString = 'ssdhtv1'; // Change when network protocol gets incompatible.

P2PChannels.BitTorrentDHT = require('./lib/bittorrentdht.js');

P2PChannels.prototype.addDiscoveryService = function (obj) {
	this._discoveryServices.push(obj);
	obj.start(this);
	obj.on('discovery', function (ip, port, subject) {
		//console.log('Serivce discovered at ' + ip + ':' + port + '. Subject: ' + subject);
		this.connect(ip, port);
	}.bind(this));
};

P2PChannels.prototype.connect = function (ip, port) {
	ip = '127.0.0.1';
	//console.log('P2PChannels.connect(' + ip + ',' + port + ');');
	port = parseInt(port);
	var addr = ip + ':' + port;

	var socket = socketioClient.connect('http://' + addr);
	socket.on('connect_error', function () {
		//console.log('connect_error', addr, arguments);
	});
	socket.on('connect_timeout', function () {
		//console.log('connect_timeout', arguments);
	});
	socket.on('connect', function () {
		//console.log('socketioClient connect.');
		this._handshakeSocket(socket, "client");
	}.bind(this));
};

P2PChannels.prototype.discover = function (subject) {
	if (this.subjects.indexOf(subject) !== -1) {
		return false;
	}
	this.subjects.push(subject);
	this.emit('addDiscoverSubject', subject);
	return true;
};

P2PChannels.prototype._handshakeSocket = function (socket, role) {
	// role is "client" or "server".

	var addRemote = function (remoteid, socket) {
		console.log('Added ' + remoteid + ' to remotes.');
		this._remotes[remoteid] = socket;
		this.emit('remote', remoteid, socket);
		socket.on('message', function (msg) {
			this.emit('message', remoteid, socket, msg);
		}.bind(this));
		socket.send(this.protocolVersionString + '_letsgo');
	}.bind(this);

	socket.once('message', function (msg) {
		//console.log('message', arguments);
		var msg = msg.split(';', 2);
		var remoteid = msg[1];
		if (msg[0] !== this.protocolVersionString + '_init') {
			console.log('Protocol error #1.');
			socket.disconnect();
			return;
		}
		if (!verifyRFC4122UUID(remoteid)) {
			//console.log('Not a valid RFC 4122 UUID:', remoteid);
			socket.disconnect();
			return;
		}

		if (remoteid === this.uuid) {
			console.log('Connected to myself. :(');
			socket.disconnect();
			return;
		}

		if (this.uuid > remoteid) { // Högst UUID får bestämma om detta är en duplicate.
			console.log('I am the great one.');
			if (typeof (this._remotes[remoteid]) !== 'undefined') {
				console.log(remoteid + ' is already a remote. :(');
				socket.disconnect();
				return;
			}
			socket.send(this.protocolVersionString + '_letsgo');
			addRemote(remoteid, socket);
		} else {
			console.log('I am NOT the great one.');
			socket.once('message', function (msg) {
				if (msg !== this.protocolVersionString + '_letsgo') {
					console.log('Protocol error #2:' + msg);
					socket.disconnect();
					return;
				} else {
					console.log('Lets go!');
				}
				addRemote(remoteid, socket);
			}.bind(this));
		}

	}.bind(this));

	socket.send(this.protocolVersionString + '_init;' + this.uuid);
};

P2PChannels.prototype.listen = function (port, callback) {

	this.port = port;

	//console.log('Listen for incomming connections at port ' + port);

	var io = socketio.listen(port);
	io.sockets.on("connection", function (socket) {
		//console.log('Got incoming connection at port ' + port);
		this._handshakeSocket(socket, "server");
	}.bind(this));

	if (typeof (callback) === 'function') {
		process.nextTick(function () {
			callback(null);
		});
	}

};

P2PChannels.prototype.stopDiscover = function (subject) {
	var index = this.subjects.indexOf(subject);
	if (index === -1) {
		return false;
	}
	this.subjects.splice(index, 1);
	this.emit('removeDiscoverSubject', subject);
	return true;
};

module.exports = P2PChannels;
