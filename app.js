const STORE = "roast-journal-v1";
const app = document.querySelector("#app");

const seed = {
  route: "home",
  machines: [
    { id: "m1", name: "Discovery", maillardTemp: 165, maillardMode: "temperature", tempMin: 80, tempMax: 240, tempStep: "0.1", heatMode: "number", heatMin: 0, heatMax: 5, heatStep: "0.1", airMode: "number", airMin: 0, airMax: 5, airStep: "0.1" },
    { id: "m2", name: "Sample Roaster", maillardTemp: 160, maillardMode: "temperature", tempMin: 80, tempMax: 240, tempStep: "1", heatMode: "percent", heatMin: 0, heatMax: 100, heatStep: "1", airMode: "percent", airMin: 0, airMax: 100, airStep: "1" }
  ],
  beans: [
    { id: "b1", name: "Ethiopia Samii Heirloom", country: "エチオピア", region: "Guji", farm: "Samii", variety: "Heirloom", process: "ウォッシュト", altitude: "1950–2100m", note: "フローラル、柑橘、ティーライク" },
    { id: "b2", name: "Kenya Gichathaini AA", country: "ケニア", region: "Nyeri", farm: "Gichathaini", variety: "SL28 / SL34", process: "ウォッシュト", altitude: "1800m", note: "ベリー、黒糖、明るい酸" }
  ],
  batches: [],
  folders: ["未分类"],
  anomalyTags: ["RoR 崩落", "升温停滞", "升温过快", "一爆偏早", "一爆偏晚", "烟感偏重", "火力误操作", "风门误操作"],
  language: "ja",
  draft: null,
  active: null
};

const clone = (x) => JSON.parse(JSON.stringify(x));
function normalizeState(input = {}) {
  const stored = { ...clone(seed), ...(input && typeof input === "object" ? input : {}) };
  stored.machines = Array.isArray(stored.machines) && stored.machines.length ? stored.machines : clone(seed.machines);
  stored.beans = Array.isArray(stored.beans) && stored.beans.length ? stored.beans : clone(seed.beans);
  stored.batches = Array.isArray(stored.batches) ? stored.batches : [];
  stored.folders = Array.isArray(stored.folders) && stored.folders.length ? stored.folders : ["未分类"];
  stored.language ||= "ja";
  stored.anomalyTags = Array.isArray(stored.anomalyTags) && stored.anomalyTags.length ? stored.anomalyTags : clone(seed.anomalyTags);
  const legacyDefaultMachine = stored.machines.find((item) => item.id === "m1" && item.name === "Probat P12");
  if (legacyDefaultMachine) legacyDefaultMachine.name = "Discovery";
  stored.machines.forEach((item) => {
    if (item.heatMode === "level5" || item.heatMode === "level9" || !item.heatMode) item.heatMode = "number";
    if (item.airMode === "level5" || item.airMode === "level9" || !item.airMode) item.airMode = "number";
    item.heatMin ??= 0; item.airMin ??= 0;
    item.heatMax ??= item.name === "Discovery" ? 5 : item.heatMode === "percent" ? 100 : 9;
    item.airMax ??= item.name === "Discovery" ? 5 : item.airMode === "percent" ? 100 : 9;
    item.heatStep ||= item.name === "Discovery" ? "0.1" : "1";
    item.airStep ||= item.name === "Discovery" ? "0.1" : "1";
    item.tempMin ??= 80;
    item.tempMax ??= 240;
    item.tempStep ||= item.name === "Discovery" ? "0.1" : "1";
  });
  const seedUpdates = {
    b1: { country: "エチオピア", process: "ウォッシュト", note: "フローラル、柑橘、ティーライク" },
    b2: { country: "ケニア", process: "ウォッシュト", note: "ベリー、黒糖、明るい酸" }
  };
  stored.beans.forEach((item) => {
    if (seedUpdates[item.id]) Object.assign(item, seedUpdates[item.id]);
  });
  const counters = {};
  stored.batches.forEach((batch) => {
    const numbers = String(batch.date || "").match(/\d+/g);
    const date = numbers?.length >= 3 ? `${numbers[0]}-${String(numbers[1]).padStart(2, "0")}-${String(numbers[2]).padStart(2, "0")}` : String(batch.date || "");
    counters[date] = (counters[date] || 0) + 1;
    batch.roastNo ||= counters[date];
  });
  return stored;
}
const load = () => {
  try { return normalizeState(JSON.parse(localStorage.getItem(STORE) || "{}")); }
  catch { return clone(seed); }
};
let state = load();
let interval;

const save = () => localStorage.setItem(STORE, JSON.stringify(state));
const esc = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const machine = (id) => state.machines.find((m) => m.id === id) || state.machines[0];
const bean = (id) => state.beans.find((b) => b.id === id) || state.beans[0];
const fmt = (seconds = 0) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const parseTime = (value = "") => {
  const text = String(value).trim();
  if (!text) return null;
  const parts = text.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 1) return Math.max(0, Math.floor(parts[0]));
  if (parts.length === 2 && parts[1] < 60) return Math.max(0, Math.floor(parts[0] * 60 + parts[1]));
  return null;
};
const elapsed = () => state.active?.startedAt ? Math.max(0, Math.floor((Date.now() - state.active.startedAt) / 1000)) : 0;
const stopwatchElapsed = () => (state.active?.stopwatchSeconds || 0) + (state.active?.stopwatchStartedAt ? Math.floor((Date.now() - state.active.stopwatchStartedAt) / 1000) : 0);
const runningLabel = () => !state.active?.startedAt
  ? (state.language === "ja" ? "タップして開始" : state.language === "en" ? "Tap to start" : "点击开始")
  : state.language === "ja" ? "計時中" : state.language === "en" ? "Running" : "运行中";
const minuteHint = (seconds) => state.language === "ja"
  ? `現在 ${fmt(seconds)} · 押すのが少し遅れた時は、記録時刻を調整できます。`
  : state.language === "en"
    ? `Current ${fmt(seconds)} · If you are one second late, adjust the log time to the full minute.`
    : `当前 ${fmt(seconds)} · 例如手慢一秒时，可以把记录时间改成整分钟。`;
