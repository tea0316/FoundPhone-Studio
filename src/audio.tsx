/*播放及進度保存、重新開啟音訊時恢復上次播放的位置 */
import { useEffect, useRef } from "react";
import type { SkinProps } from "./AppSkins";
import { safeMedia, type Item } from "./schema";
import { useSkinState } from "./skinState";
import { useVolume } from "./volume";

export function useTrack(
  p: SkinProps,
  items: Item[],
): [Item | null, (item: Item | null) => void] {
  const [id, setId] = useSkinState<string>(p, "track", "");
  return [
    items.find((i) => i.id === id) ?? null,
    (item) => {
      setId(item?.id ?? "");
      if (item) p.onRead(item.id);
    },
  ];
}

function coverUrl(raw = "") {
  if (raw.startsWith("data:image/")) return raw;
  if (/^\/[\w./-]+\.(png|jpe?g|webp)$/i.test(raw))
    return new URL(import.meta.env.BASE_URL + raw.slice(1), location.href).href;
  return "";
}

export function AudioPlayer({
  p,
  item,
  onNext,
}: {
  p: SkinProps;
  item: Item;
  onNext?: () => void;
}) {
  const last = useRef(-1);
  const element = useRef<HTMLAudioElement>(null);
  const [vol, setVol] = useVolume();
  const key = `audio-${item.id}`,
    saved = p.ui?.[key];
  const commit = (time: number, force = false) => {
    if (!p.onUi || !Number.isFinite(time)) return;
    if (force || Math.abs(time - last.current) >= 5) {
      last.current = time;
      p.onUi(key, time);
    }
  };

  // 共用音量 → 播放器
  useEffect(() => {
    if (element.current) element.current.volume = vol;
  }, [vol, item.id]);

  useEffect(() => {
    const audio = element.current;
    if (
      !audio ||
      typeof saved !== "number" ||
      !Number.isFinite(saved) ||
      saved <= 0
    )
      return;
    const restore = () => {
      if (audio.readyState < 1) return;
      last.current = saved;
      audio.currentTime = Math.min(
        saved,
        Number.isFinite(audio.duration) ? audio.duration : saved,
      );
    };
    restore();
    audio.addEventListener("loadedmetadata", restore, { once: true });
    return () => audio.removeEventListener("loadedmetadata", restore);
  }, [item.id]);

  // 鎖屏 / 系統通知的歌名、歌手、封面與按鈕
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const cover = coverUrl(item.avatar);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.sender,
      album: item.meta?.album ?? "",
      artwork: cover ? [{ src: cover }] : [],
    });
    const a = element.current;
    navigator.mediaSession.setActionHandler("play", () => void a?.play());
    navigator.mediaSession.setActionHandler("pause", () => a?.pause());
    navigator.mediaSession.setActionHandler("seekto", (d) => {
      if (a && d.seekTime != null) a.currentTime = d.seekTime;
    });
    navigator.mediaSession.setActionHandler("nexttrack", onNext ?? null);
    return () => {
      for (const action of ["play", "pause", "seekto", "nexttrack"] as const)
        navigator.mediaSession.setActionHandler(action, null);
    };
  }, [item.id, onNext]);

  return (
    <audio
      ref={element}
      controls
      src={safeMedia(item.media)}
      aria-label={`播放${item.title}`}
      onVolumeChange={(e) => setVol(e.currentTarget.volume)}
      onPlay={() => {
        if ("mediaSession" in navigator)
          navigator.mediaSession.playbackState = "playing";
      }}
      onTimeUpdate={(e) => {
        if (e.currentTarget.isConnected) commit(e.currentTarget.currentTime);
      }}
      onPause={(e) => {
        if ("mediaSession" in navigator)
          navigator.mediaSession.playbackState = "paused";
        if (e.currentTarget.isConnected)
          commit(e.currentTarget.currentTime, true);
      }}
      onEnded={(e) => commit(e.currentTarget.currentTime, true)}
    />
  );
}
