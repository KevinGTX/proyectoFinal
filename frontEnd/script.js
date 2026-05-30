const API_URL = 'https://proyectofinal-production-49e7.up.railway.app/api';

// =============================================
// 1. HELPERS DE AUTH Y FETCH
// =============================================

function getToken() {
    return localStorage.getItem('token');
}

function getUsuario() {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
}

function guardarSesion(token, usuario) {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
}

function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
}

/**
 * Fetch autenticado: agrega el token JWT en cada petición.
 */
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'Error en la petición');
    }

    return data;
}

// =============================================
// 2. NAVEGACIÓN
// =============================================

let historyStack = [];
const navbar = document.getElementById('navbar');

function navigateTo(targetViewId) {
    const currentView = document.querySelector('.view.active');
    if (currentView) {
        historyStack.push(currentView.id);
        currentView.classList.remove('active');
    }
    document.getElementById(targetViewId).classList.add('active');
    navbar.classList.toggle('hidden', targetViewId === 'view-login');

    // Cargar datos al entrar a ciertas vistas
    if (targetViewId === 'view-mis-asesorias') listarAsesorias();
    if (targetViewId === 'view-dashboard') actualizarDashboard();
    if (targetViewId === 'view-buscar-asesores') buscarAsesores();
}

document.getElementById('btn-back').addEventListener('click', () => {
    if (historyStack.length > 0) {
        const previousViewId = historyStack.pop();
        document.querySelector('.view.active').classList.remove('active');
        document.getElementById(previousViewId).classList.add('active');
        navbar.classList.toggle('hidden', previousViewId === 'view-login');
        if (previousViewId === 'view-login') historyStack = [];
    }
});

document.getElementById('btn-home').addEventListener('click', () => {
    historyStack = [];
    navigateTo('view-dashboard');
});

document.getElementById('btn-logout').addEventListener('click', () => {
    cerrarSesion();
    historyStack = [];
    document.querySelector('.view.active').classList.remove('active');
    document.getElementById('view-login').classList.add('active');
    navbar.classList.add('hidden');
    mostrarMensajeLogin('');
});

// =============================================
// 3. LOGIN / REGISTER
// =============================================

function mostrarMensajeLogin(msg, esError = false) {
    let el = document.getElementById('login-mensaje');
    if (!el) {
        el = document.createElement('p');
        el.id = 'login-mensaje';
        el.style.cssText = 'text-align:center; margin-top:10px; font-weight:bold;';
        document.querySelector('.login-box').appendChild(el);
    }
    el.style.color = esError ? '#e74c3c' : '#27ae60';
    el.textContent = msg;
}

document.getElementById('btn-login-submit').addEventListener('click', async () => {
    const inputs = document.querySelectorAll('#view-login .input-field');
    const email    = inputs[0].value.trim();
    const password = inputs[1].value.trim();

    if (!email || !password) {
        mostrarMensajeLogin('Por favor ingresa tu correo y contraseña.', true);
        return;
    }

    try {
        mostrarMensajeLogin('Iniciando sesión...');
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        guardarSesion(data.token, data.usuario);
        inputs[0].value = '';
        inputs[1].value = '';
        mostrarMensajeLogin('');
        historyStack = [];
        navigateTo('view-dashboard');

    } catch (err) {
        mostrarMensajeLogin(err.message, true);
    }
});

// =============================================
// REGISTRO DE USUARIO
// =============================================
document.getElementById('btn-register-submit').addEventListener('click', async () => {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const errorDiv = document.getElementById('reg-error');

    // Limpiamos errores previos
    errorDiv.style.display = 'none';

    if (!nombre || !email || !password) {
        errorDiv.textContent = 'Por favor, llena todos los campos.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        // Reutilizamos tu función apiFetch para mantener todo limpio
        await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ nombre, email, password })
        });

        alert('¡Cuenta creada con éxito! Ya puedes iniciar sesión.');
        
        // Limpiamos los campos
        document.getElementById('reg-nombre').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        
        // Mandamos al usuario al login usando tu propia función de navegación
        navigateTo('view-login'); 

    } catch (err) {
        // Si el correo ya existe, apiFetch atrapará el error y lo mostraremos aquí
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
    }
});