const toast = (message) => {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
};
const displayMode = () => {
  if (window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone) return "standalone";
  return "browser";
};
const analyticsEnabled = () => /^G-[A-Z0-9]+$/i.test(ANALYTICS_MEASUREMENT_ID) && location.protocol === "https:";
function trackEvent(name, params = {}) {
  if (!analyticsEnabled() || typeof window.gtag !== "function") return;
  window.gtag("event", name, {
    app_version: APP_VERSION,
    display_mode: displayMode(),
    ...params
  });
}
function setupAnalytics() {
  if (!analyticsEnabled()) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_MEASUREMENT_ID}`;
  document.head.append(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(){ window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", ANALYTICS_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
    app_version: APP_VERSION,
    display_mode: displayMode()
  });
  trackEvent("app_open");
}

function shell(content, route = state.route) {
  const nav = route === "live" || route === "new" || route === "manual" || route === "machine-edit" || route === "bean-edit" || route === "about" ? "" : `
    <nav class="nav"><div class="nav-inner">
      ${navButton("home","⌂","批次")}
      ${navButton("search","⌕","搜索")}
      ${navButton("machines","♨","烘焙机")}
      ${navButton("settings","⚙","设置")}
    </div></nav>`;
  return `<div class="app-shell ${route === "live" ? "live-shell" : ""}">${content}${nav}</div>`;
}
const navButton = (route, icon, label) => `<button data-route="${route}" class="${state.route === route ? "active" : ""}"><b>${icon}</b>${label}</button>`;
const backBar = (title, action = "") => `<header class="topbar"><button class="icon-btn" data-back>‹</button><div class="screen-title">${title}</div>${action || '<span class="icon-btn"></span>'}</header>`;
const field = (label, key, value, type="text", full=false) => `<label class="field ${full ? "full" : ""}"><span>${label}</span><input name="${key}" type="${type}" value="${esc(value)}"></label>`;
const select = (label, key, value, options, full=false) => `<label class="field ${full ? "full" : ""}"><span>${label}</span><select name="${key}">${options.map(([id, text]) => `<option value="${esc(id)}" ${id === value ? "selected" : ""}>${esc(text)}</option>`).join("")}</select></label>`;
const splitTime = (value = "") => {
  const seconds = parseTime(value);
  return seconds === null ? ["", ""] : [String(Math.floor(seconds / 60)).padStart(2, "0"), String(seconds % 60).padStart(2, "0")];
};
const timeParts = (prefix, value = "", compact = false) => {
  const [minutes, seconds] = splitTime(value);
  return `<span class="fixed-time ${compact ? "compact" : ""}"><input name="${prefix}Min" inputmode="numeric" maxlength="2" value="${esc(minutes)}" placeholder="00"><b>:</b><input name="${prefix}Sec" inputmode="numeric" maxlength="2" value="${esc(seconds)}" placeholder="00"></span>`;
};
const readPartsTime = (data, prefix) => {
  const minutes = String(data[`${prefix}Min`] || "").trim();
  const seconds = String(data[`${prefix}Sec`] || "").trim();
  if (!minutes && !seconds) return null;
  return parseTime(`${minutes || 0}:${seconds || 0}`);
};
const isoToday = () => new Date().toISOString().slice(0, 10);
const displayDate = (value = "") => normalizedDate(value).replaceAll("-", "/");
const dateField = (label, value = isoToday()) => {
  const date = normalizedDate(value);
  return `<label class="field date-field"><span>${label}</span><span class="date-control"><strong data-date-display>${esc(displayDate(date))}</strong><input class="system-date" name="date" type="date" value="${esc(date)}"></span></label>`;
};
const folderOptions = () => state.folders.map((name) => [name, name]);
const normalizedDate = (value = "") => {
  const numbers = String(value).match(/\d+/g);
  return numbers?.length >= 3 ? `${numbers[0]}-${String(numbers[1]).padStart(2, "0")}-${String(numbers[2]).padStart(2, "0")}` : String(value);
};
const sameDay = (left = "", right = "") => normalizedDate(left) === normalizedDate(right);
const nextRoastNo = (date = isoToday()) => Math.max(0, ...state.batches.filter((batch) => sameDay(batch.date, date)).map((batch) => Number(batch.roastNo) || 0)) + 1;
const roastNoOptions = (selected = 1) => Array.from({ length: Math.max(12, Number(selected) || 1) }, (_, index) => [String(index + 1), `#${index + 1}`]);
const placeName = (item) => item.locationName || item.farm || "";
const eventLabel = (name = "") => String(name).includes("美拉德") ? "美拉德" : String(name);
const selectionWithAdd = (label, key, value, options, action) => `<div class="select-add full">${select(label, key, value, options, true)}<button class="mini-add" type="button" ${action}>＋</button></div>`;
const controlModes = {
  number: { label: "数字滑杆", unit: "" },
  percent: { label: "百分比滑杆", unit: "%" },
  kpa: { label: "压力滑杆", unit: "kPa" },
  rpm: { label: "转速滑杆", unit: "RPM" },
  free: { label: "自由输入", unit: "" }
};
const controlModeOptions = () => Object.entries(controlModes).map(([id, mode]) => [id, mode.label]);
const controlModeLabel = (id) => controlModes[id]?.label || "自由输入";
const numberValue = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const controlSettings = (m, kind) => {
  const mode = m[`${kind}Mode`] || "number";
  const min = numberValue(m[`${kind}Min`], 0);
  const max = Math.max(min + 0.1, numberValue(m[`${kind}Max`], mode === "percent" ? 100 : 5));
  const step = String(m[`${kind}Step`] || (mode === "number" ? "0.1" : "1"));
  const unit = controlModes[mode]?.unit || "";
  return { mode, min, max, step, unit, label: controlModeLabel(mode) };
};
const defaultControlValue = (m, kind) => {
  const config = controlSettings(m, kind);
  return formatControlValue(config.min, config.step);
};
const tempSettings = (m) => ({
  min: numberValue(m.tempMin, 80),
  max: Math.max(numberValue(m.tempMin, 80) + 1, numberValue(m.tempMax, 240)),
  step: String(m.tempStep || "0.1")
});
const formatControlValue = (value, step = "0.1") => {
  const num = numberValue(value, 0);
  return String(step).includes(".") ? num.toFixed(String(step).split(".")[1].length) : String(Math.round(num));
};
const controlValueLabel = (value = "", mode = "free") => {
  if (!value && value !== 0) return "—";
  const unit = controlModes[mode]?.unit || "";
  return `${value}${unit && !String(value).includes(unit) ? unit : ""}`;
};
function controlInput(kind, label, m, value = "") {
  const config = controlSettings(m, kind);
  const current = value === "" || value === undefined ? defaultControlValue(m, kind) : formatControlValue(value, config.step);
  if (config.mode === "free") {
    return `<div class="control-field compact-control"><div class="control-title"><strong>${label}</strong><small>${esc(config.label)}</small></div><label class="control-input"><input name="${kind}Control" inputmode="text" value="${esc(current)}" placeholder="例如 3.5 / 45%"><span></span></label></div>`;
  }
  return `<div class="control-field compact-control" data-control-field="${kind}">
    <div class="slider-control">
      <input class="control-slider" name="${kind}Control" type="range" min="${esc(config.min)}" max="${esc(config.max)}" step="${esc(config.step)}" value="${esc(current)}" data-control-slider="${kind}">
      <div class="slider-bottom"><span>${esc(config.min)}</span><span>${esc(config.max)}</span></div>
    </div>
    <div class="control-title right-title"><strong>${label}</strong><div class="slider-readout"><b data-control-output="${kind}">${esc(current)}</b><span>${esc(config.unit)}</span></div><div class="precision-toggle"><button type="button" class="${config.step === "1" ? "active" : ""}" data-control-step="${kind}" data-step="1">整</button><button type="button" class="${config.step !== "1" ? "active" : ""}" data-control-step="${kind}" data-step="0.1">小</button></div></div>
  </div>`;
}
function tempInput(m, value = "") {
  const config = tempSettings(m);
  const current = formatControlValue(value || m.chargeTemp || config.min, config.step);
  return `<div class="temp-wheel">
    <div class="temp-readout"><span>当前温度</span><strong data-temp-output>${esc(current)}</strong><b>°C</b></div>
    <input id="live-temperature" class="temp-slider" name="tempControl" type="range" min="${esc(config.min)}" max="${esc(config.max)}" step="${esc(config.step)}" value="${esc(current)}" data-temp-slider>
    <div class="temp-scale"><span>${esc(config.min)}°</span><span>${esc(config.max)}°</span></div>
  </div>`;
}
const liveRecordSeconds = () => readPartsTime({ liveMin: document.querySelector('[name="liveMin"]')?.value, liveSec: document.querySelector('[name="liveSec"]')?.value }, "live") ?? elapsed();
const isAnomalyEvent = (event = "") => String(event).startsWith("异常：");
const feedbackUrl = "https://docs.google.com/forms/d/e/1FAIpQLSerqRT8IalIOMgOuqqhtULFdjONxC8xzGitLCji8fnR3-eukQ/viewform";
const feedbackEmail = "ouokubou@gmail.com";
const publicAppUrl = "https://angimo233.github.io/RoastTrace-App/";
const publicRepoUrl = "https://github.com/AngImo233/RoastTrace-App";
const APP_VERSION = "V1";
const ANALYTICS_MEASUREMENT_ID = "";
function liveMachineQuick(m) {
  return `<div class="sheet-backdrop" data-close-live-machine-settings></div>
    <form id="live-machine-form" class="live-machine-sheet">
      <div class="sheet-head"><div><small>Machine Quick Settings</small><h3>烘焙机快速设置</h3><p>烘焙中会立即应用到当前滑杆。</p></div><button type="button" data-close-live-machine-settings>×</button></div>
      <div class="quick-machine-grid">
        ${field("美拉德温度 °C", "maillardTemp", m.maillardTemp, "number")}
        ${select("温度精度", "tempStep", String(m.tempStep || "0.1"), [["1","整数"],["0.1","一位小数"]])}
        ${field("温度最小值 °C", "tempMin", m.tempMin ?? 80, "number")}
        ${field("温度最大值 °C", "tempMax", m.tempMax ?? 240, "number")}
        ${field("火力最小值", "heatMin", m.heatMin ?? 0, "number")}
        ${field("火力最大值", "heatMax", m.heatMax ?? 5, "number")}
        ${select("火力精度", "heatStep", String(m.heatStep || "0.1"), [["1","整数"],["0.1","一位小数"]])}
        ${field("风门最小值", "airMin", m.airMin ?? 0, "number")}
        ${field("风门最大值", "airMax", m.airMax ?? 5, "number")}
        ${select("风门精度", "airStep", String(m.airStep || "0.1"), [["1","整数"],["0.1","一位小数"]])}
      </div>
      <div class="sheet-actions"><button type="button" class="secondary" data-close-live-machine-settings>取消</button><button type="button" class="primary" data-save-live-machine-settings>保存设置</button></div>
    </form>`;
}
const translations = {
  en: {
    "批次":"Batches","搜索":"Search","烘焙机":"Roasters","设置":"Settings","快速开始":"Quick start","新建烘焙记录":"New roast log","开始新批次":"Start roast","手动记录":"Manual entry","最近批次":"Recent batches","新建文件夹":"New folder","本机数据":"Local data","已保存批次":"Saved batches","烘焙机配置":"Roaster profiles","本地保存":"Local storage","已启用":"Enabled","规划中":"Planned","批次对比":"Batch comparison","打开":"Open","语言":"Language","界面语言":"Interface language","生成 PDF":"Create PDF","生成完整 PDF 报告":"Create complete PDF","下载当前批次 CSV":"Download batch CSV","烘焙记录与总结":"Roast notes","过程备注":"Process notes","结束总结":"Summary","温度与 RoR 曲线":"Temperature and RoR","完整温度时间表":"Temperature log","关键节点":"Events","总时间":"Total time","烘焙度":"Roast level","发展时间":"Development","日期":"Date","投入温度":"Charge temp","投入量":"Charge weight","浅烘":"Light","中烘":"Medium","深烘":"Dark"
  },
  ja: {
    "批次":"バッチ","搜索":"検索","烘焙机":"焙煎機","设置":"設定","快速开始":"クイックスタート","新建烘焙记录":"新規焙煎記録","开始新批次":"焙煎を開始","手动记录":"手動入力","最近批次":"最近のバッチ","新建文件夹":"フォルダ作成","本机数据":"端末データ","已保存批次":"保存済みバッチ","烘焙机配置":"焙煎機設定","本地保存":"ローカル保存","已启用":"有効","规划中":"予定","批次对比":"バッチ比較","打开":"開く","语言":"言語","界面语言":"表示言語","生成 PDF":"PDF 作成","生成完整 PDF 报告":"完全な PDF レポートを作成","下载当前批次 CSV":"CSV をダウンロード","烘焙记录与总结":"焙煎メモ","过程备注":"工程メモ","结束总结":"まとめ","温度与 RoR 曲线":"温度と RoR 曲線","完整温度时间表":"温度記録","关键节点":"重要ポイント","总时间":"合計時間","烘焙度":"焙煎度","发展时间":"デベロップメント","日期":"日付","投入温度":"投入温度","投入量":"投入量","浅烘":"浅煎り","中烘":"中煎り","深烘":"深煎り"
  }
};
Object.assign(translations.en, {
  "完整数据备份":"Complete data backup","固定网址":"Fixed URL","只要网址不变，更新软件后本机数据会自动保留。备份用于换手机、换网址或误删后的恢复。":"As long as the URL stays the same, local data remains after app updates. Use backup when changing phones, changing URLs, or recovering deleted data.","备份全部数据":"Back up all data","恢复备份":"Restore backup","备份已生成":"Backup created","备份已恢复":"Backup restored","备份文件无效":"Invalid backup file","公开版本":"Public version","扫码打开 RoastTrace":"Scan to open RoastTrace","这个二维码会打开公开网页版 App。用户可以添加到 iPhone 主屏幕。":"This QR code opens the public web app. Users can add it to the iPhone Home Screen.","检查更新":"Check for updates","复制 App 链接":"Copy app link","查看 GitHub":"View GitHub","App 链接已复制":"App link copied","已经是最新版本":"Already up to date","暂时无法检查更新":"Unable to check for updates","匿名访问统计":"Anonymous usage analytics","只统计打开次数和主屏幕打开，不上传烘焙数据。":"Counts app opens and Home Screen opens only. Roast data is not uploaded.","待配置":"Needs setup"
});
Object.assign(translations.ja, {
  "快速开始":"クイックスタート","新建烘焙记录":"新規焙煎記録","计时、发展秒表、分钟温度与关键节点都在同一个页面。":"タイマー、デベロップメント、1分ごとの温度、重要イベントを1画面で記録できます。","离线保存":"オフライン保存","单手记录":"片手で記録","曲线报告":"カーブレポート","开始新批次":"新しいバッチを開始","手动记录":"手動入力","最近批次":"最近のバッチ","新建文件夹":"フォルダ作成","删除文件夹":"フォルダ削除","全部":"すべて","未分类":"未分類","还没有完成的批次。":"完了したバッチはまだありません。","第一炉数据会从这里开始积累。":"最初のバッチからここに蓄積されます。",
  "查看全部":"すべて表示","个已保存批次":"件の保存済みバッチ","最近记录":"最新記録","数据会保存在本机，可随时回看与比较。":"データは端末内に保存され、いつでも確認・比較できます。","打开记录库 ›":"記録ライブラリを開く ›",
  "开始一炉新的记录。":"新しい焙煎記録を始める。","炉次":"バッチ番号","咖啡豆":"コーヒー豆","文件夹":"フォルダ","投入温度 °C":"投入温度 °C","投入量 g":"投入量 g","批次备注":"バッチメモ","开始烘焙并计时":"焙煎を開始して計時","日期":"日付",
  "烘焙计时":"焙煎タイマー","运行中":"計時中","点击计时开始":"タイマーをタップして開始","计时已开始":"タイマーを開始しました","发展秒表":"発展時間","点击暂停":"タップして一時停止","点击继续":"タップして再開","点击开始":"タップして開始","当前温度 · 时间可手动修正":"現在温度 · 記録時刻は修正できます","温度滑轮 · 时间可手动修正":"温度を選び、時刻を調整","当前温度":"現在温度","记录温度":"温度を記録","记录":"記録","记录时间":"記録時刻","对齐整分钟":"00秒に合わせる","整分钟":"00秒に合わせる","自动带入时间与温度":"時刻と温度を自動入力","最低温度":"最低温度","回温点":"ボトム","美拉德":"メイラード","美拉德温度":"メイラード温度","阈值可调整":"しきい値を調整できます","阈值可在机器设置中修改":"しきい値は焙煎機設定で変更できます","一爆":"1ハゼ","可同时开始发展秒表":"保存するとタイマーを開始","出豆":"煎りあげ","保存节点后完成本炉记录":"保存後に焙煎を完了","温度时间表":"温度ログ","补记整分钟":"分単位で追記","时间":"時間","温度":"温度","节点 / 备注":"イベント / メモ","记录出豆并完成":"このバッチを完了","完成本炉":"このバッチを完了",
  "把纸面数据，":"紙の記録を、","整理成完整曲线。":"完全なカーブに整理する。","拍照辅助录入":"写真を見ながら入力","可以先拍摄或选择纸张照片，再根据照片填写下方数据。自动识别会在后续接入本地 OCR。":"紙の記録を撮影または選択して、下の欄に入力できます。OCR は今後追加予定です。","拍照":"撮影","从照片图库选择":"写真ライブラリから選択","首次打开照片图库时，iPhone 会询问访问权限。照片只在本机预览，不会上传。":"初回は iPhone が写真へのアクセス許可を確認します。写真は端末内でのみ表示され、アップロードされません。","CSV 快速导入":"CSV クイック読み込み","支持“时间, 温度, 备注”格式。导入后会先填入下方温度表，你可以检查和修改。":"「時間, 温度, メモ」形式に対応します。読み込み後は下の温度表で確認・修正できます。","选择 CSV 文件":"CSV ファイルを選択","保存完整批次":"バッチを保存","每分钟温度表":"1分ごとの温度表","＋ 添加一行":"＋ 行を追加","烘焙过程备注":"焙煎工程メモ","烘焙结束总结":"焙煎まとめ","时间格式":"時刻形式","备注":"メモ","时间冒号和温度单位会固定保留。CSV 导入后也会自动转换成逐行输入框。":"時刻のコロンと温度単位は固定表示されます。CSV 読み込み後も行ごとの入力欄に変換されます。",
  "本机数据":"端末データ","把每一炉数据，":"各バッチのデータを、","整理成可以回看的档案。":"振り返れる記録に整理する。","选择两炉，比较曲线与关键节点。":"2つのバッチでカーブとイベントを比較。","打开 ›":"開く ›","仅保存在本机":"端末内のみに保存","全部批次":"すべてのバッチ","排序":"並び順","最新优先":"新しい順","最早优先":"古い順","按咖啡豆":"コーヒー豆順",
  "批次详情":"バッチ詳細","编辑数据":"データを編集","批次信息":"バッチ情報","国家 / 产区":"国 / 地域","品种":"品種","处理法":"精製方法","生成完整 PDF 报告":"完全な PDF レポートを作成","下载当前批次 CSV":"現在のバッチを CSV で保存",
  "iPhone 会打开打印页面。在预览图上双指放大，再点分享按钮，即可保存 PDF 到“文件”或发送给别人。":"iPhone でプリント画面が開きます。プレビューを二本指で拡大し、共有ボタンから PDF を“ファイル”へ保存または送信できます。",
  "设置":"設定","语言":"言語","简体中文":"簡体字中国語","日本語":"日本語","界面语言":"表示言語","咖啡豆档案":"コーヒー豆ライブラリ","新增豆子":"豆を追加","烘焙机":"焙煎機","新增":"追加","保存":"保存","批次对比":"バッチ比較","批次 A":"バッチ A","批次 B":"バッチ B",
  "关于与反馈":"アプリ情報・フィードバック","开发者信息、邮箱、反馈表单。":"開発者情報、メール、フィードバックフォーム。","反馈与联系":"フィードバック・連絡","发送反馈":"フィードバックを送る","邮件联系":"メールで連絡","扫码发送反馈":"QRコードでフィードバック","只有开发者能看到你的反馈，其他用户不会看到你的消息。":"フィードバックは開発者だけが確認できます。他のユーザーには表示されません。","开发者":"開発者","邮箱":"メール","打开反馈表单":"フォームを開く","公开版本":"公開版","扫码打开 RoastTrace":"QRコードで RoastTrace を開く","这个二维码会打开公开网页版 App。用户可以添加到 iPhone 主屏幕。":"このQRコードから公開Webアプリを開けます。iPhoneのホーム画面に追加できます。","检查更新":"アップデート確認","复制 App 链接":"アプリリンクをコピー","查看 GitHub":"GitHubを見る","App 链接已复制":"アプリリンクをコピーしました","已经是最新版本":"最新版です","暂时无法检查更新":"アップデートを確認できません",
  "现在离线记录，":"まずはオフラインで記録し、","以后再扩展同步。":"同期機能は今後追加します。","本地保存":"ローカル保存","当前数据仅保存在这台设备，不依赖网络。":"現在のデータはこの端末内だけに保存され、ネット接続は不要です。","PDF 报告":"PDF レポート","批次详情中可生成包含曲线、表格和总结的报告。":"バッチ詳細から、カーブ・表・まとめを含むレポートを作成できます。","iCloud 同步":"iCloud 同期","后续版本加入。":"今後のバージョンで追加します。","CSV 导入与导出":"CSV 読み込み・書き出し","纸张录入页面可导入，批次详情可下载当前批次数据。":"手動入力画面で読み込み、バッチ詳細で現在のデータを書き出せます。","匿名访问统计":"匿名アクセス解析","只统计打开次数和主屏幕打开，不上传烘焙数据。":"起動回数とホーム画面起動のみを集計し、焙煎データはアップロードしません。","待配置":"未設定","完整数据备份":"完全データバックアップ","固定网址":"固定URL","只要网址不变，更新软件后本机数据会自动保留。备份用于换手机、换网址或误删后的恢复。":"URL が変わらなければ、アプリ更新後も端末内データは自動的に残ります。バックアップは機種変更、URL変更、誤削除からの復元に使います。","备份全部数据":"すべてのデータをバックアップ","恢复备份":"バックアップを復元","备份已生成":"バックアップを作成しました","备份已恢复":"バックアップを復元しました","备份文件无效":"バックアップファイルが無効です","语言偏好保存在本机，常用界面会随选择切换。":"言語設定は端末内に保存され、画面表示に反映されます。",
  "打开":"開く","关闭":"閉じる","开始":"開始","保存节点":"イベントを保存","保存并结束烘焙":"保存して焙煎を完了","固定温度":"固定温度","可选":"任意","说明":"説明","过程备注":"工程メモ","结束总结":"まとめ","保存文字":"メモを保存","档案名称":"表示名","产地类型":"生産地の種類","处理厂 / 合作社 / 农园名称":"精製所・組合・農園名","风味与备注":"風味・メモ","国家":"国","产区":"地域","海拔":"標高","产地":"生産地","处理厂 / 合作社":"精製所 / 組合","农园 / 庄园":"農園 / エステート","生产者 / 社区":"生産者 / コミュニティ","其他":"その他",
  "不同机器，":"焙煎機ごとに、","使用不同的判断规则。":"異なる判断ルールを使う。","美拉德阈值":"メイラードしきい値","按温度记录":"温度で記録","手动标记":"手動で記録","美拉德反应的计算方式因烘焙机与工作习惯而异。这里保存的是每台机器的默认记录规则，烘焙进行中仍可手动点击节点。":"メイラードの判断方法は焙煎機や作業スタイルで異なります。ここでは各焙煎機の既定ルールを保存し、焙煎中も手動でイベントを記録できます。",
  "搜索国家、处理厂、农园、品种、处理法…":"国、ステーション、農園、品種、精製方法を検索…","按国家":"国別","按品种":"品種別","国家文件夹":"国別フォルダ","品种文件夹":"品種別フォルダ","条结果":"件","没有匹配的咖啡豆。":"一致するコーヒー豆はありません。",
  "把豆子的来历，":"コーヒー豆の来歴を、","留在每一炉数据旁边。":"各バッチの記録と一緒に残す。","例如：风门、火力、天气，或者本炉想验证的事情。":"例：ダンパー、火力、天候、このバッチで確認したいこと。","例如：风门、火力变化、环境温度":"例：ダンパー、火力の変化、環境温度","例如：一爆偏早，发展段略短；下次降低前段火力。":"例：1ハゼが早く、デベロップメントが短め。次回は前半の火力を下げる。","例如：花香、柑橘、茶感":"例：フローラル、柑橘、ティーライク",
  "美拉德节点记录方式":"メイラードイベントの記録方法","按温度阈值记录":"温度しきい値で記録","仅手动点击记录":"手動タップのみ","美拉德节点温度 °C":"メイラード温度 °C","烘焙机名称":"焙煎機名","这不会自动控制烘焙机，只定义本机默认使用的美拉德记录温度。实际烘焙时，你可以在任何温度点击记录。":"焙煎機を自動制御する機能ではありません。この端末で使う既定のメイラード記録温度を設定します。焙煎中は任意の温度でイベントを記録できます。",
  "记录一爆时间":"1ハゼ時刻を記録","让每台机器使用":"焙煎機ごとに","自己的记录方式。":"固有の記録方法を使う。",
  "记录火力、风门、环境等信息":"火力、ダンパー、環境などを記録","记录本炉判断，以及下一炉想调整的方向":"このバッチの所感と次回の調整方針を記録","记录关键节点":"重要イベントを記録","输入":"入力","先输入当前温度":"現在温度を入力してください","请填写记录时间":"記録時刻を入力してください","本炉记录已保存到手机":"このバッチを端末に保存しました","例如：":"例：",
  "烘焙信息":"焙煎情報","烘焙中可修改":"焙煎中も変更できます","机器设置":"焙煎機設定","烘焙机快速设置":"焙煎機クイック設定","烘焙中会立即应用到当前滑杆。":"焙煎中のスライダーへすぐ反映されます。","保存设置":"設定を保存","取消":"キャンセル","点标签即记录":"タグをタップして記録","＋问题":"＋問題","操作记录":"操作記録","记录操作":"操作を記録","滑杆记录":"スライダー記録","火力":"火力","风门 / 风量":"ダンパー / 風量","风门":"ダンパー","异常标记":"異常メモ","添加问题":"問題を追加","自定义":"自由入力","记录什么异常？":"どんな異常を記録しますか？","新增常用问题标签":"よく使う問題タグを追加","给这个批次补充什么问题？":"このバッチに補足する問題は？","问题已补充":"問題を補足しました","本炉没有异常标记。":"このバッチには異常メモがありません。","操作记录已保存":"操作記録を保存しました","升温停滞":"昇温停滞","升温过快":"昇温過多","一爆偏早":"1ハゼ早い","一爆偏晚":"1ハゼ遅い","烟感偏重":"煙感強め","火力误操作":"火力ミス","风门误操作":"ダンパーミス","异常：":"異常：","操作：":"操作：","火力记录方式":"火力の記録方式","风门 / 风量记录方式":"ダンパー / 風量の記録方式","温度最小值 °C":"温度の最小値 °C","温度最大值 °C":"温度の最大値 °C","温度精度":"温度の精度","数字滑杆":"数値スライダー","百分比滑杆":"パーセントスライダー","压力滑杆":"圧力スライダー","转速滑杆":"回転数スライダー","整数":"整数","小数":"小数","一位小数":"小数1桁","火力最小值":"火力の最小値","火力最大值":"火力の最大値","火力精度":"火力の精度","风门最小值":"ダンパーの最小値","风门最大值":"ダンパーの最大値","风门精度":"ダンパーの精度","自由输入":"自由入力","档":"段",
  "目标设定":"目標設定","烘焙中会显示对照":"焙煎中に目標を表示します","烘焙中对照":"焙煎中の目標","目标 / 实际":"目標 / 実績","目标一爆":"目標 1ハゼ","目标出豆":"目標 煎りあげ","目标发展":"目標 発展","发展":"発展","失重率 %":"失重率 %","失重率":"失重率","烘焙结束后填写":"焙煎後に入力","杯测记录":"カッピング記録","风味标签":"風味タグ","同豆复盘":"同じ豆の復盤","同一支豆子的其他批次会出现在这里。":"同じ豆の他のバッチがここに表示されます。","甜感、酸质、余韵、干净度":"甘さ、酸質、余韻、クリーンさ","按时间":"時間別","按国家":"国別","按品种":"品種別","炉":"バッチ",
  "横轴为烘焙时间":"横軸は焙煎時間","条记录":"件の記録","至少记录两次温度后，才能生成曲线。":"温度を2回以上記録すると、カーブを表示できます。","RoR 按相邻两次温度记录自动计算。每分钟至少记录一次温度，曲线会更有参考价值。":"RoR は前後の温度記録から自動計算されます。1分に1回以上記録すると、より参考になるカーブになります。","输入温度，开始建立本炉曲线。":"温度を入力して、このバッチのカーブを作成します。","本批次没有记录关键节点。":"このバッチには重要イベントが記録されていません。"
});
const homeQuote = () => "I have measured out my life<br>with coffee spoons.<small>— T. S. Eliot</small>";

