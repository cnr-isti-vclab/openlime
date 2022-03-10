CREATE DATABASE;
CREATE USER 'openlime'@'localhost' IDENTIFIED BY 'Cagliari2020!';
GRANT ALL PRIVILEGES ON openlime . * TO 'openlime'@'localhost';
USE openlime;
CREATE TABLE annotations
(
    id VARCHAR(64) PRIMARY KEY, 
    label VARCHAR(64), 
    description TEXT, 
    svg TEXT,
    class VARCHAR(64),
    publish INT(11)
);
