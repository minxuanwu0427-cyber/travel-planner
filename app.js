/* ==========================================================================
   出國旅遊行程規劃網站 — vanilla JS 實作
   由 Claude Design 原型 (#U65c5#U904a#U898f#U5283.dc.html) 轉換而成
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* 常數                                                                    */
/* ---------------------------------------------------------------------- */
const CATEGORY_META = {
  "交通": { icon: "car", tagBg: "oklch(92% 0.045 250)", tagFg: "oklch(40% 0.11 250)" },
  "景點": { icon: "map-pin", tagBg: "oklch(92% 0.05 25)", tagFg: "oklch(42% 0.15 25)" },
  "餐飲": { icon: "utensils", tagBg: "oklch(92% 0.07 95)", tagFg: "oklch(42% 0.11 95)" },
  "購物": { icon: "shopping-bag", tagBg: "oklch(92% 0.05 305)", tagFg: "oklch(42% 0.13 305)" },
  "住宿": { icon: "bed", tagBg: "oklch(92% 0.05 145)", tagFg: "oklch(40% 0.1 145)" },
  "其他": { icon: "circle", tagBg: "var(--color-neutral-200)", tagFg: "var(--color-neutral-700)" }
};
/* 這幾個分類的圖示直接內嵌 SVG 路徑（不透過 lucide.createIcons() 動態產生）。
   某些裝置上曾出現 lucide 圖示載入不完整、部分圖示（例如餐飲、住宿）顯示成亂碼文字的狀況，
   直接內嵌可以避免依賴 lucide.js 在該裝置上是否正確執行 */
const CATEGORY_ICON_SVG = {
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  "map-pin": '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  "shopping-bag": '<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>',
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  circle: '<circle cx="12" cy="12" r="10"/>'
};
function categoryIconSvg(iconName, size, color) {
  const inner = CATEGORY_ICON_SVG[iconName] || CATEGORY_ICON_SVG.circle;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
const CATEGORY_OPTIONS = ["交通", "景點", "餐飲", "購物", "住宿", "其他"];
const BUDGET_CATS = ["個人", "票券", "交通", "住宿", "其他"];
const PREP_CATS = ["票券", "保險&金融相關", "其他"];
const PACKING_CATS = ["重要物品", "3C", "衣物", "個人用品", "藥品", "其他"];
const BAG_TAGS = ["隨身", "登機箱", "託運"];
/* 行前準備的公版內容：新建立行程時當作起始清單，也是「重置成最新公版」功能會套用的內容
   現在「待辦」已經拆成共用區（團體/個人）跟私人筆記區兩塊——這裡改成空白，
   私人待辦預設不塞任何項目，純粹當作旅伴自己想記點筆記用的空白清單 */
function buildDefaultPrepTemplate() {
  return {};
}
/* 待辦(共用區) 的公版內容：團體項目大家共用同一個勾選狀態（只有主揪能打勾），
   個人項目大家共用清單、但各自打勾 —— 內容整理自 Maxine 提供的分類文件 */
function buildDefaultSharedTodo() {
  const mkGroup = (cat, labels) => labels.map(label => ({ id: uid("sg"), category: cat, label, done: false }));
  const mkPersonal = (cat, labels) => labels.map(label => ({ id: uid("sp"), category: cat, label, checkedBy: [] }));
  return {
    group: [
      ...mkGroup("票券", ["交通票", "遊樂園/水族館/展覽門票", "古城/景點門票"]),
      ...mkGroup("保險&金融相關", ["自駕保險確認"]),
      ...mkGroup("其他", ["航班/住宿/租車資訊", "體驗行程預約", "餐廳預約"])
    ],
    personal: [
      ...mkPersonal("保險&金融相關", ["旅平險投保", "海外刷卡額度調整", "外幣現鈔準備"]),
      ...mkPersonal("其他", ["護照效期確認", "駕照譯本申請", "簽證/數位入境"])
    ]
  };
}
function buildDefaultPackingTemplate() {
  // items: [標籤文字, 隨身/登機箱/託運, 是否鎖定（true 時不管誰操作都不能被改成別的標籤）]
  const mk = items => items.map(([label, bagTag, locked]) => ({ id: uid("t"), label, done: false, bagTag: bagTag || null, locked: !!locked }));
  return {
    "重要物品": mk([
      ["機票/護照", "隨身"], ["身分證件", "隨身"], ["駕照/譯本/交通卡", "隨身"], ["信用卡/現金", "隨身"], ["鑰匙", "隨身"]
    ]),
    "3C": mk([
      ["耳機", "隨身"], ["SIM卡/eSIM", "隨身"], ["手機", "隨身"], ["筆電/平板", "隨身"], ["行動電源", "隨身", true], ["充電器/萬國插頭", "登機箱"]
    ]),
    "衣物": mk([
      ["外衣", "託運"], ["內衣褲/襪子", "託運"], ["配件(帽子/圍巾/絲巾)", "託運"], ["睡衣", "託運"], ["泳衣", "託運"], ["鞋子/拖鞋", "託運"], ["髒衣袋", "託運"]
    ]),
    "個人用品": mk([
      ["衛生紙/濕紙巾/衛生棉", "隨身"], ["外套", "隨身"], ["墨鏡", "登機箱"], ["隱形眼鏡/眼鏡", "登機箱"], ["卸妝/洗面乳", "託運"], ["牙刷/牙膏", "託運"], ["刮鬍刀/除毛刀", "託運"], ["保養品", "託運"], ["化妝包/防曬乳", "託運"], ["離子夾/髮品", "託運"]
    ]),
    "藥品": mk([
      ["慢性病處方用藥", "隨身"], ["暈機藥/暈船藥", "隨身"], ["過敏藥", "隨身"], ["胃藥", "登機箱"], ["止痛藥", "登機箱"]
    ]),
    "其他": mk([
      ["口罩", "隨身"], ["摺疊雨傘", "登機箱"], ["行李秤", "登機箱"], ["頸枕", "登機箱"], ["眼罩/耳塞", "託運"], ["當地伴手禮", "託運"]
    ])
  };
}
const DEFAULT_PREP_NOTES = `需查詢規定⚠️：高壓氣罐、電池類產品、大量藥品、嬰兒食品、尖銳物、打火機
嚴格禁止🚫：易燃物、新鮮水果、植物/土壤、生鮮肉類及禽蛋類、含肉加工食品(肉鬆、香腸、肉乾等)、部分特定保久乳和奶粉

僅能託運：液體超過100ml、酒類、直傘
僅能隨身：行動電源、手持電風扇、電池
隨身液體規定：容器每個須小於100ml、總量1公升內，限用20×20公分透明夾鏈袋，每人限帶一袋上機`;
const CATEGORY_EMOJI = { "票券": "🎫", "保險&金融相關": "🛡️", "重要物品": "🔑", "3C": "🔌", "衣物": "👕", "個人用品": "🧴", "藥品": "💊", "其他": "📦" };
/* 部分分類名稱後面要帶一小段提醒文字（例如藥品類別的用量提醒） */
const CATEGORY_NOTE = { "藥品": "※適量自用、保留原包裝" };
/* 莫蘭迪色系（低飽和霧感色調），給每位旅伴的頭像底色用 */
const PEOPLE_COLORS = ["#A98F82", "#8FA593", "#8C9CB0", "#B79A8E", "#9C93A6", "#AD9E7E", "#7F9E97", "#B08D8B"];
const MEMO_TAG_CLASSES = ["tag-accent", "tag-accent-2", "tag-neutral", "tag-outline"];
const SECTION_TABS = [
  { id: "overview", label: "總覽", icon: "layout-dashboard" },
  { id: "prep", label: "行前準備", icon: "clipboard-check" },
  { id: "itinerary", label: "行程", icon: "calendar-days" },
  { id: "budget", label: "預算", icon: "wallet" },
  { id: "memo", label: "備忘錄", icon: "shopping-bag" }
];
const STORAGE_KEY = "travel-planner-state-v1";
const IDENTITY_KEY = "travel-planner-identity-map";
const FX_STORAGE_KEY = "travel-planner-fx-rates-v1";
const UNLOCKED_TRIPS_KEY = "travel-planner-unlocked-trips";
const VIEW_ONLY_KEY = "travel-planner-view-only-mode";
/* 依國家對應目的地當地貨幣 */
const LOCAL_CURRENCY_BY_TRIP = {
  okinawa: { code: "JPY", symbol: "¥" },
  busan: { code: "KRW", symbol: "₩" }
};
function localCurrencyForTrip(trip) {
  if (LOCAL_CURRENCY_BY_TRIP[trip.id]) return LOCAL_CURRENCY_BY_TRIP[trip.id];
  if (/日本/.test(trip.country)) return { code: "JPY", symbol: "¥" };
  if (/韓/.test(trip.country)) return { code: "KRW", symbol: "₩" };
  return null;
}

/* ---------------------------------------------------------------------- */
/* 小工具                                                                  */
/* ---------------------------------------------------------------------- */
function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtMoney(n) { return Math.round(n || 0).toLocaleString(); }
/* 解析行程總覽的日期範圍文字（例如「2026/10/08 - 2026/10/12（5天4夜）」），抓出起訖日期，
   用來讓行程頁的每天日期、住宿日期能跟著大標題下方那行文字連動，不用兩邊分開改 */
function parseDateRangeText(text) {
  // 容忍不同的分隔符號（半形-、全形－、–、~）跟前後空白，避免因為打字習慣不同而解析失敗
  const m = (text || "").match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*[-－–~]\s*(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const end = new Date(Number(m[4]), Number(m[5]) - 1, Number(m[6]));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
  return { start, end };
}
function formatMonthDay(date) { return `${date.getMonth() + 1}/${date.getDate()}`; }
function addDays(date, n) { return new Date(date.getTime() + n * 86400000); }
function isoToDate(iso) {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}
function dateToIso(date) {
  const yyyy = date.getFullYear(), mm = String(date.getMonth() + 1).padStart(2, "0"), dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function formatFullDate(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0"), dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}/${mm}/${dd}`;
}
function tripDurationLabel(trip) {
  const start = isoToDate(trip.dateStart), end = isoToDate(trip.dateEnd);
  if (!start || !end || end < start) return "";
  const nights = Math.round((end - start) / 86400000);
  return `${nights + 1}天${nights}夜`;
}
/* 從每天的行程項目自動推算「住宿一覽」：同一天可能中途先 check-in、之後又跑去別的地方，
   所以取當天最後一筆「住宿」類別的項目代表那一晚實際入住的地方；連續好幾天都是同一間，
   就合併成一筆（顯示日期區間＋晚數） */
function computeStaysFromDays(days) {
  const dayHotels = (days || []).map(d => {
    const stayItems = d.items.filter(it => it.category === "住宿");
    const last = stayItems[stayItems.length - 1];
    return last ? last.title.trim() : "";
  });
  const stays = [];
  let i = 0;
  while (i < dayHotels.length) {
    if (!dayHotels[i]) { i++; continue; }
    const hotel = dayHotels[i];
    let j = i;
    while (j + 1 < dayHotels.length && dayHotels[j + 1] === hotel) j++;
    const startDay = days[i], endDay = days[j];
    const range = i === j ? (startDay.dateLabel || "") : `${startDay.dateLabel || ""} - ${endDay.dateLabel || ""}`;
    stays.push({ id: "auto-stay-" + i, range, nights: j - i + 1, name: hotel });
    i = j + 1;
  }
  return stays;
}
/* 估算 textarea 需要幾行才能一次顯示完全部文字（含換行與自動換行），避免還要滑動才看得到全文 */
function estimateTextareaRows(text, minRows, charsPerLine) {
  const perLine = charsPerLine || 22;
  const lines = (text || "").split("\n");
  let total = 0;
  for (const line of lines) total += Math.max(1, Math.ceil(line.length / perLine));
  return Math.max(minRows || 3, total);
}
function parseGoogleMapsLocation(raw) {
  const val = (raw || "").trim();
  const isMapsUrl = /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(val);
  if (!isMapsUrl) return { name: val, url: "" };
  // /maps/place/NAME/... 或 /maps/place/NAME
  let m = val.match(/\/maps\/place\/([^/@?]+)/);
  if (m) return { name: decodeURIComponent(m[1].replace(/\+/g, " ")), url: val };
  // /maps?q=NAME 或 /maps/search/?api=1&query=NAME（排除純座標）
  m = val.match(/[?&]q(?:uery)?=([^&]+)/);
  if (m) {
    const q = decodeURIComponent(m[1].replace(/\+/g, " "));
    if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(q)) return { name: q, url: val };
  }
  // 短網址（maps.app.goo.gl／goo.gl/maps）本地端無法解析出地標名稱，回傳 name:null 讓呼叫端嘗試線上解析或請使用者手動輸入
  return { name: null, url: val };
}
/* 嘗試解析 Google 地圖短網址背後的實際地標名稱（僅在有網路時才會成功，失敗就靜靜放棄，不影響其他功能） */
async function resolveGoogleMapsShortLink(url) {
  try {
    const res = await fetch("https://r.jina.ai/" + url);
    if (!res.ok) return null;
    const text = await res.text();
    const titleMatch = text.match(/^Title:\s*(.+)$/m);
    if (!titleMatch) return null;
    let title = titleMatch[1].trim();
    title = title.replace(/\s*[-·|]\s*Google\s*(地圖|Maps).*$/i, "").trim();
    return title || null;
  } catch (e) {
    return null;
  }
}
function reorderList(arr, fromId, toId) {
  const fromIdx = arr.findIndex(x => x.id === fromId);
  const toIdx = arr.findIndex(x => x.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return arr;
  const copy = [...arr];
  const [item] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, item);
  return copy;
}
function reorderWithinGroup(arr, groupField, groupValue, fromId, toId) {
  const matches = groupValue == null ? arr : arr.filter(x => x[groupField] === groupValue);
  const fromIdx = matches.findIndex(x => x.id === fromId);
  const toIdx = matches.findIndex(x => x.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return arr;
  const newMatches = [...matches];
  const [item] = newMatches.splice(fromIdx, 1);
  newMatches.splice(toIdx, 0, item);
  let mi = 0;
  return arr.map(x => (groupValue == null || x[groupField] === groupValue) ? newMatches[mi++] : x);
}
function reorderWithinPredicate(arr, predicate, fromId, toId) {
  const matches = arr.filter(predicate);
  const fromIdx = matches.findIndex(x => x.id === fromId);
  const toIdx = matches.findIndex(x => x.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return arr;
  const newMatches = [...matches];
  const [item] = newMatches.splice(fromIdx, 1);
  newMatches.splice(toIdx, 0, item);
  let mi = 0;
  return arr.map(x => predicate(x) ? newMatches[mi++] : x);
}
function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys[keys.length - 1]] = val;
}

/* ---------------------------------------------------------------------- */
/* 預設資料                                                                 */
/* ---------------------------------------------------------------------- */
function initialData() {
  return [
    {
      id: "okinawa", name: "沖繩島嶼散策", country: "日本・沖繩", flag: "🇯🇵",
      collaborators: [
        { id: "p1", name: "小美", initial: "美", permission: "編輯", colorIdx: 0, isPrimaryEditor: true },
        { id: "p2", name: "阿傑", initial: "傑", permission: "編輯", colorIdx: 1 }
      ],
      dateRange: "2026/10/08 - 2026/10/12（5天4夜）", dateStart: "2026-10-08", dateEnd: "2026-10-12",
      flight: { out: "10/8 桃園 → 那霸　CI 108　09:15", back: "10/12 那霸 → 桃園　CI 109　18:40" },
      stays: [{ id: "st1", name: "那霸月光海景飯店", range: "10/8 - 10/12", nights: 4 }],
      notes: "出境行李：液體單件不超過100ml並裝入透明夾鏈袋。\n入境沖繩：入境卡建議先在機上填寫，租車需國際駕照+台灣駕照正本。\n託運行李：防曬品、噴霧罐請放託運，不可手提。",
      days: [
        { id: "ok-d1", index: 1, dateLabel: "10/8", title: "國際通", items: [
          { id: "i1", time: "09:15", title: "抵達那霸機場", category: "交通", location: "那霸空港", locationUrl: "", note: "", hasPhoto: false },
          { id: "i2", time: "15:00", title: "國際通逛街", category: "景點", location: "那霸市國際通", locationUrl: "", note: "", hasPhoto: false },
          { id: "i3", time: "19:00", title: "沖繩麵晚餐", category: "餐飲", location: "牧志公設市場附近", locationUrl: "", note: "", hasPhoto: false },
          { id: "i9", time: "20:30", title: "月光海景飯店 Check-in", category: "住宿", location: "那霸市", locationUrl: "", note: "", hasPhoto: false }
        ]},
        { id: "ok-d2", index: 2, dateLabel: "10/9", title: "首里城", items: [
          { id: "i4", time: "10:00", title: "首里城參觀", category: "景點", location: "首里金城町", locationUrl: "", note: "建議先線上購票，避開中午人潮", hasPhoto: true }
        ]},
        { id: "ok-d3", index: 3, dateLabel: "10/10", title: "", items: [] },
        { id: "ok-d4", index: 4, dateLabel: "10/11", title: "", items: [] }
      ],
      packing: {
        "重要物品": [{ id: "p1", label: "護照效期確認", done: true }, { id: "p4", label: "租車國際駕照", done: false }],
        "3C": [], "衣物": [{ id: "p2", label: "防水拖鞋 / 泳衣", done: true }],
        "個人用品": [{ id: "p3", label: "防曬乳", done: false }], "藥品": [], "其他": []
      },
      prep: {
        "票券": [{ id: "t1", label: "美麗海水族館電子票", done: true }, { id: "t2", label: "首里城門票", done: false }],
        "保險&金融相關": [{ id: "s1", label: "旅平險投保", done: false }],
        "其他": [{ id: "o1", label: "租車預約確認", done: false }, { id: "o2", label: "Wi-Fi 機預訂", done: true }]
      },
      budget: [
        { id: "b1", category: "票券", label: "美麗海水族館門票", amount: 1900, currency: "TWD", payerIds: ["p1", "p2"] },
        { id: "b2", category: "交通", label: "單軌電車一日券", amount: 800, currency: "TWD", payerIds: ["p1", "p2"] },
        { id: "b3", category: "住宿", label: "月光海景飯店 4 晚", amount: 16000, currency: "TWD", payerIds: ["p1", "p2"] },
        { id: "b4", category: "其他", label: "網路吃到飽", amount: 500, currency: "TWD", payerIds: ["p1"] },
        { id: "b7", category: "其他", label: "沖繩麵晚餐（現場付現）", amount: 1200, currency: "JPY", payerIds: ["p1", "p2"] }
      ],
      memoTags: ["藥妝店", "百貨公司"],
      memoItems: [
        { id: "m1", tag: "藥妝店", ownerId: "p1", name: "SHISEIDO 防曬乳", price: 680, currency: "TWD", hasPhoto: false },
        { id: "m2", tag: "百貨公司", ownerId: "p2", name: "沖繩黑糖伴手禮", price: 1580, currency: "JPY", hasPhoto: false }
      ]
    },
    {
      id: "busan", name: "釜山之旅", country: "韓國・釜山", flag: "🇰🇷",
      collaborators: [
        { id: "p1", name: "小美", initial: "美", permission: "編輯", colorIdx: 0, isPrimaryEditor: true },
        { id: "p4", name: "小玲", initial: "玲", permission: "編輯", colorIdx: 1 },
        { id: "p5", name: "Emma", initial: "E", permission: "編輯", colorIdx: 2 },
        { id: "p6", name: "Sam", initial: "S", permission: "檢視", colorIdx: 3 }
      ],
      dateRange: "2026/12/03 - 2026/12/08（6天5夜）", dateStart: "2026-12-03", dateEnd: "2026-12-08",
      flight: { out: "12/3 桃園 → 金海　7C 2602　11:20", back: "12/8 金海 → 桃園　7C 2601　20:05" },
      stays: [{ id: "st2", name: "海雲台海景公寓", range: "12/3 - 12/8", nights: 5 }],
      notes: "出境：韓幣建議先換一部分現金，機場匯率較差。\n入境：K-ETA 需提前申請完成。\n託運行李：辣椒醬、罐頭類建議託運，不可手提超量液體。",
      days: [
        { id: "bs-d1", index: 1, dateLabel: "12/3", title: "海雲台", items: [
          { id: "i5", time: "11:20", title: "抵達金海機場", category: "交通", location: "金海國際機場", locationUrl: "", note: "", hasPhoto: false },
          { id: "i6", time: "18:00", title: "海雲台海邊散步", category: "景點", location: "海雲台海水浴場", locationUrl: "", note: "", hasPhoto: false }
        ]},
        { id: "bs-d2", index: 2, dateLabel: "12/4", title: "甘川洞文化村", items: [
          { id: "i7", time: "11:00", title: "甘川洞文化村", category: "景點", location: "甘川洞", locationUrl: "", note: "階梯多，建議穿好走的鞋", hasPhoto: true },
          { id: "i8", time: "13:30", title: "豬肉湯飯午餐", category: "餐飲", location: "西面", locationUrl: "", note: "", hasPhoto: false }
        ]}
      ],
      packing: {
        "重要物品": [{ id: "p5", label: "T-money 交通卡", done: false }, { id: "p7", label: "韓幣現金", done: false }],
        "3C": [], "衣物": [{ id: "p6", label: "保暖外套", done: true }], "個人用品": [], "藥品": [], "其他": []
      },
      prep: {
        "票券": [{ id: "t3", label: "海雲台藍線公園票", done: false }],
        "保險&金融相關": [{ id: "s2", label: "旅平險投保", done: true }],
        "其他": [{ id: "o3", label: "K-ETA 申請", done: true }]
      },
      budget: [
        { id: "b5", category: "交通", label: "機場快線", amount: 900, currency: "TWD", payerIds: ["p1"] },
        { id: "b6", category: "住宿", label: "海雲台海景公寓 5 晚", amount: 12000, currency: "TWD", payerIds: ["p1"] }
      ],
      memoTags: ["藥妝店"],
      memoItems: [{ id: "m3", tag: "藥妝店", ownerId: "p4", name: "雪花秀面膜", price: 45000, currency: "KRW", hasPhoto: false }]
    }
  ];
}

function defaultUiState() {
  return {
    editingCollabId: null, editCollabName: "",
    itemModalOpen: false, budgetModalOpen: false, memoModalOpen: false, shareModalOpen: false, identityModalOpen: false,
    addTripModalOpen: false, newTripName: "", newTripCountry: "", newTripFlag: "", newTripDateStart: "", newTripDateEnd: "",
    editingItemId: null,
    formTime: "", formTitle: "", formCategory: "景點", formLocation: "", formLocationUrl: "", formNote: "",
    formId: null, formAlert: "", formDocs: [],
    docGalleryItemId: null, docGalleryIndex: 0,
    budgetFormCategory: "票券", budgetFormLabel: "", budgetFormAmount: "", budgetFormCurrency: "TWD", budgetFormPayerIds: [], budgetFormDayId: "",
    memoFormTag: "", memoFormName: "", memoFormPrice: "", memoFormCurrency: "TWD", memoFormId: null,
    newGuestName: "",
    isEditingTripName: false, tripNameDraft: "",
    collabMenuOpen: false,
    expandedItemIds: [],
    lightboxSrc: null,
    expandedGroups: {},
    draggingItemId: null,
    connectionError: false,
    unlockModalOpen: false, unlockError: "",
    editingMemoTag: null,
    swapDayModalOpen: false,
    checklistEditMode: {},
    packingViewMode: "tag",
    sharedTodoTab: "group",
    sharedTodoEditMode: false,
    prepMainTab: "todo",
    moveItemId: null
  };
}
function defaultCollaborators() {
  return [
    { id: "p1", name: "小美", initial: "美", permission: "編輯", colorIdx: 0, isPrimaryEditor: true },
    { id: "p2", name: "阿傑", initial: "傑", permission: "編輯", colorIdx: 1 },
    { id: "p3", name: "Lin", initial: "L", permission: "檢視", colorIdx: 2 }
  ];
}
/* 補齊 Firestore 上可能缺漏的欄位（例如舊資料沒有 currency / payerIds），避免畫面壞掉 */
function normalizeTrip(trip, legacyCollaborators) {
  // 舊資料可能沒有 dateStart/dateEnd（改成日期選擇器之前用的是一整串文字）—— 從既有的
  // dateRange 文字反推出來，選擇器才有預設值可以顯示
  let dateStart = trip.dateStart, dateEnd = trip.dateEnd;
  if (!dateStart || !dateEnd) {
    const parsed = parseDateRangeText(trip.dateRange);
    if (parsed) { dateStart = dateStart || dateToIso(parsed.start); dateEnd = dateEnd || dateToIso(parsed.end); }
  }
  // 舊資料可能還沒有「每個行程自己的旅伴名單」（改版前所有行程共用同一份旅伴）——
  // 沒有的話先用舊的共用名單當起始值，之後每個行程就能各自增減旅伴。
  // 注意：只有在完全「沒有這個欄位」時才視為舊資料、套用備援；如果雲端裡明確存了一個空陣列
  // （理論上不該發生，因為「刪除旅伴」已經擋掉刪到剩 0 個），也絕對不能默默改顯示成寫死的假旅伴，
  // 那樣等於是無聲蓋掉真實資料，寧可讓畫面留空、之後可以再手動補回來。
  const collaborators = trip.collaborators
    ? trip.collaborators
    : (legacyCollaborators && legacyCollaborators.length ? legacyCollaborators : defaultCollaborators());
  return {
    ...trip,
    dateStart: dateStart || "", dateEnd: dateEnd || "",
    collaborators,
    budget: (trip.budget || []).map(b => ({
      ...b,
      currency: b.currency || "TWD",
      payerIds: b.payerIds || (b.payerId ? [b.payerId] : collaborators.map(p => p.id))
    })),
    memoItems: (trip.memoItems || []).map(m => ({ ...m, currency: m.currency || "TWD" })),
    personalChecklist: trip.personalChecklist || [],
    documents: trip.documents || [],
    sharedTodo: trip.sharedTodo || buildDefaultSharedTodo()
  };
}

/* ---------------------------------------------------------------------- */
/* 狀態管理（Firestore 為單一資料來源，即時同步給所有旅伴）                    */
/* ---------------------------------------------------------------------- */
let state = {
  trips: [],
  activeTripId: null,
  activeDayId: null,
  activeSectionTab: "overview",
  itineraryFilter: "all",
  memoTagFilter: "all",
  currentUserId: null,
  collaborators: [],
  images: {},
  fx: null,
  unlockedTrips: [],
  viewOnlyMode: false,
  ui: defaultUiState()
};

function loadIdentityMap() {
  try { return JSON.parse(localStorage.getItem(IDENTITY_KEY) || "{}"); } catch (e) { return {}; }
}
function saveIdentityMap(map) {
  try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(map)); } catch (e) {}
}

