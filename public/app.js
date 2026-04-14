// ==================== INICIALIZACIÓN DE FIREBASE ====================
let db, storage, usuarioActual = null, esAdmin = false, categoriaActual = 'todos', estadoActual = 'todos';
let editandoGastoId = null; // ID del gasto que se está editando
let gastoActualDetalle = null; // Gasto que se está visualizando en el modal de detalle

// Variables globales para sistema de separación de gastos
let categoriaPendientes = 'todos';
let categoriaReportados = 'todos';
let vistaHistorial = 'mes'; // 'mes', 'trimestre', 'anio'
let pestanaComisionActiva = 'pendientes'; // Para el modal de comisiones

// Organizaciones externas que no afectan presupuesto ni viáticos
const ORGANIZACIONES_EXTERNAS = ['meetup', 'pfj', 'area'];

// ==================== GESTIÓN DE INACTIVIDAD ====================
let tiempoInactividad = null;
const TIEMPO_INACTIVIDAD_MS = 10 * 60 * 1000; // 10 minutos de inactividad

function resetearTiempoInactividad() {
  if (tiempoInactividad) {
    clearTimeout(tiempoInactividad);
  }
  
  // Solo configurar el timeout si hay un usuario activo
  if (usuarioActual) {
    tiempoInactividad = setTimeout(() => {
      alert('Tu sesión ha expirado por inactividad. Serás redirigido al inicio de sesión.');
      cerrarSesion();
    }, TIEMPO_INACTIVIDAD_MS);
  }
}

// Eventos que resetean el temporizador de inactividad
function configurarDeteccionInactividad() {
  const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  eventos.forEach(evento => {
    document.addEventListener(evento, resetearTiempoInactividad, true);
  });
}

// Función para cerrar sesión (puede ser llamada desde el timeout o manualmente)
function cerrarSesion() {
  esAdmin = false;
  usuarioActual = null;
  categoriaActual = 'todos';
  
  // Limpiar timeout de inactividad
  if (tiempoInactividad) {
    clearTimeout(tiempoInactividad);
    tiempoInactividad = null;
  }
  
  // Limpiar sesión del localStorage
  localStorage.removeItem('sesionActiva');
  localStorage.removeItem('esAdmin');
  localStorage.removeItem('usuarioActual');
  
  // Resetear UI
  document.getElementById('pin-screen').classList.remove('hidden');
  document.getElementById('pin-input').value = '';
  document.getElementById('btn-panel-admin')?.classList.add('hidden');
  const btnAdminMobile = document.getElementById('btn-panel-admin-mobile');
  if (btnAdminMobile) btnAdminMobile.classList.add('hidden');
  document.getElementById('user-role-badge').innerHTML = '';
  
  // Resetear botón de login
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.innerHTML = '🔑 Verificar PIN';
    loginBtn.disabled = false;
  }
  
  // Limpiar listas
  const listaGastos = document.getElementById('lista-gastos');
  if (listaGastos) listaGastos.innerHTML = '';
  
  mostrarNotificacion('👋 Sesión cerrada', 'success');
}

// ==================== PERSISTENCIA DE ACORDEONES ====================
function guardarEstadoAcordeon(acordeonId, estaExpandido) {
  const estadosGuardados = JSON.parse(localStorage.getItem('estadosAcordeon') || '{}');
  estadosGuardados[acordeonId] = estaExpandido;
  localStorage.setItem('estadosAcordeon', JSON.stringify(estadosGuardados));
}

function obtenerEstadoAcordeon(acordeonId) {
  const estadosGuardados = JSON.parse(localStorage.getItem('estadosAcordeon') || '{}');
  // Por defecto, los acordeones están colapsados (false)
  return estadosGuardados[acordeonId] === true;
}

function limpiarEstadosAcordeon() {
  localStorage.removeItem('estadosAcordeon');
}

// ==================== FUNCIÓN HELPER PARA FECHAS ====================
// Convierte una fecha en formato YYYY-MM-DD a Date object en hora local
function parseFechaLocal(fechaString) {
  if (!fechaString) return new Date();
  const [year, month, day] = fechaString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ==================== TEMA OSCURO / CLARO ====================
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      updateThemeIcons(true);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      updateThemeIcons(false);
    }
  }
  
  function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
      html.setAttribute('data-theme', 'light');
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      updateThemeIcons(false);
    } else {
      html.setAttribute('data-theme', 'dark');
      html.classList.add('dark');
  }
}

function updateThemeIcons(isDark) {
  const iconDesktop = document.getElementById('theme-icon-desktop');
  const textDesktop = document.getElementById('theme-text-desktop');
  const iconMobile = document.getElementById('theme-icon-mobile');
  const textMobile = document.getElementById('theme-text-mobile');
  
  if (isDark) {
    if(iconDesktop) iconDesktop.textContent = '☀️';
    if(textDesktop) textDesktop.textContent = 'Modo Claro';
    if(iconMobile) iconMobile.textContent = '☀️';
    if(textMobile) textMobile.textContent = 'Modo Claro';
  } else {
    if(iconDesktop) iconDesktop.textContent = '🌙';
    if(textDesktop) textDesktop.textContent = 'Modo Oscuro';
    if(iconMobile) iconMobile.textContent = '🌙';
    if(textMobile) textMobile.textContent = 'Modo Oscuro';
  }
}

// ==================== CIERRE AUTOMÁTICO DE SESIÓN ====================
// Limpiar sesión cuando se cierre la ventana o pestaña
window.addEventListener('beforeunload', () => {
  // Limpiar todos los datos de sesión en localStorage
  localStorage.removeItem('sesionActiva');
  localStorage.removeItem('esAdmin');
  localStorage.removeItem('usuarioActual');
});

// Alternativa con pagehide (más confiable en algunos navegadores móviles)
window.addEventListener('pagehide', () => {
  localStorage.removeItem('sesionActiva');
  localStorage.removeItem('esAdmin');
  localStorage.removeItem('usuarioActual');
});

// ==================== SISTEMA DE BÚSQUEDA Y FILTROS AVANZADOS ====================

// Estado de filtros
let filtrosActivos = {
  texto: '',
  fechaDesde: '',
  fechaHasta: '',
  categoria: '',
  estado: '',
  organizacion: ''
};

let gastosOriginales = []; // Cache de todos los gastos
let gastosFiltrados = []; // Gastos después de aplicar filtros

// Abrir modal de búsqueda avanzada
function abrirBusquedaAvanzada() {
  const modal = document.getElementById('modal-busqueda-avanzada');
  if (modal) {
    modal.classList.remove('hidden');
    // Limpiar filtros previos al abrir
    limpiarFiltros();
  }
}

// Cerrar modal de búsqueda avanzada
function cerrarBusquedaAvanzada() {
  const modal = document.getElementById('modal-busqueda-avanzada');
  if (modal) {
    modal.classList.add('hidden');
    // Limpiar filtros al cerrar
    limpiarFiltros();
  }
}

// Aplicar búsqueda avanzada
async function aplicarBusquedaAvanzada() {
  try {
    // Leer valores de los filtros
    filtrosActivos = {
      texto: document.getElementById('busqueda-texto')?.value?.toLowerCase() || '',
      fechaDesde: document.getElementById('filtro-fecha-desde')?.value || '',
      fechaHasta: document.getElementById('filtro-fecha-hasta')?.value || '',
      categoria: document.getElementById('filtro-categoria-avanzado')?.value || '',
      estado: document.getElementById('filtro-estado-avanzado')?.value || '',
      organizacion: document.getElementById('filtro-organizacion')?.value || ''
    };

    // Si no hay filtros activos, ocultar resultados
    const hayFiltros = Object.values(filtrosActivos).some(v => v !== '');
    
    if (!hayFiltros) {
      document.getElementById('resultados-busqueda-avanzada').classList.add('hidden');
      actualizarChipsFiltros();
      return;
    }

    // Obtener todos los gastos si no están en cache
    if (gastosOriginales.length === 0) {
      const gastosSnapshot = await db.collection('gastos').orderBy('fecha', 'desc').get();
      gastosOriginales = [];
      gastosSnapshot.forEach(doc => {
        gastosOriginales.push({ id: doc.id, ...doc.data() });
      });
    }

    // Aplicar filtros
    gastosFiltrados = gastosOriginales.filter(gasto => {
      // Filtro de texto (busca en descripción, categoría, organización, nro recibo)
      if (filtrosActivos.texto) {
        const textoGasto = `${gasto.descripcion} ${gasto.categoria} ${gasto.organizacion} ${gasto.nroRecibo || ''}`.toLowerCase();
        if (!textoGasto.includes(filtrosActivos.texto)) return false;
      }

      // Filtro de fecha desde
      if (filtrosActivos.fechaDesde && gasto.fecha < filtrosActivos.fechaDesde) {
        return false;
      }

      // Filtro de fecha hasta
      if (filtrosActivos.fechaHasta && gasto.fecha > filtrosActivos.fechaHasta) {
        return false;
      }

      // Filtro de categoría
      if (filtrosActivos.categoria && gasto.categoria !== filtrosActivos.categoria) {
        return false;
      }

      // Filtro de estado
      if (filtrosActivos.estado) {
        if (filtrosActivos.estado === 'pendiente' && gasto.registrado) return false;
        if (filtrosActivos.estado === 'registrado' && !gasto.registrado) return false;
      }

      // Filtro de organización
      if (filtrosActivos.organizacion && gasto.organizacion !== filtrosActivos.organizacion) {
        return false;
      }

      return true;
    });

    // Mostrar resultados
    mostrarResultadosBusqueda();
    actualizarChipsFiltros();

  } catch (error) {
    console.error('Error en búsqueda avanzada:', error);
    mostrarNotificacion('❌ Error al aplicar filtros', 'error');
  }
}

// Mostrar resultados de la búsqueda
function mostrarResultadosBusqueda() {
  const containerResultados = document.getElementById('resultados-busqueda-avanzada');
  const countElement = document.getElementById('count-resultados');
  const totalElement = document.getElementById('total-resultados');

  if (gastosFiltrados.length === 0) {
    containerResultados.classList.add('hidden');
    return;
  }

  // Calcular total
  const total = gastosFiltrados.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);

  // Actualizar UI
  countElement.textContent = gastosFiltrados.length;
  totalElement.textContent = `$${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  containerResultados.classList.remove('hidden');

  // Renderizar gastos filtrados en las secciones correspondientes
  renderizarGastosFiltrados();
}

// Renderizar gastos filtrados en las secciones
function renderizarGastosFiltrados() {
  // Separar pendientes y registrados
  const pendientes = gastosFiltrados.filter(g => !g.registrado);
  const registrados = gastosFiltrados.filter(g => g.registrado);

  // Renderizar pendientes
  const listaPendientes = document.getElementById('lista-gastos-pendientes');
  if (listaPendientes) {
    if (pendientes.length === 0) {
      listaPendientes.innerHTML = `
        <div class="text-center text-gray-400 py-8 col-span-full">
          <span class="text-3xl mb-2 block">🔍</span>
          <p class="text-xs lg:text-sm mb-1 font-medium">No hay pendientes con estos filtros</p>
        </div>
      `;
    } else {
      listaPendientes.innerHTML = pendientes.map(crearTarjetaPendiente).join('');
    }
  }

  // Renderizar registrados (historial)
  const listaReportados = document.getElementById('lista-gastos-reportados');
  if (listaReportados) {
    if (registrados.length === 0) {
      listaReportados.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <span class="text-3xl mb-2 block">🔍</span>
          <p class="text-xs lg:text-sm mb-1 font-medium">No hay registrados con estos filtros</p>
        </div>
      `;
    } else {
      listaReportados.innerHTML = registrados.map(crearTarjetaReportado).join('');
    }
  }
}

// Actualizar chips de filtros activos
function actualizarChipsFiltros() {
  const container = document.getElementById('filtros-activos');
  if (!container) return;

  const chips = [];

  // Texto
  if (filtrosActivos.texto) {
    chips.push(`
      <div class="flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
        <span>Texto: "${filtrosActivos.texto}"</span>
        <button onclick="eliminarFiltro('texto')" class="hover:bg-blue-200 rounded-full p-0.5">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `);
  }

  // Fecha
  if (filtrosActivos.fechaDesde || filtrosActivos.fechaHasta) {
    const desde = filtrosActivos.fechaDesde || '...';
    const hasta = filtrosActivos.fechaHasta || '...';
    chips.push(`
      <div class="flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium">
        <span>Fecha: ${desde} → ${hasta}</span>
        <button onclick="eliminarFiltro('fecha')" class="hover:bg-green-200 rounded-full p-0.5">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `);
  }

  // Categoría
  if (filtrosActivos.categoria) {
    chips.push(`
      <div class="flex items-center gap-1.5 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-xs font-medium">
        <span>Categoría: ${filtrosActivos.categoria}</span>
        <button onclick="eliminarFiltro('categoria')" class="hover:bg-purple-200 rounded-full p-0.5">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `);
  }

  // Estado
  if (filtrosActivos.estado) {
    const estadoText = filtrosActivos.estado === 'pendiente' ? 'Sin registrar' : 'Registrado';
    chips.push(`
      <div class="flex items-center gap-1.5 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-xs font-medium">
        <span>Estado: ${estadoText}</span>
        <button onclick="eliminarFiltro('estado')" class="hover:bg-orange-200 rounded-full p-0.5">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `);
  }

  // Organización
  if (filtrosActivos.organizacion) {
    chips.push(`
      <div class="flex items-center gap-1.5 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-xs font-medium">
        <span>Org: ${filtrosActivos.organizacion}</span>
        <button onclick="eliminarFiltro('organizacion')" class="hover:bg-indigo-200 rounded-full p-0.5">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `);
  }

  container.innerHTML = chips.length > 0 ? chips.join('') : '<p class="text-xs text-gray-400 italic">No hay filtros activos</p>';
}

// Eliminar un filtro específico
function eliminarFiltro(tipo) {
  switch(tipo) {
    case 'texto':
      document.getElementById('busqueda-texto').value = '';
      break;
    case 'fecha':
      document.getElementById('filtro-fecha-desde').value = '';
      document.getElementById('filtro-fecha-hasta').value = '';
      break;
    case 'categoria':
      document.getElementById('filtro-categoria-avanzado').value = '';
      break;
    case 'estado':
      document.getElementById('filtro-estado-avanzado').value = '';
      break;
    case 'organizacion':
      document.getElementById('filtro-organizacion').value = '';
      break;
  }
  aplicarBusquedaAvanzada();
}

// Limpiar todos los filtros
function limpiarFiltros() {
  document.getElementById('busqueda-texto').value = '';
  document.getElementById('filtro-fecha-desde').value = '';
  document.getElementById('filtro-fecha-hasta').value = '';
  document.getElementById('filtro-categoria-avanzado').value = '';
  document.getElementById('filtro-estado-avanzado').value = '';
  document.getElementById('filtro-organizacion').value = '';
  
  const resultados = document.getElementById('resultados-busqueda-avanzada');
  if (resultados) resultados.classList.add('hidden');
  
  const filtrosActivosEl = document.getElementById('filtros-activos');
  if (filtrosActivosEl) filtrosActivosEl.innerHTML = '<p class="text-xs text-gray-400 italic">No hay filtros activos</p>';
  
  // Recargar vista normal
  cargarGastosSeparados();
}

// Guardar filtro como favorito
function guardarFiltroFavorito() {
  const nombre = prompt('Nombre para este filtro:');
  if (!nombre) return;

  try {
    const filtrosFavoritos = JSON.parse(localStorage.getItem('filtrosFavoritos') || '[]');
    filtrosFavoritos.push({
      nombre: nombre,
      filtros: { ...filtrosActivos },
      fecha: new Date().toISOString()
    });
    localStorage.setItem('filtrosFavoritos', JSON.stringify(filtrosFavoritos));
    mostrarNotificacion(`✅ Filtro "${nombre}" guardado`, 'success');
  } catch (error) {
    console.error('Error al guardar filtro:', error);
    mostrarNotificacion('❌ Error al guardar filtro', 'error');
  }
}

// Cargar filtros favoritos
function cargarFiltrosFavoritos() {
  try {
    const filtrosFavoritos = JSON.parse(localStorage.getItem('filtrosFavoritos') || '[]');
    
    if (filtrosFavoritos.length === 0) {
      mostrarNotificacion('ℹ️ No tienes filtros guardados', 'info');
      return;
    }

    // Crear menú de selección
    let opciones = '<div class="space-y-2 max-h-96 overflow-y-auto">';
    filtrosFavoritos.forEach((filtro, index) => {
      const fecha = new Date(filtro.fecha).toLocaleDateString('es-AR');
      opciones += `
        <div class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer" onclick="aplicarFiltroFavorito(${index})">
          <div>
            <p class="font-medium text-sm">${filtro.nombre}</p>
            <p class="text-xs text-gray-500">${fecha}</p>
          </div>
          <button onclick="event.stopPropagation(); eliminarFiltroFavorito(${index})" class="text-red-500 hover:text-red-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      `;
    });
    opciones += '</div>';

    // Mostrar en modal simple (puedes mejorar esto con un modal real)
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-6 max-w-md w-full">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">Mis Filtros Guardados</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        ${opciones}
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  } catch (error) {
    console.error('Error al cargar filtros favoritos:', error);
    mostrarNotificacion('❌ Error al cargar filtros', 'error');
  }
}

// Aplicar filtro favorito
function aplicarFiltroFavorito(index) {
  try {
    const filtrosFavoritos = JSON.parse(localStorage.getItem('filtrosFavoritos') || '[]');
    const filtro = filtrosFavoritos[index];
    
    if (!filtro) return;

    // Aplicar valores a los inputs
    document.getElementById('busqueda-texto').value = filtro.filtros.texto || '';
    document.getElementById('filtro-fecha-desde').value = filtro.filtros.fechaDesde || '';
    document.getElementById('filtro-fecha-hasta').value = filtro.filtros.fechaHasta || '';
    document.getElementById('filtro-categoria-avanzado').value = filtro.filtros.categoria || '';
    document.getElementById('filtro-estado-avanzado').value = filtro.filtros.estado || '';
    document.getElementById('filtro-organizacion').value = filtro.filtros.organizacion || '';

    // Cerrar modal y aplicar búsqueda
    document.querySelector('.fixed.inset-0')?.remove();
    aplicarBusquedaAvanzada();
    mostrarNotificacion(`✅ Filtro "${filtro.nombre}" aplicado`, 'success');
  } catch (error) {
    console.error('Error al aplicar filtro favorito:', error);
    mostrarNotificacion('❌ Error al aplicar filtro', 'error');
  }
}

// Eliminar filtro favorito
function eliminarFiltroFavorito(index) {
  if (!confirm('¿Eliminar este filtro guardado?')) return;

  try {
    const filtrosFavoritos = JSON.parse(localStorage.getItem('filtrosFavoritos') || '[]');
    filtrosFavoritos.splice(index, 1);
    localStorage.setItem('filtrosFavoritos', JSON.stringify(filtrosFavoritos));
    
    // Recargar lista
    document.querySelector('.fixed.inset-0')?.remove();
    cargarFiltrosFavoritos();
    mostrarNotificacion('✅ Filtro eliminado', 'success');
  } catch (error) {
    console.error('Error al eliminar filtro:', error);
    mostrarNotificacion('❌ Error al eliminar filtro', 'error');
  }
}

// Exportar resultados a CSV
function exportarResultadosCSV() {
  if (gastosFiltrados.length === 0) {
    mostrarNotificacion('ℹ️ No hay resultados para exportar. Aplica filtros primero.', 'info');
    return;
  }

  try {
    // Crear encabezados CSV
    const headers = [
      'Fecha',
      'Descripción',
      'Categoría',
      'Organización',
      'Monto',
      'Estado',
      'Nro Recibo',
      'Comisión ML',
      'ID'
    ];

    // Crear filas de datos
    const rows = gastosFiltrados.map(gasto => [
      gasto.fecha || '',
      `"${(gasto.descripcion || '').replace(/"/g, '""')}"`, // Escapar comillas
      gasto.categoria || '',
      `"${(gasto.organizacion || '').replace(/"/g, '""')}"`,
      gasto.monto || 0,
      gasto.registrado ? 'Registrado' : 'Sin registrar',
      gasto.nroRecibo || '',
      gasto.comisionML ? 'Sí' : 'No',
      gasto.id || ''
    ]);

    // Combinar en CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Crear Blob y descargar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fecha = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `gastos_filtrados_${fecha}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarNotificacion(`✅ ${gastosFiltrados.length} gastos exportados a CSV`, 'success');
  } catch (error) {
    console.error('Error al exportar CSV:', error);
    mostrarNotificacion('❌ Error al exportar. Intenta de nuevo.', 'error');
  }
}

// ==================== FIN SISTEMA BÚSQUEDA AVANZADA ====================

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar tema
  initTheme();

  try {
    // No loguear firebaseConfig por seguridad
    
    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
    
    // Verificar si hay sesión guardada
    const sesionGuardada = localStorage.getItem('sesionActiva');
    if (sesionGuardada === 'true') {
      esAdmin = localStorage.getItem('esAdmin') === 'true';
      usuarioActual = localStorage.getItem('usuarioActual');
      
      if (usuarioActual) {
        document.getElementById('pin-screen').classList.add('hidden');
        
        if (esAdmin) {
          document.getElementById('btn-panel-admin').classList.remove('hidden');
          const btnAdminMobile = document.getElementById('btn-panel-admin-mobile');
          if (btnAdminMobile) btnAdminMobile.classList.remove('hidden');
          document.getElementById('user-role-badge').innerHTML = '👤 Administrador';
        } else {
          document.getElementById('user-role-badge').innerHTML = '👤 Usuario';
        }
        
        // Iniciar detección de inactividad
        configurarDeteccionInactividad();
        resetearTiempoInactividad();
        
        await cargarPresupuestos();
        await cargarGastosSeparados();
        
        // Verificar y archivar trimestres si es necesario
        if (debeArchivarTrimestreAnterior()) {
          await archivarTrimestreAnterior();
        }
        
        // Cargar trimestres archivados
        await cargarTrimestresArchivados();
      }
    }
    
    // Probar conexión con Firestore
    await db.collection('test').doc('connection').set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      message: 'Conexión exitosa'
    });
    
    // Inicializar configuración del sistema si no existe
    await inicializarConfiguracion();
    
    // Verificar y archivar trimestres si es necesario
    if (usuarioActual && debeArchivarTrimestreAnterior()) {
      await archivarTrimestreAnterior();
    }
    
    // Cargar trimestres archivados
    if (usuarioActual) {
      await cargarTrimestresArchivados();
    }
    
    // Iniciar escucha en tiempo real después de la inicialización
    iniciarEscuchaEnTiempoReal();
    
    // Configurar event listeners después de que todo esté listo
    configurarEventListeners();
    
  } catch (error) {
    console.error('❌ Error detallado:', error);
    console.error('🔍 Código de error:', error.code);
    console.error('💬 Mensaje:', error.message);
    
    // Mostrar error específico según el tipo
    let mensajeError = '❌ Error de conexión. ';
    
    if (error.code === 'permission-denied') {
      mensajeError += 'Verifica las reglas de Firestore.';
    } else if (error.code === 'unavailable') {
      mensajeError += 'Firestore no está disponible. ¿Está habilitado?';
    } else if (error.message.includes('project does not exist')) {
      mensajeError += 'El proyecto no existe. Verifica el Project ID.';
    } else {
      mensajeError += 'Verifica la configuración de Firebase.';
    }
    
    mostrarErrorPIN(mensajeError);
  }
});

