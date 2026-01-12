// ==================== INICIALIZACIÓN DE FIREBASE ====================
let db, storage, usuarioActual = null, esAdmin = false, categoriaActual = 'todos', estadoActual = 'todos';

// Variables globales para sistema de separación de gastos
let categoriaPendientes = 'todos';
let categoriaReportados = 'todos';
let vistaHistorial = 'mes'; // 'mes', 'trimestre', 'anio'

document.addEventListener('DOMContentLoaded', async () => {
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

    if (pin === config.pinAdmin) {
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
    } else if (pin === config.pinUsuario) {
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

    gastosSnapshot.forEach(doc => {
      const gasto = doc.data();
      if (gasto.categoria === 'presupuesto') {
        totalPresupuesto += gasto.monto || 0;
      } else if (gasto.categoria === 'viaticos') {
        totalViaticos += gasto.monto || 0;
      }
    });

    // Total combinado de todos los gastos
    const totalGastos = totalPresupuesto + totalViaticos;

    // ==================== ACTUALIZAR KPI: TOTAL GASTADO ====================
    const totalGastadoEl = document.getElementById('total-gastado');
    if (totalGastadoEl) {
      totalGastadoEl.textContent = `-$${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      // Colorear según estado
      totalGastadoEl.className = totalGastos === 0 ? 'text-3xl lg:text-4xl font-bold text-gray-400' : 'text-3xl lg:text-4xl font-bold text-red-500';
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
        viaticosDisponibleEl.className = 'text-3xl lg:text-4xl font-bold text-red-600';
      } else if (viaticosDisponibles < presupuestoViaticos * 0.2) {
        viaticosDisponibleEl.className = 'text-3xl lg:text-4xl font-bold text-yellow-500';
      } else {
        viaticosDisponibleEl.className = 'text-3xl lg:text-4xl font-bold text-pink-500';
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
      totalElement.textContent = 'Sin movimientos';
      totalElement.className = 'text-3xl lg:text-4xl font-bold text-gray-400';
    } else {
      totalElement.textContent = `$${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
      totalElement.className = 'text-3xl lg:text-4xl font-bold text-sky-600';
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
            <div class="flex items-center justify-between text-sm lg:text-base py-1">
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${org.color}"></span>
                <span class="text-gray-700 truncate">${org.nombre}</span>
              </div>
              <div class="text-right ml-2 flex-shrink-0">
                <span class="font-bold text-gray-900">$${org.total.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                <span class="text-xs text-gray-500 ml-1">(${porcentaje}%)</span>
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
      const fecha = new Date(gasto.fecha);
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
  document.getElementById('modal-gasto').classList.add('hidden');
  document.getElementById('form-gasto').reset();
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
  fileInput.value = '';
  document.getElementById('file-preview').classList.add('hidden');
  document.getElementById('drag-placeholder').classList.remove('hidden');
}

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
        const gasto = {
          descripcion: document.getElementById('descripcion').value,
          monto: parseFloat(document.getElementById('monto').value),
          fecha: document.getElementById('fecha').value,
          categoria: document.getElementById('categoria').value,
          organizacion: organizacion,
          comprobanteAdjunto: document.getElementById('comprobante').checked,
          observaciones: observaciones || '',
          registrado: false,
          eliminado: false,
          creadoPor: usuarioActual,
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('💾 Datos del gasto:', gasto);

        const docRef = await db.collection('gastos').add(gasto);
        console.log('✅ Gasto guardado con ID:', docRef.id);
        
        mostrarNotificacion('✅ Gasto guardado correctamente', 'success');

        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;

        cerrarModal();
        await cargarGastos();

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

// Eliminar gasto (soft delete con fecha)
async function eliminarGasto(id) {
  const btnEliminar = document.querySelector(`button[onclick="eliminarGasto('${id}')"]`);
  if (!btnEliminar) return;

  if (btnEliminar.textContent.includes('Confirmar')) {
    btnEliminar.disabled = true;
    btnEliminar.textContent = 'Eliminando...';

    try {
      // Soft delete: marcar como eliminado en lugar de borrar
      await db.collection('gastos').doc(id).update({
        eliminado: true,
        fechaEliminacion: firebase.firestore.FieldValue.serverTimestamp(),
        eliminadoPor: usuarioActual
      });
      mostrarNotificacion('✅ Gasto eliminado correctamente', 'success');
      await cargarGastosSeparados();
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      mostrarNotificacion('❌ Error al eliminar: ' + error.message, 'error');
      btnEliminar.disabled = false;
      btnEliminar.textContent = '🗑️ Eliminar';
    }
  } else {
    btnEliminar.textContent = '✓ Confirmar';
    btnEliminar.classList.remove('bg-red-600', 'hover:bg-red-700');
    btnEliminar.classList.add('bg-orange-500', 'hover:bg-orange-600');

    setTimeout(() => {
      if (btnEliminar.textContent.includes('Confirmar')) {
        btnEliminar.textContent = '🗑️ Eliminar';
        btnEliminar.classList.remove('bg-orange-500', 'hover:bg-orange-600');
        btnEliminar.classList.add('bg-red-600', 'hover:bg-red-700');
      }
    }, 3000);
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
    
    // Rellenar el formulario con los datos del gasto
    document.getElementById('descripcion').value = gasto.descripcion || '';
    document.getElementById('monto').value = gasto.monto || 0;
    document.getElementById('fecha').value = gasto.fecha || '';
    document.getElementById('categoria').value = gasto.categoria || '';
    if (document.getElementById('organizacion')) {
      document.getElementById('organizacion').value = gasto.organizacion || '';
    }
    document.getElementById('comprobante').checked = gasto.comprobanteAdjunto || false;
    document.getElementById('observaciones').value = gasto.observaciones || '';
    
    // Cambiar el título del modal
    document.getElementById('modal-title').innerHTML = '<span class="mr-2 lg:mr-3 text-xl lg:text-3xl">✏️</span>Editar Gasto';
    
    // Abrir el modal
    document.getElementById('modal-gasto').classList.remove('hidden');
    
    // Cambiar el comportamiento del botón guardar para actualizar en lugar de crear
    const formGasto = document.getElementById('form-gasto');
    const btnGuardar = document.getElementById('btn-guardar');
    
    // Remover event listeners anteriores clonando el formulario
    const nuevoForm = formGasto.cloneNode(true);
    formGasto.parentNode.replaceChild(nuevoForm, formGasto);
    
    // Agregar nuevo event listener para actualizar
    nuevoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btnGuardarActual = document.getElementById('btn-guardar');
      const textoOriginal = btnGuardarActual.innerHTML;
      btnGuardarActual.disabled = true;
      btnGuardarActual.innerHTML = '⏳ Actualizando...';
      
      try {
        const observaciones = document.getElementById('observaciones').value.trim();
        const organizacion = document.getElementById('organizacion')?.value || 'gastos-presupuesto';
        const datosActualizados = {
          descripcion: document.getElementById('descripcion').value,
          monto: parseFloat(document.getElementById('monto').value),
          fecha: document.getElementById('fecha').value,
          categoria: document.getElementById('categoria').value,
          organizacion: organizacion,
          comprobanteAdjunto: document.getElementById('comprobante').checked,
          observaciones: observaciones || '',
          fechaEdicion: firebase.firestore.FieldValue.serverTimestamp(),
          editadoPor: usuarioActual
        };
        
        await db.collection('gastos').doc(id).update(datosActualizados);
        mostrarNotificacion('✅ Gasto actualizado correctamente', 'success');
        
        cerrarModal();
        await cargarGastos();
        
        // Restaurar el comportamiento original del formulario
        configurarEventListeners();
      } catch (error) {
        console.error('Error al actualizar gasto:', error);
        mostrarNotificacion('❌ Error al actualizar: ' + error.message, 'error');
        btnGuardarActual.disabled = false;
        btnGuardarActual.innerHTML = textoOriginal;
      }
    });
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
    
    const gastosSnapshot = await db.collection('gastos').orderBy('fechaCreacion', 'desc').get();
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

    renderGastos(gastos);
  } catch (error) {
    console.error('❌ Error al cargar gastos:', error);
    mostrarNotificacion('❌ Error al cargar gastos: ' + error.message, 'error');
  }
}

async function renderGastos(gastosArray = null) {
  try {
    let gastos = gastosArray;
    
    if (!gastos) {
      const gastosSnapshot = await db.collection('gastos').orderBy('fechaCreacion', 'desc').get();
      gastos = [];
      gastosSnapshot.forEach(doc => {
        gastos.push({ id: doc.id, ...doc.data() });
      });
    }

    const container = document.getElementById('lista-gastos');

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
    <div class="mt-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
      <p class="text-xs lg:text-sm text-gray-300"><strong class="text-blue-400">📋 Observaciones:</strong> ${gasto.observaciones}</p>
    </div>
  ` : '';

  // Mostrar información de fechas de modificación/eliminación si existen
  let infoFechas = '';
  if (gasto.fechaEdicion) {
    const fechaEdit = gasto.fechaEdicion.toDate ? gasto.fechaEdicion.toDate() : new Date(gasto.fechaEdicion);
    infoFechas += `<span class="text-xs text-yellow-400">✏️ Editado: ${fechaEdit.toLocaleString('es-AR')}</span>`;
  }
  if (gasto.fechaEliminacion) {
    const fechaElim = gasto.fechaEliminacion.toDate ? gasto.fechaEliminacion.toDate() : new Date(gasto.fechaEliminacion);
    infoFechas += `<span class="text-xs text-red-400 ml-2">🗑️ Eliminado: ${fechaElim.toLocaleString('es-AR')}</span>`;
  }
  const infoFechasHTML = infoFechas ? `<div class="mt-2">${infoFechas}</div>` : '';

  // Determinar si el gasto fue eliminado (soft delete)
  const esEliminado = gasto.eliminado === true;
  const claseEliminado = esEliminado ? 'opacity-60 border-red-500' : '';
  const marcaEliminado = esEliminado ? '<span class="inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs font-bold bg-red-900 text-red-300 border border-red-700 whitespace-nowrap ml-2">🗑️ ELIMINADO</span>' : '';

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
          <p class="text-xs lg:text-sm text-gray-400">${comprobanteIcon}</p>
          ${observacionesHTML}
          ${infoFechasHTML}
        </div>
        <div class="flex-shrink-0 text-left lg:text-right">
          <p class="text-2xl lg:text-3xl font-bold text-orange-400">$${gasto.monto.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p class="text-xs text-gray-500 mt-1">ARS</p>
        </div>
      </div>

      ${!esEliminado ? `
      <div class="flex flex-col gap-3 pt-4 border-t border-gray-700">
        ${esAdmin ? `
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" ${gasto.registrado ? 'checked' : ''} 
            onchange="toggleRegistrado('${gasto.id}', this.checked)"
            class="w-5 h-5 rounded border-2 border-gray-600 bg-gray-700 text-orange-500 focus:ring-2 focus:ring-orange-500 flex-shrink-0">
          <span class="ml-2 text-sm lg:text-base text-white font-semibold">Marcar como registrado</span>
        </label>
        ` : ''}
        <div class="flex flex-col lg:flex-row gap-2">
          <button onclick="editarGasto('${gasto.id}')" 
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors text-sm lg:text-base">
            ✏️ Editar
          </button>
          <button onclick="eliminarGasto('${gasto.id}')" data-id="${gasto.id}" 
            class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors text-sm lg:text-base">
            🗑️ Eliminar
          </button>
        </div>
      </div>
      ` : ''}
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
  
  // Limpiar campos para que estén vacíos
  document.getElementById('nuevo-presupuesto-total').value = '';
  document.getElementById('nuevo-presupuesto-viaticos').value = '';
  document.getElementById('nuevo-pin-usuario').value = '';
  document.getElementById('nuevo-pin-admin').value = '';
}

async function actualizarPresupuestos() {
  const inputPresupuesto = document.getElementById('nuevo-presupuesto-total').value;
  const inputViaticos = document.getElementById('nuevo-presupuesto-viaticos').value;
  
  if (!inputPresupuesto || !inputViaticos) {
    mostrarNotificacion('⚠️ Debes ingresar ambos valores', 'error');
    return;
  }
  
  const presupuestoTotal = parseFloat(inputPresupuesto);
  const presupuestoViaticos = parseFloat(inputViaticos);
  
  if (presupuestoTotal < 0 || presupuestoViaticos < 0) {
    mostrarNotificacion('⚠️ Los valores no pueden ser negativos', 'error');
    return;
  }
  
  try {
    await db.collection('configuracion').doc('sistema').update({
      presupuestoTotal: presupuestoTotal,
      presupuestoViaticos: presupuestoViaticos,
      fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    mostrarNotificacion('✅ Presupuestos actualizados correctamente', 'success');
    document.getElementById('modal-admin').classList.add('hidden');
    await cargarDatos();
    
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

// Actualizar seguridad completa (email + PINs)
async function actualizarSeguridadCompleta() {
  const emailRecuperacion = document.getElementById('nuevo-email-recuperacion').value;
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
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRecuperacion && !emailRegex.test(emailRecuperacion)) {
    mostrarNotificacion('❌ El email ingresado no es válido', 'error');
    return;
  }
  
  try {
    const updates = {};
    if (emailRecuperacion) updates.emailRecuperacion = emailRecuperacion;
    if (pinUsuario) updates.pinUsuario = pinUsuario;
    if (pinAdmin) updates.pinAdmin = pinAdmin;
    
    if (Object.keys(updates).length === 0) {
      mostrarNotificacion('⚠️ No hay cambios para actualizar', 'error');
      return;
    }
    
    updates.fechaActualizacion = firebase.firestore.FieldValue.serverTimestamp();
    
    await db.collection('configuracion').doc('sistema').update(updates);
    
    let mensaje = '✅ Configuración actualizada: ';
    if (emailRecuperacion) mensaje += 'Email ';
    if (pinUsuario) mensaje += 'PIN Usuario ';
    if (pinAdmin) mensaje += 'PIN Admin';
    
    mostrarNotificacion(mensaje, 'success');
    
    document.getElementById('nuevo-email-recuperacion').value = '';
    document.getElementById('nuevo-pin-usuario').value = '';
    document.getElementById('nuevo-pin-admin').value = '';
    
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
      .orderBy('fechaCreacion', 'desc')
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
      <div class="text-center text-gray-500 py-12 lg:py-16">
        <span class="text-6xl lg:text-8xl mb-4 lg:mb-6 block">✅</span>
        <p class="text-xl lg:text-2xl mb-3 lg:mb-4 font-semibold">¡Excelente! No hay gastos pendientes</p>
        <p class="text-base lg:text-lg">Todos los gastos han sido reportados</p>
      </div>
    `;
  } else {
    // Grid responsive: 1 columna en móvil, 2 en tablet, 3 en desktop
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
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
      <div class="text-center text-gray-500 py-12 lg:py-16">
        <span class="text-6xl lg:text-8xl mb-4 lg:mb-6 block">📋</span>
        <p class="text-xl lg:text-2xl mb-3 lg:mb-4 font-semibold">No hay gastos reportados aún</p>
        <p class="text-base lg:text-lg">Los gastos aprobados aparecerán aquí</p>
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
    const fecha = new Date(gasto.fecha);
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
    const fecha = new Date(gasto.fecha);
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
    const fecha = new Date(gasto.fecha);
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
      <div class="mb-6 lg:mb-8 border border-gray-200 rounded-xl overflow-hidden">
        <div class="bg-gradient-to-r from-sky-100 to-blue-100 p-4 lg:p-6 cursor-pointer hover:from-sky-200 hover:to-blue-200 transition-all"
             onclick="toggleGrupoGastos('${grupoId}')">
          <div class="flex justify-between items-center">
            <h3 class="text-lg lg:text-2xl font-bold text-gray-800 flex items-center">
              <span id="icon-${grupoId}" class="mr-2 text-xl transition-transform duration-300">▼</span>
              <span class="mr-2 lg:mr-3">${icono}</span>
              ${grupo.label}
            </h3>
            <div class="text-right">
              <p class="text-xs lg:text-sm text-gray-600">${grupo.gastos.length} gasto${grupo.gastos.length !== 1 ? 's' : ''}</p>
              <p class="text-lg lg:text-2xl font-bold text-sky-600">
                $${grupo.total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>
        </div>
        
        <div id="${grupoId}" class="p-4 lg:p-6 bg-gray-50 transition-all duration-300">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
    ? '<span class="text-green-600 text-xs lg:text-sm font-semibold flex items-center gap-1"><svg class="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>Con comprobante</span>' 
    : '<span class="text-gray-400 text-xs lg:text-sm font-medium flex items-center gap-1"><svg class="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>Sin comprobante</span>';

  const checkboxHtml = gasto.reportado ? '' : `
    <label class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-all">
      <input type="checkbox" 
        onchange="marcarComoReportado('${gasto.id}')"
        class="w-5 h-5 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer">
      <span class="text-sm lg:text-base font-medium text-gray-700">Marcar como reportado</span>
    </label>
  `;

  const eliminarBtn = esAdmin ? `
    <button onclick="eliminarGasto('${gasto.id}')" 
      class="bg-red-500 hover:bg-red-600 text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl font-semibold transition-all hover:scale-105 text-sm lg:text-base w-full flex items-center justify-center gap-2">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
      Eliminar
    </button>
  ` : '';

  return `
    <div class="bg-white border-2 border-gray-200 rounded-2xl p-5 lg:p-6 hover:shadow-2xl transition-all hover:border-sky-400 flex flex-col h-full">
      <!-- Header con badges -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <span class="px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>
          PENDIENTE
        </span>
        <span class="px-3 py-1.5 rounded-full text-xs font-bold bg-${cat.color}-100 text-${cat.color}-800 border border-${cat.color}-300">
          ${cat.emoji} ${cat.label}
        </span>
      </div>
      
      <!-- Descripción -->
      <h4 class="text-lg lg:text-xl font-bold text-gray-900 mb-4 line-clamp-2 leading-tight">${gasto.descripcion}</h4>
      
      <!-- Monto destacado con mejor espaciado -->
      <div class="mb-5 pb-4 border-b border-gray-100">
        <p class="text-2xl lg:text-3xl font-extrabold text-sky-600 mb-2 leading-none tracking-tight numero-grande">
          $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </p>
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Monto del gasto</p>
      </div>
      
      <!-- Información adicional con iconos -->
      <div class="flex-1 space-y-3 mb-4">
        <div class="flex items-center gap-2 text-sm text-gray-700">
          <svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path></svg>
          <span class="font-medium">${new Date(gasto.fecha).toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="flex items-center gap-2">
          ${comprobanteIcon}
        </div>
      </div>
      
      <!-- Acciones -->
      ${checkboxHtml || eliminarBtn ? `
        <div class="flex flex-col gap-3 pt-4 border-t-2 border-gray-200">
          ${checkboxHtml}
          ${eliminarBtn}
        </div>
      ` : ''}
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

  const eliminarBtn = esAdmin ? `
    <button onclick="eliminarGasto('${gasto.id}')" 
      class="bg-red-500 hover:bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg font-semibold transition-all text-xs lg:text-sm">
      🗑️
    </button>
  ` : '';

  return `
    <div class="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-xl transition-all">
      <!-- Header con badges -->
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300 flex-shrink-0">
          ✅ REPORTADO
        </span>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-${cat.color}-100 text-${cat.color}-800 border border-${cat.color}-300 flex-shrink-0">
          ${cat.emoji} ${cat.label}
        </span>
      </div>
      
      <!-- Contenido principal -->
      <div class="mb-3">
        <h4 class="text-sm lg:text-base font-bold text-gray-900 mb-2 line-clamp-2">${gasto.descripcion}</h4>
        <p class="text-2xl lg:text-3xl font-bold text-sky-600 mb-2">
          $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </p>
      </div>
      
      <!-- Footer con información y acción -->
      <div class="flex justify-between items-center pt-3 border-t border-gray-200">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-gray-600 flex items-center gap-1">
            <span>📅</span>
            <span>${new Date(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </span>
          <div class="text-xs">${comprobanteIcon}</div>
        </div>
        ${eliminarBtn ? `<div>${eliminarBtn}</div>` : ''}
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
        btn.className = 'filtro-btn btn-primary px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-semibold whitespace-nowrap text-sm lg:text-base text-white';
      } else {
        btn.className = 'filtro-btn bg-gray-200 text-gray-700 px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all whitespace-nowrap text-sm lg:text-base';
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
        btn.className = 'filtro-btn btn-primary px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-semibold whitespace-nowrap text-sm lg:text-base text-white';
      } else {
        btn.className = 'filtro-btn bg-gray-200 text-gray-700 px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all whitespace-nowrap text-sm lg:text-base';
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
        tab.className = 'tab-btn px-4 lg:px-6 py-2 lg:py-3 font-semibold text-gray-800 border-b-2 border-sky-500 transition-all whitespace-nowrap text-sm lg:text-base';
      } else {
        tab.className = 'tab-btn px-4 lg:px-6 py-2 lg:py-3 font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-800 transition-all whitespace-nowrap text-sm lg:text-base';
      }
    }
  });
  
  cargarGastosSeparados();
}

// La función cargarGastos() ahora usa el sistema separado
// Se mantiene la referencia original para compatibilidad
// ==================== INICIALIZACIÓN DE FIREBASE ====================