/* 這台裝置解鎖過的其他行程（輸入正確密碼後記住，之後不用每次重打） */
function loadUnlockedTrips() {
  try { return JSON.parse(localStorage.getItem(UNLOCKED_TRIPS_KEY) || "[]"); } catch (e) { return []; }
}
function saveUnlockedTrips(list) {
  try { localStorage.setItem(UNLOCKED_TRIPS_KEY, JSON.stringify(list)); } catch (e) {}
}
state.unlockedTrips = loadUnlockedTrips();
// 把某個行程標記成「這台裝置看得到」，用在：分享連結第一次打開的行程、密碼解鎖過的行程、
// 自己新建立的行程 —— 這三種情況都不該事後又被選單擋住
function markTripUnlocked(tripId) {
  if (!tripId || state.unlockedTrips.includes(tripId)) return;
  state.unlockedTrips = [...state.unlockedTrips, tripId];
  saveUnlockedTrips(state.unlockedTrips);
}

/* 「檢視模式」：編輯者自己想單純瀏覽、不想看到編輯按鈕時可以手動切換，跟裝置綁定 */
function loadViewOnlyMode() {
  try { return localStorage.getItem(VIEW_ONLY_KEY) === "1"; } catch (e) { return false; }
}
function saveViewOnlyMode(on) {
  try { localStorage.setItem(VIEW_ONLY_KEY, on ? "1" : "0"); } catch (e) {}
}
state.viewOnlyMode = loadViewOnlyMode();

