import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? "https://www.errday.ch";

const config: CapacitorConfig = {
  appId: "com.errday.app",
  appName: "Errday",
  backgroundColor: "#15171c",
  webDir: "native-shell",
  plugins: {
    LocalNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
  ...(serverUrl
    ? {
        server: {
          allowNavigation: ["www.errday.ch", "errday.ch"],
          cleartext: false,
          url: serverUrl,
        },
      }
    : {}),
  ios: {
    contentInset: "never",
  },
};

export default config;
