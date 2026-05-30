const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB, dbGet, dbRun } = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password)
        return res.status(400).json({ error: 'nombre, email y password son requeridos' });

    const db = getDB();
    try {
        const existente = await dbGet(db, 'SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existente) return res.status(409).json({ error: 'El email ya está registrado' });

        const hash = bcrypt.hashSync(password, 10);
        const result = await dbRun(db, 'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, hash]);
        const usuario = await dbGet(db, 'SELECT id, nombre, email, rol_activo, rating FROM usuarios WHERE id = ?', [result.lastInsertRowid]);

        const token = jwt.sign({ id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol_activo: usuario.rol_activo }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ mensaje: 'Usuario registrado', token, usuario });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'email y password son requeridos' });

    const db = getDB();
    try {
        const usuario = await dbGet(db, 'SELECT * FROM usuarios WHERE email = ?', [email]);
        if (!usuario || !bcrypt.compareSync(password, usuario.password))
            return res.status(401).json({ error: 'Credenciales incorrectas' });

        const token = jwt.sign({ id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol_activo: usuario.rol_activo }, JWT_SECRET, { expiresIn: '7d' });
        const { password: _, ...usuarioSinPass } = usuario;
        res.json({ token, usuario: usuarioSinPass });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
