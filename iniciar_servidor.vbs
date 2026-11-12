' iniciar_servidor.vbs
' Lanza el backend de Python sin mostrar ventana de consola.
' Este archivo es llamado automaticamente por Windows al iniciar sesion.

Dim carpeta
carpeta = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

Dim cmd
cmd = "cmd /c cd /d """ & carpeta & "\backend"" && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

CreateObject("WScript.Shell").Run cmd, 0, False
