// ==================== INICIALIZACIÓN DE FIREBASE ====================
let db, storage, usuarioActual = null, esAdmin = false, categoriaActual = 'todos', estadoActual = 'todos';
let editandoGastoId = null; // ID del gasto que se está editando

// Variables globales para sistema de separación de gastos
let categoriaPendientes = 'todos';
let categoriaReportados = 'todos';
let vistaHistorial = 'mes'; // 'mes', 'trimestre', 'anio'

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
    updateThemeIcons(true);
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    updateThemeIcons(false);
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  
  if (isDark) {
    html.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    updateThemeIcons(false);
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    updateThemeIcons(true);
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
  console.log('🔒 Sesión cerrada automáticamente');
});

// Alternativa con pagehide (más confiable en algunos navegadores móviles)
window.addEventListener('pagehide', () => {
  localStorage.removeItem('sesionActiva');
  localStorage.removeItem('esAdmin');
  localStorage.removeItem('usuarioActual');
});

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar tema
  initTheme();

  try {
    console.log('🔥 Iniciando Firebase...');
    console.log('📊 Configuración:', firebaseConfig);
    
    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
    
    console.log('✅ Firebase inicializado correctamente');
    console.log('📂 Firestore conectado:', db);
    
    // Verificar si hay sesión guardada
    const sesionGuardada = localStorage.getItem('sesionActiva');
    if (sesionGuardada === 'true') {
      esAdmin = localStorage.getItem('esAdmin') === 'true';
      usuarioActual = localStorage.getItem('usuarioActual');
      
      if (usuarioActual) {
        console.log('🔐 Sesión restaurada:', usuarioActual);
        document.getElementById('pin-screen').classList.add('hidden');
        
        if (esAdmin) {
          document.getElementById('btn-panel-admin').classList.remove('hidden');
          const btnAdminMobile = document.getElementById('btn-panel-admin-mobile');
          if (btnAdminMobile) btnAdminMobile.classList.remove('hidden');
          document.getElementById('user-role-badge').innerHTML = '👤 Administrador';
        } else {
          document.getElementById('user-role-badge').innerHTML = '👤 Usuario';
        }
        
        await cargarPresupuestos();
        await cargarGastosSeparados();
      }
    }
    
    // Probar conexión con Firestore
    await db.collection('test').doc('connection').set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      message: 'Conexión exitosa'
    });
    
    console.log('🔗 Conexión a Firestore verificada');
    
    // Inicializar configuración del sistema si no existe
    await inicializarConfiguracion();
    
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
      console.log('Configuración inicial creada');
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
    console.log('🔍 Verificando PIN...');
    
    // Verificar si Firebase está inicializado
    if (!db) {
      throw new Error('Firebase no está inicializado correctamente');
    }
    
    console.log('📖 Leyendo configuración de sistema...');
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    
    let config;
    if (!configDoc.exists) {
      console.log('⚠️ Configuración no existe, creando valores por defecto...');
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
      
      console.log('✅ Configuración inicial creada');
    } else {
      config = configDoc.data();
      console.log('✅ Configuración encontrada:', config);
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
      mostrarNotificacion('✅ Bienvenido, Administrador', 'success');
      cargarDatos();
    } else if (pinIngresado === pinUsuarioGuardado) {
      esAdmin = false;
      usuarioActual = 'Usuario';
      
      // Guardar sesión en localStorage
      localStorage.setItem('sesionActiva', 'true');
      localStorage.setItem('esAdmin', 'false');
      localStorage.setItem('usuarioActual', usuarioActual);
      
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
document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
  esAdmin = false;
  usuarioActual = null;
  categoriaActual = 'todos';
  
  // Limpiar sesión del localStorage
  localStorage.removeItem('sesionActiva');
  localStorage.removeItem('esAdmin');
  localStorage.removeItem('usuarioActual');
  
  // Resetear UI
  document.getElementById('pin-screen').classList.remove('hidden');
  document.getElementById('pin-input').value = '';
  document.getElementById('btn-panel-admin').classList.add('hidden');
  const btnAdminMobile = document.getElementById('btn-panel-admin-mobile');
  if (btnAdminMobile) btnAdminMobile.classList.add('hidden');
  document.getElementById('user-role-badge').innerHTML = '';
  
  // Resetear botón de login
  const loginBtn = document.getElementById('login-btn');
  loginBtn.innerHTML = '🔑 Verificar PIN';
  loginBtn.disabled = false;
  
  // Limpiar listas
  document.getElementById('lista-gastos').innerHTML = '';
  
  mostrarNotificacion('👋 Sesión cerrada', 'success');
});

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
    let totalViaticos = 0;
    let totalGastosTrimestre = 0; // Total solo del trimestre actual

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
      
      // Sumar para presupuesto y viáticos (todo el año)
      if (gasto.categoria === 'presupuesto') {
        totalPresupuesto += gasto.monto || 0;
      } else if (gasto.categoria === 'viaticos') {
        totalViaticos += gasto.monto || 0;
      }
      
      // Sumar solo gastos del trimestre actual para el KPI "Total Gastado"
      if (fechaGasto >= inicioTrimestre && fechaGasto <= finTrimestre) {
        totalGastosTrimestre += gasto.monto || 0;
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
    const disponiblePresupuesto = presupuestoTotal - totalPresupuesto;
    const presupuestoDisponibleEl = document.getElementById('presupuesto-disponible');
    if (presupuestoDisponibleEl) {
      presupuestoDisponibleEl.textContent = `$${disponiblePresupuesto.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado
      if (disponiblePresupuesto < 0) {
        presupuestoDisponibleEl.className = 'text-3xl lg:text-4xl font-bold text-red-600';
      } else if (disponiblePresupuesto < presupuestoTotal * 0.2) {
        presupuestoDisponibleEl.className = 'text-3xl lg:text-4xl font-bold text-yellow-500';
      } else {
        presupuestoDisponibleEl.className = 'text-3xl lg:text-4xl font-bold text-green-500';
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
        viaticosDisponibleEl.className = 'text-2xl lg:text-3xl font-bold text-red-600';
      } else if (viaticosDisponibles < presupuestoViaticos * 0.2) {
        viaticosDisponibleEl.className = 'text-2xl lg:text-3xl font-bold text-yellow-500';
      } else {
        viaticosDisponibleEl.className = 'text-2xl lg:text-3xl font-bold text-purple-500';
      }
    }

    // ==================== ACTUALIZAR KPI: VIÁTICOS GASTADOS ====================
    const viaticosGastadosKpiEl = document.getElementById('viaticos-gastados-kpi');
    if (viaticosGastadosKpiEl) {
      viaticosGastadosKpiEl.textContent = `-$${totalViaticos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado
      viaticosGastadosKpiEl.className = totalViaticos === 0 ? 'text-2xl lg:text-3xl font-bold text-gray-400' : 'text-2xl lg:text-3xl font-bold text-orange-500';
    }

    // Actualizar el texto de saldo restante en el box de viáticos gastados
    const viaticosRestantesTextoEl = document.getElementById('viaticos-restantes-texto');
    if (viaticosRestantesTextoEl) {
      viaticosRestantesTextoEl.textContent = `$${viaticosDisponibles.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado del saldo restante
      if (viaticosDisponibles < 0) {
        viaticosRestantesTextoEl.className = 'font-semibold text-red-600';
      } else if (viaticosDisponibles < presupuestoViaticos * 0.2) {
        viaticosRestantesTextoEl.className = 'font-semibold text-yellow-600';
      } else {
        viaticosRestantesTextoEl.className = 'font-semibold text-green-600';
      }
    }

    // Actualizar elementos secundarios de viáticos
    const viaticosGastadosEl = document.getElementById('viaticos-gastados');
    if (viaticosGastadosEl) {
      viaticosGastadosEl.textContent = `$${totalViaticos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
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
      console.warn(`⚠️ Presupuesto al ${porcentajePresupuesto.toFixed(1)}% de ejecución`);
    } else if (porcentajePresupuesto >= 100) {
      console.error(`🚨 Presupuesto excedido: ${porcentajePresupuesto.toFixed(1)}%`);
    }

    if (porcentajeViaticos >= 80 && porcentajeViaticos < 100) {
      console.warn(`⚠️ Viáticos al ${porcentajeViaticos.toFixed(1)}% de ejecución`);
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

    console.log(`📊 Dashboard: calculando estadísticas para ${gastos.length} gastos`);

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
  // Calcular totales desde los gastos
  let totalPresupuestoGastos = 0;
  let totalViaticosGastos = 0;

  gastos.forEach(gasto => {
    if (gasto.categoria === 'presupuesto') {
      totalPresupuestoGastos += gasto.monto || 0;
    } else if (gasto.categoria === 'viaticos') {
      totalViaticosGastos += gasto.monto || 0;
    }
  });

  const totalGastosCalculado = totalPresupuestoGastos + totalViaticosGastos;

  // Obtener el valor mostrado en el KPI
  const totalGastadoEl = document.getElementById('total-gastado');
  const totalMostrado = totalGastadoEl ? 
    parseFloat(totalGastadoEl.textContent.replace(/[^0-9,]/g, '').replace(',', '.')) : 0;

  // Validar coherencia (con margen de 0.01 por redondeos)
  if (Math.abs(totalGastosCalculado - totalMostrado) > 0.01) {
    console.warn(`⚠️ Inconsistencia detectada: 
      Total calculado: $${totalGastosCalculado.toFixed(2)}
      Total mostrado en KPI: $${totalMostrado.toFixed(2)}`);
  } else {
    console.log(`✅ Coherencia validada: todos los números coinciden`);
  }
}

// ==================== CALCULAR GASTOS POR ORGANIZACIÓN ====================
async function calcularGastosPorOrganizacion(gastos) {
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

  // Acumular gastos por organización
  gastos.forEach(gasto => {
    const org = gasto.organizacion || 'gastos-presupuesto';
    if (organizaciones[org]) {
      organizaciones[org].total += gasto.monto || 0;
    }
  });

  // Calcular total y validar coherencia
  const totalGastos = Object.values(organizaciones).reduce((sum, org) => sum + org.total, 0);
  
  // Actualizar total en el chart (debe coincidir con el KPI de gastos)
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

  // Ordenar organizaciones de mayor a menor gasto
  const organizacionesOrdenadas = Object.entries(organizaciones)
    .sort(([, a], [, b]) => b.total - a.total)
    .filter(([, org]) => org.total > 0); // Solo mostrar las que tienen gastos

  // Actualizar lista de organizaciones con porcentajes
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
      listaOrg.innerHTML = organizacionesOrdenadas
        .map(([key, org]) => {
          const porcentaje = totalGastos > 0 ? (org.total / totalGastos * 100).toFixed(1) : 0;
          return `
            <div class="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative flex-shrink-0">
                  <span class="w-3 h-3 rounded-full block" style="background-color: ${org.color}"></span>
                </div>
                <span class="text-gray-600 font-medium truncate">${org.nombre}</span>
              </div>
              <div class="text-right ml-4">
                <div class="font-bold text-gray-900">$${org.total.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                <div class="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full inline-block mt-0.5">${porcentaje}% del total</div>
              </div>
            </div>
          `;
        }).join('');
    }
  }

  // Actualizar gráfico de dona
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
  console.log(`📊 Total anual calculado en evolución: $${totalAnual.toLocaleString('es-AR')}`);

  // Calcular gastos por trimestre para móviles
  const trimestresGastos = [
    mesesGastos[0] + mesesGastos[1] + mesesGastos[2],  // Q1: Ene-Mar
    mesesGastos[3] + mesesGastos[4] + mesesGastos[5],  // Q2: Abr-Jun
    mesesGastos[6] + mesesGastos[7] + mesesGastos[8],  // Q3: Jul-Sep
    mesesGastos[9] + mesesGastos[10] + mesesGastos[11] // Q4: Oct-Dic
  ];

  // Obtener presupuesto total como referencia del eje Y
  let presupuestoTotal = 0;
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    if (configDoc.exists) {
      const config = configDoc.data();
      presupuestoTotal = config.presupuestoTotal || 0;
    }
  } catch (error) {
    console.error('Error al obtener presupuesto para gráfico:', error);
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
  const alturaMinSinDatos = tipo === 'trimestre' ? 8 : 4;
  const alturaMinConDatos = tipo === 'trimestre' ? 12 : 8;
  const minHeightPx = tipo === 'trimestre' ? '10px' : '6px';

  if (presupuestoRef === 0) {
    // Sin presupuesto configurado: usar escala relativa
    console.warn(`⚠️ Gráfico ${tipo}: presupuesto no configurado, usando escala comparativa`);
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
    console.log(`✅ Gráfico ${tipo}: usando presupuesto $${presupuestoRef.toLocaleString('es-AR')} como referencia`);
    
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
    await db.collection('configuracion').doc('sistema').update({
      presupuestoTotal: nuevoPresupuesto,
      fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });
    
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
      console.log('📝 Guardando gasto...');

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

        const gasto = {
          descripcion: document.getElementById('descripcion').value,
          monto: montoReal,
          comision: montoComision,
          tieneComision: aplicaComision,
          fecha: document.getElementById('fecha').value,
          categoria: document.getElementById('categoria').value,
          organizacion: organizacion,
          comprobanteAdjunto: document.getElementById('comprobante').checked,
          reembolsado: document.getElementById('reembolsado').checked,
          observaciones: observaciones || '',
          registrado: false,
          eliminado: false,
          creadoPor: usuarioActual,
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('💾 Datos del gasto:', gasto);

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
          console.log('✅ Gasto actualizado:', editandoGastoId);
        } else {
          // Crear nuevo gasto
          const docRef = await db.collection('gastos').add(gasto);
          mostrarNotificacion('✅ Gasto guardado correctamente', 'success');
          console.log('✅ Gasto creado:', docRef.id);
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

    mostrarNotificacion('✅ Gasto marcado como reportado y movido al historial', 'success');
    
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
async function toggleReembolso(id, nuevoEstado) {
  try {
    await db.collection('gastos').doc(id).update({
      reembolsado: nuevoEstado,
      fechaReembolso: nuevoEstado ? firebase.firestore.FieldValue.serverTimestamp() : null,
      reembolsadoPor: nuevoEstado ? usuarioActual : null
    });

    mostrarNotificacion(nuevoEstado ? '✅ Gasto marcado como reembolsado' : '⏳ Gasto marcado como pendiente de reembolso', 'success');
    
    // Recargar gastos separados
    await cargarGastosSeparados();

  } catch (error) {
    console.error('Error al actualizar estado de reembolso:', error);
    mostrarNotificacion('❌ Error al actualizar el estado: ' + error.message, 'error');
  }
}

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
    document.getElementById('reembolsado').checked = gasto.reembolsado || false;
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
    console.log('📥 Cargando gastos...');
    
    if (!db) {
      console.error('❌ Firebase no inicializado');
      return;
    }
    
    const gastosSnapshot = await db.collection('gastos').orderBy('fecha', 'desc').get();
    let gastos = [];
    
    gastosSnapshot.forEach(doc => {
      gastos.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ ${gastos.length} gastos cargados`);

    // Aplicar filtro de estado (todos, pendientes, registrados)
    if (estadoActual === 'pendientes') {
      gastos = gastos.filter(g => !g.registrado);
      console.log(`🔍 Filtrados por pendientes: ${gastos.length} gastos`);
    } else if (estadoActual === 'registrados') {
      gastos = gastos.filter(g => g.registrado);
      console.log(`🔍 Filtrados por registrados: ${gastos.length} gastos`);
    }

    // Aplicar filtro de categoría
    if (categoriaActual !== 'todos') {
      gastos = gastos.filter(g => g.categoria === categoriaActual);
      console.log(`🔍 Filtrados por ${categoriaActual}: ${gastos.length} gastos`);
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
      console.log('⚠️ El contenedor lista-gastos no existe. Usando sistema de gastos separados.');
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
    : '<span class="inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-300 border border-gray-600 whitespace-nowrap">⏳ PENDIENTE</span>';

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
    
    // Obtener configuración actual si el modo es "sumar"
    let configActual = {};
    if (modoActualizacion === 'sumar') {
      const configDoc = await db.collection('configuracion').doc('sistema').get();
      configActual = configDoc.data() || {};
    }
    
    // Actualizar solo los campos completados
    if (inputPresupuesto) {
      const nuevoValor = parseFloat(inputPresupuesto);
      if (modoActualizacion === 'sumar') {
        updates.presupuestoTotal = (configActual.presupuestoTotal || 0) + nuevoValor;
      } else {
        updates.presupuestoTotal = nuevoValor;
      }
    }
    
    if (inputViaticos) {
      const nuevoValor = parseFloat(inputViaticos);
      if (modoActualizacion === 'sumar') {
        updates.presupuestoViaticos = (configActual.presupuestoViaticos || 0) + nuevoValor;
      } else {
        updates.presupuestoViaticos = nuevoValor;
      }
    }
    
    // Guardar configuración de acumulación
    updates.acumularSaldoSobrante = acumularSaldo;
    updates.fechaActualizacion = firebase.firestore.FieldValue.serverTimestamp();
    
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
      console.log('No se pudo copiar al portapapeles');
    });
    
  } catch (error) {
    console.error('Error al recuperar cuenta:', error);
    alert('❌ Error al procesar la solicitud. Verifica tu conexión.');
  }
}

function iniciarEscuchaEnTiempoReal() {
  db.collection('configuracion').doc('sistema').onSnapshot((doc) => {
    if (doc.exists) {
      console.log('🔄 Actualización en tiempo real detectada');
      cargarPresupuestos();
      calcularGastos();
      calcularEstadisticasDashboard();
    }
  });
  
  db.collection('gastos').onSnapshot(() => {
    console.log('📊 Gastos actualizados en tiempo real');
    cargarGastosSeparados();
    calcularGastos();
    calcularEstadisticasDashboard();
  });
}

// ==================== NUEVO SISTEMA DE SEPARACIÓN DE GASTOS ====================

// Función para cargar gastos separados
async function cargarGastosSeparados() {
  try {
    console.log('📥 Cargando gastos separados...');
    
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

    console.log(`✅ ${todosgastos.length} gastos cargados en total`);

    // Separar gastos pendientes y reportados
    const gastosPendientes = todosgastos.filter(g => !g.registrado);
    const gastosReportados = todosgastos.filter(g => g.registrado);

    console.log(`⏳ ${gastosPendientes.length} gastos pendientes`);
    console.log(`✅ ${gastosReportados.length} gastos reportados`);

    // Renderizar ambas secciones
    renderGastosPendientes(gastosPendientes);
    renderGastosReportados(gastosReportados);
    
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
        <p class="text-[10px]">Todos los gastos han sido reportados</p>
      </div>
    `;
  } else {
    // Lista vertical para tarjetas horizontales
    container.innerHTML = `
      <div class="flex flex-col gap-3">
        ${gastosFiltrados.map(crearTarjetaGastoPendiente).join('')}
      </div>
    `;
  }
}

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
        <p class="text-xs mb-0.5 font-medium">No hay gastos reportados aún</p>
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
    const grupoId = `grupo-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    return `
      <div class="mb-3 border border-gray-200 rounded-lg overflow-hidden">
        <div class="bg-gradient-to-r from-sky-100 to-blue-100 p-3 cursor-pointer hover:from-sky-200 hover:to-blue-200 transition-all"
             onclick="toggleGrupoGastos('${grupoId}')">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-bold text-gray-800 flex items-center">
              <span id="icon-${grupoId}" class="mr-1.5 text-sm transition-transform duration-300">▼</span>
              <span class="mr-2">${icono}</span>
              ${grupo.label}
            </h3>
            <div class="text-right">
              <p class="text-[10px] text-gray-600">${grupo.gastos.length} gasto${grupo.gastos.length !== 1 ? 's' : ''}</p>
              <p class="text-sm font-bold text-sky-600">
                $${grupo.total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>
        </div>
        
        <div id="${grupoId}" class="p-3 bg-gray-50 transition-all duration-300">
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
    <label class="flex items-center cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-all group w-full sm:w-auto justify-center sm:justify-start bg-white shadow-sm" title="Marcar como reportado">
      <input type="checkbox" 
        onchange="marcarComoReportado('${gasto.id}')"
        class="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer">
      <span class="ml-2 text-xs font-semibold text-gray-700 group-hover:text-green-700">Reportar</span>
    </label>
  `;

  // Botón de Reembolso
  const reembolsoBtn = `
    <button onclick="toggleReembolso('${gasto.id}', ${!gasto.reembolsado})" 
      class="w-full sm:w-auto justify-center ${gasto.reembolsado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'} border px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold shadow-sm hover:shadow-md" 
      title="${gasto.reembolsado ? 'Marcar como NO reembolsado' : 'Marcar como reembolsado'}">
      ${gasto.reembolsado ? '<span class="text-sm">✅</span>' : '<span class="text-sm">⏳</span>'}
      <span>${gasto.reembolsado ? 'Reembolsado' : 'Pendiente'}</span>
    </button>
  `;

  // Botón Ver Detalle
  const verDetalleBtn = `
    <button onclick='mostrarDetalleGasto(${JSON.stringify(gasto).replace(/'/g, "&#39;")})'  
      class="w-full sm:w-auto justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold" title="Ver detalle">
      <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
      <span>Ver</span>
    </button>
  `;

  const editarBtn = esAdmin ? `
    <button onclick="editarGasto('${gasto.id}')"  
      class="w-full sm:w-auto justify-center bg-white hover:bg-blue-50 text-blue-600 border border-gray-200 hover:border-blue-200 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold" title="Editar gasto">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
      <span>Editar</span>
    </button>
  ` : '';

  const eliminarBtn = esAdmin ? `
    <button onclick="eliminarGasto('${gasto.id}')"  
      class="w-full sm:w-auto justify-center bg-white hover:bg-red-50 text-red-600 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-semibold" title="Eliminar gasto">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      <span>Eliminar</span>
    </button>
  ` : '';

  return `
    <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 w-full">
      <!-- Upper Section: Info & Amount -->
      <div class="flex justify-between items-start gap-3">
        <!-- Left: Main Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-2">
             <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-yellow-100 text-yellow-800 border border-yellow-200">PENDIENTE</span>
             <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-${cat.color}-50 text-${cat.color}-700 border border-${cat.color}-100 flex items-center gap-1">${cat.emoji} ${cat.label}</span>
          </div>

          <h4 class="text-sm font-bold text-gray-900 mb-1 leading-tight">${gasto.descripcion}</h4>
          
          <div class="flex items-center gap-3 text-xs text-gray-500 mt-2">
            <span class="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
              📅 ${parseFechaLocal(gasto.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
            </span>
             ${gasto.observaciones ? `<span class="italic text-gray-400 max-w-[150px] truncate">📝 ${gasto.observaciones}</span>` : ''}
          </div>
        </div>

        <!-- Right: Amount -->
        <div class="text-right flex-shrink-0">
          ${gasto.comision && gasto.comision > 0 ? `
              <p class="text-lg font-bold text-gray-800 leading-none" title="Monto Real">$${(gasto.monto).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              <div class="flex flex-col items-end gap-0.5 mt-1">
                  <span class="text-[10px] text-purple-600 font-bold px-1.5 py-0.5 bg-purple-50 rounded border border-purple-100" title="Comisión MercadoPago/Libre">+ $${gasto.comision.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Com.</span>
                  <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">Total: $${(gasto.monto + gasto.comision).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
          ` : `
              <p class="text-xl font-bold text-gray-800 leading-none">
                $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
              <p class="text-[10px] text-gray-400 font-medium mt-1">Monto total</p>
          `}
        </div>
      </div>

      <!-- Lower Section: Actions Grid -->
      <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-3 border-t border-gray-100">
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

  const reembolsoIcon = gasto.reembolsado
    ? '<span class="text-green-600 text-xs lg:text-sm font-semibold flex items-center gap-1">✅ Reembolsado</span>'
    : '<span class="text-orange-600 text-xs lg:text-sm font-semibold flex items-center gap-1">⏳ Pendiente</span>';

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
          ✅ REPORTADO
        </span>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-${cat.color}-100 text-${cat.color}-800 flex-shrink-0">
          ${cat.emoji} ${cat.label}
        </span>
      </div>
      
      <!-- Contenido principal -->
      <div class="mb-2">
        <h4 class="text-xs font-bold text-gray-900 mb-1.5 line-clamp-2">${gasto.descripcion}</h4>
        ${gasto.comision && gasto.comision > 0 ? `
            <div class="flex items-baseline gap-1 flex-wrap">
                <p class="text-base font-bold text-sky-600" title="Monto Real">$${(gasto.monto).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                <span class="text-[10px] text-purple-600 font-bold bg-purple-50 px-1 py-0.5 rounded border border-purple-100" title="Comisión">+ $${gasto.comision.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <p class="text-[9px] text-gray-400 mt-1 font-medium">Total: $${(gasto.monto + gasto.comision).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        ` : `
            <p class="text-base font-bold text-sky-600">
              $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
        `}
      </div>
      
      <!-- Footer con información y acción -->
      <div class="flex justify-between items-center pt-2 border-t border-gray-200">
        <div class="flex flex-col gap-1">
          <span class="text-[10px] text-gray-600 flex items-center gap-1">
            <span>📅</span>
            <span>${parseFechaLocal(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
          </span>
          <div class="text-[9px]">${comprobanteIcon}</div>
          <div class="text-[9px]">${reembolsoIcon}</div>
        </div>
        ${esAdmin ? `
          <div class="flex flex-col gap-1.5">
            ${editarBtn}
            ${eliminarBtn}
          </div>
        ` : ''}
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

// ==================== DETALLE DE GASTO (LIGHTBOX) ====================
function mostrarDetalleGasto(gasto) {
  const modal = document.getElementById('modal-detalle-gasto');
  const contenido = document.getElementById('contenido-detalle-gasto');
  
  if (!modal || !contenido) return;

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

  const html = `
    <div class="p-6 space-y-4">
      <!-- Encabezado con monto y estado -->
      <div class="flex justify-between items-start">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-${cat.color}-100 text-${cat.color}-800 border border-${cat.color}-200 mb-2">
            ${cat.emoji} ${cat.label}
          </span>
          <h2 class="text-3xl font-bold text-gray-900">$${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</h2>
          <p class="text-sm text-gray-500 mt-1 capitalize">${fecha}</p>
        </div>
      </div>

      <!-- Descripción -->
      <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
        <label class="text-xs font-bold text-gray-400 uppercase tracking-wide">Descripción</label>
        <p class="text-gray-800 font-medium text-lg mt-1">${gasto.descripcion}</p>
      </div>

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

// La función cargarGastos() ahora usa el sistema separado
// Se mantiene la referencia original para compatibilidad
// ==================== INICIALIZACIÓN DE FIREBASE ====================
