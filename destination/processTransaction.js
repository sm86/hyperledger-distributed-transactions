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

  invoke.invokeTransaction(tx, function(err) {  
    if (err) {
      throw err;
    }
    console.log(tx._id+" transaction committed!");
  });
}