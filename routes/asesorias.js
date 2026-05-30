const express = require('express');
const { getDB, dbGet, dbAll, dbRun } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/asesorias
router.get('/', authMiddleware, async (req, res) => {
    const db = getDB();
    const { rol } = req.query;
    try {
        let asesorias;
        if (rol === 'asesor') {
            asesorias = await dbAll(db, `
                SELECT a.*, u.nombre AS alumno_nombre, u.rating AS alumno_rating
                FROM asesorias a JOIN usuarios u ON u.id = a.alumno_id
                WHERE a.asesor_id = ? ORDER BY a.creado_en DESC
            `, [req.usuario.id]);
        } else {
            asesorias = await dbAll(db, `
                SELECT a.*, u.nombre AS asesor_nombre, u.rating AS asesor_rating
                FROM asesorias a JOIN usuarios u ON u.id = a.asesor_id
                WHERE a.alumno_id = ? ORDER BY a.creado_en DESC
            `, [req.usuario.id]);
        }
        res.json({ asesorias });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/asesorias/:id
router.get('/:id', authMiddleware, async (req, res) => {
    const db = getDB();
    try {
        const asesoria = await dbGet(db, `
            SELECT a.*, al.nombre AS alumno_nombre, as2.nombre AS asesor_nombre
            FROM asesorias a
            JOIN usuarios al ON al.id = a.alumno_id
            JOIN usuarios as2 ON as2.id = a.asesor_id
            WHERE a.id = ?
        `, [req.params.id]);

        if (!asesoria) return res.status(404).json({ error: 'Asesoría no encontrada' });
        if (asesoria.alumno_id !== req.usuario.id && asesoria.asesor_id !== req.usuario.id)
            return res.status(403).json({ error: 'No autorizado' });

        res.json({ asesoria });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/asesorias
router.post('/', authMiddleware, async (req, res) => {
    const { asesor_id, materia, horario, modalidad, meet_link } = req.body;
    if (!asesor_id || !materia || !horario || !modalidad)
        return res.status(400).json({ error: 'asesor_id, materia, horario y modalidad son requeridos' });
    if (!['presencial', 'online'].includes(modalidad))
        return res.status(400).json({ error: 'modalidad debe ser "presencial" u "online"' });
    if (asesor_id === req.usuario.id)
        return res.status(400).json({ error: 'No puedes agendarte una asesoría contigo mismo' });

    const db = getDB();
    try {
        const asesor = await dbGet(db, 'SELECT id FROM usuarios WHERE id = ?', [asesor_id]);
        if (!asesor) return res.status(404).json({ error: 'Asesor no encontrado' });

        const result = await dbRun(db, 'INSERT INTO asesorias (alumno_id, asesor_id, materia, horario, modalidad, meet_link) VALUES (?, ?, ?, ?, ?, ?)', [req.usuario.id, asesor_id, materia, horario, modalidad, meet_link || null]);
        const nueva = await dbGet(db, 'SELECT * FROM asesorias WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json({ mensaje: 'Asesoría solicitada', asesoria: nueva });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/asesorias/:id/estado
router.patch('/:id/estado', authMiddleware, async (req, res) => {
    const { estado, meet_link } = req.body; 
    
    const estadosValidos = ['confirmada', 'cancelada', 'finalizada'];
    if (!estadosValidos.includes(estado))
        return res.status(400).json({ error: `estado debe ser uno de: ${estadosValidos.join(', ')}` });

    const db = getDB();
    try {
        const asesoria = await dbGet(db, 'SELECT * FROM asesorias WHERE id = ?', [req.params.id]);
        if (!asesoria) return res.status(404).json({ error: 'Asesoría no encontrada' });

        // Tus validaciones de seguridad intactas
        const esAsesor = asesoria.asesor_id === req.usuario.id;
        const esAlumno = asesoria.alumno_id === req.usuario.id;
        
        if (!esAsesor && !esAlumno) return res.status(403).json({ error: 'No autorizado' });
        if (esAlumno && !esAsesor && estado !== 'cancelada')
            return res.status(403).json({ error: 'Como alumno solo puedes cancelar la asesoría' });

        if (meet_link) {
            await dbRun(db, 'UPDATE asesorias SET estado = ?, meet_link = ? WHERE id = ?', [estado, meet_link, req.params.id]);
        } else {
            await dbRun(db, 'UPDATE asesorias SET estado = ? WHERE id = ?', [estado, req.params.id]);
        }
        
        res.json({ mensaje: `Asesoría ${estado}`, estado, meet_link });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/asesorias/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    const db = getDB();
    try {
        const asesoria = await dbGet(db, 'SELECT * FROM asesorias WHERE id = ?', [req.params.id]);
        if (!asesoria) return res.status(404).json({ error: 'Asesoría no encontrada' });
        if (asesoria.alumno_id !== req.usuario.id) return res.status(403).json({ error: 'No autorizado' });
        if (asesoria.estado !== 'pendiente') return res.status(400).json({ error: 'Solo puedes eliminar asesorías pendientes' });

        await dbRun(db, 'DELETE FROM asesorias WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Asesoría eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
