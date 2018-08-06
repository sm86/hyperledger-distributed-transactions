'use strict';

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

var tx_db = require('../db/tx_db');
var config = require('../config.json');

var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel(config.destination.channel);
for(var i =0; i<config.destination.peers.length;i++){
    var peer = fabric_client.newPeer('grpc://'+config.destination.peers[i].host+':'+config.destination.peers[i].port);
    channel.addPeer(peer);
}

for(var i =0; i<config.destination.orderers.length;i++){
    var order = fabric_client.newOrderer('grpc://'+config.destination.orderers[i].host+':'+config.destination.orderers[i].port);
    channel.addOrderer(order);
}

var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;
var threshold = config.destination.threshold;

var loadTransactions = new Promise(function(resolve, reject) {
  var result = [];
  tx_db.getValidTransactions(function(err, data) {  
    if (err) {
      throw err;
    }
    result = data;
    resolve(result);
  });
});
var tx = null;

function processTransactions(arr) {
  return arr.reduce(function(promise, record) {
    return promise.then(function() {    
      // get required variables.
      tx = record;
      // tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].value = JSON.parse(tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].value);  
      var writeset = tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0];
      
      var request = {};

      //find which bucket does this transaction belong to.
      for(var j=0;j<config.mapping.length;j++){        

        var isCriteriaMet = eval(config.mapping[j].filtering_criteria);
        
        //If criteria is met.
        if(isCriteriaMet && tx.sources.length>=threshold){
          
          request["fcn"] = config.mapping[j].function;
          request["chaincodeId"] = config.mapping[j].chaincodeId;
          request["chainId"] = config.destination.channel;

          // filling the arguments.
          var transaction = [];
          for(i =0; i<config.mapping[j].object.length;i++){
            if(config.mapping[j].object[i].type==("constant"))
                transaction.push(config.mapping[j].object[i].value);
            else if(config.mapping[j].object[i].type==("variable"))
                transaction.push(eval(config.mapping[j].object[i].value));
            else
                console.log("ERROR");
          }

          request["args"] = transaction;
          
          //create transaction id.
          tx_id = fabric_client.newTransactionID();
          console.log("Assigning transaction_id: ", tx_id._transaction_id);
          
          request["txId"] = tx_id;
        }
    }
    console.log(request);
    return channel.sendTransactionProposal(request);
  }).then((results) => {
      var proposalResponses = results[0];
      var proposal = results[1];
      let isProposalGood = false;
      if (proposalResponses && proposalResponses[0].response &&
        proposalResponses[0].response.status === 200) {
          isProposalGood = true;
          console.log('Transaction proposal was good');
        } else {
          console.error('Transaction proposal was bad');
        }
      if (isProposalGood) {
        console.log(util.format(
          'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
          proposalResponses[0].response.status, proposalResponses[0].response.message));
        var request = {
          proposalResponses: proposalResponses,
          proposal: proposal
        };
  
        var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
        var promises = [];
  
        var sendPromise = channel.sendTransaction(request);
        promises.push(sendPromise); //we want the send transaction first, so that we know where to check status
        let event_hub = fabric_client.newEventHub();
        event_hub.setPeerAddr('grpc://'+config.destination.peers[0].host+':'+config.destination.peers[0].eventhub_port);
        let txPromise = new Promise((resolve, reject) => {
          let handle = setTimeout(() => {
            event_hub.disconnect();
            resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
          }, 3000);
          event_hub.connect();
          event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
            clearTimeout(handle);
            event_hub.unregisterTxEvent(transaction_id_string);
            event_hub.disconnect();
            var return_status = {event_status : code, tx_id : transaction_id_string};
            if (code !== 'VALID') {
              console.error('The transaction was invalid, code = ' + code);
              resolve(return_status);
            } else {
              console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
              resolve(return_status);
            }
          }, (err) => {
            //this is the callback if something goes wrong with the event registration or processing
            reject(new Error('There was a problem with the eventhub ::'+err));
          });
        });
        promises.push(txPromise);
  
        return Promise.all(promises);
      } else {
        console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
        throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
      }
    }).then((results) => {
      console.log('Send transaction promise and event listener promise have completed');
      // check the results in the order the promises were added to the promise all list
      if (results && results[0] && results[0].status === 'SUCCESS') {
        console.log('Successfully sent transaction to the orderer.');
      } else {
        console.error('Failed to order the transaction. Error code: ' + response.status);
      }
  
      if(results && results[1] && results[1].event_status === 'VALID') {
        console.log('Successfully committed the change to the ledger by the peer');
        console.log(tx);
    
      } else {
        console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
      }
    }).catch((err) => {
      console.error('Failed to invoke successfully :: ' + err);
    });  
  }, Promise.resolve());
}


// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext(config.destination.username, true);
}).then((user_from_store) => {
  if (user_from_store && user_from_store.isEnrolled()) {
    console.log('Successfully loaded '+config.destination.username+' from persistence');
    member_user = user_from_store;
  } else {
    throw new Error('Failed to get '+config.destination.username+' run registerUser.js');
  }
  return;
}).then(() => {
  loadTransactions.then(function(result) {
      return processTransactions(result);
    }).then(function() {
      console.log('all done');
  });
});