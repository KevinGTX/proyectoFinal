const express = require('express');
const { getDB, dbGet, dbAll, dbRun } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/usuarios/:id
router.get('/:id', authMiddleware, async (req, res) => {
    const db = getDB();
    try {
        const usuario = await dbGet(db, 'SELECT id, nombre, email, rol_activo, rating, total_ratings, creado_en FROM usuarios WHERE id = ?', [req.params.id]);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

        const materias = await dbAll(db, 'SELECT id, materia, modalidad, horarios FROM materias_asesor WHERE usuario_id = ?', [req.params.id]);
        res.json({ ...usuario, materias });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/usuarios/:id
router.put('/:id', authMiddleware, async (req, res) => {
    if (parseInt(req.params.id) !== req.usuario.id)
        return res.status(403).json({ error: 'Solo puedes editar tu propio perfil' });

    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

    const db = getDB();
    try {
        await dbRun(db, 'UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre, req.usuario.id]);
        const actualizado = await dbGet(db, 'SELECT id, nombre, email, rol_activo, rating FROM usuarios WHERE id = ?', [req.usuario.id]);
        res.json({ mensaje: 'Perfil actualizado', usuario: actualizado });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/usuarios/:id/rol
router.patch('/:id/rol', authMiddleware, async (req, res) => {
    if (parseInt(req.params.id) !== req.usuario.id)
        return res.status(403).json({ error: 'No autorizado' });

    const { rol_activo } = req.body;
    if (!['alumno', 'asesor'].includes(rol_activo))
        return res.status(400).json({ error: 'rol_activo debe ser "alumno" o "asesor"' });

    const db = getDB();
    try {
        await dbRun(db, 'UPDATE usuarios SET rol_activo = ? WHERE id = ?', [rol_activo, req.usuario.id]);
        res.json({ mensaje: `Rol cambiado a ${rol_activo}`, rol_activo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/usuarios/:id/historial
router.get('/:id/historial', authMiddleware, async (req, res) => {
    const db = getDB();
    try {
        const asesorias = await dbAll(db, `
            SELECT a.id, a.materia, a.horario, a.modalidad, a.estado, a.meet_link, a.creado_en,
                   u.id AS asesor_id, u.nombre AS asesor_nombre, u.rating AS asesor_rating,
                   e.estrellas, e.comentario
            FROM asesorias a
            JOIN usuarios u ON u.id = a.asesor_id
            LEFT JOIN evaluaciones e ON e.asesoria_id = a.id AND e.evaluador_id = a.alumno_id
            WHERE a.alumno_id = ?
            ORDER BY a.creado_en DESC
        `, [req.params.id]);
        res.json({ historial: asesorias });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
