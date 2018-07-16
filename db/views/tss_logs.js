exports.by_timestamp = {  
    map: function(doc) {
      if (doc.status==0) {
        emit([doc.timestamp], doc);
      }
    }
  };