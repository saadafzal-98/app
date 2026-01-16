
# FarmLedger Pro - Android Build Guide

## 🚀 First-Time Setup
Run these once to prepare your environment:

1. **Install Dependencies**:
   ```powershell
   npm install
   ```

2. **Add Android Platform**:
   ```powershell
   npm run cap:init
   ```

## 🔄 Daily Build Workflow
Run these whenever you make changes to the code and want to see them in the App:

1. **Build & Sync**:
   ```powershell
   npm run cap:sync
   ```

2. **Open Android Studio**:
   ```powershell
   npm run cap:open
   ```

3. **In Android Studio**:
   - Wait for "Gradle Sync" to finish (bottom bar).
   - Click the **Play button** (Run 'app') to launch on your phone/emulator.
   - Or go to **Build > Build APK(s)** to get the installable file.
