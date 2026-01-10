import React, { useState, useMemo, useEffect } from "react";
import {
  Clock,
  TrendingUp,
  Calendar,
  Download,
  Moon,
  Sun,
  Save,
  Upload,
  Target,
  Info,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

// --- CONFIGURATION & CONSTANTS ---
const WAT_OFFSET_MINUTES = 60;
const SLOT_LENGTH_MIN = 80;
const DAY_START_WAT_HOUR = 9; // 9 AM WAT is the anchor

const SCHEDULE = [
  {
    slot: 1,
    time: "9:00 AM",
    geo: "AU/NZ",
    priority: "BLUE",
    emoji: "🔵",
    expectation: "High CPM",
    weight: 1.0,
  },
  {
    slot: 2,
    time: "10:20 AM",
    geo: "AU/NZ",
    priority: "BLUE",
    emoji: "🔵",
    expectation: "High CPM",
    weight: 1.0,
  },
  {
    slot: 3,
    time: "11:40 AM",
    geo: "Mixed",
    priority: "YELLOW",
    emoji: "🟡",
    expectation: "Transition",
    weight: 0.9,
  },
  {
    slot: 4,
    time: "1:00 PM",
    geo: "ID/PH/IN",
    priority: "GREEN",
    emoji: "🟢",
    expectation: "Volume Only",
    weight: 0.6,
  },
  {
    slot: 5,
    time: "2:20 PM",
    geo: "ID/PH/IN",
    priority: "GREEN",
    emoji: "🟢",
    expectation: "Volume Only",
    weight: 0.6,
  },
  {
    slot: 6,
    time: "3:40 PM",
    geo: "ID/PH/IN",
    priority: "GREEN",
    emoji: "🟢",
    expectation: "Volume Only",
    weight: 0.6,
  },
  {
    slot: 7,
    time: "5:00 PM",
    geo: "UK/EU",
    priority: "BLUE",
    emoji: "🔵",
    expectation: "High CPM",
    weight: 1.0,
  },
  {
    slot: 8,
    time: "6:20 PM",
    geo: "UK/EU",
    priority: "BLUE",
    emoji: "🔵",
    expectation: "High CPM",
    weight: 1.0,
  },
  {
    slot: 9,
    time: "7:40 PM",
    geo: "UK/EU",
    priority: "BLUE",
    emoji: "🔵",
    expectation: "High CPM",
    weight: 1.0,
  },
  {
    slot: 10,
    time: "9:00 PM",
    geo: "UK/EU",
    priority: "BLUE",
    emoji: "🔵",
    expectation: "High CPM",
    weight: 1.0,
  },
  {
    slot: 11,
    time: "10:20 PM",
    geo: "US Seeding",
    priority: "YELLOW",
    emoji: "🟡",
    expectation: "Prep",
    weight: 0.9,
  },
  {
    slot: 12,
    time: "11:40 PM",
    geo: "US Seeding",
    priority: "YELLOW",
    emoji: "🟡",
    expectation: "Prep",
    weight: 0.9,
  },
  {
    slot: 13,
    time: "1:00 AM",
    geo: "US Growing",
    priority: "YELLOW",
    emoji: "🟡",
    expectation: "Rising",
    weight: 0.9,
  },
  {
    slot: 14,
    time: "2:20 AM",
    geo: "US Strong",
    priority: "BLUE",
    emoji: "🔵",
    expectation: "High",
    weight: 1.0,
  },
  {
    slot: 15,
    time: "3:40 AM",
    geo: "US PRIME",
    priority: "RED",
    emoji: "🔴",
    expectation: "MAX MONEY",
    weight: 1.6,
  },
  {
    slot: 16,
    time: "5:00 AM",
    geo: "US PRIME",
    priority: "RED",
    emoji: "🔴",
    expectation: "MAX MONEY",
    weight: 1.6,
  },
  {
    slot: 17,
    time: "6:20 AM",
    geo: "US PRIME",
    priority: "RED",
    emoji: "🔴",
    expectation: "MAX MONEY",
    weight: 1.6,
  },
  {
    slot: 18,
    time: "7:40 AM",
    geo: "Low/Taper",
    priority: "GREEN",
    emoji: "🟢",
    expectation: "Filler",
    weight: 0.6,
  },
];

const BENCHMARKS = [
  { min: 0, max: 15, label: "Bad Day", emoji: "❌", color: "text-red-500" },
  {
    min: 15,
    max: 35,
    label: "Standard",
    emoji: "⚠️",
    color: "text-orange-400",
  },
  {
    min: 35,
    max: 50,
    label: "Good Day",
    emoji: "✅",
    color: "text-emerald-500",
  },
  {
    min: 50,
    max: 75,
    label: "Strong Day",
    emoji: "💪",
    color: "text-blue-500",
  },
  {
    min: 75,
    max: Infinity,
    label: "Exceptional",
    emoji: "🔥",
    color: "text-purple-500",
  },
];

// --- UTILITIES ---

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const t = timeStr.trim().toUpperCase();
  // Match 12h formats: 9:00 AM, 9 AM, 9:05PM etc.
  const ampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || 0);
    if (ampm[3] === "PM" && h !== 12) h += 12;
    if (ampm[3] === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  // Match 24h formats: 09:00, 21:05
  const h24 = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (h24) {
    const h = Number(h24[1]);
    const m = Number(h24[2] || 0);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return h * 60 + m;
  }
  return null;
}

