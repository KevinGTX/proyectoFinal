const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'asesorias.db');

// Singleton
let _db = null;

function getDB() {
    if (!_db) {
        _db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) console.error('❌ Error al conectar DB:', err.message);
        });
        _db.run('PRAGMA foreign_keys = ON');
    }
    return _db;
}

// Helpers para usar async/await con sqlite3 (que es callback-based)
function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
        });
    });
}

module.exports = { getDB, dbGet, dbAll, dbRun };
