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
const BUDGET_CATS = ["票券", "交通", "住宿", "其他"];
const PREP_CATS = ["票券", "保險", "其他"];
const PACKING_CATS = ["重要物品", "3C", "衣物", "個人用品", "藥品", "其他"];
const CATEGORY_EMOJI = { "票券": "🎫", "保險": "🛡️", "重要物品": "🔑", "3C": "🔌", "衣物": "👕", "個人用品": "🧴", "藥品": "💊", "其他": "📦" };
const PEOPLE_COLORS = ["var(--color-accent-500)", "var(--color-accent-2-600)", "var(--color-neutral-600)", "var(--color-accent-700)", "var(--color-accent-800)"];
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

/* ---------------------------------------------------------------------- */
/* 小工具                                                                  */
/* ---------------------------------------------------------------------- */
function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtMoney(n) { return Math.round(n || 0).toLocaleString(); }
function parseGoogleMapsLocation(raw) {
  const val = (raw || "").trim();
  const isMapsUrl = /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(val);
  if (!isMapsUrl) return { name: val, url: "" };
  const m = val.match(/\/maps\/place\/([^/@?]+)/);
  const name = m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "Google 地圖地點";
  return { name, url: val };
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
      dateRange: "2026/10/08 - 2026/10/12（5天4夜）",
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
        { id: "b1", category: "票券", label: "美麗海水族館門票", amount: 1900 },
        { id: "b2", category: "交通", label: "單軌電車一日券", amount: 800 },
        { id: "b3", category: "住宿", label: "月光海景飯店 4 晚", amount: 16000 },
        { id: "b4", category: "其他", label: "網路吃到飽", amount: 500 }
      ],
      memoTags: ["藥妝店", "百貨公司"],
      memoItems: [
        { id: "m1", tag: "藥妝店", ownerId: "p1", name: "SHISEIDO 防曬乳", price: 680, hasPhoto: false },
        { id: "m2", tag: "百貨公司", ownerId: "p2", name: "沖繩黑糖伴手禮", price: 450, hasPhoto: false }
      ]
    },
    {
      id: "busan", name: "釜山之旅", country: "韓國・釜山", flag: "🇰🇷",
      dateRange: "2026/12/03 - 2026/12/08（6天5夜）",
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
        { id: "b5", category: "交通", label: "機場快線", amount: 900 },
        { id: "b6", category: "住宿", label: "海雲台海景公寓 5 晚", amount: 12000 }
      ],
      memoTags: ["藥妝店"],
      memoItems: [{ id: "m3", tag: "藥妝店", ownerId: "p3", name: "雪花秀面膜", price: 1200, hasPhoto: false }]
    }
  ];
}

function defaultState() {
  return {
    trips: initialData(),
    activeTripId: "okinawa",
    activeDayId: "ok-d1",
    activeSectionTab: "overview",
    itineraryFilter: "all",
    memoTagFilter: "all",
    currentUserId: "p1",
    collaborators: [
      { id: "p1", name: "小美", initial: "美", permission: "編輯", colorIdx: 0 },
      { id: "p2", name: "阿傑", initial: "傑", permission: "編輯", colorIdx: 1 },
      { id: "p3", name: "Lin", initial: "L", permission: "檢視", colorIdx: 2 }
    ],
    images: Object.assign({}, (window.DEFAULT_IMAGES || {})),
    ui: {
      editingCollabId: null, editCollabName: "",
      itemModalOpen: false, budgetModalOpen: false, memoModalOpen: false, shareModalOpen: false, identityModalOpen: false,
      editingItemId: null,
      formTime: "", formTitle: "", formCategory: "景點", formLocation: "", formLocationUrl: "", formNote: "",
      budgetFormCategory: "票券", budgetFormLabel: "", budgetFormAmount: "",
      memoFormTag: "", memoFormName: "", memoFormPrice: "",
      newGuestName: "",
      isEditingTripName: false, tripNameDraft: "",
      collabMenuOpen: false,
      expandedItemIds: [],
      expandedGroups: {},
      draggingItemId: null
    }
  };
}