/* 匯率快取（每天最多打一次 API，抓不到就靜靜不顯示換算） */
let fxFetching = false;
function loadFxCache() {
  try { return JSON.parse(localStorage.getItem(FX_STORAGE_KEY) || "null"); } catch (e) { return null; }
}
function saveFxCache(data) {
  try { localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}
state.fx = loadFxCache();
function ensureFxRates() {
  const today = new Date().toISOString().slice(0, 10);
  if (fxFetching || (state.fx && state.fx.date === today)) return;
  fxFetching = true;
  fetch("https://open.er-api.com/v6/latest/TWD")
    .then(res => res.json())
    .then(data => {
      if (data && data.result === "success" && data.rates) {
        state.fx = { rates: data.rates, date: today };
        saveFxCache(state.fx);
        render();
      }
    })
    .catch(() => { /* 離線或被擋下就不顯示換算，不影響其他功能 */ })
    .finally(() => { fxFetching = false; });
}
function convertToLocal(amountTWD, trip) {
  const cur = localCurrencyForTrip(trip);
  if (!cur || !state.fx || !state.fx.rates || state.fx.rates[cur.code] == null) return null;
  const converted = amountTWD * state.fx.rates[cur.code];
  return `≈ ${cur.symbol}${Math.round(converted).toLocaleString()}`;
}
const CURRENCY_META = {
  TWD: { symbol: "NT$", label: "NT$ 台幣" },
  JPY: { symbol: "¥", label: "¥ 日圓" },
  KRW: { symbol: "₩", label: "₩ 韓元" }
};
function currencySymbol(code) { return (CURRENCY_META[code] || CURRENCY_META.TWD).symbol; }
/* 把任何幣別金額換算成台幣（用來加總，避免不同幣別的金額被直接相加） */
function toTWD(amount, currency) {
  if (!currency || currency === "TWD") return amount;
  if (!state.fx || !state.fx.rates || !state.fx.rates[currency]) return null;
  return amount / state.fx.rates[currency]; // rates[currency] = 該幣別 per 1 TWD
}
/* 顯示某筆花費換算成「另一種幣別」的灰色小字：TWD 項目換算成當地貨幣；當地貨幣項目換算回台幣 */
function convertedTextForItem(item, trip) {
  const cur = item.currency || "TWD";
  if (cur === "TWD") return convertToLocal(item.amount, trip);
  const twd = toTWD(item.amount, cur);
  if (twd == null) return null;
  return `≈ NT$${fmtMoney(twd)}`;
}

function findTrip() { return state.trips.find(t => t.id === state.activeTripId); }
function findDay() { const trip = findTrip(); return trip.days.find(d => d.id === state.activeDayId); }
function mutateTrip(fn) {
  let updated = null;
  state.trips = state.trips.map(t => {
    if (t.id !== state.activeTripId) return t;
    updated = fn(t);
    return updated;
  });
  if (updated) {
    const { id, ...data } = updated;
    db.collection("trips").doc(state.activeTripId).set(data).catch(err => console.error("同步到雲端失敗", err));
  }
}
function saveCollaborators() {
  // 旅伴名單現在存在「各自行程」自己的文件裡，不再是全部行程共用一份
  mutateTrip(t => ({ ...t, collaborators: state.collaborators }));
}
function canEditGeneral() {
  if (state.viewOnlyMode) return false; // 手動切成檢視模式時，不管實際權限一律唯讀
  if (!state.currentUserId) return false; // 還沒選擇身份之前，一律視為唯讀，避免誤改資料
  const p = state.collaborators.find(p => p.id === state.currentUserId);
  return !p || p.permission === "編輯";
}
/* 這個人「實際權限」是不是編輯者，不受檢視模式影響 —— 用來決定要不要顯示「切回編輯模式」按鈕 */
function hasEditPermission() {
  if (!state.currentUserId) return false;
  const p = state.collaborators.find(p => p.id === state.currentUserId);
  return !p || p.permission === "編輯";
}
function isPrimaryEditor() {
  if (state.viewOnlyMode) return false;
  const p = state.collaborators.find(p => p.id === state.currentUserId);
  return !!(p && p.isPrimaryEditor);
}
/* 預算項目的編輯／刪除權限：「個人」分類的項目不受「檢視模式」影響，只認是不是本人的項目——
   因為這是自己的私人記錄，就算切成檢視模式瀏覽，也應該還能記自己的帳；
   其他分類維持原本規則（編輯者可改內容，只有主編輯者能新增/刪除，且受檢視模式限制） */
function canEditBudgetItem(item) {
  if (!state.currentUserId) return false;
  if (item.category === "個人") return item.ownerId === state.currentUserId;
  return canEditGeneral();
}
function canRemoveBudgetItem(item) {
  if (!state.currentUserId) return false;
  if (item.category === "個人") return item.ownerId === state.currentUserId;
  return isPrimaryEditor();
}

let rerenderScheduled = false;
function render() {
  if (rerenderScheduled) return;
  rerenderScheduled = true;
  requestAnimationFrame(() => {
    rerenderScheduled = false;
    doRender();
  });
}

/* ---------------------------------------------------------------------- */
/* Actions                                                                */
/* ---------------------------------------------------------------------- */
const actions = {
  selectTrip(tripId) {
    const trip = state.trips.find(t => t.id === tripId);
    const map = loadIdentityMap();
    const uidVal = map[tripId];
    state.activeTripId = tripId;
    markTripUnlocked(tripId);
    state.activeDayId = trip.days[0] ? trip.days[0].id : null;
    state.activeSectionTab = state.activeSectionTab; // keep tab
    state.collaborators = trip.collaborators || []; // 旅伴名單是各行程自己的，切換行程要跟著換
    if (uidVal && state.collaborators.some(p => p.id === uidVal)) {
      state.currentUserId = uidVal;
    } else {
      // 這個裝置在這個行程裡還沒選過身份，強制跳出選擇視窗
      state.currentUserId = null;
      state.ui.identityModalOpen = true;
    }
    subscribeToImages(tripId);
    render();
  },
  openUnlockModal() {
    state.ui.unlockModalOpen = true;
    state.ui.unlockError = "";
    render(true);
  },
  toggleViewOnlyMode() {
    state.viewOnlyMode = !state.viewOnlyMode;
    saveViewOnlyMode(state.viewOnlyMode);
    state.ui.collabMenuOpen = false;
    render(true);
  },
  confirmUnlockTrip(password) {
    const input = (password || "").trim().toLowerCase();
    const target = state.trips.find(t => t.id.toLowerCase() === input);
    if (!target) {
      state.ui.unlockError = "密碼不對，再試一次";
      render(true);
      return;
    }
    markTripUnlocked(target.id);
    state.ui.unlockModalOpen = false;
    state.ui.unlockError = "";
    actions.selectTrip(target.id);
  },
  selectSection(id) { state.activeSectionTab = id; render(); },
  openAddTrip() {
    state.ui.addTripModalOpen = true;
    state.ui.newTripName = ""; state.ui.newTripCountry = ""; state.ui.newTripFlag = "";
    state.ui.newTripDateStart = ""; state.ui.newTripDateEnd = "";
    render(true);
  },
  saveNewTrip() {
    const u = state.ui;
    if (!u.newTripName.trim()) { u.addTripModalOpen = false; render(true); return; }
    const id = uid("trip");
    const start = isoToDate(u.newTripDateStart), end = isoToDate(u.newTripDateEnd);
    const hasDates = start && end && end >= start;
    const nights = hasDates ? Math.round((end - start) / 86400000) : 0;
    const dateRange = hasDates ? `${formatFullDate(start)} - ${formatFullDate(end)}（${nights + 1}天${nights}夜）` : "";
    const days = hasDates
      ? Array.from({ length: nights + 1 }, (_, i) => ({ id: uid("d"), index: i + 1, dateLabel: formatMonthDay(addDays(start, i)), title: "", items: [] }))
      : [{ id: uid("d"), index: 1, dateLabel: "", title: "", items: [] }];
    // 建立的人自動就是這個新行程的主編輯者
    const creator = state.collaborators.find(p => p.id === state.currentUserId);
    const collaborators = [{
      id: state.currentUserId || uid("p"),
      name: creator ? creator.name : "我",
      initial: creator ? creator.initial : "我",
      permission: "編輯", colorIdx: 0, isPrimaryEditor: true
    }];
    const newTrip = {
      name: u.newTripName.trim(), country: u.newTripCountry.trim(), flag: u.newTripFlag.trim() || "📍",
      dateRange, dateStart: u.newTripDateStart || "", dateEnd: u.newTripDateEnd || "",
      flight: { out: "", back: "" }, stays: [], notes: DEFAULT_PREP_NOTES,
      days, packing: buildDefaultPackingTemplate(),
      prep: buildDefaultPrepTemplate(),
      budget: [], memoTags: [], memoItems: [], personalChecklist: [], documents: [],
      sharedTodo: buildDefaultSharedTodo(),
      collaborators, createdAt: Date.now()
    };
    // 樂觀更新：先在本機把新行程加進列表並切換過去，不用等 Firestore 回應才看得到
    const localTrip = normalizeTrip({ id, ...newTrip }, null);
    state.trips = [...state.trips, localTrip];
    state.activeTripId = id;
    markTripUnlocked(id);
    state.activeDayId = days[0] ? days[0].id : null;
    state.collaborators = collaborators;
    subscribeToImages(id);
    db.collection("trips").doc(id).set(newTrip)
      .then(() => {
        // 記住這台裝置在這個新行程裡就是建立者本人，不用再跳一次身份選擇視窗
        const map = loadIdentityMap();
        map[id] = collaborators[0].id;
        saveIdentityMap(map);
      })
      .catch(err => console.error("新增行程失敗", err));
    u.addTripModalOpen = false;
    render(true);
  },
  selectDay(dayId) { state.activeDayId = dayId; render(); },
  openSwapDayModal() {
    if (!canEditGeneral()) return;
    state.ui.swapDayModalOpen = true;
    render(true);
  },
  swapDays(targetDayId) {
    if (!canEditGeneral()) return;
    const sourceId = state.activeDayId;
    state.ui.swapDayModalOpen = false;
    if (!sourceId || sourceId === targetDayId) { render(true); return; }
    mutateTrip(t => {
      const source = t.days.find(d => d.id === sourceId);
      const target = t.days.find(d => d.id === targetDayId);
      if (!source || !target) return t;
      // 只互換內容（標題＋行程項目），日期／Day 編號留在原本的位置上不動
      return {
        ...t,
        days: t.days.map(d => {
          if (d.id === sourceId) return { ...d, title: target.title, items: target.items };
          if (d.id === targetDayId) return { ...d, title: source.title, items: source.items };
          return d;
        })
      };
    });
    render(true);
  },
  openMoveItemModal(itemId) {
    if (!canEditGeneral()) return;
    state.ui.moveItemId = itemId;
    render(true);
  },
  moveItemToDay(targetDayId) {
    if (!canEditGeneral()) return;
    const itemId = state.ui.moveItemId;
    state.ui.moveItemId = null;
    if (!itemId) { render(true); return; }
    mutateTrip(t => {
      let moved = null;
      const strippedDays = t.days.map(d => {
        const idx = d.items.findIndex(it => it.id === itemId);
        if (idx === -1) return d;
        moved = d.items[idx];
        return { ...d, items: d.items.filter(it => it.id !== itemId) };
      });
      if (!moved) return t;
      return { ...t, days: strippedDays.map(d => d.id === targetDayId ? { ...d, items: [...d.items, moved] } : d) };
    });
    state.activeDayId = targetDayId;
    render(true);
  },
  setFilter(f) { state.itineraryFilter = f; render(); },

  toggleCollabMenu() { state.ui.collabMenuOpen = !state.ui.collabMenuOpen; render(true); },
  closeCollabMenu() { if (state.ui.collabMenuOpen) { state.ui.collabMenuOpen = false; state.ui.editingCollabId = null; render(true); } },
  addCollaborator() {
    const names = ["新旅伴", "阿凱", "Emma", "Sam", "小魚"];
    const n = names[state.collaborators.length % names.length];
    const id = uid("p");
    state.collaborators.push({ id, name: n, initial: n[0], permission: "檢視", colorIdx: state.collaborators.length });
    state.ui.editingCollabId = id; state.ui.editCollabName = n;
    saveCollaborators();
    render();
  },
  removeCollaborator(id) {
    if (state.collaborators.length <= 1) {
      window.alert("至少要留一位旅伴，沒辦法刪到剩 0 個人。");
      return;
    }
    if (!window.confirm(`確定要移除「${(state.collaborators.find(p => p.id === id) || {}).name || ""}」嗎？`)) return;
    state.collaborators = state.collaborators.filter(p => p.id !== id);
    if (state.currentUserId === id) state.currentUserId = state.collaborators[0] ? state.collaborators[0].id : null;
    saveCollaborators();
    render();
  },
  togglePermission(id) {
    state.collaborators = state.collaborators.map(p => p.id === id ? { ...p, permission: p.permission === "編輯" ? "檢視" : "編輯" } : p);
    saveCollaborators();
    render();
  },
  startEditCollab(id) {
    const p = state.collaborators.find(p => p.id === id);
    state.ui.editingCollabId = id; state.ui.editCollabName = p.name; render(true);
  },
  saveCollabName(val) {
    const id = state.ui.editingCollabId;
    if (!id) return;
    const name = (val != null ? val : state.ui.editCollabName).trim();
    // 名字改動不會連動改頭像文字了（頭像文字現在是獨立欄位，見 setCollabInitial）
    state.collaborators = state.collaborators.map(p => p.id === id ? { ...p, name: name || p.name } : p);
    saveCollaborators();
    render(true);
  },
  setCollabInitial(val) {
    const id = state.ui.editingCollabId;
    if (!id) return;
    const initial = (val || "").trim().slice(0, 2);
    if (!initial) { render(true); return; }
    state.collaborators = state.collaborators.map(p => p.id === id ? { ...p, initial } : p);
    saveCollaborators();
    render(true);
  },

  toggleGroupCollapse(key) { state.ui.expandedGroups[key] = !state.ui.expandedGroups[key]; render(true); },
  addChecklistItem(section, cat) {
    if (!canEditGeneral()) return;
    const label = (window.prompt("新增項目名稱") || "").trim();
    if (!label) return;
    mutateTrip(t => ({ ...t, [section]: { ...t[section], [cat]: [...t[section][cat], { id: uid("c"), label, done: false }] } }));
    render();
  },
  removeChecklistItem(section, cat, id) {
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, [section]: { ...t[section], [cat]: t[section][cat].filter(c => c.id !== id) } }));
    render();
  },
  togglePrepCheck(cat, id) {
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, prep: { ...t.prep, [cat]: t.prep[cat].map(c => c.id === id ? { ...c, done: !c.done } : c) } }));
    render();
  },
  togglePackingCheck(cat, id) {
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, packing: { ...t.packing, [cat]: t.packing[cat].map(c => c.id === id ? { ...c, done: !c.done } : c) } }));
    render();
  },
  /* 「我的清單」：每個人各自的待辦/行李清單，不受權限（編輯／檢視）或檢視模式影響——
     這是自己的私人紀錄，就算切成檢視模式瀏覽，也應該還能勾自己的清單 */
  togglePersonalCheck(id) {
    const item = findTrip().personalChecklist.find(it => it.id === id);
    if (!item || item.ownerId !== state.currentUserId) return;
    mutateTrip(t => ({ ...t, personalChecklist: t.personalChecklist.map(it => it.id === id ? { ...it, done: !it.done } : it) }));
    render();
  },
  setPersonalChecklistLabel(id, val) {
    const item = findTrip().personalChecklist.find(it => it.id === id);
    if (!item || item.ownerId !== state.currentUserId) return;
    mutateTrip(t => ({ ...t, personalChecklist: t.personalChecklist.map(it => it.id === id ? applyPackingSafetyRule({ ...it, label: val }) : it) }));
    render(true);
  },
  addPersonalChecklistItem(section, cat) {
    if (!state.currentUserId) return;
    const label = (window.prompt("新增項目名稱") || "").trim();
    if (!label) return;
    const newItem = applyPackingSafetyRule({ id: uid("pc"), ownerId: state.currentUserId, section, category: cat, label, done: false, bagTag: null, locked: false });
    mutateTrip(t => ({ ...t, personalChecklist: [...t.personalChecklist, newItem] }));
    render();
  },
  setPersonalItemBagTag(id, tag) {
    const item = findTrip().personalChecklist.find(it => it.id === id);
    if (!item || item.ownerId !== state.currentUserId || item.locked) return;
    mutateTrip(t => ({ ...t, personalChecklist: t.personalChecklist.map(it => it.id === id ? { ...it, bagTag: tag } : it) }));
    render(true);
  },
  setPackingViewMode(mode) {
    state.ui.packingViewMode = mode;
    render(true);
  },
  /* 清空自己這份清單、重新從目前最新公版套用一次 —— 用在公版更新過、但自己手上還是舊內容的情況 */
  resetMyChecklist(section) {
    if (!state.currentUserId) return;
    const label = section === "prep" ? "待辦" : "行李清單";
    if (!window.confirm(`確定要清空你自己的「${label}」，重新套用最新公版嗎？\n\n你目前已經勾選/自己新增的內容都會被清掉，換成公版最新的項目。`)) return;
    const trip = findTrip();
    const template = trip[section] || {};
    const newItems = [];
    Object.keys(template).forEach(cat => {
      (template[cat] || []).forEach(c => {
        newItems.push({ id: uid("pc"), ownerId: state.currentUserId, section, category: cat, label: c.label, done: false, bagTag: c.bagTag || null, locked: !!c.locked });
      });
    });
    mutateTrip(t => ({
      ...t,
      personalChecklist: [...t.personalChecklist.filter(it => !(it.ownerId === state.currentUserId && it.section === section)), ...newItems]
    }));
    render(true);
  },
  /* 出國期間換飯店收行李時，可以一鍵把自己的行李清單全部取消勾選，重新確認一次 */
  uncheckAllPacking() {
    if (!state.currentUserId) return;
    const hasChecked = findTrip().personalChecklist.some(it => it.ownerId === state.currentUserId && it.section === "packing" && it.done);
    if (!hasChecked) return;
    if (!window.confirm("確定要全部取消勾選嗎? 方便你重新確認一次行李內容")) return;
    mutateTrip(t => ({ ...t, personalChecklist: t.personalChecklist.map(it => (it.ownerId === state.currentUserId && it.section === "packing") ? { ...it, done: false } : it) }));
    render(true);
  },
  removePersonalChecklistItem(id) {
    const item = findTrip().personalChecklist.find(it => it.id === id);
    if (!item || item.ownerId !== state.currentUserId) return;
    mutateTrip(t => ({ ...t, personalChecklist: t.personalChecklist.filter(it => it.id !== id) }));
    render();
  },
  toggleChecklistEditMode(section) {
    state.ui.checklistEditMode = { ...state.ui.checklistEditMode, [section]: !state.ui.checklistEditMode[section] };
    render(true);
  },
  resetPrepTemplate() {
    if (!isPrimaryEditor()) return;
    if (!window.confirm("確定要用最新公版覆蓋這個行程的「待辦(共用區)」「行李清單」範本嗎？\n\n待辦(共用區)的團體/個人項目會直接被公版內容取代；行李清單的範本更新則只會影響之後新加入、還沒建立過自己清單的旅伴，已經有自己清單的人不會被動到。")) return;
    mutateTrip(t => ({ ...t, prep: buildDefaultPrepTemplate(), packing: buildDefaultPackingTemplate(), sharedTodo: buildDefaultSharedTodo() }));
    render(true);
  },
  resetPrepNotes() {
    if (!isPrimaryEditor()) return;
    if (!window.confirm("確定要用公版內容覆蓋目前的「注意事項」文字嗎？目前寫的內容會被取代。")) return;
    mutateTrip(t => ({ ...t, notes: DEFAULT_PREP_NOTES }));
    render(true);
  },
  resetSharedTodo() {
    if (!isPrimaryEditor()) return;
    if (!window.confirm("確定要清空「待辦(共用區)」目前的團體/個人項目，重新套用最新公版內容嗎？")) return;
    mutateTrip(t => ({ ...t, sharedTodo: buildDefaultSharedTodo() }));
    render(true);
  },

  /* 待辦(共用區)：團體（大家共用同一個打勾狀態，只有主揪能操作）／個人（項目共用，但每個人各自打勾，可看到誰打了勾） */
  setSharedTodoTab(tab) {
    state.ui.sharedTodoTab = tab;
    render(true);
  },
  setPrepMainTab(tab) {
    state.ui.prepMainTab = tab;
    render(true);
  },
  toggleSharedTodoEditMode() {
    if (!isPrimaryEditor()) return;
    state.ui.sharedTodoEditMode = !state.ui.sharedTodoEditMode;
    render(true);
  },
  toggleSharedGroupItem(id) {
    if (!isPrimaryEditor()) return;
    mutateTrip(t => {
      const sharedTodo = t.sharedTodo || { group: [], personal: [] };
      return { ...t, sharedTodo: { ...sharedTodo, group: sharedTodo.group.map(it => it.id === id ? { ...it, done: !it.done } : it) } };
    });
    render();
  },
  toggleSharedPersonalItem(id) {
    if (!state.currentUserId) return;
    mutateTrip(t => {
      const sharedTodo = t.sharedTodo || { group: [], personal: [] };
      return {
        ...t,
        sharedTodo: {
          ...sharedTodo,
          personal: sharedTodo.personal.map(it => {
            if (it.id !== id) return it;
            const checkedBy = it.checkedBy || [];
            const has = checkedBy.includes(state.currentUserId);
            return { ...it, checkedBy: has ? checkedBy.filter(x => x !== state.currentUserId) : [...checkedBy, state.currentUserId] };
          })
        }
      };
    });
    render();
  },
  addSharedTodoItem(tab, cat) {
    if (!isPrimaryEditor()) return;
    const label = (window.prompt("新增項目名稱") || "").trim();
    if (!label) return;
    const newItem = tab === "personal" ? { id: uid("sp"), label, category: cat, checkedBy: [] } : { id: uid("sg"), label, category: cat, done: false };
    mutateTrip(t => {
      const sharedTodo = t.sharedTodo || { group: [], personal: [] };
      return { ...t, sharedTodo: { ...sharedTodo, [tab]: [...sharedTodo[tab], newItem] } };
    });
    render();
  },
  removeSharedTodoItem(tab, id) {
    if (!isPrimaryEditor()) return;
    mutateTrip(t => {
      const sharedTodo = t.sharedTodo || { group: [], personal: [] };
      return { ...t, sharedTodo: { ...sharedTodo, [tab]: sharedTodo[tab].filter(it => it.id !== id) } };
    });
    render();
  },
  setSharedTodoLabel(tab, id, val) {
    if (!isPrimaryEditor()) return;
    mutateTrip(t => {
      const sharedTodo = t.sharedTodo || { group: [], personal: [] };
      return { ...t, sharedTodo: { ...sharedTodo, [tab]: sharedTodo[tab].map(it => it.id === id ? { ...it, label: val } : it) } };
    });
    render(true);
  },

  /* 總覽頁「資料」區：放票券 QRCode、eSIM 設定說明等，跟其他共用內容一樣是編輯者維護、檢視者唯讀 */
  addDocument() {
    if (!isPrimaryEditor()) return;
    const title = (window.prompt("新增資料標題（例如：機票 QRCode、eSIM 設定）") || "").trim();
    if (!title) return;
    mutateTrip(t => ({ ...t, documents: [...(t.documents || []), { id: uid("doc"), title, note: "" }] }));
    render();
  },
  removeDocument(id) {
    if (!isPrimaryEditor()) return;
    mutateTrip(t => ({ ...t, documents: (t.documents || []).filter(d => d.id !== id) }));
    render();
  },
  setDocumentTitle(id, val) {
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, documents: t.documents.map(d => d.id === id ? { ...d, title: val } : d) }));
    render(true);
  },
  setDocumentNote(id, val) {
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, documents: t.documents.map(d => d.id === id ? { ...d, note: val } : d) }));
    render();
  },
  setNotes(val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, notes: val })); render(true); },
  startEditTripName() {
    if (!canEditGeneral()) return;
    state.ui.isEditingTripName = true; state.ui.tripNameDraft = findTrip().name; render();
  },
  saveTripName(val) {
    const name = (val != null ? val : state.ui.tripNameDraft).trim();
    if (name) mutateTrip(t => ({ ...t, name }));
    state.ui.isEditingTripName = false; render();
  },
  setTripDate(field, val) {
    if (!canEditGeneral()) return;
    mutateTrip(t => {
      const next = { ...t, [field]: val };
      const start = isoToDate(next.dateStart);
      const end = isoToDate(next.dateEnd);
      if (start && end && end >= start) {
        const nights = Math.round((end - start) / 86400000);
        const totalDays = nights + 1;
        next.dateRange = `${formatFullDate(start)} - ${formatFullDate(end)}（${totalDays}天${nights}夜）`;
        // 行程頁每一天的日期，跟著新的起始日期重新往後推算
        let days = t.days.map(d => ({ ...d, dateLabel: formatMonthDay(addDays(start, d.index - 1)) }));
        // 天數變多了：把缺少的天數補上（新的一天預設還沒有任何行程項目）
        if (days.length < totalDays) {
          for (let i = days.length + 1; i <= totalDays; i++) {
            days.push({ id: uid("d"), index: i, dateLabel: formatMonthDay(addDays(start, i - 1)), title: "", items: [] });
          }
        }
        // 天數變少了：只移除「還沒有任何行程項目、也沒下標題」的多餘天數，已經填好內容的天不會被刪掉
        else if (days.length > totalDays) {
          while (days.length > totalDays && days[days.length - 1].items.length === 0 && !days[days.length - 1].title) {
            days.pop();
          }
        }
        next.days = days;
      }
      return next;
    });
    render(true);
  },
  setFlightOut(val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, flight: { ...t.flight, out: val } })); render(true); },
  setFlightBack(val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, flight: { ...t.flight, back: val } })); render(true); },

  setPrepLabel(cat, id, val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, prep: { ...t.prep, [cat]: t.prep[cat].map(c => c.id === id ? { ...c, label: val } : c) } })); render(true); },
  setPackingLabel(cat, id, val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, packing: { ...t.packing, [cat]: t.packing[cat].map(c => c.id === id ? { ...c, label: val } : c) } })); render(true); },
  reorderPrep(cat, fromId, toId) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, prep: { ...t.prep, [cat]: reorderList(t.prep[cat], fromId, toId) } })); render(); },
  reorderPacking(cat, fromId, toId) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, packing: { ...t.packing, [cat]: reorderList(t.packing[cat], fromId, toId) } })); render(); },

  setItemField(id, field, val) {
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, days: t.days.map(d => d.id !== state.activeDayId ? d : { ...d, items: d.items.map(it => it.id === id ? { ...it, [field]: val } : it) }) }));
    render(true);
  },
  setItemLocation(id, val) {
    if (!canEditGeneral()) return;
    const { name, url } = parseGoogleMapsLocation(val);
    mutateTrip(t => ({ ...t, days: t.days.map(d => d.id !== state.activeDayId ? d : { ...d, items: d.items.map(it => it.id === id ? { ...it, location: name, locationUrl: url } : it) }) }));
    render();
  },
  setDayTitle(dayId, val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, days: t.days.map(d => d.id === dayId ? { ...d, title: val } : d) })); render(true); },
  toggleItemExpanded(id) {
    state.ui.expandedItemIds = state.ui.expandedItemIds.includes(id) ? state.ui.expandedItemIds.filter(x => x !== id) : [...state.ui.expandedItemIds, id];
    render(true);
  },
  reorderItineraryItems(fromId, toId) {
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, days: t.days.map(d => d.id !== state.activeDayId ? d : { ...d, items: reorderList(d.items, fromId, toId) }) }));
    render();
  },

  setBudgetLabel(id, val) {
    const item = findTrip().budget.find(b => b.id === id);
    if (!item || !canEditBudgetItem(item)) return;
    mutateTrip(t => ({ ...t, budget: t.budget.map(b => b.id === id ? { ...b, label: val } : b) })); render(true);
  },
  setBudgetAmount(id, val) {
    const item = findTrip().budget.find(b => b.id === id);
    if (!item || !canEditBudgetItem(item)) return;
    mutateTrip(t => ({ ...t, budget: t.budget.map(b => b.id === id ? { ...b, amount: Number(val) || 0 } : b) })); render();
  },
  setBudgetCurrency(id, val) {
    const item = findTrip().budget.find(b => b.id === id);
    if (!item || !canEditBudgetItem(item)) return;
    mutateTrip(t => ({ ...t, budget: t.budget.map(b => b.id === id ? { ...b, currency: val } : b) })); render();
  },
  reorderBudget(category, fromId, toId) {
    if (category === "個人") return; // 「個人」分類裡混著每個人自己的項目，不開放拖曳排序，避免動到別人的項目
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, budget: reorderWithinGroup(t.budget, "category", category, fromId, toId) })); render();
  },
  removeBudget(id) {
    const item = findTrip().budget.find(b => b.id === id);
    if (!item || !canRemoveBudgetItem(item)) return;
    mutateTrip(t => ({ ...t, budget: t.budget.filter(b => b.id !== id) })); render();
  },
  toggleBudgetPayer(itemId, personId) {
    const item = findTrip().budget.find(b => b.id === itemId);
    if (!item || item.category === "個人") return; // 個人項目的付款人固定是本人，不開放調整
    if (!canEditGeneral()) return;
    mutateTrip(t => ({ ...t, budget: t.budget.map(b => {
      if (b.id !== itemId) return b;
      const set = new Set(b.payerIds || []);
      if (set.has(personId)) set.delete(personId); else set.add(personId);
      return { ...b, payerIds: Array.from(set) };
    }) }));
    render();
  },

  setMemoName(id, ownerId, val) { if (ownerId !== state.currentUserId) return; mutateTrip(t => ({ ...t, memoItems: t.memoItems.map(m => m.id === id ? { ...m, name: val } : m) })); render(true); },
  setMemoPrice(id, ownerId, val) { if (ownerId !== state.currentUserId) return; mutateTrip(t => ({ ...t, memoItems: t.memoItems.map(m => m.id === id ? { ...m, price: Number(val) || 0 } : m) })); render(); },
  setMemoCurrency(id, ownerId, val) { if (ownerId !== state.currentUserId) return; mutateTrip(t => ({ ...t, memoItems: t.memoItems.map(m => m.id === id ? { ...m, currency: val } : m) })); render(); },
  reorderMemo(fromId, toId) {
    const tagFilter = state.memoTagFilter;
    const uidVal = state.currentUserId;
    mutateTrip(t => ({ ...t, memoItems: reorderWithinPredicate(t.memoItems, m => m.ownerId === uidVal && (tagFilter === "all" || m.tag === tagFilter), fromId, toId) }));
    render();
  },
  removeMemo(id) { mutateTrip(t => ({ ...t, memoItems: t.memoItems.filter(m => m.id !== id) })); render(); },
  selectMemoTagFilter(tag) { state.memoTagFilter = tag; render(true); },
  addMemoTag() {
    const tag = (window.prompt("新增分類名稱") || "").trim();
    if (!tag) return;
    mutateTrip(t => t.memoTags.includes(tag) ? t : { ...t, memoTags: [...t.memoTags, tag] });
    render();
  },
  startEditMemoTag(tag) {
    state.ui.editingMemoTag = tag;
    render(true);
  },
  saveMemoTag(oldTag, val) {
    const name = (val || "").trim();
    state.ui.editingMemoTag = null;
    if (!name || name === oldTag) { render(true); return; }
    if (findTrip().memoTags.includes(name)) { render(true); return; } // 避免改成跟其他分類同名
    mutateTrip(t => ({
      ...t,
      memoTags: t.memoTags.map(tg => tg === oldTag ? name : tg),
      memoItems: t.memoItems.map(m => m.tag === oldTag ? { ...m, tag: name } : m)
    }));
    if (state.memoTagFilter === oldTag) state.memoTagFilter = name;
    render(true);
  },
  removeMemoTag(tag) {
    const trip = findTrip();
    const count = trip.memoItems.filter(m => m.tag === tag).length;
    if (count > 0 && !window.confirm(`「${tag}」還有 ${count} 個項目使用這個分類，刪除後這些項目不會被刪除，只是不再屬於任何分類。確定要刪除嗎？`)) return;
    mutateTrip(t => ({ ...t, memoTags: t.memoTags.filter(tg => tg !== tag) }));
    if (state.memoTagFilter === tag) state.memoTagFilter = "all";
    render(true);
  },

  openAddItem() {
    state.ui.itemModalOpen = true; state.ui.editingItemId = null; state.ui.formId = uid("i");
    state.ui.formTime = ""; state.ui.formTitle = ""; state.ui.formCategory = "景點";
    state.ui.formLocation = ""; state.ui.formLocationUrl = ""; state.ui.formNote = "";
    state.ui.formAlert = ""; state.ui.formDocs = [];
    render(true);
  },
  openEditItem(item) {
    state.ui.itemModalOpen = true; state.ui.editingItemId = item.id; state.ui.formId = item.id;
    state.ui.formTime = item.time; state.ui.formTitle = item.title; state.ui.formCategory = item.category;
    state.ui.formLocation = item.location; state.ui.formLocationUrl = item.locationUrl || ""; state.ui.formNote = item.note;
    state.ui.formAlert = item.alert || ""; state.ui.formDocs = item.docs || [];
    render(true);
  },
  addFormDoc() {
    if (!canEditGeneral()) return;
    state.ui.formDocs = [...state.ui.formDocs, { id: uid("doc"), note: "" }];
    render(true);
  },
  removeFormDoc(docId) {
    if (!canEditGeneral()) return;
    delete state.images["item-doc-" + state.ui.formId + "-" + docId];
    state.ui.formDocs = state.ui.formDocs.filter(d => d.id !== docId);
    render(true);
  },
  closeModal() {
    // 如果是「新增備忘項目」時上傳了照片但取消，順便清掉沒用到的孤兒照片
    if (state.ui.memoModalOpen && state.ui.memoFormId) {
      const trip = findTrip();
      const exists = trip.memoItems.some(m => m.id === state.ui.memoFormId);
      if (!exists) delete state.images["memo-photo-" + state.ui.memoFormId];
    }
    // 新增行程項目時上傳了「行程資料」照片但取消，也順便清掉沒用到的孤兒照片
    if (state.ui.itemModalOpen && !state.ui.editingItemId && state.ui.formId) {
      (state.ui.formDocs || []).forEach(d => delete state.images["item-doc-" + state.ui.formId + "-" + d.id]);
    }
    state.ui.itemModalOpen = false; state.ui.budgetModalOpen = false; state.ui.memoModalOpen = false; state.ui.shareModalOpen = false;
    state.ui.addTripModalOpen = false; state.ui.unlockModalOpen = false; state.ui.unlockError = "";
    state.ui.swapDayModalOpen = false; state.ui.docGalleryItemId = null; state.ui.moveItemId = null;
    state.ui.editingBudgetId = null; state.ui.editingMemoId = null; state.ui.memoFormId = null;
    render(true);
  },
  openLightbox(slotId) {
    const src = state.images[slotId];
    if (!src) return;
    state.ui.lightboxSrc = src;
    render(true);
  },
  closeLightbox() { state.ui.lightboxSrc = null; render(true); },
  openDocGallery(itemId, index) {
    state.ui.docGalleryItemId = itemId;
    state.ui.docGalleryIndex = index || 0;
    render(true);
  },
  shiftDocGallery(delta) {
    const trip = findTrip();
    const item = trip.days.flatMap(d => d.items).find(it => it.id === state.ui.docGalleryItemId);
    if (!item || !item.docs || !item.docs.length) return;
    state.ui.docGalleryIndex = (state.ui.docGalleryIndex + delta + item.docs.length) % item.docs.length;
    render(true);
  },
  saveItem(isBackup) {
    const u = state.ui;
    if (!u.formTitle.trim()) { u.itemModalOpen = false; render(true); return; }
    mutateTrip(t => ({
      ...t, days: t.days.map(d => d.id !== state.activeDayId ? d : {
        ...d, items: u.editingItemId
          ? d.items.map(it => it.id === u.editingItemId ? { ...it, time: u.formTime, title: u.formTitle, category: u.formCategory, location: u.formLocation, locationUrl: u.formLocationUrl, note: u.formNote, alert: u.formAlert, docs: u.formDocs } : it)
          : [...d.items, { id: u.formId, time: u.formTime || "--:--", title: u.formTitle, category: u.formCategory, location: u.formLocation, locationUrl: u.formLocationUrl, note: u.formNote, alert: u.formAlert, docs: u.formDocs, hasPhoto: false, isBackup: !!isBackup }]
      })
    }));
    u.itemModalOpen = false;
    render();
  },
  removeItem(itemId) {
    mutateTrip(t => ({ ...t, days: t.days.map(d => d.id !== state.activeDayId ? d : { ...d, items: d.items.filter(it => it.id !== itemId) }) }));
    render();
  },

  openAddBudget() {
    if (!isPrimaryEditor()) return;
    state.ui.budgetModalOpen = true; state.ui.editingBudgetId = null;
    state.ui.budgetFormCategory = "票券"; state.ui.budgetFormLabel = ""; state.ui.budgetFormAmount = "";
    state.ui.budgetFormCurrency = "TWD"; state.ui.budgetFormPayerIds = state.collaborators.map(p => p.id);
    state.ui.budgetFormDayId = "";
    render(true);
  },
  openAddPersonalBudget() {
    // 「個人」分類任何人（不管編輯／檢視權限，也不受檢視模式影響）都能新增自己的項目
    if (!state.currentUserId) return;
    const trip = findTrip();
    state.ui.budgetModalOpen = true; state.ui.editingBudgetId = null;
    state.ui.budgetFormCategory = "個人"; state.ui.budgetFormLabel = ""; state.ui.budgetFormAmount = "";
    state.ui.budgetFormCurrency = "TWD"; state.ui.budgetFormPayerIds = [state.currentUserId];
    state.ui.budgetFormDayId = (trip.days[0] && trip.days[0].id) || "";
    render(true);
  },
  openEditBudget(item) {
    if (!canEditBudgetItem(item)) return;
    state.ui.budgetModalOpen = true; state.ui.editingBudgetId = item.id;
    state.ui.budgetFormCategory = item.category; state.ui.budgetFormLabel = item.label; state.ui.budgetFormAmount = String(item.amount);
    state.ui.budgetFormCurrency = item.currency || "TWD"; state.ui.budgetFormPayerIds = item.payerIds || [];
    state.ui.budgetFormDayId = item.dayId || "";
    render(true);
  },
  saveBudget() {
    const u = state.ui;
    if (!u.budgetFormLabel.trim()) { u.budgetModalOpen = false; u.editingBudgetId = null; render(true); return; }
    const isPersonal = u.budgetFormCategory === "個人";
    if (u.editingBudgetId) {
      const editId = u.editingBudgetId;
      const existing = findTrip().budget.find(b => b.id === editId);
      if (!existing || !canEditBudgetItem(existing)) { u.budgetModalOpen = false; u.editingBudgetId = null; render(true); return; }
      mutateTrip(t => ({ ...t, budget: t.budget.map(b => b.id !== editId ? b : {
        ...b, category: u.budgetFormCategory, label: u.budgetFormLabel, amount: Number(u.budgetFormAmount) || 0,
        currency: u.budgetFormCurrency || "TWD",
        payerIds: isPersonal ? [existing.ownerId || state.currentUserId] : (u.budgetFormPayerIds && u.budgetFormPayerIds.length ? u.budgetFormPayerIds : b.payerIds),
        dayId: isPersonal ? (u.budgetFormDayId || null) : (b.dayId || null)
      }) }));
    } else {
      const allowed = isPersonal ? !!state.currentUserId : isPrimaryEditor();
      if (!allowed) { u.budgetModalOpen = false; render(true); return; }
      mutateTrip(t => ({ ...t, budget: [...t.budget, {
        id: uid("b"), category: u.budgetFormCategory, label: u.budgetFormLabel, amount: Number(u.budgetFormAmount) || 0,
        currency: u.budgetFormCurrency || "TWD",
        payerIds: isPersonal ? [state.currentUserId] : (u.budgetFormPayerIds && u.budgetFormPayerIds.length ? u.budgetFormPayerIds : [state.currentUserId]),
        ownerId: isPersonal ? state.currentUserId : null,
        dayId: isPersonal ? (u.budgetFormDayId || null) : null
      }] }));
    }
    u.budgetModalOpen = false; u.editingBudgetId = null;
    render();
  },

  openAddMemo() {
    const trip = findTrip();
    state.ui.memoModalOpen = true; state.ui.editingMemoId = null; state.ui.memoFormId = uid("m");
    state.ui.memoFormTag = trip.memoTags[0] || ""; state.ui.memoFormName = ""; state.ui.memoFormPrice = ""; state.ui.memoFormCurrency = "TWD";
    render(true);
  },
  openEditMemo(item) {
    if (item.ownerId !== state.currentUserId) return;
    state.ui.memoModalOpen = true; state.ui.editingMemoId = item.id; state.ui.memoFormId = item.id;
    state.ui.memoFormTag = item.tag; state.ui.memoFormName = item.name; state.ui.memoFormPrice = String(item.price); state.ui.memoFormCurrency = item.currency || "TWD";
    render(true);
  },
  saveMemo() {
    const u = state.ui;
    if (!u.memoFormName.trim()) {
      if (!u.editingMemoId && u.memoFormId) delete state.images["memo-photo-" + u.memoFormId];
      u.memoModalOpen = false; u.editingMemoId = null; u.memoFormId = null; render(true); return;
    }
    if (u.editingMemoId) {
      const editId = u.editingMemoId;
      mutateTrip(t => ({ ...t, memoItems: t.memoItems.map(m => m.id !== editId || m.ownerId !== state.currentUserId ? m : {
        ...m, tag: u.memoFormTag, name: u.memoFormName, price: Number(u.memoFormPrice) || 0, currency: u.memoFormCurrency || "TWD"
      }) }));
    } else {
      mutateTrip(t => ({ ...t, memoItems: [...t.memoItems, { id: u.memoFormId || uid("m"), tag: u.memoFormTag, ownerId: state.currentUserId, name: u.memoFormName, price: Number(u.memoFormPrice) || 0, currency: u.memoFormCurrency || "TWD", hasPhoto: false }] }));
    }
    u.memoModalOpen = false; u.editingMemoId = null; u.memoFormId = null;
    render();
  },

  openShareModal() { state.ui.shareModalOpen = true; render(true); },
  simulateFriendJoin() { state.ui.shareModalOpen = false; state.ui.identityModalOpen = true; state.ui.newGuestName = ""; render(true); },
  chooseIdentity(personId) {
    const map = loadIdentityMap();
    map[state.activeTripId] = personId;
    saveIdentityMap(map);
    state.currentUserId = personId; state.ui.identityModalOpen = false;
    render();
  },
  confirmNewGuest(val) {
    const name = (val != null ? val : state.ui.newGuestName).trim();
    if (!name) { state.ui.identityModalOpen = false; render(true); return; }
    const id = uid("p");
    state.collaborators.push({ id, name, initial: name[0], permission: "編輯", colorIdx: state.collaborators.length });
    saveCollaborators();
    actions.chooseIdentity(id);
  },

  setImage(slotId, dataUrl) {
    state.images[slotId] = dataUrl; render();
    db.collection("trips").doc(state.activeTripId).collection("images").doc(slotId).set({ data: dataUrl }).catch(err => console.error("照片同步失敗", err));
  },
  removeImage(slotId) {
    delete state.images[slotId]; render();
    db.collection("trips").doc(state.activeTripId).collection("images").doc(slotId).delete().catch(err => console.error("刪除照片失敗", err));
  }
};

