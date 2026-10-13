import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.livechat.mdlivechat',
  appName: 'MDLIVECHAT',
  webDir: 'out',
  server: {
    url: 'https://mdlivechat.vercel.app',
    cleartext: false,
  },
  android: {
    backgroundColor: '#ffffff',
  },
};

export default config;
