require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { publishRackStock, shutdownMQTT } = require("./mqtt"); // ✅ MQTT ADDED + shutdown

const app = express();

/* ======================================================
   CONSTANTS
====================================================== */
const STANDARD_SIZES = ["XS", "S", "M", "L", "XL"];
const ALLOWED_AREAS = ["Men", "Women", "Kids"];

/* ======================================================
   MIDDLEWARE
====================================================== */
app.use(cors());
app.use(express.json());

/* ======================================================
   UPLOAD DIRECTORIES
====================================================== */
const uploadRoot = path.join(__dirname, "uploads");
const productUploadDir = path.join(uploadRoot, "products");

if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot);
if (!fs.existsSync(productUploadDir)) fs.mkdirSync(productUploadDir);

app.use("/uploads", express.static(uploadRoot));

/* ======================================================
   MULTER CONFIG
====================================================== */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, productUploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/* ======================================================
   HEALTH
====================================================== */
app.get("/api/health", (_, res) => {
  res.json({ status: "Backend running successfully" });
});

/* ======================================================
   📡 MQTT STOCK PUBLISH HELPER (FIXED VERSION)
====================================================== */
function publishRackStockSnapshot(rack) {
  db.all(
    `
    SELECT 
      p.brand,
      p.cloth,
      p.size,
      COUNT(b.barcode) AS stock
    FROM products p
    LEFT JOIN barcodes b
      ON p.rack = b.rack
     AND p.brand = b.brand
     AND p.cloth = b.cloth
     AND p.size = b.size
     AND b.status = 'IN'
    WHERE p.rack = ?
    GROUP BY p.brand, p.cloth, p.size
    `,
    [rack],
    (_, rows) => {
      if (!rows || !rows.length) return;

      const sizes = {
        XS: 0,
        S: 0,
        M: 0,
        L: 0,
        XL: 0
      };

      rows.forEach(r => {
        sizes[r.size] = r.stock;
      });

      publishRackStock(rack, {
        brand: rows[0].brand,
        cloth: rows[0].cloth,
        sizes
      });

      console.log("📡 MQTT Snapshot Published →", rack, sizes);
    }
  );
}