/* ---------------------------------------------------------------------- */
/* 圖片上傳（縮圖後轉為 base64 存進 localStorage）                            */
/* ---------------------------------------------------------------------- */
function handleImageFile(slotId, file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const scale = MAX / Math.max(width, height);
        width = Math.round(width * scale); height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
      actions.setImage(slotId, dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------------------------------------------------------------------- */
/* Render helpers（回傳 HTML 字串）                                         */
/* ---------------------------------------------------------------------- */
function imageSlot(id, placeholder, opts) {
  opts = opts || {};
  const src = state.images[id];
  const style = opts.style || "";
  const shapeClass = opts.circle ? "border-radius:50%" : `border-radius:${opts.radius != null ? opts.radius : 0}px`;
  const fitAttr = opts.fit === "contain" ? ' data-fit="contain"' : "";
  const compact = !!opts.compact;
  const compactIconSize = opts.compactIconSize || 16;
  const inner = src
    ? `<img src="${src}" alt="">`
    : compact
      ? `<div class="slot-placeholder" style="padding:0;gap:0"><svg width="${compactIconSize}" height="${compactIconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg></div>`
      : `<div class="slot-placeholder"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg><span>${esc(placeholder)}</span></div>`;
  const actionsHtml = src
    ? `<div class="slot-actions">
        <div class="btn btn-icon" data-act="pickImage" data-slot="${id}" title="更換照片"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></div>
        <div class="btn btn-icon" data-act="removeImage" data-slot="${id}" title="移除照片"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></div>
      </div>`
    : "";
  return `<div class="image-slot ${src ? "" : "washed"} ${compact ? "image-slot-compact" : ""}" data-act="${src ? 'openLightbox' : 'pickImage'}" data-slot="${id}" style="${shapeClass};${style}"${fitAttr}>${inner}${actionsHtml}</div>`;
}

function avatar(initial, color, size) {
  size = size || 26;
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px;background:${color}">${esc(initial)}</div>`;
}

/* ---------------------------------------------------------------------- */
/* Render — Nav                                                            */
/* ---------------------------------------------------------------------- */
function renderNav() {
  const trip = findTrip();
  const CODE_LABELS = { okinawa: "JP 沖繩", busan: "KR 釜山" };
  // 分享連結收到的裝置預設只看得到當下這個行程，其他行程要輸入密碼解鎖過才會出現在選單裡
  const visibleTrips = state.trips.filter(t => t.id === state.activeTripId || state.unlockedTrips.includes(t.id));
  const hasLockedTrips = state.trips.length > visibleTrips.length;
  const tripOptions = visibleTrips.map(t => `<option value="${t.id}" ${t.id === state.activeTripId ? "selected" : ""}>${esc(CODE_LABELS[t.id] || t.name)}</option>`).join("")
    + (hasLockedTrips ? `<option value="__unlock__">🔒 切換行程…</option>` : "");

  const currentUserObj = state.collaborators.find(p => p.id === state.currentUserId);
  const currentUser = currentUserObj ? { name: currentUserObj.name, initial: currentUserObj.initial, color: PEOPLE_COLORS[currentUserObj.colorIdx % PEOPLE_COLORS.length] } : { name: "", initial: "?", color: "var(--color-neutral-500)" };

  const collabRows = state.collaborators.map(p => {
    const isEditing = state.ui.editingCollabId === p.id;
    const canEdit = canEditGeneral();
    const nameHtml = isEditing
      ? `<input class="input input-plain" data-bind-blur="collab.name" data-id="${p.id}" value="${esc(state.ui.editCollabName)}" style="height:26px;font-size:12.5px;width:62px" autofocus />
         <input class="input input-plain" data-bind-blur="collab.initial" data-id="${p.id}" value="${esc(p.initial)}" maxlength="2" title="頭像顯示的文字，例如兩個人都姓「小」時可以自己改成不同的字" placeholder="頭像字" style="height:26px;font-size:12.5px;width:34px;text-align:center;flex:none" />`
      : (canEdit
          ? `<div data-act="startEditCollab" data-id="${p.id}" style="cursor:pointer;font-size:12.5px;flex:1">${esc(p.name)}</div>`
          : `<div style="font-size:12.5px;flex:1">${esc(p.name)}</div>`);
    const tagClass = p.permission === "編輯" ? "tag-accent" : "tag-neutral";
    const controls = canEdit ? `
        <div class="btn btn-icon btn-ghost" data-act="togglePermission" data-id="${p.id}" title="切換權限" style="width:22px;height:22px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg></div>
        <div class="btn btn-icon btn-ghost" data-act="removeCollaborator" data-id="${p.id}" style="width:22px;height:22px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></div>` : "";
    return `<div class="collab-row">
        ${avatar(p.initial, PEOPLE_COLORS[p.colorIdx % PEOPLE_COLORS.length], 24)}
        ${nameHtml}
        <div class="tag ${tagClass}">${esc(p.permission)}</div>
        ${controls}
      </div>`;
  }).join("");

  const canEdit = canEditGeneral();
  const canToggleView = hasEditPermission(); // 只有本來就是編輯者的人才需要這個切換按鈕
  const viewToggleBtn = canToggleView ? `
      <div class="btn btn-secondary" data-act="toggleViewOnlyMode" style="font-size:12.5px">${state.viewOnlyMode
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> 切回編輯模式`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg> 切換為檢視模式`}</div>` : "";
  const menu = state.ui.collabMenuOpen ? `
    <div class="card elev-md collab-menu">
      <div class="collab-menu-label">旅伴</div>
      ${collabRows}
      ${canEdit ? `<div class="btn btn-ghost" data-act="addCollaborator" style="font-size:12.5px;margin-top:4px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg> 新增旅伴</div>
      <div class="btn btn-secondary" data-act="openShareModal" style="font-size:12.5px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></svg> 分享此行程連結</div>` : ""}
      ${viewToggleBtn}
    </div>` : "";

  const tabs = SECTION_TABS.map(sec => {
    const active = sec.id === state.activeSectionTab;
    return `<div class="tab-pill" data-act="selectSection" data-id="${sec.id}" style="background:${active ? "var(--color-accent)" : "transparent"};color:${active ? "var(--color-bg)" : "var(--color-text)"}">
      <i data-lucide="${sec.icon}" style="width:14px;height:14px"></i>${esc(sec.label)}
    </div>`;
  }).join("");

  return `
  <div class="nav">
    <select class="trip-select" data-act-change="selectTrip">${tripOptions}</select>
    <div class="btn btn-icon btn-ghost" data-act="openAddTrip" title="新增行程" style="flex:none"><i data-lucide="plus" style="width:16px;height:16px"></i></div>
    <div class="user-chip" data-act="toggleCollabMenu">
      ${avatar(currentUser.initial, currentUser.color, 26)}
      <div class="user-chip-name" style="font-size:13px;font-weight:600">${esc(currentUser.name)}</div>
      ${state.viewOnlyMode ? `<div class="tag tag-neutral" style="font-size:10.5px;padding:2px 6px">檢視中</div>` : ""}
      ${menu}
    </div>
    <div class="section-tabs-desktop">${tabs}</div>
  </div>`;
}

function renderBottomNav() {
  return `<div class="bottom-nav">
    ${SECTION_TABS.map(sec => `
      <div class="bottom-nav-item ${sec.id === state.activeSectionTab ? "active" : ""}" data-act="selectSection" data-id="${sec.id}">
        <i data-lucide="${sec.icon}" style="width:19px;height:19px"></i>
        <span>${esc(sec.label)}</span>
      </div>`).join("")}
  </div>`;
}

/* ---------------------------------------------------------------------- */
/* Render — Cover                                                          */
/* ---------------------------------------------------------------------- */
function renderCover(trip) {
  const canEdit = canEditGeneral();
  let nameHtml;
  if (state.ui.isEditingTripName) {
    nameHtml = `<input class="input" data-bind-blur="tripName" value="${esc(state.ui.tripNameDraft)}" style="font-size:24px;font-weight:700;font-family:var(--font-heading);background:rgba(255,255,255,0.92);color:var(--color-text);margin-bottom:4px;width:min(320px,80vw)" autofocus />`;
  } else if (canEdit) {
    nameHtml = `<h1 data-act="startEditTripName">${esc(trip.name)} <svg width="15" height="15" style="display:inline;vertical-align:middle;opacity:.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></h1>`;
  } else {
    nameHtml = `<h1>${esc(trip.name)}</h1>`;
  }
  return `
  <div class="cover-wrap">
    ${imageSlot("cover-" + trip.id, "行程封面照片", { style: "width:100%;height:100%;position:absolute;inset:0" })}
    <div class="cover-gradient"></div>
    <div class="cover-info">
      <h6>${esc(trip.country)}</h6>
      ${nameHtml}
      ${canEdit
        ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <input type="date" class="date-picker-light" data-bind-blur="dateStart" value="${esc(trip.dateStart || "")}" />
            <span style="color:var(--color-bg);opacity:.85;font-size:13px">-</span>
            <input type="date" class="date-picker-light" data-bind-blur="dateEnd" value="${esc(trip.dateEnd || "")}" min="${esc(trip.dateStart || "")}" />
            <span style="color:var(--color-accent-200);font-size:12.5px">（${esc(tripDurationLabel(trip))}）</span>
          </div>`
        : `<div style="color:var(--color-bg);opacity:.92;font-size:13px">${esc(trip.dateRange)}</div>`}
    </div>
  </div>`;
}

/* ---------------------------------------------------------------------- */
/* Render — 總覽                                                           */
/* ---------------------------------------------------------------------- */
function renderDocumentsCard(trip) {
  const canEdit = canEditGeneral();
  const canManage = isPrimaryEditor();
  const items = trip.documents || [];
  const rows = items.map(d => {
    const photoDisplay = imageSlot("doc-" + d.id, "上傳圖片", { style: "width:100%;height:90px", radius: 6 });
    const noteKey = "docnote:" + d.id;
    const noteExpanded = !!state.ui.expandedGroups[noteKey];
    return `<div class="card card-bordered" style="padding:var(--space-3);gap:6px">
        ${photoDisplay}
        <div style="display:flex;align-items:center;gap:4px">
          <input class="input input-plain" data-bind-blur="documentTitle" data-id="${d.id}" value="${esc(d.title)}" ${canEdit ? "" : "readonly"} style="font-size:13.5px;font-weight:700;flex:1" />
          <div data-act="toggleGroupCollapse" data-id="${esc(noteKey)}" title="${noteExpanded ? "收合說明" : "展開說明"}" style="cursor:pointer;flex:none;color:var(--color-neutral-500);padding:2px"><i data-lucide="${noteExpanded ? "chevron-up" : "chevron-down"}" style="width:14px;height:14px"></i></div>
        </div>
        ${noteExpanded
          ? `<textarea class="input input-plain" data-bind-blur="documentNote" data-id="${d.id}" ${canEdit ? "" : "readonly"} rows="${estimateTextareaRows(d.note, 1)}" style="font-size:12px;line-height:1.6;height:auto;opacity:.8" placeholder="補充說明">${esc(d.note)}</textarea>`
          : ""}
        ${canManage ? `<div style="display:flex;justify-content:flex-end"><div class="btn btn-icon btn-ghost" data-act="removeDocument" data-id="${d.id}"><i data-lucide="trash-2" style="width:13px;height:13px"></i></div></div>` : ""}
      </div>`;
  }).join("");
  return `<div class="card card-bordered" style="grid-area:docs">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <i data-lucide="file-text" style="width:17px;height:17px;color:var(--color-accent)"></i>
          <div class="card-title" style="font-size:16px">資料</div>
        </div>
        ${canManage ? `<div class="btn btn-ghost" data-act="addDocument" style="font-size:12px"><i data-lucide="plus" style="width:14px;height:14px"></i> 新增</div>` : ""}
      </div>
      <div class="docs-grid">${rows || '<div style="opacity:.5;font-size:13px;grid-column:1/-1">尚無資料，可以放票券 QRCode、eSIM 設定說明等</div>'}</div>
    </div>`;
}

function renderOverview(trip) {
  const canEdit = canEditGeneral();
  const autoStays = computeStaysFromDays(trip.days);
  const staysHtml = autoStays.map((s, i) => `
    <div style="display:flex;align-items:center;gap:4px;padding:6px 0;border-bottom:${i < autoStays.length - 1 ? "1px solid var(--color-divider)" : "none"}">
      <span style="flex:none">${esc(s.range)}（${s.nights}晚）</span>
      <span style="font-size:13px;flex:1">${esc(s.name)}</span>
    </div>`).join("");

  return `
  <div class="overview-grid">
    <div class="card card-bordered" style="grid-area:flight">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <i data-lucide="plane" style="width:17px;height:17px;color:var(--color-accent)"></i>
          <div class="card-title" style="font-size:16px">航班資訊</div>
        </div>
        <div style="font-size:13px;line-height:1.85;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:6px">去程<input class="input input-plain" data-bind-blur="flightOut" value="${esc(trip.flight.out)}" ${canEdit ? "" : "readonly"} style="font-size:13px;flex:1" /></div>
          <div style="display:flex;align-items:center;gap:6px">回程<input class="input input-plain" data-bind-blur="flightBack" value="${esc(trip.flight.back)}" ${canEdit ? "" : "readonly"} style="font-size:13px;flex:1" /></div>
        </div>
    </div>
    <div class="card card-bordered" style="grid-area:route">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <i data-lucide="route" style="width:17px;height:17px;color:var(--color-accent)"></i>
          <div class="card-title" style="font-size:16px">旅行路線</div>
        </div>
        ${imageSlot("route-map-" + trip.id, "上傳旅行路線地圖照片", { style: "width:100%;height:200px", radius: 8, fit: "contain" })}
    </div>
    <div class="card card-bordered" style="grid-area:stay">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <i data-lucide="bed" style="width:17px;height:17px;color:var(--color-accent)"></i>
        <div class="card-title" style="font-size:16px">住宿一覽</div>
      </div>
      <div style="font-size:13px;line-height:1.85">${staysHtml || '<div style="opacity:.5;font-size:13px">尚無住宿資料，在行程裡新增「住宿」類別的項目就會自動出現在這裡</div>'}</div>
    </div>
    ${renderDocumentsCard(trip)}
  </div>`;
}

/* ---------------------------------------------------------------------- */
/* Render — 行前準備（待辦 / 行李清單 共用）                                    */
/* ---------------------------------------------------------------------- */
function renderChecklistCard(title, cats, section, dataObj, toggleAction, labelAction, reorderAction, gridArea) {
  const canDrag = canEditGeneral();
  const groups = cats.map((cat, i) => {
    const key = section + ":" + cat;
    const expanded = !!state.ui.expandedGroups[key];
    const items = dataObj[cat] || [];
    const rows = items.map((c, idx) => {
      const dragCtl = canDrag ? `
        <div style="display:flex;flex-direction:column;flex:none">
          <div data-act="${reorderAction}" data-cat="${cat}" data-dir="up" data-id="${c.id}" style="cursor:pointer;opacity:${idx > 0 ? 1 : 0.25};line-height:0"><i data-lucide="chevron-up" style="width:12px;height:12px"></i></div>
          <div data-act="${reorderAction}" data-cat="${cat}" data-dir="down" data-id="${c.id}" style="cursor:pointer;opacity:${idx < items.length - 1 ? 1 : 0.25};line-height:0"><i data-lucide="chevron-down" style="width:12px;height:12px"></i></div>
        </div>` : "";
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:var(--radius-sm)">
          ${dragCtl}
          <div data-act="${toggleAction}" data-cat="${cat}" data-id="${c.id}" style="cursor:${canEditGeneral() ? "pointer" : "default"};width:14px;height:14px;border-radius:50%;border:1.5px solid ${c.done ? "var(--color-accent)" : "var(--color-divider)"};background:${c.done ? "var(--color-accent)" : "transparent"};flex:none;display:flex;align-items:center;justify-content:center;color:var(--color-bg)">
            ${c.done ? '<i data-lucide="check" style="width:8px;height:8px"></i>' : ""}
          </div>
          <input class="input input-plain" data-bind-blur="${labelAction}" data-cat="${cat}" data-id="${c.id}" value="${esc(c.label)}" ${canEditGeneral() ? "" : "readonly"} style="font-size:13px;text-decoration:${c.done ? "line-through" : "none"};opacity:${c.done ? 0.55 : 1};flex:1" />
          ${canEditGeneral() ? `<div class="btn btn-icon btn-ghost" data-act="removeChecklistItem" data-section="${section}" data-cat="${cat}" data-id="${c.id}" style="width:22px;height:22px;flex:none"><i data-lucide="x" style="width:12px;height:12px"></i></div>` : ""}
        </div>`;
    }).join("");
    return `<div style="padding:8px 0;border-bottom:${i < cats.length - 1 ? "1px solid var(--color-divider)" : "none"}">
        <div data-act="toggleGroupCollapse" data-id="${esc(key)}" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:12.5px;font-weight:700">${CATEGORY_EMOJI[cat] ? CATEGORY_EMOJI[cat] + " " : ""}${esc(cat)}</div>
          <i data-lucide="${expanded ? "chevron-up" : "chevron-down"}" style="width:14px;height:14px;color:var(--color-accent-700)"></i>
        </div>
        ${expanded ? `<div style="display:flex;flex-direction:column;gap:1px;margin-top:6px">
          ${rows || '<div style="font-size:12px;opacity:0.5;padding:4px 2px">尚無項目</div>'}
          ${canEditGeneral() ? `<div class="btn btn-ghost" data-act="addChecklistItem" data-section="${section}" data-cat="${cat}" style="font-size:12px;padding:4px 6px;justify-content:flex-start;margin-top:2px"><i data-lucide="plus" style="width:13px;height:13px"></i> 新增項目</div>` : ""}
        </div>` : ""}
      </div>`;
  }).join("");
  return `<div class="card card-bordered" ${gridArea ? `style="grid-area:${gridArea}"` : ""}>
      <div class="card-title" style="font-size:16px;margin-bottom:6px">${esc(title)}</div>
      ${groups}
    </div>`;
}

/* 「待辦」「行李清單」每個人各自獨立一份：第一次打開這個分頁時，用公版內容當起點自動複製一份給這個人，
   之後不管編輯／檢視權限，各自勾選、新增、刪除都只影響自己的清單，互不影響 */
/* 記住這次瀏覽階段已經「嘗試過」自動帶入公版的 使用者:分類 組合（不管公版當時是不是空的都算嘗試過），
   避免公版剛好沒有任何項目時，判斷條件永遠成立、每次重新渲染都再觸發一次寫入，造成無限重新渲染 */
