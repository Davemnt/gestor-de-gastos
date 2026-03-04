# Script para generar evidencia de autoría
# Copyright (c) 2026 Davemnt

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   GENERADOR DE EVIDENCIA DE AUTORIA" -ForegroundColor Cyan
Write-Host "   Gestor de Gastos Corporativo" -ForegroundColor Cyan
Write-Host "   Copyright © 2026 Davemnt" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$fecha = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$archivoReporte = "EVIDENCIA_AUTORIA_$fecha.txt"

Write-Host "Generando reporte de evidencia..." -ForegroundColor Yellow

# Crear archivo de reporte
@"
========================================
EVIDENCIA DE AUTORIA DE SOFTWARE
========================================

Proyecto: Gestor de Gastos Corporativo
Autor: Davemnt
GitHub: https://github.com/Davemnt/gestor-de-gastos
Fecha de Generación: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

COPYRIGHT © 2026 DAVEMNT - TODOS LOS DERECHOS RESERVADOS

========================================
INFORMACIÓN DEL REPOSITORIO
========================================

"@ | Out-File -FilePath $archivoReporte -Encoding UTF8

# Información del repositorio Git
Write-Host "  ✓ Recopilando información del repositorio..." -ForegroundColor Green

git remote -v | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"`n========================================" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"HISTORIAL DE COMMITS (PRIMEROS 50)" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"========================================`n" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

git log --all --pretty=format:"%h | %ad | %s | Autor: %an <%ae>" --date=format:"%Y-%m-%d %H:%M:%S" -n 50 | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

"`n========================================" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"ESTADÍSTICAS DEL PROYECTO" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"========================================`n" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

Write-Host "  ✓ Calculando estadísticas..." -ForegroundColor Green

# Contar commits
$totalCommits = (git rev-list --all --count)
"Total de commits: $totalCommits" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

# Primer commit
$primerCommit = git log --all --reverse --pretty=format:"%ad | %s" --date=format:"%Y-%m-%d %H:%M:%S" | Select-Object -First 1
"Primer commit: $primerCommit" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

# Último commit
$ultimoCommit = git log --pretty=format:"%ad | %s" --date=format:"%Y-%m-%d %H:%M:%S" -n 1
"Último commit: $ultimoCommit" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

# Contribuidores
"`nContribuidores:" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
git shortlog -sn --all | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

"`n========================================" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"ARCHIVOS DEL PROYECTO" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"========================================`n" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

Write-Host "  ✓ Listando archivos..." -ForegroundColor Green

# Listar archivos principales
Get-ChildItem -Recurse -File -Exclude *.git*,node_modules | 
    Where-Object { $_.Directory.Name -notmatch "node_modules|\.git" } |
    Select-Object FullName, Length, LastWriteTime | 
    Format-Table -AutoSize | 
    Out-File -FilePath $archivoReporte -Append -Encoding UTF8 -Width 200

"`n========================================" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"HASH DEL PROYECTO (SHA256)" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"========================================`n" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

Write-Host "  ✓ Calculando hashes SHA256..." -ForegroundColor Green

# Hash de archivos principales
$archivosPrincipales = @(
    "public\app.js",
    "public\index.html",
    "public\firebase-config.js",
    "LICENSE",
    "README.md"
)

foreach ($archivo in $archivosPrincipales) {
    if (Test-Path $archivo) {
        $hash = Get-FileHash -Path $archivo -Algorithm SHA256
        "$archivo : $($hash.Hash)" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
    }
}

"`n========================================" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"CONTENIDO DEL ARCHIVO LICENSE" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"========================================`n" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

if (Test-Path "LICENSE") {
    Get-Content "LICENSE" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
}

"`n========================================" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"INFORMACIÓN DEL SISTEMA" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"========================================`n" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

"Usuario del sistema: $env:USERNAME" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"Computadora: $env:COMPUTERNAME" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"Fecha/Hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"Git Usuario: $(git config user.name)" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"Git Email: $(git config user.email)" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

"`n========================================" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"FIRMA DIGITAL" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"========================================`n" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

"Este documento certifica la autoría y creación del" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"'Gestor de Gastos Corporativo' por Davemnt." | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"Documento generado automáticamente como evidencia de propiedad intelectual." | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"Para registro ante DNDA o uso legal." | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8
"Hash de este documento:" | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

# Calcular hash del reporte mismo
Start-Sleep -Milliseconds 500  # Esperar a que se escriba el archivo
$hashReporte = Get-FileHash -Path $archivoReporte -Algorithm SHA256
$hashReporte.Hash | Out-File -FilePath $archivoReporte -Append -Encoding UTF8

Write-Host "`n✓ Reporte generado exitosamente!" -ForegroundColor Green
Write-Host "  Archivo: $archivoReporte" -ForegroundColor Cyan
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "RECOMENDACIONES:" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "1. Envía este archivo por email a ti mismo" -ForegroundColor White
Write-Host "   (el email con fecha sirve como evidencia)" -ForegroundColor Gray
Write-Host "2. Guárdalo en múltiples ubicaciones seguras" -ForegroundColor White
Write-Host "3. Considera timestamp blockchain gratuito:" -ForegroundColor White
Write-Host "   https://opentimestamps.org/" -ForegroundColor Cyan
Write-Host "4. Úsalo como anexo para registro en DNDA" -ForegroundColor White
Write-Host "================================================`n" -ForegroundColor Cyan

# Abrir el archivo generado
Start-Process notepad.exe $archivoReporte
