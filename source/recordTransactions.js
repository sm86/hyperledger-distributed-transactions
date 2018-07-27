var tx_db = require('../db/tx_db');

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
            var txRecord = {
              tx_id: tx_data.payload.header.channel_header.tx_id,
              timestamp: Date.now(),
              tx_object: tx_data.payload.data.actions[0],
              sources: sources,
              status: 0
            };

            // Required variables for filtering.
            var tx = tx_data.payload.data.actions[0];
            tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].value = JSON.parse(tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].value);  
            var writeset = tx.tx_object.payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0];

            for(j=0;j<config.mapping.length;j++){
                var isCriteriaMet = eval(config.mapping[j].filtering_criteria);
                if(typeof(isCriteriaMet)!='boolean'){
                  console.log("Error in Configuration file. Expecting a boolean output for 'filtering_criteria'. Please check for "+i+" element in mapping array");
                  return;
                }
                if(isCriteriaMet){
                  tx_db.create(txRecord, function(err) {
                    if (err) {
                      throw err;
                    }
                    else {
                      console.log('Successfully added transaction '+ txRecord.tx_id+" to database.");
                    }
                  });
                  break;
                }
            }
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