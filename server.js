for (var i = 0; i <= 1; i++) {
	(function () {
		var
			P2PChannels = require('./index.js'),
			p2pChannels = new P2PChannels();

		p2pChannels.listen(8099 + i);  // What port to listen for incoming socket.io connections.

		p2pChannels.addDiscoveryService(new P2PChannels.BitTorrentDHT(55055 + i)); // 55055 is the port we use for DHT.

		p2pChannels.discover('My Cool Service protocol version 1.1');

		p2pChannels.on('remote', function (remoteid, socket) {

			// The remote has an unique identifier:
			console.log('Connection to remote ' + remoteid + ' established.');

			// socket is the socket.io socket connected to the remote.

			socket.on('message', function(msg) {
				console.log('received', msg);
			});

			setInterval(function() {
				console.log('Sending to ' + remoteid + '.');
				socket.send('Hello, ' + remoteid + '! I am ' + p2pChannels.uuid + '.');
			}, 2000);
		});
		p2pChannels.on('message', function (remoteid, socket, message) {
			console.log('Message from ' + remoteid + ': ' + message);
		});

	}());
}

