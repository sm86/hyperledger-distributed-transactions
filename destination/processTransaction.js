var tx_db = require('../db/tx_db');
var invoke = require('./invoke.js');
var config = require('../config.json');
tx_db.getOldestTransaction(function(err, data) {  
  if (err) {
    throw err;
  }
  obj = JSON.stringify(data[0]);
  
  processTransaction(data[0]);
});
function processTransaction(tx) {
  tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].value = JSON.parse(tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].value);  
  var writeset = tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0];
  
  var fcn = null;
  var chaicodeId = null;
  var transaction = [];

  for(j=0;j<config.mapping.length;j++){
      var isCriteriaMet = eval(config.mapping[j].filtering_criteria);
      if(typeof(isCriteriaMet)!='boolean'){
        console.log("Error in Configuration file. Expecting a boolean output for 'filtering_criteria'. Please check for "+i+" element in mapping array");
        return;
      }
      console.log(typeof(isCriteriaMet));
      if(isCriteriaMet){
        fcn = config.mapping[j].function;
        chaincodeId = config.mapping[j].chaicodeId;
        for(i =0; i<config.mapping[j].object.length;i++){
          if(config.mapping[j].object[i].type==("constant"))
              transaction.push(config.mapping[j].object[i].value);
          else if(config.mapping[j].object[i].type==("variable"))
              transaction.push(eval(config.mapping[j].object[i].value));
          else
              console.log("ERROR");
        }
      }
  }
  if(fcn==null || chaicodeId==null){
    console.log("Destination function or ChaincodeID undefined.");
  }else{
    console.log("Destination function: "+fcn);
    console.log(transaction);

    invoke.invokeTransaction(transaction,fcn,chaincodeId, function(err) {  
      if (err) {
        throw err;
      }
      console.log(tx._id+" transaction committed!");
    });
  }
}