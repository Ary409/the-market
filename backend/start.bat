@echo off
call venv\Scripts\activate.bat
echo Iniciando servidor en http://localhost:8000
echo Documentacion: http://localhost:8000/docs
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
