var db = require('./couchdb').use('tss_success_logs');

exports.create = async function create(tx) {
    console.log("insert");
    await db.insert(tx, tx.tx_id);
};