/**
 * Normalizes any local time to its 24-hour minutes in WAT (UTC+1)
 */
function getWATMinutes(date = new Date()) {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMinutes + WAT_OFFSET_MINUTES + 1440) % 1440;
}

/**
 * Maps WAT minutes to the corresponding slot index (1-18)
 * based on the 09:00 start rule.
 */
function mapMinutesToSlot(watMinutes) {
  // Translate minutes so that 9:00 AM (540 mins) is 0
  let relativeMins = (watMinutes - 540 + 1440) % 1440;
  let slotIndex = Math.floor(relativeMins / SLOT_LENGTH_MIN) + 1;
  return Math.min(Math.max(slotIndex, 1), 18);
}

function getCPADayKey(date = new Date()) {
  const watNow = new Date(
    date.getTime() +
      (WAT_OFFSET_MINUTES - date.getTimezoneOffset() * -1) * 60000
  );
  // If it's before 9 AM WAT, it belongs to the previous calendar day in CPA terms
  if (watNow.getHours() < DAY_START_WAT_HOUR)
    watNow.setDate(watNow.getDate() - 1);
  const y = watNow.getFullYear();
  const m = String(watNow.getMonth() + 1).padStart(2, "0");
  const d = String(watNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- APP COMPONENT ---

export default function CPATrackerApp() {
  // State
  const [timeMode, setTimeMode] = useState("auto"); // 'auto' or 'manual'
  const [manualTime, setManualTime] = useState("");
  const [revenueSoFar, setRevenueSoFar] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(35); // Default to Net-7 threshold
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("cpa:theme") === "dark" ||
        (!localStorage.getItem("cpa:theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });
  const [view, setView] = useState("tracker"); // 'tracker', 'schedule', 'settings'
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Persistence
  useEffect(() => {
    const dayKey = getCPADayKey(currentTime);
    const saved = localStorage.getItem(`cpa:daily:${dayKey}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setRevenueSoFar(parsed.revenueSoFar || 0);
      if (parsed.dailyGoal) setDailyGoal(parsed.dailyGoal);
    }
  }, []);

  useEffect(() => {
    const dayKey = getCPADayKey(currentTime);
    localStorage.setItem(
      `cpa:daily:${dayKey}`,
      JSON.stringify({ revenueSoFar, dailyGoal })
    );
  }, [revenueSoFar, dailyGoal, currentTime]);

  useEffect(() => {
    localStorage.setItem("cpa:theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Computed Values
  const activeWATMinutes = useMemo(() => {
    if (timeMode === "auto") return getWATMinutes(currentTime);
    const parsed = parseTimeToMinutes(manualTime);
    return parsed !== null ? parsed : getWATMinutes(currentTime);
  }, [timeMode, manualTime, currentTime]);

  const slotsCompleted = useMemo(
    () => mapMinutesToSlot(activeWATMinutes),
    [activeWATMinutes]
  );

  const currentSlotData = useMemo(
    () => SCHEDULE[slotsCompleted - 1],
    [slotsCompleted]
  );

  const totalPossibleWeight = useMemo(
    () => SCHEDULE.reduce((acc, s) => acc + s.weight, 0),
    []
  );

  const metrics = useMemo(() => {
    const completedArr = SCHEDULE.slice(0, slotsCompleted);
    const weightCompleted = completedArr.reduce((acc, s) => acc + s.weight, 0);
    const remainingWeight = totalPossibleWeight - weightCompleted;

    const linearProjection = (revenueSoFar / slotsCompleted) * 18;
    const revPerWeight =
      weightCompleted > 0 ? revenueSoFar / weightCompleted : 0;
    const weightedProjection = revenueSoFar + revPerWeight * remainingWeight;

    const redsRemaining = SCHEDULE.slice(slotsCompleted).filter(
      (s) => s.priority === "RED"
    ).length;
    const benchmark =
      BENCHMARKS.find(
        (b) => weightedProjection >= b.min && weightedProjection < b.max
      ) || BENCHMARKS[0];

    const goalProgress = Math.min((revenueSoFar / dailyGoal) * 100, 100);

    return {
      linear: linearProjection || 0,
      weighted: weightedProjection || 0,
      redsRemaining,
      benchmark,
      goalProgress,
      confidence:
        slotsCompleted > 12 ? "High" : slotsCompleted > 6 ? "Medium" : "Low",
    };
  }, [slotsCompleted, revenueSoFar, totalPossibleWeight, dailyGoal]);

  // Handlers
  const handleExport = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("cpa:")) data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cpa_tracker_backup_${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        Object.keys(data).forEach((key) =>
          localStorage.setItem(key, data[key])
        );
        window.location.reload();
      } catch (err) {
        alert("Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  // --- UI COMPONENTS ---

  const Header = () => (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
          <Clock className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">
            CPA Revenue Tracker
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • {getCPADayKey(currentTime)}
          </p>
        </div>
      </div>
      <nav className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setView("tracker")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "tracker"
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          Tracker
        </button>
        <button
          onClick={() => setView("schedule")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "schedule"
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          Schedule
        </button>
        <button
          onClick={() => setView("settings")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "settings"
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          Settings
        </button>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    </header>
  );

  const TrackerView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left Column: Input & Goal */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Revenue Input */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-blue-600" size={18} />
            <h3 className="font-bold dark:text-white">Current Revenue</h3>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={revenueSoFar || ""}
              onChange={(e) => setRevenueSoFar(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-8 pr-4 text-2xl font-bold dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="text-emerald-500" size={18} />
              <h3 className="font-bold dark:text-white">Daily Goal</h3>
            </div>
            <span className="text-sm font-bold text-emerald-500">
              ${dailyGoal}
            </span>
          </div>
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${metrics.goalProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {metrics.goalProgress >= 100
              ? "Goal Crushed! 🚀"
              : `Keep going! ${Math.round(100 - metrics.goalProgress)}% to go.`}
          </p>
        </div>

        {/* Time Detection Info */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div
              className={`mt-1 p-2 rounded-lg ${
                currentSlotData.priority === "RED"
                  ? "bg-red-100 text-red-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              <Info size={16} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                Active Slot: {currentSlotData.time}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Currently tracking <b>{currentSlotData.geo}</b> (
                {currentSlotData.expectation}). This is a{" "}
                <b>{currentSlotData.priority}</b> slot.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Column: Projections */}
      <div className="lg:col-span-8 space-y-6">
        {/* Prime Status Card */}
        <div
          className={`rounded-3xl p-8 border transition-all duration-300 ${
            currentSlotData.priority === "RED"
              ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50"
              : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded ${
                    currentSlotData.priority === "RED"
                      ? "bg-red-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {currentSlotData.priority} Status
                </span>
              </div>
              <h2
                className={`text-4xl font-black mb-2 ${
                  currentSlotData.priority === "RED"
                    ? "text-red-700 dark:text-red-400"
                    : "text-blue-700 dark:text-blue-400"
                }`}
              >
                ${metrics.weighted.toFixed(2)}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                Weighted Projection for Today
              </p>
            </div>
            <div className="text-center md:text-right">
              <div className={`text-5xl mb-2`}>{metrics.benchmark.emoji}</div>
              <p className={`text-xl font-black ${metrics.benchmark.color}`}>
                {metrics.benchmark.label}
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              Linear Pace
            </h4>
            <div className="text-2xl font-bold dark:text-white">
              ${metrics.linear.toFixed(2)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              Confidence
            </h4>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  metrics.confidence === "High"
                    ? "bg-emerald-500"
                    : metrics.confidence === "Medium"
                    ? "bg-orange-400"
                    : "bg-red-500"
                }`}
              />
              <span className="text-2xl font-bold dark:text-white capitalize">
                {metrics.confidence}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Alerts */}
        <div className="space-y-3">
          {metrics.redsRemaining > 0 ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-center gap-4">
              <AlertTriangle className="text-amber-600" size={20} />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {metrics.redsRemaining} RED slots still ahead. Huge upside
                potential if you post strong now.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <CheckCircle className="text-slate-400" size={20} />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                All RED slots completed. Focus on volume and maintenance for the
                rest of the day.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ScheduleView = () => (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-bold dark:text-white">Daily Rotation Schedule</h3>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <Download size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50">
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Time (WAT)
              </th>
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Target
              </th>
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Expectation
              </th>
            </tr>
          </thead>
          <tbody>
            {SCHEDULE.map((s, idx) => (
              <tr
                key={s.slot}
                className={`border-b border-slate-100 dark:border-slate-700 last:border-0 ${
                  s.slot === slotsCompleted
                    ? "bg-blue-50/50 dark:bg-blue-900/10"
                    : ""
                }`}
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span>{s.emoji}</span>
                    {s.slot === slotsCompleted && (
                      <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className={`p-4 font-mono text-sm ${
                    s.slot === slotsCompleted
                      ? "font-bold text-blue-600"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {s.time}
                </td>
                <td className="p-4 text-slate-800 dark:text-slate-200 font-semibold">
                  {s.geo}
                </td>
                <td className="p-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter ${
                      s.priority === "RED"
                        ? "bg-red-100 text-red-600"
                        : s.priority === "BLUE"
                        ? "bg-blue-100 text-blue-600"
                        : s.priority === "YELLOW"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {s.expectation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-black mb-6 dark:text-white">
          App Configurations
        </h3>

        <div className="space-y-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Time Detection Mode
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <button
                onClick={() => setTimeMode("auto")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  timeMode === "auto"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600"
                    : "text-slate-500"
                }`}
              >
                System Auto (System Time)
              </button>
              <button
                onClick={() => setTimeMode("manual")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  timeMode === "manual"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600"
                    : "text-slate-500"
                }`}
              >
                Time Override
              </button>
            </div>
            {timeMode === "manual" && (
              <input
                type="text"
                placeholder="e.g., 3:40 PM"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                className="mt-3 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Daily Revenue Goal ($)
            </label>
            <input
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
            />
            <p className="mt-2 text-xs text-slate-500">
              Note: Net-7 requires ~$35/day, Net-15 requires ~$15/day.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-700 space-y-4">
            <h4 className="font-bold dark:text-white">Data Management</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Save size={18} /> Backup Data
              </button>
              <label className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all cursor-pointer">
                <Upload size={18} /> Restore Data
                <input
                  type="file"
                  onChange={handleImport}
                  className="hidden"
                  accept=".json"
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
              Data resides in LocalStorage ONLY
            </p>
          </div>
        </div>
      </div>

      {/* PWA Structural Stub (Hidden) */}
      <div id="pwa-metadata" className="hidden" data-manifest-ready="true">
        {/* Placeholder for future manifest and service worker injection */}
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDarkMode ? "bg-slate-950" : "bg-slate-50"
      }`}
    >
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Header />
        <main>
          {view === "tracker" && <TrackerView />}
          {view === "schedule" && <ScheduleView />}
          {view === "settings" && <SettingsView />}
        </main>

        <footer className="mt-12 py-8 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm font-bold text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1">
            <Clock size={14} /> Synced to CPA Day Cycle (9:00 AM WAT Anchor)
          </p>
        </footer>
      </div>

      <style jsx>{`
        /* Minimal CSS Transitions for visual feedback without bloat */
        .animate-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
