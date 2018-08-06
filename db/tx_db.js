var db = require('./couchdb').use('tss_queue');

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

exports.getValidTransactions = function getUnprocessedTransactions(cb) {  
  db.view(
    'by_timestamp', 'by_timestamp', {include_docs: true},
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

exports.update = function update(tx, cb) {  
  db.insert(tx, tx.tx_id,cb);
}


exports.delete = function deleteRecord(tx,cb) {
  db.destroy(tx.tx_id, tx._rev, cb);
}

exports.getTransactionByID = function getTransaction(tx_id,cb) {  
  db.get(tx_id, function (err, result){           
      if (err) {
        cb(err);
      }
      else {
        cb(null,result);
        return result;
      }
  });
}