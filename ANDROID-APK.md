# Build the PushOff Android APK

Everything needed is already in this project. Run these steps on your own
computer (Windows, macOS or Linux).

## One-time setup

1. Install [Node.js](https://nodejs.org) and
   [Android Studio](https://developer.android.com/studio).
   In Android Studio open **More Actions → SDK Manager** and make sure
   *Android SDK Platform 35* and *Android SDK Build-Tools* are installed.
2. Download this project's code (GitHub, or the zip export) and open a terminal
   in the project folder.
3. Install the packages:

   ```sh
   npm install
   ```

## Create the Android project (first time only)

```sh
npx cap add android
```

This creates an `android/` folder. It is generated output — you only do this once.

## Build the APK

```sh
npx cap sync android
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

The installable file appears at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Copy it to your phone and open it (allow "install from unknown sources").

## Release APK (for sharing or the Play Store)

```sh
keytool -genkey -v -keystore pushoff.keystore -alias pushoff -keyalg RSA -keysize 2048 -validity 10000
```

Put the key details in `android/key.properties`, then:

```sh
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

## Notes

- The app opens the live PushOff site inside the app shell, so every update you
  publish reaches installed phones instantly — no new APK needed.
- Camera permission: add these lines inside `<manifest>` in
  `android/app/src/main/AndroidManifest.xml` (needed for the push-up tracker):

  ```xml
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-feature android:name="android.hardware.camera" android:required="false" />
  ```

- App name and icon: change `appName` in `capacitor.config.ts`, and replace the
  icons in `android/app/src/main/res/` (Android Studio: right-click `res` →
  **New → Image Asset**).
- If you use a custom domain, update `server.url` in `capacitor.config.ts`, then
  run `npx cap sync android` again.
