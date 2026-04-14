const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const startMark = '<div id="modal-admin"';
const endMark = '<!-- ==================== MODAL GASTOS INFORMADOS ==================== -->';

const startIndex = html.indexOf(startMark);
const endIndex = html.indexOf(endMark, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find boundaries");
  process.exit(1);
}

const newModalHTML = `<!-- ==================== MODAL PANEL ADMIN ==================== -->
  <div id="modal-admin" class="fixed inset-0 bg-black/80 hidden flex items-center justify-center z-50 p-4">
    <div class="bg-[#1f2937] border border-gray-700/50 rounded-[1.5rem] p-6 lg:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative text-white">
      
      <!-- Close button -->
      <button onclick="cerrarModalAdmin()" class="absolute top-6 right-6 w-9 h-9 rounded-xl bg-gray-700/50 flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <div class="w-12 h-12 rounded-xl bg-[#2b88ff] flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 22h20M2 13l5-4 5 4 5-4 5 4v6H2v-6z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-bold text-white leading-tight mb-1">Panel de Administración</h3>
          <p class="text-xs text-gray-400" id="admin-trimestre-label">Trimestre actual</p>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-4 pb-6 mb-6 border-b border-gray-700/50 text-center">
        <div>
          <p class="text-xs text-gray-400 mb-1.5">Presupuesto</p>
          <p class="text-lg font-bold text-white tracking-tight" id="admin-stat-presupuesto">$0,00</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-1.5">Gastado (Q)</p>
          <p class="text-lg font-bold text-orange-500 tracking-tight" id="admin-stat-gastado">$0,00</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-1.5">Disponible Real</p>
          <p class="text-lg font-bold text-[#22c55e] tracking-tight" id="admin-stat-disponible">$0,00</p>
        </div>
      </div>

      <!-- Section: Actualizar Presupuesto -->
      <div class="mb-8">
        <h4 class="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <span class="text-[#ca8a04] text-lg font-normal">+</span>
          Actualizar Presupuesto
        </h4>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1.5">Presupuesto Total (ARS)</label>
            <input type="number" id="nuevo-presupuesto-total" step="0.01" min="0" class="w-full bg-[#111827] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Nuevo valor (reemplaza el actual)">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1.5">Viáticos (ARS) — actual: <span id="admin-stat-viaticos" class="text-sky-400 font-bold">$0,00</span></label>
            <input type="number" id="nuevo-presupuesto-viaticos" step="0.01" min="0" class="w-full bg-[#111827] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Nuevo valor (reemplaza el actual)">
          </div>
        </div>
        
        <!-- HIDDEN BUT NECESSARY FOR JS COMPATIBILITY -->
        <input type="radio" name="modo-actualizacion" value="reemplazar" checked class="hidden">
        <input type="checkbox" id="acumular-saldo-sobrante" class="hidden">
        
        <button onclick="actualizarPresupuestos()" class="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Guardar Presupuesto
        </button>
      </div>

      <!-- Section: Seguridad -->
      <div class="mb-8">
        <h4 class="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <svg class="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Seguridad
        </h4>
        
        <p class="text-xs text-gray-400 mb-4 font-medium">Email actual: <span class="text-gray-200 tracking-wide" id="email-actual-display">Cargando...</span></p>
        
        <div class="space-y-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1.5">PIN actual <span class="text-red-500">*</span></label>
            <input type="password" id="pin-actual-admin" inputmode="numeric" pattern="[0-9]*" class="w-full bg-[#111827] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Requerido para confirmar cambios">
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-400 mb-1.5">Nuevo email (opcional)</label>
              <input type="email" id="nuevo-email-recuperacion" class="w-full bg-[#111827] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Dejar vacío para mantener">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-400 mb-1.5">Nuevo PIN (opcional)</label>
              <input type="password" id="nuevo-pin-admin" inputmode="numeric" pattern="[0-9]*" class="w-full bg-[#111827] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Mín. 4 dígitos">
            </div>
          </div>
        </div>
        
        <button onclick="actualizarSeguridadCompleta()" class="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Actualizar Seguridad
        </button>
      </div>

      <!-- Section: Cierre de Año Fiscal -->
      <details class="group rounded-xl border border-red-900/40 bg-[#3f1f28]/30 overflow-hidden">
        <summary class="flex justify-between items-center cursor-pointer p-3.5 hover:bg-red-900/20 transition-colors list-none">
          <h4 class="text-sm font-bold text-[#ef4444] flex items-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Cierre de Año Fiscal
          </h4>
          <span class="text-red-400/70 transition-transform duration-200 group-open:rotate-180">
            <svg fill="none" height="18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="18"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </summary>
        
        <div class="px-4 pb-4 hidden group-open:block">
          <div class="border border-[#7f1d1d] bg-[#450a0a]/30 rounded-xl p-4 mt-2">
            <p class="text-xs text-red-300 font-bold mb-4 flex items-start gap-1.5 leading-snug">
              <span class="text-sm">⚠️</span> 
              ACCIÓN IRREVERSIBLE: Elimina TODOS los gastos del sistema. No se puede deshacer. Úsalo solo al cierre del año fiscal.
            </p>
            
            <div class="space-y-4 mb-4">
              <div>
                <label class="block text-xs font-semibold text-gray-300 mb-1.5">PIN de Administrador <span class="text-red-500">*</span></label>
                <input type="password" id="pin-cierre-fiscal" inputmode="numeric" pattern="[0-9]*" class="w-full bg-[#111827] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors" placeholder="Tu PIN">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-300 mb-1.5">Escribe "ELIMINAR TODO" <span class="text-red-500">*</span></label>
                <input type="text" id="confirmacion-cierre-fiscal" class="w-full bg-[#111827] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors uppercase" placeholder="ELIMINAR TODO">
              </div>
            </div>
            
            <button onclick="cerrarAnoFiscal()" class="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold py-2.5 rounded-xl text-[13px] transition-all border border-red-500/20">
              ELIMINAR TODOS LOS GASTOS DEL AÑO
            </button>
          </div>
        </div>
      </details>

    </div>
  </div>\n\n  `;