// =============================================
// 4. DASHBOARD — muestra nombre del usuario
// =============================================

function actualizarDashboard() {
    const usuario = getUsuario();
    if (!usuario) return;

    let saludo = document.getElementById('dashboard-saludo');
    if (!saludo) {
        saludo = document.createElement('p');
        saludo.id = 'dashboard-saludo';
        saludo.style.cssText = 'text-align:center; color:#555; margin-bottom: 10px;';
        document.querySelector('#view-dashboard h2').insertAdjacentElement('afterend', saludo);
    }
    saludo.textContent = `Hola, ${usuario.nombre} ⭐ Rating: ${usuario.rating || 0}`;
}

// =============================================
// 5. BUSCAR ASESORES
// =============================================

// =============================================
// 5. BUSCAR ASESORES
// =============================================

async function buscarAsesores() {
    // Obtenemos los valores de los nuevos elementos del HTML
    const materia = document.getElementById('buscar-materia')?.value.trim() || '';
    const nombre = document.getElementById('buscar-nombre')?.value.trim() || '';
    const ordenar = document.getElementById('buscar-ordenar')?.value || 'rating';
    const res = document.getElementById('resultados-busqueda');

    res.innerHTML = '<p>Buscando asesores disponibles...</p>';

    try {
        // Construimos los parámetros URL dinámicamente usando URLSearchParams
        const params = new URLSearchParams();
        if (materia) params.append('materia', materia);
        if (nombre) params.append('nombre', nombre);
        params.append('ordenar', ordenar);

        // Petición limpia gracias a tu apiFetch
        const data = await apiFetch(`/asesores?${params.toString()}`);

        if (data.asesores.length === 0) {
            res.innerHTML = '<p class="placeholder-text">No se encontraron asesores con los filtros seleccionados.</p>';
            return;
                }

        res.innerHTML = '';
        data.asesores.forEach(asesor => {
            const estrellas = '⭐'.repeat(Math.round(asesor.rating)) || '—';
            const div = document.createElement('div');
            div.className = 'info-box';
            div.style.marginTop = '15px';
           div.innerHTML = `
                <p><strong>${asesor.nombre}</strong> ${estrellas} (${asesor.rating || 0})</p>
                <p><strong>Materias:</strong> ${asesor.materias || 'No especificadas'}</p>
                <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
                    <button class="btn-primary" style="margin-top:0;"
                        onclick="abrirModalAsesoria(${asesor.id}, '${asesor.nombre.replace(/'/g, "\\'")}', '${(asesor.materias || '').replace(/'/g, "\\'")}')">
                        Agendar Asesoría
                    </button>
                    <button class="btn-secondary" style="margin-top:0; background-color:#e9ecef; color:#333;"
                        onclick="abrirModalResenas(${asesor.id}, '${asesor.nombre.replace(/'/g, "\\'")}')">
                        💬 Ver Reseñas
                    </button>
                </div>
            `;
            res.appendChild(div);
        });

    } catch (err) {
        res.innerHTML = `<p style="color:#e74c3c;">Error: ${err.message}</p>`;
    }
}

