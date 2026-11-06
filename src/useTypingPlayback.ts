import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface ChatItem {
  id: string;
  body?: string;
  kind?: string;
  outgoing?: boolean;
  typingMs?: number;
  [key: string]: any;
}

/** 依內容長度算「輸入中」要持續多久 */
const typingMs = (i: ChatItem) => {
  const custom = Number(i.typingMs || 0);
  if (custom > 0) return custom;
  if (i.kind !== "text") return 1200;
  const base = 300 + (i.body?.length || 0) * 80;
  const jittered = base * (0.85 + Math.random() * 0.3);
  return Math.min(Math.max(jittered, 700), 5000);
};

export function useTypingPlayback(items: ChatItem[], thread?: string) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState(false);
  const seen = useRef(new Set<string>());
  const queue = useRef<ChatItem[]>([]);
  const busy = useRef(false);
  const timer = useRef<number>();

  const reset = (_cleanup?: any) => {
    if (timer.current) clearTimeout(timer.current);
    queue.current = [];
    busy.current = false;
    setPending(new Set());
    setTyping(false);
  };

  useLayoutEffect(() => {
    reset();
    seen.current = new Set(items.map((i) => i.id));
    return reset;
  }, [thread]);

  const pump = () => {
    if (busy.current) return;
    const next = queue.current.shift();
    if (!next) {
      setTyping(false);
      return;
    }
    busy.current = true;
    setTyping(true);
    timer.current = window.setTimeout(() => {
      setPending((s) => {
        const n = new Set(s);
        n.delete(next.id);
        return n;
      });
      setTyping(false);
      busy.current = false;
      timer.current = window.setTimeout(pump, 400);
    }, typingMs(next));
  };

  useLayoutEffect(() => {
    const fresh = items.filter((i) => !seen.current.has(i.id));
    if (!fresh.length) return;
    fresh.forEach((i) => seen.current.add(i.id));
    const incoming = fresh.filter((i) => !i.outgoing);
    if (!incoming.length) return;
    setPending((s) => new Set([...s, ...incoming.map((i) => i.id)]));
    queue.current.push(...incoming);
    pump();
  }, [items]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return {
    visible: items.filter((i) => !pending.has(i.id)),
    typing,
  };
}
