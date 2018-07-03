var initCouch = require('./db/init_couch');

//Initalize CouchDB
initCouch(function(err) {
  if (err) {
    throw err
  }
  else {
    console.log('couchdb initialized');
  }
});