// =============================================
// MODAL — VER RESEÑAS DEL ASESOR
// =============================================
async function abrirModalResenas(asesorId, asesorNombre) {
    // Eliminamos modales previos para que no se encimen
    const previo = document.getElementById('modal-resenas');
    if (previo) previo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-resenas';
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center; z-index:1000;
    `;

    // Armamos el cascarón mientras cargan los datos
    modal.innerHTML = `
        <div style="background:#fff; border-radius:12px; padding:30px; width:90%; max-width:450px; max-height:80vh; display:flex; flex-direction:column;">
            <h3 style="margin-bottom:15px; border-bottom:2px solid #f1f1f1; padding-bottom:10px;">
                Reseñas de ${asesorNombre}
            </h3>
            <div id="contenedor-resenas" style="flex:1; overflow-y:auto; margin-bottom:15px; padding-right:10px;">
                <p style="text-align:center; color:#888;">Cargando comentarios...</p>
            </div>
            <button class="btn-logout" style="width:auto; padding:8px 16px; align-self:flex-end; margin-top:0;"
                onclick="document.getElementById('modal-resenas').remove()">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);

    try {
        const data = await apiFetch(`/evaluaciones/usuario/${asesorId}`);
        const contenedor = document.getElementById('contenedor-resenas');

        if (data.resenas.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; color:#888; font-style:italic;">Aún no hay comentarios escritos para este asesor.</p>';
            return;
        }

        contenedor.innerHTML = '';
        data.resenas.forEach(r => {
            const estrellasTxt = '⭐'.repeat(r.estrellas);
            // Formateamos la fecha para que se lea fácil (ej. 25/5/2026)
            const fechaTxt = new Date(r.creado_en).toLocaleDateString(); 
            
            contenedor.innerHTML += `
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:12px; border:1px solid #e9ecef;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <strong style="color:#2c3e50;">${r.autor}</strong>
                        <span>${estrellasTxt}</span>
                    </div>
                    <p style="font-size:0.95em; color:#444; margin:0; line-height:1.4;">"${r.comentario}"</p>
                    <small style="color:#adb5bd; font-size:0.8em; display:block; margin-top:8px; text-align:right;">${fechaTxt}</small>
                </div>
            `;
        });

    } catch (err) {
        document.getElementById('contenedor-resenas').innerHTML = `<p style="color:#e74c3c;">Error: ${err.message}</p>`;
    }
}


// Conecta el boton para cuando se quiera filtrar manualmente
document.addEventListener('DOMContentLoaded', () => {
    const btnBuscar = document.getElementById('btn-api-buscar');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', buscarAsesores);
    }
});

// =============================================
// 6. MODAL — AGENDAR ASESORÍA
// =============================================

