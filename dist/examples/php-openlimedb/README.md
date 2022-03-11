# PHP Server

This directory contains a php server for handling CRUD operations on a mysql database (crud.php) or on files (json.php).

One way to run the server from the command line is to use php:
```
php -S 127.0.0.1:8080
```
In the example the server is then accessible from http://127.0.0.1:8080/crud.php or http://127.0.0.1:8080/json.php

## DB Mysql

After enabling mysql and configuring the root password, the db used in the annotation-editor example is built with the command `createdb.sh`.
This creates an user 'openlime' and a database 'openlime' which contains the table 'annotations'.
If needed, the table can be emptied with the command `emptytable.sh`.
You can change the default password by editing the .sh and .sql files.