/* ---------------------------------------------------------------------- */
/* 狀態管理 / 儲存                                                          */
/* ---------------------------------------------------------------------- */
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const d = defaultState();
      // merge saved data with defaults (keeps forward-compat with new fields)
      return Object.assign(d, parsed, { ui: d.ui });
    }
  } catch (e) { /* ignore corrupt storage */ }
  return defaultState();
}
function persist() {
  try {
    const { trips, activeTripId, activeDayId, collaborators, currentUserId, images } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ trips, activeTripId, activeDayId, collaborators, currentUserId, images }));
  } catch (e) { /* storage full or unavailable — data stays in-memory */ }
}
function loadIdentityMap() {
  try { return JSON.parse(localStorage.getItem(IDENTITY_KEY) || "{}"); } catch (e) { return {}; }
}
function saveIdentityMap(map) {
  try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(map)); } catch (e) {}
}

function findTrip() { return state.trips.find(t => t.id === state.activeTripId); }
function findDay() { const trip = findTrip(); return trip.days.find(d => d.id === state.activeDayId); }
function mutateTrip(fn) { state.trips = state.trips.map(t => t.id === state.activeTripId ? fn(t) : t); }
function canEditGeneral() {
  const p = state.collaborators.find(p => p.id === state.currentUserId);
  return !p || p.permission === "編輯";
}

