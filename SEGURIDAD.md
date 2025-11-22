# 🔐 Medidas de Seguridad - Gestor de Gastos

## 📋 Configuración de Seguridad de Firebase

### 1. Aplicar Reglas de Firestore

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **gestor-de-gastos-e46ff**
3. En el menú lateral, ve a **Firestore Database**
4. Haz clic en la pestaña **Reglas**
5. Copia y pega el contenido del archivo `firestore.rules`
6. Haz clic en **Publicar**

### 2. Configurar Autenticación (Recomendado para producción)

#### Opción A: Firebase Authentication con Email/Password
```javascript
// Reemplazar el sistema de PINs con Firebase Auth
firebase.auth().signInWithEmailAndPassword(email, password)
  .then((userCredential) => {
    // Usuario autenticado
  });
```

#### Opción B: Mantener PINs pero con Hash
```javascript
// Usar bcrypt o similar para hashear los PINs
const hashedPin = await bcrypt.hash(pin, 10);
```

### 3. Reglas de Seguridad Implementadas

✅ **Lectura de configuración**: Permitida (necesaria para validación de PIN)
✅ **Escritura de configuración**: Validada (campos obligatorios)
✅ **Crear gastos**: Validación de campos y tipos
✅ **Actualizar gastos**: Solo campos `registrado`, `fechaRegistro`, `registradoPor`
✅ **Eliminar gastos**: Permitido
❌ **Todo lo demás**: Denegado por defecto

### 4. Medidas de Seguridad Adicionales

#### En Firebase Console:

1. **Configurar App Check** (Anti-bot)
   - Ve a **App Check** en la consola
   - Activa reCAPTCHA v3 para web
   - Esto previene acceso automatizado

2. **Habilitar Monitoreo**
   - Ve a **Firestore Database > Usage**
   - Monitorea lecturas/escrituras anómalas

3. **Configurar Límites de Cuota**
   - Ve a **Configuración del Proyecto > Uso y facturación**
   - Establece alertas de cuota

4. **Restringir dominios autorizados**
   - Ve a **Authentication > Settings**
   - En **Dominios autorizados**, agrega solo tu dominio

#### En tu código:

1. **Cambiar PINs por defecto INMEDIATAMENTE**
   ```
   PIN Usuario por defecto: 123456 → Cambiar
   PIN Admin por defecto: admin1 → Cambiar
   ```

2. **No compartir firebase-config.js públicamente**
   - Este archivo contiene tus credenciales
   - No lo subas a GitHub sin .gitignore

3. **Usar HTTPS en producción**
   - Firebase Hosting proporciona HTTPS automático
   - Nunca uses HTTP para la app en producción

### 5. Despliegue Seguro con Firebase Hosting

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Inicializar proyecto
firebase init hosting

# Seleccionar:
# - Public directory: . (directorio actual)
# - Configure as single-page app: No
# - Set up automatic builds: No

# Desplegar
firebase deploy
```

### 6. Variables de Entorno (Producción)

Para producción, mueve las credenciales a variables de entorno:

```javascript
// firebase-config.js
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  // ...
};
```

### 7. Monitoreo y Auditoría

- Revisa los logs de Firestore regularmente
- Implementa Cloud Functions para auditoría:
  ```javascript
  exports.auditGastos = functions.firestore
    .document('gastos/{gastoId}')
    .onWrite((change, context) => {
      // Registrar cambios en otra colección
    });
  ```

### 8. Backup y Recuperación

1. Ve a **Firestore Database > Backup**
2. Configura backups automáticos diarios
3. Almacena en Google Cloud Storage

---

## ⚠️ IMPORTANTE: Acciones Inmediatas

1. ✅ Aplicar reglas de Firestore
2. ✅ Cambiar PINs por defecto
3. ✅ Restringir dominios autorizados
4. ✅ Configurar App Check
5. ✅ Establecer alertas de uso

## 🔒 Nivel de Seguridad Actual

🟡 **MEDIO** - Funcional para uso interno/desarrollo
🔴 **Mejorar para producción** - Implementar Firebase Auth + HTTPS + App Check

---

**Contacto Técnico**: Para asistencia con la configuración de seguridad, consulta la [documentación oficial de Firebase Security](https://firebase.google.com/docs/rules)
