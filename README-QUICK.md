# 💼 Gestor de Gastos Corporativo v2.0

Sistema profesional de gestión financiera con Firebase, diseño responsive y control en tiempo real.

## 🚀 Demo en Vivo

### 🛠️ Producción
**URL**: https://gestor-de-gastos-e46ff.web.app  
**Características**: Sistema completo con recuperación por email

### 🎭 Demo Pública  
**URL**: https://gestor-de-gastos-demo.web.app  
**Credenciales**: `demo123` (usuario) / `admin456` (admin)  
**Nota**: PINs bloqueados para protección

---

## ✨ Características Principales

### 💰 Gestión Inteligente de Gastos
- ✅ Separación automática: Pendientes vs Reportados
- 📅 Agrupación temporal: Mes, Trimestre, Año
- 📊 Dos presupuestos independientes (General + Viáticos)
- 🔄 Sincronización en tiempo real
- 📦 Vista en grilla responsive (1-3 columnas)
- 📁 Acordeones colapsables para mejor organización

### 🔐 Seguridad Multi-Capa
- 🔑 Autenticación por PIN (mínimo 4 caracteres)
- 📧 Recuperación de cuenta mediante email verificado
- 🛡️ Demo protegida con credenciales bloqueadas
- 🔒 Proyectos Firebase independientes
- ⚡ Security Rules en Firestore

### 📱 100% Responsive
- **Móvil**: Menú hamburguesa, grid 1 columna, táctil optimizado
- **Tablet**: Grid 2 columnas, navegación híbrida
- **Desktop**: Grid 3 columnas, máximo aprovechamiento

### 🎨 Diseño Profesional
- Tema gris claro (#f3f4f6) con acentos celeste-azul
- Animaciones suaves y transiciones
- Estados visuales: 🟢 BUENO / 🟡 REGULAR / 🔴 ALERTA
- Tarjetas compactas con información clave

---

## 🛠️ Stack Tecnológico

```
Frontend          Backend (Firebase)        Tools
├─ HTML5          ├─ Firestore Database    ├─ Git/GitHub
├─ Tailwind CSS   ├─ Firebase Hosting      ├─ Firebase CLI
└─ JavaScript ES6+ └─ Security Rules        └─ VS Code
```

---

## 📦 Instalación Rápida

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/gestor-gastos.git
cd gestor-gastos

# 2. Configurar Firebase
# Edita firebase-config.js con tus credenciales

# 3. Instalar Firebase CLI
npm install -g firebase-tools

# 4. Login y deploy
firebase login
firebase deploy
```

---

## 🎯 Uso Básico

### Como Usuario
1. Ingresa tu PIN → ✅ Acceso concedido
2. Click "➕ Nuevo Gasto"
3. Completa: Fecha, Categoría, Descripción, Monto
4. Marca si adjuntaste comprobante
5. Guarda → 💾 Gasto registrado

### Como Administrador
1. Accede con PIN de admin
2. **Panel Admin** → Configura email de recuperación
3. Actualiza presupuestos en pesos argentinos
4. Marca gastos como "Registrados" ✅
5. Elimina gastos si es necesario 🗑️

---

## 🔑 Credenciales

### Producción (Cambiar inmediatamente)
- Usuario: `123456`
- Admin: `admin1`

### Demo (Bloqueadas)
- Usuario: `demo123`
- Admin: `admin456`

---

## 📊 Estructura de Datos

### Configuración
```javascript
{
  pinUsuario: "123456",
  pinAdmin: "admin1",
  emailRecuperacion: "admin@example.com",
  presupuestoTotal: 900000,
  presupuestoViaticos: 300000
}
```

### Gastos
```javascript
{
  descripcion: "Combustible",
  monto: 15000,
  fecha: "2025-12-01",
  categoria: "viaticos",
  comprobanteAdjunto: true,
  registrado: false,
  creadoPor: "Usuario"
}
```

---

## 🔄 Changelog v2.0.0 (Dic 2025)

### 🎉 Nuevas Funcionalidades
- ✨ Tema profesional gris claro
- 📊 Separación Pendientes/Reportados
- 📅 Agrupación temporal (Mes/Trimestre/Año)
- 📧 Recuperación por email verificado
- 📱 Responsividad completa
- 🔒 Demo protegida independiente
- 🍔 Menú hamburguesa móvil
- 📦 Grid adaptativo 1-3 columnas
- 📁 Acordeones colapsables

---

## 🐛 Solución de Problemas

### Firebase no inicializado
```javascript
// Verifica firebase-config.js
const firebaseConfig = {
  apiKey: "tu-api-key",
  projectId: "tu-project-id",
  // ...
};
```

### Gastos no se guardan
1. ✅ Firestore habilitado
2. ✅ Reglas de seguridad aplicadas
3. ✅ Conexión a internet activa

### Botón "Verificando..." no responde
- Recarga la página (F5)
- Limpia caché (Ctrl + Shift + R)

---

## 📚 Documentación

- **README.md**: Documentación completa técnica
- **PORTFOLIO.md**: Presentación para portfolio
- **COTIZACION.md**: Desglose de costos del proyecto
- **SEGURIDAD.md**: Guía de seguridad
- **README-DEMO.md**: Documentación de la demo

---

## 💰 Costos de Infraestructura

### Firebase Spark (Gratis)
- ✅ 1 GB almacenamiento
- ✅ 10 GB transferencia/mes
- ✅ 50K lecturas/día
- 👥 Ideal para 10-20 usuarios

### Firebase Blaze (Pay-as-you-go)
- 💰 ~$5-20 USD/mes
- 📈 Sin límites
- 👥 Ideal para 50+ usuarios

---

## 🤝 Contribuir

Las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea tu branch (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -m 'Agregar nueva característica'`)
4. Push al branch (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

---

## 📄 Licencia

Proyecto bajo licencia MIT. Ver `LICENSE` para más detalles.

---

## 👨‍💻 Autor

**[Tu Nombre]**
- Portfolio: [tu-portfolio.com]
- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- LinkedIn: [Tu Perfil](https://linkedin.com/in/tu-perfil)
- Email: tu-email@ejemplo.com

---

## 🙏 Agradecimientos

- Firebase por el excelente BaaS
- Tailwind CSS por el framework de utilidades
- La comunidad open source

---

## 📞 Soporte

¿Necesitas ayuda?
- 📧 Email: soporte@ejemplo.com
- 💬 Issues: [GitHub Issues](https://github.com/tu-usuario/gestor-gastos/issues)
- 📖 Documentación: Ver archivos .md en el proyecto

---

## 🎯 Roadmap Futuro

### v2.1 (Planificado)
- [ ] Exportación a Excel/PDF
- [ ] Notificaciones por email
- [ ] Dashboard de analytics
- [ ] Firma digital de comprobantes

### v3.0 (En consideración)
- [ ] App móvil nativa
- [ ] Integración con APIs de contabilidad
- [ ] Sistema de roles avanzado
- [ ] Módulo de reportes personalizados

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub**

*Última actualización: Diciembre 1, 2025*
