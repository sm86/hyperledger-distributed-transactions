var tx_db = require('../db/tx_db');
var invoke = require('./invoke.js');

tx_db.getOldestTransaction(function(err, data) {  
  if (err) {
    throw err;
  }
  obj = JSON.stringify(data[0]);
  
  processTransaction(data[0]);
});
function processTransaction(tx) {  
  console.log("Processing transaction")
  var tx_base = tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0];
  tx_base.value = JSON.parse(tx_base.value);
  
  var transaction = {};
  for(i =0; i<config.object.length;i++){
      if(config.object[i].isConstant)
          transaction[config.object[i].attribute] = config.object[i].value;
      else
          transaction[config.object[i].attribute] = eval(config.object[i].value);
  }
  invoke.invokeTransaction(transaction, function(err) {  
    if (err) {
      throw err;
    }
    console.log(tx._id+" transaction committed!");
  });
}