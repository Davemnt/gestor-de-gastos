# 🔥 Instrucciones para subir a Firebase Hosting

## Opción 1: Con Firebase CLI (Recomendado)

1. **Instalar Node.js**: https://nodejs.org/
2. **Instalar Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

3. **Inicializar proyecto**:
   ```bash
   firebase login
   firebase init hosting
   ```

4. **Configurar firebase.json**:
   ```json
   {
     "hosting": {
       "public": ".",
       "ignore": [
         "firebase.json",
         "**/.*",
         "**/node_modules/**"
       ],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

5. **Subir archivos**:
   ```bash
   firebase deploy
   ```

## Opción 2: Hosting Manual

1. **Ve a Firebase Console > Hosting**
2. **Clic en "Comenzar"**
3. **Sube estos archivos manualmente**:
   - index.html
   - app.js
   - firebase-config.js
   
4. **Tu app estará en**: https://gestor-de-gastos-e46ff.web.app

## Archivos necesarios:
✅ index.html (interfaz principal)
✅ app.js (lógica de la aplicación)  
✅ firebase-config.js (configuración - COMPLETAR PRIMERO)

## Antes de subir:
1. ✅ Completa firebase-config.js con tus credenciales
2. ✅ Prueba localmente (abre index.html)
3. ✅ Verifica que Firebase esté conectado
4. ✅ Sube los archivos a Hosting