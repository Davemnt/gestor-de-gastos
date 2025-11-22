# ✅ CHECKLIST DE VERIFICACIÓN

Usa este checklist para asegurarte de que todo está configurado correctamente.

## 📋 Antes de Empezar

- [ ] Tengo una cuenta de Google/Firebase
- [ ] He leído el archivo INICIO-RAPIDO.md
- [ ] Tengo un navegador web moderno

## 🔥 Configuración de Firebase

- [ ] Creé un proyecto en Firebase Console
- [ ] Habilité Firestore Database
- [ ] Copié las credenciales de configuración
- [ ] Edité el archivo `firebase-config.js` con mis credenciales
- [ ] Configuré las reglas de Firestore en modo de prueba

## 🖥️ Configuración Local

- [ ] Abrí el proyecto en mi editor de código
- [ ] Los archivos index.html, app.js y firebase-config.js están presentes
- [ ] Puedo abrir index.html en mi navegador (o uso un servidor local)

## 🔐 Primer Acceso

- [ ] Ingresé con el PIN de administrador: `admin1`
- [ ] Cambié el PIN de administrador desde el Panel Admin
- [ ] Cambié el PIN de usuario desde el Panel Admin
- [ ] Probé cerrar sesión e iniciar con los nuevos PINs

## 💰 Configuración de Presupuestos

- [ ] Desde el Panel Admin, configuré el Presupuesto Total
- [ ] Configuré el Presupuesto de Viáticos
- [ ] Los montos se muestran correctamente en la interfaz

## 📝 Pruebas Funcionales

### Como Usuario
- [ ] Registré un nuevo gasto
- [ ] Adjunté un comprobante (archivo)
- [ ] Edité un gasto existente
- [ ] Eliminé un gasto
- [ ] Probé los filtros (categoría, estado, comprobante)

### Como Administrador
- [ ] Aprobé un gasto (botón REGISTRADO)
- [ ] Verifiqué que aparece la fecha de registro
- [ ] Verifiqué que el badge "APROBADO" aparece en verde
- [ ] Verifiqué que el fondo de la tarjeta es verde
- [ ] Edité el presupuesto total desde el Panel Admin
- [ ] Edité el presupuesto de viáticos

## 🎨 Verificación Visual

- [ ] Los gastos pendientes tienen fondo blanco
- [ ] Los gastos aprobados tienen fondo verde
- [ ] El badge "✓ APROBADO" aparece en gastos registrados
- [ ] La fecha de registro aparece cuando está aprobado
- [ ] Los comprobantes adjuntos muestran botón verde brillante
- [ ] Las barras de progreso se actualizan correctamente

## 🔍 Verificación de Datos

- [ ] Abrí la consola del navegador (F12) y no hay errores
- [ ] Los datos persisten al recargar la página
- [ ] Puedo ver los datos en Firebase Console > Firestore
- [ ] La colección "configuracion" existe con el documento "sistema"
- [ ] La colección "gastos" muestra mis gastos registrados

## 🚀 Listo para Producción

- [ ] Cambié las reglas de Firestore para mayor seguridad (ver README)
- [ ] No subí firebase-config.js a repositorios públicos
- [ ] Documenté los PINs de forma segura
- [ ] Realicé una copia de seguridad de la configuración

## ❌ Si algo no funciona

1. **Revisa la consola del navegador (F12)**
   - ¿Hay errores en rojo?
   - ¿Firebase está correctamente inicializado?

2. **Verifica Firebase Console**
   - ¿Firestore está habilitado?
   - ¿Las reglas permiten lectura/escritura?
   - ¿Ves las colecciones creadas?

3. **Revisa firebase-config.js**
   - ¿Copiaste todas las credenciales?
   - ¿Los valores son strings entre comillas?
   - ¿No hay espacios o caracteres extraños?

4. **Lee los archivos de documentación**
   - INICIO-RAPIDO.md
   - README.md

---

## 📊 Estado de tu Proyecto

Marca con una X cuando completes cada sección:

- [ ] Configuración de Firebase
- [ ] Configuración Local
- [ ] Primer Acceso
- [ ] Configuración de Presupuestos
- [ ] Pruebas Funcionales
- [ ] Verificación Visual
- [ ] Verificación de Datos

---

**Cuando todas las casillas estén marcadas, ¡tu sistema está listo! 🎉**
