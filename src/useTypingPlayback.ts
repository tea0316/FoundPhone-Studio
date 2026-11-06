import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Item } from "./schema";

/** 擴充 Item 型別，允許選填 typingMs */
interface PlaybackItem extends Item {
  typingMs?: number;
}

/** 依內容長度算「輸入中」要持續多久 */
const typingMs = (i: PlaybackItem): number => {
  const custom = Number(i.typingMs || 0);

  if (custom > 0) return custom;
  if (i.kind !== "text") return 1200;

  const base = 300 + (typeof i.body === "string" ? i.body.length : 0) * 80;
  const jittered = base * (0.85 + Math.random() * 0.3);

  return Math.min(Math.max(jittered, 700), 5000);
};

export function useTypingPlayback(items: Item[], thread?: string) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState<boolean>(false);

  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<PlaybackItem[]>([]);
  const busy = useRef<boolean>(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 清除目前計時器 */
  const clearTimer = (): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  /** 重置播放狀態 */
  const reset = (): void => {
    clearTimer();

    queue.current = [];
    busy.current = false;

    setPending(new Set());
    setTyping(false);
  };

  /** 播放下一則訊息 */
  const pump = (): void => {
    if (busy.current) return;

    const next = queue.current.shift();

    if (!next) {
      setTyping(false);
      return;
    }

    busy.current = true;
    setTyping(true);

    timer.current = setTimeout(() => {
      timer.current = null;

      // 顯示這則訊息
      setPending((s) => {
        const n = new Set(s);
        n.delete(next.id);
        return n;
      });

      setTyping(false);

      // 等待 400ms，再播放下一則
      timer.current = setTimeout(() => {
        timer.current = null;
        busy.current = false;
        pump();
      }, 400);

    }, typingMs(next));
  };

  /** 切換聊天室時重置 */
  useLayoutEffect(() => {
    reset();

    seen.current = new Set(items.map((i) => i.id));

    return () => {
      clearTimer();
      queue.current = [];
      busy.current = false;
    };
  }, [thread, items]);

  /** 偵測新訊息並加入播放佇列 */
  useLayoutEffect(() => {
    const fresh = items.filter((i) => !seen.current.has(i.id));

    if (!fresh.length) return;

    fresh.forEach((i) => seen.current.add(i.id));

    // 只播放別人傳來的訊息
    const incoming = fresh.filter((i) => !i.outgoing) as PlaybackItem[];

    if (!incoming.length) return;

    // 加入等待顯示清單
    setPending((s) => new Set([...s, ...incoming.map((i) => i.id)]));

    // 加入播放佇列
    queue.current.push(...incoming);

    pump();
  }, [items]);

  /** 元件卸載時清理 */
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return {
    visible: items.filter((i) => !pending.has(i.id)),
    typing,
  };
}
