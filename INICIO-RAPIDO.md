# 🚀 GUÍA RÁPIDA DE INICIO

## ✅ Archivos Creados

1. **index.html** - Interfaz de usuario completa
2. **app.js** - Lógica de la aplicación con Firebase
3. **firebase-config.js** - Configuración de Firebase (¡DEBES EDITARLO!)
4. **README.md** - Documentación completa
5. **.gitignore** - Protección de archivos sensibles

## 🎯 Pasos para Empezar (5 minutos)

### 1. Configurar Firebase

1. Ve a https://console.firebase.google.com/
2. Crea un nuevo proyecto
3. Habilita **Firestore Database** en modo de prueba
4. Obtén las credenciales del proyecto (icono web `</>`)
5. Edita `firebase-config.js` con tus credenciales

### 2. Abrir la Aplicación

**Opción A - Simple** (puede tener limitaciones):
- Doble clic en `index.html`

**Opción B - Recomendado** (con servidor local):
```powershell
# Con Python:
python -m http.server 8000

# O con Node.js:
npx serve
```
Luego abre: http://localhost:8000

### 3. Primer Login

1. **PIN de Admin por defecto**: `admin1`
2. **PIN de Usuario por defecto**: `123456`

⚠️ **¡CAMBIAR INMEDIATAMENTE!**
- Haz clic en "⚙️ Panel Admin"
- Ve a "Gestión de PINs"
- Cambia ambos PINs

### 4. Configurar Presupuestos

En el Panel Admin:
- **Presupuesto Total**: Ej: 500000
- **Presupuesto de Viáticos**: Ej: 100000

### 5. ¡Listo para Usar! 🎉

---

## 🔥 Funcionalidades Principales

### Como USUARIO:
✅ Registrar gastos
✅ Adjuntar comprobantes
✅ Ver gastos y presupuesto
✅ Editar/Eliminar gastos

### Como ADMINISTRADOR:
✅ Todo lo anterior, PLUS:
✅ Editar presupuesto total
✅ Editar presupuesto de viáticos
✅ **APROBAR GASTOS** (marca fecha automática)
✅ Modificar PINs

---

## 💡 Características Especiales

### Gastos Aprobados
Cuando el admin aprueba un gasto:
- ✅ Badge verde "APROBADO"
- 📅 Fecha de registro automática
- 🎨 Fondo verde en la tarjeta
- Todos los usuarios pueden verlo

### Diferenciación Visual
- **Pendientes**: Fondo blanco, sin badge
- **Aprobados**: Fondo verde, badge "✓ APROBADO"
- **Con Comprobante**: Botón verde brillante con animación
- **Sin Comprobante**: Botón gris

---

## 🆘 Problemas Comunes

### "Firebase is not defined"
→ Edita `firebase-config.js` con tus credenciales

### "Permission denied"
→ Habilita Firestore en modo de prueba

### Los gastos no aparecen
→ Verifica la consola del navegador (F12)

### No puedo aprobar gastos
→ Solo el admin puede aprobar. Verifica tu PIN

---

## 📖 Documentación Completa

Lee `README.md` para:
- Configuración detallada de Firebase
- Estructura de datos en Firestore
- Reglas de seguridad para producción
- Solución de problemas avanzados

---

## 🎓 Próximos Pasos

1. **Cambiar PINs** por defecto
2. **Configurar presupuestos**
3. **Probar registro de gastos**
4. **Aprobar gastos como admin**
5. **Explorar filtros y búsquedas**

---

## 📞 Soporte

Si tienes problemas:
1. Lee el README.md completo
2. Revisa la consola del navegador (F12)
3. Verifica tu configuración de Firebase
4. Comprueba las reglas de Firestore

---

**¡Disfruta tu nuevo sistema de gestión de gastos! 💼✨**
