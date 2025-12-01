# 💼 Gestor de Gastos Corporativo - Portfolio

## 📋 Resumen Ejecutivo

Sistema web profesional de gestión financiera desarrollado con Firebase y JavaScript vanilla, diseñado para control de gastos corporativos con autenticación segura, monitoreo en tiempo real y diseño responsive completo.

---

## 🎯 Problema Resuelto

Organizaciones que necesitan:
- Control centralizado de gastos corporativos
- Separación clara entre gastos pendientes y aprobados
- Monitoreo de presupuestos en tiempo real
- Acceso desde múltiples dispositivos
- Sistema seguro sin complejidad de servidores propios

---

## ✨ Características Destacadas

### 🎨 Diseño y UX
- **Tema profesional** gris claro con acentos celeste-azul
- **100% Responsive**: Optimizado para móvil, tablet y desktop
- **Menú hamburguesa** con overlay en dispositivos móviles
- **Vista en grilla adaptativa**: 1-3 columnas según dispositivo
- **Acordeón colapsable** para mejor organización del contenido
- **Tarjetas compactas** con información clave destacada

### 📊 Gestión Inteligente de Gastos

#### Sistema de Separación Automática
- **Gastos Pendientes**: Vista dedicada para gastos sin aprobar
- **Historial Reportado**: Gastos aprobados con agrupación temporal
- Contadores dinámicos en tiempo real
- Filtros independientes por categoría en cada sección

#### Agrupación Temporal Dinámica
- **Por Mes**: Visualización mensual detallada
- **Por Trimestre**: Agrupación trimestral (Q1-Q4)
- **Por Año**: Vista anual consolidada
- Totales automáticos por período
- Expandir/colapsar grupos con un clic

### 🔐 Seguridad Multi-Capa

#### Sistema de Autenticación
- PIN de mínimo 4 caracteres
- Separación de roles: Usuario y Administrador
- PINs personalizables desde panel admin

#### Recuperación de Cuenta Innovadora
- **Verificación por email**: Sistema de recuperación seguro
- Validación de identidad mediante email registrado
- Copia automática de credenciales al portapapeles
- Sin envío de emails externos (validación local)

#### Protección de Demo
- **Versión DEMO con PINs bloqueados**
- Evita que usuarios externos modifiquen credenciales
- Proyecto Firebase completamente independiente
- Datos de prueba aislados

### 📱 Responsividad Completa

#### Móviles (≤768px)
- Menú hamburguesa con animación
- Grid de 1 columna optimizado
- Textos y botones con tamaño táctil óptimo (min 44px)
- Filtros horizontales con scroll suave
- Modales adaptados a pantalla pequeña

#### Tablets (769px-1024px)
- Grid de 2 columnas balanceado
- Espaciados intermedios
- Navegación híbrida

#### Desktop (>1024px)
- Grid de hasta 3 columnas
- Máximo aprovechamiento de espacio
- Navegación completa visible

### 💰 Monitoreo Financiero

- **Dos presupuestos independientes**: General y Viáticos
- Barras de progreso con estados visuales:
  - 🟢 BUENO (0-60%)
  - 🟡 REGULAR (60-85%)
  - 🔴 ALERTA (85%+)
- Actualización automática en tiempo real
- Cálculos precisos con formato ARS

### ⚡ Rendimiento y Tiempo Real

- Sincronización instantánea con Firestore
- Listeners en tiempo real para cambios
- Actualización automática entre dispositivos
- Sin necesidad de recargar página

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

```
Frontend
├── HTML5 Semántico
├── Tailwind CSS 3.x
│   ├── Grid System
│   ├── Flexbox
│   └── Responsive Utilities
└── JavaScript ES6+
    ├── Async/Await
    ├── Promises
    └── Arrow Functions

Backend (Firebase BaaS)
├── Firestore Database
│   ├── Real-time Listeners
│   ├── Queries con orderBy
│   └── Timestamps automáticos
├── Firebase Hosting
│   ├── HTTPS automático
│   ├── CDN global
│   └── Multi-target deployment
└── Security Rules
    ├── Validación de tipos
    └── Estructura de datos
```

### Estructura de Datos

```javascript
// Colección: configuracion/sistema
{
  pinUsuario: string,
  pinAdmin: string,
  emailRecuperacion: string,
  presupuestoTotal: number,
  presupuestoViaticos: number,
  fechaCreacion: Timestamp,
  fechaActualizacion: Timestamp
}

// Colección: gastos/{id}
{
  descripcion: string,
  monto: number,
  fecha: string (YYYY-MM-DD),
  categoria: "presupuesto" | "viaticos",
  comprobanteAdjunto: boolean,
  registrado: boolean,
  creadoPor: string,
  fechaCreacion: Timestamp,
  fechaRegistro?: Timestamp,
  registradoPor?: string
}
```

### Flujo de Datos

```
Usuario → Formulario → Validación Cliente → Firebase
                                              ↓
                                         Firestore
                                              ↓
                                    Security Rules
                                              ↓
                                    Almacenamiento
                                              ↓
                                    Real-time Listener
                                              ↓
                                    UI Actualizada
```

---

## 🚀 Implementación

### Proyectos Desplegados

#### Producción
- **URL**: https://gestor-de-gastos-e46ff.web.app
- **Firebase Project**: `gestor-de-gastos-e46ff`
- **Características**:
  - Control total del sistema
  - Cambio de PINs habilitado
  - Configuración de email de recuperación
  - Datos reales

