#  Gestor de Gastos Corporativo

Sistema profesional de gestión de gastos con control de presupuestos, autenticación por PIN y monitoreo en tiempo real.

##  Aplicación en Producción

**URL de la App**: https://gestor-de-gastos-e46ff.web.app

**Demo Pública**: https://gestor-de-gastos-e46ff.web.app/demo.html

---

##  Características Principales

###  Gestión de Gastos
-  Registro de gastos con fecha, descripción, monto y categoría
-  Dos categorías principales: **Presupuesto** y **Viáticos**
-  Control de comprobantes adjuntos al grupo de finanzas
-  Moneda local: Pesos Argentinos (ARS)

###  Roles de Usuario
-  **Administrador**: Control total del sistema
  - Modificar presupuestos
  - Registrar/aprobar gastos
  - Cambiar PINs de seguridad
  - Eliminar gastos
  
-  **Usuario**: Operación diaria
  - Agregar nuevos gastos
  - Ver estado de gastos (Pendiente/Registrado)
  - Consultar presupuestos disponibles

###  Seguridad
- PIN de 6 dígitos para usuarios
- PIN personalizado para administradores
- Validación de campos y tipos de datos
- Reglas de seguridad en Firestore
- Cifrado en tránsito (HTTPS)

###  Monitoreo en Tiempo Real
- Actualización automática de presupuestos
- Sincronización entre dispositivos
- Estados visuales con colores:
  -  **BUENO**: 0-60% del presupuesto
  -  **REGULAR**: 60-85% del presupuesto
  -  **ALERTA**: 85%+ del presupuesto

###  Organización de Gastos
- ** Todos**: Vista completa de gastos
- ** Pendientes**: Gastos esperando aprobación
- ** Registrados**: Gastos aprobados por administrador

---

##  Tecnologías Utilizadas

- **Frontend**: HTML5, Tailwind CSS, JavaScript ES6+
- **Backend**: Firebase (BaaS)
  - Firestore Database (Base de datos en tiempo real)
  - Firebase Hosting (Despliegue)
  - Firebase Storage (Almacenamiento)
- **Seguridad**: Firestore Security Rules

---

##  Estructura del Proyecto

```
gestor-gastos/
 index.html              # Interfaz principal
 demo.html               # Versión demo pública
 app.js                  # Lógica de la aplicación
 demo.js                 # Lógica de la demo
 firebase-config.js      # Configuración de Firebase
 firestore.rules         # Reglas de seguridad
 README.md               # Este archivo
 SEGURIDAD.md           # Guía de seguridad
 INSTRUCCIONES-FIREBASE.md  # Guía de despliegue
```

---

##  Instalación y Configuración

### 1. Clonar o Descargar el Proyecto

```bash
git clone https://github.com/tu-usuario/gestor-gastos.git
cd gestor-gastos
```

### 2. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un proyecto o usa uno existente
3. Habilita **Firestore Database**
4. Copia las credenciales en `firebase-config.js`

### 3. Aplicar Reglas de Seguridad

1. En Firebase Console, ve a **Firestore Database > Reglas**
2. Copia el contenido de `firestore.rules`
3. Haz clic en **Publicar**

### 4. Probar Localmente

Abre `index.html` en tu navegador o usa un servidor local:

```bash
# Opción 1: Python
python -m http.server 8000

# Opción 2: Node.js
npx http-server

# Opción 3: PHP
php -S localhost:8000
```

Visita: `http://localhost:8000`

---

##  Desplegar en Firebase Hosting

### Opción 1: Firebase CLI (Recomendado)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Inicializar proyecto
firebase init hosting

