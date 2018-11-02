'use strict';

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

var tx_db = require('../db/tx_db');
var success_logs = require('../db/tx_success_logs');
var failed_logs = require('../db/tx_failed_logs');
var config = require('../config.json');

var configFilePath = path.join(__dirname, './Network.yaml');
var fabric_client = Fabric_Client.loadFromConfig(configFilePath);

// setup the fabric network
var channel = fabric_client.getChannel('mychannel');

var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;
var threshold = config.destination.threshold;

var tx = null;

async function processTransactions() {
  const arr = await tx_db.getValidTransactions().catch(err=> (console.log(err)));
    return arr.reduce(function(promise, record) {
    return promise.then(function() {    
      // get required variables.
      tx = record.tx_object;
      var writeset = JSON.parse(tx.payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes[0].value);
      // 
      var request = {};

      //find which bucket does this transaction belong to.
      for(var j=0;j<config.mapping.length;j++){        

        var isCriteriaMet = eval(config.mapping[j].filtering_criteria);
        
        //If criteria is met.
        if(isCriteriaMet && record.sources.length>=threshold){
          
          request["fcn"] = config.mapping[j].function;
          request["chaincodeId"] = config.mapping[j].chaincodeId;
          request["chainId"] = config.destination.channel;

          // filling the arguments.
          var transaction = [];
          for(var i =0; i<config.mapping[j].object.length;i++){
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
  	// lets have a look at the responses to see if they are
  	// all good, if good they will also include signatures
	  // required to be committed
	  var all_good = true;
	  for (var i in proposalResponses) {
		  let one_good = false;
		  if (proposalResponses && proposalResponses[i].response &&
			  proposalResponses[i].response.status === 200) {
			  one_good = true;
			  console.log('invoke chaincode proposal was good');
		  } else {
			  console.log('invoke chaincode proposal was bad');
		  }
		  all_good = all_good & one_good;
	  }

	  if (all_good) {
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
    

        return Promise.all(promises);
      } else {
        console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
        throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
      }
    }).then((results) => {
      console.log('Send transaction promise and event listener promise have completed');
      // check the results in the order the promises were added to the promise all list
      var dbpromises = [];
      dbpromises.push(tx_db.delete(record));

      if (results && results[0] && results[0].status === 'SUCCESS') {
        console.log('Successfully sent transaction to the orderer.');
        dbpromises.push(failed_logs.create(record));
      } else {
        console.error('Failed to order the transaction. Error code: ' + results[0].status);
        dbpromises.push(failed_logs.create(record));
      }

      return Promise.all(dbpromises)
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
  processTransactions();
  console.log("Everything is Done!");
});