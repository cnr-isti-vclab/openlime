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
If not already done, to initialize mySQL the first time you have to follow these steps (on os linux):
If not already done, to initialize mySQL the first time you have to follow these steps (on os linux):
1. `sudo systemctl start mysqld`
2. `sudo mysql_secure_installation`
3. `sudo systemctl restart mysqld`
4. `mysql -u root -pCagliari2020!`

After enabling mySQL and configuring the root password, the db used in the annotation-editor example is built with the command `createdb.sh`.
This creates an user 'openlime' and a database 'openlime' which contains the table 'annotations'.
If needed, the table can be emptied with the command `emptytable.sh`.
You can change the default password by editing the .sh and .sql files.
