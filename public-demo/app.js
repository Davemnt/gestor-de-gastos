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
document.getElementById('pin-input').addEventListener('keypress', function(e) {
  if (e.key === "Enter") validarPIN();
});

// Cerrar sesión
document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
  esAdmin = false;
  usuarioActual = null;
  categoriaActual = 'todos';
  
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
}

async function cargarPresupuestos() {
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    if (configDoc.exists) {
      const config = configDoc.data();
      
      // Actualizar presupuesto total
      const presupuestoTotal = config.presupuestoTotal || 0;
      document.getElementById('presupuesto-total').textContent = `$${presupuestoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      
      // Actualizar presupuesto viáticos
      const presupuestoViaticos = config.presupuestoViaticos || 0;
      document.getElementById('presupuesto-viaticos').textContent = `$${presupuestoViaticos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      
      // Calcular gastos
      await calcularGastos();
    }
  } catch (error) {
    console.error('Error al cargar presupuestos:', error);
  }
}

async function calcularGastos() {
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    const config = configDoc.data();
    const presupuestoTotal = config.presupuestoTotal || 0;
    const presupuestoViaticos = config.presupuestoViaticos || 0;

    const gastosSnapshot = await db.collection('gastos').get();
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

    // Actualizar Presupuesto Total
    document.getElementById('total-gastado').textContent = `$${totalPresupuesto.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const disponiblePresupuesto = presupuestoTotal - totalPresupuesto;
    document.getElementById('presupuesto-disponible').textContent = `$${disponiblePresupuesto.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Barra de progreso presupuesto
    const porcentajePresupuesto = presupuestoTotal > 0 ? (totalPresupuesto / presupuestoTotal) * 100 : 0;
    document.getElementById('porcentaje-usado').textContent = `${porcentajePresupuesto.toFixed(1)}%`;
    document.getElementById('barra-progreso').style.width = `${Math.min(porcentajePresupuesto, 100)}%`;

    // Actualizar Viáticos
    document.getElementById('viaticos-gastados').textContent = `$${totalViaticos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const viaticosDisponibles = presupuestoViaticos - totalViaticos;
    document.getElementById('viaticos-disponibles').textContent = `$${viaticosDisponibles.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Barra de progreso viáticos
    const porcentajeViaticos = presupuestoViaticos > 0 ? (totalViaticos / presupuestoViaticos) * 100 : 0;
    document.getElementById('porcentaje-viaticos').textContent = `${porcentajeViaticos.toFixed(1)}%`;
    document.getElementById('barra-viaticos').style.width = `${Math.min(porcentajeViaticos, 100)}%`;

  } catch (error) {
    console.error('Error al calcular gastos:', error);
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
document.getElementById('btn-panel-admin').addEventListener('click', async () => {
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
document.getElementById('form-editar-presupuesto').addEventListener('submit', async (e) => {
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
document.getElementById('form-editar-viaticos').addEventListener('submit', async (e) => {
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
document.getElementById('form-cambiar-pins').addEventListener('submit', async (e) => {
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

document.getElementById('btn-nuevo-gasto').addEventListener('click', () => {
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

        const gasto = {
          descripcion: document.getElementById('descripcion').value,
          monto: parseFloat(document.getElementById('monto').value),
          fecha: document.getElementById('fecha').value,
          categoria: document.getElementById('categoria').value,
          comprobanteAdjunto: document.getElementById('comprobante').checked,
          registrado: false,
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

// Eliminar gasto
async function eliminarGasto(id) {
  if (!esAdmin) {
    mostrarNotificacion('❌ Solo el administrador puede eliminar gastos', 'error');
    return;
  }

  const btnEliminar = document.querySelector(`button[onclick="eliminarGasto('${id}')"]`);
  if (!btnEliminar) return;

  if (btnEliminar.textContent.includes('Confirmar')) {
    btnEliminar.disabled = true;
    btnEliminar.textContent = 'Eliminando...';

    try {
      await db.collection('gastos').doc(id).delete();
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
    btnEliminar.classList.remove('bg-red-500', 'hover:bg-red-600');
    btnEliminar.classList.add('bg-orange-500', 'hover:bg-orange-600');

    setTimeout(() => {
      if (btnEliminar.textContent.includes('Confirmar')) {
        btnEliminar.textContent = '🗑️ Eliminar';
        btnEliminar.classList.remove('bg-orange-600', 'hover:bg-orange-700');
        btnEliminar.classList.add('bg-red-600', 'hover:bg-red-700');
      }
    }, 3000);
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

  return `
    <div class="card-dark rounded-2xl p-4 lg:p-6 hover:border-2 hover:border-orange-500 transition-all">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs lg:text-sm font-bold bg-${cat.color}-900 text-${cat.color}-300 border border-${cat.color}-700 whitespace-nowrap">
              ${cat.emoji} ${cat.label}
            </span>
            <span class="text-xs lg:text-sm text-gray-400 whitespace-nowrap">📅 ${gasto.fecha}</span>
            ${estadoRegistro}
          </div>
          <h4 class="text-base lg:text-xl font-bold text-white mb-2 break-words">${gasto.descripcion}</h4>
          <p class="text-xs lg:text-sm text-gray-400">${comprobanteIcon}</p>
        </div>
        <div class="flex-shrink-0 text-left lg:text-right">
          <p class="text-2xl lg:text-3xl font-bold text-orange-400">$${gasto.monto.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p class="text-xs text-gray-500 mt-1">ARS</p>
        </div>
      </div>

      ${esAdmin ? `
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-4 border-t border-gray-700">
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" ${gasto.registrado ? 'checked' : ''} 
            onchange="toggleRegistrado('${gasto.id}', this.checked)"
            class="w-5 h-5 rounded border-2 border-gray-600 bg-gray-700 text-orange-500 focus:ring-2 focus:ring-orange-500 flex-shrink-0">
          <span class="ml-2 text-sm lg:text-base text-white font-semibold">Marcar como registrado</span>
        </label>
        <button onclick="eliminarGasto('${gasto.id}')" data-id="${gasto.id}" 
          class="w-full lg:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors text-sm lg:text-base">
          🗑️ Eliminar
        </button>
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
  mostrarMensajeDemo();
}

// Mostrar mensaje de función bloqueada en DEMO
function mostrarMensajeDemo() {
  alert('🔒 FUNCIÓN BLOQUEADA EN VERSIÓN DEMO\n\n⚠️ Por motivos de seguridad, el cambio de contraseñas está deshabilitado en la versión de demostración.\n\n💡 Esta es una medida de protección para evitar que usuarios bloqueen el acceso público a la aplicación.\n\n📧 Para la versión completa, contacta al desarrollador.');
  mostrarNotificacion('⚠️ Función bloqueada en versión DEMO', 'error');
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
      console.log(' Actualizaci�n en tiempo real detectada');
      cargarPresupuestos();
      calcularGastos();
    }
  });
  
  db.collection('gastos').onSnapshot(() => {
    console.log('📊 Gastos actualizados en tiempo real');
    cargarGastosSeparados();
    calcularGastos();
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
    
    const gastosSnapshot = await db.collection('gastos').orderBy('fechaCreacion', 'desc').get();
    let todosgastos = [];
    
    gastosSnapshot.forEach(doc => {
      todosgastos.push({ id: doc.id, ...doc.data() });
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
    ? '<span class="text-green-600 text-xs lg:text-sm font-semibold">✓ Comprobante adjunto</span>' 
    : '<span class="text-red-600 text-xs lg:text-sm font-semibold">✗ Sin comprobante</span>';

  const checkboxHtml = esAdmin ? `
    <div class="flex items-center">
      <label class="flex items-center cursor-pointer hover:bg-green-50 px-3 py-2 rounded-lg transition-colors">
        <input type="checkbox" ${gasto.registrado ? 'checked' : ''} 
          onchange="toggleRegistrado('${gasto.id}', this.checked)"
          class="mr-2 w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500">
        <span class="text-sm lg:text-base font-semibold text-gray-700">Marcar como registrado</span>
      </label>
    </div>
  ` : '';

  const eliminarBtn = esAdmin ? `
    <button onclick="eliminarGasto('${gasto.id}')" 
      class="bg-red-500 hover:bg-red-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-semibold transition-all hover:scale-105 text-sm lg:text-base">
      🗑️ Eliminar
    </button>
  ` : '';

  return `
    <div class="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-xl transition-all hover:border-sky-400 flex flex-col h-full">
      <div class="flex items-center gap-2 mb-3">
        <span class="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
          ⏳ PENDIENTE
        </span>
        <span class="px-2 py-1 rounded-full text-xs font-bold bg-${cat.color}-100 text-${cat.color}-800 border border-${cat.color}-300">
          ${cat.emoji} ${cat.label}
        </span>
      </div>
      
      <p class="text-base font-bold text-gray-800 mb-2 line-clamp-2">${gasto.descripcion}</p>
      
      <p class="text-2xl font-bold text-sky-600 mb-3">
        $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
      </p>
      
      <p class="text-xs text-gray-600 mb-3">📅 ${new Date(gasto.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
      
      <div class="flex items-center gap-3 text-xs text-gray-600 border-t border-gray-200 pt-3 mt-auto">
        ${comprobanteIcon}
      </div>
      
      ${checkboxHtml || eliminarBtn ? `
        <div class="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-200">
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
    <div class="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-3 lg:p-4 hover:shadow-lg transition-all">
      <div class="flex justify-between items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300 flex-shrink-0">
              ✅ REPORTADO
            </span>
            <span class="px-2 py-1 rounded-full text-xs font-bold bg-${cat.color}-100 text-${cat.color}-800 border border-${cat.color}-300 flex-shrink-0">
              ${cat.emoji} ${cat.label}
            </span>
          </div>
          <p class="text-sm lg:text-base font-bold text-gray-800 mb-1 truncate">${gasto.descripcion}</p>
          <div class="flex flex-wrap items-center gap-2 lg:gap-3 text-xs text-gray-600">
            <span>📅 ${new Date(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
            ${comprobanteIcon}
          </div>
        </div>
        <div class="text-right flex items-center gap-2">
          <p class="text-base lg:text-xl font-bold text-sky-600 whitespace-nowrap">
            $${(gasto.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
          </p>
          ${eliminarBtn}
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
