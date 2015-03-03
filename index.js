var
	EventEmitter = require('events').EventEmitter,
	net = require('net'),
	Remote = require('./lib/remote.js'),
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

	var socket = net.connect({ port: port }, function () {
		//console.log('socketioClient connect.');
		this._handshakeRemote(new Remote(socket), "client");
	}.bind(this));
	socket.on('error', function () {
		console.log(arguments);
	});

};

P2PChannels.prototype.discover = function (subject) {
	if (this.subjects.indexOf(subject) !== -1) {
		return false;
	}
	this.subjects.push(subject);
	this.emit('addDiscoverSubject', subject);
	return true;
};

P2PChannels.prototype._addRemote = function (remoteid, remote, connId, remoteConnId) {
	remote.on('end', function () {
		console.log(connId, 'Removed ' + remoteid + ' from remotes.');
		delete(this._remotes[remoteid]);
	}.bind(this));
	console.log(connId, 'Added ' + remoteid + ' to remotes.');
	this._remotes[remoteid] = remote;
	this.emit('remote', remoteid, remote);
};

P2PChannels.prototype._handshakeRemote = function (remote, role) {
	// role is "client" or "server".

	var connId = uuid.v4();
	//console.log(connId, 'new connection');

	var state = 'wait_for_init';
	var remoteid;
	var remoteConnId;

	remote.on('message', function (msg) {
		var msg = msg.split(';');

		if (state === 'wait_for_init') {

			if (msg[0] !== this.protocolVersionString + '_init' || msg.length < 3) {
				//console.log(connId, 'Protocol error #1.');
				remote.end();
				state = 'disconnected';
				return;
			}

			remoteid = msg[1];
			if (!verifyRFC4122UUID(remoteid)) {
				//console.log(connId, 'Not a valid RFC 4122 UUID:', remoteid);
				remote.end();
				state = 'disconnected';
				return;
			}

			var remoteConnId = msg[2];
			if (!verifyRFC4122UUID(remoteConnId)) {
				//console.log(connId, 'Not a valid RFC 4122 UUID:', remoteid);
				remote.end();
				state = 'disconnected';
				return;
			}
			
			if (remoteid === this.uuid) {
				//console.log(connId, 'Connected to myself. :(');
				remote.end();
				state = 'disconnected';
				return;
			}

			if (this.uuid > remoteid) { // Högst UUID får bestämma om detta är en duplicate.
				//console.log(connId, 'I am the great one.');
				if (typeof (this._remotes[remoteid]) !== 'undefined') {
					//console.log(connId, remoteid + ' is already a remote. :(');
					remote.end();
					state = 'disconnected';
					return;
				}
				remote.send(this.protocolVersionString + '_letsgo');
				//console.log('addRemote GO');
				this._addRemote(remoteid, remote, connId, remoteConnId);
				state = 'handshake_finished';
			} else {
				// console.log(connId, 'I am NOT the great one.');
				state = 'wait_for_letsgo';
			}

		} else if (state === 'wait_for_letsgo') {
			if (msg[0] !== this.protocolVersionString + '_letsgo') {
				// console.log(connId, 'Protocol error #2:' + msg);
				remote.end();
				state = 'disconnected';
				return;
			} 
			state = 'handshake_finished';
			//console.log('addRemote NGO');
			this._addRemote(remoteid, remote, connId, remoteConnId);
		}

	}.bind(this));

	var initStr = this.protocolVersionString + '_init;' + this.uuid + ';' + connId;
	//console.log(connId, 'sending: ' + initStr);
	remote.send(initStr);
};

P2PChannels.prototype.listen = function (port, callback) {

	this.port = port;

	//console.log('Listen for incomming connections at port ' + port);

	var server = net.createServer(function (socket) {
		//console.log('client connected');
		socket.on('end', function () {
			//console.log('client disconnected');
		});
		this._handshakeRemote(new Remote(socket), "server");
	}.bind(this));
	server.listen(this.port, function() { //'listening' listener
		if (typeof (callback) === 'function') {
			process.nextTick(function () {
				callback(null);
			});
		}
	});

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