#### Demo
- **URL**: https://gestor-de-gastos-demo.web.app
- **Firebase Project**: `gestor-de-gastos-demo`
- **Características**:
  - PINs fijos: `demo123` / `admin456`
  - Cambio de PINs bloqueado
  - Datos de prueba aislados
  - Proyecto Firebase independiente

### Comandos de Despliegue

```bash
# Producción
firebase use default
firebase deploy --only hosting

# Demo
firebase use gestor-de-gastos-demo
firebase deploy --only hosting
```

---

## 📈 Métricas del Proyecto

### Líneas de Código
- **HTML**: ~1,200 líneas
- **CSS**: ~600 líneas (embedded)
- **JavaScript**: ~1,500 líneas
- **Total**: ~3,300 líneas

### Características Implementadas
- ✅ 15+ funcionalidades principales
- ✅ 8 vistas diferentes
- ✅ 3 breakpoints responsive
- ✅ 2 proyectos Firebase independientes
- ✅ Sistema completo de seguridad

### Compatibilidad
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Móviles iOS/Android
- ✅ Tablets

---

## 🎓 Desafíos Técnicos Resueltos

### 1. Sistema de Agrupación Temporal
**Desafío**: Agrupar gastos dinámicamente por mes, trimestre o año
**Solución**: 
- Funciones de agrupación con reducción de objetos
- Formateo de fechas con `toLocaleDateString()`
- Ordenamiento descendente por período
- Cálculo de totales por grupo

### 2. Responsividad Completa
**Desafío**: Experiencia óptima en todos los dispositivos
**Solución**:
- Media queries específicas para 3 breakpoints
- Grid adaptativo con Tailwind
- Menú hamburguesa custom con animaciones
- Overlay para cerrar menú móvil
- Área táctil mínima de 44px

### 3. Recuperación de Cuenta sin Email
**Desafío**: Recuperación segura sin envío de emails
**Solución**:
- Almacenamiento de email en Firestore
- Validación local de identidad
- Regex para validar formato de email
- Copia automática al portapapeles

### 4. Demo Protegida
**Desafío**: Versión demo pública sin riesgo de bloqueo
**Solución**:
- Proyecto Firebase completamente separado
- Inputs deshabilitados con estilos visuales
- Función bloqueada con mensaje informativo
- Datos de prueba aislados

### 5. Sincronización en Tiempo Real
**Desafío**: Múltiples usuarios viendo datos actualizados
**Solución**:
- Listeners de Firestore con `onSnapshot()`
- Actualización automática de UI
- Cálculos reactivos de presupuestos
- Sin necesidad de polling

---

## 💡 Decisiones de Diseño

### Por qué Firebase
- Sin necesidad de servidor propio
- Escalabilidad automática
- Hosting con HTTPS incluido
- Base de datos en tiempo real
- Costo-efectivo para startups

### Por qué Tailwind CSS
- Desarrollo rápido con utility classes
- Bundle pequeño en producción
- Responsive design integrado
- Consistencia visual automática

### Por qué Vanilla JavaScript
- Sin dependencias externas
- Carga rápida de la aplicación
- Control total del código
- Ideal para proyectos pequeños/medianos

---

## 🔄 Versionamiento

### v2.0.0 (Diciembre 2025) - MAJOR UPDATE
- 🎨 Rediseño completo con tema gris profesional
- 📊 Sistema de separación de gastos
- 📅 Agrupación temporal dinámica
- 📧 Recuperación por email
- 📱 Responsividad completa
- 🔒 Demo protegida independiente

### v1.2.0 (Noviembre 2025)
- Filtros por estado
- Reglas de seguridad
- Documentación completa

### v1.0.0 (Noviembre 2025)
- Lanzamiento inicial
- Gestión básica de gastos
- Autenticación por PIN

---

## 🎯 Resultados

### Impacto
- ✅ Control financiero centralizado
- ✅ Reducción de tiempo de aprobación de gastos
- ✅ Visibilidad en tiempo real del presupuesto
- ✅ Acceso desde cualquier dispositivo
- ✅ Sin costos de infraestructura

### Escalabilidad
- Soporta miles de gastos sin degradación
- Múltiples usuarios simultáneos
- Crecimiento de datos manejado por Firebase
- Costo variable según uso real

---

## 📞 Información del Proyecto

- **Tipo**: Aplicación Web Progresiva (PWA-ready)
- **Duración del desarrollo**: 2 semanas
- **Tecnologías**: 5+ tecnologías integradas
- **Deploys**: 2 proyectos en producción
- **Mantenimiento**: Actualizado diciembre 2025

---

## 🔗 Links

- **Producción**: https://gestor-de-gastos-e46ff.web.app
- **Demo**: https://gestor-de-gastos-demo.web.app
- **Repositorio**: (Agregar link de GitHub)
- **Documentación**: README.md completo incluido

---

## 🏆 Skills Demostradas

### Frontend
- HTML5 semántico
- CSS avanzado (Grid, Flexbox, Animations)
- JavaScript ES6+ (Async/Await, Promises, Modules)
- Responsive Design
- UX/UI Design

### Backend
- Firebase Firestore
- NoSQL Database Design
- Real-time Data Synchronization
- Security Rules
- Cloud Hosting

### Herramientas
- Git & GitHub
- Firebase CLI
- VS Code
- Chrome DevTools
- Firebase Console

### Conceptos
- Single Page Application (SPA)
- Backend as a Service (BaaS)
- Progressive Web App (PWA)
- Mobile-First Design
- Security Best Practices

---

**Desarrollado con ❤️ para demostrar capacidades Full Stack**

*Portfolio actualizado: Diciembre 2025*
