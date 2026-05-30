const express = require('express');
const { getDB, dbGet, dbAll, dbRun } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/evaluaciones
router.post('/', authMiddleware, async (req, res) => {
    const { asesoria_id, evaluado_id, estrellas, comentario } = req.body;
    if (!asesoria_id || !evaluado_id || !estrellas)
        return res.status(400).json({ error: 'asesoria_id, evaluado_id y estrellas son requeridos' });
    if (estrellas < 1 || estrellas > 5)
        return res.status(400).json({ error: 'estrellas debe ser entre 1 y 5' });
    if (evaluado_id === req.usuario.id)
        return res.status(400).json({ error: 'No puedes evaluarte a ti mismo' });

    const db = getDB();
    try {
        const asesoria = await dbGet(db, 'SELECT * FROM asesorias WHERE id = ?', [asesoria_id]);
        if (!asesoria) return res.status(404).json({ error: 'Asesoría no encontrada' });
        if (asesoria.estado !== 'finalizada')
            return res.status(400).json({ error: 'Solo puedes evaluar asesorías finalizadas' });

        const esInvolucrado = asesoria.alumno_id === req.usuario.id || asesoria.asesor_id === req.usuario.id;
        if (!esInvolucrado) return res.status(403).json({ error: 'No autorizado' });

        const result = await dbRun(db, 'INSERT INTO evaluaciones (asesoria_id, evaluador_id, evaluado_id, estrellas, comentario) VALUES (?, ?, ?, ?, ?)', [asesoria_id, req.usuario.id, evaluado_id, estrellas, comentario || null]);

        const stats = await dbGet(db, 'SELECT AVG(estrellas) AS promedio, COUNT(*) AS total FROM evaluaciones WHERE evaluado_id = ?', [evaluado_id]);
        await dbRun(db, 'UPDATE usuarios SET rating = ?, total_ratings = ? WHERE id = ?', [Math.round(stats.promedio * 10) / 10, stats.total, evaluado_id]);

        const nueva = await dbGet(db, 'SELECT * FROM evaluaciones WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json({ mensaje: 'Evaluación registrada', evaluacion: nueva, nuevo_rating: stats.promedio });
    } catch (err) {
        if (err.message.includes('UNIQUE'))
            return res.status(409).json({ error: 'Ya evaluaste esta asesoría' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/evaluaciones/usuario/:id
router.get('/usuario/:id', authMiddleware, async (req, res) => {
    const db = getDB();
    try {
        const resenas = await dbAll(db, `
            SELECT e.estrellas, e.comentario, e.creado_en, u.nombre AS autor
            FROM evaluaciones e 
            JOIN usuarios u ON u.id = e.evaluador_id
            WHERE e.evaluado_id = ? AND e.comentario IS NOT NULL AND e.comentario != ''
            ORDER BY e.creado_en DESC
        `, [req.params.id]);
        res.json({ resenas });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;