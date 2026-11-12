@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

:: ============================================================
::  The Market — Instalador del sistema
::  Ejecutar como Administrador
:: ============================================================

set "DIR=%~dp0"
set "DIR=%DIR:~0,-1%"
set "BACKEND=%DIR%\backend"
set "VENV=%BACKEND%\venv"
set "PYTHON=%VENV%\Scripts\python.exe"
set "PIP=%VENV%\Scripts\pip.exe"

color 0A
echo.
echo  =====================================================
echo    THE MARKET — Instalacion del sistema v1.0
echo  =====================================================
echo.
echo  Directorio de instalacion:
echo  %DIR%
echo.
pause

:: ── 1. Verificar Python ──────────────────────────────────────
echo [1/6] Verificando Python...
python --version > nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Python no esta instalado.
    echo  Descarga Python 3.11 o superior desde:
    echo  https://www.python.org/downloads/
    echo  Asegurate de marcar "Add Python to PATH" al instalar.
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo  OK — Python %PYVER% detectado.

:: ── 2. Crear entorno virtual ─────────────────────────────────
echo.
echo [2/6] Preparando entorno virtual...
if not exist "%VENV%" (
    python -m venv "%VENV%"
    if errorlevel 1 (
        echo  ERROR: No se pudo crear el entorno virtual.
        pause & exit /b 1
    )
    echo  OK — Entorno virtual creado.
) else (
    echo  OK — Entorno virtual ya existe.
)

:: ── 3. Instalar dependencias ─────────────────────────────────
echo.
echo [3/6] Instalando dependencias de Python...
"%PIP%" install -r "%BACKEND%\requirements.txt" --quiet --upgrade
if errorlevel 1 (
    echo  ERROR: Fallo la instalacion de dependencias.
    pause & exit /b 1
)
echo  OK — Dependencias instaladas.

:: ── 4. Inicializar base de datos ─────────────────────────────
echo.
echo [4/6] Inicializando base de datos...
cd /d "%BACKEND%"
"%PYTHON%" seed.py
if errorlevel 1 (
    echo  ERROR: Fallo la inicializacion de la base de datos.
    pause & exit /b 1
)
cd /d "%DIR%"
echo  OK — Base de datos lista.

:: ── 5. Configurar inicio automatico del servidor ─────────────
echo.
echo [5/6] Configurando inicio automatico del servidor...

set "TASK_SERVER=TheMarket_Servidor"
set "VBS_PATH=%DIR%\iniciar_servidor.vbs"

schtasks /query /tn "%TASK_SERVER%" > nul 2>&1
if not errorlevel 1 (
    schtasks /delete /tn "%TASK_SERVER%" /f > nul 2>&1
)

schtasks /create /tn "%TASK_SERVER%" /tr "wscript.exe \"%VBS_PATH%\"" /sc ONLOGON /ru "%USERNAME%" /rl HIGHEST /f > nul 2>&1
if errorlevel 1 (
    echo  AVISO: No se pudo registrar el inicio automatico.
    echo  El servidor debera iniciarse manualmente con iniciar_servidor.vbs
) else (
    echo  OK — Servidor configurado para iniciar con Windows.
)

:: ── 6. Configurar backup diario ───────────────────────────────
echo.
echo [6/6] Configurando backup automatico diario...

set "TASK_BACKUP=TheMarket_Backup"

schtasks /query /tn "%TASK_BACKUP%" > nul 2>&1
if not errorlevel 1 (
    schtasks /delete /tn "%TASK_BACKUP%" /f > nul 2>&1
)

schtasks /create /tn "%TASK_BACKUP%" /tr "\"%PYTHON%\" \"%DIR%\backup.py\"" /sc DAILY /st 02:00 /ru "%USERNAME%" /f > nul 2>&1
if errorlevel 1 (
    echo  AVISO: No se pudo registrar el backup automatico.
) else (
    echo  OK — Backup configurado para ejecutarse todos los dias a las 2:00 AM.
)

:: ── Guardar configuración para el ejecutable Electron ─────────
echo.
echo  Guardando configuracion de rutas...
if not exist "%APPDATA%\TheMarket" mkdir "%APPDATA%\TheMarket"
(echo {"backendDir": "%BACKEND:\=\\%"}) > "%APPDATA%\TheMarket\config.json"
if errorlevel 1 (
    echo  ERROR: No se pudo guardar la configuracion.
    pause & exit /b 1
)
echo  OK — Configuracion guardada en %APPDATA%\TheMarket\config.json

:: Verificar que el archivo fue creado correctamente
if not exist "%APPDATA%\TheMarket\config.json" (
    echo  ERROR: El archivo config.json no fue creado.
    echo  Intenta ejecutar este instalador como Administrador.
    pause & exit /b 1
)

:: ── Iniciar servidor ahora ────────────────────────────────────
echo.
echo  Iniciando el servidor por primera vez...
wscript.exe "%VBS_PATH%"
timeout /t 3 > nul

:: ── Resumen final ─────────────────────────────────────────────
echo.
echo  =====================================================
echo    INSTALACION COMPLETADA EXITOSAMENTE
echo  =====================================================
echo.
echo  Datos del administrador inicial:
echo    Email:      admin@themarket.com
echo    Contrasena: admin1234
echo.
echo  IMPORTANTE: Cambia la contrasena desde el modulo
echo  de Usuarios al abrir el sistema por primera vez.
echo.
echo  El servidor arrancara automaticamente cada vez
echo  que enciendas la computadora.
echo.
echo  Backup diario: carpeta backups\ dentro del sistema.
echo.
echo  Para abrir el sistema:
echo    - Usa el acceso directo en el escritorio, o
echo    - Abre electron-app\ y ejecuta: npm start
echo.
pause
