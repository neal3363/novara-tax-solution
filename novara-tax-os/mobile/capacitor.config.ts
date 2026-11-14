import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor config for NOVARA Tax OS mobile shells.
 * webDir is populated by `npm run sync:web` from the Vite dist build.
 * Server URL may point at staging only when owner authorizes — default is bundled www.
 */
const config: CapacitorConfig = {
  appId: 'com.novara.taxos',
  appName: 'NOVARA Tax OS',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0B1018',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'NovaraTaxOS',
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