// ==================== CONFIGURACIÓN INICIAL ====================
async function inicializarConfiguracion() {
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    
    if (!configDoc.exists) {
      // Crear configuración inicial
      await db.collection('configuracion').doc('sistema').set({
        pinUsuario: '123456',
        pinAdmin: 'admin1',
        presupuestoTotal: 0,
        presupuestoViaticos: 0,
        emailRecuperacion: '',
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error al inicializar configuración:', error);
  }
}

// ==================== FUNCIONES DE PIN ====================
function togglePinVisibility() {
  const pinInput = document.getElementById('pin-input');
  const toggleIcon = document.getElementById('pin-toggle-icon');
  
  if (pinInput.type === 'password') {
    pinInput.type = 'text';
    toggleIcon.textContent = '🙈';
  } else {
    pinInput.type = 'password';
    toggleIcon.textContent = '👁️';
  }
}

function mostrarErrorPIN(mensaje) {
  const errorMsg = document.getElementById('pin-error');
  const loginBtn = document.getElementById('login-btn');
  
  errorMsg.querySelector('p').textContent = '❌ ' + mensaje;
  errorMsg.classList.remove('hidden');
  
  // Restablecer botón
  loginBtn.innerHTML = '<span class="flex items-center justify-center"><span class="mr-2">🚀</span>Ingresar al Sistema</span>';
  loginBtn.disabled = false;
  
  setTimeout(() => {
    errorMsg.classList.add('hidden');
  }, 3000);
}

// ==================== AUTENTICACIÓN ====================
async function validarPIN() {
  const pin = document.getElementById('pin-input').value;
  const errorMsg = document.getElementById('pin-error');
  const loginBtn = document.getElementById('login-btn');

  if (!pin || pin.length < 4) {
    mostrarErrorPIN('Ingresa un PIN de al menos 4 caracteres');
    return;
  }

  // Mostrar estado de carga
  loginBtn.innerHTML = '<span class="flex items-center justify-center"><span class="mr-2">⏳</span>Verificando...</span>';
  loginBtn.disabled = true;

  try {
    // Verificar si Firebase está inicializado
    if (!db) {
      throw new Error('Firebase no está inicializado correctamente');
    }
    
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    
    let config;
    if (!configDoc.exists) {
      config = {
        pinUsuario: '123456',
        pinAdmin: 'admin1',
        presupuestoTotal: 0,
        presupuestoViaticos: 0
      };
      
      // Crear configuración inicial
      await db.collection('configuracion').doc('sistema').set({
        ...config,
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
      });
      
    } else {
      config = configDoc.data();
    }

    // Normalizar datos para comparación segura (convertir a string y quitar espacios)
    const pinIngresado = String(pin).trim();
    const pinAdminGuardado = String(config.pinAdmin || '').trim();
    const pinUsuarioGuardado = String(config.pinUsuario || '').trim();

    if (pinIngresado === pinAdminGuardado) {
      esAdmin = true;
      usuarioActual = 'Administrador';
      
      // Guardar sesión en localStorage
      localStorage.setItem('sesionActiva', 'true');
      localStorage.setItem('esAdmin', 'true');
      localStorage.setItem('usuarioActual', usuarioActual);
      
      document.getElementById('pin-screen').classList.add('hidden');
      document.getElementById('user-role-badge').innerHTML = '<span class="bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold mr-2">👑 ADMIN</span>';
      document.getElementById('btn-panel-admin').classList.remove('hidden');
      const btnAdminMobile = document.getElementById('btn-panel-admin-mobile');
      if (btnAdminMobile) btnAdminMobile.classList.remove('hidden');
      loginBtn.innerHTML = '🔑 Verificar PIN';
      loginBtn.disabled = false;
      
      // Iniciar detección de inactividad
      configurarDeteccionInactividad();
      resetearTiempoInactividad();
      
      mostrarNotificacion('✅ Bienvenido, Administrador', 'success');
      cargarDatos();
    } else if (pinIngresado === pinUsuarioGuardado) {
      esAdmin = false;
      usuarioActual = 'Usuario';
      
      // Guardar sesión en localStorage
      localStorage.setItem('sesionActiva', 'true');
      localStorage.setItem('esAdmin', 'false');
      localStorage.setItem('usuarioActual', usuarioActual);
      
      // Iniciar detección de inactividad
      configurarDeteccionInactividad();
      resetearTiempoInactividad();
      
      document.getElementById('pin-screen').classList.add('hidden');
      document.getElementById('user-role-badge').innerHTML = '<span class="bg-blue-500 text-white px-2 py-1 rounded-lg text-xs font-bold mr-2">👤 USUARIO</span>';
      loginBtn.innerHTML = '🔑 Verificar PIN';
      loginBtn.disabled = false;
      mostrarNotificacion('✅ Bienvenido, Usuario', 'success');
      cargarDatos();
    } else {
      mostrarErrorPIN('PIN incorrecto. Verifica e intenta nuevamente.');
      loginBtn.innerHTML = '🔑 Verificar PIN';
      loginBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error al validar PIN:', error);
    mostrarErrorPIN('Error de conexión. Intenta más tarde.');
    loginBtn.innerHTML = '🔑 Verificar PIN';
    loginBtn.disabled = false;
  }
}

// Permitir Enter para login
document.getElementById('pin-input')?.addEventListener('keypress', function(e) {
  if (e.key === "Enter") validarPIN();
});

// Exponer funciones globales para uso en HTML inline handlers
window.validarPIN = validarPIN;
window.togglePinVisibility = togglePinVisibility;

// Cerrar sesión
document.getElementById('btn-cerrar-sesion')?.addEventListener('click', cerrarSesion);
document.getElementById('btn-cerrar-sesion-mobile')?.addEventListener('click', cerrarSesion);

// Event listeners para el panel de administración
document.getElementById('btn-panel-admin')?.addEventListener('click', mostrarPanelAdmin);
document.getElementById('btn-actualizar-presupuestos')?.addEventListener('click', actualizarPresupuestos);
document.getElementById('btn-actualizar-pines')?.addEventListener('click', actualizarPINs);
document.getElementById('btn-cerrar-panel')?.addEventListener('click', () => {
  document.getElementById('panel-admin').classList.add('hidden');
});

// ==================== CARGAR DATOS ====================
async function cargarDatos() {
  await cargarPresupuestos();
  await cargarGastos();
  await cargarGastosSeparados();
  await calcularEstadisticasDashboard();
}

async function cargarPresupuestos() {
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    if (configDoc.exists) {
      const config = configDoc.data();
      
      // Actualizar presupuesto total
      const presupuestoTotal = config.presupuestoTotal || 0;
      const presupuestoTotalEl = document.getElementById('presupuesto-total');
      if (presupuestoTotalEl) {
        presupuestoTotalEl.textContent = `$${presupuestoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      }
      
      // Actualizar presupuesto viáticos (mostrado en el saldo disponible)
      const presupuestoViaticos = config.presupuestoViaticos || 0;
      
      // Calcular gastos
      await calcularGastos();
    }
  } catch (error) {
    console.error('Error al cargar presupuestos:', error);
  }
}

// ==================== CÁLCULO DE KPIs Y MÉTRICAS ====================
async function calcularGastos() {
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    const config = configDoc.data();
    const presupuestoTotal = config.presupuestoTotal || 0;
    const presupuestoViaticos = config.presupuestoViaticos || 0;

    // Obtener todos los gastos no eliminados
    const gastosSnapshot = await db.collection('gastos')
      .where('eliminado', '==', false)
      .get();
    
    let totalPresupuesto = 0;
    let totalPresupuestoAprobado = 0; // Solo gastos aprobados (descuentan del disponible real)
    let totalViaticos = 0;
    let totalGastosExternos = 0; // Gastos de organizaciones externas
    let totalGastosTrimestre = 0; // Total solo del trimestre actual (aprobados)
    let totalPresupuestoNoAprobado = 0; // Todos los gastos de presupuesto NO aprobados (cualquier trimestre) para simulado

    // Calcular trimestre actual
    const ahora = new Date();
    const mesActual = ahora.getMonth(); // 0-11
    const añoActual = ahora.getFullYear();
    const trimestreActual = Math.floor(mesActual / 3); // 0=Q1, 1=Q2, 2=Q3, 3=Q4
    const mesInicioTrimestre = trimestreActual * 3;
    const mesFinTrimestre = mesInicioTrimestre + 2;
    
    const inicioTrimestre = new Date(añoActual, mesInicioTrimestre, 1);
    const finTrimestre = new Date(añoActual, mesFinTrimestre + 1, 0, 23, 59, 59);

    gastosSnapshot.forEach(doc => {
      const gasto = doc.data();
      const fechaGasto = parseFechaLocal(gasto.fecha);
      const organizacion = gasto.organizacion || '';
      const esAprobado = gasto.aprobado === true;
      
      // Verificar si es una organización externa que no afecta presupuesto/viáticos
      const esOrganizacionExterna = ORGANIZACIONES_EXTERNAS.includes(organizacion);
      
      // Sumar gastos de organizaciones externas por separado
      if (esOrganizacionExterna) {
        totalGastosExternos += gasto.monto || 0;
      } else {
        // Sumar para presupuesto y viáticos según la CATEGORÍA únicamente
        const esAñoActual = fechaGasto.getFullYear() === añoActual;
        const enTrimestre = fechaGasto >= inicioTrimestre && fechaGasto <= finTrimestre;
        
        if (gasto.categoria === 'presupuesto') {
          // Para simulado: todos los gastos de presupuesto NO aprobados (cualquier trimestre)
          if (!esAprobado) {
            totalPresupuestoNoAprobado += gasto.monto || 0;
          }
          if (enTrimestre) {
            totalPresupuesto += gasto.monto || 0;
            if (esAprobado) {
              // Solo aprobados del trimestre descuentan del disponible real
              totalPresupuestoAprobado += gasto.monto || 0;
              totalGastosTrimestre += gasto.monto || 0;
            }
          }
        } else if (gasto.categoria === 'viaticos') {
          // Viáticos usa scope anual (fondo independiente del trimestre)
          if (esAñoActual) {
            totalViaticos += gasto.monto || 0;
          }
        }
      }
    });

    // Total combinado de todos los gastos del trimestre
    const totalGastos = totalGastosTrimestre;

    // ==================== ACTUALIZAR KPI: TOTAL GASTADO (TRIMESTRAL) ====================
    const totalGastadoEl = document.getElementById('total-gastado');
    if (totalGastadoEl) {
      totalGastadoEl.textContent = `-$${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado
      totalGastadoEl.className = totalGastos === 0 ? 'text-xl lg:text-2xl font-bold text-gray-400' : 'text-xl lg:text-2xl font-bold text-red-500';
    }
    
    // Actualizar texto del período trimestral
    const periodoEl = document.getElementById('periodo-total-gastado');
    if (periodoEl) {
      const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const mesInicio = meses[mesInicioTrimestre];
      const mesFin = meses[mesFinTrimestre];
      periodoEl.textContent = `1 ${mesInicio} - 31 ${mesFin} ${añoActual}`;
    }
    
    // ==================== ACTUALIZAR KPI: PRESUPUESTO DISPONIBLE ====================
    // Disponible REAL = solo gastos aprobados por tercero
    const disponibleReal = presupuestoTotal - totalPresupuestoAprobado;
    // Disponible SIMULADO = Disponible Real - todos los gastos de presupuesto no aprobados (pendientes + registrados)
    const disponibleProyectado = disponibleReal - totalPresupuestoNoAprobado;
    
    const presupuestoDisponibleEl = document.getElementById('presupuesto-disponible');
    if (presupuestoDisponibleEl) {
      presupuestoDisponibleEl.textContent = `$${disponibleReal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado del disponible real
      if (disponibleReal < 0) {
        presupuestoDisponibleEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-red-600 leading-tight';
      } else if (disponibleReal < presupuestoTotal * 0.2) {
        presupuestoDisponibleEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-yellow-500 leading-tight';
      } else {
        presupuestoDisponibleEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-green-500 leading-tight';
      }
    }
    
    // Actualizar presupuesto proyectado/simulado (con pendientes)
    const presupuestoProyectadoEl = document.getElementById('presupuesto-proyectado');
    if (presupuestoProyectadoEl) {
      presupuestoProyectadoEl.textContent = `$${disponibleProyectado.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado proyectado
      if (disponibleProyectado < 0) {
        presupuestoProyectadoEl.className = 'text-sm md:text-base text-red-500 mt-2 font-medium';
      } else if (disponibleProyectado < presupuestoTotal * 0.2) {
        presupuestoProyectadoEl.className = 'text-sm md:text-base text-yellow-600 mt-2 font-medium';
      } else {
        presupuestoProyectadoEl.className = 'text-sm md:text-base text-gray-500 mt-2';
      }
    }

    // ==================== ACTUALIZAR PORCENTAJE DE EJECUCIÓN ====================
    const porcentajePresupuesto = presupuestoTotal > 0 ? (totalPresupuesto / presupuestoTotal) * 100 : 0;
    const porcentajeUsadoEl = document.getElementById('porcentaje-usado');
    const barraProgresoEl = document.getElementById('barra-progreso');
    
    if (porcentajeUsadoEl) {
      porcentajeUsadoEl.textContent = `${porcentajePresupuesto.toFixed(1)}%`;
    }
    
    if (barraProgresoEl) {
      barraProgresoEl.style.width = `${Math.min(porcentajePresupuesto, 100)}%`;
      // Colorear barra según nivel de ejecución
      if (porcentajePresupuesto >= 100) {
        barraProgresoEl.className = 'progress-bar h-full bg-red-600 rounded-full';
      } else if (porcentajePresupuesto >= 80) {
        barraProgresoEl.className = 'progress-bar h-full bg-yellow-500 rounded-full';
      } else {
        barraProgresoEl.className = 'progress-bar h-full bg-green-500 rounded-full';
      }
    }

    // ==================== ACTUALIZAR KPI: VIÁTICOS ====================
    const viaticosDisponibles = presupuestoViaticos - totalViaticos;
    const viaticosDisponibleEl = document.getElementById('viaticos-disponible');
    if (viaticosDisponibleEl) {
      viaticosDisponibleEl.textContent = `$${viaticosDisponibles.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado
      if (viaticosDisponibles < 0) {
        viaticosDisponibleEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-red-600 leading-tight';
      } else if (viaticosDisponibles < presupuestoViaticos * 0.2) {
        viaticosDisponibleEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-yellow-500 leading-tight';
      } else {
        viaticosDisponibleEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-purple-500 leading-tight';
      }
    }

    // Actualizar texto de viáticos gastados
    const viaticosGastadosTextoEl = document.getElementById('viaticos-gastados-texto');
    if (viaticosGastadosTextoEl) {
      viaticosGastadosTextoEl.textContent = `Gastado: $${totalViaticos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado
      if (totalViaticos === 0) {
        viaticosGastadosTextoEl.className = 'text-sm md:text-base text-gray-400 mt-2';
      } else if (totalViaticos > presupuestoViaticos * 0.8) {
        viaticosGastadosTextoEl.className = 'text-sm md:text-base text-red-500 mt-2 font-medium';
      } else if (totalViaticos > presupuestoViaticos * 0.5) {
        viaticosGastadosTextoEl.className = 'text-sm md:text-base text-orange-600 mt-2 font-medium';
      } else {
        viaticosGastadosTextoEl.className = 'text-sm md:text-base text-gray-500 mt-2';
      }
    }

    // ==================== ACTUALIZAR KPI: GASTOS EXTERNOS ====================
    const gastosExternosEl = document.getElementById('gastos-externos-monto');
    if (gastosExternosEl) {
      gastosExternosEl.textContent = `$${totalGastosExternos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según monto
      if (totalGastosExternos === 0) {
        gastosExternosEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-gray-400 leading-tight';
      } else if (totalGastosExternos > 50000) {
        gastosExternosEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-orange-600 leading-tight';
      } else {
        gastosExternosEl.className = 'text-lg lg:text-xl xl:text-2xl font-bold text-blue-600 leading-tight';
      }
    }

    // Porcentaje de viáticos
    const porcentajeViaticos = presupuestoViaticos > 0 ? (totalViaticos / presupuestoViaticos) * 100 : 0;
    const porcentajeViaticosEl = document.getElementById('porcentaje-viaticos');
    const barraViaticosEl = document.getElementById('barra-viaticos');
    
    if (porcentajeViaticosEl) {
      porcentajeViaticosEl.textContent = `${porcentajeViaticos.toFixed(1)}%`;
    }
    
    if (barraViaticosEl) {
      barraViaticosEl.style.width = `${Math.min(porcentajeViaticos, 100)}%`;
      // Colorear barra según nivel de ejecución
      if (porcentajeViaticos >= 100) {
        barraViaticosEl.className = 'progress-bar h-full bg-red-600 rounded-full';
      } else if (porcentajeViaticos >= 80) {
        barraViaticosEl.className = 'progress-bar h-full bg-yellow-500 rounded-full';
      } else {
        barraViaticosEl.className = 'progress-bar h-full bg-pink-500 rounded-full';
      }
    }

    // ==================== ALERTAS VISUALES ====================
    // Mostrar alerta si se supera el 80% del presupuesto
    if (porcentajePresupuesto >= 80 && porcentajePresupuesto < 100) {
    } else if (porcentajePresupuesto >= 100) {
      console.error(`🚨 Presupuesto excedido: ${porcentajePresupuesto.toFixed(1)}%`);
    }

    if (porcentajeViaticos >= 80 && porcentajeViaticos < 100) {
    } else if (porcentajeViaticos >= 100) {
      console.error(`🚨 Viáticos excedidos: ${porcentajeViaticos.toFixed(1)}%`);
    }

  } catch (error) {
    console.error('Error al calcular gastos:', error);
  }
}

// ==================== ESTADÍSTICAS DEL DASHBOARD ====================
async function calcularEstadisticasDashboard() {
  try {
    const gastosSnapshot = await db.collection('gastos')
      .where('eliminado', '==', false)
      .get();
    
    const gastos = [];
    gastosSnapshot.forEach(doc => {
      gastos.push({ id: doc.id, ...doc.data() });
    });


    // Calcular gastos por organización
    await calcularGastosPorOrganizacion(gastos);
    
    // Calcular evolución temporal
    await calcularEvolucionGastos(gastos);

    // Validar coherencia de datos
    validarCoherenciaKPIs(gastos);
    
  } catch (error) {
    console.error('Error al calcular estadísticas del dashboard:', error);
  }
}

// ==================== VALIDACIÓN DE COHERENCIA ====================
function validarCoherenciaKPIs(gastos) {
  // Re-calcular con el mismo scope que calcularGastos: presupuesto registrado del trimestre
  const ahora = new Date();
  const trimestreActual = Math.floor(ahora.getMonth() / 3);
  const inicioTrim = new Date(ahora.getFullYear(), trimestreActual * 3, 1);
  const finTrim = new Date(ahora.getFullYear(), trimestreActual * 3 + 3, 0, 23, 59, 59);

  let totalPresupuestoGastos = 0;

  gastos.forEach(gasto => {
    const organizacion = gasto.organizacion || '';
    const esOrganizacionExterna = ORGANIZACIONES_EXTERNAS.includes(organizacion);
    if (esOrganizacionExterna) return;
    if (gasto.categoria !== 'presupuesto') return;
    if (!gasto.aprobado) return;
    const fecha = parseFechaLocal(gasto.fecha);
    if (fecha < inicioTrim || fecha > finTrim) return;
    totalPresupuestoGastos += gasto.monto || 0;
  });

  const totalGastosCalculado = totalPresupuestoGastos;

  // Obtener el valor mostrado en el KPI
  const totalGastadoEl = document.getElementById('total-gastado');
  const totalMostrado = totalGastadoEl ? 
    parseFloat(totalGastadoEl.textContent.replace(/[^0-9,]/g, '').replace(',', '.')) : 0;

  // Validar coherencia (con margen de 0.01 por redondeos)
  if (Math.abs(totalGastosCalculado - totalMostrado) > 0.01) {
  } else {
  }
}

// ==================== CALCULAR GASTOS POR ORGANIZACIÓN ====================
async function calcularGastosPorOrganizacion(gastos) {
  // Filtrar solo gastos de PRESUPUESTO, REPORTADOS, del trimestre actual
  const trimestreActual = calcularTrimestreActual();
  const gastosTrimestre = gastos.filter(gasto => {
    if (!gasto.fecha) return false;
    if (gasto.categoria !== 'presupuesto') return false; // excluir viáticos y otros
    if (!gasto.registrado) return false; // solo reportados
    const fechaGasto = gasto.fecha.toDate ? gasto.fecha.toDate() : parseFechaLocal(gasto.fecha);
    return fechaGasto >= trimestreActual.inicio && fechaGasto <= trimestreActual.fin;
  });
  
  const organizaciones = {
    'hombres-mujeres-jovenes': { nombre: 'Hombres y mujeres jóvenes', total: 0, color: '#10b981' },
    'primaria': { nombre: 'Primaria', total: 0, color: '#f59e0b' },
    'sociedad-socorro': { nombre: 'Sociedad de socorro', total: 0, color: '#3b82f6' },
    'escuela-dominical': { nombre: 'Escuela dominical', total: 0, color: '#06b6d4' },
    'quorum-elderes': { nombre: 'Quórum de Elderes', total: 0, color: '#8b5cf6' },
    'gastos-presupuesto': { nombre: 'Gastos de Presupuesto', total: 0, color: '#f97316' },
    'adultos-solteros': { nombre: 'Adultos solteros', total: 0, color: '#ef4444' },
    'viajes-aprobados': { nombre: 'Viajes aprobados', total: 0, color: '#ec4899' }
  };

  const organizacionesExternas = {
    'meetup': { nombre: 'Meet up', total: 0, color: '#78716c' },
    'pfj': { nombre: 'PFJ', total: 0, color: '#57534e' },
    'area': { nombre: 'AREA', total: 0, color: '#44403c' }
  };

  // Acumular gastos por organización del trimestre actual (separando externas)
  gastosTrimestre.forEach(gasto => {
    const org = gasto.organizacion || 'gastos-presupuesto';
    
    // Verificar si es organización externa
    if (organizacionesExternas[org]) {
      organizacionesExternas[org].total += gasto.monto || 0;
    } else if (organizaciones[org]) {
      organizaciones[org].total += gasto.monto || 0;
    }
  });

  // Calcular totales separados
  const totalGastos = Object.values(organizaciones).reduce((sum, org) => sum + org.total, 0);
  const totalExterno = Object.values(organizacionesExternas).reduce((sum, org) => sum + org.total, 0);
  
  // Actualizar total en el chart (SOLO organizaciones internas)
  const totalElement = document.getElementById('total-gastos-chart');
  if (totalElement) {
    if (totalGastos === 0) {
      totalElement.textContent = '$0';
      totalElement.className = 'text-xl lg:text-2xl font-bold text-gray-400';
    } else {
      totalElement.textContent = `$${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
      totalElement.className = 'text-xl lg:text-2xl font-bold text-gray-800 tracking-tight';
    }
  }
  
  // Actualizar indicador de trimestre actual en UI
  const indicadorTrimestre = document.getElementById('indicador-trimestre-actual');
  if (indicadorTrimestre) {
    indicadorTrimestre.textContent = `${trimestreActual.nombre} (${trimestreActual.meses.join(', ')})`;
  }

  // Ordenar organizaciones internas de mayor a menor gasto
  const organizacionesOrdenadas = Object.entries(organizaciones)
    .sort(([, a], [, b]) => b.total - a.total)
    .filter(([, org]) => org.total > 0);

  // Actualizar lista de organizaciones INTERNAS
  const listaOrg = document.getElementById('lista-organizaciones');
  if (listaOrg) {
    if (organizacionesOrdenadas.length === 0) {
      listaOrg.innerHTML = `
        <div class="text-center py-4 text-gray-400">
          <p class="text-sm">📊 Sin gastos por organización</p>
          <p class="text-xs mt-1">Los gastos aparecerán aquí cuando se registren</p>
        </div>
      `;
    } else {
      const itemsHTML = organizacionesOrdenadas
        .map(([key, org], index) => {
          const porcentaje = totalGastos > 0 ? (org.total / totalGastos * 100).toFixed(1) : 0;
          // Ocultar items después del 4to en móviles
          const hiddenClass = index >= 4 ? ' org-item-hidden' : '';
          return `
            <div onclick="mostrarGastosOrganizacion('${key}', '${org.nombre}')" class="org-item${hiddenClass} flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0 hover:bg-blue-50 rounded-lg px-2 transition-colors cursor-pointer group">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative flex-shrink-0">
                  <span class="w-3 h-3 rounded-full block" style="background-color: ${org.color}"></span>
                </div>
                <span class="text-gray-600 font-medium truncate group-hover:text-blue-600 transition-colors">${org.nombre}</span>
              </div>
              <div class="text-right ml-4">
                <div class="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">$${org.total.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                <div class="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full inline-block mt-0.5">${porcentaje}% del total</div>
              </div>
            </div>
          `;
        }).join('');
      
      listaOrg.innerHTML = itemsHTML;
      
      // Agregar botón "Ver más" solo en móviles si hay más de 4 organizaciones
      if (organizacionesOrdenadas.length > 4) {
        const btnVerMas = document.createElement('button');
        btnVerMas.id = 'btn-ver-mas-org';
        btnVerMas.className = 'btn-ver-mas-org md:hidden';
        btnVerMas.onclick = toggleVerMasOrganizaciones;
        btnVerMas.innerHTML = `
          <span id="texto-ver-mas">Ver más</span>
          <svg id="icono-ver-mas" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        `;
        listaOrg.appendChild(btnVerMas);
      }
    }
  }

  // Ordenar organizaciones EXTERNAS de mayor a menor gasto
  const organizacionesExternasOrdenadas = Object.entries(organizacionesExternas)
    .sort(([, a], [, b]) => b.total - a.total)
    .filter(([, org]) => org.total > 0);

  // Actualizar gráfico de dona (SOLO con organizaciones internas)
  await actualizarGraficoDona(organizaciones, totalGastos);
}

// Actualizar gráfico de dona
async function actualizarGraficoDona(organizaciones, total) {
  const chartDona = document.getElementById('chart-dona');
  if (!chartDona) return;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  // Limpiar círculos anteriores excepto el de fondo
  const circles = chartDona.querySelectorAll('circle');
  circles.forEach((circle, index) => {
    if (index > 0) circle.remove();
  });

  // Crear segmentos del gráfico
  Object.values(organizaciones).forEach(org => {
    if (org.total > 0) {
      const percentage = (org.total / total) * 100;
      const dashLength = (percentage / 100) * circumference;
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '100');
      circle.setAttribute('cy', '100');
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', org.color);
      circle.setAttribute('stroke-width', '30');
      circle.setAttribute('stroke-dasharray', `${dashLength} ${circumference}`);
      circle.setAttribute('stroke-dashoffset', -currentOffset);
      
      chartDona.appendChild(circle);
      currentOffset += dashLength;
    }
  });
}

// Función para expandir/contraer lista de organizaciones en móviles
function toggleVerMasOrganizaciones() {
  const listaOrg = document.getElementById('lista-organizaciones');
  const textoBtn = document.getElementById('texto-ver-mas');
  const iconoBtn = document.getElementById('icono-ver-mas');
  
  if (!listaOrg || !textoBtn || !iconoBtn) return;
  
  const itemsOcultos = listaOrg.querySelectorAll('.org-item-hidden');
  const estaExpandido = itemsOcultos[0] && itemsOcultos[0].classList.contains('org-item-hidden-active');
  
  itemsOcultos.forEach(item => {
    if (estaExpandido) {
      item.classList.remove('org-item-hidden-active');
    } else {
      item.classList.add('org-item-hidden-active');
    }
  });
  
  if (estaExpandido) {
    textoBtn.textContent = 'Ver más';
    iconoBtn.classList.remove('rotate-180');
  } else {
    textoBtn.textContent = 'Ver menos';
    iconoBtn.classList.add('rotate-180');
  }
}

// ==================== SISTEMA DE TRIMESTRES ARCHIVADOS ====================

// Calcular información del trimestre actual
function calcularTrimestreActual() {
  const hoy = new Date();
  const mes = hoy.getMonth(); // 0-11
  const anio = hoy.getFullYear();
  
  // Determinar número de trimestre (Q1: Ene-Mar, Q2: Abr-Jun, Q3: Jul-Sep, Q4: Oct-Dic)
  const numeroTrimestre = Math.floor(mes / 3) + 1;
  
  // Calcular fechas de inicio y fin del trimestre
  const mesInicio = (numeroTrimestre - 1) * 3;
  const mesFin = mesInicio + 2;
  
  const fechaInicio = new Date(anio, mesInicio, 1);
  const fechaFin = new Date(anio, mesFin + 1, 0, 23, 59, 59); // Último día del último mes
  
  return {
    id: `Q${numeroTrimestre}-${anio}`,
    numero: numeroTrimestre,
    anio: anio,
    inicio: fechaInicio,
    fin: fechaFin,
    nombre: `${numeroTrimestre}º Trimestre ${anio}`,
    meses: obtenerNombresMesesTrimestre(numeroTrimestre)
  };
}

// Obtener nombres de meses de un trimestre
function obtenerNombresMesesTrimestre(numeroTrimestre) {
  const meses = [
    ['Enero', 'Febrero', 'Marzo'],
    ['Abril', 'Mayo', 'Junio'],
    ['Julio', 'Agosto', 'Septiembre'],
    ['Octubre', 'Noviembre', 'Diciembre']
  ];
  return meses[numeroTrimestre - 1];
}

// Calcular el segundo viernes del mes siguiente al fin del trimestre
function calcularSegundoViernesMesSiguiente(fechaFinTrimestre) {
  const mesSiguiente = new Date(fechaFinTrimestre);
  mesSiguiente.setMonth(mesSiguiente.getMonth() + 1);
  mesSiguiente.setDate(1);
  
  let contadorViernes = 0;
  let fechaBusqueda = new Date(mesSiguiente);
  
  // Buscar el segundo viernes
  while (contadorViernes < 2) {
    if (fechaBusqueda.getDay() === 5) { // 5 = Viernes
      contadorViernes++;
      if (contadorViernes === 2) {
        return fechaBusqueda;
      }
    }
    fechaBusqueda.setDate(fechaBusqueda.getDate() + 1);
  }
  
  return fechaBusqueda;
}

// Verificar si ya pasó la fecha de cierre del trimestre anterior
function debeArchivarTrimestreAnterior() {
  const hoy = new Date();
  const trimestreActual = calcularTrimestreActual();
  
  // Si estamos en el primer trimestre del año, revisar si hay que archivar Q4 del año anterior
  if (trimestreActual.numero === 1) {
    const fechaFinQ4 = new Date(trimestreActual.anio - 1, 11, 31, 23, 59, 59);
    const segundoViernesEnero = calcularSegundoViernesMesSiguiente(fechaFinQ4);
    return hoy > segundoViernesEnero;
  }
  
  // Para otros trimestres, revisar trimestre anterior del mismo año
  const numeroTrimestreAnterior = trimestreActual.numero - 1;
  const mesFin = numeroTrimestreAnterior * 3 - 1;
  const fechaFinTrimestreAnterior = new Date(trimestreActual.anio, mesFin + 1, 0, 23, 59, 59);
  const segundoViernes = calcularSegundoViernesMesSiguiente(fechaFinTrimestreAnterior);
  
  return hoy > segundoViernes;
}

// Archivar gastos del trimestre anterior en Firestore
async function archivarTrimestreAnterior() {
  try {
    const trimestreActual = calcularTrimestreActual();
    let trimestreAArchivar;
    
    // Determinar qué trimestre archivar
    if (trimestreActual.numero === 1) {
      // Archivar Q4 del año anterior
      trimestreAArchivar = {
        id: `Q4-${trimestreActual.anio - 1}`,
        numero: 4,
        anio: trimestreActual.anio - 1,
        inicio: new Date(trimestreActual.anio - 1, 9, 1),
        fin: new Date(trimestreActual.anio - 1, 11, 31, 23, 59, 59),
        nombre: `4º Trimestre ${trimestreActual.anio - 1}`,
        meses: ['Octubre', 'Noviembre', 'Diciembre']
      };
    } else {
      // Archivar trimestre anterior del mismo año
      const numeroAnterior = trimestreActual.numero - 1;
      const mesInicio = (numeroAnterior - 1) * 3;
      const mesFin = mesInicio + 2;
      
      trimestreAArchivar = {
        id: `Q${numeroAnterior}-${trimestreActual.anio}`,
        numero: numeroAnterior,
        anio: trimestreActual.anio,
        inicio: new Date(trimestreActual.anio, mesInicio, 1),
        fin: new Date(trimestreActual.anio, mesFin + 1, 0, 23, 59, 59),
        nombre: `${numeroAnterior}º Trimestre ${trimestreActual.anio}`,
        meses: obtenerNombresMesesTrimestre(numeroAnterior)
      };
    }
    
    // Verificar si ya está archivado
    const docExistente = await db.collection('trimestres-archivados')
      .doc(trimestreAArchivar.id)
      .get();
    
    if (docExistente.exists) {
      return;
    }
    
    // Obtener gastos del trimestre anterior
    const gastosSnapshot = await db.collection('gastos')
      .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(trimestreAArchivar.inicio))
      .where('fecha', '<=', firebase.firestore.Timestamp.fromDate(trimestreAArchivar.fin))
      .where('eliminado', '==', false)
      .get();
    
    const gastosTrimestre = [];
    gastosSnapshot.forEach(doc => {
      gastosTrimestre.push({ id: doc.id, ...doc.data() });
    });
    
    // Calcular gastos por organización del trimestre
    const organizaciones = {
      'hombres-mujeres-jovenes': { nombre: 'Hombres y mujeres jóvenes', total: 0, color: '#10b981' },
      'primaria': { nombre: 'Primaria', total: 0, color: '#f59e0b' },
      'sociedad-socorro': { nombre: 'Sociedad de socorro', total: 0, color: '#3b82f6' },
      'escuela-dominical': { nombre: 'Escuela dominical', total: 0, color: '#06b6d4' },
      'quorum-elderes': { nombre: 'Quórum de Elderes', total: 0, color: '#8b5cf6' },
      'gastos-presupuesto': { nombre: 'Gastos de Presupuesto', total: 0, color: '#f97316' },
      'adultos-solteros': { nombre: 'Adultos solteros', total: 0, color: '#ef4444' },
      'viajes-aprobados': { nombre: 'Viajes aprobados', total: 0, color: '#ec4899' }
    };
    
    gastosTrimestre.forEach(gasto => {
      const org = gasto.organizacion || 'gastos-presupuesto';
      if (organizaciones[org]) {
        organizaciones[org].total += gasto.monto || 0;
      }
    });
    
    const totalGastos = Object.values(organizaciones).reduce((sum, org) => sum + org.total, 0);
    
    // Guardar en Firestore
    await db.collection('trimestres-archivados').doc(trimestreAArchivar.id).set({
      trimestre: trimestreAArchivar.id,
      numero: trimestreAArchivar.numero,
      anio: trimestreAArchivar.anio,
      nombre: trimestreAArchivar.nombre,
      meses: trimestreAArchivar.meses,
      inicio: firebase.firestore.Timestamp.fromDate(trimestreAArchivar.inicio),
      fin: firebase.firestore.Timestamp.fromDate(trimestreAArchivar.fin),
      segundoViernes: firebase.firestore.Timestamp.fromDate(calcularSegundoViernesMesSiguiente(trimestreAArchivar.fin)),
      organizaciones: organizaciones,
      totalGastos: totalGastos,
      cantidadGastos: gastosTrimestre.length,
      fechaArchivo: firebase.firestore.Timestamp.now(),
      archivoAutomatico: true
    });
    
    // Recargar trimestres archivados en UI
    await cargarTrimestresArchivados();
    
  } catch (error) {
    console.error('❌ Error al archivar trimestre:', error);
  }
}

// Cargar y mostrar trimestres archivados
async function cargarTrimestresArchivados() {
  const contenedor = document.getElementById('trimestres-archivados');
  if (!contenedor) return;

  const mensajeVacio = `
    <div class="col-span-full text-center py-6 text-gray-400">
      <svg class="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      <p class="text-sm font-medium">Nada por mostrar por el momento</p>
      <p class="text-xs mt-1 opacity-70">El primer trimestre se archivará el 2° viernes de abril</p>
    </div>
  `;

  try {
    // Ordenar en cliente para evitar necesidad de índice compuesto en Firestore
    const snapshot = await db.collection('trimestres-archivados').get();
    
    if (snapshot.empty) {
      contenedor.innerHTML = mensajeVacio;
      return;
    }
    
    const trimestres = [];
    snapshot.forEach(doc => {
      trimestres.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar en cliente: más reciente primero
    trimestres.sort((a, b) => b.anio !== a.anio ? b.anio - a.anio : b.numero - a.numero);
    
    contenedor.innerHTML = trimestres.map(trimestre => `
      <div class="card-dark p-4 cursor-pointer hover:shadow-lg transition-shadow" onclick="mostrarTrimestreArchivado('${trimestre.id}')">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-semibold text-gray-900">${trimestre.nombre}</h4>
            <p class="text-xs text-gray-500 mt-1">${trimestre.meses.join(', ')}</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-blue-600">$${trimestre.totalGastos.toLocaleString('es-AR')}</p>
            <p class="text-xs text-gray-400">${trimestre.cantidadGastos} gastos</p>
          </div>
        </div>
        <div class="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          <span>Click para ver detalles</span>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('❌ Error al cargar trimestres archivados:', error);
    if (contenedor) contenedor.innerHTML = mensajeVacio;
  }
}

// Mostrar lightbox con gastos de trimestre archivado
async function mostrarTrimestreArchivado(trimestreId) {
  try {
    const doc = await db.collection('trimestres-archivados').doc(trimestreId).get();
    
    if (!doc.exists) {
      mostrarNotificacion('❌ Trimestre no encontrado', 'error');
      return;
    }
    
    const trimestre = doc.data();
    const modal = document.getElementById('modal-trimestre-archivado');
    if (!modal) return;
    
    // Actualizar título
    document.getElementById('titulo-trimestre-archivado').textContent = trimestre.nombre;
    document.getElementById('meses-trimestre-archivado').textContent = trimestre.meses.join(', ');
    
    // Generar lista de organizaciones
    const listaOrg = document.getElementById('lista-organizaciones-archivadas');
    const organizaciones = trimestre.organizaciones;
    
    const organizacionesOrdenadas = Object.entries(organizaciones)
      .sort(([, a], [, b]) => b.total - a.total)
      .filter(([, org]) => org.total > 0);
    
    if (organizacionesOrdenadas.length === 0) {
      listaOrg.innerHTML = '<p class="text-center text-gray-400 py-8">No hay gastos en este trimestre</p>';
    } else {
      listaOrg.innerHTML = organizacionesOrdenadas.map(([key, org]) => {
        const porcentaje = (org.total / trimestre.totalGastos * 100).toFixed(1);
        return `
          <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div class="flex items-center gap-3 flex-1">
              <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${org.color}"></span>
              <span class="text-gray-700 font-medium">${org.nombre}</span>
            </div>
            <div class="text-right">
              <div class="font-bold text-gray-900">$${org.total.toLocaleString('es-AR')}</div>
              <div class="text-xs text-gray-400">${porcentaje}%</div>
            </div>
          </div>
        `;
      }).join('');
    }
    
    // Mostrar modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
  } catch (error) {
    console.error('❌ Error al mostrar trimestre archivado:', error);
    mostrarNotificacion('❌ Error al cargar trimestre', 'error');
  }
}

// Cerrar modal de trimestre archivado
function cerrarModalTrimestreArchivado() {
  const modal = document.getElementById('modal-trimestre-archivado');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Modificar calcularGastosPorOrganizacion para filtrar solo trimestre actual
async function calcularGastosPorOrganizacionOriginal(gastos) {
  // NOTA: Esta función se reemplazará por la versión con filtro de trimestre
  // Mantener el código original por si se necesita migrar datos
}

// ==================== MOSTRAR GASTOS POR ORGANIZACIÓN ====================
async function mostrarGastosOrganizacion(organizacionKey, organizacionNombre) {
  try {
    // Mostrar el modal
    const modal = document.getElementById('modal-gastos-organizacion');
    if (!modal) {
      console.error('❌ Modal de gastos por organización no encontrado');
      return;
    }

    // Actualizar títulos
    document.getElementById('titulo-organizacion').textContent = organizacionNombre;
    
    // Obtener todos los gastos de la base de datos
    const gastosSnapshot = await db.collection('gastos').get();
    const todosLosGastos = gastosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calcular límites del trimestre actual
    const _ahora = new Date();
    const _trim = Math.floor(_ahora.getMonth() / 3);
    const _iniT = new Date(_ahora.getFullYear(), _trim * 3, 1);
    const _finT = new Date(_ahora.getFullYear(), _trim * 3 + 3, 0, 23, 59, 59);

    // Filtrar gastos por organización, categoría presupuesto y trimestre actual
    const gastosFiltrados = todosLosGastos.filter(gasto => {
      if (gasto.eliminado) return false;
      const org = gasto.organizacion || 'gastos-presupuesto';
      if (org !== organizacionKey) return false;
      if (gasto.categoria !== 'presupuesto') return false;
      if (!gasto.registrado) return false; // Filtrar solo los registrados
      if (!gasto.fecha) return false;
      const f = parseFechaLocal(gasto.fecha);
      return f >= _iniT && f <= _finT;
    });

    // Ordenar por fecha (más recientes primero)
    gastosFiltrados.sort((a, b) => {
      const fechaA = a.fecha ? parseFechaLocal(a.fecha) : new Date(0);
      const fechaB = b.fecha ? parseFechaLocal(b.fecha) : new Date(0);
      return fechaB - fechaA;
    });

    // Calcular totales
    const totalGastos = gastosFiltrados.reduce((sum, g) => sum + (g.monto || 0), 0);
    const cantidadGastos = gastosFiltrados.length;
    const nombreTrim = ['Q1 Ene–Mar', 'Q2 Abr–Jun', 'Q3 Jul–Sep', 'Q4 Oct–Dic'][Math.floor(new Date().getMonth() / 3)];

    // Actualizar subtítulo con resumen
    document.getElementById('subtitulo-organizacion').textContent = 
      `${cantidadGastos} gasto${cantidadGastos !== 1 ? 's' : ''} • Total: $${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} • ${nombreTrim} ${new Date().getFullYear()}`;

    // Renderizar gastos
    const contenido = document.getElementById('contenido-gastos-organizacion');
    
    if (gastosFiltrados.length === 0) {
      contenido.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-lg font-medium">No hay gastos registrados</p>
          <p class="text-sm mt-1">Esta organización aún no tiene gastos</p>
        </div>
      `;
    } else {
      contenido.innerHTML = `
        <div class="grid grid-cols-1 gap-4">
          ${gastosFiltrados.map(gasto => crearTarjetaGastoOrganizacion(gasto)).join('')}
        </div>
      `;
    }

    // Mostrar el modal
    modal.classList.remove('hidden');
  } catch (error) {
    console.error('❌ Error al mostrar gastos por organización:', error);
    mostrarNotificacion('Error al cargar gastos de la organización', 'error');
  }
}

// Crear tarjeta de gasto simplificada para modal de organización
function crearTarjetaGastoOrganizacion(gasto) {
  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos', color: 'green' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto', color: 'orange' }
  };

  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria, color: 'gray' };
  
  const comprobanteIcon = gasto.comprobanteAdjunto 
    ? '<span class="text-green-500 text-xs">✓ Con comprobante</span>' 
    : '<span class="text-gray-400 text-xs">Sin comprobante</span>';

  const estadoRegistro = gasto.registrado 
    ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Registrado</span>'
    : '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">⏳ Sin registrar</span>';

  return `
    <div class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-${cat.color}-100 text-${cat.color}-700">
              ${cat.emoji} ${cat.label}
            </span>
            <span class="text-xs text-gray-500">📅 ${gasto.fecha}</span>
            ${estadoRegistro}
          </div>
          
          <h4 class="text-base font-semibold text-gray-900 mb-2">${gasto.descripcion}</h4>
          
          <div class="flex items-center gap-2 text-sm">
            ${comprobanteIcon}
          </div>

          ${gasto.observaciones ? `
            <div class="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <p class="text-xs text-blue-700"><strong>📋 Observaciones:</strong> ${gasto.observaciones}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="flex-shrink-0 text-right">
          <p class="text-2xl font-bold text-gray-900">$${gasto.monto.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p class="text-xs text-gray-500 mt-1">ARS</p>
        </div>
      </div>
    </div>
  `;
}

// Cerrar modal de gastos por organización
function cerrarModalGastosOrganizacion() {
  const modal = document.getElementById('modal-gastos-organizacion');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ==================== MODAL COMISIONES ML ====================
async function abrirModalComisionesML() {
  try {
    const modal = document.getElementById('modal-comisiones-ml');
    if (!modal) {
      console.error('❌ Modal de comisiones ML no encontrado');
      return;
    }

    // Mostrar el modal
    modal.classList.remove('hidden');

    // Obtener todos los gastos con comisión
    const gastosSnapshot = await db.collection('gastos').get();
    const gastosConComision = gastosSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(gasto => gasto.comision && gasto.comision > 0 && !gasto.eliminado);

    // Ordenar por fecha (más recientes primero)
    gastosConComision.sort((a, b) => {
      const fechaA = a.fecha ? parseFechaLocal(a.fecha) : new Date(0);
      const fechaB = b.fecha ? parseFechaLocal(b.fecha) : new Date(0);
      return fechaB - fechaA;
    });

    // Calcular totales
    const totalGastosConComision = gastosConComision.reduce((sum, g) => sum + (g.monto || 0), 0);
    const totalComisionesPagadas = gastosConComision.reduce((sum, g) => sum + (g.comision || 0), 0);
    const cantidadTransacciones = gastosConComision.length;

    // Actualizar KPIs
    document.getElementById('kpi-total-comisiones-gastos').textContent = 
      `$${totalGastosConComision.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    
    document.getElementById('kpi-total-comisiones-pagadas').textContent = 
      `$${totalComisionesPagadas.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    
    document.getElementById('kpi-cantidad-comisiones').textContent = cantidadTransacciones;

    document.getElementById('subtitulo-comisiones').textContent = 
      `${cantidadTransacciones} transacción${cantidadTransacciones !== 1 ? 'es' : ''} con comisión del 6.99%`;

    // Renderizar gastos
    const contenido = document.getElementById('contenido-comisiones-ml');
    
    if (gastosConComision.length === 0) {
      contenido.innerHTML = `
        <div class="text-center py-16 text-gray-400">
          <svg class="w-20 h-20 mx-auto mb-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-lg font-semibold text-gray-600">No hay gastos con comisión</p>
          <p class="text-sm mt-2 text-gray-500">Los gastos con comisión de MercadoLibre aparecerán aquí</p>
        </div>
      `;
    } else {
      // Agrupar por mes
      const gruposPorMes = agruparComisionesPorMes(gastosConComision);
      
      contenido.innerHTML = gruposPorMes.map(grupo => `
        <div class="mb-5 sm:mb-6">
          <!-- Header del mes -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-blue-200 gap-2">
            <h3 class="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
              </svg>
              <span>${grupo.nombre}</span>
            </h3>
            <div class="flex items-center gap-2 sm:gap-4 text-sm sm:text-base">
              <span class="text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">${grupo.comisiones.length} transaccion${grupo.comisiones.length !== 1 ? 'es' : ''}</span>
              <span class="text-sm sm:text-base font-bold text-orange-600">$${grupo.total.toLocaleString('es-AR', {minimumFractionDigits: 0})}</span>
            </div>
          </div>
          
          <!-- Gastos del mes -->
          <div class="space-y-3 sm:space-y-4">
            ${grupo.comisiones.map(gasto => crearTarjetaGastoComision(gasto)).join('')}
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('❌ Error al cargar comisiones ML:', error);
    mostrarNotificacion('Error al cargar comisiones', 'error');
  }
}

// Crear tarjeta de gasto para modal de comisiones
function crearTarjetaGastoComision(gasto) {
  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos', color: 'green' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto', color: 'orange' }
  };

  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria, color: 'gray' };
  
  const comprobanteIcon = gasto.comprobanteAdjunto 
    ? '<span class="text-green-600 text-xs font-medium flex items-center gap-1"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Comprobante</span>' 
    : '<span class="text-gray-400 text-xs font-medium flex items-center gap-1"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg> Sin comprobante</span>';

  const estadoRegistro = gasto.registrado 
    ? '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">✓ Registrado</span>'
    : '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">⏳ Pendiente</span>';

  const montoNeto = gasto.monto || 0;
  const comision = gasto.comision || 0;
  const totalEnviado = montoNeto + comision;
  const porcentaje = montoNeto > 0 ? ((comision / montoNeto) * 100).toFixed(2) : '6.99';

  return `
    <div class="bg-gradient-to-br from-white to-gray-50 border-2 border-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 hover:shadow-lg hover:border-blue-200 transition-all">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4">
        <!-- Sección izquierda: Info del gasto -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span class="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-${cat.color}-100 text-${cat.color}-700 border border-${cat.color}-200">
              ${cat.emoji} ${cat.label}
            </span>
            <span class="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              📅 ${gasto.fecha}
            </span>
            ${estadoRegistro}
          </div>
          
          <h4 class="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">${gasto.descripcion}</h4>
          
          <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm mb-2">
            ${comprobanteIcon}
            ${gasto.organizacion ? `<span class="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gray-100 rounded-lg text-[10px] sm:text-xs font-medium text-gray-700 border border-gray-200">🏢 ${gasto.organizacion.replace(/-/g, ' ')}</span>` : ''}
          </div>

          ${gasto.observaciones ? `
            <div class="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 rounded-lg sm:rounded-xl border-l-4 border-blue-400">
              <p class="text-xs sm:text-sm text-blue-800"><strong class="font-semibold">📋 Nota:</strong> ${gasto.observaciones}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Sección derecha: Montos -->
        <div class="flex-shrink-0 w-full lg:w-auto lg:min-w-[200px] xl:min-w-[240px]">
          <div class="grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-3">
            <!-- Monto Neto -->
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border border-blue-200">
              <p class="text-[9px] sm:text-[10px] md:text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"></path></svg>
                <span class="hidden sm:inline">Base</span>
              </p>
              <p class="text-base sm:text-xl md:text-2xl font-bold text-blue-900">$${montoNeto.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
            </div>
            
            <!-- Comisión ML -->
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 border-orange-300">
              <p class="text-[9px] sm:text-[10px] md:text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                <span class="hidden sm:inline">${porcentaje}%</span>
              </p>
              <p class="text-base sm:text-xl md:text-2xl font-bold text-orange-700">$${comision.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
            </div>
            
            <!-- Total -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 border-green-300">
              <p class="text-[9px] sm:text-[10px] md:text-xs font-semibold text-green-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd"></path></svg>
                <span class="hidden sm:inline">Total</span>
              </p>
              <p class="text-base sm:text-xl md:text-2xl font-bold text-green-800">$${totalEnviado.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Cerrar modal de comisiones ML
function cerrarModalComisionesML() {
  const modal = document.getElementById('modal-comisiones-ml');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ==================== MODAL COMISIONES COMPLETO ====================
function mostrarModalComisiones() {
  const modal = document.getElementById('modal-comisiones');
  if (modal) {
    modal.classList.remove('hidden');
    pestanaComisionActiva = 'pendientes'; // Resetear a pendientes al abrir
    cargarComisiones();
  } else {
    console.error('❌ No se encontró el modal de comisiones');
  }
}

// Cerrar modal de comisiones
function cerrarModalComisiones() {
  const modal = document.getElementById('modal-comisiones');
  if (modal) modal.classList.add('hidden');
}

// Cambiar entre pestañas
function cambiarTabComisiones(tab) {
  pestanaComisionActiva = tab;
  
  // Actualizar estilos de pestañas
  const tabPendientes = document.getElementById('tab-pendientes');
  const tabInformadas = document.getElementById('tab-informadas');
  const contentPendientes = document.getElementById('tab-content-pendientes');
  const contentInformadas = document.getElementById('tab-content-informadas');
  
  if (tab === 'pendientes') {
    tabPendientes.classList.add('tab-comision-active');
    tabInformadas.classList.remove('tab-comision-active');
    tabPendientes.setAttribute('aria-selected', 'true');
    tabInformadas.setAttribute('aria-selected', 'false');
    contentPendientes.classList.remove('hidden');
    contentInformadas.classList.add('hidden');
  } else {
    tabInformadas.classList.add('tab-comision-active');
    tabPendientes.classList.remove('tab-comision-active');
    tabInformadas.setAttribute('aria-selected', 'true');
    tabPendientes.setAttribute('aria-selected', 'false');
    contentInformadas.classList.remove('hidden');
    contentPendientes.classList.add('hidden');
  }
}

// Cargar comisiones desde Firebase
async function cargarComisiones() {
  try {
    // Obtener todos los gastos y filtrar los que tienen comisión y NO están eliminados
    const snapshot = await db.collection('gastos')
      .orderBy('fecha', 'desc')
      .get();

    const comisiones = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(gasto => {
        // Filtrar: debe tener comisión > 0 Y no estar eliminado Y no ser categoría externa Y no estar excluida manualmente
        const categoriaLower = (gasto.categoria || '').toLowerCase();
        return gasto.comision && gasto.comision > 0 && !gasto.eliminado && !ORGANIZACIONES_EXTERNAS.includes(categoriaLower) && !gasto.comisionExcluida;
      })
      .sort((a, b) => {
        // Ordenar por fecha descendente (más reciente primero)
        const fechaA = parseFechaLocal(a.fecha);
        const fechaB = parseFechaLocal(b.fecha);
        return fechaB - fechaA;
      });

    // Separar comisiones en pendientes e informadas
    const comisionesPendientes = comisiones.filter(c => !c.comisionInformada);
    const comisionesInformadas = comisiones.filter(c => c.comisionInformada);
    
    // Renderizar ambas listas
    renderComisionesPendientes(comisionesPendientes);
    renderComisionesInformadas(comisionesInformadas);
    
    // Actualizar resumen y badges
    actualizarResumenComisiones(comisiones);
    actualizarBadgesComisiones(comisionesPendientes.length, comisionesInformadas.length);

  } catch (error) {
    console.error('❌ Error al cargar comisiones:', error);
    mostrarNotificacion('❌ Error al cargar las comisiones: ' + error.message, 'error');
  }
}

// Actualizar badges de las pestañas
function actualizarBadgesComisiones(countPendientes, countInformadas) {
  const badgePendientes = document.getElementById('badge-pendientes');
  const badgeInformadas = document.getElementById('badge-informadas');
  
  if (badgePendientes) badgePendientes.textContent = countPendientes;
  if (badgeInformadas) badgeInformadas.textContent = countInformadas;
}

// Función auxiliar: Agrupar comisiones por mes/año
function agruparComisionesPorMes(comisiones) {
  const grupos = {};
  
  comisiones.forEach(comision => {
    const fecha = parseFechaLocal(comision.fecha);
    const mesAno = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const mesNombre = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    if (!grupos[mesAno]) {
      grupos[mesAno] = {
        clave: mesAno,
        nombre: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
        fecha: fecha, // Para ordenar
        comisiones: [],
        total: 0,
        totalGastos: 0
      };
    }
    
    grupos[mesAno].comisiones.push(comision);
    grupos[mesAno].total += comision.comision || 0;
    grupos[mesAno].totalGastos += comision.monto || 0;
  });
  
  // Convertir a array y ordenar por fecha descendente
  return Object.values(grupos).sort((a, b) => b.fecha - a.fecha);
}

// Función auxiliar: Agrupar comisiones por trimestre
function agruparComisionesPorTrimestre(comisiones) {
  const grupos = {};
  
  comisiones.forEach(comision => {
    const fecha = parseFechaLocal(comision.fecha);
    const year = fecha.getFullYear();
    const month = fecha.getMonth(); // 0-11
    const trimestre = Math.floor(month / 3) + 1; // 1, 2, 3, 4
    const claveT = `${year}-T${trimestre}`;
    
    if (!grupos[claveT]) {
      grupos[claveT] = {
        clave: claveT,
        nombre: `T${trimestre} ${year}`,
        año: year,
        trimestre: trimestre,
        fecha: new Date(year, trimestre * 3 - 3, 1), // Primer día del trimestre
        comisiones: [],
        total: 0,
        totalGastos: 0,
        cantidad: 0
      };
    }
    
    grupos[claveT].comisiones.push(comision);
    grupos[claveT].total += comision.comision || 0;
    grupos[claveT].totalGastos += comision.monto || 0;
    grupos[claveT].cantidad++;
  });
  
  // Convertir a array y ordenar por fecha descendente
  return Object.values(grupos).sort((a, b) => b.fecha - a.fecha);
}

// Toggle grupo de mes
function toggleGrupoMes(mesId) {
  const contenido = document.getElementById(`grupo-mes-${mesId}`);
  const icono = document.getElementById(`icono-mes-${mesId}`);
  
  if (contenido && icono) {
    contenido.classList.toggle('hidden');
    icono.classList.toggle('rotate-180');
    
    // Guardar estado (expandido si NO tiene hidden)
    const estaExpandido = !contenido.classList.contains('hidden');
    guardarEstadoAcordeon(`mes-${mesId}`, estaExpandido);
  }
}

// Expandir/contraer todos los meses
function toggleTodosMeses(tipo) {
  const contenedorId = tipo === 'pendientes' ? 'lista-comisiones-pendientes' : 'lista-comisiones-informadas';
  const contenedor = document.getElementById(contenedorId);
  
  if (!contenedor) return;
  
  const grupos = contenedor.querySelectorAll('[id^="grupo-mes-"]');
  const iconos = contenedor.querySelectorAll('[id^="icono-mes-"]');
  const todosExpandidos = Array.from(grupos).every(g => !g.classList.contains('hidden'));
  
  grupos.forEach(g => {
    if (todosExpandidos) {
      g.classList.add('hidden');
    } else {
      g.classList.remove('hidden');
    }
  });
  
  iconos.forEach(i => {
    if (todosExpandidos) {
      i.classList.remove('rotate-180');
    } else {
      i.classList.add('rotate-180');
    }
  });
}

// Toggle para grupos de gastos mensuales
function toggleGrupoGastoMes(mesId) {
  const contenido = document.getElementById(`grupo-${mesId}`);
  const icono = document.getElementById(`icono-${mesId}`);
  
  if (contenido && icono) {
    contenido.classList.toggle('hidden');
    icono.classList.toggle('rotate-180');
    
    // Guardar estado (expandido si NO tiene hidden)
    const estaExpandido = !contenido.classList.contains('hidden');
    guardarEstadoAcordeon(mesId, estaExpandido);
  }
}

// Renderizar lista de comisiones pendientes
function renderComisionesPendientes(comisiones) {
  const lista = document.getElementById('lista-comisiones-pendientes');
  
  if (!lista) return;

  if (comisiones.length === 0) {
    lista.innerHTML = `
      <div class="text-center modal-comisiones-empty py-8">
        <span class="text-4xl mb-2 block">💳</span>
        <p class="text-sm mb-1 font-medium">No hay comisiones pendientes</p>
        <p class="text-xs">Las comisiones por informar aparecerán aquí</p>
      </div>
    `;
    return;
  }

  // Agrupar por mes
  const gruposPorMes = agruparComisionesPorMes(comisiones);
  
  // Agregar botón para expandir/contraer todos
  const botonExpandir = `
    <div class="flex justify-end mb-3">
      <button onclick="toggleTodosMeses('pendientes')" 
        class="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
        </svg>
        Expandir/Contraer todo
      </button>
    </div>
  `;

  lista.innerHTML = botonExpandir + gruposPorMes.map(grupo => {
    const itemsHTML = grupo.comisiones.map(comision => {
      const fecha = parseFechaLocal(comision.fecha).toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short'
      });

      const porcentajeComision = comision.monto && comision.monto > 0 
        ? ((comision.comision / comision.monto) * 100).toFixed(2) 
        : null;

      return `
        <div class="comision-item rounded-xl p-4 hover:shadow-md transition-all border border-gray-100">
          <div class="flex items-start gap-4">
            <input type="checkbox" 
              class="comision-checkbox mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer" 
              data-comision-id="${comision.id}"
              data-comision-monto="${comision.comision}">
            
            <div class="flex-1">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex-1">
                  <h4 class="comision-item-title text-sm font-bold mb-1">${comision.descripcion}</h4>
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="flex items-center gap-1 comision-item-date">
                      📅 ${fecha}
                    </span>
                    ${comision.organizacion ? `
                      <span class="flex items-center gap-1 comision-item-date">
                        🏢 ${comision.organizacion}
                      </span>
                    ` : ''}
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 p-3 rounded-lg comision-montos-container">
                <div class="text-center p-2 rounded comision-monto-box">
                  <p class="text-xs comision-monto-label mb-1">💰 Monto</p>
                  <p class="text-base font-bold comision-monto-value">${comision.monto ? `$${comision.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}` : 'N/A'}</p>
                </div>
                <div class="text-center p-2 rounded comision-comision-box">
                  <p class="text-xs comision-comision-label mb-1">💳 Comisión ${porcentajeComision ? `(${porcentajeComision}%)` : ''}</p>
                  <p class="text-base font-bold text-purple-600 comision-item-amount">$${comision.comision.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
                </div>
              </div>

              ${comision.observaciones ? `
                <p class="comision-item-note text-xs italic mt-2 p-2 rounded border-l-2">
                  📝 ${comision.observaciones}
                </p>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const acordeonId = `mes-${grupo.clave}-pend`;
    const estaExpandido = obtenerEstadoAcordeon(acordeonId);

    return `
      <div class="mb-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        <!-- Header del mes -->
        <button onclick="toggleGrupoMes('${grupo.clave}-pend')" 
          class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 hover:from-orange-100 hover:to-orange-150 dark:hover:from-orange-900/40 dark:hover:to-orange-800/40 transition-all">
          <div class="flex items-center gap-3">
            <svg id="icono-mes-${grupo.clave}-pend" class="w-5 h-5 text-orange-600 dark:text-orange-400 transition-transform ${estaExpandido ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <div class="text-left">
              <h3 class="font-bold text-gray-900 dark:text-gray-100">${grupo.nombre}</h3>
              <p class="text-xs text-gray-600 dark:text-gray-400">${grupo.comisiones.length} comisión${grupo.comisiones.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-orange-700 dark:text-orange-400">$${grupo.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
            <p class="text-xs text-orange-600 dark:text-orange-500 font-medium">Total del mes</p>
          </div>
        </button>
        
        <!-- Contenido del mes -->
        <div id="grupo-mes-${grupo.clave}-pend" class="p-3 space-y-3 bg-gray-50 dark:bg-gray-900/50 ${estaExpandido ? '' : 'hidden'}">
          ${itemsHTML}
        </div>
      </div>
    `;
  }).join('');
}

// Renderizar lista de comisiones informadas
function renderComisionesInformadas(comisiones) {
  const lista = document.getElementById('lista-comisiones-informadas');
  
  if (!lista) return;

  if (comisiones.length === 0) {
    lista.innerHTML = `
      <div class="text-center modal-comisiones-empty py-8">
        <span class="text-4xl mb-2 block">✅</span>
        <p class="text-sm mb-1 font-medium">No hay comisiones informadas</p>
        <p class="text-xs">Las comisiones notificadas al sistema aparecerán aquí</p>
      </div>
    `;
    return;
  }

  // Agrupar por mes
  const gruposPorMes = agruparComisionesPorMes(comisiones);
  
  // Agregar botón para expandir/contraer todos
  const botonExpandir = `
    <div class="flex justify-end mb-3">
      <button onclick="toggleTodosMeses('informadas')" 
        class="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
        </svg>
        Expandir/Contraer todo
      </button>
    </div>
  `;

  lista.innerHTML = botonExpandir + gruposPorMes.map(grupo => {
    const itemsHTML = grupo.comisiones.map(comision => {
      const fecha = parseFechaLocal(comision.fecha).toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short'
      });

      const fechaInformada = comision.fechaComisionInformada 
        ? (comision.fechaComisionInformada.toDate ? comision.fechaComisionInformada.toDate() : new Date(comision.fechaComisionInformada)).toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short' 
          })
        : '';

      const porcentajeComision = comision.monto && comision.monto > 0 
        ? ((comision.comision / comision.monto) * 100).toFixed(2) 
        : null;

      return `
        <div class="comision-item comision-item-informada rounded-xl p-4 hover:shadow-md transition-all border border-gray-100">
          <div class="flex items-start gap-4">
            <div class="mt-1 w-5 h-5 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <div class="flex-1">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex-1">
                  <h4 class="comision-item-title text-sm font-bold mb-1">${comision.descripcion}</h4>
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="flex items-center gap-1 comision-item-date">
                      📅 ${fecha}
                    </span>
                    ${comision.organizacion ? `
                      <span class="flex items-center gap-1 comision-item-date">
                        🏢 ${comision.organizacion}
                      </span>
                    ` : ''}
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 p-3 rounded-lg comision-montos-container">
                <div class="text-center p-2 rounded comision-monto-box">
                  <p class="text-xs comision-monto-label mb-1">💰 Monto</p>
                  <p class="text-base font-bold comision-monto-value">${comision.monto ? `$${comision.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}` : 'N/A'}</p>
                </div>
                <div class="text-center p-2 rounded comision-comision-box">
                  <p class="text-xs comision-comision-label mb-1">💳 Comisión ${porcentajeComision ? `(${porcentajeComision}%)` : ''}</p>
                  <p class="text-base font-bold text-purple-600 comision-item-amount">$${comision.comision.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
                </div>
              </div>

              ${comision.observaciones ? `
                <p class="comision-item-note text-xs italic mt-2 p-2 rounded border-l-2">
                  📝 ${comision.observaciones}
                </p>
              ` : ''}

              <div class="flex items-center gap-2 mt-2">
                <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold comision-badge comision-badge-informada">
                  ✅ Informada${fechaInformada ? ` el ${fechaInformada}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const acordeonId = `mes-${grupo.clave}-inf`;
    const estaExpandido = obtenerEstadoAcordeon(acordeonId);

    return `
      <div class="mb-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        <!-- Header del mes -->
        <button onclick="toggleGrupoMes('${grupo.clave}-inf')" 
          class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 hover:from-green-100 hover:to-green-150 dark:hover:from-green-900/40 dark:hover:to-green-800/40 transition-all">
          <div class="flex items-center gap-3">
            <svg id="icono-mes-${grupo.clave}-inf" class="w-5 h-5 text-green-600 dark:text-green-400 transition-transform ${estaExpandido ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <div class="text-left">
              <h3 class="font-bold text-gray-900 dark:text-gray-100">${grupo.nombre}</h3>
              <p class="text-xs text-gray-600 dark:text-gray-400">${grupo.comisiones.length} comisión${grupo.comisiones.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-green-700 dark:text-green-400">$${grupo.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
            <p class="text-xs text-green-600 dark:text-green-500 font-medium">Total del mes</p>
          </div>
        </button>
        
        <!-- Contenido del mes -->
        <div id="grupo-mes-${grupo.clave}-inf" class="p-3 space-y-3 bg-gray-50 dark:bg-gray-900/50 ${estaExpandido ? '' : 'hidden'}">
          ${itemsHTML}
        </div>
      </div>
    `;
  }).join('');
}

// Actualizar resumen de comisiones
function actualizarResumenComisiones(comisiones) {
  const total = comisiones.reduce((sum, c) => sum + (c.comision || 0), 0);
  const pendientes = comisiones.filter(c => !c.comisionInformada);
  const totalPendientes = pendientes.reduce((sum, c) => sum + (c.comision || 0), 0);
  const informadas = comisiones.filter(c => c.comisionInformada);
  const totalInformadas = informadas.reduce((sum, c) => sum + (c.comision || 0), 0);

  const elemTotal = document.getElementById('total-comisiones');
  const elemPendientes = document.getElementById('total-comisiones-pendientes');
  const elemInformadas = document.getElementById('total-comisiones-informadas');

  if (elemTotal) elemTotal.textContent = `$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  if (elemPendientes) elemPendientes.textContent = `$${totalPendientes.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  if (elemInformadas) elemInformadas.textContent = `$${totalInformadas.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
}

// Seleccionar todas las comisiones pendientes
function seleccionarTodasComisiones() {
  const checkboxes = document.querySelectorAll('.comision-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
}

// Deseleccionar todas las comisiones
function deseleccionarTodasComisiones() {
  const checkboxes = document.querySelectorAll('.comision-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
}

// Marcar comisiones seleccionadas como informadas
async function marcarComisionesComoInformadas() {
  const checkboxes = document.querySelectorAll('.comision-checkbox:checked');
  
  if (checkboxes.length === 0) {
    mostrarNotificacion('⚠️ Selecciona al menos una comisión para marcar como informada', 'warning');
    return;
  }

  if (!confirm(`¿Marcar ${checkboxes.length} comisión(es) como informadas?`)) {
    return;
  }

  try {
    const batch = db.batch();
    const ahora = firebase.firestore.FieldValue.serverTimestamp();

    checkboxes.forEach(checkbox => {
      const id = checkbox.getAttribute('data-comision-id');
      const ref = db.collection('gastos').doc(id);
      batch.update(ref, {
        comisionInformada: true,
        fechaComisionInformada: ahora,
        informadaPor: usuarioActual
      });
    });

    await batch.commit();
    
    mostrarNotificacion(`✅ ${checkboxes.length} comisión(es) marcadas como informadas`, 'success');
    
    // Recargar comisiones
    await cargarComisiones();

  } catch (error) {
    console.error('Error al marcar comisiones:', error);
    mostrarNotificacion('❌ Error al marcar las comisiones: ' + error.message, 'error');
  }
}

// Función para excluir comisiones del modal (ocultar permanentemente)
async function excluirComisionesSeleccionadas() {
  const checkboxes = document.querySelectorAll('.comision-checkbox:checked');
  
  if (checkboxes.length === 0) {
    mostrarNotificacion('⚠️ Selecciona al menos una comisión para excluir', 'warning');
    return;
  }

  if (!confirm(`¿Excluir ${checkboxes.length} comisión(es) del modal de MercadoLibre?\n\nEstas comisiones no se mostrarán más en este modal, pero seguirán en el historial de gastos.`)) {
    return;
  }

  try {
    const batch = db.batch();

    checkboxes.forEach(checkbox => {
      const id = checkbox.getAttribute('data-comision-id');
      const ref = db.collection('gastos').doc(id);
      batch.update(ref, {
        comisionExcluida: true,
        fechaComisionExcluida: firebase.firestore.FieldValue.serverTimestamp(),
        excluidaPor: usuarioActual
      });
    });

    await batch.commit();
    
    mostrarNotificacion(`✅ ${checkboxes.length} comisión(es) excluidas del modal`, 'success');
    
    // Recargar comisiones
    await cargarComisiones();

  } catch (error) {
    console.error('Error al excluir comisiones:', error);
    mostrarNotificacion('❌ Error al excluir las comisiones: ' + error.message, 'error');
  }
}

// ==================== MODAL GASTOS EXTERNOS ====================
// Abrir modal de gastos externos
async function abrirModalGastosExternos() {
  const modal = document.getElementById('modal-gastos-externos');
  if (!modal) {
    console.error('❌ Modal de gastos externos no encontrado');
    return;
  }

  try {
    modal.classList.remove('hidden');

    // Obtener todos los gastos externos
    const gastosSnapshot = await db.collection('gastos').get();
    const gastosExternos = gastosSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(gasto => {
        if (gasto.eliminado) return false;
        if (!ORGANIZACIONES_EXTERNAS.includes(gasto.organizacion)) return false;
        if (!gasto.fecha) return false;
        const anio = gasto.fecha.substring(0, 4);
        return anio === String(new Date().getFullYear());
      });

    // Ordenar por fecha (más recientes primero)
    gastosExternos.sort((a, b) => {
      const fechaA = a.fecha ? parseFechaLocal(a.fecha) : new Date(0);
      const fechaB = b.fecha ? parseFechaLocal(a.fecha) : new Date(0);
      return fechaB - fechaA;
    });

    // Agrupar por organización
    const gastosAgrupados = {};
    ORGANIZACIONES_EXTERNAS.forEach(org => {
      gastosAgrupados[org] = gastosExternos.filter(g => g.organizacion === org);
    });

    // Calcular totales
    const totalGastosExternos = gastosExternos.reduce((sum, g) => sum + (g.monto || 0), 0);
    const cantidadGastos = gastosExternos.length;
    const organizacionesActivas = ORGANIZACIONES_EXTERNAS.filter(org => gastosAgrupados[org].length > 0).length;

    // Actualizar KPIs
    document.getElementById('kpi-total-externos').textContent = 
      `$${totalGastosExternos.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    
    document.getElementById('kpi-cantidad-externos').textContent = cantidadGastos;
    
    document.getElementById('kpi-organizaciones-externas').textContent = organizacionesActivas;

    document.getElementById('subtitulo-gastos-externos').textContent = 
      `${cantidadGastos} gasto${cantidadGastos !== 1 ? 's' : ''} externos en ${new Date().getFullYear()}`;

    // Renderizar gastos por organización
    const contenido = document.getElementById('contenido-gastos-externos');
    
    if (gastosExternos.length === 0) {
      contenido.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
          </svg>
          <p class="text-lg font-medium">No hay gastos externos registrados</p>
          <p class="text-sm mt-1">Los gastos de meetup, pfj y area aparecerán aquí</p>
        </div>
      `;
    } else {
      let html = '';
      
      ORGANIZACIONES_EXTERNAS.forEach(org => {
        const gastosOrg = gastosAgrupados[org];
        if (gastosOrg.length > 0) {
          const totalOrg = gastosOrg.reduce((sum, g) => sum + (g.monto || 0), 0);
          const nombreOrg = org.charAt(0).toUpperCase() + org.slice(1).replace(/-/g, ' ');
          
          html += `
            <div class="mb-6">
              <div class="flex items-center justify-between mb-3 pb-2 border-b-2 border-blue-200">
                <h4 class="text-lg font-bold text-gray-800">${nombreOrg}</h4>
                <span class="text-lg font-bold text-blue-600">$${totalOrg.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
              </div>
              <div class="grid grid-cols-1 gap-3">
                ${gastosOrg.map(gasto => crearTarjetaGastoExterno(gasto)).join('')}
              </div>
            </div>
          `;
        }
      });
      
      contenido.innerHTML = html;
    }
  } catch (error) {
    console.error('❌ Error al cargar gastos externos:', error);
    mostrarNotificacion('Error al cargar gastos externos', 'error');
  }
}

// Crear tarjeta de gasto externo
function crearTarjetaGastoExterno(gasto) {
  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos', color: 'green' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto', color: 'orange' }
  };

  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria, color: 'gray' };
  
  const comprobanteIcon = gasto.comprobanteAdjunto 
    ? '<span class="text-green-500 text-xs">✓ Con comprobante</span>' 
    : '<span class="text-gray-400 text-xs">Sin comprobante</span>';

  const estadoRegistro = gasto.registrado 
    ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Registrado</span>'
    : '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">⏳ Sin registrar</span>';

  const montoTotal = gasto.monto || 0;
  const comision = gasto.comision || 0;
  const montoNeto = montoTotal - comision;

  return `
    <div class="bg-white border border-blue-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-${cat.color}-100 text-${cat.color}-700">
              ${cat.emoji} ${cat.label}
            </span>
            <span class="text-xs text-gray-500">📅 ${gasto.fecha}</span>
            ${estadoRegistro}
          </div>
          
          <h4 class="text-base font-semibold text-gray-900 mb-2">${gasto.descripcion}</h4>
          
          <div class="flex items-center gap-2 text-sm mb-2">
            ${comprobanteIcon}
          </div>

          ${gasto.observaciones ? `
            <div class="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <p class="text-xs text-blue-700"><strong>📋 Observaciones:</strong> ${gasto.observaciones}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="flex-shrink-0 text-right">
          <div class="mb-2">
            <p class="text-xs text-gray-500">Monto Total</p>
            <p class="text-2xl font-bold text-blue-600">$${montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          ${comision > 0 ? `
            <div class="p-2 bg-red-50 rounded-lg">
              <p class="text-xs text-red-600">Incluye comisión: $${comision.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Cerrar modal de gastos externos
function cerrarModalGastosExternos() {
  const modal = document.getElementById('modal-gastos-externos');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ==================== MODAL VIÁTICOS ====================
async function abrirModalViaticos() {
  const modal = document.getElementById('modal-viaticos');
  if (!modal) return;
  modal.classList.remove('hidden');

  const lista = document.getElementById('lista-gastos-viaticos');
  const kpiTotal = document.getElementById('kpi-total-viaticos');
  const kpiCantidad = document.getElementById('kpi-cantidad-viaticos');
  lista.innerHTML = '<p class="text-center text-gray-400 py-8">Cargando...</p>';

  try {
    const snap = await db.collection('gastos')
      .where('eliminado', '==', false)
      .where('categoria', '==', 'viaticos')
      .where('registrado', '==', true)
      .get();

    const gastos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const fa = parseFechaLocal(a.fecha), fb = parseFechaLocal(b.fecha);
        return fb - fa;
      });

    const total = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    if (kpiTotal) kpiTotal.textContent = '$' + total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (kpiCantidad) kpiCantidad.textContent = gastos.length;

    if (gastos.length === 0) {
      lista.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-lg font-medium">Sin viáticos reportados</p></div>';
      return;
    }

    lista.innerHTML = gastos.map(g => {
      const fecha = g.fecha ? g.fecha.split('-').reverse().join('/') : '—';
      const monto = '$' + (g.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
      const org = g.organizacion || '—';
      const desc = g.descripcion || '—';
      return `<div class="flex items-start justify-between py-3 border-b border-gray-100 last:border-0 gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-800 truncate">${desc}</p>
          <p class="text-xs text-gray-400 mt-0.5">${fecha} · ${org}</p>
        </div>
        <span class="text-sm font-bold text-purple-600 whitespace-nowrap">${monto}</span>
      </div>`;
    }).join('');

  } catch (err) {
    console.error('Error cargando viáticos:', err);
    lista.innerHTML = '<p class="text-center text-red-400 py-8">Error al cargar</p>';
  }
}

function cerrarModalViaticos() {
  const modal = document.getElementById('modal-viaticos');
  if (modal) modal.classList.add('hidden');
}

// ==================== MODAL GASTOS PRESUPUESTO POR ORGANIZACIÓN ====================
async function abrirModalGastosPorOrg() {
  const modal = document.getElementById('modal-gastos-por-org');
  if (!modal) return;
  modal.classList.remove('hidden');

  const lista = document.getElementById('lista-presupuesto-por-org');
  const kpiTotal = document.getElementById('kpi-total-presupuesto-org');
  const kpiCantidad = document.getElementById('kpi-cantidad-presupuesto-org');
  lista.innerHTML = '<p class="text-center text-gray-400 py-8">Cargando...</p>';

  try {
    // Calcular límites del trimestre actual
    const _ahora = new Date();
    const _trim = Math.floor(_ahora.getMonth() / 3);
    const _iniT = new Date(_ahora.getFullYear(), _trim * 3, 1);
    const _finT = new Date(_ahora.getFullYear(), _trim * 3 + 3, 0, 23, 59, 59);

    const snap = await db.collection('gastos')
      .where('eliminado', '==', false)
      .where('categoria', '==', 'presupuesto')
      .get();

    const gastos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(g => {
        if (!g.registrado) return false;
        // Solo reportados cuya fecha cae en el trimestre actual
        const f = parseFechaLocal(g.fecha);
        return f >= _iniT && f <= _finT;
      })
      .sort((a, b) => {
        const fa = parseFechaLocal(a.fecha), fb = parseFechaLocal(b.fecha);
        return fb - fa;
      });

    const total = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    if (kpiTotal) kpiTotal.textContent = '$' + total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (kpiCantidad) kpiCantidad.textContent = gastos.length;

    if (gastos.length === 0) {
      lista.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-lg font-medium">Sin gastos de presupuesto</p></div>';
      return;
    }

    // Agrupar por organización
    const porOrg = {};
    gastos.forEach(g => {
      const org = g.organizacion || 'Sin Organización';
      if (!porOrg[org]) porOrg[org] = { gastos: [], total: 0 };
      porOrg[org].gastos.push(g);
      porOrg[org].total += g.monto || 0;
    });

    const orgsOrdenadas = Object.entries(porOrg).sort(([, a], [, b]) => b.total - a.total);

    lista.innerHTML = orgsOrdenadas.map(([org, data]) => {
      const orgTotal = '$' + data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 });
      const items = data.gastos.slice(0, 5).map(g => {
        const fecha = g.fecha ? g.fecha.split('-').reverse().join('/') : '—';
        const monto = '$' + (g.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
        const estado = g.registrado ? '<span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Reportado</span>' : '<span class="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-semibold">Pendiente</span>';
        return `<div class="flex items-center justify-between py-2 pl-4 border-l-2 border-blue-100 gap-2">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-gray-700 truncate">${g.descripcion || '—'}</p>
            <p class="text-[10px] text-gray-400">${fecha} ${estado}</p>
          </div>
          <span class="text-xs font-bold text-gray-800 whitespace-nowrap">${monto}</span>
        </div>`;
      }).join('');
      const masGastos = data.gastos.length > 5 ? `<p class="text-xs text-gray-400 pl-4 py-1">+${data.gastos.length - 5} gastos más…</p>` : '';

      return `<div class="mb-5 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-sm font-bold text-gray-800 capitalize">${org.replace(/-/g, ' ')}</h4>
          <span class="text-sm font-bold text-blue-600">${orgTotal}</span>
        </div>
        <div class="space-y-1">${items}</div>
        ${masGastos}
      </div>`;
    }).join('');

  } catch (err) {
    console.error('Error cargando gastos por org:', err);
    lista.innerHTML = '<p class="text-center text-red-400 py-8">Error al cargar</p>';
  }
}

function cerrarModalGastosPorOrg() {
  const modal = document.getElementById('modal-gastos-por-org');
  if (modal) modal.classList.add('hidden');
}

// ==================== RECUPERAR GASTOS ELIMINADOS ====================
async function cargarGastosEliminados() {
  const lista = document.getElementById('lista-gastos-eliminados');
  if (!lista) return;
  lista.innerHTML = '<p class="text-center text-yellow-300/60 text-xs py-4">Buscando...</p>';

  try {
    const snap = await db.collection('gastos').where('eliminado', '==', true).get();
    if (snap.empty) {
      lista.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">No hay gastos eliminados</p>';
      return;
    }

    const gastos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const fa = a.fecha ? parseFechaLocal(a.fecha) : new Date(0);
        const fb = b.fecha ? parseFechaLocal(b.fecha) : new Date(0);
        return fb - fa;
      });

    lista.innerHTML = gastos.map(g => {
      const fecha = g.fecha ? g.fecha.split('-').reverse().join('/') : '—';
      const monto = '$' + (g.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
      const cat = g.categoria || '—';
      const desc = g.descripcion || 'Sin descripción';
      return `<div class="flex items-center justify-between bg-[#1e1a0e] border border-yellow-700/30 rounded-xl px-3 py-2.5 gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-gray-200 truncate">${desc}</p>
          <p class="text-[10px] text-gray-400">${fecha} · ${cat} · <span class="font-bold text-yellow-400">${monto}</span></p>
        </div>
        <button onclick="restaurarGasto('${g.id}')" class="flex-shrink-0 bg-yellow-600 hover:bg-yellow-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all">
          Restaurar
        </button>
      </div>`;
    }).join('');

  } catch (err) {
    console.error('Error cargando gastos eliminados:', err);
    lista.innerHTML = '<p class="text-center text-red-400 text-xs py-4">Error al cargar</p>';
  }
}

async function restaurarGasto(id) {
  try {
    await db.collection('gastos').doc(id).update({
      eliminado: false,
      fechaEliminacion: null,
      eliminadoPor: null
    });
    mostrarNotificacion('✅ Gasto restaurado correctamente', 'success');
    // Refrescar la lista
    await cargarGastosEliminados();
    await calcularGastos();
    await cargarGastosSeparados();
  } catch (err) {
    console.error('Error restaurando gasto:', err);
    mostrarNotificacion('❌ Error al restaurar: ' + err.message, 'error');
  }
}

window.abrirModalGastosExternos = abrirModalGastosExternos;
window.cerrarModalGastosExternos = cerrarModalGastosExternos;
window.mostrarModalComisiones = mostrarModalComisiones;
window.cerrarModalComisiones = cerrarModalComisiones;
window.cambiarTabComisiones = cambiarTabComisiones;
window.seleccionarTodasComisiones = seleccionarTodasComisiones;
window.deseleccionarTodasComisiones = deseleccionarTodasComisiones;
window.marcarComisionesComoInformadas = marcarComisionesComoInformadas;
window.excluirComisionesSeleccionadas = excluirComisionesSeleccionadas;
window.toggleGrupoMes = toggleGrupoMes;
window.toggleTodosMeses = toggleTodosMeses;
window.toggleVerMasOrganizaciones = toggleVerMasOrganizaciones;
window.mostrarTrimestreArchivado = mostrarTrimestreArchivado;
window.cerrarModalTrimestreArchivado = cerrarModalTrimestreArchivado;

// ==================== CALCULAR EVOLUCIÓN TEMPORAL DE GASTOS ====================
async function calcularEvolucionGastos(gastos) {
  const mesesGastos = Array(12).fill(0);
  const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Acumular gastos por mes
  gastos.forEach(gasto => {
    if (gasto.fecha) {
      const fecha = parseFechaLocal(gasto.fecha);
      const mes = fecha.getMonth();
      mesesGastos[mes] += gasto.monto || 0;
    }
  });

  // Calcular total del año para validar coherencia
  const totalAnual = mesesGastos.reduce((sum, gasto) => sum + gasto, 0);


  // Calcular gastos por trimestre para móviles
  const trimestresGastos = [
    mesesGastos[0] + mesesGastos[1] + mesesGastos[2],  // Q1: Ene-Mar
    mesesGastos[3] + mesesGastos[4] + mesesGastos[5],  // Q2: Abr-Jun
    mesesGastos[6] + mesesGastos[7] + mesesGastos[8],  // Q3: Jul-Sep
    mesesGastos[9] + mesesGastos[10] + mesesGastos[11] // Q4: Oct-Dic
  ];

  // Obtener presupuesto total como referencia del eje Y
  let presupuestoTotal = 0;
  let config = {};
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    if (configDoc.exists) {
      config = configDoc.data();
      presupuestoTotal = config.presupuestoTotal || 0;
    }
  } catch (error) {
    console.error('Error al obtener presupuesto para gráfico:', error);
  }

  // Actualizar etiquetas de presupuesto por trimestre en la vista Desktop y Móvil
  const anioActual = new Date().getFullYear();
  const trimestreVigente = calcularTrimestreActual().numero;
  const presupuestosTrimestres = config.presupuestosTrimestres || {};

  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`label-q${i}`);
    const elM = document.getElementById(`label-m-q${i}`);
    const formatPto = (pto) => `$${pto >= 1000000 ? (pto/1000000).toFixed(1).replace('.0','') + 'M' : pto >= 1000 ? (pto/1000).toFixed(0) + 'k' : pto}`;
    
    const pto = presupuestosTrimestres[`Q${i}-${anioActual}`];
    let texto = `Q${i}: -`;
    let textoM = `-`;
    
    if (pto !== undefined) {
      if (document.body.clientWidth < 1024) {
        texto = `Q${i}: ${formatPto(pto)}`;
      } else {
        texto = `Q${i}: $${pto.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
      }
      textoM = `${formatPto(pto)}`;
    } else if (i === trimestreVigente && presupuestoTotal > 0) {
      if (document.body.clientWidth < 1024) {
        texto = `Q${i}: ${formatPto(presupuestoTotal)}`;
      } else {
        texto = `Q${i}: $${presupuestoTotal.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
      }
      textoM = `${formatPto(presupuestoTotal)}`;
    }
    
    if (el) el.textContent = texto;
    if (elM) elM.textContent = textoM;
  }

  // Actualizar gráfico de MESES (Desktop/Tablet)
  const chartMeses = document.getElementById('chart-evolucion-meses');
  if (chartMeses) {
    const barrasMeses = chartMeses.querySelectorAll('[data-mes]');
    actualizarBarras(barrasMeses, mesesGastos, nombresMeses, presupuestoTotal, 'mes');
  }

  // Actualizar gráfico de TRIMESTRES (Móvil)
  const chartTrimestres = document.getElementById('chart-evolucion-trimestres');
  if (chartTrimestres) {
    const barrasTrimestres = chartTrimestres.querySelectorAll('[data-trimestre]');
    const nombresTrimestres = ['Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)'];
    actualizarBarras(barrasTrimestres, trimestresGastos, nombresTrimestres, presupuestoTotal * 3, 'trimestre');
  }
}

// Función auxiliar para actualizar barras (meses o trimestres)
function actualizarBarras(barras, datos, nombres, presupuestoRef, tipo) {
  if (!barras || barras.length === 0) return;
  
  // Ajustar alturas mínimas según el tipo
  const alturaMinSinDatos = tipo === 'trimestre' ? 12 : 4;
  const alturaMinConDatos = tipo === 'trimestre' ? 18 : 8;
  const minHeightPx = tipo === 'trimestre' ? '16px' : '6px';

  if (presupuestoRef === 0) {
    // Sin presupuesto configurado: usar escala relativa
    const maxGasto = Math.max(...datos, 1);
    
    barras.forEach((barra, index) => {
      const gasto = datos[index];
      const altura = gasto > 0 ? Math.max(alturaMinConDatos, (gasto / maxGasto) * 100) : alturaMinSinDatos;
      const color = gasto > 0 ? '#3b82f6' : '#e5e7eb';
      
      barra.style.height = `${altura}%`;
      barra.style.minHeight = minHeightPx;
      barra.style.backgroundColor = color;
      barra.title = gasto === 0 
        ? `${nombres[index]} '26: Sin movimientos` 
        : `${nombres[index]} '26: $${gasto.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} (comparativo)`;
    });
  } else {
    // Con presupuesto: usar como referencia absoluta

    
    barras.forEach((barra, index) => {
      const gasto = datos[index];
      
      if (gasto === 0) {
        barra.style.height = `${alturaMinSinDatos}%`;
        barra.style.minHeight = minHeightPx;
        barra.style.backgroundColor = '#e5e7eb';
        barra.title = `${nombres[index]} '26: Sin movimientos`;
      } else {
        const porcentajePresupuesto = (gasto / presupuestoRef) * 100;
        const altura = Math.max(alturaMinConDatos, Math.min(100, porcentajePresupuesto));
        
        // Color según nivel de gasto
        let color = '#3b82f6';
        if (porcentajePresupuesto >= 80) {
          color = '#ef4444';
        } else if (porcentajePresupuesto >= 50) {
          color = '#f59e0b';
        } else if (porcentajePresupuesto >= 30) {
          color = '#3b82f6';
        } else {
          color = '#10b981';
        }
        
        barra.style.height = `${altura}%`;
        barra.style.minHeight = minHeightPx;
        barra.style.backgroundColor = color;
        barra.title = `${nombres[index]} '26: $${gasto.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} (${porcentajePresupuesto.toFixed(1)}% del presupuesto)`;
      }
    });
  }
}

async function cargarGastos() {
  try {
    const gastosSnapshot = await db.collection('gastos').orderBy('fecha', 'desc').get();
    const gastos = [];
    
    gastosSnapshot.forEach(doc => {
      gastos.push({ id: doc.id, ...doc.data() });
    });

    renderGastos(gastos);
  } catch (error) {
    console.error('Error al cargar gastos:', error);
    mostrarNotificacion('❌ Error al cargar gastos', 'error');
  }
}

// ==================== PANEL DE ADMINISTRADOR ====================
document.getElementById('btn-panel-admin')?.addEventListener('click', async () => {
  if (!esAdmin) {
    mostrarNotificacion('❌ No tienes permisos de administrador', 'error');
    return;
  }
  
  try {
    // Cargar valores actuales
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    const config = configDoc.data();
    
    document.getElementById('admin-presupuesto').value = config.presupuestoTotal || 0;
    document.getElementById('admin-viaticos').value = config.presupuestoViaticos || 0;
    
    document.getElementById('modal-admin').classList.remove('hidden');
  } catch (error) {
    console.error('Error al abrir panel admin:', error);
  }
});

function cerrarModalAdmin() {
  document.getElementById('modal-admin').classList.add('hidden');
}

function cerrarModal() {
  editandoGastoId = null; // Resetear ID de edición
  document.getElementById('modal-gasto').classList.add('hidden');
  document.getElementById('form-gasto').reset();
  
  // Limpiar captura OCR
  limpiarCaptura();
  
  // Resetear checkboxes de comisión
  const containerIncluye = document.getElementById('container-incluye-comision');
  if (containerIncluye) {
    containerIncluye.classList.add('hidden');
    containerIncluye.classList.remove('flex');
  }
  
  // Resetear título del modal
  document.getElementById('modal-title').innerHTML = '<span class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-200"><svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></span><span>Nuevo Gasto</span>';
}

// Guardar presupuesto
document.getElementById('form-editar-presupuesto')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nuevoPresupuesto = parseFloat(document.getElementById('admin-presupuesto').value);
  
  try {
    const trimestre = calcularTrimestreActual();
    const updateData = {
      presupuestoTotal: nuevoPresupuesto,
      fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };
    updateData[`presupuestosTrimestres.${trimestre.id}`] = nuevoPresupuesto;

    await db.collection('configuracion').doc('sistema').update(updateData);
    
    mostrarNotificacion('✅ Presupuesto actualizado correctamente', 'success');
    await cargarPresupuestos();
  } catch (error) {
    console.error('Error al actualizar presupuesto:', error);
    mostrarNotificacion('❌ Error al actualizar presupuesto', 'error');
  }
});

// Guardar viáticos
document.getElementById('form-editar-viaticos')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nuevosViaticos = parseFloat(document.getElementById('admin-viaticos').value);
  
  try {
    await db.collection('configuracion').doc('sistema').update({
      presupuestoViaticos: nuevosViaticos,
      fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    mostrarNotificacion('✅ Viáticos actualizados correctamente', 'success');
    await cargarPresupuestos();
  } catch (error) {
    console.error('Error al actualizar viáticos:', error);
    mostrarNotificacion('❌ Error al actualizar viáticos', 'error');
  }
});

// Cambiar PINs
document.getElementById('form-cambiar-pins')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nuevoUsuario = document.getElementById('admin-pin-usuario').value;
  const nuevoAdmin = document.getElementById('admin-pin-admin').value;
  
  if (nuevoUsuario.length < 4 || nuevoAdmin.length < 4) {
    mostrarNotificacion('❌ Los PINs deben tener al menos 4 caracteres', 'error');
    return;
  }
  
  if (nuevoUsuario === nuevoAdmin) {
    mostrarNotificacion('❌ Los PINs no pueden ser iguales', 'error');
    return;
  }
  
  try {
    await db.collection('configuracion').doc('sistema').update({
      pinUsuario: nuevoUsuario,
      pinAdmin: nuevoAdmin,
      fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    mostrarNotificacion('✅ PINs actualizados correctamente. Usa los nuevos PINs en el próximo inicio de sesión.', 'success');
    document.getElementById('form-cambiar-pins').reset();
  } catch (error) {
    console.error('Error al actualizar PINs:', error);
    mostrarNotificacion('❌ Error al actualizar PINs', 'error');
  }
});

// ==================== GESTIÓN DE GASTOS ====================
let editandoId = null;
let archivoTemporal = null;

document.getElementById('btn-nuevo-gasto')?.addEventListener('click', () => {
  abrirModalGasto();
});

function abrirModalGasto(gasto = null) {
  editandoId = gasto ? gasto.id : null;
  const modal = document.getElementById('modal-gasto');
  const title = document.getElementById('modal-title');

  if (gasto) {
    title.textContent = 'Editar Gasto';
    document.getElementById('gasto-detalle').value = gasto.detalle;
    document.getElementById('gasto-monto').value = gasto.monto;
    document.getElementById('gasto-categoria').value = gasto.categoria;
    document.getElementById('gasto-observacion').value = gasto.observacion || '';

    if (gasto.tieneComprobante && gasto.nombreArchivo) {
      archivoTemporal = gasto.nombreArchivo;
      document.getElementById('file-name').textContent = gasto.nombreArchivo;
      document.getElementById('drag-placeholder').classList.add('hidden');
      document.getElementById('file-preview').classList.remove('hidden');
    }
  } else {
    title.textContent = 'Nuevo Gasto';
    document.getElementById('form-gasto').reset();
    removerArchivo();
  }

  modal.classList.remove('hidden');
}

function cerrarModalGasto() {
  document.getElementById('modal-gasto').classList.add('hidden');
  document.getElementById('form-gasto').reset();
  editandoId = null;
  archivoTemporal = null;
  removerArchivo();
}

// File handling
const dragArea = document.getElementById('drag-area');
const fileInput = document.getElementById('gasto-archivo');

if (dragArea && fileInput) {
  dragArea.addEventListener('click', () => fileInput.click());

  dragArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragArea.classList.add('drag-over');
  });

  dragArea.addEventListener('dragleave', () => {
    dragArea.classList.remove('drag-over');
  });

  dragArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      mostrarPreviewArchivo(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      mostrarPreviewArchivo(e.target.files[0]);
    }
  });
}

function mostrarPreviewArchivo(file) {
  archivoTemporal = file.name;
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('drag-placeholder').classList.add('hidden');
  document.getElementById('file-preview').classList.remove('hidden');
}

function removerArchivo() {
  archivoTemporal = null;
  if (fileInput) fileInput.value = '';
  const filePreview = document.getElementById('file-preview');
  const dragPlaceholder = document.getElementById('drag-placeholder');
  if (filePreview) filePreview.classList.add('hidden');
  if (dragPlaceholder) dragPlaceholder.classList.remove('hidden');
}

function toggleOpcionIncluyeComision() {
  const checkboxAplica = document.getElementById('aplica-comision');
  const containerIncluye = document.getElementById('container-incluye-comision');
  
  if (checkboxAplica && checkboxAplica.checked) {
    containerIncluye.classList.remove('hidden');
    containerIncluye.classList.add('flex');
  } else {
    containerIncluye.classList.add('hidden');
    containerIncluye.classList.remove('flex');
    // Reiniciar el check de incluye si se desmarca aplica
    const checkboxIncluye = document.getElementById('incluye-comision');
    if (checkboxIncluye) checkboxIncluye.checked = false;
  }
}
window.toggleOpcionIncluyeComision = toggleOpcionIncluyeComision;

// ==================== CONFIGURAR EVENT LISTENERS ====================
function configurarEventListeners() {
  // Formulario de nuevo gasto
  const formGasto = document.getElementById('form-gasto');
  if (formGasto) {
    formGasto.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const btnGuardar = document.getElementById('btn-guardar');
      if (!btnGuardar) {
        console.error('❌ Botón guardar no encontrado');
        return;
      }

      const textoOriginal = btnGuardar.innerHTML;
      btnGuardar.disabled = true;
      btnGuardar.innerHTML = '⏳ Guardando...';

      try {
        if (!db) {
          throw new Error('Firebase no está inicializado');
        }

        const observaciones = document.getElementById('observaciones').value.trim();
        const organizacion = document.getElementById('organizacion')?.value || 'presupuesto';
        
        // Lógica de comisión
        const montoInput = parseFloat(document.getElementById('monto').value);
        const aplicaComision = document.getElementById('aplica-comision')?.checked || false;
        const incluyeComision = document.getElementById('incluye-comision')?.checked || false;
        
        let montoReal = montoInput;
        let montoComision = 0;
        
        if (aplicaComision) {
            if (incluyeComision) {
                // Monto input es el total (Real + Comision)
                // Total = Real * 1.0699 -> Real = Total / 1.0699
                montoReal = montoInput / 1.0699;
                montoComision = montoInput - montoReal;
            } else {
                // Monto input es el real, se agrega la comision
                montoReal = montoInput;
                montoComision = montoReal * 0.0699;
            }
        }

        // Obtener tipo de pago seleccionado (null si no se seleccionó ninguno)
        const tipoPagoSeleccionado = document.querySelector('input[name="tipoPago"]:checked')?.value || null;

        // Subir imagen del recibo si existe
        let urlImagenSubida = null;
        if (imagenReciboCapturada) {
          try {
            const gastoId = editandoGastoId || `temp_${Date.now()}`;
            const fileName = `recibos/${gastoId}_${Date.now()}.jpg`;
            const storageRef = storage.ref(fileName);
            
            const snapshot = await storageRef.put(imagenReciboCapturada);
            urlImagenSubida = await snapshot.ref.getDownloadURL();
          } catch (error) {
            console.error('⚠️ Error al subir imagen:', error);
            // Continuar sin la imagen
          }
        }

        const gasto = {
          descripcion: document.getElementById('descripcion').value,
          monto: montoReal,
          comision: montoComision,
          tieneComision: aplicaComision,
          fecha: document.getElementById('fecha').value,
          categoria: document.getElementById('categoria').value,
          organizacion: organizacion,
          comprobanteAdjunto: document.getElementById('comprobante').checked,
          tipoPago: tipoPagoSeleccionado,
          reembolsado: tipoPagoSeleccionado === 'reembolsado',
          observaciones: observaciones || '',
          imagenRecibo: urlImagenSubida || null,
          registrado: false,
          eliminado: false,
          creadoPor: usuarioActual,
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        };

  
        // Si estamos editando, actualizamos; si no, creamos
        if (editandoGastoId) {
          // Actualizar gasto existente
          const datosActualizados = {
            ...gasto,
            fechaEdicion: firebase.firestore.FieldValue.serverTimestamp(),
            editadoPor: usuarioActual
          };
          
          await db.collection('gastos').doc(editandoGastoId).update(datosActualizados);
          mostrarNotificacion('✅ Gasto actualizado correctamente', 'success');
        } else {
          // Crear nuevo gasto
          const docRef = await db.collection('gastos').add(gasto);
          mostrarNotificacion('✅ Gasto guardado correctamente', 'success');
        }

        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;

        cerrarModal();
        await cargarDatos(); // Recargar todos los datos para reflejar cambios

      } catch (error) {
        console.error('❌ Error al guardar gasto:', error);
        mostrarNotificacion('❌ Error al guardar el gasto: ' + error.message, 'error');
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;
      }
    });
  } else {
    console.error('❌ Formulario de gasto no encontrado');
  }
}