function translatePage() {
  const dictionary = translations[state.language];
  if (!dictionary) return;
  const replacements = Object.entries(dictionary).sort(([left], [right]) => right.length - left.length);
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    replacements.forEach(([source, target]) => { if (node.textContent.includes(source)) node.textContent = node.textContent.replaceAll(source, target); });
  }
  app.querySelectorAll("[placeholder]").forEach((element) => replacements.forEach(([source, target]) => { if (element.placeholder.includes(source)) element.placeholder = element.placeholder.replaceAll(source, target); }));
}

function home() {
  const selectedFolder = state.homeFolder || "全部";
  const recent = state.batches.slice().reverse().filter((batch) => selectedFolder === "全部" || (batch.folder || "未分类") === selectedFolder).slice(0, 8);
  const latest = state.batches.slice().sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];
  return shell(`
    <header class="topbar"><div class="brand"><img src="./icon-roastlog.png" alt="">RoastTrace</div><button class="icon-btn" data-route="search">⌕</button></header>
    <div class="eyebrow">Specialty Coffee Roast Journal</div>
    <h1 class="home-quote">${homeQuote()}</h1>
    <section class="hero-card">
      <p class="subtle">快速开始</p>
      <h2>新建烘焙记录</h2>
      <p class="subtle">计时、发展秒表、分钟温度与关键节点都在同一个页面。</p>
      <div class="hero-meta"><span class="tag">离线保存</span><span class="tag">单手记录</span><span class="tag">曲线报告</span></div>
      <button class="primary" data-route="new" style="margin-top:20px;background:#bd7544">开始新批次</button>
      <button class="hero-secondary" data-route="manual">手动记录</button>
    </section>
    <section class="section">
      <div class="section-head"><h2>最近批次</h2><div class="section-actions">${selectedFolder !== "全部" && selectedFolder !== "未分类" ? `<button class="section-link danger-link" data-delete-folder="${esc(selectedFolder)}">删除文件夹</button>` : ""}<button class="section-link" data-add-folder>新建文件夹</button></div></div>
      <div class="folder-tabs">${["全部", ...state.folders].map((folder) => `<button class="${folder === selectedFolder ? "active" : ""}" data-folder-filter="${esc(folder)}">▰ ${esc(folder)}</button>`).join("")}</div>
      <div class="list">${recent.length ? recent.map(batchCard).join("") : `<div class="empty card">还没有完成的批次。<br>第一炉数据会从这里开始积累。</div>`}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2>本机数据</h2><button class="section-link" data-route="data">查看全部</button></div>
      <button class="data-entry-card" data-route="data"><span><b>${state.batches.length}</b> 个已保存批次</span><small>${latest ? `最近记录 ${displayDate(latest.date)}` : "数据会保存在本机，可随时回看与比较。"}</small><em>打开记录库 ›</em></button>
    </section>`);
}

function batchCard(batch) {
  const b = bean(batch.beanId), m = machine(batch.machineId);
  return `<article class="list-card batch-card"><button class="batch-main" data-batch-detail="${batch.id}"><div><strong>${esc(b.name)}</strong><small class="batch-origin">${esc(b.country)} · ${esc(b.region)} · ${esc(b.process)}</small><small>${esc(m.name)} · ${displayDate(batch.date)} · ${esc(batch.roastStyle || "浅烘")} · #${esc(batch.roastNo || "?")}</small><small>▰ ${esc(batch.folder || "未分类")}</small></div><span class="tag">${fmt(batch.duration)}</span></button><button class="delete-row batch-delete" data-delete-batch="${batch.id}" aria-label="删除批次">×</button></article>`;
}

function newBatch() {
  const d = state.draft || { beanId: state.beans[0]?.id, machineId: state.machines[0]?.id, chargeTemp: "130", chargeWeight: "100", targetCrack: "", targetDrop: "", targetDevelopment: "", roastStyle: "浅烘", date: isoToday(), roastNo: nextRoastNo(), folder: "未分类", note: "" };
  if (d.chargeTemp === "90.2") d.chargeTemp = "130";
  if (d.chargeWeight === "101") d.chargeWeight = "100";
  state.draft = d; save();
  return shell(`${backBar("新建烘焙记录", '<button class="text-btn accent" data-start>开始</button>')}
    <div class="eyebrow">New Roast</div><h1>开始一炉新的记录。</h1>
    <form id="draft-form">
      <section class="section"><div class="field-grid compact-setup">
        ${dateField("日期", d.date || isoToday())}
        ${select("炉次", "roastNo", String(d.roastNo || nextRoastNo()), roastNoOptions(d.roastNo || nextRoastNo()))}
        ${select("烘焙度", "roastStyle", d.roastStyle, [["浅烘","浅烘"],["中烘","中烘"],["深烘","深烘"]])}
        ${select("文件夹", "folder", d.folder || "未分类", folderOptions())}
        ${selectionWithAdd("咖啡豆", "beanId", d.beanId, state.beans.map((b) => [b.id, b.name]), "data-quick-bean")}
        ${selectionWithAdd("烘焙机", "machineId", d.machineId, state.machines.map((m) => [m.id, m.name]), "data-quick-machine")}
        ${field("投入温度 °C", "chargeTemp", d.chargeTemp, "number")}
        ${field("投入量 g", "chargeWeight", d.chargeWeight, "number")}
      </div></section>
      <section class="section"><div class="section-head"><h2>目标设定</h2><span class="subtle">烘焙中会显示对照</span></div><div class="field-grid">
        ${field("目标一爆", "targetCrack", d.targetCrack || "", "text")}
        ${field("目标出豆", "targetDrop", d.targetDrop || "", "text")}
        ${field("目标发展", "targetDevelopment", d.targetDevelopment || "", "text", true)}
      </div></section>
      <section class="section"><label class="field"><span>批次备注</span><textarea name="note" placeholder="例如：风门、火力、天气，或者本炉想验证的事情。">${esc(d.note)}</textarea></label></section>
      <button class="primary" type="button" data-start>开始烘焙并计时</button>
    </form>`, "new");
}