function abrirModalAsesoria(asesorId, asesorNombre, materias) {
    // Eliminar modal previo si existe
    const previo = document.getElementById('modal-asesoria');
    if (previo) previo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-asesoria';
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center; z-index:1000;
    `;

    const materiasOpciones = materias
        .split(', ')
        .map(m => `<option value="${m}">${m}</option>`)
        .join('');

    modal.innerHTML = `
        <div style="background:#fff; border-radius:12px; padding:30px; width:90%; max-width:400px;">
            <h3 style="margin-bottom:15px;">Agendar con ${asesorNombre}</h3>

            <label>Materia</label>
            <select id="modal-materia" class="input-field" style="margin-bottom:10px;">
                ${materiasOpciones}
            </select>

            <label>Horario</label>
            <input id="modal-horario" type="text" placeholder="Ej: Lunes 10:00 AM"
                class="input-field" style="margin-bottom:10px;">

            <label>Modalidad</label>
            <select id="modal-modalidad" class="input-field" style="margin-bottom:10px;" onchange="toggleMeetLink(this.value)">
                <option value="presencial">Presencial</option>
                <option value="online">Online (Meet)</option>
            </select>

            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn-primary" style="margin-top:0;"
                    onclick="confirmarAsesoria(${asesorId})">Confirmar</button>
                <button class="btn-logout" style="margin-top:0; width:auto; padding:8px 16px;"
                    onclick="document.getElementById('modal-asesoria').remove()">Cancelar</button>
            </div>

            <p id="modal-error" style="color:#e74c3c; margin-top:10px; display:none;"></p>
        </div>
    `;

    document.body.appendChild(modal);
}

function toggleMeetLink(modalidad) {
    const container = document.getElementById('modal-meet-container');
    container.style.display = modalidad === 'online' ? 'block' : 'none';
}

async function confirmarAsesoria(asesorId) {
    const materia   = document.getElementById('modal-materia').value;
    const horario   = document.getElementById('modal-horario').value.trim();
    const modalidad = document.getElementById('modal-modalidad').value;
    const errorEl   = document.getElementById('modal-error');

    if (!horario) {
        errorEl.textContent = 'Por favor ingresa un horario.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        await apiFetch('/asesorias', {
            method: 'POST',
            body: JSON.stringify({ asesor_id: asesorId, materia, horario, modalidad })
        });

        document.getElementById('modal-asesoria').remove();
        alert('¡Asesoría solicitada con éxito! Espera a que el asesor la confirme.');
        navigateTo('view-mis-asesorias');

    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
}

// =============================================
// 7. MIS ASESORÍAS (CRUD)
// =============================================

async function listarAsesorias() {
    const contenedor = document.getElementById('contenedor-asesorias');
    contenedor.innerHTML = '<p>Cargando asesorías...</p>';

    try {
        const data = await apiFetch('/asesorias?rol=alumno');
        const asesorias = data.asesorias;

        if (asesorias.length === 0) {
            contenedor.innerHTML = '<p class="placeholder-text">No tienes asesorías programadas.</p>';
            return;
        }

        contenedor.innerHTML = '';
        asesorias.forEach(a => {
            const iconoEstado   = { pendiente: '⏳', confirmada: '✅', cancelada: '❌', finalizada: '🏁' }[a.estado] || '⏳';
            const iconoMod      = a.modalidad === 'online' ? '💻' : '📍';
            const meetBtn = a.modalidad === 'online' && a.meet_link && a.estado === 'confirmada'
                ? `<a href="${a.meet_link}" target="_blank" class="btn-primary" style="padding:8px; margin-top:0; text-decoration:none;">Unirse al Meet</a>`
                    : '';

            const puedeConfirmar  = a.estado === 'pendiente';
            const puedeFinalizar  = a.estado === 'confirmada';
            const puedeCancelar   = a.estado === 'pendiente' || a.estado === 'confirmada';
            const puedeEvaluar    = a.estado === 'finalizada';

            const div = document.createElement('div');
            div.className = 'info-box';
            div.innerHTML = `
                <p><strong>Asesor:</strong> ${a.asesor_nombre}</p>
                <p><strong>Materia:</strong> ${a.materia}</p>
                <p><strong>Horario:</strong> ${a.horario}</p>
                <p><strong>Modalidad:</strong> ${iconoMod} ${a.modalidad}</p>
                <p><strong>Estado:</strong> ${a.estado} ${iconoEstado}</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:15px;">
                    ${puedeConfirmar ? `<button class="btn-primary" style="padding:8px; margin-top:0;" onclick="cambiarEstado(${a.id}, 'confirmada')">Confirmar</button>` : ''}
                    ${puedeFinalizar ? `<button class="btn-primary" style="padding:8px; margin-top:0;" onclick="cambiarEstado(${a.id}, 'finalizada')">Finalizar</button>` : ''}
                    ${puedeCancelar  ? `<button class="btn-logout" style="padding:8px; margin-top:0; width:auto;" onclick="cambiarEstado(${a.id}, 'cancelada')">Cancelar</button>` : ''}
                    ${puedeEvaluar   ? `<button class="btn-secondary" style="padding:8px; margin-top:0;" onclick="abrirModalEvaluar(${a.id}, ${a.asesor_id}, '${a.asesor_nombre.replace(/'/g, "\\'")}')">⭐ Evaluar</button>` : ''}
                    ${meetBtn}
                </div>
            `;
            contenedor.appendChild(div);
        });

    } catch (err) {
        contenedor.innerHTML = `<p style="color:#e74c3c;">Error al cargar: ${err.message}</p>`;
    }
}

async function cambiarEstado(id, estado) {
    const mensajes = { confirmada: '¿Confirmar esta asesoría?', cancelada: '¿Cancelar esta asesoría?', finalizada: '¿Marcar como finalizada?' };
    if (!confirm(mensajes[estado])) return;

    try {
        await apiFetch(`/asesorias/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado })
        });
        listarAsesorias();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// =============================================
