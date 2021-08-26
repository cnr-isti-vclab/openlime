<?php

$request_body = file_get_contents('php://input');
$data = json_decode($request_body);

$server = 'mysql:host=localhost';
$user = 'openlime';
$password = 'not12345';
$database = 'openlime';

/*$server = "mysql:unix_socket='/var/run/mysqld/mysqld.sock'";
$server = 'mysql:host=91.216.107.219';
$user = 'mercu1165701_1363u';
$password = 'tq75uh8fui';
$database = 'mercu1165701_1363u'; */

try {
	$pdo = new PDO("$server;dbname=$database;", $user, $password);
} catch (PDOException $pe) {
	echo(json_encode(['status'=>'error', 'msg' => 'Could not connect to DB' . $pe->getMessage()]));
	return;
}

$sql = "select id, `code`, class, description, selector_value from annotations";
$stm = $pdo->query($sql);
echo('<svg xmlns="http://www.w3.org/2000/svg">');
while ($row = $stm->fetch()) {
	$xml = new SimpleXMLElement($row['selector_value']);
	foreach($xml as $e)
		echo( $e->asXML().'\n');
}
echo('</svg>');