let rerenderScheduled = false;
function render(skipPersist) {
  if (!skipPersist) persist();
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
    state.activeDayId = trip.days[0] ? trip.days[0].id : null;
    state.activeSectionTab = state.activeSectionTab; // keep tab
    if (uidVal && state.collaborators.some(p => p.id === uidVal)) state.currentUserId = uidVal;
    render();
  },
  selectSection(id) { state.activeSectionTab = id; render(); },
  selectDay(dayId) { state.activeDayId = dayId; render(); },
  setFilter(f) { state.itineraryFilter = f; render(); },

  toggleCollabMenu() { state.ui.collabMenuOpen = !state.ui.collabMenuOpen; render(true); },
  closeCollabMenu() { if (state.ui.collabMenuOpen) { state.ui.collabMenuOpen = false; render(true); } },
  addCollaborator() {
    const names = ["新旅伴", "阿凱", "Emma", "Sam", "小魚"];
    const n = names[state.collaborators.length % names.length];
    const id = uid("p");
    state.collaborators.push({ id, name: n, initial: n[0], permission: "檢視", colorIdx: state.collaborators.length });
    state.ui.editingCollabId = id; state.ui.editCollabName = n;
    render();
  },
  removeCollaborator(id) {
    state.collaborators = state.collaborators.filter(p => p.id !== id);
    if (state.currentUserId === id) state.currentUserId = state.collaborators[0] ? state.collaborators[0].id : null;
    render();
  },
  togglePermission(id) {
    state.collaborators = state.collaborators.map(p => p.id === id ? { ...p, permission: p.permission === "編輯" ? "檢視" : "編輯" } : p);
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
    state.collaborators = state.collaborators.map(p => p.id === id ? { ...p, name: name || p.name, initial: (name || p.name)[0] } : p);
    state.ui.editingCollabId = null;
    render();
  },

  toggleGroupCollapse(key) { state.ui.expandedGroups[key] = !state.ui.expandedGroups[key]; render(true); },
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
  setDateRange(val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, dateRange: val })); render(true); },
  setFlightOut(val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, flight: { ...t.flight, out: val } })); render(true); },
  setFlightBack(val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, flight: { ...t.flight, back: val } })); render(true); },
  setStayName(id, val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, stays: t.stays.map(s => s.id === id ? { ...s, name: val } : s) })); render(true); },

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

  setBudgetLabel(id, val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, budget: t.budget.map(b => b.id === id ? { ...b, label: val } : b) })); render(true); },
  setBudgetAmount(id, val) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, budget: t.budget.map(b => b.id === id ? { ...b, amount: Number(val) || 0 } : b) })); render(); },
  reorderBudget(category, fromId, toId) { if (!canEditGeneral()) return; mutateTrip(t => ({ ...t, budget: reorderWithinGroup(t.budget, "category", category, fromId, toId) })); render(); },
  removeBudget(id) { mutateTrip(t => ({ ...t, budget: t.budget.filter(b => b.id !== id) })); render(); },

  setMemoName(id, ownerId, val) { if (ownerId !== state.currentUserId) return; mutateTrip(t => ({ ...t, memoItems: t.memoItems.map(m => m.id === id ? { ...m, name: val } : m) })); render(true); },
  setMemoPrice(id, ownerId, val) { if (ownerId !== state.currentUserId) return; mutateTrip(t => ({ ...t, memoItems: t.memoItems.map(m => m.id === id ? { ...m, price: Number(val) || 0 } : m) })); render(); },
  reorderMemo(fromId, toId) { const group = state.memoTagFilter === "all" ? null : state.memoTagFilter; mutateTrip(t => ({ ...t, memoItems: reorderWithinGroup(t.memoItems, "tag", group, fromId, toId) })); render(); },
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
    state.ui.itemModalOpen = false; state.ui.budgetModalOpen = false; state.ui.memoModalOpen = false; state.ui.shareModalOpen = false;
    render(true);
  },
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

  openAddBudget() { state.ui.budgetModalOpen = true; state.ui.budgetFormCategory = "票券"; state.ui.budgetFormLabel = ""; state.ui.budgetFormAmount = ""; render(true); },
  saveBudget() {
    const u = state.ui;
    if (!u.budgetFormLabel.trim()) { u.budgetModalOpen = false; render(true); return; }
    mutateTrip(t => ({ ...t, budget: [...t.budget, { id: uid("b"), category: u.budgetFormCategory, label: u.budgetFormLabel, amount: Number(u.budgetFormAmount) || 0 }] }));
    u.budgetModalOpen = false;
    render();
  },

  openAddMemo() {
    const trip = findTrip();
    state.ui.memoModalOpen = true; state.ui.memoFormTag = trip.memoTags[0] || ""; state.ui.memoFormName = ""; state.ui.memoFormPrice = "";
    render(true);
  },
  saveMemo() {
    const u = state.ui;
    if (!u.memoFormName.trim()) { u.memoModalOpen = false; render(true); return; }
    mutateTrip(t => ({ ...t, memoItems: [...t.memoItems, { id: uid("m"), tag: u.memoFormTag, ownerId: state.currentUserId, name: u.memoFormName, price: Number(u.memoFormPrice) || 0, hasPhoto: false }] }));
    u.memoModalOpen = false;
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
    actions.chooseIdentity(id);
  },

  setImage(slotId, dataUrl) { state.images[slotId] = dataUrl; render(); },
  removeImage(slotId) { delete state.images[slotId]; render(); }
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
  const inner = src
    ? `<img src="${src}" alt="">`
    : `<div class="slot-placeholder"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg><span>${esc(placeholder)}</span></div>`;
  const actionsHtml = src
    ? `<div class="slot-actions">
        <div class="btn btn-icon" data-act="pickImage" data-slot="${id}" title="更換照片"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></div>
        <div class="btn btn-icon" data-act="removeImage" data-slot="${id}" title="移除照片"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></div>
      </div>`
    : "";
  return `<div class="image-slot washed" data-act="${src ? '' : 'pickImage'}" data-slot="${id}" style="${shapeClass};${style}"${fitAttr}>${inner}${actionsHtml}</div>`;
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
  const tripOptions = state.trips.map(t => `<option value="${t.id}" ${t.id === state.activeTripId ? "selected" : ""}>${esc(CODE_LABELS[t.id] || t.name)}</option>`).join("");

  const currentUserObj = state.collaborators.find(p => p.id === state.currentUserId);
  const currentUser = currentUserObj ? { name: currentUserObj.name, initial: currentUserObj.initial, color: PEOPLE_COLORS[currentUserObj.colorIdx % PEOPLE_COLORS.length] } : { name: "", initial: "?", color: "var(--color-neutral-500)" };

  const collabRows = state.collaborators.map(p => {
    const isEditing = state.ui.editingCollabId === p.id;
    const canEdit = canEditGeneral();
    const nameHtml = isEditing
      ? `<input class="input input-plain" data-bind-blur="collab.name" data-id="${p.id}" value="${esc(state.ui.editCollabName)}" style="height:26px;font-size:12.5px;width:80px" autofocus />`
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
  const menu = state.ui.collabMenuOpen ? `
    <div class="card elev-md collab-menu">
      <div class="collab-menu-label">旅伴</div>
      ${collabRows}
      ${canEdit ? `<div class="btn btn-ghost" data-act="addCollaborator" style="font-size:12.5px;margin-top:4px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg> 新增旅伴</div>
      <div class="btn btn-secondary" data-act="openShareModal" style="font-size:12.5px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></svg> 分享此行程連結</div>` : ""}
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
    <div class="user-chip" data-act="toggleCollabMenu">
      ${avatar(currentUser.initial, currentUser.color, 26)}
      <div class="user-chip-name" style="font-size:13px;font-weight:600">${esc(currentUser.name)}</div>
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
      <input class="input input-plain" data-bind-blur="dateRange" value="${esc(trip.dateRange)}" ${canEdit ? "" : "readonly"} style="color:var(--color-bg);opacity:.92;font-size:13px;width:min(300px,90vw)" />
    </div>
  </div>`;
}

/* ---------------------------------------------------------------------- */
/* Render — 總覽                                                           */
/* ---------------------------------------------------------------------- */
function renderOverview(trip) {
  const canEdit = canEditGeneral();
  const staysHtml = trip.stays.map((s, i) => `
    <div style="display:flex;align-items:center;gap:4px;padding:6px 0;border-bottom:${i < trip.stays.length - 1 ? "1px solid var(--color-divider)" : "none"}">
      <span style="flex:none">${esc(s.range)}（${s.nights}晚）</span>
      <input class="input input-plain" data-bind-blur="stayName" data-id="${s.id}" value="${esc(s.name)}" ${canEdit ? "" : "readonly"} style="font-size:13px;flex:1" />
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
      <div style="font-size:13px;line-height:1.85">${staysHtml || '<div style="opacity:.5;font-size:13px">尚無住宿資料</div>'}</div>
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
        </div>`;
    }).join("");
    return `<div style="padding:8px 0;border-bottom:${i < cats.length - 1 ? "1px solid var(--color-divider)" : "none"}">
        <div data-act="toggleGroupCollapse" data-id="${esc(key)}" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:12.5px;font-weight:700">${CATEGORY_EMOJI[cat] ? CATEGORY_EMOJI[cat] + " " : ""}${esc(cat)}</div>
          <i data-lucide="${expanded ? "chevron-up" : "chevron-down"}" style="width:14px;height:14px;color:var(--color-accent-700)"></i>
        </div>
        ${expanded ? `<div style="display:flex;flex-direction:column;gap:1px;margin-top:6px">${rows || '<div style="font-size:12px;opacity:0.5;padding:4px 2px">尚無項目</div>'}</div>` : ""}
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
      <textarea class="input" data-bind-blur="notes" ${canEdit ? "" : "readonly"} rows="6" style="font-size:13px;line-height:1.85;min-height:140px" placeholder="出入境、託運行李等提醒">${esc(trip.notes)}</textarea>
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
      const locationBlock = isExpanded ? `
        <div style="display:flex;align-items:center;gap:5px;margin-top:2px;margin-left:40px">
          <span style="font-size:12px">🗺️</span>
          <input class="input input-plain" data-bind-blur="itemLocation" data-id="${it.id}" value="${esc(it.location)}" ${canEdit ? "" : "readonly"} placeholder="地點，或貼上 Google 地圖網址" style="font-size:12.5px;color:var(--color-accent-700);text-decoration:underline;flex:1" />
          ${it.locationUrl ? `<a href="${esc(it.locationUrl)}" target="_blank" rel="noopener" title="在 Google 地圖開啟"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg></a>` : ""}
        </div>
        <input class="input input-plain" data-bind-blur="itemNote" data-id="${it.id}" value="${esc(it.note)}" ${canEdit ? "" : "readonly"} placeholder="備註" style="font-size:12.5px;line-height:1.7;opacity:.75;margin-top:6px;margin-left:40px;width:calc(100% - 40px)" />
        ${it.hasPhoto ? imageSlot("item-photo-" + it.id, "景點照片", { style: "width:100%;max-width:220px;height:120px;margin-top:6px;margin-left:40px", radius: 8 }) : ""}
      ` : "";
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
              <input class="input input-plain" data-bind-blur="itemTitle" data-id="${it.id}" value="${esc(it.title)}" ${canEdit ? "" : "readonly"} style="font-size:15.5px;font-weight:700;font-family:var(--font-body);flex:1;min-width:80px" />
            </div>
            ${locationBlock}
            <div data-act="toggleItemExpanded" data-id="${it.id}" style="cursor:pointer;display:flex;align-items:center;gap:3px;margin-left:40px;margin-top:6px;font-size:11.5px;color:var(--color-accent-700);opacity:.85">
              ${isExpanded ? "收合" : "詳細行程"} <i data-lucide="${isExpanded ? "chevron-up" : "chevron-down"}" style="width:12px;height:12px"></i>
            </div>
          </div>
          ${canEdit ? `<div style="display:flex;gap:4px;flex:none">
              <div class="btn btn-icon btn-ghost" data-act="openEditItem" data-id="${it.id}"><i data-lucide="pencil" style="width:15px;height:15px"></i></div>
              <div class="btn btn-icon btn-ghost" data-act="removeItem" data-id="${it.id}"><i data-lucide="trash-2" style="width:15px;height:15px"></i></div>
            </div>` : ""}
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
  const total = trip.budget.reduce((sum, b) => sum + b.amount, 0);
  const groupsHtml = BUDGET_CATS.map(cat => {
    const items = trip.budget.filter(b => b.category === cat);
    const subtotal = items.reduce((sum, b) => sum + b.amount, 0);
    const rows = items.map((b, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 2px;font-size:13px;gap:8px">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
          ${canEdit ? `<div style="display:flex;flex-direction:column;flex:none">
            <div data-act="reorderBudget" data-cat="${cat}" data-dir="up" data-id="${b.id}" style="cursor:pointer;opacity:${i > 0 ? 1 : 0.25};line-height:0"><i data-lucide="chevron-up" style="width:11px;height:11px"></i></div>
            <div data-act="reorderBudget" data-cat="${cat}" data-dir="down" data-id="${b.id}" style="cursor:pointer;opacity:${i < items.length - 1 ? 1 : 0.25};line-height:0"><i data-lucide="chevron-down" style="width:11px;height:11px"></i></div>
          </div>` : ""}
          <input class="input input-plain" data-bind-blur="budgetLabel" data-id="${b.id}" value="${esc(b.label)}" ${canEdit ? "" : "readonly"} style="font-size:13px;flex:1" />
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex:none">
          <div style="opacity:.75;display:flex;align-items:center;gap:2px">NT$ <input class="input input-plain" type="number" data-bind-blur="budgetAmount" data-id="${b.id}" value="${b.amount}" ${canEdit ? "" : "readonly"} style="font-size:13px;width:70px" /></div>
          ${canEdit ? `<div class="btn btn-icon btn-ghost" data-act="removeBudget" data-id="${b.id}"><i data-lucide="x" style="width:13px;height:13px"></i></div>` : ""}
        </div>
      </div>`).join("");
    return `<div class="card card-bordered">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="card-title" style="font-size:11.5px;letter-spacing:.08em">${esc(cat)}</div>
          <div style="font-size:14px;font-weight:700;color:var(--color-accent-700)">NT$ ${fmtMoney(subtotal)}</div>
        </div>
        ${rows || '<div style="font-size:12.5px;opacity:.5;padding:4px 2px">尚無花費</div>'}
      </div>`;
  }).join("");

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);flex-wrap:wrap;gap:8px">
      <div style="font-size:14px;opacity:.7">總花費（含所有旅伴新增）</div>
      ${canEdit ? `<div class="btn btn-accent-outline" data-act="openAddBudget"><i data-lucide="plus" style="width:15px;height:15px"></i> 新增花費</div>` : ""}
    </div>
    <div class="card elev-md" style="padding:var(--space-4);margin-bottom:var(--space-4);flex-direction:row;align-items:center;justify-content:space-between">
      <div class="card-title" style="font-size:16px">合計</div>
      <div style="font-size:26px;font-weight:700;color:var(--color-accent-700);font-family:var(--font-heading)">NT$ ${fmtMoney(total)}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--space-3)">${groupsHtml}</div>`;
}

/* ---------------------------------------------------------------------- */
/* Render — 備忘錄                                                         */
/* ---------------------------------------------------------------------- */
function renderMemo(trip) {
  const filters = [{ id: "all", label: "全部" }, ...trip.memoTags.map(t => ({ id: t, label: t }))];
  const filtersHtml = filters.map(f => `
    <div class="tag" data-act="selectMemoTagFilter" data-id="${esc(f.id)}" style="cursor:pointer;padding:7px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;background:${state.memoTagFilter === f.id ? "var(--color-accent)" : "var(--color-surface)"};color:${state.memoTagFilter === f.id ? "var(--color-bg)" : "var(--color-text)"}">${esc(f.label)}</div>`).join("");

  const visible = trip.memoItems.filter(m => state.memoTagFilter === "all" || m.tag === state.memoTagFilter);
  const cardsHtml = visible.map((m, i) => {
    const owner = state.collaborators.find(p => p.id === m.ownerId);
    const tagIdx = trip.memoTags.indexOf(m.tag);
    const tagClass = MEMO_TAG_CLASSES[tagIdx % MEMO_TAG_CLASSES.length] || "tag-neutral";
    const canEditThis = m.ownerId === state.currentUserId;
    const ownerColor = owner ? PEOPLE_COLORS[owner.colorIdx % PEOPLE_COLORS.length] : "var(--color-neutral-500)";
    return `<div class="card card-bordered" style="padding:var(--space-3);gap:8px">
        ${canEditThis ? `<div style="display:flex;justify-content:flex-end;gap:2px;margin-bottom:-6px">
            <div data-act="reorderMemo" data-dir="up" data-id="${m.id}" style="cursor:pointer;opacity:${i > 0 ? 1 : 0.25}"><i data-lucide="chevron-up" style="width:13px;height:13px"></i></div>
            <div data-act="reorderMemo" data-dir="down" data-id="${m.id}" style="cursor:pointer;opacity:${i < visible.length - 1 ? 1 : 0.25}"><i data-lucide="chevron-down" style="width:13px;height:13px"></i></div>
          </div>` : ""}
        ${imageSlot("memo-photo-" + m.id, "商品照片", { style: "width:100%;height:110px", radius: 6 })}
        <div class="tag ${tagClass}" style="align-self:flex-start">${esc(m.tag)}</div>
        <input class="input input-plain" data-bind-blur="memoName" data-id="${m.id}" data-owner="${m.ownerId}" value="${esc(m.name)}" ${canEditThis ? "" : "readonly"} style="font-size:14px;font-weight:700;font-family:var(--font-heading)" />
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:700;color:var(--color-accent-700);display:flex;align-items:center;gap:2px">NT$ <input class="input input-plain" type="number" data-bind-blur="memoPrice" data-id="${m.id}" data-owner="${m.ownerId}" value="${m.price}" ${canEditThis ? "" : "readonly"} style="font-size:14px;font-weight:700;color:var(--color-accent-700);width:70px" /></div>
          ${avatar(owner ? owner.initial : "?", ownerColor, 20)}
        </div>
        ${canEditThis ? `<div class="btn btn-ghost" data-act="removeMemo" data-id="${m.id}" style="font-size:11.5px;padding-left:4px"><i data-lucide="trash-2" style="width:12px;height:12px"></i> 刪除</div>` : ""}
      </div>`;
  }).join("");

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);flex-wrap:wrap;gap:10px">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${filtersHtml}
        <div class="btn btn-ghost" data-act="addMemoTag" style="font-size:12.5px"><i data-lucide="tag" style="width:14px;height:14px"></i> 新增分類</div>
      </div>
      <div class="btn btn-accent-outline" data-act="openAddMemo"><i data-lucide="plus" style="width:15px;height:15px"></i> 新增項目</div>
    </div>
    <div class="memo-grid">${cardsHtml || ""}</div>
    ${visible.length === 0 ? '<div style="padding:var(--space-6) 0;opacity:.6;font-size:13.5px">這個分類還沒有項目</div>' : ""}`;
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
        <div class="field"><label>地點</label><input class="input" id="f-location" value="${esc(u.formLocation)}" placeholder="例：那霸市，或貼上 Google 地圖網址自動取名" /></div>
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
    const opts = BUDGET_CATS.map(c => `<option value="${c}" ${u.budgetFormCategory === c ? "selected" : ""}>${c}</option>`).join("");
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">新增花費</div>
        <div class="field"><label>分類</label><select class="input" id="bf-category">${opts}</select></div>
        <div class="field"><label>項目名稱</label><input class="input" id="bf-label" value="${esc(u.budgetFormLabel)}" placeholder="例：飯店住宿費" /></div>
        <div class="field"><label>金額 (NT$)</label><input class="input" id="bf-amount" type="number" value="${esc(u.budgetFormAmount)}" placeholder="0" /></div>
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
          <div class="btn btn-accent-outline" data-act="saveBudgetForm">新增</div>
        </div>
      </div>
    </div>`;
  }
  if (state.ui.memoModalOpen) {
    const u = state.ui;
    const opts = trip.memoTags.map(t => `<option value="${esc(t)}" ${u.memoFormTag === t ? "selected" : ""}>${esc(t)}</option>`).join("");
    const currentUserName = (state.collaborators.find(p => p.id === state.currentUserId) || {}).name || "";
    html += `
    <div class="dialog-backdrop" data-act="closeModal">
      <div class="dialog" data-stop-click>
        <div class="dialog-title">新增備忘項目</div>
        <div class="field"><label>分類</label><select class="input" id="mf-tag">${opts}</select></div>
        <div class="field"><label>品項名稱</label><input class="input" id="mf-name" value="${esc(u.memoFormName)}" placeholder="例：面膜" /></div>
        <div class="field"><label>價格 (NT$)</label><input class="input" id="mf-price" type="number" value="${esc(u.memoFormPrice)}" placeholder="0" /></div>
        <div style="font-size:12px;opacity:.6">將以「${esc(currentUserName)}」的身份新增，其他旅伴無法編輯此項目</div>
        <div class="dialog-actions">
          <div class="btn btn-secondary" data-act="closeModal">取消</div>
          <div class="btn btn-accent-outline" data-act="saveMemoForm">新增</div>
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
  return html;
}

/* ---------------------------------------------------------------------- */
/* Root render                                                             */
/* ---------------------------------------------------------------------- */
function doRender() {
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
  const root = document.getElementById("app");
  root.innerHTML = html;
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 2.5 } });
}

/* ---------------------------------------------------------------------- */
/* Event delegation                                                        */
/* ---------------------------------------------------------------------- */
function initEvents() {
  const root = document.getElementById("app");

  // Click delegation
  root.addEventListener("click", e => {
    // dialog backdrop click-to-close, but not when clicking dialog itself
    const stopEl = e.target.closest("[data-stop-click]");
    if (stopEl) { /* clicks inside dialog shouldn't bubble to backdrop */ }

    const actEl = e.target.closest("[data-act]");
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
      case "startEditTripName": actions.startEditTripName(); break;
      case "toggleGroupCollapse": actions.toggleGroupCollapse(id); break;
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
      case "saveItemForm": {
        const isBackup = actEl.getAttribute("data-backup") === "1";
        state.ui.formTime = document.getElementById("f-time").value;
        state.ui.formCategory = document.getElementById("f-category").value;
        state.ui.formTitle = document.getElementById("f-title").value;
        const loc = parseGoogleMapsLocation(document.getElementById("f-location").value);
        state.ui.formLocation = loc.name; state.ui.formLocationUrl = loc.url;
        state.ui.formNote = document.getElementById("f-note").value;
        actions.saveItem(isBackup);
        break;
      }
      case "openAddBudget": actions.openAddBudget(); break;
      case "saveBudgetForm": {
        state.ui.budgetFormCategory = document.getElementById("bf-category").value;
        state.ui.budgetFormLabel = document.getElementById("bf-label").value;
        state.ui.budgetFormAmount = document.getElementById("bf-amount").value;
        actions.saveBudget();
        break;
      }
      case "removeBudget": actions.removeBudget(id); break;
      case "selectMemoTagFilter": actions.selectMemoTagFilter(id); break;
      case "addMemoTag": actions.addMemoTag(); break;
      case "openAddMemo": actions.openAddMemo(); break;
      case "saveMemoForm": {
        state.ui.memoFormTag = document.getElementById("mf-tag").value;
        state.ui.memoFormName = document.getElementById("mf-name").value;
        state.ui.memoFormPrice = document.getElementById("mf-price").value;
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
    if (act === "selectTrip") actions.selectTrip(el.value);
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
  const group = state.memoTagFilter === "all" ? null : state.memoTagFilter;
  const list = group == null ? trip.memoItems : trip.memoItems.filter(m => m.tag === group);
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
function handleFieldCommit(e) {
  const el = e.target;
  if (!el.matches) return;
  if (!el.matches("[data-bind-blur]")) return;
  const field = el.getAttribute("data-bind-blur");
  const id = el.getAttribute("data-id");
  const val = el.value;
  switch (field) {
    case "tripName": actions.saveTripName(val); break;
    case "dateRange": actions.setDateRange(val); break;
    case "flightOut": actions.setFlightOut(val); break;
    case "flightBack": actions.setFlightBack(val); break;
    case "stayName": actions.setStayName(id, val); break;
    case "notes": actions.setNotes(val); break;
    case "prepLabel": actions.setPrepLabel(el.getAttribute("data-cat"), id, val); break;
    case "packingLabel": actions.setPackingLabel(el.getAttribute("data-cat"), id, val); break;
    case "dayTitle": actions.setDayTitle(state.activeDayId, val); break;
    case "itemTitle": actions.setItemField(id, "title", val); break;
    case "itemLocation": actions.setItemLocation(id, val); break;
    case "itemNote": actions.setItemField(id, "note", val); break;
    case "budgetLabel": actions.setBudgetLabel(id, val); break;
    case "budgetAmount": actions.setBudgetAmount(id, val); break;
    case "memoName": actions.setMemoName(id, el.getAttribute("data-owner"), val); break;
    case "memoPrice": actions.setMemoPrice(id, el.getAttribute("data-owner"), val); break;
    case "collab.name": actions.saveCollabName(val); break;
  }
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                     */
/* ---------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const map = loadIdentityMap();
  const uidVal = map[state.activeTripId];
  if (uidVal && state.collaborators.some(p => p.id === uidVal)) state.currentUserId = uidVal;
  initEvents();
  doRender();
});
