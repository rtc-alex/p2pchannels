var
	EventEmitter = require('events').EventEmitter,
	util = require('util');

function Remote(socket) {
	EventEmitter(this);

	this._incoming = '';
	this.socket = socket;

	this.socket.on('data', function (chunk) {
		this._incoming += chunk.toString();
		this._submitEvents();
	}.bind(this));

	this.socket.on('end', function () {
		this.emit('end');
	}.bind(this));
}

util.inherits(Remote, EventEmitter);

Remote.prototype.end = function (data) {
	if (typeof (data) !== 'undefined') {
		this.send(data);
	}
	this.socket.end();
}

Remote.prototype.send = function (data) {
	try {
		data = JSON.stringify(data);
		//console.log('ut: ' + data);
		this.socket.write(data + "\n");
	} catch(e) {
	}
};

Remote.prototype._submitEvents = function () {
	var lb = this._incoming.indexOf("\n");
	if (lb !== -1) {
		var msg = this._incoming.substr(0, lb);
		this._incoming = this._incoming.substr(lb + 1);
		try {
			msg = JSON.parse(msg);
		} catch(e) {
		}
		//console.log('in: ' + msg);
		this.emit('message', msg);

		if (this._incoming.indexOf("\n") !== -1) {
			setImmediate(this._submitEvents.bind(this));
		}
	}
};

module.exports = Remote;