// 8. MODAL — EVALUAR ASESOR
// =============================================

function abrirModalEvaluar(asesoriaId, evaluadoId, evaluadoNombre) {
    const previo = document.getElementById('modal-evaluar');
    if (previo) previo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-evaluar';
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center; z-index:1000;
    `;

    modal.innerHTML = `
        <div style="background:#fff; border-radius:12px; padding:30px; width:90%; max-width:380px;">
            <h3 style="margin-bottom:15px;">Evaluar a ${evaluadoNombre}</h3>

            <label>Estrellas (1 a 5)</label>
            <div id="star-picker" style="display:flex; gap:8px; font-size:28px; cursor:pointer; margin:10px 0;">
                ${[1,2,3,4,5].map(n => `<span data-val="${n}" onclick="seleccionarEstrellas(${n})">☆</span>`).join('')}
            </div>
            <input type="hidden" id="eval-estrellas" value="0">

            <label>Comentario (opcional)</label>
            <textarea id="eval-comentario" rows="3" placeholder="¿Cómo fue la asesoría?"
                style="width:100%; border-radius:8px; border:1px solid #ccc; padding:8px; margin-top:5px; resize:none;"></textarea>

            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn-primary" style="margin-top:0;"
                    onclick="enviarEvaluacion(${asesoriaId}, ${evaluadoId})">Enviar</button>
                <button class="btn-logout" style="margin-top:0; width:auto; padding:8px 16px;"
                    onclick="document.getElementById('modal-evaluar').remove()">Cancelar</button>
            </div>
            <p id="eval-error" style="color:#e74c3c; margin-top:10px; display:none;"></p>
        </div>
    `;

    document.body.appendChild(modal);
}

function seleccionarEstrellas(n) {
    document.getElementById('eval-estrellas').value = n;
    const spans = document.querySelectorAll('#star-picker span');
    spans.forEach((s, i) => { s.textContent = i < n ? '⭐' : '☆'; });
}

async function enviarEvaluacion(asesoriaId, evaluadoId) {
    const estrellas  = parseInt(document.getElementById('eval-estrellas').value);
    const comentario = document.getElementById('eval-comentario').value.trim();
    const errorEl    = document.getElementById('eval-error');

    if (!estrellas) {
        errorEl.textContent = 'Por favor selecciona al menos 1 estrella.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        await apiFetch('/evaluaciones', {
            method: 'POST',
            body: JSON.stringify({ asesoria_id: asesoriaId, evaluado_id: evaluadoId, estrellas, comentario })
        });

        document.getElementById('modal-evaluar').remove();
        alert('¡Evaluación enviada!');
        listarAsesorias();

    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
}

// =============================================
// 9. PANEL ASESOR — Solicitudes recibidas
// =============================================

async function cargarSolicitudesAsesor() {
    const contenedor = document.querySelector('#view-ensenanza .action-grid');
    if (!contenedor) return;

    // Insertar sección de solicitudes debajo del grid
    let seccion = document.getElementById('solicitudes-asesor');
    if (!seccion) {
        seccion = document.createElement('div');
        seccion.id = 'solicitudes-asesor';
        seccion.style.marginTop = '20px';
        document.getElementById('view-ensenanza').appendChild(seccion);
    }

    seccion.innerHTML = '<p>Cargando solicitudes...</p>';

    try {
        const data = await apiFetch('/asesorias?rol=asesor');
        const asesorias = data.asesorias;

        if (asesorias.length === 0) {
            seccion.innerHTML = '<p class="placeholder-text">No tienes solicitudes recibidas.</p>';
            return;
        }

        seccion.innerHTML = '<h3 style="margin-bottom:10px;">Solicitudes recibidas</h3>';
        asesorias.forEach(a => {
            const iconoEstado = { pendiente: '⏳', confirmada: '✅', cancelada: '❌', finalizada: '🏁' }[a.estado] || '⏳';
            const div = document.createElement('div');
            div.className = 'info-box';
            div.style.marginBottom = '12px';
            div.innerHTML = `
                <p><strong>Alumno:</strong> ${a.alumno_nombre}</p>
                <p><strong>Materia:</strong> ${a.materia}</p>
                <p><strong>Horario:</strong> ${a.horario} — ${a.modalidad}</p>
                <p><strong>Estado:</strong> ${a.estado} ${iconoEstado}</p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    ${a.estado === 'pendiente' ? `
                        <button class="btn-primary" style="padding:8px; margin-top:0;" onclick="aceptarAsesoria(${a.id}, '${a.modalidad}')">Aceptar</button>
                        <button class="btn-logout" style="padding:8px; margin-top:0; width:auto;" onclick="cambiarEstado(${a.id}, 'cancelada')">Rechazar</button>
                    ` : ''}
                    ${a.estado === 'confirmada' ? `
                        <button class="btn-primary" style="padding:8px; margin-top:0;" onclick="cambiarEstado(${a.id}, 'finalizada')">Marcar finalizada</button>
                    ` : ''}
                </div>
            `;
            seccion.appendChild(div);
        });

    } catch (err) {
        seccion.innerHTML = `<p style="color:#e74c3c;">Error: ${err.message}</p>`;
    }
}

async function aceptarAsesoria(id, modalidad) {
    let meet_link = null;

    // Si la asesoría es online, obligamos al asesor a poner el link
    if (modalidad === 'online') {
        meet_link = prompt('Esta es una sesión Online. Por favor ingresa el link de Google Meet para el alumno:');
        if (!meet_link) {
            alert('Acción cancelada. Debes ingresar un link para confirmar una sesión online.');
            return; // Detenemos el proceso si no pone el link
        }
    } else {
        // Si es presencial, solo pedimos confirmación normal
        if (!confirm('¿Confirmar esta asesoría presencial?')) return;
    }

    try {
        await apiFetch(`/asesorias/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado: 'confirmada', meet_link }) // Enviamos el link al backend
        });
        cargarSolicitudesAsesor(); // Recargamos la lista
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Conectar botones del panel asesor
document.addEventListener('DOMContentLoaded', () => {
    const btns = document.querySelectorAll('#view-ensenanza .btn-action');
    
    // Botón 1: Materias y Horarios
    if (btns[0]) {
        btns[0].addEventListener('click', () => {
            gestionarMisMaterias(); // 
        });
    }
    
    if (btns[1]) {
        btns[1].addEventListener('click', () => {
            cargarSolicitudesAsesor();
        });
    }
});

