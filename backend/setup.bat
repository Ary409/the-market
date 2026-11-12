@echo off
echo ============================================
echo  Sistema de Inventario - Instalacion
echo ============================================

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no encontrado. Instala Python 3.11+ desde python.org
    pause
    exit /b 1
)

echo Creando entorno virtual...
python -m venv venv

echo Activando entorno virtual...
call venv\Scripts\activate.bat

echo Instalando dependencias...
pip install -r requirements.txt

echo Inicializando base de datos con datos de ejemplo...
python -m app.seed

echo.
echo ============================================
echo  Instalacion completada!
echo  Para iniciar el servidor ejecuta: start.bat
echo ============================================
pause
