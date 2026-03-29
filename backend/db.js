const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

/* ======================================================
   DB PATH (Electron Safe)
   - Normal Node run: uses ./database.db
   - Electron packaged: uses stable userData path
   - You can override with DB_PATH in .env
====================================================== */

function getDatabasePath() {
  // 1) If user manually set DB_PATH in .env, use it
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  // 2) Try to detect Electron and use its userData folder
  // (This will work only if Electron is available in runtime)
  try {
    // eslint-disable-next-line global-require
    const electron = require("electron");

    // In main process: electron.app exists
    // In renderer: electron.remote may exist (older)
    const app = electron.app || (electron.remote && electron.remote.app);

    if (app) {
      const userData = app.getPath("userData");

      // make sure folder exists
      if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });

      return path.join(userData, "database.db");
    }
  } catch (err) {
    // Not running in Electron (normal backend run)
  }

  // 3) Default: local file
  return path.join(__dirname, "database.db");
}

const DB_FILE = getDatabasePath();

console.log("📦 SQLite DB Path:", DB_FILE);

const db = new sqlite3.Database(DB_FILE, err => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

db.serialize(() => {
  /* ======================================================
     PRODUCTS TABLE
     (ONE ROW = ONE SIZE VARIANT)
  ====================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area TEXT NOT NULL,
      rack TEXT NOT NULL,
      brand TEXT NOT NULL,
      cloth TEXT NOT NULL,
      size TEXT NOT NULL,
      stock INTEGER DEFAULT 0 CHECK(stock >= 0),
      image TEXT
    )
  `);

  /* ======================================================
     BARCODES TABLE
     (ONE ROW = ONE PHYSICAL CLOTH PIECE)
  ====================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS barcodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      rack TEXT NOT NULL,
      brand TEXT NOT NULL,
      cloth TEXT NOT NULL,
      size TEXT NOT NULL,

      status TEXT
        CHECK(status IN ('IN', 'OUT', 'SOLD'))
        DEFAULT 'IN',

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ======================================================
     INDEXES (VERY IMPORTANT FOR SCANNING SPEED)
  ====================================================== */
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_products_lookup
    ON products (rack, brand, cloth, size)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_barcodes_barcode
    ON barcodes (barcode)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_barcodes_product
    ON barcodes (rack, brand, cloth, size)
  `);
});

module.exports = db;
