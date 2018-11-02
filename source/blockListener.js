var Fabric_Client = require('fabric-client');
var path = require('path');
var recordTransactions = require('./recordTransactions');
var config = require('../config.json');


var configFilePath = path.join(__dirname, './Network.yaml');
var fabric_client = Fabric_Client.loadFromConfig(configFilePath);

var peer_id =0;

var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);

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
	let channel = fabric_client.getChannel(config.source.channel);
	var channel_event_hub = channel.newChannelEventHub(config.source.peers[0].name);

		let txPromise = new Promise((resolve, reject) => {

		channel_event_hub.connect(true);
		channel_event_hub.registerBlockEvent(
  		(block) => {
			var source_formatted = config.source.peers[peer_id].host+':'+config.source.peers[peer_id].port;
			   recordTransactions.recordTransactionsFromBlocks(block,source_formatted).then(()=> {
					console.log('Block processed!');
			   });
  		},
  		(err) => {
    		console.log('Oh snap!');
  		});
	});
});