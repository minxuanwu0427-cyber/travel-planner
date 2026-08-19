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
const CATEGORY_OPTIONS = ["交通", "景點", "餐飲", "購物", "住宿", "其他"];
const BUDGET_CATS = ["個人", "票券", "交通", "住宿", "其他"];
const PREP_CATS = ["票券", "保險", "其他"];
const PACKING_CATS = ["重要物品", "3C", "衣物", "個人用品", "藥品", "其他"];
const CATEGORY_EMOJI = { "票券": "🎫", "保險": "🛡️", "重要物品": "🔑", "3C": "🔌", "衣物": "👕", "個人用品": "🧴", "藥品": "💊", "其他": "📦" };
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
        "保險": [{ id: "s1", label: "旅平險投保", done: false }],
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
        "保險": [{ id: "s2", label: "旅平險投保", done: true }],
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
    budgetFormCategory: "票券", budgetFormLabel: "", budgetFormAmount: "", budgetFormCurrency: "TWD", budgetFormPayerIds: [],
    memoFormTag: "", memoFormName: "", memoFormPrice: "", memoFormCurrency: "TWD", memoFormId: null,
    newGuestName: "",
    isEditingTripName: false, tripNameDraft: "",
    collabMenuOpen: false,
    expandedItemIds: [],
    lightboxSrc: null,
    expandedGroups: {},
    draggingItemId: null,
    connectionError: false,
    unlockModalOpen: false, unlockError: ""
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
  // 沒有的話先用舊的共用名單當起始值，之後每個行程就能各自增減旅伴
  const collaborators = (trip.collaborators && trip.collaborators.length)
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
    memoItems: (trip.memoItems || []).map(m => ({ ...m, currency: m.currency || "TWD" }))
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
/* 預算項目的編輯／刪除權限：「個人」分類的項目只有本人能改，不管他原本是編輯者還是檢視者；
   其他分類維持原本規則（編輯者可改內容，只有主編輯者能新增/刪除） */