// =============================================
// MODAL — AGREGAR MATERIA COMO ASESOR
// =============================================
function abrirModalNuevaMateria() {
    const previo = document.getElementById('modal-materia-nueva');
    if (previo) previo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-materia-nueva';
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center; z-index:1000;
    `;

    modal.innerHTML = `
        <div style="background:#fff; border-radius:12px; padding:30px; width:90%; max-width:400px;">
            <h3 style="margin-bottom:15px;">Ofrecer nueva materia</h3>
            
            <label>Nombre de la Materia</label>
            <input id="nueva-mat-nombre" type="text" placeholder="Ej. Base de Datos" class="input-field" style="margin-bottom:10px;">
            
            <label>Modalidad</label>
            <select id="nueva-mat-mod" class="input-field" style="margin-bottom:10px;">
                <option value="ambas">Ambas (Presencial y Online)</option>
                <option value="presencial">Solo Presencial</option>
                <option value="online">Solo Online</option>
            </select>

            <label>Tus Horarios Disponibles</label>
            <input id="nueva-mat-horarios" type="text" placeholder="Ej. Lunes a Jueves, 4-6 PM" class="input-field" style="margin-bottom:15px;">

            <div style="display:flex; gap:10px;">
                <button class="btn-primary" style="margin-top:0;" onclick="guardarNuevaMateria()">Guardar Materia</button>
                <button class="btn-logout" style="margin-top:0; width:auto; padding:8px 16px;" onclick="document.getElementById('modal-materia-nueva').remove()">Cancelar</button>
            </div>
            <p id="materia-error" style="color:#e74c3c; margin-top:10px; display:none;"></p>
        </div>
    `;
    document.body.appendChild(modal);
}

async function guardarNuevaMateria() {
    const materia = document.getElementById('nueva-mat-nombre').value.trim();
    const modalidad = document.getElementById('nueva-mat-mod').value;
    const horarios = document.getElementById('nueva-mat-horarios').value.trim();
    const errorEl = document.getElementById('materia-error');

    if (!materia || !horarios) {
        errorEl.textContent = 'La materia y los horarios son obligatorios.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        // Hacemos el POST 
        await apiFetch('/asesores/materias', {
            method: 'POST',
            body: JSON.stringify({ materia, modalidad, horarios })
        });

        document.getElementById('modal-materia-nueva').remove();
        
        // Refresca el gestor de materias para ver la nueva en la lista
        const gestorPrevio = document.getElementById('modal-gestor-materias');
        if (gestorPrevio) gestorPrevio.remove();
        gestionarMisMaterias();
        
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
}

// =============================================
// GESTION DE MATERIAS DEL ASESOR (LISTAR, EDITAR Y ELIMINAR)
// =============================================

async function gestionarMisMaterias() {
    const previo = document.getElementById('modal-gestor-materias');
    if (previo) previo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-gestor-materias';
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center; z-index:1000;
    `;

    modal.innerHTML = `
        <div style="background:#fff; border-radius:12px; padding:30px; width:90%; max-width:500px; max-height:80vh; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #f1f1f1; padding-bottom:10px;">
                <h3 style="margin:0;">Mis Materias Ofrecidas</h3>
                <button class="btn-primary" style="margin:0; width:auto; padding:6px 12px; font-size:0.9em;" onclick="abrirModalNuevaMateria()">+ Agregar</button>
            </div>
            
            <div id="lista-mis-materias" style="flex:1; overflow-y:auto; margin-bottom:15px; padding-right:10px;">
                <p style="text-align:center; color:#888;">Cargando tus materias...</p>
            </div>
            
            <button class="btn-logout" style="width:auto; padding:8px 16px; align-self:flex-end; margin-top:0;"
                onclick="document.getElementById('modal-gestor-materias').remove()">Cerrar Panel</button>
        </div>
    `;
    document.body.appendChild(modal);
    cargarListaMaterias();
}

