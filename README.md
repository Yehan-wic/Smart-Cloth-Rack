

# 👕 Smart Clothing Rack IoT System

## 🚀 Overview

A smart IoT-based clothing rack system that displays real-time inventory data using an ESP32 and MQTT communication.

This system helps retail stores monitor clothing stock efficiently with a digital display.

---

## 🧠 Features

* 📡 Real-time data updates using MQTT
* 📶 ESP32 WiFi communication
* 📊 Live stock display (XS, S, M, L, XL)
* 🖥️ Admin dashboard (Web-based)
* 🔄 JSON-based data processing
* ⚡ Low-latency communication

---

## 🛠️ Technologies Used

* ESP32 (Embedded System)
* MQTT (Mosquitto)
* Node.js (Backend)
* HTML, JavaScript (Frontend)
* SQLite Database

---

## 🏗️ System Architecture

        +----------------------+
        |   Admin Dashboard    |
        | (Web Application)    |
        +----------+-----------+
                   |
                   | HTTP API
                   v
        +----------------------+
        |     Node.js Backend  |
        |  (Server + Database) |
        +----------+-----------+
                   |
                   | MQTT Publish
                   v
        +----------------------+
        |   MQTT Broker        |
        |   (Mosquitto)        |
        +----------+-----------+
                   |
                   | MQTT Subscribe
                   v
        +----------------------+
        |      ESP32           |
        |  (WiFi Enabled MCU)  |
        +----------+-----------+
                   |
                   | SPI
                   v
        +----------------------+
        |     LCD Display      |
        |   (ST7920 128x64)    |
        +----------------------+
---

## 📸 Project Demo
![6217645647448445031](https://github.com/user-attachments/assets/83a39253-bda8-4d58-8079-a1d79c892e2d)
![6217645647448445030](https://github.com/user-attachments/assets/23f106ef-06b8-493e-994d-af2ebcf2e9a0)



---

## 🔌 How It Works

1. Admin updates stock from dashboard
2. Backend publishes data via MQTT
3. ESP32 subscribes to topic
4. LCD updates in real-time

---

## 📦 MQTT Topic

```
rack/M-01/stock
```

---

## 🔧 Setup Instructions

### ESP32

* Upload code using Arduino IDE
* Update WiFi credentials

### Backend

```
npm install
node server.js
```
---

## 👨‍💻 Author

Yehan Wickramasinghe
