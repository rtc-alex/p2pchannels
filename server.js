(function () {
	var
		P2PChannels = require('./index.js'),
		p2pChannels = new P2PChannels(),
		instance = parseInt(process.argv[2]);

	p2pChannels.listen(8099 + instance);  // What port to listen for incoming socket.io connections.

	p2pChannels.addDiscoveryService(new P2PChannels.BitTorrentDHT(55055 + instance)); // 55055 is the port we use for DHT.

	p2pChannels.discover('My Cool Service protocol version 1.1');

	p2pChannels.on('remote', function (remoteid, socket) {

		// The remote has an unique identifier:
		console.log('Connection to remote ' + remoteid + ' established.');

		// socket is the socket.io socket connected to the remote.

		socket.on('message', function(msg) {
			console.log('received', msg);
		});
		socket.on('disconnect', function() {
			console.log('disconnect.');
		});

		socket.send('Hello, ' + remoteid + '! I am ' + p2pChannels.uuid + '.');
	});

}());
