import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? "https://errday.ch";

const config: CapacitorConfig = {
  appId: "com.errday.app",
  appName: "Errday",
  webDir: "native-shell",
  plugins: {
    LocalNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
  ...(serverUrl
    ? {
        server: {
          cleartext: false,
          url: serverUrl,
        },
      }
    : {}),
  ios: {
    contentInset: "always",
  },
};

export default config;
