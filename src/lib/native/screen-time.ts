"use client";

import { registerPlugin } from "@capacitor/core";
import { isNativeIosApp } from "@/lib/native/capacitor";

export type ScreenTimeStatus = {
  authorized: boolean;
  configured: boolean;
  limitMinutes: number;
  limitReached: boolean;
  selectionCount: number;
};

type ScreenTimePlugin = {
  clearLimit(): Promise<ScreenTimeStatus>;
  configureDailyLimit(options: { minutes: number }): Promise<ScreenTimeStatus>;
  getStatus(): Promise<ScreenTimeStatus>;
  presentAppPicker(): Promise<ScreenTimeStatus>;
  requestAuthorization(): Promise<ScreenTimeStatus>;
};

const ErrdayScreenTime = registerPlugin<ScreenTimePlugin>("ErrdayScreenTime");

export function supportsNativeScreenTime() {
  return isNativeIosApp();
}

export const nativeScreenTime = {
  clearLimit: () => ErrdayScreenTime.clearLimit(),
  configureDailyLimit: (minutes: number) =>
    ErrdayScreenTime.configureDailyLimit({ minutes }),
  getStatus: () => ErrdayScreenTime.getStatus(),
  presentAppPicker: () => ErrdayScreenTime.presentAppPicker(),
  requestAuthorization: () => ErrdayScreenTime.requestAuthorization(),
};
