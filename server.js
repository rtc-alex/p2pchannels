for (var i = 0; i <= 1; i++) {
	(function () {
		var
			P2PChannels = require('./index.js'),
			p2pChannels = new P2PChannels();

		p2pChannels.listen(8099 + i, function () {  // What port to listen for incoming socket.io connections.

			p2pChannels.addDiscoveryService(new P2PChannels.BitTorrentDHT(55055 + i)); // 55055 is the port we use for DHT.

			p2pChannels.discover('My Cool Service protocol version 1.0');

			p2pChannels.on('remote', function (remoteObj) {

				// The remote has an unique identifier:
				console.log('Connection to remote ' + remoteObj.uuid + ' established.');

				remoteObj.on('data', function (data) {
					console.log(data); // Received message from remote.
				});
				remoteObj.send('Hello how are you?'); // Send message to remote.

			});
		});
	}());
}

