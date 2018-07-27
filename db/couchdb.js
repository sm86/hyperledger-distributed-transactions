var nano = require('nano');

module.exports = nano(process.env.COUCHDB_URL || 'http://127.0.0.1:5985');