function live() {
  if (!state.active) { state.route = "home"; save(); return home(); }
  const a = state.active, b = bean(a.beanId), m = machine(a.machineId);
  const sec = elapsed(), sw = stopwatchElapsed();
  const rows = a.entries.slice().reverse();
  a.maillardTemp ??= m.maillardTemp;
  a.heatStep ??= m.heatStep || "0.1";
  a.airStep ??= m.airStep || "0.1";
  a.heatValue ??= defaultControlValue(m, "heat");
  a.airValue ??= defaultControlValue(m, "air");
  a.tempValue ??= formatControlValue(a.chargeTemp || tempSettings(m).min, m.tempStep || "0.1");
  const editing = a.editingEvent;
  return shell(`
    <div class="live-top">
      <div class="timer-row swapped"><button class="stopwatch thumb-stopwatch" data-stopwatch><span class="subtle">发展秒表</span><strong id="dev-timer">${fmt(sw)}</strong><span class="stopwatch-action">${a.stopwatchStartedAt ? "点击暂停" : sw ? "点击继续" : "点击开始"}</span></button>
        <button class="roast-timer-right timer-start-card ${a.startedAt ? "running" : ""}" data-toggle-roast-timer><div class="subtle">烘焙计时</div><div class="timer compact" id="main-timer">${fmt(sec)}<small>${runningLabel()}</small></div></button>
      </div>
      <div class="live-info-card"><div class="live-info-head"><b>烘焙信息</b><div class="live-info-actions"><span>烘焙中可修改</span><button type="button" data-open-live-machine-settings>机器设置</button></div></div><div class="live-profile"><select data-live-bean>${state.beans.map((item) => `<option value="${item.id}" ${item.id === a.beanId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select><select data-live-machine>${state.machines.map((item) => `<option value="${item.id}" ${item.id === a.machineId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select><label class="live-maillard"><span>美拉德温度</span><b><input data-live-maillard-temp inputmode="decimal" type="number" step="1" value="${esc(a.maillardTemp)}">°C</b></label></div></div>
      ${state.showLiveMachineSettings ? liveMachineQuick(m) : ""}
    </div>
    <section class="temp-panel">
      <div class="temp-panel-head"><label>温度滑轮 · 时间可手动修正</label></div>
      <div class="temp-control-card">
        <button class="record-btn temp-record-btn" data-record-temp><span>记录温度</span></button>
        <div class="temp-control-fields">
          ${tempInput(m, a.tempValue)}
        </div>
        <div class="time-correct left-first temp-align-row"><button data-round-minute>整分钟</button><label><span>记录时间</span>${timeParts("live", fmt(sec))}</label></div>
        <div class="minute-hint" id="minute-hint">${minuteHint(sec)}</div>
      </div>
    </section>
    ${liveTargetCard(a)}
    <section class="section live-tools">
      <div class="section-head compact-head"><h2>操作记录</h2><span class="subtle">${esc(m.name)}</span></div>
      <div class="control-card left-action-card">
        <button class="record-btn control-record" data-record-control><span>记录操作</span></button>
        <div class="control-fields">
          ${controlInput("heat", "火力", { ...m, heatStep: a.heatStep }, a.heatValue)}
          ${controlInput("air", "风门 / 风量", { ...m, airStep: a.airStep }, a.airValue)}
        </div>
      </div>
    </section>
    <section class="section live-tools">
      <div class="section-head compact-head"><h2>异常标记</h2><span class="subtle">点标签即记录</span></div>
      <div class="anomaly-card compact-anomaly">
        <button class="record-btn anomaly-primary" data-quick-anomaly>＋问题</button>
        <div class="anomaly-tags">${state.anomalyTags.map((tag) => `<span class="anomaly-chip"><button type="button" data-anomaly="${esc(tag)}">${esc(tag)}</button><button type="button" class="chip-delete" data-delete-anomaly-tag="${esc(tag)}">×</button></span>`).join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>关键节点</h2><span class="subtle">自动带入时间与温度</span></div>
      <div class="event-grid">
        ${eventButton(a, "最低温度", "回温点")}
        ${eventButton(a, "美拉德", `${a.maillardTemp}°C · 阈值可调整`, "highlight")}
        ${eventButton(a, "一爆", "记录一爆时间", "highlight")}
        ${eventButton(a, "出豆", "保存节点后完成本炉记录", "finish")}
      </div>
      ${editing ? eventEditor(editing) : ""}
    </section>
    <section class="section">
      <div class="section-head"><h2>温度时间表</h2><button class="section-link" data-fill-minute>补记整分钟</button></div>
      <div class="minute-table">
        <div class="minute-row header"><span>时间</span><span>温度</span><span>节点 / 备注</span><span></span></div>
        ${rows.length ? rows.map((entry) => `<div class="minute-row"><span>${fmt(entry.seconds)}</span><b>${entry.temperature ? `${entry.temperature}°` : "—"}</b><em>${esc(eventLabel(entry.event))}</em><button class="delete-row" data-delete-entry="${entry.id}">×</button></div>`).join("") : `<div class="empty">输入温度，开始建立本炉曲线。</div>`}
      </div>
    </section>
    <div class="live-footer"><button class="primary" data-finish>完成本炉</button></div>`, "live");
}

function manualBatch() {
  const m = machine(state.manualDraft?.machineId);
  const d = state.manualDraft || { beanId: state.beans[0]?.id, machineId: state.machines[0]?.id, roastStyle: "浅烘", date: isoToday(), roastNo: nextRoastNo(), folder: "未分类", chargeTemp: "130", chargeWeight: "100", targetCrack: "", targetDrop: "", targetDevelopment: "", note: "", summary: "" };
  ["low", "maillard", "crack", "drop"].forEach((key) => {
    if (d[`${key}Min`] === "00" && d[`${key}Sec`] === "00") { d[`${key}Min`] = ""; d[`${key}Sec`] = ""; }
  });
  if (!state.editBatchId && !d.chargeWeight) d.chargeWeight = "100";
  state.manualDraft = d; save();
  const maillard = "美拉德";
  return shell(`${backBar("手动记录", '<button class="text-btn accent" data-manual-save>保存</button>')}
    <div class="eyebrow">Manual Entry</div><h1>把纸面数据，<br>整理成完整曲线。</h1>
    <section class="section photo-import">
      <div><h3>拍照辅助录入</h3><p class="subtle">可以先拍摄或选择纸张照片，再根据照片填写下方数据。自动识别会在后续接入本地 OCR。</p></div>
      <div class="photo-actions"><label class="secondary photo-button">拍照<input data-paper-photo type="file" accept="image/*" capture="environment"></label><label class="secondary photo-button">从照片图库选择<input data-paper-photo type="file" accept="image/*"></label></div>
      <p class="subtle">首次打开照片图库时，iPhone 会询问访问权限。照片只在本机预览，不会上传。</p>
      <div id="paper-preview"></div>
    </section>
    <section class="section csv-import">
      <div><h3>CSV 快速导入</h3><p class="subtle">支持“时间, 温度, 备注”格式。导入后会先填入下方温度表，你可以检查和修改。</p></div>
      <label class="secondary photo-button">选择 CSV 文件<input id="csv-file" type="file" accept=".csv,text/csv,text/plain"></label>
    </section>
    <form id="manual-form">
      <section class="section"><div class="field-grid compact-setup">
        ${dateField("日期", d.date)}
        ${select("炉次", "roastNo", String(d.roastNo || nextRoastNo(d.date)), roastNoOptions(d.roastNo || nextRoastNo(d.date)))}
        ${select("烘焙度", "roastStyle", d.roastStyle, [["浅烘","浅烘"],["中烘","中烘"],["深烘","深烘"]])}
        ${select("文件夹", "folder", d.folder || "未分类", folderOptions())}
        ${selectionWithAdd("咖啡豆", "beanId", d.beanId, state.beans.map((b) => [b.id, b.name]), "data-quick-bean")}
        ${selectionWithAdd("烘焙机", "machineId", d.machineId, state.machines.map((item) => [item.id, item.name]), "data-quick-machine")}
        ${field("投入温度 °C", "chargeTemp", d.chargeTemp, "number")}
        ${field("投入量 g", "chargeWeight", d.chargeWeight, "number")}
      </div></section>
      <section class="section"><div class="section-head"><h2>目标设定</h2></div><div class="field-grid">
        ${field("目标一爆", "targetCrack", d.targetCrack || "", "text")}
        ${field("目标出豆", "targetDrop", d.targetDrop || "", "text")}
        ${field("目标发展", "targetDevelopment", d.targetDevelopment || "", "text", true)}
      </div></section>
      <section class="section"><div class="section-head"><h2>关键节点</h2><span class="subtle">时间格式 05:40</span></div><div class="paper-events">
        ${manualEventFields("最低温度", "low", d)}
        ${manualEventFields(maillard, "maillard", d)}
        ${manualEventFields("一爆", "crack", d)}
        ${manualEventFields("出豆", "drop", d)}
      </div></section>
      <section class="section"><div class="section-head"><h2>每分钟温度表</h2><button class="section-link" type="button" data-add-paper-row>＋ 添加一行</button></div><div class="paper-table" id="paper-table">${paperRows()}</div><p class="subtle input-help">时间冒号和温度单位会固定保留。CSV 导入后也会自动转换成逐行输入框。</p></section>
      <section class="section"><label class="field"><span>烘焙过程备注</span><textarea name="note" placeholder="例如：风门、火力变化、环境温度">${esc(d.note)}</textarea></label></section>
      <section class="section"><label class="field"><span>烘焙结束总结</span><textarea name="summary" placeholder="例如：一爆偏早，发展段略短；下次降低前段火力。">${esc(d.summary)}</textarea></label></section>
      <button class="primary" type="button" data-manual-save>保存完整批次</button>
    </form>`, "manual");
}

function manualEventFields(label, key, draft) {
  const time = draft[`${key}Time`] || (draft[`${key}Min`] || draft[`${key}Sec`] ? `${draft[`${key}Min`] || "00"}:${draft[`${key}Sec`] || "00"}` : "");
  const defaultTemp = key === "maillard" ? machine(draft.machineId).maillardTemp : "";
  return `<div class="paper-event"><strong>${esc(label)}</strong><label><span>时间</span>${timeParts(key, time, true)}</label><label><span>温度</span><span class="temp-with-unit"><input name="${key}Temp" inputmode="decimal" type="number" step="0.1" value="${esc(draft[`${key}Temp`] || defaultTemp)}" placeholder="可选"><b>°C</b></span></label></div>`;
}

function paperRow(index, seconds = index * 60, temperature = "", event = "") {
  return `<div class="paper-temp-row" data-paper-row><span class="row-index">${index + 1}</span>${timeParts(`row${index}`, fmt(seconds), true)}<span class="temp-with-unit"><input name="row${index}Temp" inputmode="decimal" type="number" step="0.1" value="${esc(temperature)}" placeholder="温度"><b>°C</b></span><input class="row-note" name="row${index}Note" value="${esc(event)}" placeholder="备注"><button class="delete-row" type="button" data-remove-paper-row>×</button></div>`;
}

function paperRows(entries = state.manualRows) {
  const samples = entries?.length ? entries : Array.from({ length: 10 }, (_, index) => ({ seconds: (index + 1) * 60, temperature: "", event: "" }));
  return samples.map((entry, index) => paperRow(index, Number(entry.seconds), entry.temperature || "", entry.event || "")).join("");
}

function eventButton(active, name, caption, className = "") {
  const entry = active.entries.find((item) => name === "美拉德" ? String(item.event).includes(name) : item.event === name);
  const summary = entry ? `${fmt(entry.seconds)}${entry.temperature ? ` · ${entry.temperature}°C` : ""}` : caption;
  return `<button class="event-btn ${className} ${entry ? "recorded" : ""}" data-open-event="${esc(name)}"><strong>${entry ? "✓ " : ""}${esc(name)}</strong><span>${esc(summary)}</span></button>`;
}

function targetValues(batch = {}) {
  return [
    ["一爆", batch.targetCrack || ""],
    ["出豆", batch.targetDrop || ""],
    ["发展", batch.targetDevelopment || ""]
  ].filter(([, value]) => String(value).trim());
}

function liveTargetCard(batch = {}) {
  const values = targetValues(batch);
  if (!values.length) return "";
  return `<section class="section live-target"><div class="section-head"><h2>目标设定</h2><span class="subtle">烘焙中对照</span></div><div class="target-strip">${values.map(([label, value]) => `<span><b>${esc(label)}</b><strong>${esc(value)}</strong></span>`).join("")}</div></section>`;
}

function targetCompareCard(batch, actual = {}) {
  const values = targetValues(batch);
  if (!values.length) return "";
  const actuals = { "一爆": actual.crack || "—", "出豆": actual.drop || "—", "发展": actual.development || "—" };
  return `<section class="section"><div class="section-head"><h2>目标设定</h2><span class="subtle">目标 / 实际</span></div><div class="target-compare">${values.map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b><strong>${esc(actuals[label])}</strong></div>`).join("")}</div></section>`;
}

function eventEditor(name) {
  const existing = state.active.entries.find((item) => name === "美拉德" ? String(item.event).includes(name) : item.event === name);
  const fixedMaillard = name.includes("美拉德");
  return `<form class="event-editor" id="event-form">
    <div class="section-head"><div><small>记录关键节点</small><h3>${esc(name)}</h3></div><button class="icon-btn" type="button" data-close-event>×</button></div>
    <div class="event-fields">
      <label><span>时间</span>${timeParts("event", fmt(existing?.seconds ?? elapsed()))}</label>
      ${fixedMaillard ? `<label><span>固定温度</span><strong class="fixed-temp">${esc(state.active.maillardTemp ?? machine(state.active.machineId).maillardTemp)}°C</strong></label>` : `<label><span>温度 °C</span><input name="temperature" inputmode="decimal" type="number" step="0.1" value="${esc(existing?.temperature || "")}" placeholder="可选"></label>`}
    </div>
    <button class="primary" type="button" data-save-event="${esc(name)}">${name === "出豆" ? "保存并结束烘焙" : "保存节点"}</button>
  </form>`;
}

function chartLine(points) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

function roastChart(entries) {
  const samples = entries
    .map((entry) => ({ seconds: Number(entry.seconds), temperature: Number(entry.temperature) }))
    .filter((entry, index) => String(entries[index].temperature || "").trim() && Number.isFinite(entry.seconds) && Number.isFinite(entry.temperature))
    .sort((a, b) => a.seconds - b.seconds);
  if (samples.length < 2) return `<div class="empty chart-empty">至少记录两次温度后，才能生成曲线。</div>`;

  const width = 360, height = 232, left = 38, right = 35, top = 20, bottom = 34;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const maxSeconds = Math.max(60, ...samples.map((item) => item.seconds));
  const temperatures = samples.map((item) => item.temperature);
  const minTemp = Math.floor((Math.min(...temperatures) - 5) / 10) * 10;
  const maxTemp = Math.ceil((Math.max(...temperatures) + 5) / 10) * 10;
  const tempRange = Math.max(10, maxTemp - minTemp);
  const ror = samples.slice(1).map((item, index) => {
    const previous = samples[index];
    const seconds = item.seconds - previous.seconds;
    return seconds > 0 ? { seconds: item.seconds, value: (item.temperature - previous.temperature) / seconds * 60 } : null;
  }).filter(Boolean);
  const rawRorMax = Math.max(10, ...ror.map((item) => item.value));
  const rawRorMin = Math.min(0, ...ror.map((item) => item.value));
  const rorMax = Math.ceil(rawRorMax / 5) * 5;
  const rorMin = Math.floor(rawRorMin / 5) * 5;
  const rorRange = Math.max(5, rorMax - rorMin);
  const x = (seconds) => left + seconds / maxSeconds * plotWidth;
  const yTemp = (temperature) => top + (maxTemp - temperature) / tempRange * plotHeight;
  const yRor = (value) => top + (rorMax - value) / rorRange * plotHeight;
  const tempPoints = samples.map((item) => [x(item.seconds), yTemp(item.temperature)]);
  const rorPoints = ror.map((item) => [x(item.seconds), yRor(item.value)]);
  const timeTicks = Array.from({ length: 5 }, (_, index) => Math.round(maxSeconds / 4 * index));
  const tempTicks = Array.from({ length: 5 }, (_, index) => minTemp + tempRange / 4 * index);
  const rorTicks = Array.from({ length: 5 }, (_, index) => rorMin + rorRange / 4 * index);

  return `<div class="chart-card">
    <div class="chart-legend"><span class="temperature-key">温度 °C</span><span class="ror-key">RoR °C/min</span></div>
    <svg class="roast-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="烘焙温度与 RoR 曲线">
      ${tempTicks.map((tick, index) => {
        const y = top + plotHeight - plotHeight / 4 * index;
        return `<line class="chart-grid" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text class="chart-axis" x="${left - 5}" y="${y + 3}" text-anchor="end">${Math.round(tick)}</text><text class="chart-axis ror-axis" x="${width - right + 5}" y="${y + 3}">${Math.round(rorTicks[index])}</text>`;
      }).join("")}
      ${timeTicks.map((tick) => `<line class="chart-grid vertical" x1="${x(tick)}" y1="${top}" x2="${x(tick)}" y2="${height - bottom}"></line><text class="chart-axis" x="${x(tick)}" y="${height - 12}" text-anchor="middle">${fmt(tick)}</text>`).join("")}
      <polyline class="chart-line temperature-line" points="${chartLine(tempPoints)}"></polyline>
      ${rorPoints.length > 1 ? `<polyline class="chart-line ror-line" points="${chartLine(rorPoints)}"></polyline>` : ""}
      ${tempPoints.map(([cx, cy]) => `<circle class="chart-dot temperature-dot" cx="${cx}" cy="${cy}" r="2.7"></circle>`).join("")}
      ${rorPoints.map(([cx, cy]) => `<circle class="chart-dot ror-dot" cx="${cx}" cy="${cy}" r="2.4"></circle>`).join("")}
    </svg>
    <p class="chart-note">RoR 按相邻两次温度记录自动计算。每分钟至少记录一次温度，曲线会更有参考价值。</p>
  </div>`;
}

function batchDetail() {
  const batch = state.batches.find((item) => item.id === state.detailBatchId);
  if (!batch) { state.route = "home"; save(); return home(); }
  const b = bean(batch.beanId), m = machine(batch.machineId);
  const entries = batch.entries || [];
  const events = entries.filter((entry) => entry.event);
  const anomalies = events.filter((entry) => isAnomalyEvent(entry.event));
  const sameBeanBatches = state.batches
    .filter((item) => item.beanId === batch.beanId && item.id !== batch.id)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 6);
  const crack = events.find((entry) => entry.event === "一爆");
  const drop = events.find((entry) => entry.event === "出豆");
  const development = crack && drop && drop.seconds >= crack.seconds ? fmt(drop.seconds - crack.seconds) : "—";
  return shell(`${backBar("批次详情", '<button class="text-btn accent print-hide" data-print>生成 PDF</button>')}
    <div class="eyebrow">Roast Summary</div>
    <h1>${esc(b.name)}</h1>
    <p class="detail-origin">${esc(b.country)} · ${esc(b.region)} · ${esc(placeName(b))}</p>
    <p class="detail-batch-no">${displayDate(batch.date)} · ${esc(batch.roastStyle || "浅烘")} · #${esc(batch.roastNo || "?")} · ▰ ${esc(batch.folder || "未分类")}</p>
    <section class="detail-folder print-hide"><label><span>文件夹</span><select data-batch-folder>${state.folders.map((folder) => `<option value="${esc(folder)}" ${folder === (batch.folder || "未分类") ? "selected" : ""}>${esc(folder)}</option>`).join("")}</select></label><button class="section-link" data-edit-batch="${batch.id}">编辑数据</button></section>
    <section class="summary-hero">
      <div><span>总时间</span><strong>${fmt(batch.duration)}</strong></div>
      <div><span>烘焙度</span><strong>${esc(batch.roastStyle || "浅烘")}</strong></div>
      <div><span>发展时间</span><strong>${development}</strong></div>
    </section>
    ${targetCompareCard(batch, { crack: crack ? fmt(crack.seconds) : "—", drop: drop ? fmt(drop.seconds) : "—", development })}
    <section class="section">
      <div class="section-head"><h2>批次信息</h2></div>
      <div class="card detail-grid">
        <div><span>烘焙机</span><b>${esc(m.name)}</b></div><div><span>日期</span><b>${displayDate(batch.date)}</b></div>
        <div><span>投入温度</span><b>${esc(batch.chargeTemp)}°C</b></div><div><span>投入量</span><b>${esc(batch.chargeWeight)} g</b></div>
        <div><span>失重率</span><b>${batch.lossRate ? `${esc(batch.lossRate)}%` : "—"}</b></div><div><span>杯测记录</span><b>${esc(batch.cuppingNote || "—")}</b></div>
        <div><span>国家 / 产区</span><b>${esc(b.country)} · ${esc(b.region)}</b></div><div><span>${esc(b.locationType || "产地")}</span><b>${esc(placeName(b))}</b></div>
        <div><span>品种</span><b>${esc(b.variety)}</b></div><div><span>处理法</span><b>${esc(b.process)}</b></div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>关键节点</h2></div>
      <div class="card detail-events">${events.length ? events.map((entry) => `<div><b>${esc(eventLabel(entry.event))}</b><span>${fmt(entry.seconds)}${entry.temperature ? ` · ${esc(entry.temperature)}°C` : ""}</span></div>`).join("") : `<div class="empty">本批次没有记录关键节点。</div>`}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2>异常标记</h2><button class="section-link" data-add-batch-anomaly>＋ 添加问题</button></div>
      <div class="detail-tags">${anomalies.length ? anomalies.map((entry) => `<span class="detail-tag"><b>${esc(entry.event.replace("异常：", ""))}</b><small>${fmt(entry.seconds)}</small></span>`).join("") : `<div class="empty compact-empty">本炉没有异常标记。</div>`}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2>温度与 RoR 曲线</h2><span class="subtle">横轴为烘焙时间</span></div>
      ${roastChart(entries)}
    </section>
    <section class="section">
      <div class="section-head"><h2>完整温度时间表</h2><span class="subtle">${entries.length} 条记录</span></div>
      <div class="minute-table">
        <div class="minute-row header"><span>时间</span><span>温度</span><span>节点 / 备注</span><span></span></div>
        ${entries.slice().reverse().map((entry) => `<div class="minute-row"><span>${fmt(entry.seconds)}</span><b>${entry.temperature ? `${esc(entry.temperature)}°` : "—"}</b><em>${esc(eventLabel(entry.event))}</em><span></span></div>`).join("")}
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>烘焙记录与总结</h2><button class="section-link print-hide" data-save-summary>保存文字</button></div>
      <div class="summary-notes">
        <label class="field"><span>失重率 %</span><input id="batch-loss-rate" inputmode="decimal" type="number" step="0.1" value="${esc(batch.lossRate || "")}" placeholder="烘焙结束后填写"></label>
        <label class="field"><span>过程备注</span><textarea id="batch-note" placeholder="记录火力、风门、环境等信息">${esc(batch.note || "")}</textarea></label>
        <label class="field"><span>结束总结</span><textarea id="batch-summary" placeholder="记录本炉判断，以及下一炉想调整的方向">${esc(batch.summary || "")}</textarea></label>
        <label class="field"><span>风味标签</span><textarea id="batch-flavor" placeholder="例如：花香、柑橘、茶感">${esc(batch.flavorTags || "")}</textarea></label>
        <label class="field"><span>杯测记录</span><textarea id="batch-cupping" placeholder="例如：甜感、酸质、余韵、干净度">${esc(batch.cuppingNote || "")}</textarea></label>
      </div>
      <div class="print-only print-summary">
        <h3>过程备注</h3><p>${esc(batch.note || "—")}</p>
        <h3>结束总结</h3><p>${esc(batch.summary || "—")}</p>
        <h3>风味标签</h3><p>${esc(batch.flavorTags || "—")}</p>
        <h3>杯测记录</h3><p>${esc(batch.cuppingNote || "—")}</p>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>同豆复盘</h2><span class="subtle">${sameBeanBatches.length} 条记录</span></div>
      <div class="same-bean-list">${sameBeanBatches.length ? sameBeanBatches.map(sameBeanCard).join("") : `<div class="empty card">同一支豆子的其他批次会出现在这里。</div>`}</div>
    </section>
    <section class="section print-hide">
      <button class="primary" data-print>生成完整 PDF 报告</button>
      <button class="secondary export-button" data-export-csv>下载当前批次 CSV</button>
      <p class="subtle pdf-help">iPhone 会打开打印页面。在预览图上双指放大，再点分享按钮，即可保存 PDF 到“文件”或发送给别人。</p>
    </section>`, "batch-detail");
}

function sameBeanCard(batch) {
  const events = batch.entries || [];
  const crack = events.find((entry) => entry.event === "一爆");
  const drop = events.find((entry) => entry.event === "出豆");
  const development = crack && drop && drop.seconds >= crack.seconds ? fmt(drop.seconds - crack.seconds) : "—";
  const loss = batch.lossRate ? `${batch.lossRate}%` : "—";
  return `<button class="same-bean-card" data-batch-detail="${batch.id}">
    <span>${displayDate(batch.date)} · #${esc(batch.roastNo || "?")} · ${esc(batch.roastStyle || "浅烘")}</span>
    <strong>${drop ? fmt(drop.seconds) : fmt(batch.duration || 0)}</strong>
    <small>1ハゼ ${crack ? fmt(crack.seconds) : "—"} · 発展 ${development} · 失重率 ${loss}</small>
  </button>`;
}

function csvCells(line = "") {
  const cells = [];
  let value = "", quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if ((char === "," || char === "，" || char === "\t") && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
}

function csvToTemperatureText(text = "") {
  const rows = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).map(csvCells).filter((row) => row.some(Boolean));
  if (!rows.length) return "";
  const headerRow = rows.findIndex((row) => {
    const cells = row.map((cell) => cell.toLowerCase());
    return cells.some((cell) => /时间|time/.test(cell)) && cells.some((cell) => /温度|temperature|temp/.test(cell));
  });
  const first = (headerRow >= 0 ? rows[headerRow] : rows[0]).map((cell) => cell.toLowerCase());
  const hasHeader = headerRow >= 0;
  const timeIndex = hasHeader ? Math.max(0, first.findIndex((cell) => /时间|time/.test(cell))) : 0;
  const tempFound = hasHeader ? first.findIndex((cell) => /温度|temperature|temp/.test(cell)) : 1;
  const tempIndex = tempFound >= 0 ? tempFound : 1;
  const noteIndex = hasHeader ? first.findIndex((cell) => /备注|event|note|节点/.test(cell)) : 2;
  return rows.slice(hasHeader ? headerRow + 1 : 0).map((row) => {
    const seconds = parseTime(row[timeIndex]);
    const temperature = Number(row[tempIndex]);
    if (seconds === null || !Number.isFinite(temperature)) return null;
    const note = noteIndex >= 0 ? row[noteIndex] : "";
    return `${fmt(seconds)}, ${temperature}${note ? `, ${note}` : ""}`;
  }).filter(Boolean).join("\n");
}

function parsePaperEntries(text = "") {
  return String(text).split(/\n+/).map((line) => {
    const parts = line.trim().split(/[\s,，\t]+/).filter(Boolean);
    const seconds = parseTime(parts[0]);
    const temperature = Number(parts[1]);
    if (seconds === null || !Number.isFinite(temperature)) return null;
    return { id: uid(), seconds, temperature: String(temperature), event: parts.slice(2).join(" ") };
  }).filter(Boolean);
}

function readPaperTable(formData) {
  return [...document.querySelectorAll("[data-paper-row]")].map((row, index) => {
    const seconds = readPartsTime(formData, `row${index}`);
    const temperature = String(formData[`row${index}Temp`] || "").trim();
    const event = String(formData[`row${index}Note`] || "").trim();
    if (seconds === null || !temperature) return null;
    return { id: uid(), seconds, temperature, event };
  }).filter(Boolean);
}

function currentPaperRows() {
  const data = Object.fromEntries(new FormData(document.querySelector("#manual-form")).entries());
  return [...document.querySelectorAll("[data-paper-row]")].map((row, index) => ({
    seconds: readPartsTime(data, `row${index}`) ?? index * 60,
    temperature: data[`row${index}Temp`] || "",
    event: data[`row${index}Note`] || ""
  }));
}

function renderPaperRows(entries) {
  const table = document.querySelector("#paper-table");
  if (table) table.innerHTML = paperRows(entries);
}

function bindTimeInputs(root = document) {
  if (!root) return;
  root.querySelectorAll(".fixed-time input").forEach((input) => {
    input.addEventListener("focus", (e) => e.currentTarget.select());
    input.addEventListener("keydown", (e) => {
      if (!/^\d$/.test(e.key) || !e.currentTarget.dataset.autoPadded) return;
      e.preventDefault();
      e.currentTarget.value = `${e.currentTarget.value.slice(-1)}${e.key}`;
      e.currentTarget.dataset.autoPadded = "";
      e.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
    });
    input.addEventListener("input", (e) => {
      const field = e.currentTarget;
      clearTimeout(field.padTimer);
      field.value = field.value.replace(/\D/g, "").slice(0, 2);
      if (field.value.length !== 1) field.dataset.autoPadded = "";
      if (field.value.length === 1) field.padTimer = setTimeout(() => { field.value = field.value.padStart(2, "0"); field.dataset.autoPadded = "true"; }, 420);
    });
    const pad = (e) => { if (e.currentTarget.value.length === 1) { e.currentTarget.value = e.currentTarget.value.padStart(2, "0"); e.currentTarget.dataset.autoPadded = "true"; } };
    input.addEventListener("change", pad);
    input.addEventListener("blur", pad);
  });
}

function bindPaperTable() {
  document.querySelectorAll("[data-remove-paper-row]").forEach((el) => el.addEventListener("click", () => {
    const rows = currentPaperRows();
    const index = [...document.querySelectorAll("[data-remove-paper-row]")].indexOf(el);
    rows.splice(index, 1); renderPaperRows(rows); bindPaperTable();
  }));
  bindTimeInputs(document.querySelector(".paper-table"));
}

function csvEscape(value = "") {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportBatchCsv() {
  const batch = state.batches.find((item) => item.id === state.detailBatchId);
  if (!batch) return;
  saveBatchSummary(false);
  const b = bean(batch.beanId), m = machine(batch.machineId);
  const metadata = [
    ["炉次", `#${batch.roastNo || "?"}`], ["文件夹", batch.folder || "未分类"],
    ["咖啡豆", b.name], ["国家", b.country], ["产区", b.region], [b.locationType || "产地", placeName(b)],
    ["品种", b.variety], ["处理法", b.process], ["烘焙机", m.name], ["日期", batch.date],
    ["烘焙度", batch.roastStyle], ["投入温度 °C", batch.chargeTemp], ["投入量 g", batch.chargeWeight], ["失重率 %", batch.lossRate || ""],
    ["目标一爆", batch.targetCrack || ""], ["目标出豆", batch.targetDrop || ""], ["目标发展", batch.targetDevelopment || ""],
    ["过程备注", batch.note || ""], ["结束总结", batch.summary || ""], ["风味标签", batch.flavorTags || ""], ["杯测记录", batch.cuppingNote || ""]
  ];
  const rows = [
    ["字段", "内容"], ...metadata, [], ["时间", "温度 °C", "节点 / 备注"],
    ...(batch.entries || []).slice().sort((a, b) => a.seconds - b.seconds).map((entry) => [fmt(entry.seconds), entry.temperature || "", eventLabel(entry.event)])
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = `${b.name || "coffee-roast"}-${batch.date || "batch"}-${batch.roastNo || "x"}.csv`;
  document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  toast("CSV 已生成");
}

function backupState() {
  const data = clone(state);
  Object.assign(data, {
    route: "home",
    active: null,
    draft: null,
    manualDraft: null,
    manualRows: null,
    beanDraft: null,
    editBatchId: null,
    editBeanId: null,
    editMachineId: null,
    detailBatchId: null,
    returnRoute: null,
    showLiveMachineSettings: false
  });
  return data;
}

function exportBackup() {
  const payload = {
    app: "RoastTrace",
    format: "roasttrace-backup",
    version: 1,
    storageKey: STORE,
    exportedAt: new Date().toISOString(),
    data: backupState()
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `roasttrace-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  toast("备份已生成");
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const data = raw?.format === "roasttrace-backup" ? raw.data : raw?.data || raw;
    if (!data || !Array.isArray(data.beans) || !Array.isArray(data.machines) || !Array.isArray(data.batches)) throw new Error("Invalid backup");
    state = normalizeState({
      ...data,
      route: "settings",
      active: null,
      draft: null,
      manualDraft: null,
      manualRows: null,
      beanDraft: null,
      editBatchId: null,
      editBeanId: null,
      editMachineId: null,
      detailBatchId: null,
      returnRoute: null,
      showLiveMachineSettings: false
    });
    save(); render(); toast("备份已恢复");
  }
  catch {
    toast("备份文件无效");
  }
}

async function copyAppLink() {
  try {
    await navigator.clipboard.writeText(publicAppUrl);
    toast("App 链接已复制");
  }
  catch {
    window.prompt("复制 App 链接", publicAppUrl);
  }
}

async function clearAppCache() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.update()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("roast-journal-")).map((key) => caches.delete(key)));
  }
}

async function checkForUpdate() {
  try {
    const response = await fetch(`./version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Version check failed");
    const remote = await response.json();
    const latest = remote.version || APP_VERSION;
    if (latest === APP_VERSION) {
      toast("已经是最新版本");
      return;
    }
    if (confirm(`发现新版本 ${latest}，现在重新载入吗？本机数据会保留。`)) {
      await clearAppCache();
      location.reload();
    }
  }
  catch {
    toast("暂时无法检查更新");
  }
}

function saveManualBatch() {
  const form = document.querySelector("#manual-form");
  const data = Object.fromEntries(new FormData(form).entries());
  const m = machine(data.machineId);
  const entries = readPaperTable(data);
  if (data.chargeTemp) entries.push({ id: uid(), seconds: 0, temperature: data.chargeTemp, event: "投入" });
  [
    ["最低温度", "low"],
    ["美拉德", "maillard"],
    ["一爆", "crack"],
    ["出豆", "drop"]
  ].forEach(([event, key]) => {
    const seconds = readPartsTime(data, key);
    const temperature = String(data[`${key}Temp`] || (key === "maillard" ? m.maillardTemp : "")).trim();
    if (seconds !== null) entries.push({ id: uid(), seconds, temperature, event });
  });
  const drop = entries.find((entry) => entry.event === "出豆");
  const maxSeconds = Math.max(0, ...entries.map((entry) => Number(entry.seconds) || 0));
  const existing = state.editBatchId ? state.batches.find((item) => item.id === state.editBatchId) : null;
  const batch = { id: existing?.id || uid(), ...existing, ...data, entries, duration: drop?.seconds ?? maxSeconds, completedAt: existing?.completedAt || Date.now(), date: normalizedDate(data.date || isoToday()), source: "paper" };
  if (existing) Object.assign(existing, batch);
  else state.batches.push(batch);
  state.detailBatchId = batch.id; state.editBatchId = null; state.manualDraft = null; state.manualRows = null; state.route = "batch-detail"; save(); render(); toast(existing ? "批次数据已更新" : "纸张记录已保存到手机");
}

function dataGroupKey(batch, mode) {
  const b = bean(batch.beanId);
  if (mode === "country") return b.country || "未填写国家";
  if (mode === "variety") return b.variety || "未填写品种";
  return displayDate(batch.date).slice(0, 7);
}

function groupedBatches(mode = "time", batches = state.batches) {
  const groups = batches.reduce((result, batch) => {
    const key = dataGroupKey(batch, mode);
    result[key] ||= [];
    result[key].push(batch);
    return result;
  }, {});
  return Object.entries(groups).sort(([left], [right]) => mode === "time" ? right.localeCompare(left) : left.localeCompare(right));
}

function dataLibrary() {
  const sort = state.dataSort || "newest";
  const sorted = state.batches.slice().sort((a, b) => sort === "oldest" ? (a.completedAt || 0) - (b.completedAt || 0) : sort === "bean" ? bean(a.beanId).name.localeCompare(bean(b.beanId).name) : (b.completedAt || 0) - (a.completedAt || 0));
  const groupMode = state.dataGroup || "time";
  const groups = groupedBatches(groupMode, sorted);
  const selected = state.dataFolder && groups.some(([name]) => name === state.dataFolder) ? state.dataFolder : groups[0]?.[0];
  const selectedBatches = selected ? groups.find(([name]) => name === selected)?.[1] || [] : sorted;
  return shell(`${backBar("本机数据")}
    <div class="eyebrow">Roast Library</div><h1>把每一炉数据，<br>整理成可以回看的档案。</h1>
    <section class="section"><div class="data-actions"><button class="data-action-card" data-route="compare"><strong>批次对比</strong><small>选择两炉，比较曲线与关键节点。</small><em>打开 ›</em></button><div class="data-action-card"><strong>${state.batches.length}</strong><small>已保存批次</small><em>仅保存在本机</em></div></div></section>
    <section class="section">
      <div class="library-switch data-switch"><button class="${groupMode === "time" ? "active" : ""}" data-data-group="time">按时间</button><button class="${groupMode === "country" ? "active" : ""}" data-data-group="country">按国家</button><button class="${groupMode === "variety" ? "active" : ""}" data-data-group="variety">按品种</button></div>
      <div class="folder-shelf">${groups.length ? groups.map(([name, items]) => `<button class="floating-folder ${name === selected ? "active" : ""}" data-data-folder="${esc(name)}"><span>▰</span><strong>${esc(name)}</strong><small>${items.length} 炉</small></button>`).join("") : `<div class="empty card">还没有完成的批次。</div>`}</div>
    </section>
    <section class="section"><div class="section-head"><h2>${esc(selected || "全部批次")}</h2>${select("排序", "dataSort", sort, [["newest","最新优先"],["oldest","最早优先"],["bean","按咖啡豆"]])}</div><div class="list">${selectedBatches.length ? selectedBatches.map(batchCard).join("") : `<div class="empty card">还没有完成的批次。</div>`}</div></section>`, "data");
}

function search() {
  const query = state.search || "";
  const q = query.toLowerCase().trim();
  const results = state.beans.filter((b) => Object.values(b).join(" ").toLowerCase().includes(q));
  const mode = state.beanView || "country";
  const grouped = results.reduce((groups, item) => {
    const key = mode === "country" ? item.country || "未填写国家" : item.variety || "未填写品种";
    groups[key] ||= []; groups[key].push(item); return groups;
  }, {});
  return shell(`<header class="topbar"><div class="brand">咖啡豆档案</div><button class="text-btn accent" data-add-bean>新增豆子</button></header>
    <div class="searchbox"><input id="search-input" placeholder="搜索国家、处理厂、农园、品种、处理法…" value="${esc(query)}"></div>
    <div class="library-switch"><button class="${mode === "country" ? "active" : ""}" data-bean-view="country">按国家</button><button class="${mode === "variety" ? "active" : ""}" data-bean-view="variety">按品种</button></div>
    <section class="section library-section"><div class="section-head"><h2>${mode === "country" ? "国家文件夹" : "品种文件夹"}</h2><span class="subtle">${results.length} 条结果</span></div>
      <div class="library-folders">${results.length ? Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, items]) => `<details class="library-folder" open><summary><span>▰ ${esc(group)}</span><small>${items.length}</small></summary>${items.map((b) => `<article class="search-result"><button data-bean-edit="${b.id}"><h3>${esc(b.name)}</h3><p class="subtle">${esc(b.country)} · ${esc(b.region)}<br>${esc(b.locationType || "产地")}：${esc(placeName(b))} · ${esc(b.process)}</p></button><button class="delete-row" data-delete-bean="${b.id}">×</button></article>`).join("")}</details>`).join("") : `<div class="empty card">没有匹配的咖啡豆。</div>`}</div>
    </section>`, "search");
}

function machines() {
  return shell(`<header class="topbar"><div class="brand">烘焙机</div><button class="text-btn accent" data-machine-new>新增</button></header>
    <div class="eyebrow">Machine Profiles</div><h1>不同机器，<br>使用不同的判断规则。</h1>
    <section class="section"><div class="card">${state.machines.map((m) => `<article class="machine-row"><div><h3>${esc(m.name)}</h3><small>美拉德阈值 ${m.maillardTemp}°C · 温度 ${esc(m.tempMin ?? 80)}-${esc(m.tempMax ?? 240)}°C</small><small>火力 ${esc(controlModeLabel(m.heatMode))} ${esc(m.heatMin ?? 0)}-${esc(m.heatMax ?? 5)} · 风门 ${esc(controlModeLabel(m.airMode))} ${esc(m.airMin ?? 0)}-${esc(m.airMax ?? 5)}</small></div><div class="row-actions"><button class="secondary" data-machine-edit="${m.id}">设置</button><button class="delete-row" data-delete-machine="${m.id}">×</button></div></article>`).join("")}</div></section>
    <section class="section"><p class="subtle">美拉德反应的计算方式因烘焙机与工作习惯而异。这里保存的是每台机器的默认记录规则，烘焙进行中仍可手动点击节点。</p></section>`, "machines");
}

function comparisonChart(first, second) {
  const series = [first, second].map((batch) => (batch.entries || []).map((entry) => ({ seconds: Number(entry.seconds), temperature: Number(entry.temperature), hasTemperature: String(entry.temperature || "").trim() })).filter((entry) => entry.hasTemperature && Number.isFinite(entry.seconds) && Number.isFinite(entry.temperature)).sort((a, b) => a.seconds - b.seconds));
  const all = series.flat();
  if (all.length < 2) return `<div class="empty chart-empty">选择含有温度记录的批次后显示曲线。</div>`;
  const width = 360, height = 220, left = 38, right = 16, top = 18, bottom = 32;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const maxSeconds = Math.max(60, ...all.map((entry) => entry.seconds));
  const minTemp = Math.floor((Math.min(...all.map((entry) => entry.temperature)) - 5) / 10) * 10;
  const maxTemp = Math.ceil((Math.max(...all.map((entry) => entry.temperature)) + 5) / 10) * 10;
  const range = Math.max(10, maxTemp - minTemp);
  const x = (seconds) => left + seconds / maxSeconds * plotWidth;
  const y = (temperature) => top + (maxTemp - temperature) / range * plotHeight;
  const lines = series.map((items) => chartLine(items.map((entry) => [x(entry.seconds), y(entry.temperature)])));
  return `<div class="chart-card"><div class="chart-legend"><span class="temperature-key">批次 A</span><span class="compare-key">批次 B</span></div><svg class="roast-chart" viewBox="0 0 ${width} ${height}">${Array.from({ length: 5 }, (_, index) => { const yy = top + plotHeight / 4 * index; return `<line class="chart-grid" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"></line><text class="chart-axis" x="${left - 5}" y="${yy + 3}" text-anchor="end">${Math.round(maxTemp - range / 4 * index)}</text>`; }).join("")}${Array.from({ length: 5 }, (_, index) => { const seconds = Math.round(maxSeconds / 4 * index); return `<text class="chart-axis" x="${x(seconds)}" y="${height - 10}" text-anchor="middle">${fmt(seconds)}</text>`; }).join("")}<polyline class="chart-line temperature-line" points="${lines[0]}"></polyline><polyline class="chart-line compare-line" points="${lines[1]}"></polyline></svg></div>`;
}

function compare() {
  const firstId = state.compareA || state.batches[0]?.id;
  const secondId = state.compareB || state.batches[1]?.id || state.batches[0]?.id;
  const first = state.batches.find((batch) => batch.id === firstId);
  const second = state.batches.find((batch) => batch.id === secondId);
  const options = state.batches.map((batch) => [batch.id, `${bean(batch.beanId).name} · ${displayDate(batch.date)} · #${batch.roastNo || "?"}`]);
  return shell(`${backBar("批次对比")}
    <div class="eyebrow">Batch Compare</div><h1>把两炉曲线，<br>放在一起看。</h1>
    <section class="section"><div class="compare-selects">${select("批次 A", "compareA", firstId, options, true)}${select("批次 B", "compareB", secondId, options, true)}</div></section>
    ${first && second ? `<section class="section">${comparisonChart(first, second)}</section><section class="section"><div class="compare-grid">${compareCard("批次 A", first)}${compareCard("批次 B", second)}</div></section>` : `<div class="empty card">至少保存两个批次后，就可以开始对比。</div>`}`, "compare");
}

function compareCard(title, batch) {
  const low = (batch.entries || []).find((entry) => entry.event === "最低温度");
  const maillard = (batch.entries || []).find((entry) => String(entry.event).includes("美拉德"));
  const crack = (batch.entries || []).find((entry) => entry.event === "一爆");
  const drop = (batch.entries || []).find((entry) => entry.event === "出豆");
  const b = bean(batch.beanId);
  return `<div class="card compare-card"><span>${title}</span><h3>${esc(b.country)} · ${esc(b.region)}</h3><p>${esc(b.name)} · ${displayDate(batch.date)} · #${esc(batch.roastNo || "?")}</p><dl><dt>最低温度</dt><dd>${low ? `${fmt(low.seconds)} · ${esc(low.temperature || "—")}°C` : "—"}</dd><dt>美拉德</dt><dd>${maillard ? `${fmt(maillard.seconds)} · ${esc(maillard.temperature || "—")}°C` : "—"}</dd><dt>一爆</dt><dd>${crack ? `${fmt(crack.seconds)} · ${esc(crack.temperature || "—")}°C` : "—"}</dd><dt>出豆</dt><dd>${drop ? `${fmt(drop.seconds)} · ${esc(drop.temperature || "—")}°C` : "—"}</dd></dl></div>`;
}

function machineEdit() {
  const m = machine(state.editMachineId);
  return shell(`${backBar("烘焙机设置", '<button class="text-btn accent" data-machine-save>保存</button>')}
    <div class="eyebrow">Machine Profile</div><h1>让每台机器使用<br>自己的记录方式。</h1>
    <form id="machine-form"><section class="section"><div class="field-grid">
      ${field("烘焙机名称", "name", m.name, "text", true)}
      ${field("美拉德节点温度 °C", "maillardTemp", m.maillardTemp, "number", true)}
      ${select("美拉德节点记录方式", "maillardMode", m.maillardMode, [["temperature","按温度阈值记录"],["manual","仅手动点击记录"]], true)}
      ${field("温度最小值 °C", "tempMin", m.tempMin ?? 80, "number")}
      ${field("温度最大值 °C", "tempMax", m.tempMax ?? 240, "number")}
      ${select("温度精度", "tempStep", String(m.tempStep || "0.1"), [["1","整数"],["0.1","一位小数"]])}
      ${select("火力记录方式", "heatMode", m.heatMode || "number", controlModeOptions(), true)}
      ${field("火力最小值", "heatMin", m.heatMin ?? 0, "number")}
      ${field("火力最大值", "heatMax", m.heatMax ?? 5, "number")}
      ${select("火力精度", "heatStep", String(m.heatStep || "0.1"), [["1","整数"],["0.1","一位小数"]])}
      ${select("风门 / 风量记录方式", "airMode", m.airMode || "number", controlModeOptions(), true)}
      ${field("风门最小值", "airMin", m.airMin ?? 0, "number")}
      ${field("风门最大值", "airMax", m.airMax ?? 5, "number")}
      ${select("风门精度", "airStep", String(m.airStep || "0.1"), [["1","整数"],["0.1","一位小数"]])}
    </div></section>
    <section class="section"><div class="card"><h3>说明</h3><p class="subtle" style="margin-top:8px">这不会自动控制烘焙机，只定义本机默认使用的美拉德记录温度。实际烘焙时，你可以在任何温度点击记录。</p></div></section></form>`, "machine-edit");
}

function beanEdit() {
  const b = state.editBeanId ? bean(state.editBeanId) : { id: uid(), name: "", country: "", region: "", locationType: "处理厂 / 合作社", locationName: "", variety: "", process: "", altitude: "", note: "" };
  state.beanDraft = b; save();
  return shell(`${backBar("咖啡豆档案", '<button class="text-btn accent" data-bean-save>保存</button>')}
    <div class="eyebrow">Coffee Library</div><h1>把豆子的来历，<br>留在每一炉数据旁边。</h1>
    <form id="bean-form"><section class="section"><div class="field-grid">
      ${field("档案名称", "name", b.name, "text", true)}
      ${field("国家", "country", b.country)}
      ${field("产区", "region", b.region)}
      ${select("产地类型", "locationType", b.locationType || "农园 / 庄园", [["处理厂 / 合作社","处理厂 / 合作社"],["农园 / 庄园","农园 / 庄园"],["生产者 / 社区","生产者 / 社区"],["其他","其他"]])}
      ${field("处理厂 / 合作社 / 农园名称", "locationName", placeName(b))}
      ${field("品种", "variety", b.variety)}
      ${field("处理法", "process", b.process)}
      ${field("海拔", "altitude", b.altitude)}
      <label class="field full"><span>风味与备注</span><textarea name="note" placeholder="例如：花香、柑橘、茶感">${esc(b.note)}</textarea></label>
    </div></section></form>`, "bean-edit");
}

function settings() {
  return shell(`<header class="topbar"><div class="brand">设置</div></header>
    <div class="eyebrow">Offline First</div><h1>现在离线记录，<br>以后再扩展同步。</h1>
    <section class="section"><div class="card">
      <article class="machine-row"><div><h3>本地保存</h3><small>当前数据仅保存在这台设备，不依赖网络。</small></div><span class="tag">已启用</span></article>
      <article class="machine-row"><div><h3>PDF 报告</h3><small>批次详情中可生成包含曲线、表格和总结的报告。</small></div><span class="tag">已启用</span></article>
      <article class="machine-row"><div><h3>iCloud 同步</h3><small>后续版本加入。</small></div><span class="tag">规划中</span></article>
      <article class="machine-row"><div><h3>CSV 导入与导出</h3><small>纸张录入页面可导入，批次详情可下载当前批次数据。</small></div><span class="tag">已启用</span></article>
      <article class="machine-row"><div><h3>匿名访问统计</h3><small>只统计打开次数和主屏幕打开，不上传烘焙数据。</small></div><span class="tag">${analyticsEnabled() ? "已启用" : "待配置"}</span></article>
    </div></section>
    <section class="section"><div class="backup-card">
      <div><span class="tag">固定网址</span><h2>完整数据备份</h2><p>只要网址不变，更新软件后本机数据会自动保留。备份用于换手机、换网址或误删后的恢复。</p></div>
      <div class="backup-actions">
        <button class="primary" type="button" data-export-backup>备份全部数据</button>
        <button class="secondary" type="button" data-import-backup>恢复备份</button>
        <input class="backup-file" type="file" accept="application/json,.json" data-import-backup-file>
      </div>
    </div></section>
    <section class="section"><button class="about-entry-card" data-route="about"><span><b>关于与反馈</b><small>开发者信息、邮箱、反馈表单。</small></span><em>打开 ›</em></button></section>
    <section class="section"><div class="section-head"><h2>语言</h2></div><div class="card">${select("界面语言", "language", state.language || "ja", [["ja","日本語"],["zh","简体中文"],["en","English"]], true)}</div><p class="subtle input-help">语言偏好保存在本机，常用界面会随选择切换。</p></section>`, "settings");
}

function about() {
  const mail = `mailto:${feedbackEmail}?subject=${encodeURIComponent("RoastTrace Feedback")}`;
  return shell(`${backBar("关于与反馈")}
    <div class="eyebrow">About RoastTrace</div><h1>反馈与联系</h1>
    <section class="section about-hero">
      <img src="./icon-roastlog.png" alt="RoastTrace">
      <div><h2>RoastTrace</h2><p>Specialty coffee roast journal for logs, curves, cupping notes, and batch review.</p></div>
    </section>
    <section class="section"><div class="card about-info">
      <div><span>开发者</span><strong>AngImo</strong></div>
      <div><span>邮箱</span><strong>${feedbackEmail}</strong></div>
    </div></section>
    <section class="section feedback-card public-card">
      <div><span class="tag">公开版本 · ${APP_VERSION}</span><h2>扫码打开 RoastTrace</h2><p>这个二维码会打开公开网页版 App。用户可以添加到 iPhone 主屏幕。</p></div>
      <img src="./app-qr.png" alt="RoastTrace public app QR">
      <div class="feedback-actions app-actions">
        <button class="primary link-button" type="button" data-check-update>检查更新</button>
        <button class="secondary link-button" type="button" data-copy-app-link>复制 App 链接</button>
        <a class="secondary link-button" href="${publicRepoUrl}" target="_blank" rel="noopener">查看 GitHub</a>
      </div>
    </section>
    <section class="section feedback-card">
      <div><h2>发送反馈</h2><p>只有开发者能看到你的反馈，其他用户不会看到你的消息。</p></div>
      <img src="./feedback-qr.png" alt="RoastTrace feedback QR">
      <div class="feedback-actions">
        <a class="primary link-button" href="${feedbackUrl}" target="_blank" rel="noopener">打开反馈表单</a>
        <a class="secondary link-button" href="${mail}">邮件联系</a>
      </div>
    </section>`, "about");
}

function render() {
  clearInterval(interval);
  const pages = { home, new: newBatch, manual: manualBatch, live, data: dataLibrary, search, machines, compare, "machine-edit": machineEdit, "bean-edit": beanEdit, "batch-detail": batchDetail, settings, about };
  app.innerHTML = (pages[state.route] || home)();
  translatePage();
  bind();
  if (state.route === "live") interval = setInterval(tick, 1000);
}

function tick() {
  if (!state.active) return;
  document.querySelector("#main-timer")?.replaceChildren(document.createTextNode(fmt(elapsed())), Object.assign(document.createElement("small"), { textContent: runningLabel() }));
  const dev = document.querySelector("#dev-timer");
  if (dev) dev.textContent = fmt(stopwatchElapsed());
  const hint = document.querySelector("#minute-hint");
  if (hint) hint.textContent = minuteHint(elapsed());
  const minutes = document.querySelector('[name="liveMin"]');
  const seconds = document.querySelector('[name="liveSec"]');
  if (minutes && seconds && minutes.dataset.dirty !== "true") {
    [minutes.value, seconds.value] = splitTime(fmt(elapsed()));
  }
}

function startLiveTimer() {
  if (!state.active || state.active.startedAt) return;
  state.active.startedAt = Date.now();
  save(); render(); toast("计时已开始");
}

function readDraft() {
  const form = new FormData(document.querySelector("#draft-form"));
  state.draft = Object.fromEntries(form.entries());
}

function startRoast() {
  readDraft();
  const d = state.draft;
  const m = machine(d.machineId);
  state.active = { id: uid(), ...d, maillardTemp: m.maillardTemp, tempValue: formatControlValue(d.chargeTemp || tempSettings(m).min, m.tempStep || "0.1"), heatStep: m.heatStep || "0.1", airStep: m.airStep || "0.1", heatValue: defaultControlValue(m, "heat"), airValue: defaultControlValue(m, "air"), startedAt: null, stopwatchStartedAt: null, stopwatchSeconds: 0, editingEvent: null, entries: [{ id: uid(), seconds: 0, temperature: d.chargeTemp, event: "投入" }] };
  state.route = "live"; save(); render();
}

function recordTemp(event = "") {
  const input = document.querySelector("#live-temperature");
  const temperature = input?.value || state.active?.tempValue;
  if (!temperature) { toast("先输入当前温度"); input?.focus(); return false; }
  const seconds = readPartsTime({ liveMin: document.querySelector('[name="liveMin"]')?.value, liveSec: document.querySelector('[name="liveSec"]')?.value }, "live");
  if (seconds === null) { toast("请填写记录时间"); return false; }
  state.active.entries.push({ id: uid(), seconds, temperature, event });
  state.active.tempValue = temperature;
  save(); render(); toast(event ? `已记录：${event}` : "已记录温度");
  return true;
}

function recordControl() {
  if (!state.active) return;
  const m = machine(state.active.machineId);
  state.active.heatValue = document.querySelector('[name="heatControl"]')?.value || state.active.heatValue || "";
  state.active.airValue = document.querySelector('[name="airControl"]')?.value || state.active.airValue || "";
  const heat = controlValueLabel(state.active.heatValue, m.heatMode);
  const air = controlValueLabel(state.active.airValue, m.airMode);
  state.active.entries.push({ id: uid(), seconds: liveRecordSeconds(), temperature: "", event: `操作：火力 ${heat} / 风门 ${air}` });
  save(); render(); toast("操作记录已保存");
}

function saveLiveMachineSettings() {
  if (!state.active) return;
  const form = document.querySelector("#live-machine-form");
  if (!form) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const m = machine(state.active.machineId);
  Object.assign(m, data, {
    maillardTemp: Number(data.maillardTemp) || m.maillardTemp,
    tempMin: Number(data.tempMin),
    tempMax: Number(data.tempMax),
    heatMin: Number(data.heatMin),
    heatMax: Number(data.heatMax),
    airMin: Number(data.airMin),
    airMax: Number(data.airMax)
  });
  state.active.maillardTemp = m.maillardTemp;
  state.active.heatStep = m.heatStep || "0.1";
  state.active.airStep = m.airStep || "0.1";
  const temp = tempSettings(m);
  const activeTemp = Math.min(temp.max, Math.max(temp.min, numberValue(state.active.tempValue, temp.min)));
  state.active.tempValue = formatControlValue(activeTemp, temp.step);
  ["heat", "air"].forEach((kind) => {
    const config = controlSettings(m, kind);
    if (config.mode === "free") return;
    const activeValue = Math.min(config.max, Math.max(config.min, numberValue(state.active[`${kind}Value`], config.min)));
    state.active[`${kind}Value`] = formatControlValue(activeValue, state.active[`${kind}Step`]);
  });
  state.showLiveMachineSettings = false;
  save(); render(); toast("烘焙机设置已更新");
}

function recordAnomaly(tag = "") {
  if (!state.active) return;
  const name = String(tag || prompt("记录什么异常？") || "").trim();
  if (!name) return;
  state.active.entries.push({ id: uid(), seconds: liveRecordSeconds(), temperature: "", event: `异常：${name}` });
  save(); render(); toast(`已标记：${name}`);
}

function addAnomalyTag() {
  const name = String(prompt("新增常用问题标签") || "").trim();
  if (!name) return;
  if (!state.anomalyTags.includes(name)) state.anomalyTags.push(name);
  save(); render();
}

function addBatchAnomaly() {
  const batch = state.batches.find((item) => item.id === state.detailBatchId);
  if (!batch) return;
  const name = String(prompt("给这个批次补充什么问题？") || "").trim();
  if (!name) return;
  batch.entries ||= [];
  batch.entries.push({ id: uid(), seconds: batch.duration || 0, temperature: "", event: `异常：${name}` });
  save(); render(); toast("问题已补充");
}

function finish() {
  if (!state.active) return;
  const drop = state.active.entries.find((entry) => entry.event === "出豆");
  const completed = { ...state.active, editingEvent: null, duration: drop?.seconds ?? elapsed(), completedAt: Date.now(), date: normalizedDate(state.active.date || isoToday()) };
  state.batches.push(completed);
  state.detailBatchId = completed.id; state.active = null; state.draft = null; state.route = "batch-detail"; save(); render(); toast("本炉记录已保存到手机");
}

function saveEvent(name) {
  const form = new FormData(document.querySelector("#event-form"));
  const seconds = readPartsTime(Object.fromEntries(form.entries()), "event");
  if (seconds === null) { toast("时间格式请填写为 05:40"); return; }
  const temperature = name.includes("美拉德") ? String(state.active.maillardTemp ?? machine(state.active.machineId).maillardTemp) : String(form.get("temperature") || "").trim();
  const existing = state.active.entries.find((item) => name === "美拉德" ? String(item.event).includes(name) : item.event === name);
  const entry = { id: existing?.id || uid(), seconds, temperature, event: name };
  if (existing) Object.assign(existing, entry);
  else state.active.entries.push(entry);
  state.active.editingEvent = null;
  save();
  if (name === "出豆") finish();
  else { render(); toast(`已记录：${name}`); }
}

function saveBatchSummary(showToast = true) {
  const batch = state.batches.find((item) => item.id === state.detailBatchId);
  if (!batch) return;
  batch.note = document.querySelector("#batch-note")?.value || "";
  batch.summary = document.querySelector("#batch-summary")?.value || "";
  batch.lossRate = document.querySelector("#batch-loss-rate")?.value || "";
  batch.flavorTags = document.querySelector("#batch-flavor")?.value || "";
  batch.cuppingNote = document.querySelector("#batch-cupping")?.value || "";
  save();
  if (showToast) toast("文字总结已保存");
}

function preserveSetup() {
  if (state.route === "manual") {
    state.manualDraft = Object.fromEntries(new FormData(document.querySelector("#manual-form")).entries());
    state.manualRows = currentPaperRows();
    return "manual";
  }
  if (state.route === "new") {
    state.draft = Object.fromEntries(new FormData(document.querySelector("#draft-form")).entries());
    return "new";
  }
  return state.route;
}

function bind() {
  document.querySelectorAll("[data-route]").forEach((el) => el.addEventListener("click", () => {
    if (el.dataset.route === "manual") { state.manualDraft = null; state.manualRows = null; state.editBatchId = null; }
    state.route = el.dataset.route; save(); render();
  }));
  document.querySelector("[data-back]")?.addEventListener("click", () => { state.route = state.returnRoute || (state.route === "machine-edit" ? "machines" : state.route === "bean-edit" ? "search" : state.route === "compare" ? "data" : state.route === "about" ? "settings" : "home"); state.returnRoute = null; save(); render(); });
  bindTimeInputs();
  document.querySelector('[name="date"]')?.addEventListener("change", (e) => {
    const display = e.target.closest(".date-control")?.querySelector("[data-date-display]");
    if (display) display.textContent = displayDate(e.target.value);
    const roastNo = document.querySelector('[name="roastNo"]');
    if (roastNo) roastNo.value = String(nextRoastNo(e.target.value));
  });
  document.querySelectorAll("[data-start]").forEach((el) => el.addEventListener("click", startRoast));
  document.querySelector("[data-toggle-roast-timer]")?.addEventListener("click", startLiveTimer);
  document.querySelector("[data-record-temp]")?.addEventListener("click", () => recordTemp());
  document.querySelector("#live-temperature")?.addEventListener("keydown", (e) => { if (e.key === "Enter") recordTemp(); });
  document.querySelector("[data-temp-slider]")?.addEventListener("input", (e) => {
    if (!state.active) return;
    const step = machine(state.active.machineId).tempStep || "0.1";
    state.active.tempValue = formatControlValue(e.target.value, step);
    const output = document.querySelector("[data-temp-output]");
    if (output) output.textContent = state.active.tempValue;
    save();
  });
  document.querySelector("[data-record-control]")?.addEventListener("click", recordControl);
  document.querySelector("[data-open-live-machine-settings]")?.addEventListener("click", () => { state.showLiveMachineSettings = true; save(); render(); });
  document.querySelectorAll("[data-close-live-machine-settings]").forEach((el) => el.addEventListener("click", () => { state.showLiveMachineSettings = false; save(); render(); }));
  document.querySelector("[data-save-live-machine-settings]")?.addEventListener("click", saveLiveMachineSettings);
  document.querySelectorAll('[name="heatControl"], [name="airControl"]').forEach((input) => input.addEventListener("input", (e) => {
    if (!state.active) return;
    const kind = e.currentTarget.name === "heatControl" ? "heat" : "air";
    const step = state.active[`${kind}Step`] || machine(state.active.machineId)[`${kind}Step`] || "0.1";
    const value = e.currentTarget.type === "range" ? formatControlValue(e.currentTarget.value, step) : e.currentTarget.value;
    state.active[`${kind}Value`] = value;
    const output = document.querySelector(`[data-control-output="${kind}"]`);
    if (output) output.textContent = value;
    save();
  }));
  document.querySelectorAll("[data-control-step]").forEach((el) => el.addEventListener("click", () => {
    const kind = el.dataset.controlStep;
    const step = el.dataset.step;
    const value = formatControlValue(state.active[`${kind}Value`] ?? defaultControlValue(machine(state.active.machineId), kind), step);
    state.active[`${kind}Step`] = step;
    state.active[`${kind}Value`] = value;
    save(); render();
  }));
  document.querySelectorAll("[data-anomaly]").forEach((el) => el.addEventListener("click", () => recordAnomaly(el.dataset.anomaly)));
  document.querySelector("[data-quick-anomaly]")?.addEventListener("click", () => recordAnomaly());
  document.querySelector("[data-add-anomaly-tag]")?.addEventListener("click", addAnomalyTag);
  document.querySelectorAll("[data-delete-anomaly-tag]").forEach((el) => el.addEventListener("click", () => {
    state.anomalyTags = state.anomalyTags.filter((tag) => tag !== el.dataset.deleteAnomalyTag);
    save(); render();
  }));
  document.querySelectorAll('[name="liveMin"], [name="liveSec"]').forEach((input) => input.addEventListener("input", () => { document.querySelector('[name="liveMin"]').dataset.dirty = "true"; }));
  document.querySelector("[data-round-minute]")?.addEventListener("click", () => {
    const minutes = document.querySelector('[name="liveMin"]'), seconds = document.querySelector('[name="liveSec"]');
    if (!minutes || !seconds) return;
    [minutes.value, seconds.value] = splitTime(fmt(Math.floor(elapsed() / 60) * 60)); minutes.dataset.dirty = "true"; minutes.focus();
  });
  document.querySelector("[data-live-bean]")?.addEventListener("change", (e) => { state.active.beanId = e.target.value; save(); render(); });
  document.querySelector("[data-live-machine]")?.addEventListener("change", (e) => {
    const m = machine(e.target.value);
    state.active.machineId = e.target.value;
    state.active.maillardTemp = m.maillardTemp;
    state.active.heatStep = m.heatStep || "0.1";
    state.active.airStep = m.airStep || "0.1";
    state.active.tempValue = formatControlValue(state.active.tempValue || state.active.chargeTemp || tempSettings(m).min, m.tempStep || "0.1");
    state.active.heatValue = defaultControlValue(m, "heat");
    state.active.airValue = defaultControlValue(m, "air");
    save(); render();
  });
  document.querySelector("[data-live-maillard-temp]")?.addEventListener("input", (e) => { state.active.maillardTemp = Number(e.target.value) || machine(state.active.machineId).maillardTemp; save(); });
  document.querySelector("[data-live-maillard-temp]")?.addEventListener("change", () => render());
  document.querySelectorAll("[data-open-event]").forEach((el) => el.addEventListener("click", () => { state.active.editingEvent = el.dataset.openEvent; save(); render(); }));
  document.querySelector("[data-close-event]")?.addEventListener("click", () => { state.active.editingEvent = null; save(); render(); });
  document.querySelector("[data-save-event]")?.addEventListener("click", (e) => saveEvent(e.currentTarget.dataset.saveEvent));
  document.querySelector("[data-stopwatch]")?.addEventListener("click", () => {
    if (state.active.stopwatchStartedAt) { state.active.stopwatchSeconds = stopwatchElapsed(); state.active.stopwatchStartedAt = null; }
    else state.active.stopwatchStartedAt = Date.now();
    save(); render();
  });
  document.querySelector("[data-finish]")?.addEventListener("click", () => { state.active.editingEvent = "出豆"; save(); render(); });
  document.querySelector("[data-fill-minute]")?.addEventListener("click", () => {
    const minutes = document.querySelector('[name="liveMin"]'), seconds = document.querySelector('[name="liveSec"]');
    if (minutes && seconds) { [minutes.value, seconds.value] = splitTime(fmt(Math.floor(elapsed() / 60) * 60)); minutes.dataset.dirty = "true"; }
    document.querySelector("#live-temperature")?.focus(); toast(`准备补记 ${minutes?.value || "00"}:${seconds?.value || "00"} 的温度`);
  });
  document.querySelectorAll("[data-delete-entry]").forEach((el) => el.addEventListener("click", () => { state.active.entries = state.active.entries.filter((x) => x.id !== el.dataset.deleteEntry); save(); render(); }));
  document.querySelectorAll("[data-batch-detail]").forEach((el) => el.addEventListener("click", () => { state.detailBatchId = el.dataset.batchDetail; state.route = "batch-detail"; save(); render(); }));
  document.querySelectorAll("[data-delete-batch]").forEach((el) => el.addEventListener("click", () => { if (!confirm("确定删除这个批次吗？")) return; state.batches = state.batches.filter((batch) => batch.id !== el.dataset.deleteBatch); save(); render(); toast("批次已删除"); }));
  document.querySelectorAll("[data-folder-filter]").forEach((el) => el.addEventListener("click", () => { state.homeFolder = el.dataset.folderFilter; save(); render(); }));
  document.querySelector("[data-add-folder]")?.addEventListener("click", () => { const name = prompt("新文件夹名称"); if (!name?.trim()) return; if (!state.folders.includes(name.trim())) state.folders.push(name.trim()); state.homeFolder = name.trim(); save(); render(); });
  document.querySelector("[data-delete-folder]")?.addEventListener("click", (e) => { const name = e.currentTarget.dataset.deleteFolder; if (!confirm(`删除文件夹“${name}”吗？里面的批次会移到“未分类”。`)) return; state.folders = state.folders.filter((folder) => folder !== name); state.batches.forEach((batch) => { if (batch.folder === name) batch.folder = "未分类"; }); state.homeFolder = "全部"; save(); render(); });
  document.querySelectorAll("[data-manual-save]").forEach((el) => el.addEventListener("click", saveManualBatch));
  document.querySelector("[data-add-paper-row]")?.addEventListener("click", () => { const rows = currentPaperRows(); rows.push({ seconds: (rows.at(-1)?.seconds ?? -60) + 60, temperature: "", event: "" }); renderPaperRows(rows); bindPaperTable(); });
  bindPaperTable();
  document.querySelectorAll("[data-paper-photo]").forEach((input) => input.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    const preview = document.querySelector("#paper-preview");
    if (!file || !preview) return;
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="纸张记录预览"><p class="subtle">照片仅用于当前页面辅助录入，不会上传网络。</p>`;
  }));
  document.querySelector("#csv-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const temperatures = csvToTemperatureText(await file.text());
    const entries = parsePaperEntries(temperatures);
    if (!entries.length) { toast("没有识别到有效的时间与温度列"); return; }
    renderPaperRows(entries); bindPaperTable(); toast("CSV 已导入，请检查后保存");
  });
  const manualMachineSelect = document.querySelector('[name="machineId"]');
  const syncManualMachine = (e) => {
    if (state.route !== "manual") return;
    state.manualDraft = Object.fromEntries(new FormData(document.querySelector("#manual-form")).entries());
    state.manualRows = currentPaperRows(); state.manualDraft.machineId = e.target.value; state.manualDraft.maillardTemp = String(machine(e.target.value).maillardTemp); save(); render();
  };
  manualMachineSelect?.addEventListener("input", syncManualMachine);
  manualMachineSelect?.addEventListener("change", syncManualMachine);
  document.querySelector("[data-edit-batch]")?.addEventListener("click", (e) => {
    const batch = state.batches.find((item) => item.id === e.currentTarget.dataset.editBatch);
    if (!batch) return;
    const draft = { ...batch };
    [["low", "最低温度"], ["maillard", "美拉德"], ["crack", "一爆"], ["drop", "出豆"]].forEach(([key, label]) => {
      const entry = (batch.entries || []).find((item) => label === "美拉德" ? String(item.event).includes(label) : item.event === label);
      if (!entry) return;
      [draft[`${key}Min`], draft[`${key}Sec`]] = splitTime(fmt(entry.seconds));
      draft[`${key}Temp`] = entry.temperature || "";
    });
    state.editBatchId = batch.id; state.manualDraft = draft; state.manualRows = (batch.entries || []).filter((entry) => !entry.event).filter((entry) => Number(entry.seconds) > 0); state.route = "manual"; save(); render();
  });
  document.querySelector("[data-save-summary]")?.addEventListener("click", () => saveBatchSummary());
  document.querySelector("[data-add-batch-anomaly]")?.addEventListener("click", addBatchAnomaly);
  document.querySelector("[data-batch-folder]")?.addEventListener("change", (e) => { const batch = state.batches.find((item) => item.id === state.detailBatchId); if (!batch) return; batch.folder = e.target.value; save(); toast("批次文件夹已更新"); });
  document.querySelectorAll("[data-print]").forEach((el) => el.addEventListener("click", () => { saveBatchSummary(false); render(); setTimeout(() => window.print(), 0); }));
  document.querySelector("[data-export-csv]")?.addEventListener("click", exportBatchCsv);
  document.querySelector("[data-export-backup]")?.addEventListener("click", exportBackup);
  document.querySelector("[data-import-backup]")?.addEventListener("click", () => document.querySelector("[data-import-backup-file]")?.click());
  document.querySelector("[data-import-backup-file]")?.addEventListener("change", importBackup);
  document.querySelector("[data-check-update]")?.addEventListener("click", checkForUpdate);
  document.querySelector("[data-copy-app-link]")?.addEventListener("click", copyAppLink);
  document.querySelector("#search-input")?.addEventListener("input", (e) => { state.search = e.target.value; save(); render(); document.querySelector("#search-input")?.focus(); });
  document.querySelectorAll("[data-bean-view]").forEach((el) => el.addEventListener("click", () => { state.beanView = el.dataset.beanView; save(); render(); }));
  document.querySelector("[data-add-bean]")?.addEventListener("click", () => { state.editBeanId = null; state.returnRoute = "search"; state.route = "bean-edit"; save(); render(); });
  document.querySelector("[data-quick-bean]")?.addEventListener("click", () => { state.returnRoute = preserveSetup(); state.editBeanId = null; state.route = "bean-edit"; save(); render(); });
  document.querySelector("[data-quick-machine]")?.addEventListener("click", () => { state.returnRoute = preserveSetup(); const m = { id: uid(), name: "新烘焙机", maillardTemp: 165, maillardMode: "temperature", tempMin: 80, tempMax: 240, tempStep: "0.1", heatMode: "number", heatMin: 0, heatMax: 5, heatStep: "0.1", airMode: "number", airMin: 0, airMax: 5, airStep: "0.1" }; state.machines.push(m); if (state.returnRoute === "manual") state.manualDraft.machineId = m.id; if (state.returnRoute === "new") state.draft.machineId = m.id; state.editMachineId = m.id; state.route = "machine-edit"; save(); render(); });
  document.querySelectorAll("[data-bean-edit]").forEach((el) => el.addEventListener("click", () => { state.editBeanId = el.dataset.beanEdit; state.route = "bean-edit"; save(); render(); }));
  document.querySelectorAll("[data-delete-bean]").forEach((el) => el.addEventListener("click", () => { const id = el.dataset.deleteBean; if (state.batches.some((batch) => batch.beanId === id)) { toast("已有批次引用该豆子，暂不能删除"); return; } if (!confirm("确定删除这个咖啡豆档案吗？")) return; state.beans = state.beans.filter((item) => item.id !== id); save(); render(); }));
  document.querySelector("[data-bean-save]")?.addEventListener("click", () => {
    const data = Object.fromEntries(new FormData(document.querySelector("#bean-form")).entries());
    if (!data.name.trim()) { toast("请先填写档案名称"); return; }
    if (state.editBeanId) Object.assign(bean(state.editBeanId), data);
    else {
      state.beans.push({ id: state.beanDraft.id, ...data });
      if (state.returnRoute === "manual" && state.manualDraft) state.manualDraft.beanId = state.beanDraft.id;
      if (state.returnRoute === "new" && state.draft) state.draft.beanId = state.beanDraft.id;
    }
    state.beanDraft = null; state.editBeanId = null; state.route = state.returnRoute || "search"; state.returnRoute = null; save(); render(); toast("咖啡豆档案已保存");
  });
  document.querySelectorAll("[data-machine-edit]").forEach((el) => el.addEventListener("click", () => { state.editMachineId = el.dataset.machineEdit; state.route = "machine-edit"; save(); render(); }));
  document.querySelector("[data-machine-new]")?.addEventListener("click", () => { const m = { id: uid(), name: "新烘焙机", maillardTemp: 165, maillardMode: "temperature", tempMin: 80, tempMax: 240, tempStep: "0.1", heatMode: "number", heatMin: 0, heatMax: 5, heatStep: "0.1", airMode: "number", airMin: 0, airMax: 5, airStep: "0.1" }; state.machines.push(m); state.editMachineId = m.id; state.route = "machine-edit"; save(); render(); });
  document.querySelectorAll("[data-delete-machine]").forEach((el) => el.addEventListener("click", () => { const id = el.dataset.deleteMachine; if (state.machines.length === 1) { toast("至少保留一台烘焙机"); return; } if (state.batches.some((batch) => batch.machineId === id)) { toast("已有批次引用该机器，暂不能删除"); return; } if (!confirm("确定删除这台烘焙机吗？")) return; state.machines = state.machines.filter((item) => item.id !== id); save(); render(); }));
  document.querySelector("[data-machine-save]")?.addEventListener("click", () => {
    const data = Object.fromEntries(new FormData(document.querySelector("#machine-form")).entries());
    Object.assign(machine(state.editMachineId), data, { maillardTemp: Number(data.maillardTemp), tempMin: Number(data.tempMin), tempMax: Number(data.tempMax), heatMin: Number(data.heatMin), heatMax: Number(data.heatMax), airMin: Number(data.airMin), airMax: Number(data.airMax) });
    state.route = state.returnRoute || "machines"; state.returnRoute = null; save(); render(); toast("烘焙机规则已保存");
  });
  document.querySelector('[name="language"]')?.addEventListener("change", (e) => { state.language = e.target.value; save(); render(); toast("语言偏好已保存"); });
  document.querySelector('[name="dataSort"]')?.addEventListener("change", (e) => { state.dataSort = e.target.value; save(); render(); });
  document.querySelectorAll("[data-data-group]").forEach((el) => el.addEventListener("click", () => { state.dataGroup = el.dataset.dataGroup; state.dataFolder = null; save(); render(); }));
  document.querySelectorAll("[data-data-folder]").forEach((el) => el.addEventListener("click", () => { state.dataFolder = el.dataset.dataFolder; save(); render(); }));
  document.querySelector('[name="compareA"]')?.addEventListener("change", (e) => { state.compareA = e.target.value; save(); render(); });
  document.querySelector('[name="compareB"]')?.addEventListener("change", (e) => { state.compareB = e.target.value; save(); render(); });
}

setupAnalytics();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js?v=50");
render();
