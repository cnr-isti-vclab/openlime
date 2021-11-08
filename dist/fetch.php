<?php

include("database.php");


try {
	$pdo = new PDO("$server;dbname=$database;", $user, $password);
} catch (PDOException $pe) {
	echo(json_encode(['status'=>'error', 'msg' => 'Could not connect to DB' . $pe->getMessage()]));
	return;
}

export($pdo);

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

	}
	echo(json_encode($annotations));
}

?>
