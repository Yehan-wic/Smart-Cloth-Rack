const mqtt = require("mqtt");

/*
  IMPORTANT:
  - In packaged EXE, "localhost" means the USER PC, not your dev PC.
  - If broker is on another machine, you MUST set MQTT_BROKER in .env
    Example: mqtt://192.168.1.50:1883
*/

const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://127.0.0.1:1883";

const MQTT_OPTIONS = {
  clientId: "backend-stock-publisher",
  clean: false, // keep session
  reconnectPeriod: 2000, // a bit slower = less CPU spam
  connectTimeout: 4000,
  keepalive: 60
};

// cache last payload per rack
const lastRackData = {};

// ---------------- SAFE CONNECT ----------------

// prevent backend crash even if mqtt is missing / broker down
let client = null;

try {
  client = mqtt.connect(MQTT_BROKER, MQTT_OPTIONS);
} catch (err) {
  console.error("❌ MQTT connect failed:", err.message);
}

// ---------------- CONNECTION EVENTS ----------------

if (client) {
  client.on("connect", () => {
    console.log("✅ MQTT connected (backend)");

    // re-publish retained data on reconnect
    Object.entries(lastRackData).forEach(([rackId, data]) => {
      publishRackStock(rackId, data);
    });
  });

  client.on("reconnect", () => {
    console.log("🔄 MQTT reconnecting...");
  });

  client.on("offline", () => {
    console.log("⚠ MQTT offline");
  });

  client.on("close", () => {
    console.log("🔌 MQTT connection closed");
  });

  client.on("error", err => {
    console.error("❌ MQTT error:", err.message);
  });
}

// ---------------- PUBLISH FUNCTION ----------------

function publishRackStock(rackId, data) {
  const topic = `rack/${rackId}/stock`;

  // always cache last data (even if mqtt is down)
  lastRackData[rackId] = data;

  // mqtt not available
  if (!client) {
    return;
  }

  // mqtt not connected
  if (!client.connected) {
    return;
  }

  client.publish(
    topic,
    JSON.stringify(data),
    {
      qos: 1,
      retain: true // ⭐ VERY IMPORTANT
    },
    err => {
      if (err) {
        console.error("❌ MQTT publish failed:", err.message);
      } else {
        console.log(`📡 MQTT published → ${topic}`);
      }
    }
  );
}

/* ======================================================
   GRACEFUL SHUTDOWN (Electron Friendly)
====================================================== */
function shutdownMQTT() {
  try {
    if (!client) return;

    console.log("🛑 Closing MQTT client...");

    // end(force=false) = graceful disconnect
    client.end(false, () => {
      console.log("✅ MQTT client closed cleanly");
    });
  } catch (err) {
    console.error("❌ MQTT shutdown error:", err.message);
  }
}

module.exports = { publishRackStock, shutdownMQTT };
