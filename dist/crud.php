<?php

include("database.php");
$request_body = file_get_contents('php://input');
$data = json_decode($request_body);


try {
	$pdo = new PDO("$server;dbname=$database;", $user, $password);
} catch (PDOException $pe) {
	echo(json_encode(['status'=>'error', 'msg' => 'Could not connect to DB' . $pe->getMessage()]));
	return;
}

switch($data->action) {
	case 'create':
		$sql = "INSERT INTO annotations (id, classes, selector_type, selector_value, `left`, `right`, top, bottom) " .
			"VALUES (:id, :selector_type, :selector_value, :left, :right, :top, :bottom)";
		$q = $pdo->prepare($sql);
		$vars = [
			':id'     => $data->id,
			':code'  => $data->code,
			':class'  => $data->class,
			':description'  => $data->description,
			':selector_type'  => $data->selector_type, 
			':selector_value' => $data->selector_value,
			':left'   => $data->bbox->x,
			':bottom' => $data->bbox->y,
			':right'  => $data->bbox->width + $data->bbox->x,
			':top'    => $data->bbox->height + $data->bbox->y
		];
		$result = $q->execute($vars);
		if(!$result) {
			echo (json_encode(['status' => 'error', 'msg' => $q->errorInfo()]));
			return;
		}
	 	break;

	case 'delete':
		$sql = "DELETE FROM annotations WHERE id = :id";
		$q = $pdo->prepare($sql);
		$result = $q->execute([':id' => $data->id]);
		if(!$result) {
			echo (json_encode(['status' => 'error', 'msg' => $q->errorInfo()]));
			return;
		}
		break;

	case 'update':
		$vars = [
			'id'     => $data->id,
			'code'  => $data->code,
			'class'  => $data->class,
			'description'  => $data->description,
			'selector_type'  => $data->selector->type, 
			'selector_value' => $data->selector->value,
			'left'   => $data->bbox->x,
			'bottom' => $data->bbox->y,
			'right'  => $data->bbox->width + $data->bbox->left,
			'top'    => $data->bbox->height + $data->bbox->bottom
		];

	
		$sql = "UPDATE annotations set";
		$tmp = [];
		foreach($vars as $key => $value) {
			if($key != 'id')
				$tmp[] = "`$key` = :$key ";
		}
		$sql .= implode(',', $tmp) . " where id = :id";
		$q = $pdo->prepare($sql);
		$result = $q->execute($vars);
		if(!$result) {
			echo (json_encode(['status' => 'error', 'msg' => $q->errorInfo()]));
			return;
		}
		break;
	default:
		$sql = "select * from annotations";
		$stm = $pdo->query($sql);
		$annotations = [];
		while ($row = $stm->fetch()) {
			$annotations[] =  [
				"@context" => "http://www.w3.org/ns/anno.jsonld",
				"id" => $row['id'],
				"type"=> "Annotation",
				"body"=> [
					[
					"type"=> "TextualBody",
					"value"=> $row['code'],
					"purpose"=> "identifying"
					],
					[
					"type"=> "TextualBody",
					"value"=> $row['description'],
					"purpose"=> "describing"
					],
					[
					"type"=> "TextualBody",
					"value"=> $row['class'],
					"purpose"=> "classifying"
					]
				],
				"target"=> [
				  "selector"=> [
					"type"=> "SvgSelector",
					"value"=> $row["selector_value"]
				  ]
				]
			];
		}
		echo(json_encode($annotations));
		return;
}

echo(json_encode(['status' => 'ok']));

?>
