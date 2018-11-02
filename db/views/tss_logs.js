var config = require('../config.json');

exports.by_timestamp = {  
    map: function(doc) {
      if (doc.status==0 && doc.sources.length>=config.source.threshold){
        emit([doc.timestamp], doc);
      }
    }
};