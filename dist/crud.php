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

if(!$data) {
	export($pdo);
	return;
}

$vars = [
	'id'     => $data->id,
	'label'  => $data->label,
	'description'  => $data->description,
	'class' => $data->class,
	'publish' => $data->publish,
	'svg'   => $data->svg,
];

$keys = [];
$values = [];
$bind = [];
foreach($vars as $key => $value) {
	$keys[] = "`$key`";
	$values[] = ":$key";
	$bind[":$key"] = $value;
}

switch($data->action) {
	case 'create':
		$sql = "INSERT INTO annotations (".implode(', ', $keys).") " .
			"VALUES (".implode(',', $values).")";
		$q = $pdo->prepare($sql);
		$result = $q->execute($bind);
		if(!$result) {
			echo (json_encode(['status' => 'error', 'msg' => $q->errorInfo()]));
			exit(0);;
		}
	 	break;

	case 'delete':
		$sql = "DELETE FROM annotations WHERE id = :id";
		$q = $pdo->prepare($sql);
		$result = $q->execute([':id' => $data->id]);
		if(!$result) {
			echo (json_encode(['status' => 'error', 'msg' => $q->errorInfo()]));
			exit(0);
		}
		break;

	case 'update':
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
			exit(0);
		}
		break;
}

function export($pdo) {
		$sql = "select * from annotations";
		$stm = $pdo->query($sql);
		if(!$stm) {
			echo (json_encode(['status' => 'error', 'msg' => $pdo->errorInfo()]));
			exit(0);
		}
		$annotations = [];
		while ($row = $stm->fetch()) {
			$annotations[] =  [
				"id" => $row['id'],
				"label"=> $row['label'],
				"class"=> $row['class'],
				"description"=> $row['description'],
				"publish" => $row['publish'],
				"selector"=> [
					"type"=> "SvgSelector",
					"value"=> $row["svg"]
				]
			];

/*				"@context" => "http://www.w3.org/ns/anno.jsonld",
				"id" => $row['id'],
				"type"=> "Annotation",
				"body"=> [
					[
					"type"=> "TextualBody",
					"value"=> $row['title'],
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
					"value"=> $row["svg"]
				  ]
				]
*/				
		}
		echo(json_encode($annotations));
		return;
}

echo(json_encode(['status' => 'ok']));

?>
