<?php

$filename = 'annotations.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Cache-Control: post-check=0, pre-check=0', FALSE);
header('Pragma: no-cache');


$request_body = file_get_contents('php://input');
$data = json_decode($request_body);


if(!file_exists($filename))
	file_put_contents($filename, "[]");

$annotations = json_decode(file_get_contents($filename));

if(!$data) {
	echo(json_encode($annotations));
	return;
}

$id = $data->id;

/*$vars = [
	'id'     => $data->id,
	'label'  => $data->label,
	'description'  => $data->description,
	'class' => $data->class,
	'publish' => $data->publish,
	'svg'   => $data->svg,
]; */

if($data->action) {
	switch($data->action) {
		case 'create':
			$annotations[] = $data;
			break;

		case 'delete':
			$annotations = array_values(array_filter($annotations, function($anno, $i) { global $id; return $anno->id != $id; }, ARRAY_FILTER_USE_BOTH));
			break;

		case 'update':
			foreach($annotations as $i => $anno)
				if($anno->id == $id)
					$annotations[$i] = $data;
			break;
	}
	if(!is_writable($filename)) {
		echo(json_encode(['status' => 'error', 'msg' => "Could not write annotations file."]));
		return;
	}
	file_put_contents($filename, json_encode($annotations));
}


echo(json_encode(['status' => 'ok']));

?>
