<?php

$request_body = file_get_contents('php://input');
$data = json_decode($request_body);

$server = 'localhost';
$user = 'openlime';
$password = 'not12345';
$database = 'openlime';

$link = mysqli_connect($server, $user, $password, $database);
if(!$link) {
	echo(json_encode(['status'=>'error', 'msg' => 'Could not connect to DB']));
	exit(0);
}

switch($data->action) {
	case 'create':
		break;
	case 'delete':
		break;
	case 'update':
		break;
}

echo(json_encode(['status' => 'ok']));

?>