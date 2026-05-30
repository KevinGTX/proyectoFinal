const express = require('express');
const cors = require('cors');
const path = require('path');

// Rutas
const authRoutes        = require('./routes/auth');
const usuariosRoutes    = require('./routes/usuarios');
const asesoresRoutes    = require('./routes/asesores');
const asesoriasRoutes   = require('./routes/asesorias');
const evaluacionesRoutes = require('./routes/evaluaciones');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// MIDDLEWARES GLOBALES
// =============================================
app.use(cors({
    origin: '*', // En producción cambia esto a tu dominio
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// =============================================
// RUTAS
// =============================================
app.use('/api/auth',         authRoutes);
app.use('/api/usuarios',     usuariosRoutes);
app.use('/api/asesores',     asesoresRoutes);
app.use('/api/asesorias',    asesoriasRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: `Ruta ${req.method} ${req.path} no encontrada` });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('❌ Error no manejado:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   POST   /api/auth/register`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/usuarios/:id`);
    console.log(`   PUT    /api/usuarios/:id`);
    console.log(`   PATCH  /api/usuarios/:id/rol`);
    console.log(`   GET    /api/usuarios/:id/historial`);
    console.log(`   GET    /api/asesores`);
    console.log(`   GET    /api/asesores/:id/materias`);
    console.log(`   POST   /api/asesores/materias`);
    console.log(`   PUT    /api/asesores/materias/:id`);
    console.log(`   DELETE /api/asesores/materias/:id`);
    console.log(`   GET    /api/asesorias`);
    console.log(`   GET    /api/asesorias/:id`);
    console.log(`   POST   /api/asesorias`);
    console.log(`   PATCH  /api/asesorias/:id/estado`);
    console.log(`   DELETE /api/asesorias/:id`);
    console.log(`   POST   /api/evaluaciones`);
    console.log(`   GET    /api/evaluaciones/usuario/:id`);
});

module.exports = app;