// ==================== GESTIÓN DE GASTOS ====================
// Aprobar/Registrar gasto (solo admin)
async function toggleRegistrado(id, nuevoEstado) {
  if (!esAdmin) {
    mostrarNotificacion('❌ Solo el administrador puede registrar gastos', 'error');
    return;
  }

  try {
    await db.collection('gastos').doc(id).update({
      registrado: nuevoEstado,
      fechaRegistro: nuevoEstado ? firebase.firestore.FieldValue.serverTimestamp() : null,
      registradoPor: nuevoEstado ? usuarioActual : null
    });

    mostrarNotificacion(nuevoEstado ? '✅ Gasto marcado como registrado' : '⚠️ Gasto desmarcado', 'success');

  } catch (error) {
    console.error('Error al actualizar estado:', error);
    mostrarNotificacion('❌ Error al actualizar el estado', 'error');
  }
}

// Marcar gasto como reportado (checkbox en pendientes)
async function marcarComoReportado(id) {
  if (!esAdmin) {
    mostrarNotificacion('❌ Solo el administrador puede marcar gastos como reportados', 'error');
    return;
  }

  try {
    await db.collection('gastos').doc(id).update({
      registrado: true,
      fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
      registradoPor: usuarioActual
    });

    mostrarNotificacion('✅ Gasto registrado y movido a pendientes de aprobación', 'success');
    
    // Recargar gastos separados para actualizar ambas secciones
    await cargarGastosSeparados();
    await calcularGastos();
    await calcularEstadisticasDashboard();

  } catch (error) {
    console.error('Error al marcar como reportado:', error);
    mostrarNotificacion('❌ Error al marcar el gasto: ' + error.message, 'error');
  }
}

