const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'asesorias.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre      TEXT    NOT NULL,
            email       TEXT    NOT NULL UNIQUE,
            password    TEXT    NOT NULL,
            rol_activo  TEXT    NOT NULL DEFAULT 'alumno' CHECK(rol_activo IN ('alumno', 'asesor')),
            rating      REAL    NOT NULL DEFAULT 0.0,
            total_ratings INTEGER NOT NULL DEFAULT 0,
            creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS materias_asesor (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            materia     TEXT    NOT NULL,
            modalidad   TEXT    NOT NULL DEFAULT 'ambas' CHECK(modalidad IN ('presencial', 'online', 'ambas')),
            horarios    TEXT,
            creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS asesorias (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            alumno_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            asesor_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            materia     TEXT    NOT NULL,
            horario     TEXT    NOT NULL,
            modalidad   TEXT    NOT NULL CHECK(modalidad IN ('presencial', 'online')),
            meet_link   TEXT,
            estado      TEXT    NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'confirmada', 'cancelada', 'finalizada')),
            creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS evaluaciones (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            asesoria_id     INTEGER NOT NULL REFERENCES asesorias(id) ON DELETE CASCADE,
            evaluador_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            evaluado_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            estrellas       INTEGER NOT NULL CHECK(estrellas BETWEEN 1 AND 5),
            comentario      TEXT,
            creado_en       TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(asesoria_id, evaluador_id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error al crear tablas:', err.message);
        } else {
            console.log('✅ Base de datos inicializada correctamente en:', DB_PATH);
        }
        db.close();
    });
});
