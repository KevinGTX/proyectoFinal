const express = require('express');
const { getDB, dbGet, dbAll, dbRun } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/asesores
router.get('/', authMiddleware, async (req, res) => {
    // Agregamos 'nombre' y 'ordenar' a los parámetros que acepta tu servidor
    const { materia, modalidad, nombre, ordenar } = req.query;
    const db = getDB();

    let sql = `
        SELECT u.id, u.nombre, u.email, u.rating, u.total_ratings,
               GROUP_CONCAT(ma.materia, ', ') AS materias
        FROM usuarios u
        JOIN materias_asesor ma ON ma.usuario_id = u.id
        WHERE 1=1
    `;
    const params = [];

    // Filtros dinámicos
    if (materia) { sql += ` AND ma.materia LIKE ?`; params.push(`%${materia}%`); }
    if (nombre) { sql += ` AND u.nombre LIKE ?`; params.push(`%${nombre}%`); }
    if (modalidad) { sql += ` AND (ma.modalidad = ? OR ma.modalidad = 'ambas')`; params.push(modalidad); }
    
    sql += ` GROUP BY u.id`;

    // Aplicamos el orden lógico que elija el alumno
    if (ordenar === 'nombre') {
        sql += ` ORDER BY u.nombre ASC`; // Orden alfabético A-Z
    } else {
        sql += ` ORDER BY u.rating DESC`; // Por defecto: mayor calificación primero
    }

    try {
        const asesores = await dbAll(db, sql, params);
        res.json({ asesores });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/asesores/:id/materias
router.get('/:id/materias', authMiddleware, async (req, res) => {
    const db = getDB();
    try {
        const materias = await dbAll(db, 'SELECT id, materia, modalidad, horarios FROM materias_asesor WHERE usuario_id = ?', [req.params.id]);
        res.json({ materias });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/asesores/materias
router.post('/materias', authMiddleware, async (req, res) => {
    // Recibimos los datos del modal. 'horarios' ahora viene como texto plano.
    const { materia, modalidad = 'ambas', horarios } = req.body;
    
    if (!materia || !horarios) return res.status(400).json({ error: 'La materia y horarios son requeridos' });

    const db = getDB();
    try {
        // Usamos req.usuario.id por seguridad (viene de tu authMiddleware)
        const result = await dbRun(
            db, 
            'INSERT INTO materias_asesor (usuario_id, materia, modalidad, horarios) VALUES (?, ?, ?, ?)', 
            [req.usuario.id, materia, modalidad, horarios]
        );
        
        // Devolvemos la materia recién creada para confirmar
        const nueva = await dbGet(db, 'SELECT * FROM materias_asesor WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json({ mensaje: 'Materia agregada con éxito', materia: nueva });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/asesores/materias/:id
router.put('/materias/:id', authMiddleware, async (req, res) => {
    const db = getDB();
    try {
        const materia = await dbGet(db, 'SELECT * FROM materias_asesor WHERE id = ?', [req.params.id]);
        if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });
        if (materia.usuario_id !== req.usuario.id) return res.status(403).json({ error: 'No autorizado' });

        const { materia: nombre, modalidad, horarios } = req.body;
        await dbRun(db, 'UPDATE materias_asesor SET materia = ?, modalidad = ?, horarios = ? WHERE id = ?', [
            nombre ?? materia.materia,
            modalidad ?? materia.modalidad,
            horarios ? JSON.stringify(horarios) : materia.horarios,
            req.params.id
        ]);
        const actualizada = await dbGet(db, 'SELECT * FROM materias_asesor WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Materia actualizada', materia: actualizada });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/asesores/materias/:id
router.delete('/materias/:id', authMiddleware, async (req, res) => {
    const db = getDB();
    try {
        const materia = await dbGet(db, 'SELECT * FROM materias_asesor WHERE id = ?', [req.params.id]);
        if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });
        if (materia.usuario_id !== req.usuario.id) return res.status(403).json({ error: 'No autorizado' });

        await dbRun(db, 'DELETE FROM materias_asesor WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Materia eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
