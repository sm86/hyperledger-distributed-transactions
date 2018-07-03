var tx_db = require('./db/tx_db');

exports.recordTransactionsFromBlocks = function recordTransactionsFromBlocks(block, source, cb) {
  var no_of_txn = block.data.data.length;
  for(var i=0;i<no_of_txn;i++){
      var tx_data = block.data.data[i];
      var tx = {
          tx_id: tx_data.payload.header.channel_header.tx_id,
          timestamp: tx_data.payload.header.channel_header.timestamp,
          tx_object: tx_data.payload.data.actions[0],
          sources: source,
          status: 0
      };
      tx_db.create(tx, function(err) {
        if (err) {
          throw err;
        }
        else {
          console.log('Successfully added transaction '+ tx.tx_id+" to database.");
        }
      });

  }
};
