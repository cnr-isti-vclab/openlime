# Express Server

This directory contains a NodeJS Express server for handling CRUD operations on a mysql database.
Before using npm, you need to install the required packages locally:
```
npm install
```

To run the server run the following command:
```
npm run server
```
In the example the server is then accessible from http://localhost:3000/ol

## DB Mysql

After enabling mysql and configuring the root password, the db used in the annotation-editor example is built with the command `createdb.sh`.
This creates an user 'openlime' and a database 'openlime' which contains the table 'annotations'.
If needed, the table can be emptied with the command `emptytable.sh`.
You can change the default password by editing the .sh and .sql files.