#  Gestor de Gastos Corporativo

**Copyright © 2026 Davemnt. Todos los derechos reservados.**

Sistema profesional de gesti�n de gastos con control de presupuestos, autenticaci�n por PIN y monitoreo en tiempo real.

> ⚖️ **AVISO LEGAL**: Este software es propiedad privada y está protegido por leyes de derechos de autor. El uso, copia, modificación o distribución no autorizados están prohibidos. Consulte el archivo [LICENSE](LICENSE) para más información.

## 🌐 Aplicaciones Desplegadas

### 🛠️ Versión de Producción
**URL**: https://gestor-de-gastos-e46ff.web.app
- Control total del sistema
- Cambio de PINs habilitado
- Recuperación de cuenta por email
- Gestión completa de gastos

### 🎭 Versión DEMO Pública
**URL**: https://gestor-de-gastos-demo.web.app
- PINs: `demo123` (usuario) / `admin456` (admin)
- Cambio de PINs bloqueado para seguridad
- Proyecto Firebase independiente
- Datos de prueba separados

---

##  Caracter�sticas Principales

###  Gesti�n de Gastos
-  Registro de gastos con fecha, descripci�n, monto y categor�a
-  Dos categor�as principales: **Presupuesto** y **Vi�ticos**
-  Control de comprobantes adjuntos al grupo de finanzas
-  Moneda local: Pesos Argentinos (ARS)

###  Roles de Usuario
-  **Administrador**: Control total del sistema
  - Modificar presupuestos
  - Registrar/aprobar gastos
  - Cambiar PINs de seguridad
  - Eliminar gastos
  
-  **Usuario**: Operaci�n diaria
  - Agregar nuevos gastos
  - Ver estado de gastos (Pendiente/Registrado)
  - Consultar presupuestos disponibles

### 🔒 Seguridad
- PIN de mínimo 4 caracteres para usuarios y administradores
- 📧 **Sistema de recuperación por email**: Verificación de identidad
- 🔐 **Versión DEMO protegida**: Cambio de PINs bloqueado
- Validación de campos y tipos de datos
- Reglas de seguridad en Firestore
- Cifrado en tránsito (HTTPS)
- Proyectos Firebase independientes (producción/demo)

###  Monitoreo en Tiempo Real
- Actualizaci�n autom�tica de presupuestos
- Sincronizaci�n entre dispositivos
- Estados visuales con colores:
  -  **BUENO**: 0-60% del presupuesto
  -  **REGULAR**: 60-85% del presupuesto
  -  **ALERTA**: 85%+ del presupuesto

