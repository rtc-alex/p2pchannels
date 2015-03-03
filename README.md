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

	p2pChannels.addDiscoveryService(new P2PChannels.BitTorrentDHT(55055)); // 55055 is the port we use for DHT.

Start searching for other servers, using a custom subject string used for discovery. Other servers using the same subject string will try to find each other:

	p2pChannels.discover('My Cool Service protocol version 1.0');

You can use multiple strings for discovery:

	p2pChannels.discover('My Cool Service protocol version 0.9'); // We are backwards compatible.
	p2pChannels.discover('Anther Cool Service'); // Compatible with another service too.

Now, BitTorrent DHT will be used for announcing and trying to find others. Note, this might take some time! As you probably know, it might take some time for BitTorrent downloads to start, and the same goes for those servers to find each other.

When another server is found, they will do some handshaking, and when the connection is established, an event will emit with an object representing the remote:

	p2pChannels.on('remote', function (remoteid, socket) {

		// The remote has an unique identifier:
		console.log('Connection to remote ' + remoteid + ' established.');

		// socket is the socket.io socket connected to the remote.

		socket.send('Hello, dude!');
	});

More discover strings can be added later:

	setTimeout(function () {
		p2pChannels.discover('My Cool Service Chatroom #blarf');
	}, 60000);

And discover string can also be removed:

	p2pChannels.stopDiscover('My Cool Service Chatroom #blarf');


Implementing new discovery services
-----------------------------------

A discovery service object must have a .start() method that takes one (1) argument: the p2pChannels object. When running .start(), it should add all p2pChannels' subject strings, checking the .subjects property of the p2pChannels object. Further, it should listen for the addDiscoverSubject event, which is emitted on new subjects. There is also a removeDiscoverySubject event.

When the discovery service finds another host to connect to, it should emit the event 'discovery' with three arguments. The first argument should be the IP address and the second argument should be the port. The third argument should be the subject that was used for this discovery.