// Exponer función globalmente
window.marcarComoReportado = marcarComoReportado;

// Toggle estado de reembolso
// Función para seleccionar tipo de pago (permite cambiar o eliminar la selección)
async function seleccionarTipoPago(id) {
  const result = await Swal.fire({
    title: '¿Tipo de pago?',
    text: 'Selecciona el tipo de transacción o desmarca',
    icon: 'question',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: '💵 Pago Directo',
    denyButtonText: '✅ Reembolsado',
    cancelButtonText: '❌ Sin definir',
    confirmButtonColor: '#10b981',
    denyButtonColor: '#10b981',
    cancelButtonColor: '#f59e0b',
    allowOutsideClick: false
  });

  let tipoPagoSeleccionado = null;
  let actualizar = false;
  
  if (result.isConfirmed) {
    tipoPagoSeleccionado = 'pagoDirecto';
    actualizar = true;
  } else if (result.isDenied) {
    tipoPagoSeleccionado = 'reembolsado';
    actualizar = true;
  } else if (result.dismiss === Swal.DismissReason.cancel) {
    // Usuario seleccionó "Sin definir" - establecer como null
    tipoPagoSeleccionado = null;
    actualizar = true;
  }

  if (actualizar) {
    try {
      await db.collection('gastos').doc(id).update({
        tipoPago: tipoPagoSeleccionado,
        reembolsado: tipoPagoSeleccionado === 'reembolsado',
        fechaReembolso: tipoPagoSeleccionado === 'reembolsado' ? firebase.firestore.FieldValue.serverTimestamp() : null,
        reembolsadoPor: tipoPagoSeleccionado === 'reembolsado' ? usuarioActual : null
      });
      
      if (tipoPagoSeleccionado === 'reembolsado') {
        mostrarNotificacion('✅ Marcado como Reembolsado', 'success');
      } else if (tipoPagoSeleccionado === 'pagoDirecto') {
        mostrarNotificacion('💵 Marcado como Pago Directo', 'success');
      } else {
        mostrarNotificacion('❓ Tipo de pago sin definir', 'info');
      }
      
      await cargarGastosSeparados();
    } catch (error) {
      console.error('Error al actualizar tipo de pago:', error);
      mostrarNotificacion('❌ Error al actualizar el tipo de pago: ' + error.message, 'error');
    }
  }
}