###  Organizaci�n de Gastos
- ** Todos**: Vista completa de gastos
- ** Pendientes**: Gastos esperando aprobaci�n
- ** Registrados**: Gastos aprobados por administrador

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, Tailwind CSS, JavaScript ES6+
- **Diseño**: 
  - Tema profesional gris claro (#f3f4f6)
  - Paleta celeste-azul para acentos
  - Sistema responsive completo
  - Grid adaptativo con Tailwind
  - Menú hamburguesa en móviles
- **Backend**: Firebase (BaaS)
  - Firestore Database (Base de datos en tiempo real)
  - Firebase Hosting (Despliegue con targets)
  - Firebase Storage (Almacenamiento)
- **Seguridad**: Firestore Security Rules, proyectos independientes

---

##  Estructura del Proyecto

```
gestor-gastos/
 index.html              # Interfaz principal
 demo.html               # Versi�n demo p�blica
 app.js                  # L�gica de la aplicaci�n
 demo.js                 # L�gica de la demo
 firebase-config.js      # Configuraci�n de Firebase
 firestore.rules         # Reglas de seguridad
 README.md               # Este archivo
 SEGURIDAD.md           # Gu�a de seguridad
 INSTRUCCIONES-FIREBASE.md  # Gu�a de despliegue
```

---

##  Instalaci�n y Configuraci�n

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
# Opci�n 1: Python
python -m http.server 8000

# Opci�n 2: Node.js
npx http-server

# Opci�n 3: PHP
php -S localhost:8000
```

Visita: `http://localhost:8000`

---

##  Desplegar en Firebase Hosting

### Opci�n 1: Firebase CLI (Recomendado)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Iniciar sesi�n
firebase login

# Inicializar proyecto
firebase init hosting

# Desplegar
firebase deploy
```

### Opci�n 2: Consola Web

1. Ve a Firebase Console > Hosting
2. Sigue el asistente
3. Arrastra los archivos necesarios

---

## 🔑 Credenciales por Defecto

### 🛠️ Versión de Producción
⚠️ **IMPORTANTE**: Cambia estos PINs inmediatamente después del primer inicio

- **PIN Usuario**: `123456`
- **PIN Administrador**: `admin1`

Para cambiar los PINs:
1. Ingresa como administrador
2. Clic en "⚙️ Panel Admin"
3. Ve a "Configuración de Seguridad"
4. Configura tu **Email de Recuperación**
5. Actualiza los PINs (mínimo 4 caracteres)
6. Guarda los cambios

### 🎭 Versión DEMO

🔒 **PINs FIJOS (no modificables)**:
- **PIN Usuario**: `demo123`
- **PIN Administrador**: `admin456`

⚠️ El cambio de PINs está **bloqueado** en la versión demo para proteger el acceso público.

---

##  Uso de la Aplicaci�n

### Como Usuario

1. **Ingresar al Sistema**
   - Ingresa el PIN de usuario
   - Clic en " Verificar PIN"

2. **Agregar Gasto**
   - Clic en " Nuevo Gasto"
   - Completa: Fecha, Categor�a, Descripci�n, Monto
   - Marca si adjuntaste comprobante
   - Clic en " Guardar Gasto"

3. **Consultar Gastos**
   - Usa las pesta�as: Todos, Pendientes, Registrados
   - Filtra por categor�a: Presupuesto o Vi�ticos

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
   - Confirma la acci�n

4. **Cambiar PINs**
   - En el panel admin, secci�n "Configuraci�n de Seguridad"
   - Ingresa nuevos PINs
   - Clic en " Actualizar PINs"

---

##  Versi�n Demo

**URL**: https://gestor-de-gastos-e46ff.web.app/demo.html

La versi�n demo muestra:
-  Interfaz completa del sistema
-  Datos de ejemplo ficticios
-  Funcionalidad de navegaci�n
-  Sin autenticaci�n requerida
-  Sin acceso a datos reales
-  Sin capacidad de modificar datos

Ideal para:
- Mostrar el sistema a terceros
- Capacitaci�n de personal
- Presentaciones comerciales

---

##  Seguridad y Buenas Pr�cticas

###  Implementado
- Validaci�n de campos en cliente y servidor
- Reglas de seguridad en Firestore
- HTTPS obligatorio en producci�n
- Separaci�n de roles (Usuario/Admin)
- Validaci�n de tipos de datos

###  Recomendaciones
1. **Cambiar PINs por defecto inmediatamente**
2. **Implementar Firebase Authentication para producci�n**
3. **Configurar App Check para prevenir bots**
4. **Establecer l�mites de cuota en Firebase**
5. **Revisar logs de Firestore regularmente**
6. **Hacer backups peri�dicos de la base de datos**

Ver **SEGURIDAD.md** para m�s detalles.

---

##  Arquitectura de Datos

### Colecci�n: `configuracion`
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

### Colecci�n: `gastos`
```javascript
{
  descripcion: "Combustible veh�culo oficial",
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

##  Soluci�n de Problemas

### Error: "Firebase no est� inicializado"
- Verifica que `firebase-config.js` tenga las credenciales correctas
- Aseg�rate de tener conexi�n a internet
- Revisa la consola del navegador (F12) para m�s detalles

### Error: "Cannot access 'variable' before initialization"
- Recarga la p�gina (F5)
- Limpia la cach� del navegador (Ctrl + Shift + R)

### Los gastos no se guardan
- Verifica que Firestore Database est� habilitado
- Revisa las reglas de seguridad en Firebase Console
- Comprueba la consola del navegador para errores

### El bot�n "Verificando..." no se resetea
- Este problema est� corregido en la �ltima versi�n
- Recarga la p�gina completamente

---

##  Changelog

### v1.2.0 (2025-11-22)
-  Agregadas pesta�as de filtrado (Todos, Pendientes, Registrados)
-  Versi�n demo p�blica
-  Implementadas reglas de seguridad en Firestore
-  Corregido problema de bot�n "Verificando..."
-  Documentaci�n completa actualizada

### v1.1.0 (2025-11-21)
-  Sistema de aprobaci�n de gastos
-  Checkbox para marcar gastos como registrados
-  Filtros por categor�a mejorados
-  Tema oscuro profesional (negro-naranja-gris)

### v1.0.0 (2025-11-20)
-  Lanzamiento inicial
-  Gesti�n b�sica de gastos
-  Autenticaci�n por PIN
-  Monitoreo de presupuestos

---

##  Contacto y Soporte

- **Documentaci�n**: Ver archivos .md en el proyecto
- **Firebase Docs**: https://firebase.google.com/docs
- **GitHub**: https://github.com/Davemnt/gestor-de-gastos

---

## ⚖️ Propiedad Intelectual

**Este software es propiedad privada y está completamente protegido.**

### Derechos de Autor
- **Copyright © 2026 Davemnt**
- Todos los derechos reservados
- Protegido por leyes de derechos de autor nacionales e internacionales

### Licencia
Este proyecto **NO es de código abierto**. Consulte el archivo [LICENSE](LICENSE) para los términos completos de uso.

### Registro
Para información sobre registro formal de propiedad intelectual, consulte:
📄 [PROPIEDAD_INTELECTUAL.md](PROPIEDAD_INTELECTUAL.md)

### Uso No Autorizado
❌ Copia, modificación, distribución o uso comercial no autorizados están prohibidos  
⚖️ Las violaciones serán perseguidas según la ley aplicable

---

**Desarrollado con  para una gestión eficiente de gastos corporativos**

*Última actualización: Marzo 4, 2026*