const seededAttempts = new Set();
/* 行李清單的安全規則：只要項目內容打的是「行動電源」，一律鎖定標籤為「隨身」，
   不管是公版帶進來的、還是後來自己改名/新增的，都不能被改成別的標籤（避免不小心設定成登機箱/託運） */
function applyPackingSafetyRule(item) {
  if (item && item.section === "packing" && (item.label || "").trim() === "行動電源") {
    return { ...item, bagTag: "隨身", locked: true };
  }
  return item;
}
function ensurePersonalChecklistSeeded() {
  if (!state.currentUserId) return;
  const trip = findTrip();
  // 「私人待辦」現在是完全自由的筆記區，不套公版、不自動補項目——只有「行李清單」還需要
  // 用公版起始清單。如果不排除 prep，使用者刪光自己的私人待辦後，只要重新整理頁面
  // 就會又被套用一次舊的 trip.prep 範本內容，跟現在「私人待辦預設空白」的設計互相矛盾。
  const sections = ["packing"].filter(section => {
    const key = state.currentUserId + ":" + section;
    if (seededAttempts.has(key)) return false;
    return !trip.personalChecklist.some(it => it.ownerId === state.currentUserId && it.section === section);
  });
  if (!sections.length) return;
  sections.forEach(section => seededAttempts.add(state.currentUserId + ":" + section));
  mutateTrip(t => {
    const newItems = [];
    sections.forEach(section => {
      // mutateTrip 執行當下再檢查一次最新資料，確保萬一已經有項目了就不會重複塞入
      const already = t.personalChecklist.some(it => it.ownerId === state.currentUserId && it.section === section);
      if (already) return;
      const template = t[section] || {};
      Object.keys(template).forEach(cat => {
        (template[cat] || []).forEach(c => {
          newItems.push({ id: uid("pc"), ownerId: state.currentUserId, section, category: cat, label: c.label, done: false, bagTag: c.bagTag || null, locked: !!c.locked });
        });
      });
    });
    if (!newItems.length) return t;
    return { ...t, personalChecklist: [...t.personalChecklist, ...newItems] };
  });
}
/* 單一份「我的清單」卡片：不管編輯／檢視權限，只要選過身份就能勾選、新增、刪除，只影響自己的內容 */
/* 清單裡一列項目的渲染（打勾／文字／刪除按鈕），行前準備跟行李清單共用；
   行李清單在編輯模式下額外顯示隨身/登機箱/託運的標籤選擇，鎖定的項目（例如行動電源）不能改標籤 */
function renderChecklistRow(c, editMode, canEditMine, section) {
  const checkbox = `<div style="width:14px;height:14px;border-radius:50%;border:1.5px solid ${c.done ? "var(--color-accent)" : "var(--color-divider)"};background:${c.done ? "var(--color-accent)" : "transparent"};flex:none;display:flex;align-items:center;justify-content:center;color:var(--color-bg)">
      ${c.done ? '<i data-lucide="check" style="width:8px;height:8px"></i>' : ""}
    </div>`;
  const isPacking = section === "packing";
  const bagBadge = (!editMode && isPacking && c.bagTag) ? `<span style="font-size:10px;font-weight:700;color:var(--color-accent-700);background:var(--color-surface);border:1px solid var(--color-divider);border-radius:4px;padding:1px 5px;flex:none;white-space:nowrap">${c.locked ? "🔒" : ""}${esc(c.bagTag)}</span>` : "";
  if (!editMode) {
    return `<div data-act="togglePersonalCheck" data-id="${c.id}" style="cursor:${canEditMine ? "pointer" : "default"};display:flex;align-items:center;gap:8px;padding:7px 6px;border-radius:var(--radius-sm)">
        ${checkbox}
        ${bagBadge}
        <div style="font-size:13px;text-decoration:${c.done ? "line-through" : "none"};opacity:${c.done ? 0.55 : 1};flex:1">${esc(c.label)}</div>
      </div>`;
  }
  const tagChips = isPacking ? `<div style="display:flex;align-items:center;gap:4px;margin-left:20px;margin-top:2px;flex-wrap:wrap">
      ${c.locked
        ? `<span style="font-size:10.5px;color:var(--color-neutral-500);display:flex;align-items:center;gap:3px"><i data-lucide="lock" style="width:10px;height:10px"></i> 隨身（鎖定，不能改）</span>`
        : BAG_TAGS.map(tag => `<div data-act="setPersonalItemBagTag" data-id="${c.id}" data-tag="${tag}" style="cursor:pointer;font-size:10.5px;padding:2px 7px;border-radius:10px;border:1px solid ${c.bagTag === tag ? "var(--color-accent)" : "var(--color-divider)"};color:${c.bagTag === tag ? "var(--color-accent)" : "var(--color-neutral-500)"};font-weight:${c.bagTag === tag ? "700" : "400"}">${esc(tag)}</div>`).join("")}
    </div>` : "";
  return `<div style="padding:2px 0">
      <div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:var(--radius-sm)">
        <div data-act="togglePersonalCheck" data-id="${c.id}" style="cursor:pointer">${checkbox}</div>
        <input class="input input-plain" data-bind-blur="personalChecklistLabel" data-id="${c.id}" value="${esc(c.label)}" style="font-size:13px;text-decoration:${c.done ? "line-through" : "none"};opacity:${c.done ? 0.55 : 1};flex:1" />
        <div class="btn btn-icon btn-ghost" data-act="removePersonalChecklistItem" data-id="${c.id}" style="width:22px;height:22px;flex:none"><i data-lucide="x" style="width:12px;height:12px"></i></div>
      </div>
      ${tagChips}
    </div>`;
}
function renderPersonalChecklistCard(title, section, gridArea) {
  const trip = findTrip();
  const myItems = trip.personalChecklist.filter(it => it.ownerId === state.currentUserId && it.section === section);
  const canEditMine = !!state.currentUserId;
  const editMode = canEditMine && !!state.ui.checklistEditMode[section];
  const isPacking = section === "packing";

  /* 待辦（私人）現在是完全自由的筆記區：沒有公版、沒有分類，旅伴想記什麼就自己新增 */
  if (!isPacking) {
    const rows = myItems.map(c => renderChecklistRow(c, editMode, canEditMine, section)).join("");
    return `<div class="card card-bordered" style="margin-top:var(--space-3)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:6px">
          <div class="card-title" style="font-size:16px">${esc(title)}</div>
          ${canEditMine ? `<div class="btn btn-icon btn-ghost" data-act="toggleChecklistEditMode" data-section="${section}" title="${editMode ? "完成編輯" : "編輯這份清單"}" style="color:${editMode ? "var(--color-accent)" : "inherit"}">${editMode ? '<i data-lucide="check" style="width:16px;height:16px"></i>' : '<i data-lucide="pencil" style="width:15px;height:15px"></i>'}</div>` : ""}
        </div>
        <div style="display:flex;flex-direction:column;gap:1px">
          ${rows || '<div style="font-size:12px;opacity:0.5;padding:6px 2px">尚無項目，點右上角鉛筆新增自己的筆記</div>'}
        </div>
        ${editMode ? `<div class="btn btn-ghost" data-act="addPersonalChecklistItem" data-section="${section}" data-cat="" style="font-size:12px;padding:4px 6px;justify-content:flex-start;margin-top:4px"><i data-lucide="plus" style="width:13px;height:13px"></i> 新增項目</div>` : ""}
      </div>`;
  }

  const templateCats = PACKING_CATS;
  const usedCats = templateCats.concat(Array.from(new Set(myItems.map(it => it.category))).filter(c => !templateCats.includes(c)));
  const viewMode = state.ui.packingViewMode;

  const groupsByCategory = usedCats.map((cat, i) => {
    const key = "personal:" + section + ":" + cat;
    const expanded = !!state.ui.expandedGroups[key];
    const items = myItems.filter(it => it.category === cat);
    items.sort((a, b) => {
      const ia = a.bagTag ? BAG_TAGS.indexOf(a.bagTag) : BAG_TAGS.length;
      const ib = b.bagTag ? BAG_TAGS.indexOf(b.bagTag) : BAG_TAGS.length;
      return ia - ib;
    });
    const rows = items.map(c => renderChecklistRow(c, editMode, canEditMine, section)).join("");
    return `<div style="padding:8px 0;border-bottom:${i < usedCats.length - 1 ? "1px solid var(--color-divider)" : "none"}">
        <div data-act="toggleGroupCollapse" data-id="${esc(key)}" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:12.5px;font-weight:700">${CATEGORY_EMOJI[cat] ? CATEGORY_EMOJI[cat] + " " : ""}${esc(cat)}${CATEGORY_NOTE[cat] ? `<span style="font-weight:400;opacity:.55;font-size:11px"> ${esc(CATEGORY_NOTE[cat])}</span>` : ""}</div>
          <i data-lucide="${expanded ? "chevron-up" : "chevron-down"}" style="width:14px;height:14px;color:var(--color-accent-700)"></i>
        </div>
        ${expanded ? `<div style="display:flex;flex-direction:column;gap:1px;margin-top:6px">
          ${rows || '<div style="font-size:12px;opacity:0.5;padding:4px 2px">尚無項目</div>'}
          ${editMode ? `<div class="btn btn-ghost" data-act="addPersonalChecklistItem" data-section="${section}" data-cat="${cat}" style="font-size:12px;padding:4px 6px;justify-content:flex-start;margin-top:2px"><i data-lucide="plus" style="width:13px;height:13px"></i> 新增項目</div>` : ""}
        </div>` : ""}
      </div>`;
  }).join("");

  const TAG_EMOJI = { "隨身": "🎒", "登機箱": "🧳", "託運": "📦", "未分類": "❔" };
  const tagGroupNames = BAG_TAGS.concat(myItems.some(it => !it.bagTag) ? ["未分類"] : []);
  const groupsByTag = tagGroupNames.map((tag, i) => {
    const key = "personal:packingtag:" + tag;
    const expanded = !!state.ui.expandedGroups[key];
    const items = tag === "未分類" ? myItems.filter(it => !it.bagTag) : myItems.filter(it => it.bagTag === tag);
    const rows = items.map(c => renderChecklistRow(c, editMode, canEditMine, section)).join("");
    return `<div style="padding:8px 0;border-bottom:${i < tagGroupNames.length - 1 ? "1px solid var(--color-divider)" : "none"}">
        <div data-act="toggleGroupCollapse" data-id="${esc(key)}" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:12.5px;font-weight:700">${TAG_EMOJI[tag] || ""} ${esc(tag)}（${items.length}）</div>
          <i data-lucide="${expanded ? "chevron-up" : "chevron-down"}" style="width:14px;height:14px;color:var(--color-accent-700)"></i>
        </div>
        ${expanded ? `<div style="display:flex;flex-direction:column;gap:1px;margin-top:6px">${rows || '<div style="font-size:12px;opacity:0.5;padding:4px 2px">尚無項目</div>'}</div>` : ""}
      </div>`;
  }).join("");

  const groups = viewMode === "tag" ? groupsByTag : groupsByCategory;
  // iOS 風格開關：純圖示的滑塊，不放文字/圖案在滑塊裡；關＝原分類、開＝依標籤（隨身/登機/託運）分類
  const viewToggle = isPacking ? `
    <div data-act="setPackingViewMode" data-mode="${viewMode === "tag" ? "category" : "tag"}" title="${viewMode === "tag" ? "切換回原分類" : "切換成依隨身/登機/託運分類"}" style="position:relative;width:38px;height:22px;border-radius:999px;flex:none;cursor:pointer;background:${viewMode === "tag" ? "var(--color-accent)" : "var(--color-neutral-300)"};transition:background .15s ease">
      <div style="position:absolute;top:2px;left:${viewMode === "tag" ? "18px" : "2px"};width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .15s ease"></div>
    </div>` : "";
  const uncheckAllBtn = isPacking ? `<div class="btn btn-icon btn-ghost" data-act="uncheckAllPacking" title="全部取消勾選，重新收拾行李"><i data-lucide="rotate-ccw" style="width:15px;height:15px"></i></div>` : "";
  return `<div style="background:var(--color-bg);border:1.5px solid var(--color-accent-300);border-radius:var(--radius-lg);padding:var(--space-4)${gridArea ? `;grid-area:${gridArea}` : ""}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${isPacking ? "8px" : "6px"};gap:6px">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <div class="card-title" style="font-size:16px">${esc(title)}</div>
          ${viewToggle}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex:none">
          ${uncheckAllBtn}
          ${canEditMine ? `<div class="btn btn-icon btn-ghost" data-act="toggleChecklistEditMode" data-section="${section}" title="${editMode ? "完成編輯" : "編輯這份清單"}" style="color:${editMode ? "var(--color-accent)" : "inherit"}">${editMode ? '<i data-lucide="check" style="width:16px;height:16px"></i>' : '<i data-lucide="pencil" style="width:15px;height:15px"></i>'}</div>` : ""}
        </div>
      </div>
      ${editMode && canEditMine ? `<div class="btn btn-ghost" data-act="resetMyChecklist" data-section="${section}" style="font-size:11px;opacity:.7;margin-bottom:8px"><i data-lucide="refresh-cw" style="width:12px;height:12px"></i> 清空重新套用最新公版</div>` : ""}
      ${groups}
    </div>`;
}

/* 待辦(共用區)：團體（單一勾選狀態、只有主揪能操作）／個人（項目共用，但各自打勾，可看到誰打了勾）
   兩邊都用跟票券/保險&金融相關/其他一樣的分類方式呈現，跟「待辦(私人)」維持一致的操作習慣 */
function renderSharedTodoRow(it, tab, editMode) {
  if (tab === "group") {
    const checked = !!it.done;
    const clickable = isPrimaryEditor();
    const checkbox = `<div ${clickable ? `data-act="toggleSharedGroupItem" data-id="${it.id}"` : ""} style="cursor:${clickable ? "pointer" : "default"};width:16px;height:16px;border-radius:50%;border:1.5px solid ${checked ? "var(--color-accent)" : "var(--color-divider)"};background:${checked ? "var(--color-accent)" : "transparent"};flex:none;display:flex;align-items:center;justify-content:center;color:var(--color-bg)">
        ${checked ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
      </div>`;
    const labelHtml = editMode
      ? `<input class="input input-plain" data-bind-blur="sharedTodoLabel" data-cat="group" data-id="${it.id}" value="${esc(it.label)}" style="font-size:13px;text-decoration:${checked ? "line-through" : "none"};opacity:${checked ? 0.55 : 1};flex:1" />`
      : `<div style="font-size:13px;text-decoration:${checked ? "line-through" : "none"};opacity:${checked ? 0.55 : 1};flex:1">${esc(it.label)}</div>`;
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 2px">
        ${checkbox}${labelHtml}
        ${editMode ? `<div class="btn btn-icon btn-ghost" data-act="removeSharedTodoItem" data-tab="group" data-id="${it.id}" style="width:22px;height:22px;flex:none"><i data-lucide="x" style="width:12px;height:12px"></i></div>` : ""}
      </div>`;
  }
  const checkedBy = it.checkedBy || [];
  const iChecked = state.currentUserId && checkedBy.includes(state.currentUserId);
  const clickable = !!state.currentUserId;
  const checkbox = `<div ${clickable ? `data-act="toggleSharedPersonalItem" data-id="${it.id}"` : ""} style="cursor:${clickable ? "pointer" : "default"};width:16px;height:16px;border-radius:50%;border:1.5px solid ${iChecked ? "var(--color-accent)" : "var(--color-divider)"};background:${iChecked ? "var(--color-accent)" : "transparent"};flex:none;display:flex;align-items:center;justify-content:center;color:var(--color-bg)">
      ${iChecked ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
    </div>`;
  const labelHtml = editMode
    ? `<input class="input input-plain" data-bind-blur="sharedTodoLabel" data-cat="personal" data-id="${it.id}" value="${esc(it.label)}" style="font-size:13px;flex:1" />`
    : `<div style="font-size:13px;flex:1">${esc(it.label)}</div>`;
  const avatars = checkedBy.map(pid => {
    const p = state.collaborators.find(c => c.id === pid);
    if (!p) return "";
    return avatar(p.initial, PEOPLE_COLORS[p.colorIdx % PEOPLE_COLORS.length], 18);
  }).join("");
  return `<div style="display:flex;align-items:center;gap:8px;padding:6px 2px">
      ${checkbox}${labelHtml}
      ${avatars ? `<div style="display:flex;gap:2px;margin-right:2px">${avatars}</div>` : ""}
      ${editMode ? `<div class="btn btn-icon btn-ghost" data-act="removeSharedTodoItem" data-tab="personal" data-id="${it.id}" style="width:22px;height:22px;flex:none"><i data-lucide="x" style="width:12px;height:12px"></i></div>` : ""}
    </div>`;
}
function renderSharedTodoCard(trip) {
  const sharedTodo = trip.sharedTodo || { group: [], personal: [] };
  const tab = state.ui.sharedTodoTab === "personal" ? "personal" : "group";
  const primary = isPrimaryEditor();
  const editMode = primary && state.ui.sharedTodoEditMode;
  const items = sharedTodo[tab] || [];
  // 檢視狀態下只顯示「實際有項目」的分類（例如個人分頁沒有票券項目就不顯示票券）；
  // 編輯模式下把所有分類都列出來，主揪才能對空分類新增項目
  const catsWithItems = Array.from(new Set(items.map(it => it.category || "其他")));
  const usedCats = editMode
    ? PREP_CATS.concat(catsWithItems.filter(c => !PREP_CATS.includes(c)))
    : PREP_CATS.filter(c => catsWithItems.includes(c)).concat(catsWithItems.filter(c => !PREP_CATS.includes(c)));

  const groups = usedCats.map((cat, i) => {
    const catItems = items.filter(it => (it.category || "其他") === cat);
    const rows = catItems.map(it => renderSharedTodoRow(it, tab, editMode)).join("");
    return `<div style="padding:8px 0;border-bottom:${i < usedCats.length - 1 ? "1px solid var(--color-divider)" : "none"}">
        <div style="font-size:12.5px;font-weight:700">${CATEGORY_EMOJI[cat] ? CATEGORY_EMOJI[cat] + " " : ""}${esc(cat)}${CATEGORY_NOTE[cat] ? `<span style="font-weight:400;opacity:.55;font-size:11px"> ${esc(CATEGORY_NOTE[cat])}</span>` : ""}</div>
        <div style="display:flex;flex-direction:column;gap:1px;margin-top:6px">
          ${rows || '<div style="font-size:12px;opacity:0.5;padding:4px 2px">尚無項目</div>'}
          ${editMode ? `<div class="btn btn-ghost" data-act="addSharedTodoItem" data-tab="${tab}" data-cat="${esc(cat)}" style="font-size:12px;padding:4px 6px;justify-content:flex-start;margin-top:2px"><i data-lucide="plus" style="width:13px;height:13px"></i> 新增項目</div>` : ""}
        </div>
      </div>`;
  }).join("");

  const tabBar = `<div style="display:flex;gap:4px;flex:none">
      <div class="tab-pill" data-act="setSharedTodoTab" data-tab="group" style="padding:5px 12px;font-size:11.5px;background:${tab === "group" ? "var(--color-accent)" : "var(--color-surface)"};color:${tab === "group" ? "var(--color-bg)" : "var(--color-text)"}">團體</div>
      <div class="tab-pill" data-act="setSharedTodoTab" data-tab="personal" style="padding:5px 12px;font-size:11.5px;background:${tab === "personal" ? "var(--color-accent)" : "var(--color-surface)"};color:${tab === "personal" ? "var(--color-bg)" : "var(--color-text)"}">個人</div>
    </div>`;

  return `<div class="card card-bordered" style="margin-top:var(--space-4);margin-bottom:var(--space-3)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="card-title" style="font-size:16px">全體進度</div>
          ${tabBar}
        </div>
        ${primary ? `<div class="btn btn-icon btn-ghost" data-act="toggleSharedTodoEditMode" title="${editMode ? "完成編輯" : "編輯這份清單"}" style="color:${editMode ? "var(--color-accent)" : "inherit"}">${editMode ? '<i data-lucide="check" style="width:16px;height:16px"></i>' : '<i data-lucide="pencil" style="width:15px;height:15px"></i>'}</div>` : ""}
      </div>
      <div style="font-size:11px;opacity:.6;margin-bottom:4px">${tab === "group" ? "團體項目統籌進度，由主揪勾選" : "大家被分派的任務，主揪可以看到誰已完成"}</div>
      ${editMode ? `<div class="btn btn-ghost" data-act="resetSharedTodo" style="font-size:11px;opacity:.7;margin-bottom:6px"><i data-lucide="refresh-cw" style="width:12px;height:12px"></i> 清空重新套用最新公版</div>` : ""}
      ${groups}
    </div>`;
}

function renderPrep(trip) {
  const canEdit = canEditGeneral();
  ensurePersonalChecklistSeeded();
  trip = findTrip();
  const mainTab = ["todo", "packing", "notes"].includes(state.ui.prepMainTab) ? state.ui.prepMainTab : "todo";

  const folderTab = (tab, label) => {
    const active = mainTab === tab;
    return `<div data-act="setPrepMainTab" data-tab="${tab}" style="cursor:pointer;padding:9px 22px;border-radius:14px 14px 0 0;font-size:13.5px;font-weight:700;background:${active ? "var(--color-bg)" : "var(--color-surface)"};color:${active ? "var(--color-accent-700)" : "var(--color-neutral-500)"};position:relative;${active ? "border:1.5px solid var(--color-accent-300);border-bottom:none" : ""}">${esc(label)}</div>`;
  };
  const folderTabs = `<div style="display:flex;gap:4px;padding-left:2px;position:relative;z-index:1">
      ${folderTab("todo", "待辦")}
      ${folderTab("packing", "行李")}
      ${folderTab("notes", "注意事項")}
    </div>`;

  const todoContent = `
    ${renderSharedTodoCard(trip)}
    ${renderPersonalChecklistCard("私人待辦", "prep")}`;

  const packingContent = renderPersonalChecklistCard("行李清單", "packing");

  const notesContent = `<div style="background:var(--color-bg);border:1.5px solid var(--color-accent-300);border-radius:var(--radius-lg);padding:var(--space-4)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:6px">
        <div class="card-title" style="font-size:16px">注意事項</div>
        ${isPrimaryEditor() ? `<div class="btn btn-ghost" data-act="resetPrepNotes" style="font-size:11px;opacity:.7"><i data-lucide="refresh-cw" style="width:12px;height:12px"></i> 重置成公版</div>` : ""}
      </div>
      <textarea class="input" data-bind-blur="notes" ${canEdit ? "" : "readonly"} rows="${estimateTextareaRows(trip.notes, 6)}" style="font-size:13px;line-height:1.85;height:auto" placeholder="出入境、託運行李等提醒">${esc(trip.notes)}</textarea>
    </div>`;

  const contentByTab = { todo: todoContent, packing: packingContent, notes: notesContent };

  return `
  ${folderTabs}
  <div style="margin-top:-1px">
    ${contentByTab[mainTab]}
  </div>`;
}

/* ---------------------------------------------------------------------- */
/* Render — 行程 (Itinerary)                                                */
/* ---------------------------------------------------------------------- */
function renderItinerary(trip, day) {
  const canEdit = canEditGeneral();
  const dayChips = trip.days.map(d => {
    const active = d.id === state.activeDayId;
    return `<div class="day-chip" data-act="selectDay" data-id="${d.id}" style="background:${active ? "var(--color-accent)" : "var(--color-surface)"};color:${active ? "var(--color-bg)" : "var(--color-text)"}">
        <div style="font-size:10.5px;opacity:.75">Day ${d.index}</div>
        <div style="font-size:13px;font-weight:700">${esc(d.dateLabel)}</div>
        ${d.title ? `<div style="font-size:10px;opacity:.85;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.title)}</div>` : ""}
      </div>`;
  }).join("");

  if (!day) {
    return `<div class="chip-row" style="margin-bottom:var(--space-3)">${dayChips}</div><div style="padding:var(--space-8) 0;text-align:center;opacity:.6">這個行程還沒有任何天數</div>`;
  }

  const filterCat = state.itineraryFilter === "transit" ? "交通" : state.itineraryFilter === "stay" ? "住宿" : null;
  const itemCanDrag = canEdit && !filterCat;
  const visibleItems = day.items.filter(it => !filterCat || it.category === filterCat);

  const timeGroups = [];
  const map = {};
  visibleItems.forEach(it => {
    if (!map[it.time]) { map[it.time] = { time: it.time, items: [] }; timeGroups.push(map[it.time]); }
    map[it.time].items.push(it);
  });

  const timelineHtml = timeGroups.map(grp => {
    const showDot = !grp.items.every(it => it.isBackup);
    const itemsHtml = grp.items.map(it => {
      const meta = CATEGORY_META[it.category] || CATEGORY_META["其他"];
      const isExpanded = state.ui.expandedItemIds.includes(it.id);
      const locationDisplay = it.location
        ? (it.locationUrl
            ? `<a href="${esc(it.locationUrl)}" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--color-accent-700);text-decoration:underline">${esc(it.location)}</a>`
            : `<span style="font-size:12.5px;color:var(--color-text);opacity:.8">${esc(it.location)}</span>`)
        : `<span style="font-size:12.5px;opacity:.4">尚未設定地點</span>`;
      const locationBlock = isExpanded ? `
        <div style="display:flex;align-items:center;gap:5px;margin-top:2px;margin-left:40px">
          <span style="font-size:12px">📌</span>
          ${locationDisplay}
          ${it.locationUrl ? `<a href="${esc(it.locationUrl)}" target="_blank" rel="noopener" title="在 Google 地圖開啟"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg></a>` : ""}
        </div>
        ${it.alert ? `<div style="font-size:12.5px;line-height:1.7;font-weight:600;color:var(--color-danger,#c0392b);margin-top:6px;margin-left:40px">⚠️ ${esc(it.alert)}</div>` : ""}
        ${it.note ? `<div style="font-size:12.5px;line-height:1.7;opacity:.75;margin-top:6px;margin-left:40px">${esc(it.note)}</div>` : ""}
        ${it.docs && it.docs.length ? `<div data-act="openDocGallery" data-id="${it.id}" style="cursor:pointer;font-size:12.5px;color:var(--color-accent-700);text-decoration:underline;margin-top:6px;margin-left:40px;display:flex;align-items:center;gap:4px"><i data-lucide="paperclip" style="width:12px;height:12px"></i> 行程資料（${it.docs.length}）</div>` : ""}
        ${canEdit && trip.days.length > 1 ? `<div data-act="openMoveItemModal" data-id="${it.id}" style="cursor:pointer;font-size:12.5px;color:var(--color-accent-700);text-decoration:underline;margin-top:6px;margin-left:40px;display:flex;align-items:center;gap:4px"><i data-lucide="calendar-days" style="width:12px;height:12px"></i> 移到別天</div>` : ""}
      ` : "";
      const thumbSize = canEdit ? 52 : 88;
      const thumb = imageSlot("item-photo-" + it.id, "", { style: `width:${thumbSize}px;height:${thumbSize}px`, radius: 8, compact: true, compactIconSize: canEdit ? 16 : 24 });
      return `
      <div data-item-row="${it.id}" style="flex:1;min-width:240px">
        <div class="card item-card ${it.isBackup ? "backup" : "normal"}" style="opacity:${state.ui.draggingItemId === it.id ? 0.5 : 1}">
          ${itemCanDrag ? `<div class="drag-handle" data-drag-handle="${it.id}"><i data-lucide="grip-vertical" style="width:16px;height:16px;opacity:.45"></i></div>` : ""}
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="flex-shrink:0;white-space:nowrap;font-size:11px;font-weight:700;text-decoration:underline;color:${meta.tagFg}">${esc(it.category)}</div>
              <div style="font-size:12.5px;color:var(--color-accent-700)">${esc(it.time)}</div>
              ${it.isBackup ? `<div style="font-size:10.5px;font-weight:700;opacity:.55;letter-spacing:.04em">備案</div>` : ""}
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <div style="width:32px;height:32px;border-radius:50%;background:${meta.tagBg};display:flex;align-items:center;justify-content:center;flex:none">
                ${categoryIconSvg(meta.icon, 16, meta.tagFg)}
              </div>
              <div style="font-size:15.5px;font-weight:700;font-family:var(--font-body);flex:1;min-width:80px">${esc(it.title)}</div>
            </div>
            ${locationBlock}
            <div data-act="toggleItemExpanded" data-id="${it.id}" style="cursor:pointer;display:flex;align-items:center;gap:3px;margin-left:40px;margin-top:6px;font-size:11.5px;color:var(--color-accent-700);opacity:.85">
              ${isExpanded ? "收合" : "詳細行程"} <i data-lucide="${isExpanded ? "chevron-up" : "chevron-down"}" style="width:12px;height:12px"></i>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex:none">
            ${canEdit ? `<div style="display:flex;flex-direction:column;gap:4px">
                <div class="btn btn-icon btn-ghost" data-act="openEditItem" data-id="${it.id}"><i data-lucide="pencil" style="width:14px;height:14px"></i></div>
                <div class="btn btn-icon btn-ghost" data-act="removeItem" data-id="${it.id}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></div>
              </div>` : ""}
            ${thumb}
          </div>
        </div>
      </div>`;
    }).join("");
    return `<div style="position:relative">
        ${showDot ? '<div class="timeline-dot"></div>' : ""}
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start">${itemsHtml}</div>
      </div>`;
  }).join("");

  return `
    <div class="chip-row" style="margin-bottom:var(--space-3)">${dayChips}</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:var(--space-4);flex-wrap:wrap">
      <input class="input input-plain" data-bind-blur="dayTitle" value="${esc(day.title || "")}" ${canEdit ? "" : "readonly"} placeholder="標題" title="為這天下個標題，例如：國際通" style="font-size:14px;font-weight:600;width:96px;flex:none" />
      <div class="seg">
        <label class="seg-opt ${state.itineraryFilter === "all" ? "active" : ""}" data-act="setFilter" data-id="all">總覽</label>
        <label class="seg-opt ${state.itineraryFilter === "transit" ? "active" : ""}" data-act="setFilter" data-id="transit">交通</label>
        <label class="seg-opt ${state.itineraryFilter === "stay" ? "active" : ""}" data-act="setFilter" data-id="stay">住宿</label>
      </div>
      ${canEdit && trip.days.length > 1 ? `<div class="btn btn-secondary" data-act="openSwapDayModal" style="font-size:12px;flex:none"><i data-lucide="repeat" style="width:13px;height:13px"></i> 跟別天互換</div>` : ""}
    </div>
    ${canEdit ? `<div class="fab" data-act="openAddItem" title="新增行程"><i data-lucide="plus" style="width:24px;height:24px"></i></div>` : ""}
    <div class="timeline">
      <div class="timeline-rail"></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${timelineHtml || ""}
      </div>
      ${visibleItems.length === 0 ? '<div style="padding:var(--space-8) 0;text-align:center;opacity:.6;font-size:14px">這個篩選條件下還沒有行程</div>' : ""}
    </div>`;
}