async function cargarListaMaterias() {
    const contenedor = document.getElementById('lista-mis-materias');
    if (!contenedor) return;

    try {
        const usuario = getUsuario();
        // Llamamos a tu ruta GET que ya tenías en tu backend
        const data = await apiFetch(`/asesores/${usuario.id}/materias`);
        
        if (data.materias.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; color:#888; font-style:italic;">No tienes materias registradas. ¡Agrega una!</p>';
            return;
        }

        contenedor.innerHTML = '';
        data.materias.forEach(m => {
            contenedor.innerHTML += `
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #e9ecef;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong style="color:#2c3e50; font-size:1.1em;">${m.materia}</strong>
                        <span style="font-size:0.85em; background:#e2e8f0; padding:2px 8px; border-radius:12px;">${m.modalidad}</span>
                    </div>
                    <p style="font-size:0.9em; color:#555; margin:5px 0;"><strong>Horarios:</strong> ${m.horarios}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-secondary" style="padding:4px 8px; font-size:0.8em; margin:0; flex:1;" 
                            onclick="abrirModalEditarMateria(${m.id}, '${m.materia.replace(/'/g, "\\'")}', '${m.modalidad}', '${m.horarios.replace(/'/g, "\\'")}')">✏️ Editar</button>
                        <button class="btn-logout" style="padding:4px 8px; font-size:0.8em; margin:0; flex:1; width:auto;" 
                            onclick="eliminarMateria(${m.id})">🗑️ Eliminar</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        contenedor.innerHTML = `<p style="color:#e74c3c; text-align:center;">Error: ${err.message}</p>`;
    }
}

async function eliminarMateria(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta materia? Ya no aparecerás en las búsquedas para ella.')) return;
    try {
        // Llamamos a tu ruta DELETE
        await apiFetch(`/asesores/materias/${id}`, { method: 'DELETE' });
        cargarListaMaterias(); // Recargamos la lista automáticamente
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}

function abrirModalEditarMateria(id, nombreAct, modAct, horAct) {
    // Cerramos el gestor un momento para no amontonar ventanas
    document.getElementById('modal-gestor-materias').remove();

    const modal = document.createElement('div');
    modal.id = 'modal-editar-materia';
    modal.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;`;

    modal.innerHTML = `
        <div style="background:#fff; border-radius:12px; padding:30px; width:90%; max-width:400px;">
            <h3 style="margin-bottom:15px;">Editar Materia</h3>
            
            <label>Nombre de la Materia</label>
            <input id="edit-mat-nombre" type="text" value="${nombreAct}" class="input-field" style="margin-bottom:10px;">
            
            <label>Modalidad</label>
            <select id="edit-mat-mod" class="input-field" style="margin-bottom:10px;">
                <option value="ambas" ${modAct === 'ambas' ? 'selected' : ''}>Ambas (Presencial y Online)</option>
                <option value="presencial" ${modAct === 'presencial' ? 'selected' : ''}>Solo Presencial</option>
                <option value="online" ${modAct === 'online' ? 'selected' : ''}>Solo Online</option>
            </select>

            <label>Tus Horarios Disponibles</label>
            <input id="edit-mat-horarios" type="text" value="${horAct}" class="input-field" style="margin-bottom:15px;">

            <div style="display:flex; gap:10px;">
                <button class="btn-primary" style="margin-top:0;" onclick="guardarEdicionMateria(${id})">Actualizar</button>
                <button class="btn-logout" style="margin-top:0; width:auto; padding:8px 16px;" onclick="document.getElementById('modal-editar-materia').remove(); gestionarMisMaterias();">Cancelar</button>
            </div>
            <p id="edit-materia-error" style="color:#e74c3c; margin-top:10px; display:none;"></p>
        </div>
    `;
    document.body.appendChild(modal);
}

async function guardarEdicionMateria(id) {
    const materia = document.getElementById('edit-mat-nombre').value.trim();
    const modalidad = document.getElementById('edit-mat-mod').value;
    const horarios = document.getElementById('edit-mat-horarios').value.trim();
    const errorEl = document.getElementById('edit-materia-error');

    if (!materia || !horarios) {
        errorEl.textContent = 'La materia y los horarios son obligatorios.';
        errorEl.style.display = 'block'; return;
    }

    try {
        // Llamamos a tu ruta PUT
        await apiFetch(`/asesores/materias/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ materia, modalidad, horarios })
        });
        document.getElementById('modal-editar-materia').remove();
        gestionarMisMaterias(); // Volvemos a abrir la lista actualizada
    } catch (err) {
        errorEl.textContent = err.message; errorEl.style.display = 'block';
    }
}

// =============================================
// 10. INIT
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Si ya hay sesión activa, ir directo al dashboard
    const token   = getToken();
    const usuario = getUsuario();

    if (token && usuario) {
        navigateTo('view-dashboard');
    }
});
