CREATE DATABASE openlime;
CREATE USER 'openlime'@'localhost' IDENTIFIED BY 'NydROTic20';
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
DESCRIBE annotations;
