

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
        | Admin Dashboard app  |
        |(Electron Desktop App)|
        +----------+-----------+
                   |
                   | HTTP API (Localhost)
                   v
        +----------------------+
        |    Node.js Backend   |
        | (Server + SQLite DB) |
        +----------+-----------+
                   |
                   | MQTT Publish
                   v
        +----------------------+
        |     MQTT Broker      |
        | (Mosquitto - local)  |
        +----------+-----------+
                   |
                   | MQTT Subscribe
                   v
        +----------------------+
        |        ESP32         |
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

### 🛍️ Real-World Flow (Customer Purchase)

1. Customer selects and buys a clothing item at the store
2. The cashier scans the item barcode using the system
3. The backend updates the database (reduces stock count)
4. Backend publishes updated stock data via MQTT
5. ESP32 subscribed to the topic receives the update
6. LCD display instantly updates the available sizes on the rack

---

### 📡 System Data Flow

1. Admin manages products and stock via Electron desktop dashboard
2. Dashboard communicates with Node.js backend via HTTP API
3. Backend processes data and stores it in SQLite database
4. Backend publishes real-time updates using MQTT
5. ESP32 subscribes to the MQTT topic
6. LCD display updates in real-time using SPI communication

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
