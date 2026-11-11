
import { useSyncExternalStore } from "react";

let volume = 1;
try {
  const saved = localStorage.getItem("fp-volume");
  if (saved !== null && Number.isFinite(Number(saved)))
    volume = Math.min(1, Math.max(0, Number(saved)));
} catch {
  // 讀取音量設定失敗時，使用預設音量
}

const listeners = new Set<() => void>();

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem("fp-volume", String(volume));
  } catch {
    // 儲存音量設定失敗時，保留目前音量
  }
  listeners.forEach((l) => l());
}

export function useVolume(): [number, (v: number) => void] {
  const v = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => volume,
  );
  return [v, setVolume];
}

export const getVolume = () => volume;

export function subscribeVolume(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
