#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>

// ---------------- WIFI + MQTT ----------------
#define WIFI_SSID "Hiru"
#define WIFI_PASS "12345678"
#define RACK_ID     "M-01"

// ✅ FIXED: USE CORRECT LAPTOP IP
#define MQTT_SERVER "10.211.120.179"
#define MQTT_PORT   1883

// ---------------- LCD (ST7920) ----------------
U8G2_ST7920_128X64_F_SW_SPI u8g2(
  U8G2_R0,
  12,  // CLOCK
  11,  // DATA
  10,  // CS
  U8X8_PIN_NONE
);

WiFiClient espClient;
PubSubClient client(espClient);

// ---------------- DATA ----------------
String brandName = "Brand";
String clothName = "Waiting...";

int XS = 0, S = 0, M = 0, L = 0, XL = 0;

String mqttTopic = String("rack/") + RACK_ID + "/stock";

// ---------------- DISPLAY ----------------
void drawScreen() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x12_tf);

  String title = brandName + "  " + clothName;
  int titleWidth = u8g2.getStrWidth(title.c_str());
  int titleX = (128 - titleWidth) / 2;
  u8g2.drawStr(titleX, 12, title.c_str());

  u8g2.drawHLine(0, 16, 128);

  char buf[10];

  int y1 = 38;

  sprintf(buf, "XS-%d", XS);
  u8g2.drawStr(5, y1, buf);

  sprintf(buf, "S-%d", S);
  u8g2.drawStr(50, y1, buf);

  sprintf(buf, "M-%d", M);
  u8g2.drawStr(90, y1, buf);

  int y2 = 58;

  sprintf(buf, "L-%d", L);
  u8g2.drawStr(30, y2, buf);

  sprintf(buf, "XL-%d", XL);
  u8g2.drawStr(75, y2, buf);

  u8g2.sendBuffer();
}

// ---------------- WIFI ----------------
bool connectWiFi() {
  Serial.println("\n[WiFi] Connecting...");

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
    clothName = "WiFi Connecting...";
    drawScreen();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());

    clothName = "WiFi OK";
    drawScreen();
    return true;
  }

  clothName = "WiFi FAILED!";
  drawScreen();
  return false;
}

// ---------------- MQTT ----------------
void connectMQTT() {
  while (!client.connected()) {
    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }

    Serial.println("[MQTT] Connecting...");
    clothName = "MQTT Connecting...";
    drawScreen();

    if (client.connect(RACK_ID)) {
      Serial.println("[MQTT] Connected");
      client.subscribe(mqttTopic.c_str());
      Serial.println("[MQTT] Subscribed");
      clothName = "MQTT Connected";
      drawScreen();
    } else {
      Serial.print("[MQTT] Failed rc=");
      Serial.println(client.state());   // 🔥 DEBUG
      clothName = "MQTT Failed";
      drawScreen();
      delay(2000);
    }
  }
}

// ---------------- MQTT CALLBACK ----------------
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.println("\n[MQTT] Message Received");

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload, length);

  if (err) {
    Serial.println("[JSON] Parse failed");
    clothName = "JSON Error!";
    drawScreen();
    return;
  }

  brandName = doc["brand"] | "Brand";
  clothName = doc["cloth"] | "Unknown";

  XS = doc["sizes"]["XS"] | 0;
  S  = doc["sizes"]["S"]  | 0;
  M  = doc["sizes"]["M"]  | 0;
  L  = doc["sizes"]["L"]  | 0;
  XL = doc["sizes"]["XL"] | 0;

  drawScreen();
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  u8g2.begin();
  clothName = "Booting...";
  drawScreen();

  connectWiFi();

  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);

  client.setKeepAlive(60);
  client.setSocketTimeout(30);

  connectMQTT();
}

// ---------------- LOOP ----------------
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!client.connected()) {
    connectMQTT();
  }

  client.loop();
  delay(10);
}