# Backend - Sistema de Asesorías Académicas

## Instalación (paso a paso)

```bash
# 1. Entrar a la carpeta
cd backend

# 2. Instalar dependencias
npm install

# 3. Crear tu archivo de variables de entorno
cp .env.example .env
# (edita .env y cambia JWT_SECRET por algo seguro)

# 4. Inicializar la base de datos SQLite (crea el archivo asesorias.db)
node database/init.js

# 5. Arrancar el servidor
npm start

# O con recarga automática al guardar cambios:
npm run dev
```

El servidor corre en `http://localhost:3000`

---

## Estructura de archivos

```
backend/
├── server.js                  ← Entrada principal
├── package.json
├── .env.example
├── database/
│   ├── init.js                ← Crea las tablas (ejecutar una sola vez)
│   ├── db.js                  ← Conexión singleton reutilizable
│   └── asesorias.db           ← Se genera automáticamente
├── middleware/
│   └── auth.js                ← Validación de JWT
└── routes/
    ├── auth.js                ← /api/auth/register  /api/auth/login
    ├── usuarios.js            ← /api/usuarios/...
    ├── asesores.js            ← /api/asesores/...
    ├── asesorias.js           ← /api/asesorias/...
    └── evaluaciones.js        ← /api/evaluaciones/...
```

---

## Cómo conectar el frontend

Todas las rutas (excepto login y register) requieren el token JWT en el header:

```js
// Después del login guarda el token:
localStorage.setItem('token', data.token);

// En cada fetch incluye el header:
const token = localStorage.getItem('token');

fetch('http://localhost:3000/api/asesorias', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
```

---

## Resumen de endpoints

### Auth (sin token)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/register | Registrar usuario |
| POST | /api/auth/login | Login, devuelve token |

### Usuarios (con token)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/usuarios/:id | Ver perfil + materias |
| PUT | /api/usuarios/:id | Editar nombre |
| PATCH | /api/usuarios/:id/rol | Cambiar rol (alumno/asesor) |
| GET | /api/usuarios/:id/historial | Historial de asesorías del alumno |

### Asesores (con token)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/asesores | Buscar asesores (?materia=&modalidad=) |
| GET | /api/asesores/:id/materias | Materias de un asesor |
| POST | /api/asesores/materias | Agregar materia al perfil |
| PUT | /api/asesores/materias/:id | Editar materia |
| DELETE | /api/asesores/materias/:id | Eliminar materia |

### Asesorías (con token)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/asesorias | Mis asesorías (?rol=alumno o ?rol=asesor) |
| GET | /api/asesorias/:id | Detalle de una asesoría |
| POST | /api/asesorias | Solicitar asesoría |
| PATCH | /api/asesorias/:id/estado | Confirmar / cancelar / finalizar |
| DELETE | /api/asesorias/:id | Eliminar (solo pendientes) |

### Evaluaciones (con token)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/evaluaciones | Calificar (1-5 estrellas + comentario) |
| GET | /api/evaluaciones/usuario/:id | Ver evaluaciones de un usuario |

---

## Ejemplos de body

### Register
```json
{ "nombre": "Ana López", "email": "ana@mail.com", "password": "123456" }
```

### Crear asesoría
```json
{
  "asesor_id": 2,
  "materia": "Cálculo Diferencial",
  "horario": "Lunes 10:00 AM",
  "modalidad": "online",
  "meet_link": "https://meet.google.com/abc-defg"
}
```

### Cambiar rol
```json
{ "rol_activo": "asesor" }
```

### Evaluar
```json
{
  "asesoria_id": 1,
  "evaluado_id": 2,
  "estrellas": 5,
  "comentario": "Excelente explicación, muy paciente."
}
```
