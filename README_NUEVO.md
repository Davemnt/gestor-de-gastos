# 💼 Gestor de Gastos Corporativo

Un sistema profesional de control de gastos con **diseño negro, naranja y gris**, autenticación por PIN, medidores inteligentes de presupuesto e integración completa con Firebase.

## ✨ Características Principales

### 🎨 **Diseño Profesional Negro-Naranja-Gris**
- **Fondo oscuro** con gradientes elegantes
- **Acentos naranjas** para elementos importantes
- **Tonos grises** para contraste y legibilidad
- **Efectos visuales** con sombras y animaciones

### 🔐 **Seguridad Avanzada**
- Sistema de PIN dual (Usuario/Administrador)
- **PIN visible/oculto** con botón toggle 👁️/🙈
- Autenticación segura con Firebase
- Sesiones protegidas con pantalla completa opaca

### 📊 **Medidores Inteligentes**
- **Medidor de Presupuesto General**
  - Estado: 🟢 BUENO (0-60%) / 🟡 REGULAR (60-85%) / 🔴 ALERTA (85%+)
  - Barras de progreso con colores dinámicos
  - Cálculos automáticos en tiempo real

- **Medidor de Viáticos**
  - Seguimiento independiente de gastos de viaje
  - Estados visuales automáticos
  - Control específico de presupuesto de viáticos

### 💼 **Gestión Profesional**
- **Panel de Usuario**: Crear y visualizar gastos
- **Panel de Administrador**: Control total del sistema
  - Configurar presupuestos (general y viáticos)
  - Cambiar PINs de seguridad
  - Aprobar/rechazar gastos
  - Gestión completa de usuarios

## 🚀 Instalación Rápida

### 1. **Configurar Firebase**
```javascript
// Edita firebase-config.js con tus credenciales
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com", 
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 2. **Configurar Base de Datos**
En Firebase Console:
- Crea una base de datos Firestore
- Configura las reglas de seguridad
- Habilita Storage (opcional, para adjuntos)

### 3. **Abrir la Aplicación**
- Abrir `index.html` en tu navegador
- El sistema creará automáticamente la configuración inicial

## 🔑 Acceso al Sistema

### **Credenciales Iniciales**
- **PIN Usuario**: `123456`
- **PIN Admin**: `admin1`

> ⚠️ **Importante**: Cambia estos PINs inmediatamente después del primer acceso desde el Panel de Administrador.

## 🎨 Esquema de Colores

### **Colores Principales**
- **Negro Principal**: `#0f172a` (Fondo oscuro)
- **Naranja Primario**: `#f97316` (Botones y acentos)
- **Naranja Secundario**: `#ea580c` (Hover effects)
- **Gris Claro**: `#6b7280` (Textos secundarios)
- **Gris Oscuro**: `#374151` (Bordes y elementos)

### **Estados de Color**
- **🟢 Bueno**: Verde (`#10b981`)
- **🟡 Regular**: Amarillo (`#f59e0b`)
- **🔴 Alerta**: Rojo (`#ef4444`)

## 📱 Uso del Sistema

### **Como Usuario:**
1. **Ingresa tu PIN** usando el campo con toggle de visibilidad
2. Visualiza el **dashboard oscuro** con medidores de presupuesto
3. Crea nuevos gastos con el botón **naranja** "➕ Nuevo Gasto"
4. Sube adjuntos (imágenes/PDFs) con drag & drop
5. Monitorea el estado de tus gastos en **tiempo real**

### **Como Administrador:**
1. **Ingresa tu PIN de admin** con visibilidad controlada
2. Accede al **"⚙️ Panel Admin"** (botón rojo)
3. Configura presupuestos en **interfaz oscura**
4. Cambia PINs de seguridad de forma segura
5. Revisa y gestiona todos los gastos del sistema
6. Monitorea el uso global con **medidores visuales**

## 📊 Estados de Medidores

### **🟢 BUENO (0-60%)**
- **Color**: Verde con fondo oscuro
- **Situación**: Presupuesto bajo control
- **Visual**: Barra verde con badge "BUENO"