// Función para alternar entre tipos de pago
async function toggleReembolso(id, nuevoEstado) {
  try {
    await db.collection('gastos').doc(id).update({
      reembolsado: nuevoEstado,
      tipoPago: nuevoEstado ? 'reembolsado' : 'pagoDirecto',
      fechaReembolso: nuevoEstado ? firebase.firestore.FieldValue.serverTimestamp() : null,
      reembolsadoPor: nuevoEstado ? usuarioActual : null
    });

    mostrarNotificacion(nuevoEstado ? '✅ Marcado como Reembolsado' : '💵 Marcado como Pago Directo', 'success');
    
    // Recargar gastos separados
    await cargarGastosSeparados();

  } catch (error) {
    console.error('Error al actualizar tipo de pago:', error);
    mostrarNotificacion('❌ Error al actualizar el tipo de pago: ' + error.message, 'error');
  }
}

window.seleccionarTipoPago = seleccionarTipoPago;
window.toggleReembolso = toggleReembolso;

// Variable para trackear el botón de eliminar activo
let botonEliminarActivo = null;
let timeoutEliminar = null;
let clickHandlerActivo = null;

// Función para resetear el botón de eliminar
function resetearBotonEliminar(btn) {
  if (btn && btn.textContent.includes('Confirmar')) {
    btn.innerHTML = '<span>🗑️</span> Eliminar';
    btn.classList.remove('bg-orange-600', 'hover:bg-orange-700', 'text-white');
    btn.classList.add('bg-red-900/40', 'text-red-400', 'hover:bg-red-900/60');
    
    // Remover el event listener si existe
    if (clickHandlerActivo) {
      document.removeEventListener('click', clickHandlerActivo);
      clickHandlerActivo = null;
    }
  }
}

// Eliminar gasto (soft delete con fecha)
async function eliminarGasto(id) {
  const btnEliminar = document.querySelector(`button[onclick="eliminarGasto('${id}')"]`);
  if (!btnEliminar) return;
  
  // Evitar que el click se propague
  event.stopPropagation();

  if (btnEliminar.textContent.includes('Confirmar')) {
    // Limpiar timeout y event listener
    if (timeoutEliminar) {
      clearTimeout(timeoutEliminar);
      timeoutEliminar = null;
    }
    if (clickHandlerActivo) {
      document.removeEventListener('click', clickHandlerActivo);
      clickHandlerActivo = null;
    }
    
    // Cambiar a rojo al confirmar
    btnEliminar.classList.remove('bg-orange-600', 'hover:bg-orange-700');
    btnEliminar.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white');
    btnEliminar.disabled = true;
    btnEliminar.innerHTML = '<span>🗑️</span> Eliminando...';

    try {
      // Soft delete: marcar como eliminado en lugar de borrar
      await db.collection('gastos').doc(id).update({
        eliminado: true,
        fechaEliminacion: firebase.firestore.FieldValue.serverTimestamp(),
        eliminadoPor: usuarioActual
      });
      mostrarNotificacion('✅ Gasto eliminado correctamente', 'success');
      botonEliminarActivo = null;
      await cargarGastosSeparados();
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      mostrarNotificacion('❌ Error al eliminar: ' + error.message, 'error');
      btnEliminar.disabled = false;
      btnEliminar.innerHTML = '<span>🗑️</span> Eliminar';
      btnEliminar.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white');
      btnEliminar.classList.add('bg-red-900/40', 'text-red-400', 'hover:bg-red-900/60');
      botonEliminarActivo = null;
    }
  } else {
    // Si hay otro botón activo, resetéarlo primero
    if (botonEliminarActivo && botonEliminarActivo !== btnEliminar) {
      resetearBotonEliminar(botonEliminarActivo);
      if (timeoutEliminar) {
        clearTimeout(timeoutEliminar);
        timeoutEliminar = null;
      }
    }
    
    // Cambiar a naranja para confirmar
    btnEliminar.innerHTML = '<span>⚠️</span> Confirmar';
    btnEliminar.classList.remove('bg-red-900/40', 'text-red-400', 'hover:bg-red-900/60');
    btnEliminar.classList.add('bg-orange-600', 'hover:bg-orange-700', 'text-white');
    botonEliminarActivo = btnEliminar;

    // Timeout para resetear automáticamente después de 3 segundos
    timeoutEliminar = setTimeout(() => {
      if (btnEliminar && btnEliminar.textContent.includes('Confirmar')) {
        resetearBotonEliminar(btnEliminar);
        botonEliminarActivo = null;
      }
      timeoutEliminar = null;
    }, 3000);
    
    // Crear handler para clicks fuera del botón
    clickHandlerActivo = function(e) {
      // Si el click no fue en el botón de eliminar
      if (!e.target.closest(`button[onclick*="eliminarGasto"]`)) {
        resetearBotonEliminar(botonEliminarActivo);
        botonEliminarActivo = null;
        if (timeoutEliminar) {
          clearTimeout(timeoutEliminar);
          timeoutEliminar = null;
        }
        document.removeEventListener('click', clickHandlerActivo);
        clickHandlerActivo = null;
      }
    };
    
    // Agregar el event listener después de un pequeño delay
    setTimeout(() => {
      document.addEventListener('click', clickHandlerActivo);
    }, 100);
  }
}

// Exponer función globalmente
window.eliminarGasto = eliminarGasto;

// Resetear Total Gastado (eliminar gastos del trimestre actual)
async function resetearTotalGastado() {
  const confirmar = confirm('⚠️ ¿Estás seguro de que deseas eliminar TODOS los gastos del trimestre actual?\n\nEsta acción marcará todos los gastos como eliminados.');
  
  if (!confirmar) return;

  try {
    // Calcular trimestre actual
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const añoActual = ahora.getFullYear();
    const trimestreActual = Math.floor(mesActual / 3);
    const mesInicioTrimestre = trimestreActual * 3;
    const mesFinTrimestre = mesInicioTrimestre + 2;
    
    const inicioTrimestre = new Date(añoActual, mesInicioTrimestre, 1);
    const finTrimestre = new Date(añoActual, mesFinTrimestre + 1, 0, 23, 59, 59);

    // Obtener gastos del trimestre actual
    const gastosSnapshot = await db.collection('gastos')
      .where('eliminado', '==', false)
      .get();
    
    let contador = 0;
    const batch = db.batch();

    gastosSnapshot.forEach(doc => {
      const gasto = doc.data();
      const fechaGasto = parseFechaLocal(gasto.fecha);
      
      if (fechaGasto >= inicioTrimestre && fechaGasto <= finTrimestre) {
        batch.update(doc.ref, {
          eliminado: true,
          fechaEliminacion: firebase.firestore.FieldValue.serverTimestamp(),
          eliminadoPor: usuarioActual || 'admin'
        });
        contador++;
      }
    });

    if (contador === 0) {
      mostrarNotificacion('ℹ️ No hay gastos en el trimestre actual', 'info');
      return;
    }

    await batch.commit();
    mostrarNotificacion(`✅ ${contador} gasto(s) del trimestre eliminado(s)`, 'success');
    await cargarGastosSeparados();
  } catch (error) {
    console.error('Error al resetear gastos:', error);
    mostrarNotificacion('❌ Error al resetear: ' + error.message, 'error');
  }
}

// Editar gasto
async function editarGasto(id) {
  try {
    const gastoDoc = await db.collection('gastos').doc(id).get();
    if (!gastoDoc.exists) {
      mostrarNotificacion('❌ Gasto no encontrado', 'error');
      return;
    }

    const gasto = gastoDoc.data();
    
    // Establecer el ID del gasto que se está editando
    editandoGastoId = id;
    
    // Rellenar el formulario con los datos del gasto
    document.getElementById('descripcion').value = gasto.descripcion || '';
    document.getElementById('monto').value = gasto.monto || 0;
    
    // Cargar datos de comisión
    const checkAplica = document.getElementById('aplica-comision');
    const checkIncluye = document.getElementById('incluye-comision');
    const containerIncluye = document.getElementById('container-incluye-comision');
    
    if (checkAplica) {
      if (gasto.tieneComision) {
        checkAplica.checked = true;
        containerIncluye.classList.remove('hidden');
        containerIncluye.classList.add('flex');
        
        // Al editar, cargamos el monto *real* en el input.
        // Asumimos que no está incluido para que el cálculo sea directo (Input = Real)
        if (checkIncluye) checkIncluye.checked = false;
      } else {
        checkAplica.checked = false;
        containerIncluye.classList.add('hidden');
        containerIncluye.classList.remove('flex');
        if (checkIncluye) checkIncluye.checked = false;
      }
    }
    
    document.getElementById('fecha').value = gasto.fecha || '';
    document.getElementById('categoria').value = gasto.categoria || '';
    if (document.getElementById('organizacion')) {
      document.getElementById('organizacion').value = gasto.organizacion || '';
    }
    document.getElementById('comprobante').checked = gasto.comprobanteAdjunto || false;
    
    // Establecer tipo de pago
    const tipoPago = gasto.tipoPago || (gasto.reembolsado ? 'reembolsado' : 'pagoDirecto');
    const radioTipoPago = document.querySelector(`input[name="tipoPago"][value="${tipoPago}"]`);
    if (radioTipoPago) {
      radioTipoPago.checked = true;
    }
    document.getElementById('observaciones').value = gasto.observaciones || '';
    
    // Cambiar el título del modal
    document.getElementById('modal-title').innerHTML = '<span class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200"><svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg></span><span>Editar Gasto</span>';
    
    // Abrir el modal
    document.getElementById('modal-gasto').classList.remove('hidden');
  } catch (error) {
    console.error('Error al cargar gasto para editar:', error);
    mostrarNotificacion('❌ Error al cargar el gasto', 'error');
  }
}

// ==================== FILTROS ====================
function filtrarPorEstado(estado) {
  estadoActual = estado;
  
  // Actualizar estilos de pestañas
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('border-orange-500', 'text-white');
    btn.classList.add('border-transparent', 'text-gray-400');
  });
  
  const tabActivo = document.getElementById(`tab-${estado}`);
  if (tabActivo) {
    tabActivo.classList.remove('border-transparent', 'text-gray-400');
    tabActivo.classList.add('border-orange-500', 'text-white');
  }
  
  cargarGastos();
}

function filtrarPorCategoria(categoria) {
  categoriaActual = categoria;
  
  // Actualizar estilos de botones de categoría
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('bg-gray-700');
  });
  
  const btnActivo = document.getElementById(`cat-${categoria}`);
  if (btnActivo) {
    btnActivo.classList.remove('bg-gray-700');
    btnActivo.classList.add('btn-primary');
  }
  
  cargarGastos();
}

async function cargarGastos() {
  try {
    
    if (!db) {
      console.error('❌ Firebase no inicializado');
      return;
    }
    
    const gastosSnapshot = await db.collection('gastos').orderBy('fecha', 'desc').get();
    let gastos = [];
    
    gastosSnapshot.forEach(doc => {
      gastos.push({ id: doc.id, ...doc.data() });
    });

    // Aplicar filtro de estado (todos, pendientes, registrados)
    if (estadoActual === 'pendientes') {
      gastos = gastos.filter(g => !g.registrado);
    } else if (estadoActual === 'registrados') {
      gastos = gastos.filter(g => g.registrado);
    }

    // Aplicar filtro de categoría
    if (categoriaActual !== 'todos') {
      gastos = gastos.filter(g => g.categoria === categoriaActual);
    }

    // Usar el nuevo sistema de gastos separados en lugar del antiguo
    await cargarGastosSeparados();
  } catch (error) {
    console.error('❌ Error al cargar gastos:', error);
    mostrarNotificacion('❌ Error al cargar gastos: ' + error.message, 'error');
  }
}

