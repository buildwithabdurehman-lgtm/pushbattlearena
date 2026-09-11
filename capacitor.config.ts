import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android wrapper for PushOff.
 *
 * The app is a server-rendered web app, so the native shell loads the live
 * published site instead of bundling static files. Change `server.url` if you
 * point PushOff at a custom domain.
 */
const config: CapacitorConfig = {
  appId: "app.pushoff.arena",
  appName: "PushOff",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    url: "https://pushbattlearena.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
