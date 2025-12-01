# 🏗️ Estructura de Proyectos Separados

## ✅ Problema Resuelto

**Antes**: Ambas versiones (producción y demo) compartían la misma base de datos Firebase, causando que:
- Cambiar contraseña en demo la cambiaba en producción
- Los gastos eran los mismos en ambas versiones
- No había separación real entre entornos

**Ahora**: Cada versión usa su propio proyecto Firebase completamente independiente.

---

## 📁 Nueva Estructura de Carpetas

```
gestor-gastos/
├── public/                          ← Archivos de PRODUCCIÓN
│   ├── index.html                   (usa firebase-config.js)
│   ├── app.js
│   └── firebase-config.js           (gestor-de-gastos-e46ff)
│
├── public-demo/                     ← Archivos de DEMO
│   ├── index.html                   (demo-profesional.html renombrado)
│   ├── app.js                       (mismo código)
│   └── firebase-config.js           (gestor-de-gastos-demo)
│
├── firebase.json                    ← Configuración con 2 targets
├── .firebaserc                      ← Proyectos y targets
└── [archivos de desarrollo]
```

---

## 🔧 Configuración de Firebase

### `firebase.json`
```json
{
  "hosting": [
    {
      "target": "produccion",
      "public": "public",
      ...
    },
    {
      "target": "demo",
      "public": "public-demo",
      ...
    }
  ]
}
```

### `.firebaserc`
```json
{
  "projects": {
    "default": "gestor-de-gastos-e46ff",
    "demo": "gestor-de-gastos-demo"
  },
  "targets": {
    "gestor-de-gastos-e46ff": {
      "hosting": {
        "produccion": ["gestor-de-gastos-e46ff"]
      }
    },
    "gestor-de-gastos-demo": {
      "hosting": {
        "demo": ["gestor-de-gastos-demo"]
      }
    }
  }
}
```

---

## 🚀 Comandos de Despliegue

### Desplegar PRODUCCIÓN
```bash
firebase use default
firebase deploy --only hosting:produccion
```

Despliega carpeta `public/` → https://gestor-de-gastos-e46ff.web.app

### Desplegar DEMO
```bash
firebase use demo
firebase deploy --only hosting:demo
```

Despliega carpeta `public-demo/` → https://gestor-de-gastos-demo.web.app

### Desplegar AMBOS (todos los cambios)
```bash
# Producción
firebase use default
firebase deploy --only hosting:produccion

# Demo
firebase use demo
firebase deploy --only hosting:demo
```

---

## 🔐 Separación Completa de Datos

### Proyecto PRODUCCIÓN (`gestor-de-gastos-e46ff`)
- **Firestore Database**: Base de datos independiente
- **Firebase Storage**: Almacenamiento independiente
- **Configuración**: `public/firebase-config.js`
- **PINs**: Los que configure el cliente en producción
- **Gastos**: Solo datos reales del cliente

### Proyecto DEMO (`gestor-de-gastos-demo`)
- **Firestore Database**: Base de datos independiente (separada)
- **Firebase Storage**: Almacenamiento independiente
- **Configuración**: `public-demo/firebase-config.js`
- **PINs**: Contraseñas de demostración (123456 / admin1)
- **Gastos**: Datos de prueba ficticios
- **Banner**: Identificación visual "VERSIÓN DEMO"

---

## 🎯 Diferencias Clave

| Aspecto | Producción | Demo |
|---------|------------|------|
| **URL** | gestor-de-gastos-e46ff.web.app | gestor-de-gastos-demo.web.app |
| **Firebase Project** | gestor-de-gastos-e46ff | gestor-de-gastos-demo |
| **Base de Datos** | Firestore independiente | Firestore independiente |
| **PINs** | Personalizados del cliente | 123456 / admin1 |
| **Gastos** | Datos reales | Datos ficticios |
| **Banner** | Sin banner | Banner morado "DEMO" |
| **Firestore Rules** | Restrictivas | Permisivas (lectura pública) |

---

## 📝 Workflow de Desarrollo

### 1. Modificar Código
Edita los archivos en la raíz:
- `index.html` (producción)
- `demo-profesional.html` (demo)
- `app.js` (compartido)

### 2. Copiar a Carpetas de Deploy
```bash
# Producción
Copy-Item index.html public/
Copy-Item app.js public/

# Demo
Copy-Item demo-profesional.html public-demo/index.html
Copy-Item app.js public-demo/
```

