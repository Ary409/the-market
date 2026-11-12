const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path   = require("path");
const fs     = require("fs");
const http   = require("http");
const { spawn } = require("child_process");

let backendProcess = null;
let mainWindow     = null;

// ── Rutas de configuración ────────────────────────────────────────────────────

function getConfigPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function readConfig() {
  const p = getConfigPath();
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function writeConfig(cfg) {
  const p = getConfigPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), "utf8");
}

// ── Encontrar la carpeta del backend ──────────────────────────────────────────

function getBackendDir() {
  if (!app.isPackaged) {
    // Modo desarrollo: electron-app/ está dentro de Market System/
    return path.join(__dirname, "..", "backend");
  }

  // 1. Leer config guardada por esta app (userData — siempre accesible)
  const cfg = readConfig();
  if (cfg && cfg.backendDir && fs.existsSync(cfg.backendDir)) {
    return cfg.backendDir;
  }

  // 2. Leer config escrita por instalar.bat (AppData\Roaming\TheMarket)
  const legacyPath = path.join(process.env.APPDATA || "", "TheMarket", "config.json");
  if (fs.existsSync(legacyPath)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
      if (legacy.backendDir && fs.existsSync(legacy.backendDir)) {
        // Migrar al nuevo ubicación
        writeConfig({ backendDir: legacy.backendDir });
        return legacy.backendDir;
      }
    } catch {}
  }

  return null; // No encontrado — el usuario deberá ubicar la carpeta
}

// ── Pedir al usuario que ubique la carpeta del sistema ───────────────────────

async function askUserForBackendDir() {
  const result = await dialog.showMessageBox({
    type:    "info",
    title:   "The Market — Configuración inicial",
    message: "Bienvenido a The Market",
    detail:  "Para comenzar, selecciona la carpeta donde está instalado el sistema (la carpeta que contiene las carpetas 'backend', 'frontend', etc.).",
    buttons: ["Seleccionar carpeta…", "Salir"],
    defaultId: 0,
    cancelId:  1,
  });

  if (result.response === 1) { app.quit(); return null; }

  const folder = await dialog.showOpenDialog({
    title:      "Selecciona la carpeta de The Market",
    properties: ["openDirectory"],
  });

  if (folder.canceled || !folder.filePaths.length) {
    app.quit();
    return null;
  }

  const selectedDir = folder.filePaths[0];
  const backendDir  = path.join(selectedDir, "backend");
  const pythonExe   = path.join(backendDir, "venv", "Scripts", "python.exe");

  if (!fs.existsSync(pythonExe)) {
    await dialog.showMessageBox({
      type:    "error",
      title:   "Carpeta incorrecta",
      message: "No encontré el servidor en esa carpeta.",
      detail:  `Asegúrate de seleccionar la carpeta correcta de The Market y de haber ejecutado instalar.bat antes de abrir el sistema.\n\nEsperado: ${backendDir}\\venv\\Scripts\\python.exe`,
      buttons: ["Intentar de nuevo"],
    });
    return askUserForBackendDir(); // Reintentar
  }

  writeConfig({ backendDir });
  return backendDir;
}

// ── Verificar si el backend ya está corriendo ─────────────────────────────────

function checkBackend() {
  return new Promise(resolve => {
    const req = http.get("http://localhost:8000/", { timeout: 1500 }, res => {
      resolve(res.statusCode < 500);
    });
    req.on("error",   () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

// ── Esperar hasta que el backend responda (máx N segundos) ────────────────────

async function waitForBackend(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await checkBackend()) return true;
    await new Promise(r => setTimeout(r, 600));
  }
  return false;
}

// ── Iniciar el proceso Python ─────────────────────────────────────────────────

async function startBackend() {
  if (await checkBackend()) return; // Ya está corriendo

  let backendDir = getBackendDir();

  // Si no se encontró la carpeta, pedir al usuario que la ubique
  if (!backendDir) {
    backendDir = await askUserForBackendDir();
    if (!backendDir) return; // El usuario canceló → app.quit() ya fue llamado
  }

  const pythonExe = path.join(backendDir, "venv", "Scripts", "python.exe");

  if (!fs.existsSync(pythonExe)) {
    dialog.showErrorBox(
      "The Market — Servidor no encontrado",
      `No se pudo encontrar Python en:\n${pythonExe}\n\n` +
      `Ejecuta instalar.bat como Administrador desde la carpeta del sistema y vuelve a abrir.`
    );
    app.quit();
    return;
  }

  backendProcess = spawn(
    pythonExe,
    ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
    {
      cwd:         backendDir,
      windowsHide: true,   // Sin ventana negra de consola
      detached:    false,
      stdio:       "ignore",
    }
  );

  backendProcess.on("error", err => console.error("Error al iniciar backend:", err));
}

// ── Crear ventana principal ───────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1366,
    height:   768,
    minWidth: 1024,
    minHeight: 640,
    title: "The Market",
    show: false, // Se muestra solo cuando el backend esté listo
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Permite que file:// llame a http://localhost
    },
  });

  Menu.setApplicationMenu(null);

  const frontendPath = app.isPackaged
    ? path.join(process.resourcesPath, "frontend", "index.html")
    : path.join(__dirname, "..", "frontend", "index.html");

  mainWindow.loadFile(frontendPath);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });
}

// ── Flujo principal al arrancar ───────────────────────────────────────────────

app.whenReady().then(async () => {
  // 1. Iniciar backend PRIMERO (puede mostrar diálogos de configuración)
  await startBackend();

  // Si app.quit() fue llamado durante startBackend (usuario canceló), salir
  if (!app.isReady()) return;

  // 2. Crear ventana y esperar a que cargue
  createWindow();
  await new Promise(resolve => {
    if (mainWindow.webContents.isLoading()) {
      mainWindow.once("ready-to-show", resolve);
    } else {
      resolve();
    }
  });

  // 3. Esperar que el backend responda (máx 25 segundos)
  const backendListo = await waitForBackend(25000);
  if (!backendListo) {
    console.warn("El backend no respondió a tiempo.");
  }

  mainWindow.show();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      mainWindow.once("ready-to-show", () => mainWindow.show());
    }
  });
});

// ── Al cerrar la app, matar el backend ───────────────────────────────────────

app.on("will-quit", () => {
  if (backendProcess) {
    backendProcess.kill("SIGTERM");
    backendProcess = null;
  }
});

app.on("window-all-closed", () => {
  if (backendProcess) {
    backendProcess.kill("SIGTERM");
    backendProcess = null;
  }
  if (process.platform !== "darwin") app.quit();
});