# Desplegar
firebase deploy
```

### Opción 2: Consola Web

1. Ve a Firebase Console > Hosting
2. Sigue el asistente
3. Arrastra los archivos necesarios

---

##  Credenciales por Defecto

 **IMPORTANTE**: Cambia estos PINs inmediatamente después del primer inicio

- **PIN Usuario**: `123456`
- **PIN Administrador**: `admin1`

Para cambiar los PINs:
1. Ingresa como administrador
2. Clic en " Panel Admin"
3. Ve a "Configuración de Seguridad"
4. Actualiza los PINs

---

##  Uso de la Aplicación

### Como Usuario

1. **Ingresar al Sistema**
   - Ingresa el PIN de usuario
   - Clic en " Verificar PIN"

2. **Agregar Gasto**
   - Clic en " Nuevo Gasto"
   - Completa: Fecha, Categoría, Descripción, Monto
   - Marca si adjuntaste comprobante
   - Clic en " Guardar Gasto"

3. **Consultar Gastos**
   - Usa las pestañas: Todos, Pendientes, Registrados
   - Filtra por categoría: Presupuesto o Viáticos

### Como Administrador

1. **Actualizar Presupuestos**
   - Clic en " Panel Admin"
   - Ingresa nuevos montos en pesos
   - Clic en " Actualizar Presupuestos"

2. **Aprobar Gastos**
   - Marca el checkbox "Marcar como registrado"
   - El gasto cambia de Pendiente a Registrado

3. **Eliminar Gastos**
   - Clic en " Eliminar"
   - Confirma la acción

4. **Cambiar PINs**
   - En el panel admin, sección "Configuración de Seguridad"
   - Ingresa nuevos PINs
   - Clic en " Actualizar PINs"

---

##  Versión Demo

**URL**: https://gestor-de-gastos-e46ff.web.app/demo.html

La versión demo muestra:
-  Interfaz completa del sistema
-  Datos de ejemplo ficticios
-  Funcionalidad de navegación
-  Sin autenticación requerida
-  Sin acceso a datos reales
-  Sin capacidad de modificar datos

Ideal para:
- Mostrar el sistema a terceros
- Capacitación de personal
- Presentaciones comerciales

---

##  Seguridad y Buenas Prácticas

###  Implementado
- Validación de campos en cliente y servidor
- Reglas de seguridad en Firestore
- HTTPS obligatorio en producción
- Separación de roles (Usuario/Admin)
- Validación de tipos de datos

###  Recomendaciones
1. **Cambiar PINs por defecto inmediatamente**
2. **Implementar Firebase Authentication para producción**
3. **Configurar App Check para prevenir bots**
4. **Establecer límites de cuota en Firebase**
5. **Revisar logs de Firestore regularmente**
6. **Hacer backups periódicos de la base de datos**

Ver **SEGURIDAD.md** para más detalles.

---

##  Arquitectura de Datos

### Colección: `configuracion`
```javascript
{
  pinUsuario: "123456",
  pinAdmin: "admin1",
  presupuestoTotal: 900000,
  presupuestoViaticos: 300000,
  fechaCreacion: Timestamp,
  fechaActualizacion: Timestamp
}
```

### Colección: `gastos`
```javascript
{
  descripcion: "Combustible vehículo oficial",
  monto: 15000,
  fecha: "2025-11-22",
  categoria: "viaticos",
  comprobanteAdjunto: true,
  registrado: false,
  creadoPor: "Usuario",
  fechaCreacion: Timestamp,
  fechaRegistro: Timestamp (opcional),
  registradoPor: "Administrador" (opcional)
}
```

---

##  Solución de Problemas

### Error: "Firebase no está inicializado"
- Verifica que `firebase-config.js` tenga las credenciales correctas
- Asegúrate de tener conexión a internet
- Revisa la consola del navegador (F12) para más detalles

### Error: "Cannot access 'variable' before initialization"
- Recarga la página (F5)
- Limpia la caché del navegador (Ctrl + Shift + R)

### Los gastos no se guardan
- Verifica que Firestore Database esté habilitado
- Revisa las reglas de seguridad en Firebase Console
- Comprueba la consola del navegador para errores

### El botón "Verificando..." no se resetea
- Este problema está corregido en la última versión
- Recarga la página completamente

---

##  Changelog

### v1.2.0 (2025-11-22)
-  Agregadas pestañas de filtrado (Todos, Pendientes, Registrados)
-  Versión demo pública
-  Implementadas reglas de seguridad en Firestore
-  Corregido problema de botón "Verificando..."
-  Documentación completa actualizada

### v1.1.0 (2025-11-21)
-  Sistema de aprobación de gastos
-  Checkbox para marcar gastos como registrados
-  Filtros por categoría mejorados
-  Tema oscuro profesional (negro-naranja-gris)

### v1.0.0 (2025-11-20)
-  Lanzamiento inicial
-  Gestión básica de gastos
-  Autenticación por PIN
-  Monitoreo de presupuestos

---

##  Contacto y Soporte

- **Documentación**: Ver archivos .md en el proyecto
- **Firebase Docs**: https://firebase.google.com/docs

---

##  Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

---

**Desarrollado con  para una gestión eficiente de gastos corporativos**

*Última actualización: Noviembre 22, 2025*