/* ---------------------------------------------------------------------- */
/* Render — 預算                                                           */
/* ---------------------------------------------------------------------- */
function renderBudget(trip) {
  const canEdit = canEditGeneral();
  const canManage = isPrimaryEditor();
  ensureFxRates();

  // 合計：只加總「我」是付款旅伴之一的項目（換算成台幣後加總，避免不同幣別直接相加）
  const myTotalTWD = trip.budget.reduce((sum, b) => {
    if (!(b.payerIds || []).includes(state.currentUserId)) return sum;
    const twd = toTWD(b.amount, b.currency || "TWD");
    return sum + (twd || 0);
  }, 0);
  const myTotalLocal = convertToLocal(myTotalTWD, trip);

  const groupsHtml = BUDGET_CATS.map(cat => {
    const items = trip.budget.filter(b => b.category === cat && (cat !== "個人" || b.ownerId === state.currentUserId));
    const isPersonalCat = cat === "個人";
    // 小計：只加總「我」是付款旅伴之一的項目（換算成台幣後加總），跟最上方合計邏輯一致
    const subtotalTWD = items.reduce((sum, b) => {
      if (!(b.payerIds || []).includes(state.currentUserId)) return sum;
      return sum + (toTWD(b.amount, b.currency || "TWD") || 0);
    }, 0);
    const rows = isPersonalCat ? (() => {
      // 依日期分組：同一天的項目底下不用每行都重複顯示 D1，只在這組最上面顯示一次
      const dayGroups = [];
      const dayGroupMap = new Map();
      items.forEach(b => {
        const idx = b.dayId ? ((trip.days.find(d => d.id === b.dayId) || {}).index || null) : null;
        const key = idx != null ? idx : "none";
        if (!dayGroupMap.has(key)) {
          const g = { key, idx, items: [] };
          dayGroupMap.set(key, g);
          dayGroups.push(g);
        }
        dayGroupMap.get(key).items.push(b);
      });
      dayGroups.sort((a, b) => {
        if (a.key === "none") return 1;
        if (b.key === "none") return -1;
        return a.idx - b.idx;
      });
      return dayGroups.map(g => {
        const header = g.key !== "none" ? `<div style="font-size:10.5px;font-weight:700;color:var(--color-accent-700);margin:8px 0 2px 2px">D${g.idx}</div>` : "";
        const itemRows = g.items.map(b => {
          const cur = b.currency || "TWD";
          const convertedText = convertedTextForItem(b, trip);
          const rowCanEdit = canEditBudgetItem(b);
          const rowCanRemove = canRemoveBudgetItem(b);
          // 個人項目：單行呈現。項目文字吃掉剩餘空間、金額欄位縮窄，價格自然被推到比較右邊的位置
          return `
      <div style="display:flex;align-items:center;gap:8px;padding:1px 2px;font-size:13px">
          <input class="input input-plain input-compact" data-bind-blur="budgetLabel" data-id="${b.id}" value="${esc(b.label)}" ${rowCanEdit ? "" : "readonly"} style="font-size:13px;flex:1;min-width:0" />
          <div style="display:flex;align-items:baseline;gap:2px;flex:none;font-family:var(--font-body);font-weight:700;opacity:.85;white-space:nowrap;margin-left:6px">${currencySymbol(cur)}<input class="input input-plain input-compact input-amount input-amount-sm" type="number" data-bind-blur="budgetAmount" data-id="${b.id}" value="${b.amount}" ${rowCanEdit ? "" : "readonly"} style="font-size:13px;width:52px;font-family:var(--font-body);font-weight:700" /></div>
          ${convertedText ? `<div style="font-size:10.5px;color:var(--color-neutral-500);white-space:nowrap;flex:none">${convertedText}</div>` : ""}
          <div style="display:flex;gap:2px;flex:none">
            ${rowCanEdit ? `<div class="btn btn-icon btn-ghost" data-act="openEditBudget" data-id="${b.id}"><i data-lucide="pencil" style="width:13px;height:13px"></i></div>` : ""}
            ${rowCanRemove ? `<div class="btn btn-icon btn-ghost" data-act="removeBudget" data-id="${b.id}"><i data-lucide="x" style="width:13px;height:13px"></i></div>` : ""}
          </div>
        </div>`;
        }).join("");
        return header + itemRows;
      }).join("");
    })() : items.map((b, i) => {
      const cur = b.currency || "TWD";
      const convertedText = convertedTextForItem(b, trip);
      const rowCanEdit = canEditBudgetItem(b);
      const rowCanRemove = canRemoveBudgetItem(b);
      const payerRow = state.collaborators.map(p => {
        const active = (b.payerIds || []).includes(p.id);
        const color = PEOPLE_COLORS[p.colorIdx % PEOPLE_COLORS.length];
        return `<div data-act="${rowCanEdit ? "toggleBudgetPayer" : ""}" data-id="${b.id}" data-person="${p.id}" title="${esc(p.name)}${active ? "（需付款）" : ""}" style="cursor:${rowCanEdit ? "pointer" : "default"};width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex:none;color:${active ? "#fff" : "var(--color-neutral-400)"};background:${active ? color : "transparent"};border:1.5px solid ${active ? color : "var(--color-divider)"}">${esc(p.initial)}</div>`;
      }).join("");
      return `
      <div style="padding:1px 2px;font-size:13px">
        <div style="display:flex;align-items:center;gap:6px">
          ${rowCanEdit ? `<div style="display:flex;flex-direction:column;flex:none">
            <div data-act="reorderBudget" data-cat="${cat}" data-dir="up" data-id="${b.id}" style="cursor:pointer;opacity:${i > 0 ? 1 : 0.25};line-height:0"><i data-lucide="chevron-up" style="width:11px;height:11px"></i></div>
            <div data-act="reorderBudget" data-cat="${cat}" data-dir="down" data-id="${b.id}" style="cursor:pointer;opacity:${i < items.length - 1 ? 1 : 0.25};line-height:0"><i data-lucide="chevron-down" style="width:11px;height:11px"></i></div>
          </div>` : ""}
          <input class="input input-plain input-compact" data-bind-blur="budgetLabel" data-id="${b.id}" value="${esc(b.label)}" ${rowCanEdit ? "" : "readonly"} style="font-size:13px;flex:1;min-width:40px" />
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex:none">${payerRow}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:1px;padding-left:${rowCanEdit ? "18px" : "0"}">
          <div style="display:flex;align-items:baseline;gap:6px;flex:none;text-align:left">
            <div style="display:flex;align-items:center;gap:2px;font-family:var(--font-body);font-weight:700;opacity:.85">${currencySymbol(cur)} <input class="input input-plain input-compact input-amount" type="number" data-bind-blur="budgetAmount" data-id="${b.id}" value="${b.amount}" ${rowCanEdit ? "" : "readonly"} style="font-size:13px;width:78px;font-family:var(--font-body);font-weight:700" />/人</div>
            ${convertedText ? `<div style="font-size:11px;color:var(--color-neutral-500);white-space:nowrap">${convertedText}</div>` : ""}
          </div>
          <div style="display:flex;gap:2px;flex:none">
            ${rowCanEdit ? `<div class="btn btn-icon btn-ghost" data-act="openEditBudget" data-id="${b.id}"><i data-lucide="pencil" style="width:13px;height:13px"></i></div>` : ""}
            ${rowCanRemove ? `<div class="btn btn-icon btn-ghost" data-act="removeBudget" data-id="${b.id}"><i data-lucide="x" style="width:13px;height:13px"></i></div>` : ""}
          </div>
        </div>
      </div>`;
    }).join("");
    const canAddPersonal = isPersonalCat && !!state.currentUserId;
    return `<div class="card card-bordered" style="${isPersonalCat ? "background:color-mix(in srgb, var(--color-accent) 7%, var(--color-bg))" : ""}">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--color-divider)">
          <div class="card-title" style="font-size:11.5px;letter-spacing:.08em">${esc(cat)}<span style="opacity:.6;font-weight:400;letter-spacing:normal"> · ${isPersonalCat ? "自行編輯項目，不會與旅伴同步" : "由主揪統一規劃"}</span></div>
          <div style="font-size:13px;color:var(--color-neutral-600);display:flex;align-items:baseline;gap:5px">小計 <span style="font-size:14px;font-weight:700;color:var(--color-accent-700);font-family:var(--font-body)">NT$ ${fmtMoney(subtotalTWD)}</span></div>
        </div>
        <div style="display:flex;flex-direction:column">
          ${rows || '<div style="font-size:12.5px;opacity:.5;padding:4px 2px">尚無花費</div>'}
        </div>
        ${canAddPersonal ? `<div class="btn btn-ghost" data-act="openAddPersonalBudget" style="font-size:12.5px;margin-top:6px"><i data-lucide="plus" style="width:14px;height:14px"></i> 新增我的項目</div>` : ""}
      </div>`;
  }).join("");

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);gap:8px">
      <div style="min-width:0">
        <div class="card-title" style="font-size:16px">合計</div>
        <div style="font-size:11px;color:var(--color-neutral-500);margin-top:2px">僅計入你需要付款的項目</div>
      </div>
      <div style="text-align:right;flex:none">
        <div style="font-size:26px;font-weight:700;color:var(--color-accent-700);font-family:var(--font-body)">NT$ ${fmtMoney(myTotalTWD)}</div>
        ${myTotalLocal ? `<div style="font-size:12px;color:var(--color-neutral-500)">${myTotalLocal}（今日匯率）</div>` : ""}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--space-3)">${groupsHtml}</div>
    ${state.fx ? `<div style="text-align:center;margin-top:var(--space-4);font-size:11px;color:var(--color-neutral-400)">匯率資料來源：<a href="https://www.exchangerate-api.com" target="_blank" rel="noopener" style="color:inherit">ExchangeRate-API</a></div>` : ""}
    ${canManage ? `<div class="fab" data-act="openAddBudget" title="新增花費"><i data-lucide="plus" style="width:24px;height:24px"></i></div>` : ""}`;
}

/* ---------------------------------------------------------------------- */
/* Render — 備忘錄                                                         */
/* ---------------------------------------------------------------------- */
function renderMemo(trip) {
  ensureFxRates();
  const filters = [{ id: "all", label: "全部" }, ...trip.memoTags.map(t => ({ id: t, label: t }))];
  const filtersHtml = filters.map(f => {
    if (f.id === "all") {
      return `<div class="tag" data-act="selectMemoTagFilter" data-id="${esc(f.id)}" style="cursor:pointer;padding:7px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;white-space:nowrap;flex:none;background:${state.memoTagFilter === f.id ? "var(--color-accent)" : "var(--color-surface)"};color:${state.memoTagFilter === f.id ? "var(--color-bg)" : "var(--color-text)"}">${esc(f.label)}</div>`;
    }
    const active = state.memoTagFilter === f.id;
    if (state.ui.editingMemoTag === f.id) {
      return `<input class="input input-plain" data-bind-blur="memoTagName" data-id="${esc(f.id)}" value="${esc(f.id)}" autofocus style="font-size:13px;font-weight:600;padding:6px 10px;border-radius:var(--radius-sm);background:var(--color-surface);width:96px;flex:none" />`;
    }
    return `<div class="tag" style="display:flex;align-items:center;gap:5px;padding:5px 6px 5px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;white-space:nowrap;flex:none;background:${active ? "var(--color-accent)" : "var(--color-surface)"};color:${active ? "var(--color-bg)" : "var(--color-text)"}">
        <div data-act="selectMemoTagFilter" data-id="${esc(f.id)}" style="cursor:pointer">${esc(f.label)}</div>
        <div data-act="startEditMemoTag" data-id="${esc(f.id)}" style="cursor:pointer;display:flex;opacity:.7"><i data-lucide="pencil" style="width:11px;height:11px"></i></div>
        <div data-act="removeMemoTag" data-id="${esc(f.id)}" style="cursor:pointer;display:flex;opacity:.7"><i data-lucide="x" style="width:12px;height:12px"></i></div>
      </div>`;
  }).join("");

  const visible = trip.memoItems.filter(m => m.ownerId === state.currentUserId && (state.memoTagFilter === "all" || m.tag === state.memoTagFilter));
  const cardsHtml = visible.map((m, i) => {
    const tagIdx = trip.memoTags.indexOf(m.tag);
    const tagClass = MEMO_TAG_CLASSES[tagIdx % MEMO_TAG_CLASSES.length] || "tag-neutral";
    const cur = m.currency || "TWD";
    const convertedText = convertedTextForItem({ amount: m.price, currency: cur }, trip);
    const photoSrc = state.images["memo-photo-" + m.id];
    const photoDisplay = photoSrc
      ? `<div data-act="openLightbox" data-slot="memo-photo-${m.id}" title="點擊看原圖" style="width:100%;height:110px;border-radius:6px;overflow:hidden;cursor:zoom-in;background:var(--color-neutral-200)"><img src="${photoSrc}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>`
      : `<div style="width:100%;height:110px;border-radius:6px;background:var(--color-neutral-200);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--color-neutral-500);font-size:12px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg><span>尚無照片</span></div>`;
    return `<div class="card card-bordered" style="padding:var(--space-3);gap:8px">
        <div style="display:flex;justify-content:flex-end;gap:2px;margin-bottom:-6px">
            <div data-act="reorderMemo" data-dir="up" data-id="${m.id}" style="cursor:pointer;opacity:${i > 0 ? 1 : 0.25}"><i data-lucide="chevron-up" style="width:13px;height:13px"></i></div>
            <div data-act="reorderMemo" data-dir="down" data-id="${m.id}" style="cursor:pointer;opacity:${i < visible.length - 1 ? 1 : 0.25}"><i data-lucide="chevron-down" style="width:13px;height:13px"></i></div>
          </div>
        ${photoDisplay}
        <div class="tag ${tagClass}" style="align-self:flex-start">${esc(m.tag)}</div>
        <div style="font-size:14px;font-weight:700;font-family:var(--font-heading)">${esc(m.name)}</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--color-accent-700);font-family:var(--font-body)">${currencySymbol(cur)}${fmtMoney(m.price)}</div>
          ${convertedText ? `<div style="font-size:11px;color:var(--color-neutral-500)">${convertedText}</div>` : ""}
        </div>
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <div class="btn btn-icon btn-ghost" data-act="openEditMemo" data-id="${m.id}"><i data-lucide="pencil" style="width:13px;height:13px"></i></div>
          <div class="btn btn-icon btn-ghost" data-act="removeMemo" data-id="${m.id}"><i data-lucide="trash-2" style="width:13px;height:13px"></i></div>
        </div>
      </div>`;
  }).join("");

  return `
    <div style="font-size:12.5px;opacity:.6;margin-bottom:var(--space-3);line-height:1.6">這是你的個人清單，只有你看得到<br />（其他旅伴看不到你的項目，你也看不到他們的）</div>
    <div class="tag-scroll-row" style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px;margin-bottom:10px">
      ${filtersHtml}
      <div class="btn btn-ghost" data-act="addMemoTag" style="font-size:12.5px;flex:none;white-space:nowrap"><i data-lucide="tag" style="width:14px;height:14px"></i> 新增分類</div>
    </div>
    <div class="fab" data-act="openAddMemo" title="新增備忘項目"><i data-lucide="plus" style="width:24px;height:24px"></i></div>
    <div class="memo-grid">${cardsHtml || ""}</div>
    ${visible.length === 0 ? '<div style="padding:var(--space-6) 0;opacity:.6;font-size:13.5px">這個分類還沒有項目</div>' : ""}
    ${state.fx ? `<div style="text-align:center;margin-top:var(--space-4);font-size:11px;color:var(--color-neutral-400)">匯率資料來源：<a href="https://www.exchangerate-api.com" target="_blank" rel="noopener" style="color:inherit">ExchangeRate-API</a></div>` : ""}`;
}

