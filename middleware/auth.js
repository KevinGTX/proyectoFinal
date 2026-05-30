const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'asesorias_secret_2024';

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    if (!token) return res.status(401).json({ error: 'Formato de token inválido' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded; // { id, email, nombre, rol_activo }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = { authMiddleware, JWT_SECRET };
