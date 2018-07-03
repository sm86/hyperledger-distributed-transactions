var db = require('./couchdb').use('tss_logs');

exports.create = function create(tx, cb) {
  db.insert(tx, tx.tx_id, cb);
};
