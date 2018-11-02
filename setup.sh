#!/bin/sh


# Create CouchDB container
docker run -p 5990:5984 -d --name tss-couchdb couchdb

