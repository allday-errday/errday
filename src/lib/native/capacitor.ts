import { Capacitor } from "@capacitor/core";

export function isNativeIosApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}
