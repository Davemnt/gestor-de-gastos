# 🚀 Ejecutar el Proyecto Localmente

## Opción 1: Usando npm (Recomendado)

```bash
npm start
```

Esto abrirá automáticamente tu navegador en http://localhost:8080

## Opción 2: Manualmente

```bash
npx http-server -p 8080 -c-1
```

Luego abre tu navegador en: http://localhost:8080

## Opción 3: Live Server en VS Code

1. Instala la extensión "Live Server" en VS Code
2. Haz clic derecho en `index.html`
3. Selecciona "Open with Live Server"

---

## 🔧 Solución de Problemas

Si el puerto 8080 está en uso, puedes:
- Cambiar el puerto en el comando: `npx http-server -p 9000 -c-1`
- O terminar el proceso que está usando el puerto 8080

## 📝 Notas

- El parámetro `-c-1` desactiva el caché para ver los cambios inmediatamente
- El parámetro `-o` abre automáticamente el navegador
