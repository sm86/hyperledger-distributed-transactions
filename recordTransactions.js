var tx_db = require('./db/tx_db');

exports.recordTransactionsFromBlocks = function recordTransactionsFromBlocks(block, source, cb) {
  var no_of_txn = block.data.data.length;
  for(var i=0;i<no_of_txn;i++){
      var tx_data = block.data.data[i];
      var tx_id = tx_data.payload.header.channel_header.tx_id;
      
      tx_db.getTransactionByID(tx_id, function (error, document){           
        //transaction doesnot exist, so create the transaction
        var sources = [];
        sources.push(source);
        if(document==null){
            var tx = {
              tx_id: tx_data.payload.header.channel_header.tx_id,
              timestamp: Date.now(),
              tx_object: tx_data.payload.data.actions[0],
              sources: sources,
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
          } else{
            if (document.sources.indexOf(source) > -1) {
              console.log(document._id+" already listened from same source!");
            } else {
              document.sources.push(source);
              tx_db.update(document, function(err) {  
                if (err) {
                  throw err;
                }
                console.log(document._id +" updated");
              });
            }      
        }
            
      });
  }
};  