# FarmLedger Pro - GitHub to APK Guide

Follow these steps to turn this repository into an Android App (APK).

## ⚠️ IMPORTANT: THE CORRECT URL
When using **PWABuilder**, do **NOT** use your GitHub repository URL (e.g., `github.com/user/repo`). 
You **MUST** use the **GitHub Pages URL** where your app is actually running (e.g., `https://saadafzal-98.github.io/app/`).

## 1. Host the app on GitHub Pages
1. Push this code to your GitHub repository.
2. Go to **Settings** > **Pages**.
3. Under "Build and deployment", set Source to "Deploy from a branch".
4. Select the `main` branch and folder `/ (root)`, then click **Save**.
5. Wait 2 minutes, then copy your live URL (e.g., `https://yourname.github.io/repo/`).

## 2. Generate APK
1. Go to [PWABuilder.com](https://www.pwabuilder.com/).
2. Enter your **GitHub Pages URL** (NOT the github.com repo link).
3. Ensure you see **3 Green Checks** for Manifest, Service Worker, and Security.
4. Click **Package for Stores** > **Android**.
5. Download the generated zip file.

## 3. Install
1. Extract the zip and find the `app-release.apk`.
2. Transfer it to your phone and install.

## Features for Mobile
- **Standalone Mode**: Opens like a real app without a browser address bar.
- **Offline Support**: Once opened, the ledger works even in areas with no signal.
- **Ripple Logic**: Corrects history errors automatically across the whole ledger.