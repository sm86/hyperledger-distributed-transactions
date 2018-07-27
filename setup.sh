#!/bin/sh


# Create CouchDB container
docker run -p 5985:5984 -d --name tss-couchdb couchdb

