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
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
  const [typing, setTyping] = useState<boolean>(false);
  const [, startTransition] = useTransition();

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

  useEffect(() => {
    clearCurrentTimer();
    queueRef.current = [];
    isBusyRef.current = false;
    setTyping(false);

    const allIds = new Set(items.map((i) => i.id));
    setVisibleIds(allIds);

    return () => {
      clearCurrentTimer();
    };
  }, [items, thread]);

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

      startTransition(() => {
        setVisibleIds((prev) => {
          const nextSet = new Set(prev);
          nextSet.add(next.id);
          return nextSet;
        });
      });

      setTyping(false);

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        isBusyRef.current = false;
        processQueue();
      }, 400);

    }, delay);
  };

  useEffect(() => {
    if (!thread) return;

    const newIncoming = items.filter(
      (i) => !visibleIds.has(i.id) && !i.outgoing,
    ) as PlaybackItem[];

    if (newIncoming.length === 0) return;

    queueRef.current.push(...newIncoming);
    processQueue();
  }, [items, thread, visibleIds]);

  return {
    visible: items.filter((i) => i.outgoing || visibleIds.has(i.id)),
    typing,
  };
}
