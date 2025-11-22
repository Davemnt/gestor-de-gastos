// demo.js - Versión demo con datos ficticios

// Datos de ejemplo
const gastosDemo = [
    {
        id: '1',
        fecha: '2025-01-15',
        descripcion: 'Papelería y útiles de oficina',
        monto: 45000,
        categoria: 'presupuesto',
        comprobanteAdjunto: true,
        registrado: true,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-15T10:30:00'),
        registradoPor: 'Admin Demo',
        fechaRegistro: new Date('2025-01-15T14:20:00')
    },
    {
        id: '2',
        fecha: '2025-01-18',
        descripcion: 'Combustible vehículo oficial',
        monto: 35000,
        categoria: 'viaticos',
        comprobanteAdjunto: true,
        registrado: true,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-18T09:15:00'),
        registradoPor: 'Admin Demo',
        fechaRegistro: new Date('2025-01-18T16:45:00')
    },
    {
        id: '3',
        fecha: '2025-01-20',
        descripcion: 'Mantenimiento de equipos informáticos',
        monto: 120000,
        categoria: 'presupuesto',
        comprobanteAdjunto: true,
        registrado: true,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-20T11:00:00'),
        registradoPor: 'Admin Demo',
        fechaRegistro: new Date('2025-01-20T15:30:00')
    },
    {
        id: '4',
        fecha: '2025-01-22',
        descripcion: 'Almuerzo reunión con clientes',
        monto: 28000,
        categoria: 'viaticos',
        comprobanteAdjunto: true,
        registrado: false,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-22T14:30:00')
    },
    {
        id: '5',
        fecha: '2025-01-23',
        descripcion: 'Material de limpieza y sanitización',
        monto: 55000,
        categoria: 'presupuesto',
        comprobanteAdjunto: true,
        registrado: false,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-23T10:15:00')
    },
    {
        id: '6',
        fecha: '2025-01-24',
        descripcion: 'Peajes y estacionamiento',
        monto: 12000,
        categoria: 'viaticos',
        comprobanteAdjunto: false,
        registrado: false,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-24T16:00:00')
    },
    {
        id: '7',
        fecha: '2025-01-25',
        descripcion: 'Servicio de internet y telefonía',
        monto: 85000,
        categoria: 'presupuesto',
        comprobanteAdjunto: true,
        registrado: true,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-25T09:00:00'),
        registradoPor: 'Admin Demo',
        fechaRegistro: new Date('2025-01-25T11:30:00')
    },
    {
        id: '8',
        fecha: '2025-01-26',
        descripcion: 'Hospedaje viaje de negocios',
        monto: 45000,
        categoria: 'viaticos',
        comprobanteAdjunto: true,
        registrado: true,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-26T18:00:00'),
        registradoPor: 'Admin Demo',
        fechaRegistro: new Date('2025-01-27T09:00:00')
    },
    {
        id: '9',
        fecha: '2025-01-27',
        descripcion: 'Reparación impresora multifunción',
        monto: 75000,
        categoria: 'presupuesto',
        comprobanteAdjunto: true,
        registrado: false,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-27T13:45:00')
    },
    {
        id: '10',
        fecha: '2025-01-28',
        descripcion: 'Capacitación personal administrativo',
        monto: 150000,
        categoria: 'presupuesto',
        comprobanteAdjunto: true,
        registrado: true,
        creadoPor: 'Usuario Demo',
        fechaCreacion: new Date('2025-01-28T10:00:00'),
        registradoPor: 'Admin Demo',
        fechaRegistro: new Date('2025-01-28T17:00:00')
    }
];

// Variables de filtrado
let estadoActual = 'todos';
let categoriaActual = 'todos';

// Función para formatear moneda
function formatearMoneda(monto) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(monto);
}

// Función para filtrar por estado
function filtrarPorEstado(estado) {
    estadoActual = estado;
    
    // Actualizar estilos de pestañas
    document.getElementById('tabTodos').className = 'px-4 py-2 rounded-lg font-semibold ' + 
        (estado === 'todos' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300');
    document.getElementById('tabPendientes').className = 'px-4 py-2 rounded-lg font-semibold ' + 
        (estado === 'pendientes' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300');
    document.getElementById('tabRegistrados').className = 'px-4 py-2 rounded-lg font-semibold ' + 
        (estado === 'registrados' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300');
    
    cargarGastos();
}

// Función para filtrar por categoría
function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    
    // Actualizar estilos de botones
    document.getElementById('catTodos').className = 'px-4 py-2 rounded-lg font-semibold ' + 
        (categoria === 'todos' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300');
    document.getElementById('catPresupuesto').className = 'px-4 py-2 rounded-lg font-semibold ' + 
        (categoria === 'presupuesto' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300');
    document.getElementById('catViaticos').className = 'px-4 py-2 rounded-lg font-semibold ' + 
        (categoria === 'viaticos' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300');
    
    cargarGastos();
}

// Función para cargar y mostrar gastos
function cargarGastos() {
    const listaGastos = document.getElementById('listaGastos');
    
    // Filtrar gastos según criterios
    let gastosFiltrados = gastosDemo.filter(gasto => {
        // Filtro por estado
        let cumpleEstado = true;
        if (estadoActual === 'pendientes') {
            cumpleEstado = !gasto.registrado;
        } else if (estadoActual === 'registrados') {
            cumpleEstado = gasto.registrado;
        }
        
        // Filtro por categoría
        let cumpleCategoria = categoriaActual === 'todos' || gasto.categoria === categoriaActual;
        
        return cumpleEstado && cumpleCategoria;
    });
    
    // Ordenar por fecha (más recientes primero)
    gastosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Renderizar gastos
    if (gastosFiltrados.length === 0) {
        listaGastos.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <p class="text-xl mb-2">📭</p>
                <p>No hay gastos que coincidan con los filtros seleccionados</p>
            </div>
        `;
        return;
    }
    
    listaGastos.innerHTML = gastosFiltrados.map(gasto => `
        <div class="bg-gray-700 rounded-lg p-4 card-hover border-l-4 ${gasto.registrado ? 'border-green-500' : 'border-yellow-500'}">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-lg">${gasto.descripcion}</span>
                        <span class="px-2 py-1 rounded text-xs font-bold ${
                            gasto.registrado 
                            ? 'bg-green-500 text-black' 
                            : 'bg-yellow-500 text-black'
                        }">
                            ${gasto.registrado ? '✅ REGISTRADO' : '⏳ PENDIENTE'}
                        </span>
                    </div>
                    <p class="text-sm text-gray-400">📅 ${new Date(gasto.fecha).toLocaleDateString('es-AR')}</p>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold text-orange-500">${formatearMoneda(gasto.monto)}</p>
                    <p class="text-xs text-gray-400">
                        ${gasto.categoria === 'presupuesto' ? '💰 Presupuesto' : '✈️ Viáticos'}
                    </p>
                </div>
            </div>
            
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                <div class="flex items-center gap-4 text-sm">
                    <span class="text-gray-400">
                        ${gasto.comprobanteAdjunto ? '📎 Con comprobante' : '❌ Sin comprobante'}
                    </span>
                    <span class="text-gray-400">
                        👤 ${gasto.creadoPor}
                    </span>
                </div>
                ${gasto.registrado ? `
                    <span class="text-xs text-green-400">
                        ✓ Registrado por ${gasto.registradoPor}
                    </span>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Demo cargada - Datos ficticios inicializados');
    cargarGastos();
});