/* ---------------------------------------------------------------------- */
/* Render — Modals                                                         */
/* ---------------------------------------------------------------------- */
function renderModals(trip) {
  let html = "";
  if (state.ui.itemModalOpen) {
    const u = state.ui;
    const catOptions = CATEGORY_OPTIONS.map(c => `<option value="${c}" ${u.formCategory === c ? "selected" : ""}>${c}</option>`).join("");
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">${u.editingItemId ? "編輯行程" : "新增行程"}</div>
        <div style="display:flex;gap:10px">
          <div class="field" style="flex:1"><label>時間</label><input class="input" id="f-time" value="${esc(u.formTime)}" placeholder="09:00" /></div>
          <div class="field" style="flex:2"><label>類型</label><select class="input" id="f-category">${catOptions}</select></div>
        </div>
        <div class="field"><label>標題</label><input class="input" id="f-title" value="${esc(u.formTitle)}" placeholder="例：首里城參觀" /></div>
        <div class="field">
          <label>地點</label>
          <input class="input" id="f-location" value="${esc(u.formLocation)}" placeholder="例：那霸市，或貼上 Google 地圖網址自動取名" />
          <div id="f-location-status" style="font-size:11px;color:var(--color-neutral-500);margin-top:4px">${u.formLocationUrl ? "✓ 已連結 Google 地圖，儲存後點地點名稱可直接開啟" : ""}</div>
        </div>
        <div class="field"><label style="color:var(--color-danger,#c0392b)">重要提醒</label><input class="input" id="f-alert" value="${esc(u.formAlert)}" placeholder="例：需事先預約、記得帶護照" style="color:var(--color-danger,#c0392b)" /></div>
        <div class="field"><label>備註</label><input class="input" id="f-note" value="${esc(u.formNote)}" placeholder="提醒事項、預算等" /></div>
        <div class="field">
          <label>行程資料</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${(u.formDocs || []).map(d => `
              <div style="width:84px">
                ${imageSlot("item-doc-" + u.formId + "-" + d.id, "上傳圖片", { style: "width:84px;height:64px", radius: 6, compact: true })}
                <input class="input input-plain" id="f-doc-note-${d.id}" value="${esc(d.note)}" placeholder="說明" style="font-size:11px;margin-top:2px;text-align:center" />
                <div data-act="removeFormDoc" data-id="${d.id}" style="text-align:center;cursor:pointer;opacity:.6;font-size:11px;margin-top:2px">移除</div>
              </div>`).join("")}
            <div data-act="addFormDoc" style="width:84px;height:64px;border-radius:6px;border:1.5px dashed var(--color-divider);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-neutral-500)"><i data-lucide="plus" style="width:18px;height:18px"></i></div>
          </div>
        </div>
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
          ${!u.editingItemId ? `<div class="btn btn-secondary" data-act="saveItemForm" data-backup="1" title="與同時段行程並列顯示，作為備選方案">備案行程</div>` : ""}
          <div class="btn btn-accent-outline" data-act="saveItemForm">儲存</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.budgetModalOpen) {
    const u = state.ui;
    const isEditing = !!u.editingBudgetId;
    const isPersonalForm = u.budgetFormCategory === "個人";
    const opts = BUDGET_CATS.map(c => `<option value="${c}" ${u.budgetFormCategory === c ? "selected" : ""}>${c}</option>`).join("");
    const localCur = localCurrencyForTrip(trip);
    const currencyChoices = ["TWD"].concat(localCur ? [localCur.code] : []);
    const currencyOpts = currencyChoices.map(c => `<option value="${c}" ${u.budgetFormCurrency === c ? "selected" : ""}>${esc((CURRENCY_META[c] || CURRENCY_META.TWD).label)}</option>`).join("");
    const payerChecks = state.collaborators.map(p => `
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;padding:4px 0;cursor:pointer">
        <input type="checkbox" class="bf-payer-check" value="${p.id}" ${(u.budgetFormPayerIds || []).includes(p.id) ? "checked" : ""} />
        ${esc(p.name)}
      </label>`).join("");
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">${isEditing ? "編輯花費" : "新增花費"}</div>
        <div class="field"><label>分類</label><select class="input" id="bf-category" ${isPersonalForm ? "disabled" : ""}>${opts}</select>${isPersonalForm ? '<input type="hidden" id="bf-category-personal" value="個人" />' : ""}</div>
        <div class="field"><label>項目名稱</label><input class="input" id="bf-label" value="${esc(u.budgetFormLabel)}" placeholder="例：飯店住宿費" /></div>
        ${isPersonalForm ? `<div class="field"><label>屬於第幾天</label><select class="input" id="bf-day">${['<option value="">不指定</option>'].concat(trip.days.map(d => `<option value="${d.id}" ${u.budgetFormDayId === d.id ? "selected" : ""}>Day ${d.index} · ${esc(d.dateLabel)}${d.title ? "（" + esc(d.title) + "）" : ""}</option>`)).join("")}</select></div>` : ""}
        <div style="display:flex;gap:10px">
          <div class="field" style="flex:1"><label>金額${isPersonalForm ? "" : "（每人）"}</label><input class="input" id="bf-amount" type="number" value="${esc(u.budgetFormAmount)}" placeholder="0" /></div>
          <div class="field" style="flex:1"><label>幣別</label><select class="input" id="bf-currency">${currencyOpts}</select></div>
        </div>
        ${isPersonalForm ? "" : `<div class="field"><label>需要付款的旅伴</label>${payerChecks}</div>`}
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
          <div class="btn btn-accent-outline" data-act="saveBudgetForm">${isEditing ? "儲存" : "新增"}</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.memoModalOpen) {
    const u = state.ui;
    const isEditing = !!u.editingMemoId;
    const opts = trip.memoTags.map(t => `<option value="${esc(t)}" ${u.memoFormTag === t ? "selected" : ""}>${esc(t)}</option>`).join("");
    const currentUserName = (state.collaborators.find(p => p.id === state.currentUserId) || {}).name || "";
    const localCur = localCurrencyForTrip(trip);
    const currencyChoices = ["TWD"].concat(localCur ? [localCur.code] : []);
    const currencyOpts = currencyChoices.map(c => `<option value="${c}" ${u.memoFormCurrency === c ? "selected" : ""}>${esc((CURRENCY_META[c] || CURRENCY_META.TWD).label)}</option>`).join("");
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">${isEditing ? "編輯備忘項目" : "新增備忘項目"}</div>
        <div class="field"><label>商品照片</label>${imageSlot("memo-photo-" + u.memoFormId, "上傳商品照片", { style: "width:100%;height:130px", radius: 8 })}</div>
        <div class="field"><label>分類</label><select class="input" id="mf-tag">${opts}</select></div>
        <div class="field"><label>品項名稱</label><input class="input" id="mf-name" value="${esc(u.memoFormName)}" placeholder="例：面膜" /></div>
        <div style="display:flex;gap:10px">
          <div class="field" style="flex:1"><label>價格</label><input class="input" id="mf-price" type="number" value="${esc(u.memoFormPrice)}" placeholder="0" /></div>
          <div class="field" style="flex:1"><label>幣別</label><select class="input" id="mf-currency">${currencyOpts}</select></div>
        </div>
        <div style="font-size:12px;opacity:.6">將以「${esc(currentUserName)}」的身份${isEditing ? "編輯" : "新增"}，其他旅伴無法編輯此項目</div>
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
          <div class="btn btn-accent-outline" data-act="saveMemoForm">${isEditing ? "儲存" : "新增"}</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.shareModalOpen) {
    const shareLink = location.origin + location.pathname + "#trip=" + trip.id;
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">分享「${esc(trip.name)}」</div>
        <div style="font-size:13px;opacity:.75;line-height:1.6">把連結傳給旅伴，對方點開後會被詢問「你是哪位旅伴」，選定後之後每次打開都會記住這個身份。</div>
        <div class="input" style="display:flex;align-items:center;justify-content:space-between;font-size:13px;user-select:all">${esc(shareLink)}</div>
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">關閉</div>
          <div class="btn btn-accent-outline" data-act="simulateFriendJoin"><i data-lucide="user-check" style="width:15px;height:15px"></i> 模擬：朋友點開連結</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.addTripModalOpen) {
    const u = state.ui;
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">新增行程</div>
        <div style="display:flex;gap:10px">
          <div class="field" style="flex:2"><label>行程名稱</label><input class="input" id="nt-name" value="${esc(u.newTripName)}" placeholder="例：東京賞櫻之旅" /></div>
          <div class="field" style="flex:1"><label>國旗</label><input class="input" id="nt-flag" value="${esc(u.newTripFlag)}" placeholder="🇯🇵" /></div>
        </div>
        <div class="field"><label>國家・地區</label><input class="input" id="nt-country" value="${esc(u.newTripCountry)}" placeholder="例：日本・東京" /></div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="field" style="flex:1"><label>出發日期</label><input type="date" class="input" id="nt-date-start" value="${esc(u.newTripDateStart)}" /></div>
          <div class="field" style="flex:1"><label>結束日期</label><input type="date" class="input" id="nt-date-end" value="${esc(u.newTripDateEnd)}" min="${esc(u.newTripDateStart)}" /></div>
        </div>
        <div style="font-size:12px;opacity:.6">你會自動成為這個新行程的主編輯者，之後可以在旅伴選單裡邀請其他人加入</div>
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
          <div class="btn btn-accent-outline" data-act="saveNewTripForm">建立行程</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.identityModalOpen) {
    const choicesHtml = state.collaborators.map(p => `
      <div data-act="chooseIdentity" data-id="${p.id}" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);background:var(--color-surface)">
        ${avatar(p.initial, PEOPLE_COLORS[p.colorIdx % PEOPLE_COLORS.length], 28)}
        <div style="font-size:14px">${esc(p.name)}</div>
      </div>`).join("");
    html += `
    <div class="dialog-backdrop">
      <div class="dialog">
        <div class="dialog-title">你是「${esc(trip.name)}」的哪位旅伴？</div>
        <div style="display:flex;flex-direction:column;gap:6px">${choicesHtml}</div>
        <div class="field"><label>或是新的旅伴</label><input class="input" id="new-guest-name" value="${esc(state.ui.newGuestName)}" placeholder="輸入你的名字" /></div>
        <div class="dialog-actions">
          <div class="btn btn-accent-outline" data-act="confirmNewGuest">加入行程</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.unlockModalOpen) {
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">切換到其他行程</div>
        <div class="field"><label>輸入密碼</label><input class="input" id="unlock-password" autofocus /></div>
        ${state.ui.unlockError ? `<div class="unlock-error" style="font-size:12.5px;color:var(--color-danger,#c0392b)">${esc(state.ui.unlockError)}</div>` : ""}
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
          <div class="btn btn-accent-outline" data-act="confirmUnlockTripForm">確認</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.swapDayModalOpen) {
    const otherDays = trip.days.filter(d => d.id !== state.activeDayId);
    const rows = otherDays.map(d => `
      <div data-act="swapDays" data-id="${d.id}" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:var(--radius-sm);background:var(--color-surface)">
        <div>
          <div style="font-size:10.5px;opacity:.6">Day ${d.index} · ${esc(d.dateLabel)}</div>
          <div style="font-size:13px;font-weight:600">${esc(d.title || "（未命名）")}</div>
        </div>
        <i data-lucide="repeat" style="width:14px;height:14px;opacity:.6"></i>
      </div>`).join("");
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">跟哪一天互換？</div>
        <div style="font-size:12px;opacity:.6;margin-bottom:6px">會把兩天的標題和行程項目整組交換，日期本身不會變動</div>
        <div style="display:flex;flex-direction:column;gap:6px">${rows || '<div style="opacity:.5;font-size:13px">沒有其他天可以互換</div>'}</div>
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.moveItemId) {
    const currentItem = trip.days.flatMap(d => d.items).find(it => it.id === state.ui.moveItemId);
    const currentDay = trip.days.find(d => d.items.some(it => it.id === state.ui.moveItemId));
    const otherDays = trip.days.filter(d => !currentDay || d.id !== currentDay.id);
    const rows = otherDays.map(d => `
      <div data-act="moveItemToDay" data-id="${d.id}" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:var(--radius-sm);background:var(--color-surface)">
        <div>
          <div style="font-size:10.5px;opacity:.6">Day ${d.index} · ${esc(d.dateLabel)}</div>
          <div style="font-size:13px;font-weight:600">${esc(d.title || "（未命名）")}</div>
        </div>
        <i data-lucide="chevron-right" style="width:14px;height:14px;opacity:.6"></i>
      </div>`).join("");
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">把「${esc(currentItem ? currentItem.title : "")}」移到哪一天？</div>
        <div style="display:flex;flex-direction:column;gap:6px">${rows || '<div style="opacity:.5;font-size:13px">沒有其他天可以移動</div>'}</div>
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.docGalleryItemId) {
    const item = trip.days.flatMap(d => d.items).find(it => it.id === state.ui.docGalleryItemId);
    const docs = item ? (item.docs || []) : [];
    const idx = Math.min(state.ui.docGalleryIndex, Math.max(docs.length - 1, 0));
    const doc = docs[idx];
    const src = doc ? state.images["item-doc-" + item.id + "-" + doc.id] : null;
    html += `
    <div class="dialog-backdrop lightbox-backdrop" data-act="closeModal" style="z-index:200;background:color-mix(in srgb, black 82%, transparent);padding:var(--space-4)">
      <div data-stop-click class="dialog" style="background:transparent;box-shadow:none;padding:0;display:flex;flex-direction:column;align-items:center;gap:10px;max-width:92vw">
        ${doc && doc.note ? `<div style="color:#fff;font-size:14px;font-weight:600;text-align:center;padding:0 12px">${esc(doc.note)}</div>` : ""}
        <div style="display:flex;align-items:center;gap:10px">
          ${docs.length > 1 ? `<div class="btn btn-icon" data-act="shiftDocGallery" data-dir="-1" style="background:color-mix(in srgb, black 45%, transparent);color:#fff;width:36px;height:36px;border-radius:50%;flex:none"><i data-lucide="chevron-left" style="width:18px;height:18px"></i></div>` : ""}
          ${src ? `<img src="${src}" style="max-width:78vw;max-height:74vh;object-fit:contain;border-radius:10px;box-shadow:var(--shadow-lg)" />` : `<div style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.6;font-size:13px">尚無圖片</div>`}
          ${docs.length > 1 ? `<div class="btn btn-icon" data-act="shiftDocGallery" data-dir="1" style="background:color-mix(in srgb, black 45%, transparent);color:#fff;width:36px;height:36px;border-radius:50%;flex:none"><i data-lucide="chevron-right" style="width:18px;height:18px"></i></div>` : ""}
        </div>
        ${docs.length > 1 ? `<div style="color:#fff;opacity:.7;font-size:12px">${idx + 1} / ${docs.length}</div>` : ""}
      </div>
      <div class="btn btn-icon" data-act="closeModal" style="position:fixed;top:20px;right:20px;background:color-mix(in srgb, black 45%, transparent);color:#fff;width:40px;height:40px;border-radius:50%"><i data-lucide="x" style="width:20px;height:20px"></i></div>
    </div>`;
  }
  if (state.ui.lightboxSrc) {
    html += `
    <div class="dialog-backdrop lightbox-backdrop" data-act="closeLightbox" style="z-index:200;background:color-mix(in srgb, black 82%, transparent);padding:var(--space-4)">
      <img src="${state.ui.lightboxSrc}" style="max-width:92vw;max-height:88vh;object-fit:contain;border-radius:10px;box-shadow:var(--shadow-lg)" />
      <div class="btn btn-icon" data-act="closeLightbox" style="position:fixed;top:20px;right:20px;background:color-mix(in srgb, black 45%, transparent);color:#fff;width:40px;height:40px;border-radius:50%"><i data-lucide="x" style="width:20px;height:20px"></i></div>
    </div>`;
  }
  return html;
}

/* ---------------------------------------------------------------------- */
/* Root render                                                             */
/* ---------------------------------------------------------------------- */
/* 產生一個穩定的 CSS selector 來辨識某個輸入框，重新渲染後才能找回同一個欄位 */
function escAttrSelectorValue(val) { return String(val).replace(/["\\]/g, "\\$&"); }
function getStableSelector(el) {
  if (!el || !el.tagName) return null;
  if (el.id) return "#" + CSS.escape(el.id);
  const bind = el.getAttribute("data-bind-blur");
  if (bind) {
    let sel = `[data-bind-blur="${escAttrSelectorValue(bind)}"]`;
    ["data-id", "data-owner", "data-cat"].forEach(attr => {
      const v = el.getAttribute(attr);
      if (v != null) sel += `[${attr}="${escAttrSelectorValue(v)}"]`;
    });
    return sel;
  }
  return null;
}

/* 替換 innerHTML 過程中，瀏覽器會對即將被移除的焦點欄位強制觸發 blur —— 這段期間
   暫時關閉「離開欄位即儲存」，避免把打到一半的文字誤存、把編輯狀態重置掉 */
let suppressBlurCommit = false;

function doRender() {
  const root = document.getElementById("app");

  // 即時同步可能在使用者正在輸入時觸發重新渲染（例如別人同時在改資料、或 Firestore
  // 快取/伺服器資料前後到達兩次）——這裡先記住目前正在編輯的欄位，重繪後把游標焦點還回去，
  // 不然整個輸入框會被換成新的 DOM 節點，正在打的字跟游標位置都會不見。
  const activeEl = document.activeElement;
  let focusInfo = null;
  if (activeEl && root.contains(activeEl) && /^(INPUT|TEXTAREA|SELECT)$/.test(activeEl.tagName)) {
    const selector = getStableSelector(activeEl);
    if (selector) {
      focusInfo = {
        selector,
        value: activeEl.value,
        selectionStart: typeof activeEl.selectionStart === "number" ? activeEl.selectionStart : null,
        selectionEnd: typeof activeEl.selectionEnd === "number" ? activeEl.selectionEnd : null
      };
    }
  }

  const trip = findTrip();
  const day = findDay();
  let sectionHtml = "";
  if (state.activeSectionTab === "overview") sectionHtml = renderOverview(trip);
  else if (state.activeSectionTab === "prep") sectionHtml = renderPrep(trip);
  else if (state.activeSectionTab === "itinerary") sectionHtml = renderItinerary(trip, day);
  else if (state.activeSectionTab === "budget") sectionHtml = renderBudget(trip);
  else if (state.activeSectionTab === "memo") sectionHtml = renderMemo(trip);

  const html = `
    ${renderNav()}
    ${renderCover(trip)}
    <div class="content-wrap">${sectionHtml}</div>
    ${renderModals(trip)}
    ${renderBottomNav()}
  `;
  // 替換 innerHTML 會讓原本有焦點的輸入框被瀏覽器強制觸發 blur（因為節點被移除），
  // 這會誤觸「離開欄位即儲存」的邏輯、存進打到一半的文字，還會把編輯狀態重置掉 ——
  // 這裡在替換的當下暫時關掉 blur 觸發儲存，換完、把焦點還原後再打開
  suppressBlurCommit = true;
  root.innerHTML = html;
  suppressBlurCommit = false;
  refreshIcons();

  if (focusInfo) {
    try {
      const newEl = root.querySelector(focusInfo.selector);
      if (newEl) {
        newEl.focus();
        if (typeof newEl.value === "string" && newEl.value !== focusInfo.value) newEl.value = focusInfo.value;
        if (newEl.setSelectionRange && focusInfo.selectionStart != null) {
          newEl.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
        }
      }
    } catch (e) { /* 找不到對應欄位或不支援選取範圍就略過，不影響其他功能 */ }
  }
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 2.5 } });
}

/* ---------------------------------------------------------------------- */
/* Event delegation                                                        */
/* ---------------------------------------------------------------------- */
function initEvents() {
  const root = document.getElementById("app");

  // textarea 隨輸入內容即時長高，不用內部捲動就能看到全文
  root.addEventListener("input", e => {
    const el = e.target;
    if (el.tagName === "TEXTAREA") {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  });

  // Click delegation
  root.addEventListener("click", e => {
    // 點擊 dialog／collab-menu 內部但本身沒有 data-act 的元素（例如 checkbox、輸入框、文字）時，
    // closest("[data-act]") 會一路往上找到最外層容器的 data-act（例如 dialog 的 closeModal、
    // 或 user-chip 的 toggleCollabMenu）—— 這裡擋掉這種「跨出邊界」的誤判
    const boundaryEl = e.target.closest(".dialog, .collab-menu");
    let actEl = e.target.closest("[data-act]");
    if (boundaryEl && actEl && !boundaryEl.contains(actEl)) actEl = null;
    if (!actEl) return;
    const act = actEl.getAttribute("data-act");
    if (!act) return;
    const id = actEl.getAttribute("data-id");

    switch (act) {
      case "pickImage": openImagePicker(actEl.getAttribute("data-slot")); break;
      case "removeImage": e.stopPropagation(); actions.removeImage(actEl.getAttribute("data-slot")); break;
      case "selectSection": actions.selectSection(id); break;
      case "toggleCollabMenu": e.stopPropagation(); actions.toggleCollabMenu(); break;
      case "startEditCollab": actions.startEditCollab(id); break;
      case "togglePermission": actions.togglePermission(id); break;
      case "removeCollaborator": actions.removeCollaborator(id); break;
      case "addCollaborator": actions.addCollaborator(); break;
      case "openShareModal": actions.openShareModal(); break;
      case "toggleViewOnlyMode": actions.toggleViewOnlyMode(); break;
      case "startEditTripName": actions.startEditTripName(); break;
      case "toggleGroupCollapse": actions.toggleGroupCollapse(id); break;
      case "addChecklistItem": actions.addChecklistItem(actEl.getAttribute("data-section"), actEl.getAttribute("data-cat")); break;
      case "removeChecklistItem": actions.removeChecklistItem(actEl.getAttribute("data-section"), actEl.getAttribute("data-cat"), id); break;
      case "togglePrepCheck": actions.togglePrepCheck(actEl.getAttribute("data-cat"), id); break;
      case "togglePackingCheck": actions.togglePackingCheck(actEl.getAttribute("data-cat"), id); break;
      case "reorderPrep": reorderViaChevron("prep", actEl); break;
      case "reorderPacking": reorderViaChevron("packing", actEl); break;
      case "copyTemplateToPersonal": actions.copyTemplateToPersonal(actEl.getAttribute("data-section")); break;
      case "togglePersonalCheck": actions.togglePersonalCheck(id); break;
      case "addPersonalChecklistItem": actions.addPersonalChecklistItem(actEl.getAttribute("data-section"), actEl.getAttribute("data-cat")); break;
      case "removePersonalChecklistItem": actions.removePersonalChecklistItem(id); break;
      case "toggleChecklistEditMode": actions.toggleChecklistEditMode(actEl.getAttribute("data-section")); break;
      case "setPackingViewMode": actions.setPackingViewMode(actEl.getAttribute("data-mode")); break;
      case "resetMyChecklist": actions.resetMyChecklist(actEl.getAttribute("data-section")); break;
      case "uncheckAllPacking": actions.uncheckAllPacking(); break;
      case "setPersonalItemBagTag": actions.setPersonalItemBagTag(id, actEl.getAttribute("data-tag")); break;
      case "resetPrepTemplate": actions.resetPrepTemplate(); break;
      case "resetPrepNotes": actions.resetPrepNotes(); break;
      case "resetSharedTodo": actions.resetSharedTodo(); break;
      case "setSharedTodoTab": actions.setSharedTodoTab(actEl.getAttribute("data-tab")); break;
      case "setPrepMainTab": actions.setPrepMainTab(actEl.getAttribute("data-tab")); break;
      case "toggleSharedTodoEditMode": actions.toggleSharedTodoEditMode(); break;
      case "toggleSharedGroupItem": actions.toggleSharedGroupItem(id); break;
      case "toggleSharedPersonalItem": actions.toggleSharedPersonalItem(id); break;
      case "addSharedTodoItem": actions.addSharedTodoItem(actEl.getAttribute("data-tab"), actEl.getAttribute("data-cat")); break;
      case "removeSharedTodoItem": actions.removeSharedTodoItem(actEl.getAttribute("data-tab"), id); break;
      case "addDocument": actions.addDocument(); break;
      case "removeDocument": actions.removeDocument(id); break;
      case "reorderBudget": reorderViaChevron("budget", actEl); break;
      case "reorderMemo": reorderMemoViaChevron(actEl); break;
      case "selectDay": actions.selectDay(id); break;
      case "openSwapDayModal": actions.openSwapDayModal(); break;
      case "swapDays": actions.swapDays(id); break;
      case "openMoveItemModal": actions.openMoveItemModal(id); break;
      case "moveItemToDay": actions.moveItemToDay(id); break;
      case "setFilter": actions.setFilter(id); break;
      case "openAddItem": actions.openAddItem(); break;
      case "openEditItem": {
        const trip = findTrip(); const day = findDay();
        const item = day.items.find(it => it.id === id);
        if (item) actions.openEditItem(item);
        break;
      }
      case "removeItem": actions.removeItem(id); break;
      case "toggleItemExpanded": actions.toggleItemExpanded(id); break;
      case "closeModal": actions.closeModal(); break;
      case "openAddTrip": actions.openAddTrip(); break;
      case "saveNewTripForm": {
        state.ui.newTripName = document.getElementById("nt-name").value;
        state.ui.newTripCountry = document.getElementById("nt-country").value;
        state.ui.newTripFlag = document.getElementById("nt-flag").value;
        state.ui.newTripDateStart = document.getElementById("nt-date-start").value;
        state.ui.newTripDateEnd = document.getElementById("nt-date-end").value;
        actions.saveNewTrip();
        break;
      }
      case "confirmUnlockTripForm": {
        const pwEl = document.getElementById("unlock-password");
        actions.confirmUnlockTrip(pwEl ? pwEl.value : "");
        break;
      }
      case "openLightbox": actions.openLightbox(actEl.getAttribute("data-slot")); break;
      case "closeLightbox": actions.closeLightbox(); break;
      case "openDocGallery": actions.openDocGallery(id, 0); break;
      case "shiftDocGallery": actions.shiftDocGallery(Number(actEl.getAttribute("data-dir"))); break;
      case "saveItemForm": {
        const isBackup = actEl.getAttribute("data-backup") === "1";
        syncItemFormFieldsFromDom();
        actions.saveItem(isBackup);
        break;
      }
      case "addFormDoc": syncItemFormFieldsFromDom(); actions.addFormDoc(); break;
      case "removeFormDoc": syncItemFormFieldsFromDom(); actions.removeFormDoc(id); break;
      case "openAddBudget": actions.openAddBudget(); break;
      case "openAddPersonalBudget": actions.openAddPersonalBudget(); break;
      case "openEditBudget": {
        const trip = findTrip();
        const item = trip.budget.find(b => b.id === id);
        if (item) actions.openEditBudget(item);
        break;
      }
      case "saveBudgetForm": {
        state.ui.budgetFormCategory = document.getElementById("bf-category").value;
        state.ui.budgetFormLabel = document.getElementById("bf-label").value;
        state.ui.budgetFormAmount = document.getElementById("bf-amount").value;
        const currencyEl = document.getElementById("bf-currency");
        state.ui.budgetFormCurrency = currencyEl ? currencyEl.value : "TWD";
        state.ui.budgetFormPayerIds = Array.from(document.querySelectorAll(".bf-payer-check:checked")).map(el => el.value);
        const dayEl = document.getElementById("bf-day");
        state.ui.budgetFormDayId = dayEl ? dayEl.value : "";
        actions.saveBudget();
        break;
      }
      case "removeBudget": actions.removeBudget(id); break;
      case "toggleBudgetPayer": actions.toggleBudgetPayer(id, actEl.getAttribute("data-person")); break;
      case "selectMemoTagFilter": actions.selectMemoTagFilter(id); break;
      case "addMemoTag": actions.addMemoTag(); break;
      case "startEditMemoTag": actions.startEditMemoTag(id); break;
      case "removeMemoTag": actions.removeMemoTag(id); break;
      case "openAddMemo": actions.openAddMemo(); break;
      case "openEditMemo": {
        const trip = findTrip();
        const item = trip.memoItems.find(m => m.id === id);
        if (item) actions.openEditMemo(item);
        break;
      }
      case "saveMemoForm": {
        state.ui.memoFormTag = document.getElementById("mf-tag").value;
        state.ui.memoFormName = document.getElementById("mf-name").value;
        state.ui.memoFormPrice = document.getElementById("mf-price").value;
        const memoCurEl = document.getElementById("mf-currency");
        state.ui.memoFormCurrency = memoCurEl ? memoCurEl.value : "TWD";
        actions.saveMemo();
        break;
      }
      case "removeMemo": actions.removeMemo(id); break;
      case "simulateFriendJoin": actions.simulateFriendJoin(); break;
      case "chooseIdentity": actions.chooseIdentity(id); break;
      case "confirmNewGuest": {
        const val = document.getElementById("new-guest-name");
        actions.confirmNewGuest(val ? val.value : "");
        break;
      }
    }
  });

  // close dialog when clicking backdrop directly (not children)
  root.addEventListener("click", e => {
    if (e.target.classList && e.target.classList.contains("dialog-backdrop")) {
      const backdropAct = e.target.getAttribute("data-act");
      if (backdropAct === "closeModal") actions.closeModal();
    }
  });

  // close collaborator menu when clicking outside
  document.addEventListener("click", e => {
    if (!state.ui.collabMenuOpen) return;
    if (!e.target.closest(".user-chip")) actions.closeCollabMenu();
  });

  // change / blur delegation for two-way-bound inputs
  root.addEventListener("change", handleFieldCommit);
  root.addEventListener("blur", handleFieldCommit, true);

  // trip select uses native change with data-act-change
  root.addEventListener("change", e => {
    const el = e.target.closest("[data-act-change]");
    if (!el) return;
    const act = el.getAttribute("data-act-change");
    if (act === "selectTrip") {
      if (el.value === "__unlock__") actions.openUnlockModal();
      else actions.selectTrip(el.value);
    }
  });

  // file input for image slots (single hidden input reused)
  const fileInput = document.getElementById("hidden-file-input");
  fileInput.addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    const slotId = fileInput.getAttribute("data-current-slot");
    if (file && slotId) handleImageFile(slotId, file);
    fileInput.value = "";
  });

  // pointer-based drag reorder for itinerary items
  root.addEventListener("pointerdown", e => {
    const handle = e.target.closest("[data-drag-handle]");
    if (!handle) return;
    startItemDrag(handle.getAttribute("data-drag-handle"), e);
  });
}

function openImagePicker(slotId) {
  const fileInput = document.getElementById("hidden-file-input");
  fileInput.setAttribute("data-current-slot", slotId);
  fileInput.click();
}

function reorderViaChevron(kind, actEl) {
  const cat = actEl.getAttribute("data-cat");
  const dir = actEl.getAttribute("data-dir");
  const id = actEl.getAttribute("data-id");
  const trip = findTrip();
  const list = kind === "budget" ? trip.budget.filter(b => b.category === cat) : trip[kind][cat];
  const idx = list.findIndex(x => x.id === id);
  const targetIdx = dir === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return;
  const targetId = list[targetIdx].id;
  if (kind === "prep") actions.reorderPrep(cat, id, targetId);
  else if (kind === "packing") actions.reorderPacking(cat, id, targetId);
  else if (kind === "budget") actions.reorderBudget(cat, id, targetId);
}
function reorderMemoViaChevron(actEl) {
  const dir = actEl.getAttribute("data-dir");
  const id = actEl.getAttribute("data-id");
  const trip = findTrip();
  const tagFilter = state.memoTagFilter;
  const list = trip.memoItems.filter(m => m.ownerId === state.currentUserId && (tagFilter === "all" || m.tag === tagFilter));
  const idx = list.findIndex(x => x.id === id);
  const targetIdx = dir === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return;
  actions.reorderMemo(id, list[targetIdx].id);
}

function startItemDrag(itemId, e) {
  if (!canEditGeneral()) return;
  e.preventDefault();
  const day = findDay();
  const filterCat = state.itineraryFilter === "transit" ? "交通" : state.itineraryFilter === "stay" ? "住宿" : null;
  const visible = day.items.filter(it => !filterCat || it.category === filterCat);
  let order = visible.map(x => x.id);
  state.ui.draggingItemId = itemId;
  render(true);

  const onMove = ev => {
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const row = el && el.closest("[data-item-row]");
    if (!row) return;
    const overId = row.getAttribute("data-item-row");
    const fromIdx = order.indexOf(itemId);
    const toIdx = order.indexOf(overId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const newOrder = [...order];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    order = newOrder;
    actions.reorderItineraryItems(itemId, overId);
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    state.ui.draggingItemId = null;
    render();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

/* field commit map: data-bind-blur attribute -> handler */
/* 行程 modal 的「地點」欄位：貼上 Google 地圖網址時嘗試自動取地標名稱，短網址則盡力線上解析 */
async function handleLocationFieldBlur(el) {
  if (suppressBlurCommit) return;
  const raw = el.value.trim();
  const statusEl = document.getElementById("f-location-status");
  if (!raw) {
    state.ui.formLocation = ""; state.ui.formLocationUrl = "";
    if (statusEl) statusEl.textContent = "";
    return;
  }
  const parsed = parseGoogleMapsLocation(raw);
  if (parsed.url && parsed.name) {
    // 完整網址，本地端就能直接解析出地標名稱
    el.value = parsed.name;
    state.ui.formLocation = parsed.name;
    state.ui.formLocationUrl = parsed.url;
    if (statusEl) statusEl.textContent = "✓ 已連結 Google 地圖，儲存後點地點名稱可直接開啟";
    return;
  }
  if (parsed.url && !parsed.name) {
    // 短網址：本地端看不出地標名稱，嘗試連線解析（需要網路，可能失敗）
    state.ui.formLocationUrl = parsed.url;
    if (statusEl) statusEl.textContent = "正在解析地點名稱…";
    const resolved = await resolveGoogleMapsShortLink(parsed.url);
    if (!state.ui.itemModalOpen) return; // 解析回來前使用者可能已經關掉視窗
    const elNow = document.getElementById("f-location");
    const statusNow = document.getElementById("f-location-status");
    if (resolved) {
      if (elNow) elNow.value = resolved;
      state.ui.formLocation = resolved;
      if (statusNow) statusNow.textContent = "✓ 已連結 Google 地圖，儲存後點地點名稱可直接開啟";
    } else {
      if (elNow) elNow.value = "";
      state.ui.formLocation = "";
      if (statusNow) statusNow.textContent = "無法自動取得地點名稱，請手動輸入（地圖連結已保留，儲存後仍可點擊開啟）";
    }
    return;
  }
  // 純文字，不是網址
  state.ui.formLocation = raw;
  if (statusEl) statusEl.textContent = state.ui.formLocationUrl ? "✓ 已連結 Google 地圖，儲存後點地點名稱可直接開啟" : "";
}
/* 新增/編輯行程項目的表單裡，只要跳出「新增行程資料」這種會整個重繪 modal 的動作，
   就要先把目前已經打在欄位裡但還沒觸發 blur 的文字同步進 state，不然重繪時會被清空 */
function syncItemFormFieldsFromDom() {
  const timeEl = document.getElementById("f-time");
  if (!timeEl) return; // modal 不是開著的
  state.ui.formTime = timeEl.value;
  state.ui.formCategory = document.getElementById("f-category").value;
  state.ui.formTitle = document.getElementById("f-title").value;
  const locEl = document.getElementById("f-location");
  const rawLoc = locEl.value.trim();
  if (rawLoc !== state.ui.formLocation) {
    // 使用者沒有先離開地點欄位觸發自動解析（例如打完直接按儲存）—— 這裡做最後一次同步解析，
    // 純文字修改則保留原本已經連結好的地圖網址，不會被清空
    const parsed = parseGoogleMapsLocation(rawLoc);
    if (parsed.url && parsed.name) { state.ui.formLocation = parsed.name; state.ui.formLocationUrl = parsed.url; }
    else if (parsed.url && !parsed.name) { state.ui.formLocation = ""; state.ui.formLocationUrl = parsed.url; }
    else { state.ui.formLocation = rawLoc; }
  }
  state.ui.formNote = document.getElementById("f-note").value;
  state.ui.formAlert = document.getElementById("f-alert").value;
  state.ui.formDocs = (state.ui.formDocs || []).map(d => {
    const noteEl = document.getElementById("f-doc-note-" + d.id);
    return { ...d, note: noteEl ? noteEl.value : d.note };
  });
}

function handleFieldCommit(e) {
  if (suppressBlurCommit) return;
  const el = e.target;
  if (!el.matches) return;
  if (el.id === "f-location") { handleLocationFieldBlur(el); return; }
  if (!el.matches("[data-bind-blur]")) return;
  const field = el.getAttribute("data-bind-blur");
  const id = el.getAttribute("data-id");
  const val = el.value;
  switch (field) {
    case "tripName": actions.saveTripName(val); break;
    case "dateStart": actions.setTripDate("dateStart", val); break;
    case "dateEnd": actions.setTripDate("dateEnd", val); break;
    case "flightOut": actions.setFlightOut(val); break;
    case "flightBack": actions.setFlightBack(val); break;
    case "notes": actions.setNotes(val); break;
    case "prepLabel": actions.setPrepLabel(el.getAttribute("data-cat"), id, val); break;
    case "packingLabel": actions.setPackingLabel(el.getAttribute("data-cat"), id, val); break;
    case "personalChecklistLabel": actions.setPersonalChecklistLabel(id, val); break;
    case "sharedTodoLabel": actions.setSharedTodoLabel(el.getAttribute("data-cat"), id, val); break;
    case "documentTitle": actions.setDocumentTitle(id, val); break;
    case "documentNote": actions.setDocumentNote(id, val); break;
    case "memoTagName": actions.saveMemoTag(id, val); break;
    case "dayTitle": actions.setDayTitle(state.activeDayId, val); break;
    case "budgetLabel": actions.setBudgetLabel(id, val); break;
    case "budgetAmount": actions.setBudgetAmount(id, val); break;
    case "collab.name": actions.saveCollabName(val); break;
    case "collab.initial": actions.setCollabInitial(val); break;
  }
}

/* ---------------------------------------------------------------------- */
/* Boot（等匿名登入完成 → 需要的話寫入初始範例資料 → 訂閱即時同步）              */
/* ---------------------------------------------------------------------- */
let unsubTrips = null;
let unsubImages = null;
let imagesTripId = null;
let _tripsLoaded = false, _firstRendered = false;
let legacyCollaboratorsCache = null; // 舊版「全部行程共用一份旅伴」資料的一次性備援，只在遷移時用

async function fetchLegacyCollaborators() {
  try {
    const doc = await db.collection("meta").doc("shared").get();
    return doc.exists ? (doc.data().collaborators || []) : [];
  } catch (e) { return []; }
}

function afterInitialLoad() {
  if (_firstRendered) { render(); return; }
  if (!_tripsLoaded) return;
  _firstRendered = true;
  const map = loadIdentityMap();
  const uidVal = map[state.activeTripId];
  if (uidVal && state.collaborators.some(p => p.id === uidVal)) {
    state.currentUserId = uidVal;
  } else {
    // 這個裝置在這個行程裡還沒選過身份 —— 強制跳出選擇視窗，不再自動當成第一位旅伴
    state.currentUserId = null;
    state.ui.identityModalOpen = true;
  }
  subscribeToImages(state.activeTripId);
  initEvents();
  doRender();
}

function subscribeToTrips() {
  unsubTrips = db.collection("trips").orderBy("createdAt").onSnapshot(snap => {
    state.trips = snap.docs.map(d => {
      const raw = { id: d.id, ...d.data() };
      const normalized = normalizeTrip(raw, legacyCollaboratorsCache);
      // 如果這筆資料原本沒有自己的 dateStart/dateEnd 或 collaborators（是舊版資料反推/沿用來的），
      // 順便把結果寫回 Firestore，之後就不用每次重新解析、也不會因為解析失敗而卡住
      const patch = {};
      if ((!raw.dateStart || !raw.dateEnd) && normalized.dateStart && normalized.dateEnd) {
        patch.dateStart = normalized.dateStart; patch.dateEnd = normalized.dateEnd;
      }
      if (!raw.collaborators || !raw.collaborators.length) patch.collaborators = normalized.collaborators;
      if (Object.keys(patch).length) {
        db.collection("trips").doc(d.id).set(patch, { merge: true }).catch(err => console.error("補寫欄位失敗", err));
      }
      return normalized;
    });
    if (!state.trips.some(t => t.id === state.activeTripId) && state.trips[0]) {
      // 如果網址帶了分享連結（#trip=xxx）且該行程存在，直接打開那個行程
      const hashMatch = location.hash.match(/#trip=([^&]+)/);
      const linkedTrip = hashMatch && state.trips.find(t => t.id === hashMatch[1]);
      const target = linkedTrip || state.trips[0];
      state.activeTripId = target.id;
      state.activeDayId = target.days[0] ? target.days[0].id : null;
    }
    markTripUnlocked(state.activeTripId);
    const activeTrip = state.trips.find(t => t.id === state.activeTripId);
    state.collaborators = activeTrip ? activeTrip.collaborators : [];
    _tripsLoaded = true;
    afterInitialLoad();
  }, err => {
    console.error("讀取行程資料失敗", err);
    renderConnectionError();
  });
}

function subscribeToImages(tripId) {
  if (!tripId || (imagesTripId === tripId && unsubImages)) return;
  if (unsubImages) unsubImages();
  imagesTripId = tripId;
  state.images = {};
  unsubImages = db.collection("trips").doc(tripId).collection("images").onSnapshot(snap => {
    const imgs = {};
    snap.forEach(d => { imgs[d.id] = d.data().data; });
    state.images = imgs;
    render();
  }, err => console.error("讀取照片失敗", err));
}

/* 全新的 Firestore 資料庫（第一次使用）就把範例行程 + 旅伴名單 + 範例照片寫進去 */
async function ensureSeedData() {
  const snap = await db.collection("trips").limit(1).get();
  if (!snap.empty) return; // 已經有資料了，不重複寫入
  const trips = initialData();
  const batch = db.batch();
  trips.forEach((trip, i) => {
    const { id, ...data } = trip;
    batch.set(db.collection("trips").doc(id), { ...data, createdAt: i });
  });
  await batch.commit();
  const defaultImages = window.DEFAULT_IMAGES || {};
  for (const slotId of Object.keys(defaultImages)) {
    // slot 命名慣例是「cover-{tripId}」或「route-map-{tripId}」，從 key 反推該圖片屬於哪個行程
    const owner = trips.find(t => slotId === `cover-${t.id}` || slotId === `route-map-${t.id}`);
    const targetTripId = owner ? owner.id : trips[0].id;
    await db.collection("trips").doc(targetTripId).collection("images").doc(slotId).set({ data: defaultImages[slotId] });
  }
}

function renderConnectionError() {
  if (_firstRendered) return;
  const root = document.getElementById("app");
  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:14px;padding:24px;text-align:center;font-family:'Figtree',system-ui,sans-serif;color:var(--color-text)">
      <div style="font-size:32px">📡</div>
      <div style="font-size:15px;font-weight:700">無法連線到雲端資料庫</div>
      <div style="font-size:13px;opacity:.7;max-width:320px;line-height:1.6">請確認網路連線後重新整理頁面。如果問題持續發生，可能是資料庫設定有誤，請聯絡管理者確認。</div>
      <div class="btn btn-accent-outline" onclick="location.reload()" style="cursor:pointer">重新整理</div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await window.authReady;
  } catch (e) {
    renderConnectionError();
    return;
  }
  try {
    await ensureSeedData();
  } catch (e) {
    console.error("初始資料寫入失敗", e);
  }
  subscribeToTrips();
});
