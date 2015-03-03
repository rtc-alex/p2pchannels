var
        crypto = require('crypto'),
	bittorrentdht = require('bittorrent-dht'),
	EventEmitter = require('events').EventEmitter,
	fs = require('fs'),
	util = require('util'),
	uuid = require('node-uuid');

function BitTorrentDHT(port) {
	EventEmitter(this);
	this.port = port;
	this.nodesFile = 'bittorrentNodes.json';
}

util.inherits(BitTorrentDHT, EventEmitter);

BitTorrentDHT.prototype.storeNodes = function () {
	fs.writeFile(this.nodesFile, JSON.stringify(this.dht.toArray()));
};

BitTorrentDHT.prototype._lookupAndAnnounce = function (subject) {
	//console.log('_lookupAndAnnounce("' + subject + '");');
	if (this.p2pchannelsObj.subjects.indexOf(subject) === -1) {
		//console.log('Subject was removed, dont lookup and announce it (anymore?): ' + subject);
		return;
	}

	var infoHash = this.makeInfoHash(subject);

	this.dht.lookup(infoHash, function (err, closestNodes) {
		if (err) {
			//console.log(err);
			return;
		}
		//console.log('announcing ' + infoHash + ' on ' + this.p2pchannelsObj.port);

		this.dht.announce(infoHash, this.p2pchannelsObj.port, function (err) {
			if (err) {
				//console.log(err);
			}
			setTimeout(function() {
				this._lookupAndAnnounce(subject);
			}.bind(this), 4 * 60 * 1000); // 4 minutes

		}.bind(this));
	}.bind(this));
};

BitTorrentDHT.prototype.makeInfoHash = function (str) {
        return crypto.createHash('sha1').update(str + this.p2pchannelsObj.protocolVersionString).digest("hex");
}

BitTorrentDHT.prototype.start = function (p2pchannelsObj) {
	this.p2pchannelsObj = p2pchannelsObj;

	this.dhtNodeId = Buffer.concat([new Buffer('klnd'), new Buffer(uuid.parse(p2pchannelsObj.uuid))]),

	fs.readFile(this.nodesFile, function(err, data) {
		var bootstrap = null;
		if (!err) {
			try {
				bootstrap = JSON.parse(data)
			} catch(e) {
			}
		}
		if (bootstrap === null) {
			this.dht = new bittorrentdht({
				nodeId: this.dhtNodeId
			});
		} else {
			this.dht = new bittorrentdht({
				nodeId: this.dhtNodeId,
				bootstrap: bootstrap
			});
		}

		this.dht.listen(this.port, function () {
			//console.log('started dht at ' + this.port);
		});

		this.dht.on('ready', function () {
			//console.log('dht ready');

			this.p2pchannelsObj.subjects.forEach(this._lookupAndAnnounce.bind(this));
			this.p2pchannelsObj.on('addDiscoverSubject', function (subject) {
				this._lookupAndAnnounce(subject);
			}.bind(this));
			this.p2pchannelsObj.on('removeDiscoverSubject', function (subject) {
				// There is no way in the bittorrent-dht module to stop a loopup, yet.
			}.bind(this));

			setInterval(this.storeNodes.bind(this), 60000);
		}.bind(this));

		this.dht.on('listening', function (port) {
			//console.log('now listening for DHT @ ' + port)
		});

		this.dht.on('warning', function (err) {
			//console.log('dht warning', arguments);
		});

		this.dht.on('error', function (err) {
			//console.log('dht error', arguments);
		});

		this.dht.on('peer', function (addr, hash, from) {
			//console.log('found potential peer ' + addr + ' through ' + from, arguments);
			addr = addr.split(':', 2);
			var matchingInfoHash = false;
			this.p2pchannelsObj.subjects.forEach(function (subject) {
				if (this.makeInfoHash(subject) === hash) {
					matchingInfoHash = true;
					this.emit('discovery', addr[0], parseInt(addr[1]), subject);
				}
			}.bind(this));
			if (!matchingInfoHash) {
				//console.log('found peer with non-matching subject (probably an old subject that was removed.)');
			}
		}.bind(this));

		this.dht.on('announce', function (err) {
			//console.log('announce', arguments);
		});
		
	}.bind(this));

};

module.exports = BitTorrentDHT;