const finalHTML = html.slice(0, startIndex) + newModalHTML + html.slice(endIndex);
fs.writeFileSync('index.html', finalHTML);
console.log("HTML replaced successfully.");

// Now read app.js to update the populating of these stats when opening admin panel
let appJs = fs.readFileSync('app.js', 'utf8');

// Find where admin-presupuesto.value is set and replace it with proper stat setting
let btnClickRegex = /document\.getElementById\('btn-panel-admin'\)\?\.addEventListener\('click', async \(\) => \{[\\s\\S]*?\}\);/m;
const match = appJs.match(btnClickRegex);

let newBtnClick = '';

if (match) {
  // If we can find it, we'll replace the inner content to populate our new IDs
  newBtnClick = `document.getElementById('btn-panel-admin')?.addEventListener('click', async () => {
  if (!esAdmin) {
    mostrarNotificacion('❌ No tienes permisos de administrador', 'error');
    return;
  }
  
  try {
    const configDoc = await db.collection('configuracion').doc('sistema').get();
    const config = configDoc.data() || {};
    
    // Clear inputs
    const inputTotal = document.getElementById('nuevo-presupuesto-total');
    const inputViaticos = document.getElementById('nuevo-presupuesto-viaticos');
    if (inputTotal) inputTotal.value = '';
    if (inputViaticos) inputViaticos.value = '';

    // Show stats
    const pTotal = config.presupuestoTotal || 0;
    
    // Calculate spent
    const gastosSnapshot = await db.collection('gastos').where('eliminado', '==', false).get();
    let totalP = 0;
    let totalP_reg = 0;
    let viaticos_reg = 0;
    
    const ahora = new Date();
    const_trim = Math.floor(ahora.getMonth() / 3);
    const_ini = new Date(ahora.getFullYear(), _trim * 3, 1);
    const_fin = new Date(ahora.getFullYear(), _trim * 3 + 3, 0);

    gastosSnapshot.forEach(doc => {
      const g = doc.data();
      const f = parseFechaLocal(g.fecha);
      if (g.categoria === 'presupuesto') {
        totalP += (g.monto || 0);
        if (g.registrado) totalP_reg += (g.monto || 0);
      } else if (g.categoria === 'viaticos' && g.registrado) {
        viaticos_reg += (g.monto || 0);
      }
    });

    const formatM = (n) => '$' + n.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    const elTotal = document.getElementById('admin-stat-presupuesto');
    if (elTotal) elTotal.textContent = formatM(pTotal);

    const elGastado = document.getElementById('admin-stat-gastado');
    if (elGastado) elGastado.textContent = formatM(totalP_reg);

    const elDisponible = document.getElementById('admin-stat-disponible');
    if (elDisponible) elDisponible.textContent = formatM(Math.max(0, pTotal - totalP_reg));

    const elViaticos = document.getElementById('admin-stat-viaticos');
    if (elViaticos) elViaticos.textContent = formatM(config.presupuestoViaticos || 0);

    const emailDisp = document.getElementById('email-actual-display');
    if (emailDisp) {
      if (config.adminEmail) {
        // Obscure partially: mo****@...
        const parts = config.adminEmail.split('@');
        if (parts.length === 2 && parts[0].length >= 2) {
          emailDisp.textContent = parts[0].substring(0,2) + '****@' + parts[1];
        } else {
          emailDisp.textContent = config.adminEmail;
        }
      } else {
        emailDisp.textContent = 'No configurado';
      }
    }

    const tLabel = document.getElementById('admin-trimestre-label');
    if (tLabel) {
      const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      tLabel.textContent = 'Q' + (_trim+1) + ' ' + meses[_trim*3] + '-' + meses[_trim*3+2] + ' ' + ahora.getFullYear();
    }

    // Modal behavior
    const modalAdmin = document.getElementById('modal-admin');
    if (modalAdmin) modalAdmin.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error al abrir panel:', error);
  }
});`;
  
  appJs = appJs.replace(btnClickRegex, newBtnClick);
  fs.writeFileSync('app.js', appJs);
  console.log("AppJs click handler updated.");
} else {
  console.log("Could not find btn-panel-admin listener in appJs.");
}
