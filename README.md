# FarmLedger Pro - User Manual & Developer Guide

FarmLedger Pro is a professional, mobile-first customer ledger and supply tracking application designed for farm businesses.

## 🚀 How to Create an APK

### Method 1: Capacitor (Recommended for Cursor Users)
1. **Prerequisites**: Install [Node.js](https://nodejs.org/) and [Android Studio](https://developer.android.com/studio).
2. **Setup**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init
   npx cap add android
   ```
3. **Build**:
   ```bash
   npx cap copy
   npx cap open android
   ```
4. **Generate APK**: In Android Studio, click **Build > Build APK(s)**.

### Method 2: PWABuilder (Fastest)
1. Deploy your site to a URL (e.g., `https://my-farm-ledger.vercel.app`).
2. Visit [PWABuilder.com](https://www.pwabuilder.com).
3. Generate the Android "Digital Asset Link" and download your APK.

## 📋 Key Features
- **Offline-First**: Works without internet using IndexedDB.
- **Daily Record Sheet**: Bulk entry for all customers with "Ledger Ripple" correction logic.
- **Reports**: CSV Export and Cloud Sync capabilities.

## 🛠 Tech Stack
- **Framework**: React 19 (ESM via esm.sh)
- **Database**: Dexie.js (IndexedDB wrapper)
- **Styling**: Tailwind CSS
- **PWA**: Custom Service Worker (`sw.js`) and Manifest.
