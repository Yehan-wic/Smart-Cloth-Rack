const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let backendProcess;
let win;

// ✅ Prevent opening multiple times
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 850,
    show: false, // ✅ show only when ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // ✅ Show loading page instantly (so user sees app opened)
  win.loadURL(
    "data:text/html;charset=utf-8," +
      encodeURIComponent(`
        <html>
          <head>
            <title>Inventory App</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background: #f8f8f8;
              }
              .box {
                text-align: center;
                padding: 30px;
                border-radius: 12px;
                background: white;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              }
              h2 { margin: 0; }
              p { margin-top: 10px; color: gray; }
            </style>
          </head>
          <body>
            <div class="box">
              <h2>🚀 Inventory App is starting...</h2>
              <p>Please wait a moment...</p>
            </div>
          </body>
        </html>
      `)
  );

  win.once("ready-to-show", () => {
    win.show();
  });

  // Optional: open DevTools
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  console.log("🚀 Electron started");

  // ----------------------------
  // Start backend (FIXED)
  // ----------------------------

  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "server.js")
    : path.join(__dirname, "../backend/server.js");

  // ✅ IMPORTANT FIX:
  // In packaged mode we run backend using backend/node.exe
  // (NOT process.execPath)
  const nodeCommand = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "node.exe")
    : "node";

  console.log("📌 Backend Path:", backendPath);
  console.log("📌 Node Command:", nodeCommand);

  // ✅ Create window immediately (so click feels instant)
  createWindow();

  backendProcess = spawn(nodeCommand, [backendPath], {
    cwd: app.isPackaged
      ? path.join(process.resourcesPath, "backend")
      : path.join(__dirname, "../backend"),
    stdio: "inherit",
    windowsHide: true
  });

  backendProcess.on("error", (err) => {
    console.error("❌ Failed to start backend:", err);
  });

  backendProcess.on("exit", (code) => {
    console.log("🛑 Backend exited with code:", code);
  });

  // Wait for backend to start then load frontend
  const checkBackend = () => {
    const http = require("http");

    http
      .get("http://localhost:5000/api/health", () => {
        console.log("✅ Backend is ready (port 5000)");

        // ✅ Now load real dashboard
        if (win) {
          win.loadURL("http://localhost:5000");
        }
      })
      .on("error", () => {
        setTimeout(checkBackend, 300);
      });
  };

  checkBackend();
});

app.on("window-all-closed", () => {
  console.log("🛑 Electron closing...");

  // Tell backend to shutdown cleanly
  if (backendProcess) {
    try {
      backendProcess.kill("SIGTERM");
    } catch (err) {}
  }

  if (process.platform !== "darwin") app.quit();
});
