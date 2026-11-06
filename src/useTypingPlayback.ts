import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** 依內容長度算「輸入中」要持續多久 */
const typingMs = (i: any) => {
  const custom = Number(i.typingMs || 0); // 劇情可手動指定,優先[cite: 1]
  if (custom > 0) return custom;
  if (i.kind !== "text") return 1200;               // 圖片、語音:短暫停頓即可[cite: 1]
  const base = 300 + i.body.length * 80;
  const jittered = base * (0.85 + Math.random() * 0.3); // ±15% 抖動,避免每則都像機器[cite: 1]
  return Math.min(Math.max(jittered, 700), 5000);   // 下限 0.7 秒,上限 5 秒[cite: 1]
};

export function useTypingPlayback(items: any[], thread?: string) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState(false);
  const seen = useRef(new Set<string>());
  const queue = useRef<any[]>([]);
  const busy = useRef(false);
  const timer = useRef<number>();

  const reset = () => {
    clearTimeout(timer.current);
    queue.current = [];
    busy.current = false;
    setPending(new Set());
    setTyping(false);
  };

  // 換聊天室:現有訊息都算歷史[cite: 1]
  useLayoutEffect(() => {
    reset();
    seen.current = new Set(items.map((i) => i.id));
    return reset;
  }, [thread]);

  const pump = () => {
    if (busy.current) return;
    const next = queue.current.shift();
    if (!next) return setTyping(false);
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
      timer.current = window.setTimeout(pump, 400); // 兩則之間的喘息[cite: 1]
    }, typingMs(next));
  };

  // 偵測新訊息(用 layout effect,避免新訊息先閃現一幀)[cite: 1]
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

  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    visible: items.filter((i) => !pending.has(i.id)),
    typing,
  };
}
```[cite: 1]
