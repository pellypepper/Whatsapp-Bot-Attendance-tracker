# 📱 WhatsApp Attendance & Notes Assistant

A Google Apps Script-powered assistant integrated with Twilio WhatsApp API to help organizations track attendance and manage notes via simple text commands.
Programming language: Javascript
---

## 🧩 Features

- ✅ **Check-In / Check-Out** via WhatsApp
- 📝 **Record Notes** and **Review Past Notes**
- 📊 All data automatically logged to Google Sheets
- 🧠 Remembers user states for smooth conversational flow
- 🛠️ Supports JSON and URL-encoded requests (Postman & WhatsApp-compatible)
- 📍 Easily extensible with new features (location check-ins, authentication, etc.)

---

## 🚀 How It Works

This app receives incoming WhatsApp messages via Twilio and processes them through Google Apps Script. Users interact using numbers (e.g. `1`, `2`, `3`) to check in/out or take notes. All data is saved into dedicated sheets in Google Sheets.

---

## 📋 Commands Overview

| Command        | Description |
|----------------|-------------|
| `menu` or `help` | Display the main options menu |
| `1`           | Check In using name or phone |
| `2`           | Check Out |
| `3`           | Record a Note |
| `4`           | View Your Notes |
| `reset`       | Reset your session |

---
#Live Link to test : https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+law-blow&type=phone_number&app_absent=0

## ⚙️ Setup Instructions

### 🔧 Prerequisites

- Google Account
- Twilio Account with WhatsApp sandbox enabled
- A Google Sheet to store your data

### 📑 Google Apps Script

1. Open a new Google Sheet.
2. Click `Extensions > Apps Script`.
3. Replace the default code with the script in `Code.gs`.
4. Save and deploy:
   - Click **Deploy > Manage deployments**
   - Choose **Web App**
   - Set `Execute as: Me` and `Access: Anyone`
   - Copy the Web App URL.

### 🌐 Twilio Configuration

1. Log in to Twilio.
2. Go to your **WhatsApp Sandbox Settings**.
3. Paste your Google Apps Script Web App URL into the **"WHEN A MESSAGE COMES IN"** field.
4. Start messaging your WhatsApp sandbox number.





## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

> Built with Pelumi Otegbola 
