import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.pickmo.chat',
  appName: 'Pickmo.ai',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true  // Allows HTTP for local backend
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;