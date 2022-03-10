curl -i -X GET -H 'Accept: application/json' -H 'Content-type: application/json' http://localhost:3000/ol

curl -i -X POST -H 'Accept: application/json' -H 'Content-type: application/json' http://localhost:3000/ol --data '{"id":"1", "label":"test", "description":"This is a test!", "svg":"<svg></svg>", "class":"TEST", "publish":1}'

curl -i -X PUT -H 'Accept: application/json' -H 'Content-type: application/json' http://localhost:3000/ol/1 --data '{"label":"test-changed", "description":"This is a test!", "svg":"<svg></svg>", "class":"TEST", "publish":1}'

curl -i -X DELETE -H 'Accept: application/json' -H 'Content-type: application/json' http://localhost:3000/ol/1
