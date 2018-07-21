var Fabric_Client = require('fabric-client');

var fabric_client = new Fabric_Client();
var path = require('path');

var recordTransactions = require('../recordTransactions');
var config = require('../config.json');

var peer_id =0;

var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);

var peer = fabric_client.newPeer('grpc://'+config.source.peers[peer_id].host+':'+config.source.peers[peer_id].port);

Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);
	return fabric_client.getUserContext(config.source.username, true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded '+config.source.username+ ' from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get user.... run registerUser.js');
	}
}).then((results) => {
	let channel = fabric_client.newChannel(config.source.channel,fabric_client);
	var channel_event_hub = channel.newChannelEventHub(peer);

		let txPromise = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				channel_event_hub.disconnect();
				resolve({event_status : 'TIMEOUT'});
			}, 300000);
		channel_event_hub.connect(true);
		channel_event_hub.registerBlockEvent(
  		(block) => {
			var source_formatted = config.source.peers[0].host+':'+config.source.peers[0].port;
		   	recordTransactions.recordTransactionsFromBlocks(block,source_formatted,function(err) {
				if (err) {
				    throw err;
				  }
				else {
				    console.log('Block Processed');
				  }
				});
  		},
  		(err) => {
    		console.log('Oh snap!');
  		});
	});
});