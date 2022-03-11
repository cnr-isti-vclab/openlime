# PHP Server

This directory contains a php server for handling CRUD operations on a mySQL database (crud.php) or on files (json.php).

One way to run the server from the command line is to use php:
```
php -S 127.0.0.1:8080
```
In the example the server is then accessible from http://127.0.0.1:8080/crud.php or http://127.0.0.1:8080/json.php

## DB Mysql
If not already done, to initialize mySQL the first time you have to follow these steps (on os linux):
1. sudo systemctl start mysqld
2. sudo mysql_secure_installation
3. sudo systemctl restart mysqld
4. mysql -u root -p
   pwd: Cagliari2020!


After enabling mySQL and configuring the root password, the db used in the annotation-editor example is built with the command `createdb.sh`.
This creates an user 'openlime' and a database 'openlime' which contains the table 'annotations'.
If needed, the table can be emptied with the command `emptytable.sh`.
You can change the default password by editing the .sh and .sql files.