### 3. Desplegar
```bash
# Solo producción
firebase use default
firebase deploy --only hosting:produccion

# Solo demo
firebase use demo
firebase deploy --only hosting:demo
```

---

## ⚠️ Importante

### NO Hacer
❌ Modificar directamente archivos en `public/` o `public-demo/`  
❌ Usar `firebase deploy --only hosting` (sin target)  
❌ Compartir configuraciones de Firebase entre proyectos

### SÍ Hacer
✅ Editar archivos en la raíz del proyecto  
✅ Copiar cambios a las carpetas public  
✅ Usar targets específicos en deploy  
✅ Verificar que cada proyecto tenga su propia config

---

## 🧪 Herramienta de Inicialización Demo

Para poblar la base de datos DEMO con datos ficticios:

1. Abre: `inicializar-datos-demo.html`
2. Verifica que use `firebase-config-demo.js`
3. Click en "Crear Configuración"
4. Click en "Crear Gastos de Ejemplo"
5. Verifica en consola Firebase del proyecto demo

---

## 🔍 Verificación Post-Deploy

### Producción
1. Accede: https://gestor-de-gastos-e46ff.web.app
2. Verifica: Sin banner demo
3. Login con PIN del cliente
4. Verifica: Datos reales del cliente

### Demo
1. Accede: https://gestor-de-gastos-demo.web.app
2. Verifica: Banner morado "VERSIÓN DEMO"
3. Login: 123456 (usuario) o admin1 (admin)
4. Verifica: Datos ficticios de ejemplo

### Test de Separación
1. Cambia contraseña en DEMO
2. Verifica que NO cambie en PRODUCCIÓN
3. Crea gasto en DEMO
4. Verifica que NO aparezca en PRODUCCIÓN

---

## 📊 Ventajas de Esta Estructura

### ✅ Separación Total
- Bases de datos completamente independientes
- Cambios en demo no afectan producción
- Seguridad: cliente no ve datos demo

### ✅ Fácil Mantenimiento
- Código compartido (app.js)
- Deploy selectivo por proyecto
- Configuraciones claras

### ✅ Profesionalismo
- Demo claramente identificada
- Producción limpia sin referencias demo
- Datos ficticios vs reales bien separados

### ✅ Escalabilidad
- Fácil agregar más entornos (staging, testing)
- Targets de Firebase bien organizados
- Estructura clara y documentada

---

## 🐛 Troubleshooting

### Problema: Cambios no se reflejan
**Solución**: Limpia caché del navegador (Ctrl+F5) o modo incógnito

### Problema: "Target not found"
**Solución**: Verifica que `.firebaserc` tenga los targets configurados

### Problema: Sigue usando config incorrecta
**Solución**: 
1. Verifica que `public/index.html` use `./firebase-config.js`
2. Verifica que `public-demo/index.html` use `./firebase-config.js`
3. Verifica que cada carpeta tenga su propio `firebase-config.js`

### Problema: Deploy falla
**Solución**: 
```bash
firebase use default
firebase target:apply hosting produccion gestor-de-gastos-e46ff
firebase use demo
firebase target:apply hosting demo gestor-de-gastos-demo
```

---

## 📅 Actualizaciones Futuras

Cuando hagas cambios:

1. **Solo producción**: Edita `index.html`, copia a `public/`, deploy producción
2. **Solo demo**: Edita `demo-profesional.html`, copia a `public-demo/`, deploy demo
3. **Código compartido**: Edita `app.js`, copia a ambas carpetas, deploy ambos
4. **Nueva funcionalidad**: Prueba en demo primero, luego pasa a producción

---

## 🎓 Scripts de Ayuda (Opcional)

Puedes crear scripts PowerShell para automatizar:

### `deploy-produccion.ps1`
```powershell
Copy-Item index.html public/
Copy-Item app.js public/
firebase use default
firebase deploy --only hosting:produccion
```

### `deploy-demo.ps1`
```powershell
Copy-Item demo-profesional.html public-demo/index.html
Copy-Item app.js public-demo/
firebase use demo
firebase deploy --only hosting:demo
```

### `deploy-todo.ps1`
```powershell
./deploy-produccion.ps1
./deploy-demo.ps1
```

---

**Fecha**: Diciembre 2025  
**Estado**: ✅ Implementado y Funcionando  
**Proyectos Separados**: Producción y Demo completamente independientes
