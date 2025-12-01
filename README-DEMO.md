# 🎭 Versión DEMO - Gestor de Gastos

## 🌐 Acceso Directo
**URL**: https://gestor-de-gastos-demo.web.app

---

## 🔑 Contraseñas DEMO (Super Fáciles)

### 👤 Usuario Regular
**PIN**: `demo`

Permite:
- ✅ Ver todos los gastos (pendientes y reportados)
- ✅ Crear nuevos gastos
- ✅ Filtrar por categoría (Presupuesto/Viáticos)
- ✅ Ver agrupaciones por mes/trimestre/año
- ❌ NO puede marcar como registrado
- ❌ NO puede eliminar gastos

### 👨‍💼 Administrador
**PIN**: `admin`

Permite:
- ✅ Todo lo del usuario regular, más:
- ✅ Marcar gastos como registrados/reportados
- ✅ Eliminar gastos
- ✅ Acceso al Panel Admin (cambiar PINs y presupuestos)
- ✅ Control total del sistema

---

## 📊 Datos Pre-cargados

La demo incluye **15 gastos de ejemplo**:

### ⏳ Pendientes de Reporte (3 gastos)
- 🚗 Combustible - Viaje a Rosario: $15,000
- 💰 Material de oficina: $8,500  
- 🚗 Almuerzo con equipo: $12,000

### ✅ Gastos Reportados (12 gastos)
Distribuidos en:
- **Diciembre 2024**: 3 gastos (~$108,000)
- **Noviembre 2024**: 4 gastos (~$113,000)
- **Octubre 2024**: 3 gastos (~$61,500)
- **Septiembre 2024**: 2 gastos (~$103,000)

**Total de ejemplo**: ~$420,500 en gastos

---

## 🎯 Funcionalidades para Probar

### 1. Sistema de Separación
- Ver gastos **pendientes** vs **reportados**
- Los pendientes necesitan ser marcados como registrados
- Los reportados se agrupan por período

### 2. Filtros por Categoría
- **💰 Presupuesto**: Gastos operativos generales
- **🚗 Viáticos**: Viajes, combustible, alojamiento

### 3. Agrupación Temporal
- **📅 Por Mes**: Ideal para revisión mensual
- **📊 Por Trimestre**: Reportes trimestrales (Q1, Q2, Q3, Q4)
- **📆 Por Año**: Vista anual completa

### 4. Acordeones Colapsables
- Click en títulos de sección para colapsar/expandir
- Click en cada mes/trimestre para ocultar detalles
- Optimización de espacio cuando hay muchos gastos

### 5. Crear Nuevos Gastos
- Botón "➕ Nuevo Gasto"
- Adjuntar comprobantes (simulado)
- Categorización automática

### 6. Panel Admin (solo con PIN `admin`)
- Cambiar PINs
- Modificar presupuestos
- Ver estadísticas

---

## 🚀 Cómo Probar la Demo

### Inicio Rápido
1. Abre: https://gestor-de-gastos-demo.web.app
2. Ingresa PIN: `demo` (usuario) o `admin` (administrador)
3. ¡Explora!

### Flujo de Prueba Completo

#### Como Usuario Regular
```
1. Login con PIN: demo
2. Ver "Gastos Pendientes" (3 gastos sin reportar)
3. Click en filtro "🚗 Viáticos" para ver solo viajes
4. Ir a "Historial Reportados"
5. Cambiar vista: Por Mes → Por Trimestre → Por Año
6. Colapsar/expandir secciones con los iconos ▼
7. Click "➕ Nuevo Gasto" para crear uno de prueba
8. Cerrar sesión (🚪 Salir)
```

#### Como Administrador
```
1. Login con PIN: admin
2. Ver gastos pendientes
3. Marcar checkbox "✓ Registrado" en un gasto pendiente
4. Ver cómo se mueve a "Historial Reportados"
5. Eliminar un gasto con botón "🗑️ Eliminar"
6. Click "⚙️ Panel Admin"
7. Cambiar presupuestos
8. Ver progreso y disponible actualizado
```

---

## 🔄 Resetear Datos Demo

Si quieres volver al estado inicial con gastos de ejemplo:

### Opción 1: Herramienta de Configuración
1. Abre: `configurar-demo-completo.html` (en el proyecto)
2. Click: "🚀 Configurar Todo Automáticamente"
3. Espera confirmación en el log

### Opción 2: Paso a Paso
1. Abre: `configurar-demo-completo.html`
2. Click: "🗑️ Limpiar Todos los Datos"
3. Click: "🚀 Configurar Todo Automáticamente"

---

## 🎨 Diseño Visual

### Banner de Identificación
La demo incluye un **banner morado** en la parte superior que dice:
> 🎭 **VERSIÓN DEMO** - Explora la aplicación con datos de prueba

