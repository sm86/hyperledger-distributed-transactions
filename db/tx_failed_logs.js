var db = require('./couchdb').use('tss_failed_logs');

exports.create = async function create(tx) {
    await db.insert(tx, tx.tx_id);
};