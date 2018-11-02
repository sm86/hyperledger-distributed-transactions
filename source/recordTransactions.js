var tx_db = require('../db/tx_db');
var config = require('../config.json');


exports.recordTransactionsFromBlocks = async function recordTransactionsFromBlocks(block, source, cb) {
  var no_of_txn = block.data.data.length;
  console.log(no_of_txn);
  for(var i=0;i<no_of_txn;i++){
      var tx_data = block.data.data[i];
      var tx_id = tx_data.payload.header.channel_header.tx_id;
      console.log("Transaction ID is : "+ tx_id);
      const document = await tx_db.getTransactionByID(tx_id).catch(err => console.log("need to add record"));;

      if(document==null){
        //transaction doesnot exist, so create the transaction
        var sources = [];
        sources.push(source);
        var txRecord = {
          tx_id: tx_id,
          timestamp: Date.now(),
          tx_object: tx_data.payload.data.actions[0],
          sources: sources,
          status: 0
        };
        // Required variables for filtering.
        var tx = tx_data.payload.data.actions[0];
        // tx.payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes[0].value = JSON.parse(tx.payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes[0].value);  
        var writeset = JSON.parse(tx.payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes[0].value);
        for(j=0;j<config.mapping.length;j++){
          var isCriteriaMet = eval(config.mapping[j].filtering_criteria);
          if(typeof(isCriteriaMet)!='boolean'){
            console.log("Error in Configuration file. Expecting a boolean output for 'filtering_criteria'. Please check for "+i+" element in mapping array");
            return;
          }
          if(isCriteriaMet){
            try{
              await tx_db.create(txRecord);
              console.log('Successfully added transaction '+ txRecord.tx_id+" to database.");
            } catch(err){
              console.log(err);
            }
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
  }
}; 
