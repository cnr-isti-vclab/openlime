// openlimeDB Queries

const db = require('./db');

function emptyOrRows(rows) {
    return rows ? rows : [];
}

async function dbread() {
    const rows = await db.query(
        `SELECT id, label, description, svg, class, publish FROM annotations`);
    const data = emptyOrRows(rows);
    return data;
}

async function dbcreate(item) {
    const result = await db.query(
        `INSERT INTO annotations (id, label, description, svg, class, publish) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            item.id, item.label, item.description, item.svg, item.class, item.publish
        ]
    );
    let status = "err";
    let message = 'Error in creating annotation';
    if (result.affectedRows) {
        status = "ok";
        message = 'Annotation created successfully';
    }
    return { status, message };
}

async function dbupdate(id, item) {
    const result = await db.query(
        `UPDATE annotations SET label=?, description=?, svg=?, class=?, publish=? WHERE id=?`,
        [
            item.label, item.description, item.svg, item.class, item.publish, id
        ]
    );
    let status = "err";
    let message = 'Error in updating annotation';
    if (result.affectedRows) {
        status = "ok";
        message = 'Annotation updated successfully';
    }
    return { status, message };
}

async function dbdelete(id) {
    const result = await db.query(
        `DELETE FROM annotations WHERE id=?`,
        [id]
    );
    let status = "err";
    let message = 'Error in deleting annotation';
    if (result.affectedRows) {
        status = "ok";
        message = 'Annotation deleted successfully';
    }
    return { status, message };
}

// Routing

const express = require('express');
const router = express.Router();

/* GET annotation */
router.get('/', async function (req, res, next) {
    try {
        res.json(await dbread(req.query.page));
    } catch (err) {
        console.error(`Error while getting annotation`, err.message);
        next(err);
    }
});

/* POST annotation */
router.post('/', async function (req, res, next) {
    try {
        res.json(await dbcreate(req.body));
    } catch (err) {
        console.error(`Error while creating annotation`, err.message);
        next(err);
    }
});

/* PUT annotation */
router.put('/:id', async function (req, res, next) {
    try {
        res.json(await dbupdate(req.params.id, req.body));
    } catch (err) {
        console.error(`Error while updating annotation`, err.message);
        next(err);
    }
});

/* DELETE annotation */
router.delete('/:id', async function (req, res, next) {
    try {
        res.json(await dbdelete(req.params.id));
    } catch (err) {
        console.error(`Error while deleting annotation`, err.message);
        next(err);
    }
});

module.exports = router;