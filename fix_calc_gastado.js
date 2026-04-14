const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

const oldLogic = `// Sumar para presupuesto y viáticos según la CATEGORÍA únicamente
        if (gasto.categoria === 'presupuesto') {
          totalPresupuesto += gasto.monto || 0;
          // Solo sumar a registrados si está marcado como registrado
          if (esRegistrado) {
            totalPresupuestoRegistrado += gasto.monto || 0;
          }
        } else if (gasto.categoria === 'viaticos') {
          totalViaticos += gasto.monto || 0;
        }
      }
      
      // Sumar solo gastos del trimestre actual para el KPI "Total Gastado" - EXCLUIR organizaciones externas
      if (!esOrganizacionExterna && fechaGasto >= inicioTrimestre && fechaGasto <= finTrimestre) {
        totalGastosTrimestre += gasto.monto || 0;
      }
    });

    // Total combinado de todos los gastos del trimestre
    const totalGastos = totalGastosTrimestre;`;

const newLogic = `// Sumar para presupuesto y viáticos según la CATEGORÍA únicamente
        if (gasto.categoria === 'presupuesto') {
          totalPresupuesto += gasto.monto || 0;
          // Solo sumar a registrados si está marcado como registrado
          if (esRegistrado) {
            totalPresupuestoRegistrado += gasto.monto || 0;
            // Sumar Trimestre SOLO si están registrados, y SON DE PRESUPUESTO
            if (fechaGasto >= inicioTrimestre && fechaGasto <= finTrimestre) {
              totalGastosTrimestre += gasto.monto || 0;
            }
          }
        } else if (gasto.categoria === 'viaticos') {
          totalViaticos += gasto.monto || 0;
        }
      }
    });

    // Total combinado de todos los gastos del trimestre
    const totalGastos = totalGastosTrimestre;`;

if (appJs.includes(oldLogic)) {
  appJs = appJs.replace(oldLogic, newLogic);
  fs.writeFileSync('app.js', appJs);
  console.log('App.js updated successfully!');
} else {
  console.log('Could not find the target code to replace!');
}
