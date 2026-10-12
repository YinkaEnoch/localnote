import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.localnote.app',
  appName: 'LocalNote',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
  plugins: {
    Keyboard: {
      // Let the WebView shrink when the keyboard opens so the caret and
      // the sticky toolbar naturally stay above it. Our CSS var
      // (--keyboard-height) stays 0 in this mode and only kicks in as a
      // fallback when the OS overlays the keyboard instead.
      resize: 'body',
      resizeOnFullScreen: true,
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeychainPrefix: 'localnote',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for capacitor sqlite',
      },
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for capacitor sqlite',
      },
    },
  },
};

export default config;
