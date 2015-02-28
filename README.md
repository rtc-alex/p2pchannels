p2pchannels
===========


How to use
----------

First create the server for listening on incoming connections:

	var
		P2PChannels = require('p2pchannels'),
		p2pChannels = new P2PChannels();

	p2pChannels.listen(8099); // What port to listen for incoming socket.io connections.

Add BitTorrent DHT for discovery:

	p2pChannels.addDiscovery(new P2PChannels.BitTorrentDHT(55055)); // 55055 is the port we use for DHT.

Start searching for other servers, using a custom subject string used for discovery. Other servers using the same subject string will try to find each other:

	p2pChannels.discover('My Cool Service protocol version 1.0');

You can use multiple strings for discovery:

	p2pChannels.discover('My Cool Service protocol version 0.9'); // We are backwards compatible.
	p2pChannels.discover('Anther Cool Service'); // Compatible with another service too.

Now, BitTorrent DHT will be used for announcing and trying to find others. Note, this might take some time! As you probably know, it might take some time for BitTorrent downloads to start, and the same goes for those servers to find each other.

When another server is found, they will do some handshaking, and when the connection is established, an event will emit with an object representing the remote:

	p2pChannels.on('remote', function (remoteObj) {

		// The remote has an unique identifier:
		console.log('Connection to remote ' + remoteObj.uuid + ' established.');

		remoteObj.on('data', function (data) {
			console.log(data); // Received message from remote.
		});
		remoteObj.send('Hello how are you?'); // Send message to remote.

	});

More discover strings can be added later:

	setTimeout(function () {
		p2pChannels.discover('My Cool Service Chatroom #blarf');
	}, 60000);

And discover string can also be removed:

	p2pChannels.stopDiscover('My Cool Service Chatroom #blarf');

