# hyperledger-distributed-transactions
Transaction Shipping System to enable distributed transactions on Hyperledger Fabric

## Steps to run transaction shipping system

### Getting ready
* Start your source and destination networks.
* Navigate to a location where you want to run transaction shipping system and clone the project:
`git clone https://github.com/sm86/hyperledger-distributed-transactions.git`
* Open the repository : `cd hyperledger-distributed-transactions/`
* Install the required dependencies : `npm install`
* Start the docker container for Couch: `./setup.sh `
* Initialize the database: `node app`
* verify your initialization by checking if there are 3 databases in http://localhost:5990/_utils/

**Note:** Make sure port 5990 is not being used. In case you need to change it, update the port in setup.sh and db/couchdb.js

### Source 
This section is responsible for listening to transactions on the channel, filtering them as per policy and storing them on the transaction queue. 
* Make sure source attributes are correct in config.json
* For the first time, we will enroll the admin `node enrollAdmin.js`
* Now, we will register user for our platform  `node registerUser.js`
* Update/ create corresponding Network.yaml file in /source folder and you are now good to go.
* Start the blocklistner and this runs forever, listening and processing transactions:  `node blocklistener.js` 

### Destination
This section is responsible for retrieving from the transaction queue, processing to required format and sending the transaction onto destination.
Make sure source attributes are correct in config.json
* For the first time, we will enroll the admin `node enrollAdmin.js`
* Now, we will register user for our platform  `node registerUser.js`
* Update/ create corresponding Network.yaml file in /source folder and you are now good to go.
* Start the blocklistner and this runs forever, listening and processing transactions:  `node shipTransactions.js`
* NOTE: Use 'forever' node package to keep the script running all time. 