/* ======================================================
   ADMIN — CREATE RACK WITH SINGLE ITEM
====================================================== */
app.post("/api/admin/rack-with-item", upload.single("image"), (req, res) => {
  const { area, rack, brand, cloth } = req.body;
  const image = req.file ? `/uploads/products/${req.file.filename}` : null;

  if (!ALLOWED_AREAS.includes(area))
    return res.status(400).json({ error: "Invalid area" });

  if (!area || !rack || !brand || !cloth || !image)
    return res.status(400).json({
      error: "Area, rack, brand, cloth and image are required"
    });

  db.get(`SELECT 1 FROM products WHERE rack=?`, [rack], (_, row) => {
    if (row)
      return res.status(400).json({ error: "Rack already contains an item" });

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      STANDARD_SIZES.forEach(size => {
        db.run(
          `INSERT INTO products (area, rack, brand, cloth, size, image)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [area, rack, brand, cloth, size, image]
        );
      });

      db.run("COMMIT", () => res.json({ success: true }));
    });
  });
});

/* ======================================================
   DASHBOARD — AREAS
====================================================== */
app.get("/api/esp/areas", (_, res) => {
  res.json(ALLOWED_AREAS);
});

/* ======================================================
   DASHBOARD — RACKS BY AREA
====================================================== */
app.get("/api/esp/racks", (req, res) => {
  const { area } = req.query;

  if (!ALLOWED_AREAS.includes(area))
    return res.status(400).json({ error: "Invalid area" });

  db.all(
    `SELECT DISTINCT rack FROM products WHERE area=?`,
    [area],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => r.rack));
    }
  );
});

/* ======================================================
   DASHBOARD — STOCK VIEW
====================================================== */
app.get("/api/esp/rack/:rackId", (req, res) => {
  const rack = req.params.rackId;

  db.all(
    `
    SELECT
      p.area, p.brand, p.cloth, p.image, p.size,
      COUNT(b.barcode) FILTER (WHERE b.status='IN') AS stock
    FROM products p
    LEFT JOIN barcodes b
      ON p.rack=b.rack
     AND p.brand=b.brand
     AND p.cloth=b.cloth
     AND p.size=b.size
    WHERE p.rack=?
    GROUP BY p.brand, p.cloth, p.size
    `,
    [rack],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const grouped = {};
      rows.forEach(r => {
        const key = `${r.brand}-${r.cloth}`;
        if (!grouped[key]) {
          grouped[key] = {
            area: r.area,
            brand: r.brand,
            cloth: r.cloth,
            image: r.image,
            sizes: {}
          };
        }
        grouped[key].sizes[r.size] = r.stock;
      });

      res.json(
        Object.values(grouped).map(p => ({
          ...p,
          sizes: STANDARD_SIZES.map(size => ({
            size,
            stock: p.sizes[size] ?? 0
          }))
        }))
      );
    }
  );
});

/* ======================================================
   BARCODE — REGISTER / RETURN (FIXED TRANSACTION)
====================================================== */
app.post("/api/barcode/register-batch", (req, res) => {
  const { rack, items } = req.body;

  if (!rack || !Array.isArray(items) || !items.length)
    return res.status(400).json({ error: "Invalid batch payload" });

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let pending = items.length;

    items.forEach(item => {
      db.run(
        `UPDATE barcodes SET status='IN' WHERE barcode=?`,
        [item.barcode],
        function () {
          if (this.changes === 0) {
            db.run(
              `
              INSERT INTO barcodes (barcode, rack, brand, cloth, size, status)
              SELECT ?, p.rack, p.brand, p.cloth, ?, 'IN'
              FROM products p
              WHERE p.rack=? AND p.size=?
              LIMIT 1
              `,
              [item.barcode, item.size, rack, item.size],
              () => {
                pending--;
                if (pending === 0) finalize();
              }
            );
          } else {
            pending--;
            if (pending === 0) finalize();
          }
        }
      );
    });

    function finalize() {
      db.run("COMMIT", () => {
        publishRackStockSnapshot(rack);
        res.json({ success: true });
      });
    }
  });
});
/* ======================================================
   SALES — SCAN SINGLE BARCODE
====================================================== */
app.post("/api/sales/scan", (req, res) => {
  const { barcode } = req.body;

  if (!barcode)
    return res.status(400).json({ error: "Barcode required" });

  db.get(
    `
    SELECT brand, cloth, size, rack
    FROM barcodes
    WHERE barcode = ?
      AND status = 'IN'
    `,
    [barcode],
    (err, row) => {
      if (err)
        return res.status(500).json({ error: err.message });

      if (!row)
        return res.status(400).json({
          error: "Item not found or already sold"
        });

      res.json({
        barcode,
        brand: row.brand,
        cloth: row.cloth,
        size: row.size,
        rack: row.rack
      });
    }
  );
});


/* ======================================================
   SALES — CHECKOUT
====================================================== */
app.post("/api/sales/checkout", (req, res) => {
  const { barcodes } = req.body;

  if (!Array.isArray(barcodes) || !barcodes.length)
    return res.status(400).json({ error: "Invalid barcode list" });

  const placeholders = barcodes.map(() => "?").join(",");

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run(
      `
      UPDATE barcodes
      SET status='SOLD'
      WHERE barcode IN (${placeholders})
        AND status='IN'
      `,
      barcodes,
      function (err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: err.message });
        }

        const soldCount = this.changes;

        db.run("COMMIT", () => {
          res.json({
            success: true,
            sold: soldCount
          });

          // Refresh MQTT stock per affected rack
          db.all(
            `
            SELECT DISTINCT rack
            FROM barcodes
            WHERE barcode IN (${placeholders})
            `,
            barcodes,
            (_, racks) => {
              racks.forEach(r => {
                publishRackStockSnapshot(r.rack);
              });
            }
          );
        });
      }
    );
  });
});

/* ======================================================
   FRONTEND (Serve Dashboard HTML)
====================================================== */
const dashboardPath = path.join(__dirname, "../FrontEnd/Dashboard");

app.use(express.static(dashboardPath));

// Main page
app.get("/", (req, res) => {
  res.sendFile(path.join(dashboardPath, "index.html"));
});

/* ======================================================
   START SERVER
====================================================== */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);

  // 🔥 AUTO PUBLISH ALL RACK STOCK ON STARTUP
  db.all(`SELECT DISTINCT rack FROM products`, [], (err, racks) => {
    if (err) {
      console.error("Failed to load racks on startup:", err.message);
      return;
    }

    racks.forEach(r => {
      console.log("📡 Publishing initial stock for rack:", r.rack);
      publishRackStockSnapshot(r.rack);
    });
  });
});

/* ======================================================
   GRACEFUL SHUTDOWN (Electron Friendly)
====================================================== */
function shutdown() {
  console.log("🛑 Shutting down backend...");

  // stop accepting new connections
  try {
    server.close(() => {
      console.log("✅ HTTP server closed");
    });
  } catch (err) {
    console.error("❌ Error closing HTTP server:", err.message);
  }

  // close mqtt connection
  try {
    shutdownMQTT();
  } catch (err) {
    console.error("❌ Error shutting down MQTT:", err.message);
  }

  // close sqlite db if supported
  try {
    if (db && typeof db.close === "function") {
      db.close(err => {
        if (err) console.error("❌ DB close error:", err.message);
        else console.log("✅ DB closed");
      });
    }
  } catch (err) {
    console.error("❌ Error closing DB:", err.message);
  }

  // allow logs to flush then exit
  setTimeout(() => process.exit(0), 800);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// optional: if electron sends a message
process.on("message", msg => {
  if (msg === "shutdown") shutdown();
});

module.exports = app;
