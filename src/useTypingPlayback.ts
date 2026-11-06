import { useEffect, useRef, useState, useTransition } from "react";
import type { Item } from "./schema";

interface PlaybackItem extends Item {
  typingMs?: number;
}

const getTypingMs = (i: PlaybackItem): number => {
  const custom = Number(i.typingMs || 0);
  if (custom > 0) return custom;
  if (i.kind !== "text") return 1200;

  const base = 300 + (typeof i.body === "string" ? i.body.length : 0) * 80;
  const jittered = base * (0.85 + Math.random() * 0.3);
  return Math.min(Math.max(jittered, 700), 5000);
};

export function useTypingPlayback(items: Item[], thread?: string) {
  // 記錄哪些訊息已經解鎖顯示了
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
  const [typing, setTyping] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // 用 ref 追蹤目前處理到哪一個 thread，避免切換聊天室時狀態錯亂
  const currentThreadRef = useRef(thread);
  currentThreadRef.current = thread;

  const queueRef = useRef<PlaybackItem[]>([]);
  const isBusyRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCurrentTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // 當切換 thread 或初始化時，重置佇列並預設顯示所有舊訊息
  useEffect(() => {
    clearCurrentTimer();
    queueRef.current = [];
    isBusyRef.current = false;
    setTyping(false);

    // 一開始把現有的所有訊息 ID 直接設為可見（只對「新進來的即時訊息」才跑打字模擬）
    const allIds = new Set(items.map((i) => i.id));
    setVisibleIds(allIds);

    return () => {
      clearCurrentTimer();
    };
  }, [thread]);

  // 核心：處理播放下一則訊息的迴圈
  const processQueue = () => {
    if (isBusyRef.current) return;

    const next = queueRef.current.shift();
    if (!next) {
      setTyping(false);
      isBusyRef.current = false;
      return;
    }

    isBusyRef.current = true;
    setTyping(true);

    const delay = getTypingMs(next);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;

      // 顯示該則訊息
      startTransition(() => {
        setVisibleIds((prev) => {
          const nextSet = new Set(prev);
          nextSet.add(next.id);
          return nextSet;
        });
      });

      setTyping(false);

      // 訊息間的小間隔
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        isBusyRef.current = false;
        processQueue();
      }, 400);

    }, delay);
  };

  // 監聽 items 變化，精準捕捉「全新增加」的未讀對方訊息
  useEffect(() => {
    if (!thread) return;

    // 找出目前還不在 visibleIds 裡面，且是別人傳送的訊息
    const newIncoming = items.filter(
      (i) => !visibleIds.has(i.id) && !i.outgoing,
    ) as PlaybackItem[];

    if (newIncoming.length === 0) return;

    // 將新訊息加入佇列排隊
    queueRef.current.push(...newIncoming);
    processQueue();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, thread]);

  return {
    // 只有在 visibleIds 裡的訊息才會被渲染出來
    visible: items.filter((i) => i.outgoing || visibleIds.has(i.id)),
    typing,
  };
}