function canEditBudgetItem(item) {
  if (state.viewOnlyMode) return false;
  if (!state.currentUserId) return false;
  if (item.category === "個人") return item.ownerId === state.currentUserId;
  return canEditGeneral();
}
function canRemoveBudgetItem(item) {
  if (state.viewOnlyMode) return false;
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
      flight: { out: "", back: "" }, stays: [], notes: "",
      days, packing: { "重要物品": [], "3C": [], "衣物": [], "個人用品": [], "藥品": [], "其他": [] },
      prep: { "票券": [], "保險": [], "其他": [] },
      budget: [], memoTags: [], memoItems: [],
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

  openAddItem() {
    state.ui.itemModalOpen = true; state.ui.editingItemId = null;
    state.ui.formTime = ""; state.ui.formTitle = ""; state.ui.formCategory = "景點";
    state.ui.formLocation = ""; state.ui.formLocationUrl = ""; state.ui.formNote = "";
    render(true);
  },
  openEditItem(item) {
    state.ui.itemModalOpen = true; state.ui.editingItemId = item.id;
    state.ui.formTime = item.time; state.ui.formTitle = item.title; state.ui.formCategory = item.category;
    state.ui.formLocation = item.location; state.ui.formLocationUrl = item.locationUrl || ""; state.ui.formNote = item.note;
    render(true);
  },
  closeModal() {
    // 如果是「新增備忘項目」時上傳了照片但取消，順便清掉沒用到的孤兒照片
    if (state.ui.memoModalOpen && state.ui.memoFormId) {
      const trip = findTrip();
      const exists = trip.memoItems.some(m => m.id === state.ui.memoFormId);
      if (!exists) delete state.images["memo-photo-" + state.ui.memoFormId];
    }
    state.ui.itemModalOpen = false; state.ui.budgetModalOpen = false; state.ui.memoModalOpen = false; state.ui.shareModalOpen = false;
    state.ui.addTripModalOpen = false; state.ui.unlockModalOpen = false; state.ui.unlockError = "";
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
  saveItem(isBackup) {
    const u = state.ui;
    if (!u.formTitle.trim()) { u.itemModalOpen = false; render(true); return; }
    mutateTrip(t => ({
      ...t, days: t.days.map(d => d.id !== state.activeDayId ? d : {
        ...d, items: u.editingItemId
          ? d.items.map(it => it.id === u.editingItemId ? { ...it, time: u.formTime, title: u.formTitle, category: u.formCategory, location: u.formLocation, locationUrl: u.formLocationUrl, note: u.formNote } : it)
          : [...d.items, { id: uid("i"), time: u.formTime || "--:--", title: u.formTitle, category: u.formCategory, location: u.formLocation, locationUrl: u.formLocationUrl, note: u.formNote, hasPhoto: false, isBackup: !!isBackup }]
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
    render(true);
  },
  openAddPersonalBudget() {
    // 「個人」分類任何人（不管編輯／檢視權限）都能新增自己的項目
    if (state.viewOnlyMode || !state.currentUserId) return;
    state.ui.budgetModalOpen = true; state.ui.editingBudgetId = null;
    state.ui.budgetFormCategory = "個人"; state.ui.budgetFormLabel = ""; state.ui.budgetFormAmount = "";
    state.ui.budgetFormCurrency = "TWD"; state.ui.budgetFormPayerIds = [state.currentUserId];
    render(true);
  },
  openEditBudget(item) {
    if (!canEditBudgetItem(item)) return;
    state.ui.budgetModalOpen = true; state.ui.editingBudgetId = item.id;
    state.ui.budgetFormCategory = item.category; state.ui.budgetFormLabel = item.label; state.ui.budgetFormAmount = String(item.amount);
    state.ui.budgetFormCurrency = item.currency || "TWD"; state.ui.budgetFormPayerIds = item.payerIds || [];
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
        payerIds: isPersonal ? [existing.ownerId || state.currentUserId] : (u.budgetFormPayerIds && u.budgetFormPayerIds.length ? u.budgetFormPayerIds : b.payerIds)
      }) }));
    } else {
      const allowed = isPersonal ? (!!state.currentUserId && !state.viewOnlyMode) : isPrimaryEditor();
      if (!allowed) { u.budgetModalOpen = false; render(true); return; }
      mutateTrip(t => ({ ...t, budget: [...t.budget, {
        id: uid("b"), category: u.budgetFormCategory, label: u.budgetFormLabel, amount: Number(u.budgetFormAmount) || 0,
        currency: u.budgetFormCurrency || "TWD",
        payerIds: isPersonal ? [state.currentUserId] : (u.budgetFormPayerIds && u.budgetFormPayerIds.length ? u.budgetFormPayerIds : [state.currentUserId]),
        ownerId: isPersonal ? state.currentUserId : null
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

function renderPrep(trip) {
  const canEdit = canEditGeneral();
  return `
  <div class="prep-grid">
    ${renderChecklistCard("待辦", PREP_CATS, "prep", trip.prep, "togglePrepCheck", "prepLabel", "reorderPrep", "todo")}
    <div class="card card-bordered" style="grid-area:notes">
      <div class="card-title" style="font-size:16px;margin-bottom:10px">注意事項</div>
      <textarea class="input" data-bind-blur="notes" ${canEdit ? "" : "readonly"} rows="${estimateTextareaRows(trip.notes, 6)}" style="font-size:13px;line-height:1.85;height:auto" placeholder="出入境、託運行李等提醒">${esc(trip.notes)}</textarea>
    </div>
    ${renderChecklistCard("行李清單", PACKING_CATS, "packing", trip.packing, "togglePackingCheck", "packingLabel", "reorderPacking", "packing")}
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
          <span style="font-size:12px">🗺️</span>
          ${locationDisplay}
          ${it.locationUrl ? `<a href="${esc(it.locationUrl)}" target="_blank" rel="noopener" title="在 Google 地圖開啟"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg></a>` : ""}
        </div>
        ${it.note ? `<div style="font-size:12.5px;line-height:1.7;opacity:.75;margin-top:6px;margin-left:40px">${esc(it.note)}</div>` : ""}
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
                <i data-lucide="${meta.icon}" style="width:16px;height:16px;color:${meta.tagFg}"></i>
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
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:var(--space-3)">
      <input class="input input-plain" data-bind-blur="dayTitle" value="${esc(day.title || "")}" ${canEdit ? "" : "readonly"} placeholder="為這天下個標題，例如：國際通" style="font-size:14px;font-weight:600;max-width:280px" />
    </div>
    <div style="display:flex;align-items:center;margin-bottom:var(--space-4)">
      <div class="seg">
        <label class="seg-opt ${state.itineraryFilter === "all" ? "active" : ""}" data-act="setFilter" data-id="all">總覽</label>
        <label class="seg-opt ${state.itineraryFilter === "transit" ? "active" : ""}" data-act="setFilter" data-id="transit">交通</label>
        <label class="seg-opt ${state.itineraryFilter === "stay" ? "active" : ""}" data-act="setFilter" data-id="stay">住宿</label>
      </div>
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
    const items = trip.budget.filter(b => b.category === cat);
    const isPersonalCat = cat === "個人";
    // 小計：只加總「我」是付款旅伴之一的項目（換算成台幣後加總），跟最上方合計邏輯一致
    const subtotalTWD = items.reduce((sum, b) => {
      if (!(b.payerIds || []).includes(state.currentUserId)) return sum;
      return sum + (toTWD(b.amount, b.currency || "TWD") || 0);
    }, 0);
    const rows = items.map((b, i) => {
      const cur = b.currency || "TWD";
      const convertedText = convertedTextForItem(b, trip);
      const rowCanEdit = canEditBudgetItem(b);
      const rowCanRemove = canRemoveBudgetItem(b);
      const owner = isPersonalCat ? state.collaborators.find(p => p.id === b.ownerId) : null;
      const ownerTag = owner
        ? avatar(owner.initial, PEOPLE_COLORS[owner.colorIdx % PEOPLE_COLORS.length], 20)
        : "";
      const payerRow = isPersonalCat ? ownerTag : state.collaborators.map(p => {
        const active = (b.payerIds || []).includes(p.id);
        const color = PEOPLE_COLORS[p.colorIdx % PEOPLE_COLORS.length];
        return `<div data-act="${rowCanEdit ? "toggleBudgetPayer" : ""}" data-id="${b.id}" data-person="${p.id}" title="${esc(p.name)}${active ? "（需付款）" : ""}" style="cursor:${rowCanEdit ? "pointer" : "default"};width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex:none;color:${active ? "#fff" : "var(--color-neutral-400)"};background:${active ? color : "transparent"};border:1.5px solid ${active ? color : "var(--color-divider)"}">${esc(p.initial)}</div>`;
      }).join("");
      return `
      <div style="padding:6px 2px;font-size:13px">
        <div style="display:flex;align-items:center;gap:6px">
          ${rowCanEdit && !isPersonalCat ? `<div style="display:flex;flex-direction:column;flex:none">
            <div data-act="reorderBudget" data-cat="${cat}" data-dir="up" data-id="${b.id}" style="cursor:pointer;opacity:${i > 0 ? 1 : 0.25};line-height:0"><i data-lucide="chevron-up" style="width:11px;height:11px"></i></div>
            <div data-act="reorderBudget" data-cat="${cat}" data-dir="down" data-id="${b.id}" style="cursor:pointer;opacity:${i < items.length - 1 ? 1 : 0.25};line-height:0"><i data-lucide="chevron-down" style="width:11px;height:11px"></i></div>
          </div>` : ""}
          <input class="input input-plain" data-bind-blur="budgetLabel" data-id="${b.id}" value="${esc(b.label)}" ${rowCanEdit ? "" : "readonly"} style="font-size:13px;flex:1;min-width:40px" />
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex:none">${payerRow}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;padding-left:${rowCanEdit && !isPersonalCat ? "18px" : "0"}">
          <div style="display:flex;align-items:baseline;gap:6px;flex:none;text-align:left">
            <div style="display:flex;align-items:center;gap:2px;font-family:var(--font-body);font-weight:700;opacity:.85">${currencySymbol(cur)} <input class="input input-plain input-amount" type="number" data-bind-blur="budgetAmount" data-id="${b.id}" value="${b.amount}" ${rowCanEdit ? "" : "readonly"} style="font-size:13px;width:78px;font-family:var(--font-body);font-weight:700" />/人</div>
            ${convertedText ? `<div style="font-size:11px;color:var(--color-neutral-500);white-space:nowrap">${convertedText}</div>` : ""}
          </div>
          <div style="display:flex;gap:2px;flex:none">
            ${rowCanEdit ? `<div class="btn btn-icon btn-ghost" data-act="openEditBudget" data-id="${b.id}"><i data-lucide="pencil" style="width:13px;height:13px"></i></div>` : ""}
            ${rowCanRemove ? `<div class="btn btn-icon btn-ghost" data-act="removeBudget" data-id="${b.id}"><i data-lucide="x" style="width:13px;height:13px"></i></div>` : ""}
          </div>
        </div>
      </div>`;
    }).join("");
    const canAddPersonal = isPersonalCat && !state.viewOnlyMode && !!state.currentUserId;
    return `<div class="card card-bordered">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--color-divider)">
          <div class="card-title" style="font-size:11.5px;letter-spacing:.08em">${esc(cat)}${isPersonalCat ? '<span style="opacity:.6;font-weight:400;letter-spacing:normal"> · 各自新增/編輯自己的項目</span>' : ""}</div>
          <div style="font-size:13px;color:var(--color-neutral-600);display:flex;align-items:baseline;gap:5px">小計 <span style="font-size:14px;font-weight:700;color:var(--color-accent-700);font-family:var(--font-body)">NT$ ${fmtMoney(subtotalTWD)}</span></div>
        </div>
        ${rows || '<div style="font-size:12.5px;opacity:.5;padding:4px 2px">尚無花費</div>'}
        ${canAddPersonal ? `<div class="btn btn-ghost" data-act="openAddPersonalBudget" style="font-size:12.5px;margin-top:6px"><i data-lucide="plus" style="width:14px;height:14px"></i> 新增我的項目</div>` : ""}
      </div>`;
  }).join("");

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);flex-wrap:wrap;gap:8px">
      <div style="font-size:14px;opacity:.7">此次行程預算</div>
      ${canManage ? `<div class="btn btn-accent-outline" data-act="openAddBudget"><i data-lucide="plus" style="width:15px;height:15px"></i> 新增花費</div>` : ""}
    </div>
    <div class="card elev-md" style="padding:var(--space-4);margin-bottom:var(--space-4);flex-direction:row;align-items:center;justify-content:space-between;gap:8px">
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
    ${state.fx ? `<div style="text-align:center;margin-top:var(--space-4);font-size:11px;color:var(--color-neutral-400)">匯率資料來源：<a href="https://www.exchangerate-api.com" target="_blank" rel="noopener" style="color:inherit">ExchangeRate-API</a></div>` : ""}`;
}

/* ---------------------------------------------------------------------- */
/* Render — 備忘錄                                                         */
/* ---------------------------------------------------------------------- */
function renderMemo(trip) {
  ensureFxRates();
  const filters = [{ id: "all", label: "全部" }, ...trip.memoTags.map(t => ({ id: t, label: t }))];
  const filtersHtml = filters.map(f => `
    <div class="tag" data-act="selectMemoTagFilter" data-id="${esc(f.id)}" style="cursor:pointer;padding:7px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;background:${state.memoTagFilter === f.id ? "var(--color-accent)" : "var(--color-surface)"};color:${state.memoTagFilter === f.id ? "var(--color-bg)" : "var(--color-text)"}">${esc(f.label)}</div>`).join("");

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
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);flex-wrap:wrap;gap:10px">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${filtersHtml}
        <div class="btn btn-ghost" data-act="addMemoTag" style="font-size:12.5px"><i data-lucide="tag" style="width:14px;height:14px"></i> 新增分類</div>
      </div>
      <div class="btn btn-accent-outline" data-act="openAddMemo"><i data-lucide="plus" style="width:15px;height:15px"></i> 新增項目</div>
    </div>
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
        <div class="field"><label>備註</label><input class="input" id="f-note" value="${esc(u.formNote)}" placeholder="提醒事項、預算等" /></div>
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
      case "reorderBudget": reorderViaChevron("budget", actEl); break;
      case "reorderMemo": reorderMemoViaChevron(actEl); break;
      case "selectDay": actions.selectDay(id); break;
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
      case "saveItemForm": {
        const isBackup = actEl.getAttribute("data-backup") === "1";
        state.ui.formTime = document.getElementById("f-time").value;
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
        actions.saveItem(isBackup);
        break;
      }
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
        actions.saveBudget();
        break;
      }
      case "removeBudget": actions.removeBudget(id); break;
      case "toggleBudgetPayer": actions.toggleBudgetPayer(id, actEl.getAttribute("data-person")); break;
      case "selectMemoTagFilter": actions.selectMemoTagFilter(id); break;
      case "addMemoTag": actions.addMemoTag(); break;
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