Esto diferencia claramente la demo de la versión de producción.

### Tema Profesional
- Paleta de grises claros y azules
- Gradientes suaves
- Diseño responsive (móvil, tablet, desktop)
- Transiciones animadas

---

## ⚠️ Limitaciones de la Demo

### ✅ Incluye
- Sistema completo de gestión de gastos
- Filtros y agrupaciones
- Acordeones colapsables
- Panel de administración
- Datos realistas de ejemplo

### ❌ NO Incluye
- Adjuntar archivos reales (simulado)
- Notificaciones por email
- Exportar a PDF/Excel
- Múltiples usuarios simultáneos con permisos

### 🔐 Seguridad
- Base de datos SEPARADA de producción
- Reglas de Firestore permisivas (lectura pública para demo)
- Sin datos sensibles reales
- Contraseñas genéricas no seguras (solo para demo)

---

## 📱 Compatibilidad

- ✅ Chrome, Firefox, Safari, Edge (últimas versiones)
- ✅ Dispositivos móviles (iOS, Android)
- ✅ Tablets
- ✅ Desktop (Windows, Mac, Linux)

---

## 💡 Casos de Uso Demo

### Para Clientes Potenciales
"Prueba el sistema sin compromiso con PIN: **demo**"

### Para Capacitación
"Practica con datos ficticios antes de usar la versión real"

### Para Presentaciones
"Muestra el sistema en vivo sin exponer datos confidenciales"

---

## 🆚 Demo vs Producción

| Característica | Demo | Producción |
|----------------|------|------------|
| **URL** | gestor-de-gastos-demo.web.app | gestor-de-gastos-e46ff.web.app |
| **PINs** | demo / admin | Personalizados |
| **Datos** | Ficticios (15 gastos ejemplo) | Reales del cliente |
| **Banner** | Banner morado "DEMO" | Sin banner |
| **Firestore** | Base de datos separada | Base de datos separada |
| **Seguridad** | Permisiva (lectura pública) | Restrictiva |
| **Propósito** | Mostrar, probar, capacitar | Uso empresarial real |

---

## 🔧 Configuración Técnica

### Firebase Project
- **ID**: `gestor-de-gastos-demo`
- **Firestore Database**: Independiente de producción
- **Hosting**: Firebase Hosting
- **Reglas**: Lectura pública, escritura validada

### Archivos
- `public-demo/index.html` - Interfaz con banner demo
- `public-demo/app.js` - Lógica de la aplicación
- `public-demo/firebase-config.js` - Credenciales del proyecto demo

---

## 📞 Soporte

Si encuentras problemas en la demo:
1. Verifica que uses las contraseñas correctas (`demo` o `admin`)
2. Limpia caché del navegador (Ctrl+F5)
3. Usa modo incógnito para evitar conflictos
4. Resetea datos con `configurar-demo-completo.html`

---

## 🎓 Mejores Prácticas

### Al Presentar a Clientes
1. ✅ Abre en modo incógnito (sin historial)
2. ✅ Verifica que banner "DEMO" esté visible
3. ✅ Usa PIN `demo` para mostrar vista de usuario
4. ✅ Usa PIN `admin` para mostrar capacidades completas
5. ✅ Explica que datos son ficticios

### Al Capacitar Personal
1. ✅ Cada persona use su propia sesión
2. ✅ Practiquen crear gastos
3. ✅ Practiquen filtrar y agrupar
4. ✅ Prueben marcar como registrado (admin)
5. ✅ Reseteen datos al finalizar

---

## 🚀 Próximos Pasos

Después de probar la demo:

1. **¿Te gustó?** → Solicita tu versión de producción personalizada
2. **¿Necesitas ajustes?** → Especifica qué funcionalidades adicionales necesitas
3. **¿Listo para implementar?** → Configuramos tu proyecto Firebase privado

---

**Versión**: 2.0 - Demo Completa  
**Última Actualización**: Diciembre 2025  
**Estado**: ✅ Activa y Funcionando

---

## 🎁 Bonus: Datos de Ejemplo Incluidos

### Presupuestos Demo
- **Presupuesto Total**: $500,000
- **Presupuesto Viáticos**: $200,000
- **Total Gastado**: ~$420,500
- **Disponible**: ~$79,500

### Distribución por Categoría
- **💰 Presupuesto**: ~$227,500 (8 gastos)
- **🚗 Viáticos**: ~$193,000 (7 gastos)

### Distribución Temporal
- **Diciembre 2024**: $143,500
- **Noviembre 2024**: $113,000
- **Octubre 2024**: $61,500
- **Septiembre 2024**: $103,000

---

¡Disfruta explorando el **Gestor de Gastos DEMO**! 🎉
