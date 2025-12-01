# 🚀 Guía de Configuración - Versión Demo

## Configuración Inicial del Proyecto Demo en Firebase

### Paso 1: Aplicar Reglas de Seguridad en Firestore

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona el proyecto **gestor-de-gastos-demo**
3. En el menú lateral, haz clic en **Firestore Database**
4. Ve a la pestaña **Reglas**
5. Copia el contenido del archivo `firestore-demo.rules`
6. Pégalo en el editor de reglas
7. Haz clic en **Publicar**

### Paso 2: Inicializar Datos de Demostración

Ejecuta estos comandos en la consola de Firebase (o desde tu código):

```javascript
// En la colección 'configuracion', documento 'sistema'
{
  pinUsuario: "123456",
  pinAdmin: "demo123",
  presupuestoTotal: 1000000,
  presupuestoViaticos: 400000,
  fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
}
```

### Paso 3: Agregar Gastos de Ejemplo

Puedes agregar gastos de demostración directamente desde la aplicación o desde la consola de Firebase:

```javascript
// Colección 'gastos'
[
  {
    descripcion: "Material de oficina",
    monto: 45000,
    fecha: "2025-12-01",
    categoria: "presupuesto",
    comprobanteAdjunto: true,
    registrado: false,
    creadoPor: "Usuario Demo",
    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
  },
  {
    descripcion: "Combustible vehículo",
    monto: 35000,
    fecha: "2025-12-05",
    categoria: "viaticos",
    comprobanteAdjunto: true,
    registrado: true,
    creadoPor: "Usuario Demo",
    registradoPor: "Admin Demo",
    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
  }
]
```

### Paso 4: Desplegar a Firebase Hosting

```bash
# Asegúrate de estar en el directorio del proyecto
cd gestor-gastos

# Crea un archivo firebase.json para el proyecto demo
# (O edita el existente para incluir múltiples sites)

# Despliega la versión demo
firebase deploy --only hosting:demo
```

### Configuración de Múltiples Sites en Firebase Hosting

Si quieres tener ambas versiones (producción y demo) en Firebase Hosting:

1. Crea un archivo `.firebaserc` con:

```json
{
  "projects": {
    "default": "gestor-de-gastos-e46ff",
    "demo": "gestor-de-gastos-demo"
  }
}
```

2. Modifica `firebase.json`:

```json
{
  "hosting": [
    {
      "target": "produccion",
      "public": ".",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**",
        "**/*demo*",
        "**/*backup*"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "demo",
      "public": ".",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**",
        "**/*backup*",
        "index.html",
        "firebase-config.js"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/demo-profesional.html"
        }
      ]
    }
  ]
}
```

3. Despliega:

```bash
# Desplegar solo producción
firebase deploy --only hosting:produccion

# Desplegar solo demo
firebase deploy --only hosting:demo

# Desplegar ambos
firebase deploy --only hosting
```

---

## URLs Finales

**Producción (Privada):**
- URL: https://gestor-de-gastos-e46ff.web.app
- Firebase Project: gestor-de-gastos-e46ff
- Config: firebase-config.js

**Demo (Pública):**
- URL: https://gestor-de-gastos-demo.web.app
- Firebase Project: gestor-de-gastos-demo
- Config: firebase-config-demo.js

---

## Credenciales de Acceso

### Versión Producción
- PIN Usuario: `123456` (cambiar inmediatamente)
- PIN Admin: `admin1` (cambiar inmediatamente)

### Versión Demo
- PIN Usuario: `123456`
- PIN Admin: `demo123`

---

## Diferencias entre Versiones

| Característica | Producción | Demo |
|----------------|------------|------|
| Proyecto Firebase | gestor-de-gastos-e46ff | gestor-de-gastos-demo |
| Datos | Reales, privados | Ficticios, públicos |
| Acceso | Restringido | Abierto |
| Reglas Firestore | Estrictas | Permisivas |
| Banner identificativo | ❌ No | ✅ Sí |
| Link portfolio | ❌ No | ✅ Sí |

---

## Mantenimiento

### Limpiar Datos de Demo Periódicamente

Puedes crear un Cloud Function que limpie datos viejos cada 24 horas:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.limpiarDatosDemo = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    // Eliminar gastos viejos
    const gastosViejos = await db.collection('gastos')
      .where('fechaCreacion', '<', hace30Dias)
      .get();
    
    const batch = db.batch();
    gastosViejos.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log(`Eliminados ${gastosViejos.size} gastos antiguos`);
  });
```

---

## Seguridad

⚠️ **Importante:** La versión demo tiene reglas de seguridad más permisivas para permitir pruebas. No uses este proyecto para datos reales.

### Medidas de Seguridad Implementadas en Demo:
- ✅ Los nuevos gastos siempre empiezan como "no registrados"
- ✅ Solo se pueden actualizar campos específicos
- ✅ Validación de tipos de datos
- ✅ La configuración del sistema es solo lectura pública

### Mejoras Futuras:
- Rate limiting para prevenir spam
- CAPTCHA en formularios
- Logs de actividad sospechosa

---

## Troubleshooting

### Error: "Missing or insufficient permissions"
**Solución:** Verifica que las reglas de Firestore estén publicadas correctamente

### La demo no carga datos
**Solución:** 
1. Verifica la consola del navegador (F12)
2. Asegúrate de que `firebase-config-demo.js` tenga las credenciales correctas
3. Verifica que Firestore esté habilitado en el proyecto

### Los gastos no se guardan
**Solución:** Revisa que todos los campos requeridos estén completos y que las reglas de Firestore permitan la escritura

---

## Contacto

Para soporte técnico o consultas:
- GitHub: [Tu perfil de GitHub]
- Portfolio: [Tu portfolio]
- Email: [Tu email]

---

*Última actualización: Diciembre 2025*