async function renderGastos(gastosArray = null) {
  try {
    let gastos = gastosArray;
    
    if (!gastos) {
      const gastosSnapshot = await db.collection('gastos').orderBy('fecha', 'desc').get();
      gastos = [];
      gastosSnapshot.forEach(doc => {
        gastos.push({ id: doc.id, ...doc.data() });
      });
    }

    const container = document.getElementById('lista-gastos');
    
    // Verificar que el contenedor exista antes de intentar renderizar
    if (!container) {
      return;
    }

    if (gastos.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-400 py-12 lg:py-16">
          <span class="text-6xl lg:text-8xl mb-4 lg:mb-6 block">📋</span>
          <p class="text-xl lg:text-2xl mb-3 lg:mb-4">No hay gastos registrados</p>
          <p class="text-base lg:text-lg">¡Agrega tu primer gasto para comenzar!</p>
        </div>
      `;
    } else {
      container.innerHTML = gastos.map(crearTarjetaGasto).join('');
    }
  } catch (error) {
    console.error('Error al renderizar gastos:', error);
  }
}

function crearTarjetaGasto(gasto) {
  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos', color: 'green' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto', color: 'orange' }
  };

  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria, color: 'gray' };
  
  const comprobanteIcon = gasto.comprobanteAdjunto 
    ? '<span class="text-green-400 text-sm">✓ Comprobante adjunto</span>' 
    : '<span class="text-red-400 text-sm">✗ Sin comprobante</span>';

  const estadoRegistro = gasto.registrado 
    ? '<span class="inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs font-bold bg-green-900 text-green-300 border border-green-700 whitespace-nowrap">✓ REGISTRADO</span>'
    : '<span class="inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-300 border border-gray-600 whitespace-nowrap">⏳ SIN REGISTRAR</span>';

  // Mostrar observaciones si existen
  const observacionesHTML = gasto.observaciones ? `
    <div class="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
      <p class="text-xs lg:text-sm text-gray-600 dark:text-gray-300"><strong class="text-blue-500">📋 Observaciones:</strong> ${gasto.observaciones}</p>
    </div>
  ` : '';

  // Verificar si el gasto está eliminado
  const esEliminado = gasto.eliminado === true;
  const claseEliminado = esEliminado ? 'opacity-60 border-red-500' : '';
  const marcaEliminado = esEliminado ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-900 text-red-300 border border-red-700">🗑️ ELIMINADO</span>' : '';

  // Mostrar información de fechas de modificación/eliminación si existen
  let infoFechasHTML = '';
  if (gasto.fechaModificacion || gasto.fechaEliminacion) {
    infoFechasHTML = '<div class="mt-3 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500">';
    if (gasto.fechaModificacion) {
      infoFechasHTML += `<p>✏️ Modificado: ${gasto.fechaModificacion.toDate ? gasto.fechaModificacion.toDate().toLocaleDateString('es-ES') : 'N/A'}</p>`;
    }
    if (gasto.fechaEliminacion) {
      infoFechasHTML += `<p>🗑️ Eliminado: ${gasto.fechaEliminacion.toDate ? gasto.fechaEliminacion.toDate().toLocaleDateString('es-ES') : 'N/A'} por ${gasto.eliminadoPor || 'Usuario'}</p>`;
    }
    infoFechasHTML += '</div>';
  }

  // LOGICA DE VISUALIZACION DE MONTO CON COMISION
  let montoHtml = '';
  if (gasto.comision && gasto.comision > 0) {
      const montoReal = gasto.monto;
      const comision = gasto.comision;
      const total = montoReal + comision;
      
      montoHtml = `
        <div class="flex flex-col items-end">
            <div class="flex flex-col items-end">
                <span class="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Gasto Neto</span>
                <p class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">$${montoReal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            
            <div class="flex items-center justify-end gap-2 mt-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded text-right">
                <span class="text-[10px] font-bold uppercase">Comisión (6.99%)</span>
                <span class="text-sm font-bold">+$${comision.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            
            <div class="mt-2 pt-1 border-t border-gray-200 dark:border-gray-700 w-full text-right">
                <span class="text-[10px] text-gray-400 uppercase tracking-widest block">Total Enviado</span>
                <p class="text-base font-bold text-gray-500 dark:text-gray-400">$${total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
        </div>
      `;
  } else {
      montoHtml = `
        <div class="flex-shrink-0 text-left lg:text-right">
          <p class="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">$${gasto.monto.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p class="text-xs text-gray-500 mt-1">ARS</p>
        </div>
      `;
  }

  // Comprobar si es admin para mostrar botones
  const botonesAdmin = esAdmin && !esEliminado ? `
      <div class="flex flex-col gap-3 pt-4 border-t border-gray-700 mt-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="flex items-center cursor-pointer select-none group">
              <div class="relative">
                <input type="checkbox" ${gasto.registrado ? 'checked' : ''} 
                  onchange="toggleRegistrado('${gasto.id}', this.checked)"
                  class="sr-only peer">
                <div class="block w-10 h-6 bg-gray-600 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </div>
              <span class="ml-3 text-sm font-medium text-gray-400 group-hover:text-blue-400 transition-colors">
                ${gasto.registrado ? 'Registrado' : 'Marcar como registrado'}
              </span>
            </label>
        
            <div class="flex items-center gap-2">
              <button onclick="editarGasto('${gasto.id}')" 
                class="bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                <span>✏️</span> Editar
              </button>
              <button onclick="eliminarGasto('${gasto.id}')" 
                class="bg-red-900/40 text-red-400 hover:bg-red-900/60 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                <span>🗑️</span> Eliminar
              </button>
            </div>
        </div>
      </div>
  ` : '';

  return `
    <div class="card-dark rounded-2xl p-4 lg:p-6 hover:border-2 hover:border-orange-500 transition-all ${claseEliminado}">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs lg:text-sm font-bold bg-${cat.color}-900 text-${cat.color}-300 border border-${cat.color}-700 whitespace-nowrap">
              ${cat.emoji} ${cat.label}
            </span>
            <span class="text-xs lg:text-sm text-gray-400 whitespace-nowrap">📅 ${gasto.fecha}</span>
            ${estadoRegistro}
            ${marcaEliminado}
          </div>
          <h4 class="text-base lg:text-xl font-bold text-white mb-2 break-words">${gasto.descripcion}</h4>
          
          <div class="flex items-center gap-3 text-sm text-gray-400 mb-2">
             <div class="flex items-center gap-1">
                ${comprobanteIcon}
             </div>
             ${gasto.organizacion ? `<span class="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">${gasto.organizacion.replace(/-/g, ' ')}</span>` : ''}
          </div>

          ${observacionesHTML}
          ${infoFechasHTML}
        </div>
        
        ${montoHtml}
      </div>

      ${botonesAdmin}
    </div>
  `;
}


// ==================== NOTIFICACIONES ====================
function mostrarNotificacion(mensaje, tipo = 'success') {
  const container = document.getElementById('notification-container');
  const notification = document.createElement('div');
  
  const bgColor = tipo === 'success' ? 'bg-green-500' : 'bg-red-500';
  
  notification.className = `notification ${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl font-semibold`;
  notification.textContent = mensaje;

  container.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==================== MEDIDORES DE PRESUPUESTO ====================
function actualizarMedidores(presupuestoTotal, presupuestoViaticos, gastosPresupuesto, gastosViaticos) {
  // Actualizar medidor de presupuesto
  actualizarMedidorPresupuesto(presupuestoTotal, gastosPresupuesto);
  
  // Actualizar medidor de viáticos
  actualizarMedidorViaticos(presupuestoViaticos, gastosViaticos);
}

function actualizarMedidorPresupuesto(total, gastado) {
  const disponible = total - gastado;
  const porcentaje = total > 0 ? (gastado / total) * 100 : 0;
  
  // Actualizar valores
  document.getElementById('budget-disponible').textContent = disponible.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('budget-gastado').textContent = gastado.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('budget-percentage').textContent = Math.round(porcentaje);
  
  // Actualizar barra de progreso
  const progressBar = document.getElementById('budget-progress');
  progressBar.style.width = `${Math.min(porcentaje, 100)}%`;
  
  // Actualizar estado y colores con tema oscuro
  const statusBadge = document.getElementById('budget-status-badge');
  
  if (porcentaje < 60) {
    // BUENO - Verde oscuro
    statusBadge.textContent = 'BUENO';
    statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-green-900 text-green-300 border border-green-700';
    progressBar.className = 'bg-status-good h-full rounded-full transition-all duration-500';
  } else if (porcentaje < 85) {
    // REGULAR - Amarillo oscuro
    statusBadge.textContent = 'REGULAR';
    statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-yellow-900 text-yellow-300 border border-yellow-700';
    progressBar.className = 'bg-status-warning h-full rounded-full transition-all duration-500';
  } else {
    // ALERTA - Rojo oscuro
    statusBadge.textContent = 'ALERTA';
    statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-red-900 text-red-300 border border-red-700';
    progressBar.className = 'bg-status-danger h-full rounded-full transition-all duration-500';
  }
}

function actualizarMedidorViaticos(total, gastado) {
  const disponible = total - gastado;
  const porcentaje = total > 0 ? (gastado / total) * 100 : 0;
  
  // Actualizar valores
  document.getElementById('travel-disponible').textContent = disponible.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('travel-gastado').textContent = gastado.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('travel-percentage').textContent = Math.round(porcentaje);
  
  // Actualizar barra de progreso
  const progressBar = document.getElementById('travel-progress');
  progressBar.style.width = `${Math.min(porcentaje, 100)}%`;
  
  // Actualizar estado y colores con tema oscuro
  const statusBadge = document.getElementById('travel-status-badge');
  
  if (porcentaje < 60) {
    // BUENO - Verde oscuro
    statusBadge.textContent = 'BUENO';
    statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-green-900 text-green-300 border border-green-700';
    progressBar.className = 'bg-status-good h-full rounded-full transition-all duration-500';
  } else if (porcentaje < 85) {
    // REGULAR - Amarillo oscuro
    statusBadge.textContent = 'REGULAR';
    statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-yellow-900 text-yellow-300 border border-yellow-700';
    progressBar.className = 'bg-status-warning h-full rounded-full transition-all duration-500';
  } else {
    // ALERTA - Rojo oscuro
    statusBadge.textContent = 'ALERTA';
    statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-red-900 text-red-300 border border-red-700';
    progressBar.className = 'bg-status-danger h-full rounded-full transition-all duration-500';
  }
}

// ==================== PANEL DE ADMINISTRADOR ====================
async function mostrarPanelAdmin() {
  const modal = document.getElementById('modal-admin');
  modal.classList.remove('hidden');
  
  // Limpiar campos para que estén vacíos (con validación)
  const presupuestoTotal = document.getElementById('nuevo-presupuesto-total');
  const presupuestoViaticos = document.getElementById('nuevo-presupuesto-viaticos');
  const emailRecuperacion = document.getElementById('nuevo-email-recuperacion');
  const pinAdmin = document.getElementById('nuevo-pin-admin');
  const pinActual = document.getElementById('pin-actual-admin');
  
  if (presupuestoTotal) presupuestoTotal.value = '';
  if (presupuestoViaticos) presupuestoViaticos.value = '';
  if (emailRecuperacion) emailRecuperacion.value = '';
  if (pinAdmin) pinAdmin.value = '';
  if (pinActual) pinActual.value = '';
  
  // Cargar y mostrar configuración actual
  await cargarConfiguracionActual();
}

// Función para cargar y mostrar configuración actual enmascarada
async function cargarConfiguracionActual() {
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    if (configDoc.exists) {
      const config = configDoc.data();
      
      // Mostrar email enmascarado
      const emailDisplay = document.getElementById('email-actual-display');
      if (emailDisplay) {
        if (config.emailRecuperacion) {
          // Enmascarar email: ej. mo****@hotmail.com
          const email = config.emailRecuperacion;
          const [local, domain] = email.split('@');
          const maskedLocal = local.length > 2 ? local.substring(0, 2) + '****' : '****';
          emailDisplay.textContent = `${maskedLocal}@${domain}`;
          emailDisplay.classList.remove('text-gray-500');
          emailDisplay.classList.add('text-blue-200');
        } else {
          emailDisplay.textContent = 'No configurado';
          emailDisplay.classList.add('text-gray-500');
        }
      }

      // Live stats del admin panel
      const pTotal = config.presupuestoTotal || 0;
      
      const ahora = new Date();
      const _anio = ahora.getFullYear();
      const _trim = Math.floor(ahora.getMonth() / 3);
      const _ini = new Date(_anio, _trim * 3, 1);
      const _fin = new Date(_anio, _trim * 3 + 3, 0, 23, 59, 59);

      let totalP_reg = 0;
      let totalYrP_reg = 0;

      const gastosRef = await db.collection('gastos').where('eliminado', '==', false).get();
      gastosRef.forEach(doc => {
        const g = doc.data();
        if (g.categoria === 'presupuesto') {
          const fStr = typeof g.fecha === 'string' ? g.fecha + 'T12:00:00' : null;
          let f = null;
          if (fStr) f = new Date(fStr);
          else if (g.fecha && typeof g.fecha.toDate === 'function') f = g.fecha.toDate();
          
          if (f) {
            if (g.registrado && f >= _ini && f <= _fin) totalP_reg += (g.monto || 0); // Gastado Q
            if (g.registrado && f.getFullYear() === _anio) totalYrP_reg += (g.monto || 0); // Gastado Yr
          }
        }
      });

      const formatearMoneda = (num) => '$' + num.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      const dispReal = Math.max(0, pTotal - totalYrP_reg);

      const elT = document.getElementById('admin-stat-presupuesto');
      if (elT) elT.textContent = formatearMoneda(pTotal);
      const elG = document.getElementById('admin-stat-gastado');
      if (elG) elG.textContent = formatearMoneda(totalP_reg);
      const elD = document.getElementById('admin-stat-disponible');
      if (elD) elD.textContent = formatearMoneda(dispReal);
      const elV = document.getElementById('admin-stat-viaticos');
      if (elV) elV.textContent = formatearMoneda(config.presupuestoViaticos || 0);
      const tl = document.getElementById('admin-trimestre-label');
      if (tl) tl.textContent = 'Q' + (_trim+1) + ' ' + _anio;
    }
  } catch (error) {
    console.error('Error al cargar configuración actual:', error);
  }
}

async function actualizarPresupuestos() {
  const inputPresupuesto = document.getElementById('nuevo-presupuesto-total').value;
  const inputViaticos = document.getElementById('nuevo-presupuesto-viaticos').value;
  const modoActualizacion = document.querySelector('input[name="modo-actualizacion"]:checked')?.value || 'reemplazar';
  const acumularSaldo = document.getElementById('acumular-saldo-sobrante')?.checked || false;
  
  // Validar que al menos un campo esté completo
  if (!inputPresupuesto && !inputViaticos) {
    mostrarNotificacion('⚠️ Debes ingresar al menos un valor para actualizar', 'error');
    return;
  }
  
  // Validar valores no negativos
  if ((inputPresupuesto && parseFloat(inputPresupuesto) < 0) || (inputViaticos && parseFloat(inputViaticos) < 0)) {
    mostrarNotificacion('⚠️ Los valores no pueden ser negativos', 'error');
    return;
  }
  
  try {
    const updates = {};
    
    // Siempre obtener configuración actual para mostrar confirmación
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    const configActual = configDoc.data() || {};
    
    // Calcular los nuevos valores para mostrar en la confirmación
    let nuevoPresupuestoTotal = configActual.presupuestoTotal || 0;
    let nuevoPresupuestoViaticos = configActual.presupuestoViaticos || 0;
    
    // Actualizar solo los campos completados
    if (inputPresupuesto) {
      const nuevoValor = parseFloat(inputPresupuesto);
      if (modoActualizacion === 'sumar') {
        nuevoPresupuestoTotal = (configActual.presupuestoTotal || 0) + nuevoValor;
      } else {
        nuevoPresupuestoTotal = nuevoValor;
      }
      updates.presupuestoTotal = nuevoPresupuestoTotal;
    }
    
    if (inputViaticos) {
      const nuevoValor = parseFloat(inputViaticos);
      if (modoActualizacion === 'sumar') {
        nuevoPresupuestoViaticos = (configActual.presupuestoViaticos || 0) + nuevoValor;
      } else {
        nuevoPresupuestoViaticos = nuevoValor;
      }
      updates.presupuestoViaticos = nuevoPresupuestoViaticos;
    }
    
    // Mostrar confirmación con valores actuales vs nuevos
    const fmt = (n) => '$' + n.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    let mensajeConfirmacion = '<div style="text-align:left;font-size:14px;">';
    if (inputPresupuesto) {
      mensajeConfirmacion += `<p><b>Presupuesto Total:</b></p><p>${fmt(configActual.presupuestoTotal || 0)} → <b style="color:#10b981">${fmt(nuevoPresupuestoTotal)}</b></p><br>`;
    }
    if (inputViaticos) {
      mensajeConfirmacion += `<p><b>Viáticos:</b></p><p>${fmt(configActual.presupuestoViaticos || 0)} → <b style="color:#10b981">${fmt(nuevoPresupuestoViaticos)}</b></p>`;
    }
    mensajeConfirmacion += '</div>';
    
    const resultado = await Swal.fire({
      title: '¿Confirmar actualización?',
      html: mensajeConfirmacion,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    });
    
    if (!resultado.isConfirmed) {
      return;
    }
    
    // Guardar configuración de acumulación
    updates.acumularSaldoSobrante = acumularSaldo;
    updates.fechaActualizacion = firebase.firestore.FieldValue.serverTimestamp();
    updates.actualizadoPor = usuarioActual || 'admin';
    
    await db.collection('configuracion').doc('sistema').update(updates);
    
    // Construir mensaje de éxito personalizado
    let mensaje = '✅ ';
    if (inputPresupuesto && inputViaticos) {
      mensaje += 'Ambos presupuestos actualizados correctamente';
    } else if (inputPresupuesto) {
      mensaje += 'Presupuesto total actualizado correctamente';
    } else {
      mensaje += 'Presupuesto de viáticos actualizado correctamente';
    }
    
    mostrarNotificacion(mensaje, 'success');
    
    // Limpiar campos
    document.getElementById('nuevo-presupuesto-total').value = '';
    document.getElementById('nuevo-presupuesto-viaticos').value = '';
    
    await cargarPresupuestos();
    await calcularGastos();
    await calcularEstadisticasDashboard();
    
  } catch (error) {
    console.error('Error al actualizar presupuestos:', error);
    mostrarNotificacion('❌ Error al actualizar presupuestos', 'error');
  }
}

async function actualizarPINs() {
  const pinUsuario = document.getElementById('nuevo-pin-usuario').value;
  const pinAdmin = document.getElementById('nuevo-pin-admin').value;
  
  if (pinUsuario && pinUsuario.length < 4) {
    mostrarNotificacion('❌ El PIN de usuario debe tener al menos 4 caracteres', 'error');
    return;
  }
  
  if (pinAdmin && pinAdmin.length < 4) {
    mostrarNotificacion('❌ El PIN de administrador debe tener al menos 4 caracteres', 'error');
    return;
  }
  
  if (pinUsuario && pinAdmin && pinUsuario === pinAdmin) {
    mostrarNotificacion('❌ Los PINs no pueden ser iguales', 'error');
    return;
  }
  
  try {
    const updates = {};
    if (pinUsuario) updates.pinUsuario = pinUsuario;
    if (pinAdmin) updates.pinAdmin = pinAdmin;
    
    if (Object.keys(updates).length === 0) {
      mostrarNotificacion(' Ingresa al menos un PIN para actualizar', 'error');
      return;
    }
    
    updates.fechaActualizacion = firebase.firestore.FieldValue.serverTimestamp();
    
    await db.collection('configuracion').doc('sistema').update(updates);
    
    mostrarNotificacion(' PINs actualizados correctamente', 'success');
    
    document.getElementById('nuevo-pin-usuario').value = '';
    document.getElementById('nuevo-pin-admin').value = '';
    
  } catch (error) {
    console.error('Error al actualizar PINs:', error);
    mostrarNotificacion(' Error al actualizar PINs', 'error');
  }
}

// Actualizar seguridad completa (email + PIN Admin)
async function actualizarSeguridadCompleta() {
  const pinActual = document.getElementById('pin-actual-admin')?.value;
  const emailRecuperacion = document.getElementById('nuevo-email-recuperacion')?.value;
  const pinNuevo = document.getElementById('nuevo-pin-admin')?.value;
  
  // Validar que se ingresó el PIN actual
  if (!pinActual || pinActual.trim() === '') {
    mostrarNotificacion('❌ Debes ingresar tu PIN actual de administrador', 'error');
    return;
  }
  
  // Verificar que hay al menos un cambio
  if (!emailRecuperacion && !pinNuevo) {
    mostrarNotificacion('⚠️ Debes ingresar al menos un cambio (email o nuevo PIN)', 'error');
    return;
  }
  
  // Validar nuevo PIN si se proporciona
  if (pinNuevo && pinNuevo.length < 4) {
    mostrarNotificacion('❌ El nuevo PIN debe tener al menos 4 caracteres', 'error');
    return;
  }
  
  // Validar que el nuevo PIN sea diferente al actual
  if (pinNuevo && pinNuevo === pinActual) {
    mostrarNotificacion('❌ El nuevo PIN debe ser diferente al actual', 'error');
    return;
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRecuperacion && !emailRegex.test(emailRecuperacion)) {
    mostrarNotificacion('❌ El email ingresado no es válido', 'error');
    return;
  }
  
  try {
    // Verificar PIN actual
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    const config = configDoc.data();
    
    if (config.pinAdmin !== pinActual) {
      mostrarNotificacion('❌ El PIN actual es incorrecto', 'error');
      return;
    }
    
    // Preparar actualizaciones
    const updates = {};
    if (emailRecuperacion) updates.emailRecuperacion = emailRecuperacion;
    if (pinNuevo) updates.pinAdmin = pinNuevo;
    
    updates.fechaActualizacion = firebase.firestore.FieldValue.serverTimestamp();
    
    await db.collection('configuracion').doc('sistema').update(updates);
    
    let mensaje = '✅ Configuración de seguridad actualizada exitosamente';
    const cambios = [];
    if (emailRecuperacion) cambios.push('Email de recuperación');
    if (pinNuevo) cambios.push('PIN de administrador');
    
    if (cambios.length > 0) {
      mensaje += ': ' + cambios.join(' y ');
    }
    
    mostrarNotificacion(mensaje, 'success');
    
    // Limpiar todos los campos
    const pinActualInput = document.getElementById('pin-actual-admin');
    const emailInput = document.getElementById('nuevo-email-recuperacion');
    const pinInput = document.getElementById('nuevo-pin-admin');
    if (pinActualInput) pinActualInput.value = '';
    if (emailInput) emailInput.value = '';
    if (pinInput) pinInput.value = '';
    
    // Recargar configuración actual para mostrar cambios
    await cargarConfiguracionActual();
    
  } catch (error) {
    console.error('Error al actualizar seguridad:', error);
    mostrarNotificacion('❌ Error al actualizar configuración', 'error');
  }
}

// Solicitar recuperación de cuenta mediante email
async function solicitarRecuperacionCuenta() {
  const email = prompt('📧 Ingresa tu email de recuperación registrado:');
  
  if (!email) {
    return; // Usuario canceló
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('❌ El email ingresado no es válido');
    return;
  }
  
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    
    if (!configDoc.exists) {
      alert('❌ No se pudo recuperar la configuración. Contacta al administrador del sistema.');
      return;
    }
    
    const config = configDoc.data();
    const emailRegistrado = config.emailRecuperacion || '';
    
    if (!emailRegistrado) {
      alert('❌ No hay un email de recuperación configurado.\n\n💡 El administrador debe configurar un email en el Panel Admin.');
      return;
    }
    
    if (email.toLowerCase() !== emailRegistrado.toLowerCase()) {
      alert('❌ El email ingresado no coincide con el registrado.\n\n⚠️ Verifica el email o contacta al administrador del sistema.');
      return;
    }
    
    // Email correcto - mostrar credenciales
    const mensaje = `
✅ EMAIL VERIFICADO CORRECTAMENTE

🔑 TUS CREDENCIALES:

👤 PIN Usuario: ${config.pinUsuario}
👨‍💼 PIN Admin: ${config.pinAdmin}

⚠️ Guarda estas contraseñas en un lugar seguro.
💡 Puedes cambiarlas desde el Panel Admin después de ingresar.
    `;
    
    alert(mensaje);
    
    // Copiar al portapapeles
    const textToCopy = `Usuario: ${config.pinUsuario}\nAdmin: ${config.pinAdmin}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      mostrarNotificacion('📋 Credenciales copiadas al portapapeles', 'success');
    }).catch(() => {
    });
    
  } catch (error) {
    console.error('Error al recuperar cuenta:', error);
    alert('❌ Error al procesar la solicitud. Verifica tu conexión.');
  }
}

function iniciarEscuchaEnTiempoReal() {
  db.collection('configuracion').doc('sistema').onSnapshot((doc) => {
    if (doc.exists) {
        cargarPresupuestos();
      calcularGastos();
      calcularEstadisticasDashboard();
    }
  });
  
  db.collection('gastos').onSnapshot(() => {
    cargarGastosSeparados();
    calcularGastos();
    calcularEstadisticasDashboard();
  });
}

// ==================== NUEVO SISTEMA DE SEPARACIÓN DE GASTOS ====================

// Función para cargar gastos separados
async function cargarGastosSeparados() {
  try {
    
    if (!db) {
      console.error('❌ Firebase no inicializado');
      return;
    }
    
    // Obtener todos los gastos y filtrar en el cliente para evitar índice compuesto
    const gastosSnapshot = await db.collection('gastos')
      .orderBy('fecha', 'desc')
      .get();
    let todosgastos = [];
    
    gastosSnapshot.forEach(doc => {
      const data = doc.data();
      // Filtrar gastos no eliminados
      if (!data.eliminado) {
        todosgastos.push({ id: doc.id, ...data });
      }
    });

    // Separar gastos en 3 estados: pendientes, pendientes de aprobación, aprobados
    const gastosPendientes = todosgastos.filter(g => !g.registrado);
    const gastosPendientesAprobacion = todosgastos.filter(g => g.registrado && !g.aprobado);
    const gastosAprobados = todosgastos.filter(g => g.registrado && g.aprobado);

    // Renderizar las tres secciones
    renderGastosPendientes(gastosPendientes);
    renderGastosPendientesAprobacion(gastosPendientesAprobacion);
    renderGastosReportados(gastosAprobados);
    
  } catch (error) {
    console.error('❌ Error al cargar gastos:', error);
    mostrarNotificacion('❌ Error al cargar gastos: ' + error.message, 'error');
  }
}

// ========================================
// FUNCIONES DE ACORDEÓN COLAPSABLE
// ========================================

// Toggle sección de gastos pendientes
function toggleSeccionPendientes() {
  const contenido = document.getElementById('contenido-pendientes');
  const icono = document.getElementById('icon-pendientes');
  
  if (contenido.style.display === 'none') {
    contenido.style.display = 'block';
    icono.textContent = '▼';
    icono.style.transform = 'rotate(0deg)';
  } else {
    contenido.style.display = 'none';
    icono.textContent = '▶';
    icono.style.transform = 'rotate(-90deg)';
  }
}

// Toggle sección de gastos reportados
function toggleSeccionReportados() {
  const contenido = document.getElementById('contenido-reportados');
  const icono = document.getElementById('icon-reportados');
  
  if (contenido.style.display === 'none') {
    contenido.style.display = 'block';
    icono.textContent = '▼';
    icono.style.transform = 'rotate(0deg)';
  } else {
    contenido.style.display = 'none';
    icono.textContent = '▶';
    icono.style.transform = 'rotate(-90deg)';
  }
}

// Toggle sección de pendientes de aprobación
function toggleSeccionAprobacion() {
  const contenido = document.getElementById('contenido-aprobacion');
  const icono = document.getElementById('icon-aprobacion');
  
  if (contenido.style.display === 'none') {
    contenido.style.display = 'block';
    icono.textContent = '▼';
    icono.style.transform = 'rotate(0deg)';
  } else {
    contenido.style.display = 'none';
    icono.textContent = '▶';
    icono.style.transform = 'rotate(-90deg)';
  }
}

// ========================================
// FUNCIONES DE RENDERIZADO
// ========================================

// Renderizar gastos pendientes
function renderGastosPendientes(gastos) {
  // Actualizar contador en el header
  const countElement = document.getElementById('count-pendientes');
  if (countElement) {
    countElement.textContent = `(${gastos.length})`;
  }
  // Aplicar filtro de categoría
  let gastosFiltrados = gastos;
  if (categoriaPendientes !== 'todos') {
    gastosFiltrados = gastos.filter(g => g.categoria === categoriaPendientes);
  }

  const container = document.getElementById('lista-gastos-pendientes');

  if (gastosFiltrados.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-6">
        <span class="text-2xl mb-1 block">✅</span>
        <p class="text-xs mb-0.5 font-medium">¡Excelente! No hay gastos pendientes</p>
        <p class="text-[10px]">Todos los gastos han sido registrados</p>
      </div>
    `;
    return;
  }

  // Agrupar por mes
  const gruposPorMes = agruparPorMes(gastosFiltrados);
  
  // Renderizar grupos de mes con acordeón
  container.innerHTML = gruposPorMes.map(([mesAnio, grupo]) => {
    const tarjetas = grupo.gastos.map(crearTarjetaGastoPendiente).join('');
    const acordeonId = `pend-${mesAnio}`;
    const estaExpandido = obtenerEstadoAcordeon(acordeonId);
    
    return `
      <div class="mb-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        <!-- Header del mes -->
        <button onclick="toggleGrupoGastoMes('${acordeonId}')" 
          class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-800 hover:from-blue-100 hover:to-blue-200 dark:hover:from-slate-600 dark:hover:to-slate-700 transition-all border-b border-transparent dark:border-slate-600">
          <div class="flex items-center gap-3">
            <svg id="icono-${acordeonId}" class="w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform ${estaExpandido ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <div class="text-left">
              <h4 class="font-bold text-gray-900 dark:text-gray-100 text-sm md:text-base capitalize">${grupo.label}</h4>
              <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">${grupo.gastos.length} gasto${grupo.gastos.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-base md:text-lg font-bold text-blue-700 dark:text-blue-400">$${grupo.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
            <p class="text-xs md:text-sm text-blue-600/70 dark:text-blue-400/70 font-medium mt-0.5">Total del mes</p>
          </div>
        </button>
        
        <!-- Contenido del mes -->
        <div id="grupo-${acordeonId}" class="p-2 space-y-2 bg-gray-50 dark:bg-gray-900/50 ${estaExpandido ? '' : 'hidden'}">
          ${tarjetas}
        </div>
      </div>
    `;
  }).join('');
}

// ==================== PENDIENTES DE APROBACIÓN ====================
let categoriaAprobacion = 'todos';
let gastosAprobacionCache = []; // Cache para filtrado

function filtrarAprobacionPorCategoria(categoria) {
  categoriaAprobacion = categoria;
  // Actualizar estilos de botones
  document.querySelectorAll('[id^="cat-aprobacion-"]').forEach(btn => {
    btn.className = btn.id === `cat-aprobacion-${categoria}`
      ? 'filtro-btn btn-primary px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-lg font-medium whitespace-nowrap text-xs lg:text-sm transition-all'
      : 'filtro-btn bg-gray-100 text-gray-600 px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-lg font-medium hover:bg-gray-200 transition-all whitespace-nowrap text-xs lg:text-sm';
  });
  renderGastosPendientesAprobacion(gastosAprobacionCache);
}
window.filtrarAprobacionPorCategoria = filtrarAprobacionPorCategoria;

// Renderizar gastos pendientes de aprobación
function renderGastosPendientesAprobacion(gastos) {
  gastosAprobacionCache = gastos;
  
  // Actualizar contador en el header
  const countElement = document.getElementById('count-aprobacion');
  if (countElement) {
    countElement.textContent = `(${gastos.length})`;
  }
  
  // Aplicar filtro de categoría
  let gastosFiltrados = gastos;
  if (categoriaAprobacion !== 'todos') {
    gastosFiltrados = gastos.filter(g => g.categoria === categoriaAprobacion);
  }

  const container = document.getElementById('lista-gastos-aprobacion');
  if (!container) return;

  if (gastosFiltrados.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-400 py-6">
        <span class="text-2xl mb-1 block">📋</span>
        <p class="text-xs mb-0.5 font-medium">No hay gastos pendientes de aprobación</p>
        <p class="text-[10px]">Los gastos registrados aparecerán aquí</p>
      </div>
    `;
    return;
  }

  // Agrupar por mes
  const gruposPorMes = agruparPorMes(gastosFiltrados);
  
  container.innerHTML = gruposPorMes.map(([mesAnio, grupo]) => {
    const tarjetas = grupo.gastos.map(crearTarjetaGastoAprobacion).join('');
    const acordeonId = `aprob-${mesAnio}`;
    const estaExpandido = obtenerEstadoAcordeon(acordeonId);
    
    return `
      <div class="mb-3 border border-orange-200 dark:border-orange-800 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        <button onclick="toggleGrupoGastoMes('${acordeonId}')" 
          class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-700 dark:to-slate-800 hover:from-orange-100 hover:to-amber-100 dark:hover:from-slate-600 dark:hover:to-slate-700 transition-all border-b border-transparent dark:border-slate-600">
          <div class="flex items-center gap-3">
            <svg id="icono-${acordeonId}" class="w-5 h-5 text-orange-600 dark:text-orange-400 transition-transform ${estaExpandido ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <div class="text-left">
              <h4 class="font-bold text-gray-900 dark:text-gray-100 text-sm md:text-base capitalize">${grupo.label}</h4>
              <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">${grupo.gastos.length} gasto${grupo.gastos.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-base md:text-lg font-bold text-orange-700 dark:text-orange-400">$${grupo.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
            <p class="text-xs md:text-sm text-orange-600/70 dark:text-orange-400/70 font-medium mt-0.5">Total del mes</p>
          </div>
        </button>
        
        <div id="grupo-${acordeonId}" class="p-2 space-y-2 bg-gray-50 dark:bg-gray-900/50 ${estaExpandido ? '' : 'hidden'}">
          ${tarjetas}
        </div>
      </div>
    `;
  }).join('');
}

// Crear tarjeta para un gasto pendiente de aprobación
function crearTarjetaGastoAprobacion(gasto) {
  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos', color: 'green' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto', color: 'orange' }
  };
  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria, color: 'gray' };

  const aprobarBtn = esAdmin ? `
    <button onclick="aprobarGasto('${gasto.id}')"
      class="w-full sm:w-auto justify-center bg-green-50 dark:bg-green-900/40 hover:bg-green-100 dark:hover:bg-green-900/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold shadow-sm hover:shadow-md cursor-pointer"
      title="Aprobar gasto — descontará del disponible real">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span>Aprobar</span>
    </button>
  ` : '';

  const devolverBtn = esAdmin ? `
    <button onclick="devolverAPendiente('${gasto.id}')"
      class="w-full sm:w-auto justify-center bg-white dark:bg-gray-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-gray-200 dark:border-gray-600 hover:border-yellow-200 dark:hover:border-yellow-600 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold shadow-sm hover:shadow-md cursor-pointer"
      title="Devolver a pendientes (desregistrar)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
      <span>Devolver</span>
    </button>
  ` : '';

  const verDetalleBtn = `
    <button onclick='mostrarDetalleGasto(${JSON.stringify(gasto).replace(/'/g, "&#39;")})'
      class="w-full sm:w-auto justify-center bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold" title="Ver detalle">
      <svg class="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
      <span>Ver</span>
    </button>
  `;

  return `
    <div class="bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 w-full">
      <div class="flex justify-between items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-700">⏳ ESPERANDO APROBACIÓN</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-${cat.color}-50 dark:bg-${cat.color}-900/40 text-${cat.color}-700 dark:text-${cat.color}-300 border border-${cat.color}-100 dark:border-${cat.color}-700 flex items-center gap-1">${cat.emoji} ${cat.label}</span>
          </div>
          <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">${gasto.descripcion}</h4>
          
          <div class="flex flex-col gap-0.5 text-[10px] text-gray-500 dark:text-gray-400 mt-2">
            <span class="flex items-center gap-1.5" title="Fecha en que se realizó el gasto">
              <span>📅</span>
              <span class="font-medium text-gray-700 dark:text-gray-300">Gasto: ${parseFechaLocal(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </span>
            ${gasto.fechaCreacion ? `
            <span class="flex items-center gap-1.5" title="Fecha de ingreso al sistema">
              <span>📥</span>
              <span>Ingresado: ${(gasto.fechaCreacion.toDate ? gasto.fechaCreacion.toDate() : new Date(gasto.fechaCreacion)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
            </span>` : ''}
            ${gasto.fechaRegistro ? `
            <span class="flex items-center gap-1.5 text-blue-600/80 dark:text-blue-400/80" title="Fecha de reporte/registro">
              <span>📝</span>
              <span>Reportado: ${(gasto.fechaRegistro.toDate ? gasto.fechaRegistro.toDate() : new Date(gasto.fechaRegistro)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
            </span>` : ''}
          </div>
          
          ${gasto.observaciones ? `<div class="mt-2 text-xs italic text-gray-400 dark:text-gray-500 truncate">📝 ${gasto.observaciones}</div>` : ''}
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-xl font-bold text-gray-800 dark:text-gray-100 leading-none">
            $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </p>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1">Monto</p>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        ${aprobarBtn}
        ${devolverBtn}
        ${verDetalleBtn}
      </div>
    </div>
  `;
}

// Aprobar un gasto (tercero lo aprobó)
async function aprobarGasto(id) {
  if (!esAdmin) {
    mostrarNotificacion('❌ Solo el administrador puede aprobar gastos', 'error');
    return;
  }

  try {
    await db.collection('gastos').doc(id).update({
      aprobado: true,
      fechaAprobacion: firebase.firestore.FieldValue.serverTimestamp(),
      aprobadoPor: usuarioActual
    });

    mostrarNotificacion('✅ Gasto aprobado — descontado del disponible real', 'success');
    await cargarGastosSeparados();
    await calcularGastos();
    await calcularEstadisticasDashboard();

  } catch (error) {
    console.error('Error al aprobar gasto:', error);
    mostrarNotificacion('❌ Error al aprobar el gasto: ' + error.message, 'error');
  }
}
window.aprobarGasto = aprobarGasto;

// Devolver un gasto registrado a pendientes (desregistrar)
async function devolverAPendiente(id) {
  if (!esAdmin) {
    mostrarNotificacion('❌ Solo el administrador puede realizar esta acción', 'error');
    return;
  }

  try {
    await db.collection('gastos').doc(id).update({
      registrado: false,
      fechaRegistro: null,
      registradoPor: null,
      aprobado: false,
      fechaAprobacion: null,
      aprobadoPor: null
    });

    mostrarNotificacion('⚠️ Gasto devuelto a pendientes', 'success');
    await cargarGastosSeparados();
    await calcularGastos();
    await calcularEstadisticasDashboard();

  } catch (error) {
    console.error('Error al devolver gasto:', error);
    mostrarNotificacion('❌ Error: ' + error.message, 'error');
  }
}
window.devolverAPendiente = devolverAPendiente;

// Renderizar gastos reportados agrupados
function renderGastosReportados(gastos) {
  // Actualizar contador en el header
  const countElement = document.getElementById('count-reportados');
  if (countElement) {
    countElement.textContent = `(${gastos.length})`;
  }
  
  // Aplicar filtro de categoría
  let gastosFiltrados = gastos;
  if (categoriaReportados !== 'todos') {
    gastosFiltrados = gastos.filter(g => g.categoria === categoriaReportados);
  }

  const container = document.getElementById('historial-reportados');

  if (gastosFiltrados.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-6">
        <span class="text-2xl mb-1 block">📋</span>
        <p class="text-xs mb-0.5 font-medium">No hay gastos aprobados aún</p>
        <p class="text-[10px]">Los gastos aprobados aparecerán aquí</p>
      </div>
    `;
    return;
  }

  // Agrupar según la vista seleccionada
  let gastosAgrupados;
  if (vistaHistorial === 'mes') {
    gastosAgrupados = agruparPorMes(gastosFiltrados);
  } else if (vistaHistorial === 'trimestre') {
    gastosAgrupados = agruparPorTrimestre(gastosFiltrados);
  } else if (vistaHistorial === 'anio') {
    gastosAgrupados = agruparPorAnio(gastosFiltrados);
  }

  container.innerHTML = renderGastosAgrupados(gastosAgrupados, vistaHistorial);
}

// Agrupar gastos por mes
function agruparPorMes(gastos) {
  const grupos = {};
  
  gastos.forEach(gasto => {
    const fecha = parseFechaLocal(gasto.fecha);
    const mesAnio = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grupos[mesAnio]) {
      grupos[mesAnio] = {
        label: fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
        gastos: [],
        total: 0
      };
    }
    
    grupos[mesAnio].gastos.push(gasto);
    grupos[mesAnio].total += gasto.monto || 0;
  });
  
  return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
}

// Agrupar gastos por trimestre
function agruparPorTrimestre(gastos) {
  const grupos = {};
  
  gastos.forEach(gasto => {
    const fecha = parseFechaLocal(gasto.fecha);
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();
    const trimestre = Math.floor(mes / 3) + 1;
    const key = `${anio}-T${trimestre}`;
    
    const labels = ['Primer Trimestre', 'Segundo Trimestre', 'Tercer Trimestre', 'Cuarto Trimestre'];
    
    if (!grupos[key]) {
      grupos[key] = {
        label: `${labels[trimestre - 1]} ${anio}`,
        gastos: [],
        total: 0
      };
    }
    
    grupos[key].gastos.push(gasto);
    grupos[key].total += gasto.monto || 0;
  });
  
  return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
}

// Agrupar gastos por año
function agruparPorAnio(gastos) {
  const grupos = {};
  
  gastos.forEach(gasto => {
    const fecha = parseFechaLocal(gasto.fecha);
    const anio = fecha.getFullYear().toString();
    
    if (!grupos[anio]) {
      grupos[anio] = {
        label: `Año ${anio}`,
        gastos: [],
        total: 0
      };
    }
    
    grupos[anio].gastos.push(gasto);
    grupos[anio].total += gasto.monto || 0;
  });
  
  return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
}

// Renderizar gastos agrupados con acordeón colapsable
function renderGastosAgrupados(grupos, vista) {
  return grupos.map(([key, grupo], index) => {
    const icono = vista === 'mes' ? '📅' : vista === 'trimestre' ? '📊' : '📆';
    const grupoId = `hist-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const estaExpandido = obtenerEstadoAcordeon(grupoId);
    
    return `
      <div class="mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        <div class="bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-800/30 p-3 cursor-pointer hover:from-sky-200 hover:to-blue-200 dark:hover:from-sky-900/40 dark:hover:to-blue-800/40 transition-all"
             onclick="toggleGrupoGastos('${grupoId}')">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <span id="icon-${grupoId}" class="mr-1.5 text-sm transition-transform duration-300 ${estaExpandido ? '' : '-rotate-90'}">▼</span>
              <span class="mr-2">${icono}</span>
              ${grupo.label}
            </h3>
            <div class="text-right">
              <p class="text-[10px] text-gray-600 dark:text-gray-400">${grupo.gastos.length} gasto${grupo.gastos.length !== 1 ? 's' : ''}</p>
              <p class="text-sm font-bold text-sky-600 dark:text-sky-400">
                $${grupo.total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>
        </div>
        
        <div id="${grupoId}" class="p-3 bg-gray-50 dark:bg-gray-900/50 transition-all duration-300 ${estaExpandido ? '' : 'hidden'}">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            ${grupo.gastos.map(crearTarjetaGastoReportado).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Toggle grupo de gastos individual
function toggleGrupoGastos(grupoId) {
  const contenido = document.getElementById(grupoId);
  const icono = document.getElementById(`icon-${grupoId}`);
  
  if (contenido && icono) {
    contenido.classList.toggle('hidden');
    icono.classList.toggle('-rotate-90');
    
    // Guardar estado (expandido si NO tiene hidden)
    const estaExpandido = !contenido.classList.contains('hidden');
    guardarEstadoAcordeon(grupoId, estaExpandido);
  }
}

// Toggle para grupos de gastos mensuales
function toggleGrupoGastoMes(mesId) {
  const contenido = document.getElementById(`grupo-${mesId}`);
  const icono = document.getElementById(`icono-${mesId}`);
  
  if (contenido && icono) {
    contenido.classList.toggle('hidden');
    icono.classList.toggle('rotate-180');
    
    // Guardar estado (expandido si NO tiene hidden)
    const estaExpandido = !contenido.classList.contains('hidden');
    guardarEstadoAcordeon(mesId, estaExpandido);
  }
}

// Crear tarjeta de gasto pendiente
function crearTarjetaGastoPendiente(gasto) {
  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos', color: 'green' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto', color: 'orange' }
  };

  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria, color: 'gray' };
  
  const comprobanteIcon = gasto.comprobanteAdjunto 
    ? '<span class="text-green-600 text-xs font-semibold flex items-center gap-1"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg><span class="hidden sm:inline">Con comprobante</span></span>' 
    : '<span class="text-gray-400 text-xs font-medium flex items-center gap-1"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg><span class="hidden sm:inline">Sin comprobante</span></span>';

  const checkboxHtml = gasto.reportado ? '' : `
    <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 transition-all group w-full sm:w-auto justify-center sm:justify-start bg-white dark:bg-gray-700 shadow-sm" title="Marcar como registrado oficialmente">
      <input type="checkbox" 
        onchange="marcarComoReportado('${gasto.id}')"
        class="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer">
      <span class="ml-2 text-xs font-semibold text-gray-700 dark:text-gray-200 group-hover:text-green-700 dark:group-hover:text-green-400">Marcar como registrado</span>
    </label>
  `;

  // Botón de Tipo de Pago
  const tipoPago = gasto.tipoPago || (gasto.reembolsado ? 'reembolsado' : null);
  let tipoPagoConfig = {
    'pago': { emoji: '💵', label: 'Pago Directo', colorBg: 'bg-green-50', colorText: 'text-green-700', colorBorder: 'border-green-200' }, // Retrocompatibilidad
    'pagoDirecto': { emoji: '💵', label: 'Pago Directo', colorBg: 'bg-green-50', colorText: 'text-green-700', colorBorder: 'border-green-200' },
    'reembolsado': { emoji: '✅', label: 'Reembolsado', colorBg: 'bg-green-50', colorText: 'text-green-700', colorBorder: 'border-green-200' },
    'null': { emoji: '❓', label: '¿Tipo de pago?', colorBg: 'bg-orange-50', colorText: 'text-orange-700', colorBorder: 'border-orange-200' }
  };
  const pagoInfo = tipoPagoConfig[tipoPago] || tipoPagoConfig['null'];
  
  const reembolsoBtn = `
    <button onclick="seleccionarTipoPago('${gasto.id}')" 
      class="w-full sm:w-auto justify-center ${pagoInfo.colorBg} dark:bg-opacity-20 ${pagoInfo.colorText} ${pagoInfo.colorBorder} dark:border-opacity-40 border px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold shadow-sm hover:shadow-md cursor-pointer" 
      title="Click para cambiar el tipo de pago">
      <span class="text-sm">${pagoInfo.emoji}</span>
      <span>${pagoInfo.label}</span>
    </button>
  `;

  // Botón Ver Detalle
  const verDetalleBtn = `
    <button onclick='mostrarDetalleGasto(${JSON.stringify(gasto).replace(/'/g, "&#39;")})'  
      class="w-full sm:w-auto justify-center bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold" title="Ver detalle">
      <svg class="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
      <span>Ver</span>
    </button>
  `;

  const editarBtn = esAdmin ? `
    <button onclick="editarGasto('${gasto.id}')"  
      class="w-full sm:w-auto justify-center bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-600 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold" title="Editar gasto">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
      <span>Editar</span>
    </button>
  ` : '';

  const eliminarBtn = esAdmin ? `
    <button onclick="eliminarGasto('${gasto.id}')"  
      class="w-full sm:w-auto justify-center bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-600 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold" title="Eliminar gasto">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      <span>Eliminar</span>
    </button>
  ` : '';

  return `
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 w-full">
      <!-- Upper Section: Info & Amount -->
      <div class="flex justify-between items-start gap-3">
        <!-- Left: Main Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-2">
             <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700">SIN REGISTRAR</span>
             <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-${cat.color}-50 dark:bg-${cat.color}-900/40 text-${cat.color}-700 dark:text-${cat.color}-300 border border-${cat.color}-100 dark:border-${cat.color}-700 flex items-center gap-1">${cat.emoji} ${cat.label}</span>
          </div>

          <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">${gasto.descripcion}</h4>
          
          <div class="flex flex-col gap-0.5 text-[10px] text-gray-500 dark:text-gray-400 mt-2">
            <span class="flex items-center gap-1.5" title="Fecha en que se realizó el gasto">
              <span>📅</span>
              <span class="font-medium text-gray-700 dark:text-gray-300">Gasto: ${parseFechaLocal(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </span>
            ${gasto.fechaCreacion ? `
            <span class="flex items-center gap-1.5" title="Fecha de ingreso al sistema">
              <span>📥</span>
              <span>Ingresado: ${(gasto.fechaCreacion.toDate ? gasto.fechaCreacion.toDate() : new Date(gasto.fechaCreacion)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
            </span>` : ''}
          </div>
          
          ${gasto.observaciones ? `<div class="mt-2 text-xs italic text-gray-400 dark:text-gray-500 truncate">📝 ${gasto.observaciones}</div>` : ''}
        </div>

        <!-- Right: Amount -->
        <div class="text-right flex-shrink-0">
          ${gasto.comision && gasto.comision > 0 ? `
              <p class="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none" title="Total a informar">
                $${(gasto.monto + gasto.comision).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
              <div class="flex flex-col items-end gap-0.5 mt-1.5">
                  <span class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Gasto: $${gasto.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                  <span class="text-[9px] text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/40 rounded border border-purple-100 dark:border-purple-700" title="Comisión ML">+ Com: $${gasto.comision.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
              </div>
          ` : `
              <p class="text-xl font-bold text-gray-800 dark:text-gray-100 leading-none">
                $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
              <p class="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1">Monto total</p>
          `}
        </div>
      </div>

      <!-- Lower Section: Actions Grid -->
      <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          ${checkboxHtml}
          ${reembolsoBtn}
          ${verDetalleBtn}
          ${editarBtn}
          ${eliminarBtn}
      </div>
    </div>
  `;
}

// Crear tarjeta de gasto reportado
function crearTarjetaGastoReportado(gasto) {
  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos', color: 'green' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto', color: 'orange' }
  };

  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria, color: 'gray' };
  
  const comprobanteIcon = gasto.comprobanteAdjunto 
    ? '<span class="text-green-600 text-xs lg:text-sm font-semibold">✓ Comprobante</span>' 
    : '<span class="text-red-600 text-xs lg:text-sm font-semibold">✗ Sin comprobante</span>';

  // Tipo de Pago
  const tipoPago = gasto.tipoPago || (gasto.reembolsado ? 'reembolsado' : null);
  let tipoPagoConfig = {
    'pago': { emoji: '💵', label: 'Pago Directo', color: 'text-green-600' }, // Retrocompatibilidad
    'pagoDirecto': { emoji: '💵', label: 'Pago Directo', color: 'text-green-600' },
    'reembolsado': { emoji: '✅', label: 'Reembolsado', color: 'text-green-600' },
    'null': { emoji: '❓', label: '¿Tipo de pago?', color: 'text-orange-600' }
  };
  const pagoInfo = tipoPagoConfig[tipoPago] || tipoPagoConfig['null'];
  
  let tipoPagoText = `${pagoInfo.emoji} ${pagoInfo.label}`;
  if (tipoPago === 'reembolsado' && gasto.fechaReembolso) {
    const fechaReemb = gasto.fechaReembolso.toDate ? gasto.fechaReembolso.toDate() : new Date(gasto.fechaReembolso);
    tipoPagoText += ` (${fechaReemb.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})`;
  }
  const tipoPagoIcon = `<span class="${pagoInfo.color} text-xs lg:text-sm font-semibold flex items-center gap-1">${tipoPagoText}</span>`;

  const verBtn = `
    <button onclick='mostrarDetalleGasto(${JSON.stringify(gasto).replace(/'/g, "&#39;")})' 
      class="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95" 
      title="Ver detalle del gasto">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
      </svg>
    </button>
  `;

  const editarBtn = esAdmin ? `
    <button onclick="editarGasto('${gasto.id}')"  
      class="bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-1.5 text-xs font-semibold" title="Editar gasto">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
      <span class="inline">Editar</span>
    </button>
  ` : '';

  const eliminarBtn = esAdmin ? `
    <button onclick="eliminarGasto('${gasto.id}')"  
      class="bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-1.5 text-xs font-semibold" title="Eliminar gasto">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
      <span class="inline">Eliminar</span>
    </button>
  ` : '';

  return `
    <div class="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all">
      <!-- Header con badges -->
      <div class="flex flex-wrap items-center gap-1.5 mb-2">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 flex-shrink-0">
          ✅ APROBADO
        </span>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-${cat.color}-100 text-${cat.color}-800 flex-shrink-0">
          ${cat.emoji} ${cat.label}
        </span>
      </div>
      
      <!-- Contenido principal -->
      <div class="mb-2">
        <h4 class="text-xs font-bold text-gray-900 mb-1.5 line-clamp-2">${gasto.descripcion}</h4>
        ${gasto.comision && gasto.comision > 0 ? `
            <div class="flex flex-col items-start gap-1">
                <p class="text-lg font-bold text-sky-700" title="Total informado">$${(gasto.monto + gasto.comision).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                <div class="flex items-center gap-1 text-[10px]">
                    <span class="text-gray-500">Gasto: $${gasto.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                    <span class="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">+ Com: $${gasto.comision.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
        ` : `
            <p class="text-base font-bold text-sky-600">
              $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
        `}
      </div>
      
      <!-- Footer con información y acción -->
      <div class="flex justify-between items-center pt-2 border-t border-gray-200">
        <div class="flex flex-col gap-1.5">
          <div class="flex flex-col gap-0.5 text-[9px] text-gray-500">
            <span class="flex items-center gap-1" title="Fecha en que se realizó el gasto">
              <span>📅</span>
              <span class="font-medium text-gray-700">Gasto: ${parseFechaLocal(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </span>
            ${gasto.fechaCreacion ? `
            <span class="flex items-center gap-1" title="Fecha de ingreso al sistema">
              <span>📥</span>
              <span>Ingresado: ${(gasto.fechaCreacion.toDate ? gasto.fechaCreacion.toDate() : new Date(gasto.fechaCreacion)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
            </span>` : ''}
            ${gasto.fechaRegistro ? `
            <span class="flex items-center gap-1 text-blue-600/80" title="Fecha de reporte/registro">
              <span>📝</span>
              <span>Reportado: ${(gasto.fechaRegistro.toDate ? gasto.fechaRegistro.toDate() : new Date(gasto.fechaRegistro)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
            </span>` : ''}
            ${gasto.fechaAprobacion ? `
            <span class="flex items-center gap-1 text-green-600/80" title="Fecha de aprobación">
              <span>✅</span>
              <span>Aprobado: ${(gasto.fechaAprobacion.toDate ? gasto.fechaAprobacion.toDate() : new Date(gasto.fechaAprobacion)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
            </span>` : ''}
          </div>
          <div class="flex items-center gap-2 mt-1">
            <div class="text-[9px]">${comprobanteIcon}</div>
            <div class="text-[9px]">${tipoPagoIcon}</div>
          </div>
        </div>
        <div class="flex flex-col gap-1.5 justify-end">
          ${verBtn}
          ${esAdmin ? editarBtn : ''}
          ${esAdmin ? eliminarBtn : ''}
        </div>
      </div>
    </div>
  `;
}

// Filtrar pendientes por categoría
function filtrarPendientesPorCategoria(categoria) {
  categoriaPendientes = categoria;
  
  // Actualizar botones
  ['todos', 'presupuesto', 'viaticos'].forEach(cat => {
    const btn = document.getElementById(`cat-pendientes-${cat}`);
    if (btn) {
      if (cat === categoria) {
        btn.className = 'filtro-btn btn-primary px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-lg font-medium whitespace-nowrap text-xs lg:text-sm text-white transition-all';
      } else {
        btn.className = 'filtro-btn bg-gray-100 text-gray-600 px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-lg font-medium hover:bg-gray-200 transition-all whitespace-nowrap text-xs lg:text-sm';
      }
    }
  });
  
  cargarGastosSeparados();
}

// Filtrar reportados por categoría
function filtrarReportadosPorCategoria(categoria) {
  categoriaReportados = categoria;
  
  // Actualizar botones
  ['todos', 'presupuesto', 'viaticos'].forEach(cat => {
    const btn = document.getElementById(`cat-reportados-${cat}`);
    if (btn) {
      if (cat === categoria) {
        btn.className = 'filtro-btn btn-primary px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-lg font-medium whitespace-nowrap text-xs lg:text-sm text-white transition-all';
      } else {
        btn.className = 'filtro-btn bg-gray-100 text-gray-600 px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-lg font-medium hover:bg-gray-200 transition-all whitespace-nowrap text-xs lg:text-sm';
      }
    }
  });
  
  cargarGastosSeparados();
}

// Cambiar vista del historial
function cambiarVistaHistorial(vista) {
  vistaHistorial = vista;
  
  // Actualizar tabs
  ['mes', 'trimestre', 'anio'].forEach(v => {
    const tab = document.getElementById(`vista-${v}`);
    if (tab) {
      if (v === vista) {
        tab.className = 'tab-btn px-3 py-2 lg:px-4 lg:py-2.5 font-semibold text-gray-800 border-b-2 border-sky-500 transition-all whitespace-nowrap text-xs lg:text-sm';
      } else {
        tab.className = 'tab-btn px-3 py-2 lg:px-4 lg:py-2.5 font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-800 transition-all whitespace-nowrap text-xs lg:text-sm';
      }
    }
  });
  
  cargarGastosSeparados();
}

// ==================== MODAL GASTOS INFORMADOS ====================

// Abrir modal de gastos informados
async function abrirModalGastosInformados() {
  const modal = document.getElementById('modal-gastos-informados');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  await cargarGastosInformados();
}

// Cerrar modal de gastos informados
function cerrarModalGastosInformados() {
  const modal = document.getElementById('modal-gastos-informados');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Cargar y mostrar gastos informados
async function cargarGastosInformados() {
  try {
    const contenido = document.getElementById('contenido-gastos-informados');
    const totalText = document.getElementById('total-informados-text');
    
    if (!db) {
      contenido.innerHTML = '<div class="text-center py-12 text-red-500"><p>Error: Firebase no inicializado</p></div>';
      return;
    }
    
    // Obtener todos los gastos informados
    const gastosSnapshot = await db.collection('gastos')
      .where('registrado', '==', true)
      .where('eliminado', '==', false)
      .get();
    
    const gastosInformados = [];
    gastosSnapshot.forEach(doc => {
      gastosInformados.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por fecha en memoria
    gastosInformados.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaB - fechaA; // desc
    });
    
    // Calcular totales
    let totalMonto = 0;
    let totalComisiones = 0;
    gastosInformados.forEach(g => {
      totalMonto += g.monto || 0;
      totalComisiones += g.comision || 0;
    });
    const totalGeneral = totalMonto + totalComisiones;
    
    // Actualizar texto del header
    totalText.textContent = `${gastosInformados.length} gastos • Total: $${totalGeneral.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Renderizar la lista
    if (gastosInformados.length === 0) {
      contenido.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-lg font-medium">No hay gastos informados aún</p>
          <p class="text-sm mt-2">Los gastos que marques como reportados aparecerán aquí</p>
        </div>
      `;
      return;
    }
    
    // Organizar gastos con información formateada
    const organizaciones = {
      'hombres-mujeres-jovenes': 'Hombres y mujeres jóvenes',
      'primaria': 'Primaria',
      'sociedad-socorro': 'Sociedad de socorro',
      'escuela-dominical': 'Escuela dominical',
      'quorum-elderes': 'Quórum de Elderes',
      'gastos-presupuesto': 'Gastos de Presupuesto',
      'adultos-solteros': 'Adultos solteros',
      'viajes-aprobados': 'Viajes aprobados',
      'meetup': 'Meet up (externo)',
      'pfj': 'PFJ (externo)',
      'area': 'AREA (externo)'
    };
    
    contenido.innerHTML = `
      <div class="space-y-3">
        ${gastosInformados.map(g => {
          const fecha = parseFechaLocal(g.fecha);
          const fechaFormateada = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
          const orgFormateada = organizaciones[g.organizacion] || g.organizacion;
          const montoTotal = (g.monto || 0) + (g.comision || 0);
          const categoriaEmoji = g.categoria === 'viaticos' ? '🚗' : '💰';
          const categoriaColor = g.categoria === 'viaticos' ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50';
          
          return `
            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${categoriaColor}">
                      ${categoriaEmoji} ${g.categoria === 'viaticos' ? 'Viáticos' : 'Presupuesto'}
                    </span>
                    <span class="text-xs text-gray-500">${fechaFormateada}</span>
                  </div>
                  <p class="font-medium text-gray-900 mb-1">${g.descripcion}</p>
                  <p class="text-sm text-gray-600">${orgFormateada}</p>
                  ${g.tieneComision ? `
                    <div class="mt-2 text-xs text-gray-500">
                      <span>Base: $${(g.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                      <span class="mx-2">•</span>
                      <span>Comisión: $${(g.comision || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                    </div>
                  ` : ''}
                </div>
                <div class="text-right ml-4 flex flex-col items-end gap-2">
                  <p class="text-lg font-bold text-purple-600">$${montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  ${g.reembolsado ? '<span class="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">Reembolsado</span>' : ''}
                  <button onclick='mostrarDetalleGasto(${JSON.stringify(g).replace(/'/g, "&#39;")})' 
                    class="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    Ver detalle
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <!-- Resumen al final -->
      <div class="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-xs text-gray-600 mb-1">Monto Base</p>
            <p class="text-lg font-bold text-gray-900">$${totalMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
          </div>
          <div>
            <p class="text-xs text-gray-600 mb-1">Comisiones</p>
            <p class="text-lg font-bold text-purple-600">$${totalComisiones.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
          </div>
          <div>
            <p class="text-xs text-gray-600 mb-1">Total General</p>
            <p class="text-xl font-bold text-gray-900">$${totalGeneral.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
          </div>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error al cargar gastos informados:', error);
    const contenido = document.getElementById('contenido-gastos-informados');
    contenido.innerHTML = `
      <div class="text-center py-12 text-red-500">
        <p class="font-medium">Error al cargar gastos informados</p>
        <p class="text-sm mt-2">${error.message}</p>
      </div>
    `;
  }
}

// Descargar PDF de gastos informados
async function descargarPDFGastosInformados() {
  try {
    // Obtener gastos informados
    const gastosSnapshot = await db.collection('gastos')
      .where('registrado', '==', true)
      .where('eliminado', '==', false)
      .orderBy('fecha', 'desc')
      .get();
    
    const gastosInformados = [];
    gastosSnapshot.forEach(doc => {
      gastosInformados.push({ id: doc.id, ...doc.data() });
    });
    
    if (gastosInformados.length === 0) {
      mostrarNotificacion('No hay gastos informados para descargar', 'warning');
      return;
    }
    
    // Calcular totales
    let totalMonto = 0;
    let totalComisiones = 0;
    gastosInformados.forEach(g => {
      totalMonto += g.monto || 0;
      totalComisiones += g.comision || 0;
    });
    const totalGeneral = totalMonto + totalComisiones;
    
    const organizaciones = {
      'hombres-mujeres-jovenes': 'Hombres y mujeres jóvenes',
      'primaria': 'Primaria',
      'sociedad-socorro': 'Sociedad de socorro',
      'escuela-dominical': 'Escuela dominical',
      'quorum-elderes': 'Quórum de Elderes',
      'gastos-presupuesto': 'Gastos de Presupuesto',
      'adultos-solteros': 'Adultos solteros',
      'viajes-aprobados': 'Viajes aprobados',
      'meetup': 'Meet up (externo)',
      'pfj': 'PFJ (externo)',
      'area': 'AREA (externo)'
    };
    
    // Crear HTML para el PDF
    const contenidoPDF = `
      <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #7c3aed;">
          <h1 style="font-size: 24px; color: #1f2937; margin: 0 0 10px 0; font-weight: bold;">LISTA DE GASTOS INFORMADOS</h1>
          <p style="font-size: 12px; color: #6b7280; margin: 0;">Sistema de Control de Gastos - Estaca Aldo Bonzi</p>
          <p style="font-size: 11px; color: #9ca3af; margin: 5px 0 0 0;">Generado: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <!-- Resumen -->
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-size: 12px; color: #6b7280; font-weight: 600;">Total de Gastos:</td>
              <td style="padding: 8px; font-size: 12px; color: #1f2937; font-weight: bold; text-align: right;">${gastosInformados.length}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-size: 12px; color: #6b7280; font-weight: 600;">Monto Base:</td>
              <td style="padding: 8px; font-size: 12px; color: #1f2937; font-weight: bold; text-align: right;">$${totalMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-size: 12px; color: #6b7280; font-weight: 600;">Comisiones:</td>
              <td style="padding: 8px; font-size: 12px; color: #7c3aed; font-weight: bold; text-align: right;">$${totalComisiones.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            </tr>
            <tr style="border-top: 2px solid #d1d5db;">
              <td style="padding: 10px 8px; font-size: 13px; color: #1f2937; font-weight: bold;">Total General:</td>
              <td style="padding: 10px 8px; font-size: 16px; color: #7c3aed; font-weight: bold; text-align: right;">$${totalGeneral.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            </tr>
          </table>
        </div>
        
        <!-- Lista de Gastos -->
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 14px; color: #1f2937; font-weight: bold; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">DETALLE DE GASTOS</h2>
          
          ${gastosInformados.map((g, index) => {
            const fecha = parseFechaLocal(g.fecha);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
            const orgFormateada = organizaciones[g.organizacion] || g.organizacion;
            const montoTotal = (g.monto || 0) + (g.comision || 0);
            const categoriaLabel = g.categoria === 'viaticos' ? 'Viáticos' : 'Presupuesto';
            
            return `
              <div style="background: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'}; padding: 12px; margin-bottom: 8px; border: 1px solid #e5e7eb; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-size: 11px; color: #6b7280;">${fechaFormateada}</span>
                  <span style="font-size: 10px; color: #7c3aed; font-weight: 600;">${categoriaLabel}</span>
                </div>
                <p style="font-size: 12px; color: #1f2937; font-weight: bold; margin: 0 0 4px 0;">${g.descripcion}</p>
                <p style="font-size: 11px; color: #6b7280; margin: 0 0 6px 0;">${orgFormateada}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 10px; color: #9ca3af;">
                    ${g.tieneComision ? `Base: $${(g.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})} + Comisión: $${(g.comision || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}` : `Monto: $${(g.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`}
                  </div>
                  <div style="font-size: 14px; color: #7c3aed; font-weight: bold;">$${montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
                </div>
                ${g.reembolsado ? '<div style="margin-top: 4px; font-size: 9px; color: #059669; font-weight: 600;">✓ REEMBOLSADO</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: center;">
          <p style="font-size: 9px; color: #9ca3af; margin: 0;">Este documento fue generado automáticamente por el Sistema de Control de Gastos</p>
        </div>
      </div>
    `;
    
    // Crear elemento temporal
    const elemento = document.createElement('div');
    elemento.innerHTML = contenidoPDF;
    document.body.appendChild(elemento);
    
    // Configuración de html2pdf
    const fechaHoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const nombreArchivo = `Gastos_Informados_${fechaHoy}.pdf`;
    
    const opciones = {
      margin: 10,
      filename: nombreArchivo,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generar y descargar el PDF
    await html2pdf().set(opciones).from(elemento).save();
    document.body.removeChild(elemento);
    mostrarNotificacion('✅ PDF descargado exitosamente', 'success');
    
  } catch (error) {
    console.error('Error al generar PDF:', error);
    mostrarNotificacion('❌ Error al generar PDF: ' + error.message, 'error');
  }
}

// Imprimir gastos informados
function imprimirGastosInformados() {
  const contenido = document.getElementById('contenido-gastos-informados').innerHTML;
  const ventana = window.open('', '_blank');
  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Gastos Informados - Impresión</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1 style="text-align: center; color: #7c3aed; margin-bottom: 20px;">Gastos Informados</h1>
      <p style="text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 30px;">Sistema de Control de Gastos - Estaca Aldo Bonzi</p>
      ${contenido}
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  ventana.document.close();
}

// ==================== DETALLE DE GASTO (LIGHTBOX) ====================
function mostrarDetalleGasto(gasto) {
  const modal = document.getElementById('modal-detalle-gasto');
  const contenido = document.getElementById('contenido-detalle-gasto');
  
  if (!modal || !contenido) return;

  // Guardar el gasto actual para poder descargarlo
  gastoActualDetalle = gasto;

  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos', color: 'green' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto', color: 'orange' }
  };
  
  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria, color: 'gray' };
  
  // Formatear fecha
  const fecha = parseFechaLocal(gasto.fecha).toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calcular comisión y total
  const montoReal = gasto.monto || 0;
  const comision = gasto.comision || 0;
  const tieneComision = gasto.tieneComision || false;
  const total = montoReal + comision;

  const html = `
    <div class="p-6 space-y-4">
      <!-- Encabezado con monto y estado -->
      <div class="flex justify-between items-start">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-${cat.color}-100 text-${cat.color}-800 border border-${cat.color}-200 mb-2">
            ${cat.emoji} ${cat.label}
          </span>
          <h2 class="text-3xl font-bold text-gray-900">$${montoReal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</h2>
          <p class="text-sm text-gray-500 mt-1 capitalize">${fecha}</p>
        </div>
      </div>

      <!-- Descripción -->
      <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
        <label class="text-xs font-bold text-gray-400 uppercase tracking-wide">Descripción</label>
        <p class="text-gray-800 font-medium text-lg mt-1">${gasto.descripcion}</p>
      </div>

      ${gasto.imagenRecibo ? `
      <!-- Imagen del recibo -->
      <div class="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
        <label class="text-xs font-bold text-indigo-600 uppercase tracking-wide flex items-center gap-2 mb-3">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          Recibo Escaneado (OCR)
        </label>
        <div class="relative rounded-lg overflow-hidden bg-white shadow-md">
          <img src="${gasto.imagenRecibo}" alt="Recibo" class="w-full h-auto max-h-80 object-contain cursor-pointer" onclick="window.open('${gasto.imagenRecibo}', '_blank')">
          <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-gray-600">
            Click para ampliar
          </div>
        </div>
      </div>
      ` : ''}

      ${tieneComision ? `
      <!-- Desglose de montos con comisión -->
      <div class="bg-purple-50 p-4 rounded-xl border border-purple-100">
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <label class="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Monto Base</label>
            <p class="text-lg font-bold text-gray-900">$${montoReal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
          </div>
          <div>
            <label class="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Comisión (6.99%)</label>
            <p class="text-lg font-bold text-purple-600">$${comision.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
          </div>
          <div class="border-l-2 border-purple-200">
            <label class="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Total</label>
            <p class="text-lg font-bold text-gray-900">$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Detalles: Organización y Notas -->
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Organización
          </label>
          <p class="text-gray-700 mt-1">${gasto.organizacion || 'No especificada'}</p>
        </div>
        
        ${gasto.observaciones ? `
        <div>
          <label class="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Notas
          </label>
          <p class="text-gray-700 mt-1 italic">${gasto.observaciones}</p>
        </div>
        ` : ''}

        <div class="pt-2 border-t border-gray-100">
           <label class="text-xs font-bold text-gray-400 uppercase tracking-wide">Comprobante</label>
           <div class="mt-1">
              ${gasto.comprobanteAdjunto 
                ? '<span class="inline-flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 font-medium text-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Adjuntado al grupo</span>' 
                : '<span class="inline-flex items-center gap-1.5 text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 font-medium text-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> No adjuntado</span>'}
           </div>
        </div>
      </div>
    </div>
  `;

  contenido.innerHTML = html;
  modal.classList.remove('hidden');
}

function cerrarModalDetalle() {
  const modal = document.getElementById('modal-detalle-gasto');
  if (modal) modal.classList.add('hidden');
}

// ==================== CIERRE DE AÑO FISCAL ====================
async function cerrarAnoFiscal() {
  const pinInput = document.getElementById('pin-cierre-fiscal');
  const confirmacionInput = document.getElementById('confirmacion-cierre-fiscal');
  
  if (!pinInput || !confirmacionInput) {
    mostrarNotificacion('❌ Error: No se encontraron los campos requeridos', 'error');
    return;
  }

  const pin = pinInput.value.trim();
  const confirmacion = confirmacionInput.value.trim();

  // Validar PIN
  if (!pin) {
    mostrarNotificacion('❌ Debes ingresar tu PIN de administrador', 'error');
    return;
  }

  // Validar confirmación
  if (confirmacion !== 'ELIMINAR TODO') {
    mostrarNotificacion('❌ Debes escribir exactamente "ELIMINAR TODO" para confirmar', 'error');
    return;
  }

  // Verificar PIN de administrador
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    if (!configDoc.exists) {
      mostrarNotificacion('❌ No se pudo verificar la configuración', 'error');
      return;
    }

    const config = configDoc.data();
    if (config.pinAdmin !== pin) {
      mostrarNotificacion('❌ PIN de administrador incorrecto', 'error');
      return;
    }

    // Confirmación final con diálogo nativo
    const confirmacionFinal = confirm(
      '⚠️ ÚLTIMA CONFIRMACIÓN ⚠️\n\n' +
      'Estás a punto de ELIMINAR TODOS los gastos del sistema.\n' +
      'Esta acción NO SE PUEDE DESHACER.\n\n' +
      'Se eliminarán:\n' +
      '• Todos los gastos pendientes\n' +
      '• Todos los gastos reportados\n' +
      '• Todos los gastos informados\n' +
      '• Todas las comisiones\n\n' +
      '¿Estás ABSOLUTAMENTE SEGURO de que deseas continuar?'
    );

    if (!confirmacionFinal) {
      mostrarNotificacion('ℹ️ Operación cancelada', 'info');
      return;
    }

    // Mostrar indicador de carga
    mostrarNotificacion('🔄 Eliminando todos los gastos... Por favor espera', 'info');

    // Obtener todos los gastos
    const snapshot = await db.collection('gastos').get();
    const totalGastos = snapshot.size;

    if (totalGastos === 0) {
      mostrarNotificacion('ℹ️ No hay gastos para eliminar', 'info');
      pinInput.value = '';
      confirmacionInput.value = '';
      return;
    }

    // Eliminar todos los gastos en lote (batches)
    const batch = db.batch();
    let contador = 0;
    
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      contador++;
    });

    // Ejecutar la eliminación
    await batch.commit();

    // Registrar el cierre fiscal en el historial (opcional)
    await db.collection('historialCierres').add({
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      gastosEliminados: totalGastos,
      administrador: 'Sistema',
      tipo: 'cierre-fiscal'
    });

    // Limpiar campos
    pinInput.value = '';
    confirmacionInput.value = '';

    // Recargar los datos
    await cargarGastosSeparados();
    await actualizarDashboard();

    mostrarNotificacion(
      `✅ Cierre de año fiscal completado. Se eliminaron ${totalGastos} gasto(s) exitosamente`,
      'success'
    );

  } catch (error) {
    console.error('❌ Error durante el cierre fiscal:', error);
    mostrarNotificacion('❌ Error al realizar el cierre fiscal: ' + error.message, 'error');
  }
}

// Función para descargar el detalle del gasto en PDF
function descargarDetallePDF() {
  if (!gastoActualDetalle) {
    alert('No hay gasto para descargar');
    return;
  }

  const gasto = gastoActualDetalle;
  
  // Categorías
  const categoriaInfo = {
    'viaticos': { emoji: '🚗', label: 'Viáticos' },
    'presupuesto': { emoji: '💰', label: 'Presupuesto' }
  };
  
  const cat = categoriaInfo[gasto.categoria] || { emoji: '📋', label: gasto.categoria };
  
  // Formatear fecha
  const fecha = parseFechaLocal(gasto.fecha).toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calcular montos
  const montoReal = gasto.monto || 0;
  const comision = gasto.comision || 0;
  const tieneComision = gasto.tieneComision || false;
  const total = montoReal + comision;
  
  // Obtener organización formateada
  const organizaciones = {
    'hombres-mujeres-jovenes': 'Hombres y mujeres jóvenes',
    'primaria': 'Primaria',
    'sociedad-socorro': 'Sociedad de socorro',
    'escuela-dominical': 'Escuela dominical',
    'quorum-elderes': 'Quórum de Elderes',
    'gastos-presupuesto': 'Gastos de Presupuesto',
    'adultos-solteros': 'Adultos solteros',
    'viajes-aprobados': 'Viajes aprobados',
    'meetup': 'Meet up (externo)',
    'pfj': 'PFJ (externo)',
    'area': 'AREA (externo)'
  };
  const orgFormateada = organizaciones[gasto.organizacion] || gasto.organizacion || 'No especificada';

  // Crear contenido HTML para el PDF
  const contenidoPDF = `
    <div style="font-family: 'Arial', 'Helvetica', sans-serif; padding: 40px 30px; max-width: 700px; margin: 0 auto; background: white;">
      
      <!-- ENCABEZADO -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 4px solid #1f2937;">
        <h1 style="font-size: 24px; color: #1f2937; margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Detalle del Gasto</h1>
      </div>

      <!-- INFORMACIÓN DEL DOCUMENTO -->
      <div style="background: #f9fafb; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 11px; color: #6b7280; font-weight: 600;">Fecha del Gasto:</td>
            <td style="padding: 6px 0; font-size: 11px; color: #1f2937; font-weight: bold;">${fecha}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 11px; color: #6b7280; font-weight: 600;">Categoría:</td>
            <td style="padding: 6px 0; font-size: 11px; color: #1f2937; font-weight: bold;">${cat.emoji} ${cat.label}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 11px; color: #6b7280; font-weight: 600;">Organización:</td>
            <td style="padding: 6px 0; font-size: 11px; color: #1f2937; font-weight: bold;">${orgFormateada}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 11px; color: #6b7280; font-weight: 600;">Estado:</td>
            <td style="padding: 6px 0; font-size: 11px; font-weight: bold; color: ${gasto.registrado ? '#059669' : '#f59e0b'};">${gasto.registrado ? '✓ Registrado' : '⏳ Sin registrar'}</td>
          </tr>
        </table>
      </div>

      <!-- DESCRIPCIÓN DEL GASTO -->
      <div style="margin-bottom: 25px;">
        <div style="background: #1f2937; color: white; padding: 8px 12px; margin-bottom: 10px; border-radius: 4px;">
          <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Descripción del Gasto</p>
        </div>
        <div style="padding: 15px; background: #f9fafb; border-radius: 4px; border: 1px solid #e5e7eb;">
          <p style="font-size: 13px; color: #1f2937; margin: 0; line-height: 1.6;">${gasto.descripcion}</p>
        </div>
      </div>

      <!-- DESGLOSE FINANCIERO -->
      <div style="margin-bottom: 25px;">
        <div style="background: #1f2937; color: white; padding: 8px 12px; margin-bottom: 10px; border-radius: 4px;">
          <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Desglose Financiero</p>
        </div>
        
        ${tieneComision ? `
        <!-- Con comisión -->
        <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #e5e7eb;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-size: 11px; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">CONCEPTO</th>
              <th style="padding: 12px; text-align: right; font-size: 11px; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">IMPORTE (ARS)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; font-size: 12px; color: #374151; border-bottom: 1px solid #e5e7eb;">Monto Base</td>
              <td style="padding: 12px; text-align: right; font-size: 14px; color: #111827; font-weight: bold; border-bottom: 1px solid #e5e7eb;">$${montoReal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-size: 12px; color: #374151; border-bottom: 1px solid #e5e7eb;">Comisión por Transferencia (6.99%)</td>
              <td style="padding: 12px; text-align: right; font-size: 14px; color: #9333ea; font-weight: bold; border-bottom: 1px solid #e5e7eb;">$${comision.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr style="background: #faf5ff;">
              <td style="padding: 15px 12px; font-size: 13px; color: #1f2937; font-weight: bold; text-transform: uppercase;">${gasto.reembolsado ? 'Total Reembolsado' : 'Total a Pagar'}</td>
              <td style="padding: 15px 12px; text-align: right; font-size: 18px; color: #7c3aed; font-weight: bold;">$${total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
        ` : `
        <!-- Sin comisión -->
        <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #e5e7eb;">
          <tbody>
            <tr style="background: #f9fafb;">
              <td style="padding: 15px 12px; font-size: 13px; color: #1f2937; font-weight: bold; text-transform: uppercase;">Monto Total</td>
              <td style="padding: 15px 12px; text-align: right; font-size: 18px; color: #1f2937; font-weight: bold;">$${montoReal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
        `}
      </div>

      ${gasto.observaciones ? `
      <!-- OBSERVACIONES -->
      <div style="margin-bottom: 25px;">
        <div style="background: #1f2937; color: white; padding: 8px 12px; margin-bottom: 10px; border-radius: 4px;">
          <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Observaciones</p>
        </div>
        <div style="padding: 15px; background: #fffbeb; border-radius: 4px; border: 1px solid #fde047; border-left: 4px solid #eab308;">
          <p style="font-size: 12px; color: #713f12; margin: 0; line-height: 1.6; font-style: italic;">${gasto.observaciones}</p>
        </div>
      </div>
      ` : ''}

      <!-- INFORMACIÓN DE VALIDACIÓN -->
      <div style="margin-bottom: 25px;">
        <div style="background: #1f2937; color: white; padding: 8px 12px; margin-bottom: 10px; border-radius: 4px;">
          <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Información de Validación</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
          <tr>
            <td style="padding: 10px 12px; font-size: 11px; color: #6b7280; font-weight: 600; width: 35%; border-bottom: 1px solid #e5e7eb;">Comprobante:</td>
            <td style="padding: 10px 12px; font-size: 11px; font-weight: bold; border-bottom: 1px solid #e5e7eb; color: ${gasto.comprobanteAdjunto ? '#059669' : '#dc2626'};">${gasto.comprobanteAdjunto ? '✓ Adjuntado' : '✗ No adjuntado'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; font-size: 11px; color: #6b7280; font-weight: 600;">Reembolsado:</td>
            <td style="padding: 10px 12px; font-size: 11px; font-weight: bold; color: ${gasto.reembolsado ? '#059669' : '#6b7280'};">${gasto.reembolsado ? '✓ Sí' : '✗ No'}</td>
          </tr>
        </table>
      </div>

      <!-- PIE DE PÁGINA -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <div style="text-align: center;">
          <p style="font-size: 10px; color: #9ca3af; margin: 0 0 5px 0;">Sistema de Control de Gastos - Estaca Aldo Bonzi</p>
          <p style="font-size: 10px; color: #9ca3af; margin: 0;">Fecha de generación: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

    </div>
  `;

  // Crear elemento temporal
  const elemento = document.createElement('div');
  elemento.innerHTML = contenidoPDF;
  document.body.appendChild(elemento);

  // Configuración de html2pdf
  const fechaFormateada = gasto.fecha.replace(/-/g, '');
  const idCorto = gasto.id ? gasto.id.substring(0, 8) : 'SIN_ID';
  const descripcionCorta = gasto.descripcion.substring(0, 25).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const nombreArchivo = `Comprobante_${fechaFormateada}_${idCorto}_${descripcionCorta}.pdf`;
  
  const opciones = {
    margin: 10,
    filename: nombreArchivo,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Generar y descargar el PDF
  html2pdf().set(opciones).from(elemento).save().then(() => {
    // Remover elemento temporal
    document.body.removeChild(elemento);
  });
}

// La función cargarGastos() ahora usa el sistema separado
// Se mantiene la referencia original para compatibilidad

// ==================== SISTEMA OCR DE RECIBOS ====================
let imagenReciboCapturada = null;
let urlImagenRecibo = null;

// Activar captura de foto del recibo
function activarCapturaRecibo() {
  const input = document.getElementById('input-foto-recibo');
  if (input) {
    input.click();
  }
}

// Procesar imagen capturada con OCR
async function procesarImagenOCR(input) {
  const file = input.files[0];
  if (!file) return;

  // Validar que sea una imagen
  if (!file.type.startsWith('image/')) {
    mostrarNotificacion('❌ Por favor selecciona una imagen válida', 'error');
    return;
  }

  // Mostrar preview
  const reader = new FileReader();
  reader.onload = async function(e) {
    imagenReciboCapturada = file;
    urlImagenRecibo = e.target.result;
    
    // Mostrar preview
    const previewImg = document.getElementById('ocr-preview-image');
    const previewContainer = document.getElementById('ocr-preview-container');
    const progressDiv = document.getElementById('ocr-progress');
    const resultsDiv = document.getElementById('ocr-results');
    
    if (previewImg && previewContainer) {
      previewImg.src = urlImagenRecibo;
      previewContainer.classList.remove('hidden');
      progressDiv.classList.remove('hidden');
      resultsDiv.classList.add('hidden');
    }

    // Ejecutar OCR
    try {
      await extraerDatosConOCR(urlImagenRecibo);
    } catch (error) {
      console.error('Error en OCR:', error);
      progressDiv.classList.add('hidden');
      mostrarNotificacion('⚠️ No se pudieron extraer datos del recibo. Completa manualmente.', 'error');
    }
  };
  
  reader.readAsDataURL(file);
}

// Extraer datos del recibo usando Tesseract OCR
async function extraerDatosConOCR(imagenUrl) {
  const progressBar = document.getElementById('ocr-progress-bar');
  const statusText = document.getElementById('ocr-status-text');
  const progressDiv = document.getElementById('ocr-progress');
  const resultsDiv = document.getElementById('ocr-results');

  try {
    // Configurar Tesseract
    const { createWorker } = Tesseract;
    const worker = await createWorker('spa', 1, {
      logger: info => {
        if (info.status === 'recognizing text') {
          const progress = Math.round(info.progress * 100);
          if (progressBar) progressBar.style.width = `${progress}%`;
          if (statusText) statusText.textContent = `Analizando imagen... ${progress}%`;
        }
      },
    });

    // Ejecutar reconocimiento
    const { data: { text, confidence } } = await worker.recognize(imagenUrl);
    await worker.terminate();

    // Extraer datos del texto
    const datosExtraidos = extraerDatosDeTexto(text);
    
    // Auto-completar formulario
    if (datosExtraidos.monto) {
      document.getElementById('monto').value = datosExtraidos.monto;
    }
    
    if (datosExtraidos.fecha) {
      document.getElementById('fecha').value = datosExtraidos.fecha;
    }
    
    if (datosExtraidos.descripcion) {
      const descripcionInput = document.getElementById('descripcion');
      if (!descripcionInput.value) { // Solo si está vacío
        descripcionInput.value = datosExtraidos.descripcion;
      }
    }

    // Mostrar resultados
    if (progressDiv) progressDiv.classList.add('hidden');
    if (resultsDiv) resultsDiv.classList.remove('hidden');

    const tieneDatos = datosExtraidos.monto || datosExtraidos.fecha;
    const mensaje = tieneDatos 
      ? '✅ Datos extraídos y cargados en el formulario' 
      : '⚠️ No se detectaron datos claros. Completa manualmente';
    
    mostrarNotificacion(mensaje, tieneDatos ? 'success' : 'warning');

  } catch (error) {
    console.error('Error en OCR:', error);
    if (progressDiv) progressDiv.classList.add('hidden');
    mostrarNotificacion('❌ Error al procesar la imagen. Completa manualmente.', 'error');
  }
}

// Extraer datos estructurados del texto OCR
function extraerDatosDeTexto(texto) {
  const datos = {
    monto: null,
    fecha: null,
    descripcion: null
  };

  // Normalizar texto
  const textoLimpio = texto.replace(/\s+/g, ' ').trim();

  // 1. Extraer MONTO
  // Patrones comunes: $1,234.56 | 1234.56 | 1.234,56 | Total: $XXX
  const patronesMonto = [
    /\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,  // $1,234.56
    /(?:total|importe|monto|precio|costo)[:\s]*\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,  // Total: 1234
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*(?:pesos|ars|$)/gi  // 1234.56 pesos
  ];

  for (const patron of patronesMonto) {
    const match = patron.exec(textoLimpio);
    if (match) {
      let montoStr = match[1] || match[0];
      montoStr = montoStr.replace(/[^\d.,]/g, '');  // Limpiar
      montoStr = montoStr.replace(/\./g, '');  // Quitar separadores de miles
      montoStr = montoStr.replace(',', '.');  // Convertir coma decimal a punto
      const monto = parseFloat(montoStr);
      if (!isNaN(monto) && monto > 0 && monto < 10000000) {  // Validar rango razonable
        datos.monto = monto.toFixed(2);
        break;
      }
    }
  }

  // 2. Extraer FECHA
  // Patrones: DD/MM/YYYY | DD-MM-YYYY | YYYY-MM-DD
  const patronesFecha = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // DD/MM/YYYY o DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/   // YYYY-MM-DD
  ];

  for (const patron of patronesFecha) {
    const match = textoLimpio.match(patron);
    if (match) {
      let year, month, day;
      
      if (match[1].length === 4) {
        // Formato YYYY-MM-DD
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else {
        // Formato DD/MM/YYYY
        day = match[1].padStart(2, '0');
        month = match[2].padStart(2, '0');
        year = match[3];
      }

      // Validar fecha razonable
      const fechaNum = parseInt(year + month + day);
      if (fechaNum >= 20200101 && fechaNum <= 20301231) {
        datos.fecha = `${year}-${month}-${day}`;
        break;
      }
    }
  }

  // 3. Extraer DESCRIPCIÓN (primera línea con texto sustancial)
  const lineas = textoLimpio.split(/[\n\r]+/);
  for (const linea of lineas) {
    const lineaLimpia = linea.trim();
    // Buscar una línea con texto sustancial (no solo números)
    if (lineaLimpia.length > 5 && lineaLimpia.length < 100 && /[a-zA-ZáéíóúñÑ]{3,}/.test(lineaLimpia)) {
      // Evitar líneas que sean solo direcciones o RUC/CUIT
      if (!/^[\d\s\-\/]+$/.test(lineaLimpia) && !/(?:cuit|rut|ruc|nit)/i.test(lineaLimpia)) {
        datos.descripcion = lineaLimpia.substring(0, 80);  // Limitar longitud
        break;
      }
    }
  }

  return datos;
}

// Limpiar captura y resetear
function limpiarCaptura() {
  imagenReciboCapturada = null;
  urlImagenRecibo = null;
  
  const previewContainer = document.getElementById('ocr-preview-container');
  const inputFoto = document.getElementById('input-foto-recibo');
  const progressDiv = document.getElementById('ocr-progress');
  const resultsDiv = document.getElementById('ocr-results');
  
  if (previewContainer) previewContainer.classList.add('hidden');
  if (progressDiv) progressDiv.classList.add('hidden');
  if (resultsDiv) resultsDiv.classList.add('hidden');
  if (inputFoto) inputFoto.value = '';
}

// Exponer funciones globalmente
window.activarCapturaRecibo = activarCapturaRecibo;
window.procesarImagenOCR = procesarImagenOCR;
window.limpiarCaptura = limpiarCaptura;

// ==================== INICIALIZACIÓN DE FIREBASE ====================
