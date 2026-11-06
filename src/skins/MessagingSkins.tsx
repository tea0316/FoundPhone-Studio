import { QQThread } from "./QQThread";
import { NativeComposer } from "../DeviceSystem";
import {
  CheckCheck,
  Compass,
  Hash,
  MessageCircle,
  Mic,
  Phone,
  Plus,
  Send,
  Smile,
  Users,
  Search, 
  Menu,   
} from "lucide-react";
import { useState } from "react";
import type { Item } from "../schema";
import {
  Add,
  Avatar,
  Empty,
  groupItems,
  Header,
  Media,
  meta,
  SearchBox,
  Tabs,
  useContent,
  type Props,
} from "./shared";

function Bubbles({
  p,
  items,
  className = "",
}: {
  p: Props;
  items: Item[];
  className?: string;
}) {
  return (
    <div className={`catalog-bubbles ${className}`}>
      <time className="bubble-date">{items[0]?.time.slice(0, 10)}</time>
      {items.map((i) => (
        <div
          className={`catalog-message ${i.outgoing ? "outgoing" : ""}`}
          key={i.id}
        >
          <button onClick={() => (p.creator ? p.onItem(i) : p.onRead(i.id))}>
            {["image", "video", "audio"].includes(i.kind) ? (
              <Media item={i} />
            ) : (
              i.body
            )}
            <small>
              {i.time.slice(-5)}
              {i.read && <CheckCheck size={10} />}
            </small>
          </button>
        </div>
      ))}
    </div>
  );
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const dayDiff = (a: string, b: string) =>
  Math.round((+new Date(b.slice(0, 10)) - +new Date(a.slice(0, 10))) / 864e5);
const weekday = (t: string) => WEEK[new Date(t.slice(0, 10)).getUTCDay()];

/** 故事自己的「今天」:取所有訊息中最新的一天 */
const storyNow = (items: Item[]) =>
  items.reduce((m, i) => (i.time > m ? i.time : m), "");

/** 聊天室日期分隔線:今天 / 昨天 / 2026/11/07(週六) */
function dayLabel(time: string, now: string) {
  const d = dayDiff(time, now);
  if (d === 0) return "今天";
  if (d === 1) return "昨天";
  return `${time.slice(0, 10).replaceAll("-", "/")}(週${weekday(time)})`;
}

/** 聊天列表右上角時間:HH:mm / 昨天 / 週X / M/D / YYYY/M/D */
function _listTime(time: string, now: string) {
  const d = dayDiff(time, now);
  if (d <= 0) return time.slice(-5);
  if (d === 1) return "昨天";
  if (d < 7) return `週${weekday(time)}`;
  return time.slice(0, 4) === now.slice(0, 4)
    ? `${+time.slice(5, 7)}/${+time.slice(8, 10)}`
    : time.slice(0, 10).replaceAll("-", "/");
}

function LineBubbles({ p, items, now }: { p: Props; items: Item[]; now: string }) {
  const isGroup =
    new Set(items.filter((i) => !i.outgoing).map((i) => i.sender)).size > 1;
  const sameRun = (a?: Item, b?: Item) =>
    !!a && !!b &&
    a.outgoing === b.outgoing &&
    a.sender === b.sender &&
    a.time.slice(0, 10) === b.time.slice(0, 10);

  return (
    <div className="line-bubbles">
      {items.map((i, idx) => {
        const prev = items[idx - 1];
        const next = items[idx + 1];
        const first = !sameRun(prev, i);
        const lastOfMinute =
          !(sameRun(i, next) && next!.time.slice(0, 16) === i.time.slice(0, 16));
        const newDay = !prev || prev.time.slice(0, 10) !== i.time.slice(0, 10);
        const isMedia = ["image", "video"].includes(i.kind);
        const lastOfRun = !sameRun(i, next);

        return (
          <div key={i.id}>
            {newDay && <time className="line-date">{dayLabel(i.time, now)}</time>}
            <div className={`line-row ${i.outgoing ? "out" : "in"}`}>
              {!i.outgoing &&
                (first ? (
                  <Avatar name={i.sender} src={i.avatar} round />
                ) : (
                  <span className="line-avatar-gap" />
                ))}
              <div className="line-col">
                {!i.outgoing && first && isGroup && (
                  <small className="line-name">{i.sender}</small>
                )}
                <div className="line-msg">
                  {i.outgoing && lastOfMinute && (
                    <span className="line-meta">
                      {i.read && lastOfRun && <em>已讀</em>}
                      {i.time.slice(-5)}
                    </span>
                  )}
                  <button
                    className={`line-bubble ${isMedia ? "media" : ""} ${first && !isMedia ? "tail" : ""}`}
                    onClick={() => (p.creator ? p.onItem(i) : p.onRead(i.id))}
                  >
                    {["image", "video", "audio"].includes(i.kind) ? (
                      <Media item={i} />
                    ) : (
                      i.body
                    )}
                  </button>
                  {!i.outgoing && lastOfMinute && (
                    <span className="line-meta">{i.time.slice(-5)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Composer({ p }: { p: Props }) {
  return (
    <div className="catalog-composer">
      <Plus size={19} />
      <NativeComposer creator={p.creator} onAdd={p.onAdd} />
      <Smile size={20} />
      <Mic size={18} />
    </div>
  );
}

function ChatRows({
  p,
  items,
  round = true,
}: {
  p: Props;
  items: Item[];
  round?: boolean;
}) {
  const names = [...new Set(items.map((i) => i.title))];
  return (
    <>
      {names.map((name) => {
        const last = items.filter((i) => i.title === name).at(-1)!;
        return (
          <button
            className="catalog-chat"
            key={name}
            onClick={() => {
              p.onThread(name);
              p.onRead(name);
            }}
          >
            <Avatar name={name} src={last.avatar} round={round} />
            <span>
              <strong>{name}</strong>
              <p>{last.body}</p>
            </span>
            <time>{last.time.slice(-5)}</time>
          </button>
        );
      })}
      <Empty items={items} />
    </>
  );
}

export function MessagesSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "訊息");
  const [unread, setUnread] = useState(false);
  return (
    <div className="catalog-skin native-messages">
      <Header
        p={{ ...p, onBack: () => (p.thread ? p.onThread("") : p.onBack()) }}
      />
      <div className="message-heading">
        <h1>{p.thread || "訊息"}</h1>
        {!p.thread && (
          <button onClick={() => setUnread(!unread)}>
            {unread ? "全部" : "未讀"}
          </button>
        )}
      </div>
      {p.thread ? (
        <>
          <Bubbles
            p={p}
            items={items.filter((i) => i.title === p.thread)}
            className="sms-bubbles"
          />
          <Composer p={p} />
        </>
      ) : (
        <div className="catalog-scroll">
          <SearchBox value={q} set={setQ} />
          <ChatRows
            p={p}
            items={unread ? items.filter((i) => !i.read) : items}
          />
        </div>
      )}
    </div>
  );
}

export function QQSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "訊息");
  const list = items.filter((i) => i.folder !== "空間" && i.kind !== "post");
  return (
    <div className="catalog-skin qq-ui">
      {!p.thread && <Header p={p} />}
      {!p.thread && (
        <div className="qq-profile-bar">
          <Avatar name={p.owner ?? "我"} />
          <div>
            <strong>{p.thread || p.owner || "我的QQ"}</strong>
            <small>QQ</small>
          </div>
        </div>
      )}
      {p.thread ? (
        <QQThread {...p} />
      ) : (
        <>
          <div className="catalog-scroll">
            <SearchBox value={q} set={setQ} />
            {tab === "訊息" ? (
              <ChatRows p={p} items={list} />
            ) : tab === "聯絡人" ? (
              <>
                {[...new Set(list.map((i) => i.sender))].map((s) => (
                  <button
                    key={s}
                    className="qq-contact"
                    onClick={() => {
                      const i = list.find((i) => i.sender === s);
                      if (i) p.onThread(i.title);
                    }}
                  >
                    <Avatar name={s} />
                    {s}
                  </button>
                ))}
              </>
            ) : (
              <div className="qq-space">
                <h2>好友動態</h2>
                {items
                  .filter((i) => i.folder === "空間" || i.kind === "post")
                  .map((i) => (
                    <button key={i.id} onClick={() => p.onItem(i)}>
                      <Avatar name={i.sender} src={i.avatar} />
                      <strong>{i.sender}</strong>
                      <p>{i.body}</p>
                      {i.media && <Media item={i} />}
                      <small>{i.time}</small>
                    </button>
                  ))}
                <Add p={p} label="新增空間動態" />
              </div>
            )}
          </div>
          <Tabs
            tabs={["訊息", "聯絡人", "空間"]}
            value={tab}
            set={setTab}
            icons={[<MessageCircle />, <Users />, <Compass />]}
          />
        </>
      )}
    </div>
  );
}

export function TelegramSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "全部");
  const [folder, setFolder] = useState("全部");
  const folders = ["全部", ...groupItems(items).filter((f) => f !== "未分類")];
  const list =
    folder === "全部" ? items : items.filter((i) => i.folder === folder);
  return (
    <div className="catalog-skin telegram-ui">
      <Header
        p={{ ...p, onBack: () => (p.thread ? p.onThread("") : p.onBack()) }}
      />
      {p.thread ? (
        <>
          <div className="telegram-peer">
            <Avatar name={p.thread} />
            <strong>{p.thread}</strong>
            <span>
              {list.filter((i) => i.title === p.thread).length} 則訊息
            </span>
          </div>
          <Bubbles
            p={p}
            items={items.filter((i) => i.title === p.thread)}
            className="telegram-bubbles"
          />
          <Composer p={p} />
        </>
      ) : (
        <>
          <div className="telegram-search">
            <SearchBox value={q} set={setQ} />
          </div>
          <div className="telegram-folders">
            {folders.map((f) => (
              <button
                className={folder === f ? "selected" : ""}
                key={f}
                onClick={() => setFolder(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="catalog-scroll">
            <ChatRows p={p} items={list} />
          </div>
          <div className="telegram-footer">
            <Send size={17} />
            聊天 · {list.length} 則紀錄
          </div>
        </>
      )}
    </div>
  );
}

export function DiscordSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "頻道");
  const servers = [
    ...new Set(items.map((i) => meta(i, "server", "故事伺服器"))),
  ];
  const [server, setServer] = useState(""),
    [channel, setChannel] = useState("");
  const current = server || servers[0] || "伺服器";
  const list = items.filter((i) => meta(i, "server", "故事伺服器") === current);
  const channels = groupItems(list, "general");
  const active = channel || channels[0] || "general";
  const messages = list.filter((i) => (i.folder || "general") === active);
  return (
    <div className="catalog-skin discord-ui">
      <Header p={p} />
      <div className="discord-layout">
        <aside className="discord-servers">
          {servers.map((s) => (
            <button
              aria-label={`伺服器${s}`}
              className={s === current ? "selected" : ""}
              key={s}
              onClick={() => {
                setServer(s);
                setChannel("");
                p.onRead(s);
              }}
            >
              {s.slice(0, 2)}
            </button>
          ))}
        </aside>
        <section className="discord-main">
          <div className="discord-server-name">
            <strong>{current}</strong>
            <Hash size={17} />
          </div>
          <div className="discord-channel-tabs">
            {channels.map((c) => (
              <button
                className={c === active ? "selected" : ""}
                key={c}
                onClick={() => {
                  setChannel(c);
                  p.onRead(c);
                }}
              >
                # {c}
              </button>
            ))}
          </div>
          <div className="discord-current">
            {tab === "頻道" ? (
              <>
                <Hash size={16} />
                {active}
              </>
            ) : (
              <>
                <Users size={16} />
                成員
              </>
            )}
          </div>
          <div className="catalog-scroll">
            {tab === "成員"
              ? [...new Set(list.map((i) => i.sender))].map((s) => (
                  <div key={s} className="discord-member">
                    <Avatar name={s} />
                    <span>
                      {s}
                      <small>
                        {meta(
                          list.find((i) => i.sender === s)!,
                          "status",
                          "虛構成員",
                        )}
                      </small>
                    </span>
                  </div>
                ))
              : messages.map((i) => (
                  <button
                    key={i.id}
                    className="discord-message"
                    onClick={() => p.onItem(i)}
                  >
                    <Avatar name={i.sender} />
                    <div>
                      <strong>{i.sender}</strong>
                      <time>{i.time.slice(-5)}</time>
                      <p>{i.body}</p>
                      {i.media && <Media item={i} />}
                    </div>
                  </button>
                ))}
            <Empty items={list} />
          </div>
          <Add p={p} label={`新增 #${active} 的訊息`} />
        </section>
      </div>
      <Tabs
        tabs={["頻道", "成員"]}
        value={tab}
        set={setTab}
        icons={[<Hash />, <Users />]}
      />
    </div>
  );
}

function LineBubbles({ p, items, now }: { p: Props; items: Item[]; now: string }) {
  const isGroup =
    new Set(items.filter((i) => !i.outgoing).map((i) => i.sender)).size > 1;
  const sameRun = (a?: Item, b?: Item) =>
    !!a && !!b &&
    a.outgoing === b.outgoing &&
    a.sender === b.sender &&
    a.time.slice(0, 10) === b.time.slice(0, 10);

  return (
    <div className="line-bubbles">
      {items.map((i, idx) => {
        const prev = items[idx - 1];
        const next = items[idx + 1];
        const first = !sameRun(prev, i);
        const lastOfMinute =
          !(sameRun(i, next) && next!.time.slice(0, 16) === i.time.slice(0, 16));
        const newDay = !prev || prev.time.slice(0, 10) !== i.time.slice(0, 10);
        const isMedia = ["image", "video"].includes(i.kind);
        const lastOfRun = !sameRun(i, next);

        // ==========================================
        // 系統訊息分支：置中灰底小膠囊
        // ==========================================
        if (i.kind === "system") {
          return (
            <div key={i.id}>
              {newDay && <time className="line-date">{dayLabel(i.time, now)}</time>}
              <div className="line-system-msg">
                <span>{i.body}</span>
              </div>
            </div>
          );
        }

        return (
          <div key={i.id}>
            {newDay && <time className="line-date">{dayLabel(i.time, now)}</time>}
            <div className={`line-row ${i.outgoing ? "out" : "in"}`}>
              {!i.outgoing &&
                (first ? (
                  <Avatar name={i.sender} src={i.avatar} round />
                ) : (
                  <span className="line-avatar-gap" />
                ))}
              <div className="line-col">
                {!i.outgoing && first && isGroup && (
                  <small className="line-name">{i.sender}</small>
                )}
                <div className="line-msg">
                  {i.outgoing && lastOfMinute && (
                    <span className="line-meta">
                      {i.read && lastOfRun && <em>已讀</em>}
                      {i.time.slice(-5)}
                    </span>
                  )}
                  <button
                    className={`line-bubble ${isMedia ? "media" : ""} ${first && !isMedia ? "tail" : ""}`}
                    onClick={() => (p.creator ? p.onItem(i) : p.onRead(i.id))}
                  >
                    {["image", "video", "audio"].includes(i.kind) ? (
                      <Media item={i} />
                    ) : (
                      i.body
                    )}
                  </button>
                  {!i.outgoing && lastOfMinute && (
                    <span className="line-meta">{i.time.slice(-5)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function LineChatRows({ p, items, now }: { p: Props; items: Item[]; now: string }) {
  const preview = (i: Item) =>
    ({ image: "傳送了照片", video: "傳送了影片", audio: "傳送了語音訊息" } as Record<string, string>)[i.kind] ?? i.body;

  const rows = [...new Set(items.map((i) => i.title))]
    .map((name) => {
      const mine = items.filter((i) => i.title === name);
      const last = mine.at(-1)!;
      return {
        name,
        last,
        unread: mine.filter((i) => !i.outgoing && !i.read).length,
        pinned: meta(last, "pinned", "") === "1",
      };
    })
    .sort((a, b) => +b.pinned - +a.pinned || b.last.time.localeCompare(a.last.time));

  return (
    <>
      {rows.map(({ name, last, unread, pinned }) => (
        <button
          key={name}
          className={`line-chat ${pinned ? "pinned" : ""}`}
          onClick={() => { p.onThread(name); p.onRead(name); }}
        >
          <Avatar name={name} src={last.avatar} round />
          <span className="line-chat-main">
            <strong>{name}</strong>
            <p>{preview(last)}</p>
          </span>
          <span className="line-chat-side">
            <time>{_listTime(last.time, now)}</time>
            {unread > 0 && <b className="line-badge">{unread > 99 ? "99+" : unread}</b>}
          </span>
        </button>
      ))}
      <Empty items={items} />
    </>
  );
}

export function LineSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "聊天");
  const now = storyNow(items);

  // 計算全域總未讀數字，供返回按鈕旁邊顯示
  const totalUnread = items.filter((i) => !i.outgoing && !i.read).length;

  return (
    <div className="catalog-skin line-ui">
      {p.thread ? (
        <>
          {/* 3. 聊天室標題列 (左返回含未讀、中名字、右三圖示) */}
          <div className="line-chat-header">
            <button onClick={() => p.onThread("")}>
              ‹ {totalUnread || ""}
            </button>
            <strong>{p.thread}</strong>
            <span>
              <Search size={20} />
              <Phone size={20} />
              <Menu size={20} />
            </span>
          </div>

          <LineBubbles
            p={p}
            items={items.filter((i) => i.title === p.thread)}
            now={now}
          />
          <Composer p={p} />
        </>
      ) : (
        <>
          <Header p={p} />
          <div className="catalog-scroll">
            <h1>{tab}</h1>
            <SearchBox value={q} set={setQ} />
            {tab === "聊天" ? (
              <LineChatRows p={p} items={items} now={now} />
            ) : (
              <>
                <div className="line-owner">
                  <Avatar name={p.owner ?? "我"} />
                  <h2>{p.owner ?? "我"}</h2>
                </div>
                <h4>好友</h4>
                <div className="line-friends">
                  {[...new Set(items.map((i) => i.sender))].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        const i = items.find((i) => i.sender === s);
                        if (i) p.onThread(i.title);
                      }}
                    >
                      <Avatar name={s} />
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Tabs
            tabs={["好友", "聊天"]}
            value={tab}
            set={setTab}
            icons={[<Users />, <MessageCircle />]}
          />
        </>
      )}
    </div>
  );
}

export function MessengerSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "聊天");
  return (
    <div className="catalog-skin messenger-ui">
      <Header
        p={{ ...p, onBack: () => (p.thread ? p.onThread("") : p.onBack()) }}
      />
      {p.thread ? (
        <>
          <div className="messenger-peer">
            <Avatar name={p.thread} />
            <strong>{p.thread}</strong>
            <Phone size={18} />
          </div>
          <Bubbles
            p={p}
            items={items.filter((i) => i.title === p.thread)}
            className="messenger-bubbles"
          />
          <Composer p={p} />
        </>
      ) : (
        <>
          <div className="catalog-scroll">
            <h1>{tab}</h1>
            <SearchBox value={q} set={setQ} />
            <div className="messenger-people">
              {[...new Set(items.map((i) => i.sender))].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const i = items.find((i) => i.sender === s);
                    if (i) p.onThread(i.title);
                  }}
                >
                  <Avatar name={s} />
                  <small>{s}</small>
                </button>
              ))}
            </div>
            {tab === "聊天" ? (
              <ChatRows p={p} items={items} />
            ) : (
              <div className="messenger-contacts">
                {items.map((i) => (
                  <button key={i.id} onClick={() => p.onItem(i)}>
                    <Avatar name={i.sender} />
                    <strong>{i.sender}</strong>
                    <small>{i.title}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Tabs
            tabs={["聊天", "聯絡人"]}
            value={tab}
            set={setTab}
            icons={[<MessageCircle />, <Users />]}
          />
        </>
      )}
    </div>
  );
}
