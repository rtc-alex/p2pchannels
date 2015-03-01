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
	this._remotes = {};
	this.subjects = [];
	this.uuid = uuid.v4();
}

util.inherits(P2PChannels, EventEmitter);

P2PChannels.prototype.protocolVersionString = 'ssdhtv1'; // Change when network protocol gets incompatible.

P2PChannels.BitTorrentDHT = require('./lib/bittorrentdht.js');

P2PChannels.prototype.addDiscoveryService = function (obj) {
	this._discoveryServices.push(obj);
	obj.start(this);
	obj.on('discovery', function (ip, port) {
		console.log('Serivce discovered at ' + ip + ':' + port + '.');
		this.connect(ip, port);
	}.bind(this));
};

P2PChannels.prototype.connect = function (ip, port) {
	console.log('P2PChannels.connect(' + ip + ',' + port + ');');
	port = parseInt(port);
	var addr = ip + ':' + port;

	var socket = socketioClient.connect('http://' + addr);
	socket.on('connect_error', function () {
		console.log('connect_error', addr, arguments);
	});
	socket.on('connect_timeout', function () {
		console.log('connect_timeout', arguments);
	});
	socket.on('connect', function () {
		console.log('socketioClient connect.');
		this._handshakeSocket(socket);
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

P2PChannels.prototype._handshakeSocket = function (socket) {
	socket.once('data', function (msg) {
		if (msg.substr(0, 13) !== 'ssdhtv1_init;' || !verifyRFC4122UUID(msg.substr(13))) {
			socket.disconnect();
			return;
		}
		var remoteid = msg.substr(13);

		if (typeof (this._remotes[remoteid]) !== 'undefined') {
			console.error(remoteid + ' is already a remote.');
			socket.disconnect();
			return;
		}
		console.error('Added ' + remoteid + ' to remotes.');
		this._remotes[remoteid] = new Remote(remoteid, socket);
		this.emit('remote', this._remotes[remoteid]);
		
	}.bind(this));
};

P2PChannels.prototype.listen = function (port, callback) {

	this.port = port;

	console.log('Listen for incomming connections at port ' + port);

	var io = socketio.listen(port);
	io.sockets.on("connection", function (socket) {
		console.log('Got incoming connection at port ' + port);
		this._handshakeSocket(socket);
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
	this.emit('removeDiscoverySubject', subject);
	return true;
};

module.exports = P2PChannels;
