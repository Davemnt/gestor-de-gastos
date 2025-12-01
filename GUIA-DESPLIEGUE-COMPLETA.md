# 🚀 Guía Completa de Despliegue - Proyectos Firebase

## 📋 Índice
1. [Configuración Inicial](#configuración-inicial)
2. [Despliegue Versión Producción](#despliegue-producción)
3. [Despliegue Versión Demo](#despliegue-demo)
4. [Configuración Firestore Database](#configuración-firestore)
5. [Inicialización de Datos](#inicialización-datos)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Configuración Inicial

### Prerrequisitos

```bash
# 1. Instalar Node.js (si no lo tienes)
# Descargar desde: https://nodejs.org/

# 2. Instalar Firebase CLI globalmente
npm install -g firebase-tools

# 3. Verificar instalación
firebase --version
# Debe mostrar: 13.0.0 o superior
```

### Autenticación

```bash
# Iniciar sesión en Firebase
firebase login

# Verificar cuenta conectada
firebase projects:list
```

---

## 🏢 Despliegue Versión Producción

### Proyecto: `gestor-de-gastos-e46ff`

#### Paso 1: Seleccionar Proyecto

```bash
# Navegar al directorio del proyecto
cd C:\Users\monte\OneDrive\Escritorio\gestor-gastos

# Seleccionar proyecto de producción
firebase use default
# o explícitamente:
firebase use gestor-de-gastos-e46ff
```

#### Paso 2: Verificar Archivos

Asegúrate de que estos archivos existen:
- ✅ `index.html` (aplicación principal)
- ✅ `app.js` (lógica de negocio)
- ✅ `firebase-config.js` (config producción)
- ✅ `firestore.rules` (reglas de seguridad producción)

#### Paso 3: Desplegar Hosting

```bash
# Desplegar solo hosting (archivos estáticos)
firebase deploy --only hosting

# Salida esperada:
# ✔ Deploy complete!
# Hosting URL: https://gestor-de-gastos-e46ff.web.app
```

#### Paso 4: Aplicar Reglas de Firestore

**Opción A: Desde CLI**
```bash
# Desplegar reglas de seguridad
firebase deploy --only firestore:rules

# Archivo usado: firestore.rules
```

**Opción B: Desde Consola (Recomendado para primera vez)**
1. Ve a https://console.firebase.google.com/
2. Selecciona proyecto `gestor-de-gastos-e46ff`
3. Click en **Firestore Database** (menú izquierdo)
4. Click en pestaña **Reglas**
5. Copia contenido de `firestore.rules`
6. Pega en el editor
7. Click **Publicar**

#### Paso 5: Verificar Despliegue

```bash
# Abrir en navegador
start https://gestor-de-gastos-e46ff.web.app

# O visitar manualmente y verificar:
# ✅ Pantalla de PIN carga correctamente
# ✅ Firebase se conecta (ver consola F12)
# ✅ Mensaje de recordatorio visible
# ✅ Puede crear gastos
```

---

## 🎭 Despliegue Versión Demo

### Proyecto: `gestor-de-gastos-demo`

#### Paso 1: Configurar Proyecto Demo en Firebase

**1.1. Crear Proyecto (si no existe)**
```bash
# Opción A: Desde CLI
firebase projects:create gestor-de-gastos-demo

# Opción B: Desde consola web (más fácil)
# - Ve a https://console.firebase.google.com/
# - Click "Agregar proyecto"
# - Nombre: gestor-de-gastos-demo
# - ID: gestor-de-gastos-demo
# - Desactiva Google Analytics (opcional para demo)
```

**1.2. Habilitar Servicios**
```bash
# Ir a consola del proyecto demo
# https://console.firebase.google.com/project/gestor-de-gastos-demo

# Habilitar:
# 1. Firestore Database → Crear base de datos → Modo producción
# 2. Storage (opcional) → Comenzar
# 3. Hosting → Comenzar
```

#### Paso 2: Vincular Proyecto Local

El archivo `.firebaserc` ya está configurado:
```json
{
  "projects": {
    "default": "gestor-de-gastos-e46ff",
    "demo": "gestor-de-gastos-demo"
  }
}
```

#### Paso 3: Seleccionar Proyecto Demo

```bash
# Cambiar a proyecto demo
firebase use demo

# Verificar proyecto activo
firebase use
# Debe mostrar: Active Project: demo (gestor-de-gastos-demo)
```

#### Paso 4: Aplicar Reglas de Firestore Demo

```bash
# Opción A: Desde CLI
firebase deploy --only firestore:rules --project gestor-de-gastos-demo

# Opción B: Manualmente (recomendado primera vez)
```

**Pasos manuales:**
1. Ve a https://console.firebase.google.com/project/gestor-de-gastos-demo
2. Firestore Database → Reglas
3. Copia TODO el contenido de `firestore-demo.rules`
4. Pega en editor, reemplazando reglas por defecto
5. Click **Publicar**
6. Espera confirmación: "Las reglas se publicaron correctamente"

#### Paso 5: Desplegar Archivos

```bash
# Desplegar demo-profesional.html como página principal
firebase deploy --only hosting --project gestor-de-gastos-demo

# Nota: firebase.json debe configurar demo-profesional.html como index
```

**Verificar firebase.json:**
```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "**/*backup*"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/demo-profesional.html"
      }
    ]
  }
}
```

#### Paso 6: Verificar Despliegue Demo

```bash
# Abrir demo en navegador
start https://gestor-de-gastos-demo.web.app

# Verificaciones:
# ✅ Banner morado "VERSIÓN DEMO" visible
# ✅ Link a portfolio funciona
# ✅ PIN: 123456 (usuario) o demo123 (admin)
# ✅ Puede crear gastos de prueba
# ✅ Gastos se guardan en Firestore
```

---

## 🗄️ Configuración Firestore Database

### Inicializar Colecciones

#### Colección: `configuracion`

**Documento:** `sistema`

```javascript
// Ir a Firestore Database → Datos → Agregar colección
// Nombre colección: configuracion
// ID documento: sistema
// Campos:

{
  pinUsuario: "123456",              // PIN para usuarios normales
  pinAdmin: "demo123",               // PIN para administradores
  presupuestoTotal: 1000000,         // Presupuesto en pesos
  presupuestoViaticos: 400000,       // Viáticos en pesos
  fechaCreacion: [Timestamp: Ahora]  // Click en "agregar campo" → Timestamp
}
```

#### Colección: `gastos` (Opcional - Datos de Ejemplo)

**Agregar 2-3 gastos de ejemplo:**

```javascript
// Documento 1 (Auto-ID)
{
  descripcion: "Material de oficina",
  monto: 45000,
  fecha: "2025-12-01",
  categoria: "presupuesto",
  comprobanteAdjunto: true,
  registrado: false,
  creadoPor: "Usuario Demo",
  fechaCreacion: [Timestamp: Ahora]
}

// Documento 2 (Auto-ID)
{
  descripcion: "Combustible vehículo",
  monto: 35000,
  fecha: "2025-11-28",
  categoria: "viaticos",
  comprobanteAdjunto: true,
  registrado: true,
  creadoPor: "Usuario Demo",
  registradoPor: "Admin Demo",
  fechaCreacion: [Timestamp: Hace 3 días],
  fechaRegistro: [Timestamp: Hace 2 días]
}

// Documento 3 (Auto-ID)
{
  descripcion: "Mantenimiento equipos",
  monto: 120000,
  fecha: "2025-10-15",
  categoria: "presupuesto",
  comprobanteAdjunto: true,
  registrado: true,
  creadoPor: "Usuario Demo",
  registradoPor: "Admin Demo",
  fechaCreacion: [Timestamp: Hace 1 mes],
  fechaRegistro: [Timestamp: Hace 1 mes]
}
```

---

## 🔄 Despliegue Rápido (Ambos Proyectos)

### Script de Despliegue Completo

```bash
# ==================== PRODUCCIÓN ====================
echo "Desplegando PRODUCCIÓN..."
firebase use default
firebase deploy --only hosting
echo "✅ Producción desplegada en: https://gestor-de-gastos-e46ff.web.app"

# ==================== DEMO ====================
echo "Desplegando DEMO..."
firebase use demo
firebase deploy --only hosting
echo "✅ Demo desplegada en: https://gestor-de-gastos-demo.web.app"

# Volver a proyecto por defecto
firebase use default
```

### Guardar como script .ps1 (PowerShell)

```powershell
# deploy-all.ps1
Write-Host "🚀 Iniciando despliegue de ambos proyectos..." -ForegroundColor Cyan

# Producción
Write-Host "`n📦 Desplegando PRODUCCIÓN..." -ForegroundColor Yellow
firebase use default
firebase deploy --only hosting
Write-Host "✅ Producción: https://gestor-de-gastos-e46ff.web.app" -ForegroundColor Green

# Demo
Write-Host "`n🎭 Desplegando DEMO..." -ForegroundColor Yellow
firebase use demo  
firebase deploy --only hosting
Write-Host "✅ Demo: https://gestor-de-gastos-demo.web.app" -ForegroundColor Green

# Restaurar
firebase use default
Write-Host "`n✨ ¡Despliegue completado!" -ForegroundColor Cyan
```

**Ejecutar:**
```bash
.\deploy-all.ps1
```

---

## 🐛 Troubleshooting

### Error: "Project not found"

```bash
# Verificar proyectos disponibles
firebase projects:list

# Si gestor-de-gastos-demo no aparece, agregarlo:
firebase use --add
# Selecciona: gestor-de-gastos-demo
# Alias: demo
```

### Error: "Missing permissions"

```bash
# Verificar cuenta activa
firebase login:list

# Cerrar sesión y volver a entrar
firebase logout
firebase login
```

### Error: "Firestore rules invalid"

1. Ve a Firebase Console → Firestore → Reglas
2. Click en "Validar" antes de publicar
3. Revisa errores de sintaxis
4. Copia reglas directamente desde archivos originales

### Los cambios no se reflejan

```bash
# Limpiar caché local
firebase deploy --only hosting --force

# O en el navegador:
# Ctrl + Shift + R (recarga forzada)
# O modo incógnito
```

### Error: "Function timeout"

Si el despliegue es muy lento:
```bash
# Aumentar timeout (firebase.json)
{
  "hosting": {
    "public": ".",
    "headers": [{
      "source": "**",
      "headers": [{
        "key": "Cache-Control",
        "value": "max-age=3600"
      }]
    }]
  }
}
```

---

## 📊 Verificación Post-Despliegue

### Checklist Producción

- [ ] URL https://gestor-de-gastos-e46ff.web.app carga
- [ ] Pantalla PIN funciona
- [ ] PIN 123456 permite acceso
- [ ] Mensaje recordatorio visible
- [ ] Puede crear gastos
- [ ] Gastos pendientes se separan correctamente
- [ ] Historial por mes/trimestre/año funciona
- [ ] Admin puede aprobar gastos

### Checklist Demo

- [ ] URL https://gestor-de-gastos-demo.web.app carga
- [ ] Banner morado "VERSIÓN DEMO" visible
- [ ] Link a portfolio funciona
- [ ] PIN 123456 o demo123 funcionan
- [ ] Datos de ejemplo visibles
- [ ] Puede agregar gastos de prueba
- [ ] Firestore guarda correctamente

---

## 📝 Comandos de Referencia Rápida

```bash
# Ver proyecto activo
firebase use

# Listar todos los proyectos
firebase projects:list

# Cambiar a producción
firebase use default

# Cambiar a demo
firebase use demo

# Desplegar hosting
firebase deploy --only hosting

# Desplegar reglas
firebase deploy --only firestore:rules

# Desplegar todo
firebase deploy

# Ver logs
firebase hosting:logs

# Abrir proyecto en consola
firebase open hosting:site

# Abrir Firestore en consola
firebase open firestore
```

---

## 🔐 Seguridad Post-Despliegue

### Producción

1. **Cambiar PINs por defecto inmediatamente**
   ```
   Firestore → configuracion → sistema
   Cambiar: pinUsuario y pinAdmin
   ```

2. **Revisar reglas de seguridad**
   ```bash
   firebase firestore:rules:get
   ```

3. **Configurar límites de cuota**
   - Firebase Console → Usage and billing
   - Establecer alertas de presupuesto

### Demo

1. **Monitorear uso**
   - Configurar alertas si supera X operaciones/día
   
2. **Limpieza periódica**
   - Borrar gastos >30 días cada semana
   - Usar Cloud Functions o script manual

---

## 📧 Soporte

**Errores de despliegue:**
- Revisar documentación: https://firebase.google.com/docs/hosting
- Stack Overflow: tag `firebase-hosting`

**Errores de Firestore:**
- Documentación reglas: https://firebase.google.com/docs/firestore/security
- Simulator de reglas en consola

---

*Última actualización: Diciembre 1, 2025*
*Versión: 2.0*