### **🟡 REGULAR (60-85%)**
- **Color**: Amarillo/naranja con fondo oscuro
- **Situación**: Uso moderado del presupuesto  
- **Visual**: Barra amarilla con badge "REGULAR"

### **🔴 ALERTA (85%+)**
- **Color**: Rojo con fondo oscuro
- **Situación**: Presupuesto casi agotado
- **Visual**: Barra roja con badge "ALERTA"

## 🛠️ Estructura de Archivos Reorganizada

```
gestor-gastos/
├── index.html              # Interfaz con tema negro-naranja-gris
├── app.js                  # Lógica mejorada con medidores
├── firebase-config.js      # Configuración de Firebase
├── README.md              # Documentación actualizada
├── INICIO-RAPIDO.md       # Guía de instalación
└── CHECKLIST.md           # Lista de verificación
```

## 🎯 Nuevas Mejoras Implementadas

### **✨ Diseño Visual**
- ✅ **Tema oscuro completo** con negro, naranja y gris
- ✅ **PIN con visibilidad toggle** (👁️/🙈)
- ✅ **Pantalla de PIN opaca** - no se ve nada detrás
- ✅ **Efectos hover** y animaciones profesionales
- ✅ **Gradientes elegantes** en botones y fondos

### **📊 Medidores Inteligentes**
- ✅ **Dos medidores principales** en dashboard
- ✅ **Estados automáticos** (Bueno/Regular/Alerta)
- ✅ **Barras de progreso animadas** que cambian color
- ✅ **Cálculos en tiempo real** de disponible vs gastado

### **🔧 Mejoras Técnicas**
- ✅ **CSS reorganizado** con variables y componentes
- ✅ **JavaScript modularizado** con funciones específicas
- ✅ **HTML estructurado** por secciones lógicas
- ✅ **Responsive design** mejorado para móviles

## 🆘 Solución de Problemas

### **❌ Error de Conexión Firebase**
Si aparece "Error de conexión. Intenta más tarde":

1. **Verifica firebase-config.js**:
   ```javascript
   // Asegúrate de que NO tenga valores placeholder
   apiKey: "TU_REAL_API_KEY",  // ❌ Incorrecto
   apiKey: "AIzaSyAbc123...",   // ✅ Correcto
   ```

2. **Revisa Firebase Console**:
   - ✅ Proyecto creado y activo
   - ✅ Firestore Database habilitado  
   - ✅ Reglas de seguridad configuradas

3. **Prueba en consola**:
   ```javascript
   // Abre F12 y ejecuta:
   console.log(firebaseConfig);
   ```

### **🔒 PIN No Funciona**
- ✅ Espera 3-5 segundos después de abrir la página
- ✅ Verifica la consola (F12) para errores de Firebase
- ✅ Intenta con PINs por defecto: `123456` (usuario) o `admin1` (admin)

### **📊 Medidores No se Actualizan**
- ✅ Configura presupuestos desde Panel Admin (deben ser > 0)
- ✅ Agrega al menos un gasto para ver cambios
- ✅ Verifica que Firebase esté conectado correctamente

## 🎨 Personalización de Colores

Para cambiar el esquema de colores, edita las variables CSS en `index.html`:

```css
:root {
  --primary-orange: #f97316;    /* Naranja principal */
  --secondary-orange: #ea580c;  /* Naranja secundario */  
  --bg-gray: #111827;          /* Fondo oscuro */
  --surface-gray: #1f2937;     /* Superficie de tarjetas */
}
```

---

## 🏆 Características Técnicas

- **Frontend**: HTML5, CSS3 (Variables + Flexbox + Grid)
- **JavaScript**: ES6+ con async/await
- **Backend**: Firebase Firestore v9
- **Storage**: Firebase Storage
- **Diseño**: Tailwind CSS + CSS personalizado
- **Tema**: Oscuro profesional (Negro + Naranja + Gris)
- **Compatibilidad**: Chrome, Firefox, Safari, Edge
- **Responsive**: Móvil, tablet y escritorio

---

**🚀 ¡Tu sistema de control de gastos con diseño profesional está listo! 💼**

**Colores: Negro + Naranja + Gris | Medidores inteligentes | PIN con toggle | Pantalla opaca**