// openlimeDB Queries

///////////// CONFIG
const dbname = process.env.DBFNAME || 'anno.json';

const fs = require('fs');
class DB {
    constructor(dbname) {
        this.dbname = dbname;
        try {
            const rawdata = fs.readFileSync(this.dbname);
            this.db = JSON.parse(rawdata);
        } catch (err) {
            this.db = [];
        }
    }

    dbwrite() {
        let data = JSON.stringify(this.db);
        fs.writeFileSync(this.dbname, data);
    }

    dbread() {
        return this.db;
    }

    dbcreate(item) {
        item.id=`${item.id}`;
        this.db.push(item);
        this.dbwrite();
        let status = "ok";
        let message = 'Annotation created successfully';
        return { status, message };
    }

    dbupdate(id, item) {
        let idx = -1;
        for (let i in this.db) {
            idx = (this.db[i].id == id) ? i : idx;
        }
        let status = "err";
        let message = 'Error in updating annotation';
        if (idx >= 0) {
            item.id = `${id}`;
            this.db[idx] = item;
            this.dbwrite();
            status = "ok";
            message = 'Annotation updated successfully';
        }
        return { status, message };
    }

    dbdelete(id) {
        id = `${id}`;
        let idx = -1;
        for (let i in this.db) {
            idx = (this.db[i].id == id) ? i : idx;
        }
        let status = "err";
        let message = 'Error in deleting annotation';
        if (idx >= 0) {
            this.db.splice(idx, 1);
            this.dbwrite();
            status = "ok";
            message = 'Annotation deleted successfully';
        }
        return { status, message };
    }
}

// Routing

const express = require('express');
const router = express.Router();
const db = new DB(dbname);

/* GET annotation */
router.get('/', function (req, res, next) {
    const s = res.json(db.dbread(req.query.page));
    if (s.status == 'err') {
        console.error(`Error while getting annotation`, s.message);
    }
});

/* POST annotation */
router.post('/', function (req, res, next) {
    const s = res.json(db.dbcreate(req.body));
    if (s.status == 'err') {
        console.error(`Error while creating annotation`, s.message);
    }
});

/* PUT annotation */
router.put('/:id', function (req, res, next) {
    const s = res.json(db.dbupdate(`${req.params.id}`, req.body));
    if (s.status == 'err') {
        console.error(`Error while updating annotation`, s.message);
    }
});

/* DELETE annotation */
router.delete('/:id', function (req, res, next) {
    const s = res.json(db.dbdelete(`${req.params.id}`));
    if (s.status == 'err') {
        console.error(`Error while deleting annotation`, s.message);
    }
});

module.exports = router;