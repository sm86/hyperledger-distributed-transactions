var db = require('./couchdb').use('tss_logs');

exports.create = function create(tx, cb) {
  db.insert(tx, tx.tx_id, cb);
};

exports.getOldestTransaction = function getOldestUnprocessedTransaction(cb) {  
  db.view(
    'by_timestamp', 'by_timestamp', {include_docs: true, limit: 1},
    function(err, result) {
      if (err) {
        cb(err);
      }
      else {
        result = result.rows.map(function(row) {
        return row.doc;
        });
        cb(null, result);
        return result;
      }
    });
}

exports.updateStatus = function updateStatus(tx,status, cb) {  
  tx.status = status;
  db.insert(tx, tx.tx_id,cb);
}