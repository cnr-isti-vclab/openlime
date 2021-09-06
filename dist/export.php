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

$style = ".openlime-annotation { pointer-events:stroke; opacity: 0.7; }
.openlime-annotation:hover { cursor:pointer; opacity: 1.0; }
	
:focus { fill:yellow; }
path { fill:none; stroke-width:2; stroke:#000; vector-effect:non-scaling-stroke; pointer-events:all; }
path:hover { cursor:pointer; stroke:#f00; }

rect { fill:rgba(255, 0, 0, 0.2); stroke:rgba(127, 0, 0, 0.7); vector-effect:non-scaling-stroke;}
circle { fill:rgba(255, 0, 0, 0.2); stroke:#800; stroke-width:1px; vector-effect:non-scaling-stroke; pointer-events:all;  }
circle.point { stroke-width:10px }
.selected { stroke:#ff0000; stroke-width:4; }";

try {
	$pdo = new PDO("$server;dbname=$database;", $user, $password);
} catch (PDOException $pe) {
	echo(json_encode(['status'=>'error', 'msg' => 'Could not connect to DB' . $pe->getMessage()]));
	return;
}

$sql = "select id, `code`, class, description, selector_value from annotations";
$stm = $pdo->query($sql);
echo("<svg xmlns=\"http://www.w3.org/2000/svg\">\n<style>\n$style\n</style>\n");
while ($row = $stm->fetch()) {
	$xml = new SimpleXMLElement($row['selector_value']);
	foreach($xml as $e)
		echo( $e->asXML()."\n");
}
echo('</svg>');