
# FarmLedger Pro - APK Build Instructions

Since this is a Progressive Web App (PWA), you can easily convert it into an Android APK file.

## Method 1: Using PWABuilder (Easiest)
1. **Host the app**: Upload this code to a hosting provider (like Vercel, Netlify, or GitHub Pages).
2. **Visit PWABuilder**: Go to [https://www.pwabuilder.com/](https://www.pwabuilder.com/).
3. **Enter URL**: Paste your hosted website URL into the box.
4. **Generate Android Package**: Click "Build My PWA" and then download the **Android (APK)** package.
5. **Install**: Copy the APK to your phone and install it.

## Method 2: Manual Wrapper (Advanced)
You can use **Capacitor** to turn this React code into a native Android Studio project:
1. `npm install @capacitor/android`
2. `npx cap add android`
3. `npx cap open android` (This opens Android Studio where you can build the APK manually).

## Key Features
- **Offline First**: Works without internet.
- **Ripple Balance logic**: Editing a past entry automatically fixes all subsequent balances.
- **Cloud Sync**: Optional cloud backup to prevent data loss.
