import React, { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
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
  Bell,
  History,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BellOff,
  Settings,
  ChevronDown,
  ChevronUp,
  PieChart,
  Activity,
  BarChart2,
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
  const ampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || 0);
    if (ampm[3] === "PM" && h !== 12) h += 12;
    if (ampm[3] === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const h24 = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (h24) {
    const h = Number(h24[1]);
    const m = Number(h24[2] || 0);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return h * 60 + m;
  }
  return null;
}

function getWATMinutes(date = new Date()) {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMinutes + WAT_OFFSET_MINUTES + 1440) % 1440;
}

function mapMinutesToSlot(watMinutes) {
  let relativeMins = (watMinutes - 540 + 1440) % 1440;
  let slotIndex = Math.floor(relativeMins / SLOT_LENGTH_MIN) + 1;
  return Math.min(Math.max(slotIndex, 1), 18);
}

function getCPADayKey(date = new Date()) {
  const watNow = new Date(
    date.getTime() +
      (WAT_OFFSET_MINUTES - date.getTimezoneOffset() * -1) * 60000
  );
  if (watNow.getHours() < DAY_START_WAT_HOUR)
    watNow.setDate(watNow.getDate() - 1);
  const y = watNow.getFullYear();
  const m = String(watNow.getMonth() + 1).padStart(2, "0");
  const d = String(watNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function generateICS(history) {
  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CPA Tracker//NONSGML v1.0//EN",
  ];

  Object.entries(history).forEach(([date, stats]) => {
    ics.push("BEGIN:VEVENT");
    ics.push(`DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`);
    ics.push(`SUMMARY:CPA Revenue: $${stats.revenue}`);
    ics.push(
      `DESCRIPTION:Goal: $${stats.goal} | Slots: ${
        stats.slots
      } | Projection: $${stats.weighted.toFixed(2)} | Status: ${stats.status}`
    );
    ics.push("END:VEVENT");
  });

  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

function formatTimeAgo(date) {
  if (!date) return "never";
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1m ago";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1d ago";
  if (diffDays === 1) return "1d ago";
  return `${diffDays}d ago`;
}

function formatPST(date) {
  return date.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// --- ERROR BOUNDARY COMPONENT ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999] bg-[#020617] flex items-center justify-center p-6 text-center">
          <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-red-500/20 max-w-md w-full">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black italic text-red-500 mb-2">
              Mission Critical Error
            </h2>
            <p className="text-xs text-slate-400 mb-8 leading-relaxed">
              System monitoring detected a fatal crash in the visual core.
              {this.state.error && (
                <span className="block mt-2 font-mono text-[10px] bg-black/40 p-2 rounded text-red-400">
                  {this.state.error.toString()}
                </span>
              )}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-red-500 hover:bg-red-400 text-white font-black italic py-4 rounded-xl transition-all shadow-lg shadow-red-500/20 uppercase tracking-widest text-xs"
            >
              Emergency Factory Reset
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- SVG CHART COMPONENTS ---

function MiniLineChart({ data, width = 280, height = 100, color = "#06b6d4" }) {
  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 40) + 20; // Added left padding for axis
    const y = height - 20 - ((d.value - minVal) / range) * (height - 30);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid Lines */}
      <line
        x1="20"
        y1={height - 20}
        x2={width}
        y2={height - 20}
        stroke="var(--card-border)"
        strokeWidth="1"
      />
      <line
        x1="20"
        y1="10"
        x2={20}
        y2={height - 20}
        stroke="var(--card-border)"
        strokeWidth="1"
      />

      {/* Area Fill */}
      <polygon
        points={`20,${height - 20} ${points.join(" ")} ${width},${height - 20}`}
        fill="url(#lineGradient)"
      />

      {/* Line Path */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Axis Labels */}
      <text
        x="5"
        y={height - 20}
        fontSize="10"
        fill="#94a3b8"
        fontWeight="bold"
      >
        ${minVal.toFixed(0)}
      </text>
      <text x="5" y="15" fontSize="10" fill="#94a3b8" fontWeight="bold">
        ${maxVal.toFixed(0)}
      </text>
      <text
        x="20"
        y={height - 5}
        fontSize="10"
        fill="#94a3b8"
        fontWeight="bold"
      >
        Start
      </text>
      <text
        x={width - 25}
        y={height - 5}
        fontSize="10"
        fill="#94a3b8"
        fontWeight="bold"
      >
        Now
      </text>

      {/* Data Points */}
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 40) + 20;
        const y = height - 20 - ((d.value - minVal) / range) * (height - 30);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill={color}
            className="opacity-70"
          />
        );
      })}
    </svg>
  );
}

function MiniPieChart({ data, size = 120 }) {
  if (!data || data.length === 0)
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center border-2 border-dashed border-[var(--card-border)] rounded-full opacity-30"
      >
        <span className="text-[9px]">No Data</span>
      </div>
    );
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  let currentAngle = -90;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      ...d,
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      pct: ((d.value / total) * 100).toFixed(0),
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size}>
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.path}
            fill={slice.color}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1"
            className="transition-all hover:opacity-80"
          />
        ))}
        <circle cx={cx} cy={cy} r={radius * 0.5} fill="var(--card-bg)" />
      </svg>
      <div className="space-y-2">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-[10px] font-black italic text-slate-300 uppercase tracking-tighter">
              {slice.label}: {slice.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyBarChart({ data, width = 280, height = 80 }) {
  if (!data || data.length === 0)
    return (
      <div
        style={{ width: width, height: height }}
        className="flex items-center justify-center border border-dashed border-[var(--card-border)] rounded-xl opacity-30"
      >
        <span className="text-[10px]">No History Yet</span>
      </div>
    );
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barGap = 6;
  const availableWidth = width - 20;
  const barWidth = availableWidth / data.length - barGap;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {data.map((d, i) => {
        const barHeight = (d.value / maxVal) * (height - 35);
        const x = i * (availableWidth / data.length) + 10;
        const y = height - 20 - barHeight;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill={d.success ? "#10b981" : "#ef4444"}
              className="opacity-80 hover:opacity-100 transition-opacity"
            >
              <title>{`$${d.value}`}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={y - 6}
              fontSize="10"
              fill={d.success ? "#10b981" : "#f87171"}
              textAnchor="middle"
              fontWeight="black"
              className="italic"
            >
              ${d.value.toFixed(0)}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 4}
              fontSize="10"
              fill="#94a3b8"
              textAnchor="middle"
              fontWeight="black"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// --- MAIN DASHBOARD COMPONENT ---
function Dashboard() {
  const [revenueSoFar, setRevenueSoFar] = useState(0);
  const [draftRevenue, setDraftRevenue] = useState(""); // NEW: Transactional input state
  const [dailyGoal, setDailyGoal] = useState(35);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [view, setView] = useState("tracker");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [editingRecord, setEditingRecord] = useState(null);
  const [lastRevenue, setLastRevenue] = useState(0);
  const [validationMessage, setValidationMessage] = useState(null);
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false); // Custom "Glass" Modal for Reset
  const [resetConfirmStep, setResetConfirmStep] = useState(0); // 0 = closed, 1 = first warning, 2 = final warning
  const [collapsedSections, setCollapsedSections] = useState({
    pattern: true,
    milestones: true,
    performance: true,
  });
  const [timeAgoTick, setTimeAgoTick] = useState(0);
  const [timelineTooltip, setTimelineTooltip] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // --- MISSION BRIDGE (SYNC) STATE ---
  const [bridgeUrl, setBridgeUrl] = useState(
    () =>
      localStorage.getItem("cpa:bridgeUrl") ||
      "https://atkhbtwebgtmdtmbsggr.supabase.co"
  );
  const [bridgeKey, setBridgeKey] = useState(
    () =>
      localStorage.getItem("cpa:bridgeKey") ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0a2hidHdlYmd0bWR0bWJzZ2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzODE0MTksImV4cCI6MjA4Mzk1NzQxOX0.6Xo8s0MqqOhUhrL_S-Kfawgf4Xw9GSmmHh-PjIxpuh8"
  );
  const [syncStatus, setSyncStatus] = useState("off"); // off, connected, syncing, error
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [localLastModified, setLocalLastModified] = useState(() =>
    parseInt(
      localStorage.getItem("cpa:localLastModified") || Date.now().toString()
    )
  );
  const [syncError, setSyncError] = useState(null);
  const supabaseRef = useRef(null);

  const [pendingReconciliation, setPendingReconciliation] = useState(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("cpa:pendingReconciliation");
    return saved ? JSON.parse(saved) : null;
  });
  const [reconcileDraft, setReconcileDraft] = useState("");
  const [selectedArchiveDate, setSelectedArchiveDate] = useState(null);
  const timelineRef = useRef(null);
  const revenueInputRef = useRef(null);

  const [alertDismissed, setAlertDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const dayKey = getCPADayKey(new Date());
    const dismissedKey = localStorage.getItem("cpa:alertDismissed");
    return dismissedKey === dayKey;
  });

  const [postedSlots, setPostedSlots] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const dayKey = getCPADayKey(new Date());
      const saved = localStorage.getItem(`cpa:posted:${dayKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [enabledAlarms, setEnabledAlarms] = useState(() => {
    if (typeof window === "undefined") return [15, 16, 17]; // Default to RED slots
    try {
      const saved = localStorage.getItem("cpa:enabledAlarms");
      return saved ? JSON.parse(saved) : [15, 16, 17];
    } catch {
      return [15, 16, 17];
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("cpa:theme");
    return (
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("cpa:history");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("cpa:notifications") === "true";
  });

  // --- SYNC CORE LOGIC ---
  useEffect(() => {
    if (bridgeUrl && bridgeKey) {
      try {
        supabaseRef.current = createClient(bridgeUrl, bridgeKey);
        setSyncStatus("connected");
        // Initial Pull on connect
        syncPull();
      } catch (e) {
        setSyncStatus("error");
        setSyncError("Client Init Failed");
      }
    } else {
      setSyncStatus("off");
    }
  }, [bridgeUrl, bridgeKey]);

  const syncPush = async () => {
    if (!supabaseRef.current) return;
    setSyncStatus("syncing");
    const payload = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cpa:") && !key.includes("bridge")) {
        payload[key] = localStorage.getItem(key);
      }
    }
    try {
      const { error } = await supabaseRef.current
        .from("mission_bridge")
        .upsert({
          id: "sole-user",
          payload,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setSyncStatus("connected");
      setLastSyncTime(new Date());
    } catch (err) {
      setSyncStatus("error");
      setSyncError(err.message);
    }
  };

  const syncPull = async () => {
    if (!supabaseRef.current) return;
    setSyncStatus("syncing");
    try {
      const { data, error } = await supabaseRef.current
        .from("mission_bridge")
        .select("payload, updated_at")
        .eq("id", "sole-user")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data && data.payload) {
        const remoteUpdated = new Date(data.updated_at).getTime();
        if (remoteUpdated > localLastModified) {
          Object.entries(data.payload).forEach(([key, val]) => {
            if (typeof val === "string") localStorage.setItem(key, val);
          });
          window.location.reload();
        }
      }
      setSyncStatus("connected");
      setLastSyncTime(new Date());
    } catch (err) {
      setSyncStatus("error");
      setSyncError(err.message);
    }
  };

  const markLocalUpdate = () => {
    const ts = Date.now();
    setLocalLastModified(ts);
    localStorage.setItem("cpa:localLastModified", ts.toString());
  };

  const currentDay = useMemo(() => getCPADayKey(currentTime), [currentTime]);

  // Memos
  const activeWATMinutes = useMemo(() => {
    return getWATMinutes(currentTime);
  }, [currentTime]);

  const slotsCompleted = useMemo(
    () => mapMinutesToSlot(activeWATMinutes),
    [activeWATMinutes]
  );

  const currentSlotData = useMemo(
    () => SCHEDULE[slotsCompleted - 1] || SCHEDULE[0],
    [slotsCompleted]
  );

  const totalPossibleWeight = useMemo(
    () => SCHEDULE.reduce((acc, s) => acc + s.weight, 0),
    []
  );

  const nextSlotCountdown = useMemo(() => {
    const startMins = 540; // 9:00 AM
    const watMinutes = getWATMinutes(currentTime);
    let relativeMins = (watMinutes - startMins + 1440) % 1440;
    const elapsedInCurrent = relativeMins % SLOT_LENGTH_MIN;
    const remaining = SLOT_LENGTH_MIN - elapsedInCurrent;

    const h = Math.floor(remaining / 60);
    const m = Math.floor(remaining % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [currentTime]);

  const analytics = useMemo(() => {
    const historyEntries = Object.entries(history);
    if (historyEntries.length === 0) return null;

    const last7Days = historyEntries
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7);

    const weekTotal = last7Days.reduce((acc, [_, d]) => acc + d.revenue, 0);
    const avgDaily = weekTotal / (last7Days.length || 1);

    const sortedByRev = [...last7Days].sort(
      (a, b) => b[1].revenue - a[1].revenue
    );
    const bestDay = sortedByRev[0];
    const worstDay = sortedByRev[sortedByRev.length - 1];

    let redTotal = 0;
    let redPosted = 0;
    let seedTotal = 0;
    let seedPosted = 0;

    historyEntries.forEach(([_, day]) => {
      SCHEDULE.forEach((s, idx) => {
        const slotNum = idx + 1;
        const isPosted = day.postedList?.includes(slotNum);
        if (s.priority === "RED") {
          redTotal++;
          if (isPosted) redPosted++;
        }
        if (slotNum >= 11 && slotNum <= 13) {
          seedTotal++;
          if (isPosted) seedPosted++;
        }
      });
    });

    return {
      weekTotal,
      avgDaily,
      bestDay: bestDay
        ? { date: bestDay[0], revenue: bestDay[1].revenue }
        : null,
      worstDay: worstDay
        ? { date: worstDay[0], revenue: worstDay[1].revenue }
        : null,
      redRate: redTotal > 0 ? (redPosted / redTotal) * 100 : 0,
      seedRate: seedTotal > 0 ? (seedPosted / seedTotal) * 100 : 0,
    };
  }, [history]);

  const metrics = useMemo(() => {
    const completedArr = SCHEDULE.slice(0, slotsCompleted);
    const weightCompleted = completedArr.reduce((acc, s) => acc + s.weight, 0);
    const remainingWeight = totalPossibleWeight - weightCompleted;

    const divSlots = slotsCompleted || 1;
    const linearProjection = (revenueSoFar / divSlots) * 18;
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

  const analyticsEngine = useMemo(() => {
    if (checkpoints.length < 2)
      return { velocity: 0, yield: 100, drift: 0, logs: [] };

    // 1. VELOCITY ($/hr)
    const latest = checkpoints[checkpoints.length - 1];
    const prev = checkpoints[checkpoints.length - 2];
    const deltaRev = (latest.revenue || 0) - (prev.revenue || 0);
    const deltaTimeHrs =
      (new Date(latest.time) - new Date(prev.time)) / 3600000;
    const velocity = deltaTimeHrs > 0 ? deltaRev / deltaTimeHrs : 0;

    // 2. YIELD ALIGNMENT
    // Compare actual revenue per weight vs average
    const completedArr = SCHEDULE.slice(0, slotsCompleted);
    const weightCompleted = completedArr.reduce((acc, s) => acc + s.weight, 0);
    const actualPerWeight =
      weightCompleted > 0 ? revenueSoFar / weightCompleted : 0;
    // Base expectation is roughly $2/weight (assuming $35 goal / ~18 weight total)
    const baselinePerWeight = dailyGoal / totalPossibleWeight;
    const yieldAlignment =
      baselinePerWeight > 0 ? (actualPerWeight / baselinePerWeight) * 100 : 100;

    // 3. DRIFT LOGS
    const logs = [...checkpoints].reverse();

    return { velocity, yield: yieldAlignment, logs };
  }, [checkpoints, revenueSoFar, slotsCompleted, dailyGoal]);

  // Chart Data Memos
  const intradayChartData = useMemo(() => {
    if (!checkpoints || !Array.isArray(checkpoints)) return [];
    return checkpoints
      .filter((cp) => cp && typeof cp.revenue === "number")
      .map((cp) => ({
        value: cp.revenue || 0,
        label: `S${cp.slot}`,
      }));
  }, [checkpoints]);

  const sectorDistributionData = useMemo(() => {
    const sectorEarnings = { RED: 0, BLUE: 0, GREEN: 0, YELLOW: 0 };

    // Use current session data
    checkpoints.forEach((cp) => {
      const slotInfo = SCHEDULE[cp.slot - 1];
      if (slotInfo) {
        sectorEarnings[slotInfo.priority] += cp.delta || 0;
      }
    });

    // If no current session data, use history average to show something useful
    const entries = Object.values(history);
    if (checkpoints.length === 0 && entries.length > 0) {
      entries.forEach((day) => {
        if (day.logs) {
          day.logs.forEach((log) => {
            const slotInfo = SCHEDULE[log.slot - 1];
            if (slotInfo) {
              sectorEarnings[slotInfo.priority] += log.delta || 0;
            }
          });
        }
      });
    }

    const total = Object.values(sectorEarnings).reduce((a, b) => a + b, 0);

    return [
      { label: "RED", value: sectorEarnings.RED, color: "#ef4444" },
      { label: "BLUE", value: sectorEarnings.BLUE, color: "#06b6d4" },
      { label: "GREEN", value: sectorEarnings.GREEN, color: "#10b981" },
      { label: "YELLOW", value: sectorEarnings.YELLOW, color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [checkpoints, history]);

  const weeklyChartData = useMemo(() => {
    if (!history || typeof history !== "object") return [];
    const entries = Object.entries(history)
      .filter(([_, stats]) => stats && typeof stats.revenue === "number") // Sanitize garbage
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7)
      .reverse();

    return entries.map(([date, stats]) => ({
      label: new Date(date)
        .toLocaleDateString("en-US", { weekday: "short" })
        .charAt(0),
      value: stats.revenue || 0,
      success: stats.revenue >= (stats.goal || dailyGoal),
    }));
  }, [history, dailyGoal]);

  // Effects
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTimeAgoTick((t) => t + 1); // Force re-render for timeago
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const lastDayKey = localStorage.getItem("cpa:lastDayKey");
    if (lastDayKey && lastDayKey !== currentDay) {
      // Transition detected - find the data for the most recent day worked
      const prevData = localStorage.getItem(`cpa:daily:${lastDayKey}`);
      const parsed = prevData
        ? JSON.parse(prevData)
        : { revenueSoFar: 0, dailyGoal: dailyGoal };

      const rec = {
        date: lastDayKey,
        revenue: parsed.revenueSoFar || 0,
        goal: parsed.dailyGoal || dailyGoal,
      };
      setPendingReconciliation(rec);
      setReconcileDraft((parsed.revenueSoFar || 0).toString());
      localStorage.setItem("cpa:pendingReconciliation", JSON.stringify(rec));
    }
    localStorage.setItem("cpa:lastDayKey", currentDay);
  }, [currentDay]);

  useEffect(() => {
    const dayKey = getCPADayKey(currentTime);
    const saved = localStorage.getItem(`cpa:daily:${dayKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRevenueSoFar(parsed.revenueSoFar || 0);
        if (parsed.dailyGoal) setDailyGoal(parsed.dailyGoal);
        if (parsed.lastUpdated) setLastUpdated(new Date(parsed.lastUpdated));
      } catch (e) {
        console.error("Restore error", e);
      }
    }

    const savedPosted = localStorage.getItem(`cpa:posted:${dayKey}`);
    if (savedPosted) {
      try {
        setPostedSlots(JSON.parse(savedPosted));
      } catch {
        setPostedSlots([]);
      }
    } else {
      setPostedSlots([]);
    }

    // Load last revenue and checkpoints
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLastRevenue(parsed.revenueSoFar || 0);
      } catch {
        setLastRevenue(0);
      }
    } else {
      setLastRevenue(0);
    }

    const savedCheckpoints = localStorage.getItem(`cpa:checkpoints:${dayKey}`);
    if (savedCheckpoints) {
      try {
        setCheckpoints(JSON.parse(savedCheckpoints));
      } catch {
        setCheckpoints([]);
      }
    } else {
      setCheckpoints([]);
    }
  }, []); // Run on mount (initial load)

  useEffect(() => {
    const dayKey = getCPADayKey(currentTime);
    localStorage.setItem(
      `cpa:daily:${dayKey}`,
      JSON.stringify({ revenueSoFar, dailyGoal, lastUpdated })
    );
    localStorage.setItem(`cpa:posted:${dayKey}`, JSON.stringify(postedSlots));
  }, [revenueSoFar, dailyGoal, currentTime, lastUpdated, postedSlots]);

  // Auto-mark slot when revenue INCREASES
  useEffect(() => {
    if (revenueSoFar > lastRevenue && lastRevenue >= 0 && revenueSoFar > 0) {
      const currentSlot = currentSlotData.slot;
      if (!postedSlots.includes(currentSlot)) {
        setPostedSlots((prev) =>
          [...new Set([...prev, currentSlot])].sort((a, b) => a - b)
        );
      }
      setLastRevenue(revenueSoFar);
    }
  }, [revenueSoFar]);

  // Auto-save checkpoint when revenue changes
  useEffect(() => {
    if (revenueSoFar > 0 && revenueSoFar !== lastRevenue) {
      setCheckpoints((prev) => {
        const delta = revenueSoFar - lastRevenue;
        const newCheckpoint = {
          slot: slotsCompleted,
          time: new Date().toISOString(),
          revenue: revenueSoFar,
          delta: delta > 0 ? delta : 0,
          projected: metrics.weighted, // Snapshot of the projection at this moment
        };

        // DEDUPLICATION: Keep only latest checkpoint per slot
        const filtered = prev.filter((cp) => cp.slot !== slotsCompleted);
        const updated = [...filtered, newCheckpoint]
          .sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
          )
          .slice(-18);

        const dayKey = getCPADayKey(new Date());
        localStorage.setItem(
          `cpa:checkpoints:${dayKey}`,
          JSON.stringify(updated)
        );
        return updated;
      });
      setLastRevenue(revenueSoFar); // Update last revenue after checkpoint
    }
  }, [revenueSoFar]);

  // Day Boundary Detection (Clear checkpoints at 9 AM WAT)
  useEffect(() => {
    const checkDayBoundary = () => {
      const currentDayKey = getCPADayKey(new Date());
      const storedDayKey = localStorage.getItem("cpa:currentDay");

      if (storedDayKey && storedDayKey !== currentDayKey) {
        // New day detected - clear intraday logic
        setCheckpoints([]);
        setRevenueSoFar(0);
        setLastRevenue(0);
        setAlertDismissed(false);
        localStorage.removeItem("cpa:alertDismissed");
        localStorage.setItem("cpa:currentDay", currentDayKey);
        localStorage.removeItem(`cpa:checkpoints:${storedDayKey}`);
      } else if (!storedDayKey) {
        localStorage.setItem("cpa:currentDay", currentDayKey);
      }
    };

    checkDayBoundary();
    const interval = setInterval(checkDayBoundary, 60000);
    return () => clearInterval(interval);
  }, []);

  // Mobile Alarm System (Sound + Notification)
  // Auto-Focus Logic for Timeline (Centers active slot on update)
  useEffect(() => {
    if (timelineRef.current) {
      const activeNode =
        timelineRef.current.querySelector(".current-slot-node");
      if (activeNode) {
        activeNode.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [slotsCompleted]);

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const watMinutes = getWATMinutes(now);

      SCHEDULE.forEach((slot, index) => {
        const slotNum = index + 1;
        if (!enabledAlarms.includes(slotNum)) return;

        // Slot Start Time
        const slotStartMins = (540 + index * SLOT_LENGTH_MIN) % 1440;

        // Alarm Target: 20 minutes BEFORE start
        const alarmTarget = (slotStartMins - 20 + 1440) % 1440;

        if (watMinutes === alarmTarget) {
          // Trigger Alarm
          if (notificationsEnabled) {
            if (Notification.permission === "granted") {
              new Notification("Sector Alarm 🚨", {
                body: `T-Minus 20m: ${slot.emoji} Slot ${slotNum} (${slot.geo})`,
                icon: "/stats-cpa/icon-192.png",
                vibrate: [200, 100, 200, 100, 200],
              });
            }
          }

          // Audio Alert (Speech Synthesis)
          try {
            const utterance = new SpeechSynthesisUtterance(
              `Alert. Slot ${slotNum} begins in 20 minutes.`
            );
            utterance.rate = 1.0;
            utterance.pitch = 1.1;
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error("Audio alarm failed", e);
          }
        }
      });
    };

    const interval = setInterval(checkAlarms, 60000);
    checkAlarms(); // Check on mount
    return () => clearInterval(interval);
  }, [enabledAlarms, notificationsEnabled]);

  // Keyboard Shortcuts & Auto-focus
  useEffect(() => {
    if (view === "tracker" && revenueInputRef.current) {
      // revenueInputRef.current.focus(); // DISABLED AUTO-FOCUS for Mobile UX
    }

    const handleKeyPress = (e) => {
      if (
        view === "tracker" &&
        e.key.toLowerCase() === "r" &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        if (revenueInputRef.current) revenueInputRef.current.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [view]);

  // Handle Timeline Auto-Scroll
  useEffect(() => {
    if (view === "tracker" && timelineRef.current) {
      const activeEl = timelineRef.current.querySelector(".current-slot-node");
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [view, slotsCompleted]);

  const handleReconcile = () => {
    const finalRev = parseFloat(reconcileDraft);
    if (isNaN(finalRev)) return;

    // Load checkpoints for the day being reconciled
    let dayCheckpoints = [];
    const savedCheckpoints = localStorage.getItem(
      `cpa:checkpoints:${pendingReconciliation.date}`
    );
    if (savedCheckpoints) {
      try {
        dayCheckpoints = JSON.parse(savedCheckpoints);
      } catch (e) {
        console.error("Failed to parse historical checkpoints", e);
      }
    }

    // Add a closing checkpoint if there's a gap between last sync and final
    const lastCheck = dayCheckpoints[dayCheckpoints.length - 1];
    if (!lastCheck || finalRev > lastCheck.revenue) {
      dayCheckpoints.push({
        time: new Date().toISOString(),
        revenue: finalRev,
        slot: 18,
        delta: lastCheck ? finalRev - lastCheck.revenue : finalRev,
        projected: finalRev,
        isClosing: true,
      });
    }

    const benchmark =
      BENCHMARKS.find((b) => finalRev >= b.min && finalRev < b.max) ||
      BENCHMARKS[0];

    const finalizedEntry = {
      revenue: finalRev,
      goal: pendingReconciliation.goal || 35,
      slots: 18,
      weighted: finalRev,
      status: benchmark.label,
      postedList: SCHEDULE.map((s) => s.slot),
      timestamp: new Date().toISOString(),
      logs: dayCheckpoints, // Save intraday logs permanently
    };

    setHistory((prev) => {
      const newHistory = {
        ...prev,
        [pendingReconciliation.date]: finalizedEntry,
      };
      localStorage.setItem("cpa:history", JSON.stringify(newHistory));
      return newHistory;
    });

    setPendingReconciliation(null);
    localStorage.removeItem("cpa:pendingReconciliation");
    localStorage.removeItem(`cpa:daily:${pendingReconciliation.date}`);
    localStorage.removeItem(`cpa:posted:${pendingReconciliation.date}`);
    localStorage.removeItem(`cpa:checkpoints:${pendingReconciliation.date}`);
    markLocalUpdate();
  };

  const handleRevenueSave = () => {
    if (savingRevenue) return;

    const dashboardTotal = parseFloat(draftRevenue);
    if (isNaN(dashboardTotal)) return;

    setSavingRevenue(true);

    const oldTotal = revenueSoFar;
    setRevenueSoFar(dashboardTotal);
    setLastUpdated(new Date());
    setDraftRevenue("");

    // Capture checkpoint with delta and projection
    const delta = dashboardTotal - oldTotal;
    const newCheckpoint = {
      time: new Date().toISOString(),
      revenue: dashboardTotal,
      slot: slotsCompleted,
      delta: delta,
      projected: metrics.weighted,
    };

    setCheckpoints((prev) => {
      const updated = [...prev, newCheckpoint];
      const dayKey = getCPADayKey(currentTime);
      localStorage.setItem(
        `cpa:checkpoints:${dayKey}`,
        JSON.stringify(updated)
      );
      return updated;
    });

    setTimeout(() => {
      setSavingRevenue(false);
      setSavedSuccessfully(true);
      markLocalUpdate();
      setTimeout(() => setSavedSuccessfully(false), 2000);
    }, 600);
  };

  // Performance Analytics Utility
  const calculateSlotPerformance = () => {
    const slotStats = {};
    const historyEntries = Object.values(history);
    const totalDays = historyEntries.length || 1;

    historyEntries.forEach((day) => {
      if (!day.postedList) return;
      day.postedList.forEach((slotNum) => {
        if (!slotStats[slotNum]) slotStats[slotNum] = 0;
        slotStats[slotNum]++;
      });
    });

    return SCHEDULE.map((s) => ({
      ...s,
      hitRate: slotStats[s.slot]
        ? Math.round((slotStats[s.slot] / totalDays) * 100)
        : 0,
    })).sort((a, b) => b.hitRate - a.hitRate);
  };

  useEffect(() => {
    localStorage.setItem("cpa:theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem("cpa:bridgeUrl", bridgeUrl);
    localStorage.setItem("cpa:bridgeKey", bridgeKey);
  }, [bridgeUrl, bridgeKey]);

  useEffect(() => {
    if (syncStatus === "connected" && localLastModified) {
      const timer = setTimeout(() => {
        syncPush();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [localLastModified, syncStatus]);

  useEffect(() => {
    const handleFocus = () => {
      if (syncStatus === "connected") syncPull();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [syncStatus]);

  useEffect(() => {
    if (supabaseRef.current && syncStatus === "connected") {
      const channel = supabaseRef.current
        .channel("mission-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mission_bridge" },
          () => syncPull()
        )
        .subscribe();
      return () => {
        supabaseRef.current.removeChannel(channel);
      };
    }
  }, [syncStatus]);

  useEffect(() => {
    const dayKey = getCPADayKey(currentTime);
    const dayStats = {
      revenue: revenueSoFar,
      goal: dailyGoal,
      slots: slotsCompleted,
      posted: postedSlots.length,
      postedList: postedSlots,
      weighted: metrics.weighted,
      status: metrics.benchmark.label,
      priority: currentSlotData.priority,
      timestamp: new Date().toISOString(),
    };

    setHistory((prev) => {
      const updated = { ...prev, [dayKey]: dayStats };
      localStorage.setItem("cpa:history", JSON.stringify(updated));
      return updated;
    });
  }, [revenueSoFar, dailyGoal, slotsCompleted, metrics.weighted]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    const checkNotifications = () => {
      const nowWAT = getWATMinutes(new Date());
      SCHEDULE.forEach((slot, index) => {
        const slotNum = index + 1;
        if (!enabledAlarms.includes(slotNum)) return;

        const targetMins = (540 + index * SLOT_LENGTH_MIN) % 1440;
        if (nowWAT === targetMins) {
          new Notification("CPA Slot Update", {
            body: `${slot.emoji} Slot ${slotNum} Starting: ${slot.geo} (${slot.priority})`,
            icon: "/icon-192.png",
          });
        }
      });
    };
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [notificationsEnabled, enabledAlarms]);

  const handleRevenueChange = (val) => {
    let num = parseFloat(val);
    let capped = false;

    if (val === "") num = 0;
    if (isNaN(num)) return;

    if (num < 0) {
      num = 0;
      capped = true;
    }
    if (num > 10000) {
      num = 10000;
      capped = true;
    }

    if (capped) {
      setValidationMessage("Value adjusted to valid range");
      setTimeout(() => setValidationMessage(null), 3000);
    }

    setRevenueSoFar(num);
    setLastUpdated(new Date());
  };

  const handleGoalChange = (val) => {
    let num = parseFloat(val);
    if (val === "") num = 35;
    if (isNaN(num)) return;
    if (num < 0) num = 0;
    if (num > 10000) num = 10000;
    setDailyGoal(num);
  };

  const togglePosted = (slotNum) => {
    setPostedSlots((prev) =>
      prev.includes(slotNum)
        ? prev.filter((id) => id !== slotNum)
        : [...prev, slotNum].sort((a, b) => a - b)
    );
  };
  const handleExport = () => {
    setIsExporting(true);

    try {
      const flatHistory = Object.entries(history)
        .map(([date, stats]) => ({
          date,
          ...stats,
          revenue: parseFloat(stats.revenue),
          goal: parseFloat(stats.goal || dailyGoal),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const exportData = {
        app: "CPA Tracker",
        exportDate: new Date().toISOString(),
        history: flatHistory,
        raw: history,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cpa_backup_${
        new Date().toISOString().split("T")[0]
      }.json`;
      link.click();

      setTimeout(() => {
        setIsExporting(false);
      }, 500);
    } catch (err) {
      console.error("Export error:", err);
      alert("❌ Failed to create backup.");
      setIsExporting(false);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result);

        if (data.app === "CPA Tracker" && data.raw) {
          setHistory(data.raw);
          localStorage.setItem("cpa:history", JSON.stringify(data.raw));

          // ADD SUCCESS FEEDBACK
          alert("✅ Backup restored successfully!");
          window.location.reload();
        } else {
          throw new Error("Invalid format");
        }
      } catch (err) {
        console.error("Import error:", err);
        alert(
          "❌ Failed to restore backup. Please check the file and try again."
        );
      }
    };

    reader.onerror = () => {
      alert("❌ Failed to read file. Please try again.");
    };

    reader.readAsText(file);
  };

  const handleExportICS = () => {
    const icsContent = generateICS(history);
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cpa_history_${new Date().toISOString().split("T")[0]}.ics`;
    link.click();
  };

  const handleSaveHistory = (date, revenue, goal) => {
    setHistory((prev) => {
      const updated = {
        ...prev,
        [date]: {
          revenue: parseFloat(revenue) || 0,
          goal: parseFloat(goal) || 35,
          slots: prev[date]?.slots || 0,
          weighted: prev[date]?.weighted || revenue,
          status:
            BENCHMARKS.find((b) => revenue >= b.min && revenue < b.max)
              ?.label || "Standard",
          priority: prev[date]?.priority || "BLUE",
          timestamp: new Date().toISOString(),
        },
      };
      localStorage.setItem("cpa:history", JSON.stringify(updated));
      return updated;
    });
    setEditingRecord(null);
  };

  const handleDeleteHistory = (date) => {
    if (confirm(`Delete record for ${date}?`)) {
      setHistory((prev) => {
        const { [date]: _, ...rest } = prev;
        localStorage.setItem("cpa:history", JSON.stringify(rest));
        return rest;
      });
      setEditingRecord(null);
    }
  };

  return (
    <div
      className={`min-h-screen font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-500 ${
        isDarkMode ? "dark" : "light-theme"
      }`}
      style={{ color: "var(--text-primary)" }}
    >
      <div className="bg-space" />

      <div className="relative max-w-xl mx-auto px-4 pt-4 pb-32">
        {/* COMPACTED HEADER */}
        <header className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Target size={18} className="text-[#020617]" />
            </div>
            <h1 className="text-sm font-black uppercase tracking-[0.3em] font-mono italic">
              Sector <span className="text-cyan-400">Alpha</span>
            </h1>
          </div>
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors hover:text-cyan-400"
              style={{ color: "var(--text-dim)" }}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors hover:text-cyan-400"
              style={{ color: "var(--text-dim)" }}
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* SETTINGS OVERLAY */}
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
              onClick={() => setShowSettings(false)}
            />
            <div className="glass-card w-full max-w-sm rounded-[2rem] p-6 relative animate-in zoom-in-95 duration-200 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">
                  System Configuration
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="transition-colors text-lg"
                  style={{ color: "var(--text-dim)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-dim)")
                  }
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* DAILY TARGET */}
                <div className="space-y-3">
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Daily Target ($)
                  </p>
                  <input
                    type="number"
                    step="5"
                    value={dailyGoal}
                    onChange={(e) => handleGoalChange(e.target.value)}
                    className="w-full rounded-2xl px-6 py-4 text-xl font-black focus:ring-2 focus:ring-cyan-500/50 transition-all italic tracking-tighter"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                {/* ALARM CONFIG */}
                <div className="space-y-3">
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Sector Vigilance (Alarms)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[15, 16, 17].map((slot) => (
                      <button
                        key={slot}
                        onClick={() => {
                          setEnabledAlarms((prev) => {
                            const next = prev.includes(slot)
                              ? prev.filter((s) => s !== slot)
                              : [...prev, slot];
                            localStorage.setItem(
                              "cpa:enabledAlarms",
                              JSON.stringify(next)
                            );
                            return next;
                          });
                        }}
                        className={`py-2.5 rounded-xl text-[10px] font-black transition-all ${
                          enabledAlarms.includes(slot)
                            ? "bg-cyan-500 text-[#020617] shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                            : "border"
                        }`}
                        style={{
                          backgroundColor: enabledAlarms.includes(slot)
                            ? ""
                            : "var(--card-bg)",
                          color: enabledAlarms.includes(slot)
                            ? ""
                            : "var(--text-dim)",
                          borderColor: enabledAlarms.includes(slot)
                            ? ""
                            : "var(--card-border)",
                        }}
                      >
                        SLOT {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NOTIFICATIONS */}
                <div
                  className="flex items-center justify-between p-4 rounded-2xl border"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-cyan-400" />
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Protocol Alerts
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !notificationsEnabled;
                      setNotificationsEnabled(next);
                      localStorage.setItem("cpa:notifications", String(next));
                    }}
                    className={`w-10 h-6 rounded-full transition-all relative ${
                      notificationsEnabled ? "bg-cyan-500" : ""
                    }`}
                    style={{
                      backgroundColor: notificationsEnabled
                        ? ""
                        : "var(--card-border)",
                    }}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        notificationsEnabled ? "left-5" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                {/* MISSION BRIDGE (SYNC) */}
                <div
                  className="space-y-4 pt-4 border-t"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Mission Bridge{" "}
                      {syncStatus === "syncing"
                        ? "🔄"
                        : syncStatus === "connected"
                        ? "🟢"
                        : syncStatus === "error"
                        ? "🔴"
                        : "🔘"}
                    </p>
                    {lastSyncTime && (
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                        {lastSyncTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 px-1">
                        Bridge URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://xyz.supabase.co"
                        value={bridgeUrl}
                        onChange={(e) => setBridgeUrl(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-xs font-mono focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        style={{
                          backgroundColor: "var(--card-bg)",
                          border: "1px solid var(--card-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 px-1">
                        Bridge Key
                      </label>
                      <input
                        type="password"
                        placeholder="anon-public-key"
                        value={bridgeKey}
                        onChange={(e) => setBridgeKey(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-xs font-mono focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        style={{
                          backgroundColor: "var(--card-bg)",
                          border: "1px solid var(--card-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>
                  </div>

                  {syncError && (
                    <p className="text-[9px] font-bold text-red-500 bg-red-500/10 p-2 rounded-lg italic">
                      {syncError}
                    </p>
                  )}

                  {syncStatus === "off" && (
                    <p className="text-[9px] text-slate-500 italic px-1 leading-relaxed">
                      Enter your keys to enable invisible sync between your
                      phone and laptop.
                    </p>
                  )}
                </div>

                {/* EXPORT/IMPORT */}
                <div
                  className="grid grid-cols-2 gap-3 pt-4 border-t"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Download size={14} /> Export
                  </button>
                  <label
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Upload size={14} /> Import
                    <input
                      type="file"
                      onChange={handleImport}
                      className="hidden"
                      accept=".json"
                    />
                  </label>
                </div>

                {/* DANGER ZONE */}
                <div
                  className="pt-4 border-t"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">
                    Danger Zone
                  </p>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setShowResetModal(true);
                    }}
                    className="w-full py-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Views */}
        <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {view === "tracker" && (
            <div className="space-y-6">
              {/* 1. COMPACT MISSION CONTROL PREMIUM CARD */}
              <div className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:shadow-cyan-500/10 transition-all">
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-24 -mt-24 blur-3xl transition-colors"
                  style={{ backgroundColor: "var(--card-bg)", opacity: 0.2 }}
                />

                <div className="relative flex justify-between items-center gap-6">
                  <div>
                    <h2
                      className="text-xl font-black tracking-tighter mb-1 italic"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Mission Control
                    </h2>
                    <div className="flex items-center gap-2 font-mono text-xs font-black">
                      <div className="w-1 h-1 rounded-full bg-cyan-400 pulse-glow neon-glow-cyan" />
                      <span style={{ color: "var(--text-dim)" }}>
                        Slot {slotsCompleted} • {currentSlotData.time} WAT •{" "}
                        {formatPST(new Date())} PST
                      </span>
                    </div>
                  </div>

                  {/* Circular Instrumentation (Smaller) */}
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        style={{ color: "var(--card-border)" }}
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray="226"
                        strokeDashoffset={
                          226 -
                          (226 * (parseFloat(nextSlotCountdown) || 0)) / 80
                        }
                        className="text-cyan-500 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span
                        className="text-[18px] font-black italic tracking-tighter"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {nextSlotCountdown}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="mt-4 grid grid-cols-2 gap-3 pt-4"
                  style={{ borderTop: "1px solid var(--card-border)" }}
                >
                  <div className="space-y-0.5">
                    <p
                      className="text-[8px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Target Vector
                    </p>
                    <p
                      className="text-[11px] font-black italic"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {currentSlotData.emoji} {currentSlotData.geo}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p
                      className="text-[8px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Priority
                    </p>
                    <div className="flex justify-end">
                      <span
                        className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          currentSlotData.priority === "RED"
                            ? "bg-red-500 text-white"
                            : currentSlotData.priority === "BLUE"
                            ? "bg-cyan-600 text-white"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        {currentSlotData.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. COMPACT REVENUE INPUT CARD */}
              <div className="glass-card rounded-3xl p-6 text-center relative overflow-hidden">
                <h3
                  className="text-[10px] font-black uppercase tracking-[0.3em] mb-4"
                  style={{ color: "var(--text-dim)" }}
                >
                  CPAGrip Total Sync
                </h3>

                <div className="relative flex justify-center items-center gap-1 mb-4 h-16">
                  <span
                    className="text-6xl font-black italic mb-3 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                    style={{ opacity: 1 }}
                  >
                    $
                  </span>
                  <div className="relative h-full flex items-center">
                    <input
                      ref={revenueInputRef}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={draftRevenue} // Use draft state
                      onChange={(e) => setDraftRevenue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRevenueSave();
                        }
                      }}
                      className="w-48 bg-transparent border-none text-5xl font-black text-center italic tracking-tighter focus:outline-none focus:drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all p-0 m-0 leading-none h-full"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p
                      className="text-[8px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Projected
                    </p>
                    <p className="text-lg font-black text-cyan-400 italic font-mono">
                      ${metrics.weighted.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-[8px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Status
                    </p>
                    <p
                      className={`text-lg font-black italic ${metrics.benchmark.color}`}
                    >
                      {metrics.benchmark.emoji} {metrics.benchmark.label}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRevenueSave}
                  disabled={savingRevenue}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-400 text-[#020617] py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                >
                  {savingRevenue ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
                      <span>Logging...</span>
                    </>
                  ) : savedSuccessfully ? (
                    <span className="flex items-center gap-2">✅ Saved</span>
                  ) : (
                    <>
                      <TrendingUp
                        size={16}
                        className="group-hover:rotate-12 transition-transform"
                      />
                      <span>Sync Dashboard</span>
                    </>
                  )}
                </button>

                {/* LAST UPDATED + KEYBOARD HINT */}
                <div className="mt-4 space-y-1">
                  {lastUpdated && (
                    <div
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Last updated: {formatTimeAgo(lastUpdated)}
                    </div>
                  )}
                  <div
                    className="text-[8px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-dim)", opacity: 0.3 }}
                  >
                    Press Enter or click button to save • R to focus
                  </div>
                </div>

                {/* VALIDATION MESSAGE */}
                {validationMessage && (
                  <div className="mt-3 text-xs font-black text-amber-400 uppercase tracking-widest animate-in fade-in slide-in-from-top-1 duration-200">
                    ⚠️ {validationMessage}
                  </div>
                )}
              </div>

              {/* 3. PREMIUM SLOT TIMELINE */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">
                      Posted
                    </span>
                    <span
                      className="text-xl font-black italic leading-none"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {postedSlots.length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-red-500">
                      Skipped
                    </span>
                    <span
                      className="text-xl font-black italic leading-none"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {slotsCompleted - postedSlots.length}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div
                    className="absolute top-[36px] left-0 right-0 h-0.5 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                    style={{ backgroundColor: "var(--card-border)" }}
                  />
                  <div
                    ref={timelineRef}
                    className="flex items-start justify-between relative overflow-x-auto scrollbar-hide gap-4 px-2 py-5 snap-x"
                  >
                    {SCHEDULE.map((s, i) => {
                      const slotNum = s.slot;
                      const isPast = slotNum < slotsCompleted;
                      const isCurrent = slotNum === slotsCompleted;
                      const isPosted = postedSlots.includes(slotNum);

                      return (
                        <div
                          key={slotNum}
                          className={`flex flex-col items-center gap-2 flex-shrink-0 relative snap-center group ${
                            isCurrent
                              ? "current-slot-node scale-110"
                              : "opacity-60 hover:opacity-100"
                          } transition-all duration-300`}
                          onClick={() =>
                            setTimelineTooltip(
                              timelineTooltip === slotNum ? null : slotNum
                            )
                          }
                        >
                          {/* CIRCLE INDICATOR */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 relative node-3d ${
                              isCurrent
                                ? "bg-cyan-500 active-glow scale-110"
                                : isPosted
                                ? "bg-emerald-500 neon-glow-emerald"
                                : isPast
                                ? "bg-red-500 neon-glow-red"
                                : !isDarkMode
                                ? "future-node-light"
                                : "hover:scale-105"
                            }`}
                            style={{
                              backgroundColor:
                                isPast || isCurrent || isPosted
                                  ? ""
                                  : "var(--card-border)",
                            }}
                          >
                            {isPosted && (
                              <span className="text-xs text-white">✓</span>
                            )}
                            {isCurrent && (
                              <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400/30" />
                            )}
                          </div>

                          {/* LABELS */}
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest ${
                                isCurrent ? "text-cyan-400" : ""
                              }`}
                              style={{
                                color: isCurrent ? "" : "var(--text-dim)",
                              }}
                            >
                              {/* Slot X - More Descriptive */}
                              SLOT {slotNum}
                            </span>

                            {isCurrent && (
                              <span className="text-[9px] font-bold text-cyan-400/80 mt-0.5">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. COMPACT POSTING DISCIPLINE */}
              <div className="glass-card rounded-2xl p-5">
                <div
                  className="flex items-center gap-2 mb-4 font-black uppercase tracking-widest text-[10px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  Posting Discipline
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {SCHEDULE.map((s) => {
                    const isPosted = postedSlots.includes(s.slot);
                    const isCurrent = s.slot === slotsCompleted;
                    return (
                      <button
                        key={s.slot}
                        onClick={() => togglePosted(s.slot)}
                        className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                          isPosted
                            ? "bg-emerald-500 shadow-emerald-500/20"
                            : isCurrent
                            ? "bg-cyan-500/20 border border-cyan-500/40"
                            : "border-transparent"
                        }`}
                        style={{
                          backgroundColor:
                            isPosted || isCurrent ? "" : "var(--card-bg)",
                          borderColor:
                            isPosted || isCurrent ? "" : "var(--card-border)",
                        }}
                      >
                        {isPosted ? (
                          <CheckCircle size={14} className="text-white" />
                        ) : (
                          <span
                            style={{
                              color: isCurrent ? "" : "var(--text-dim)",
                            }}
                            className={`text-[10px] font-black ${
                              isCurrent ? "text-cyan-400" : ""
                            }`}
                          >
                            {s.slot}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. MISSION STATS OVERLAY */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card rounded-[2.5rem] p-6 text-center group transition-all">
                  <p
                    className="text-[11px] font-black uppercase tracking-[0.3em] mb-1 group-hover:text-cyan-400 transition-colors"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Linear Traverse
                  </p>
                  <p
                    className="text-2xl font-black italic font-mono tracking-tighter"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ${metrics.linear.toFixed(2)}
                  </p>
                </div>
                <div className="glass-card rounded-[2.5rem] p-6 text-center group transition-all">
                  <p
                    className="text-[11px] font-black uppercase tracking-[0.3em] mb-1 group-hover:text-emerald-400 transition-colors"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Sector Confidence
                  </p>
                  <p
                    className={`text-2xl font-black italic font-mono tracking-tighter ${
                      metrics.confidence === "High"
                        ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                        : "text-cyan-400"
                    }`}
                  >
                    {metrics.confidence}
                  </p>
                </div>
              </div>

              {/* 6. Compact Tactical Alert (Dismissible) */}
              {/* 6. NEXT SECTOR CARD (Replaces Red Alert) */}
              {/* 6. NEXT SECTOR CARD (Replaces Red Alert) */}
              {(() => {
                const nextSlot =
                  SCHEDULE.find((s) => s.slot === slotsCompleted + 1) ||
                  SCHEDULE[0];
                const priorityColor =
                  nextSlot.priority === "RED"
                    ? "rgba(239, 68, 68, 0.15)" // Red
                    : nextSlot.priority === "BLUE"
                    ? "rgba(6, 182, 212, 0.15)" // Cyan
                    : nextSlot.priority === "GREEN"
                    ? "rgba(16, 185, 129, 0.15)" // Emerald
                    : "rgba(245, 158, 11, 0.15)"; // Amber (Yellow)

                const borderColor =
                  nextSlot.priority === "RED"
                    ? "rgba(239, 68, 68, 0.3)"
                    : nextSlot.priority === "BLUE"
                    ? "rgba(6, 182, 212, 0.3)"
                    : nextSlot.priority === "GREEN"
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(245, 158, 11, 0.3)";

                return (
                  <div
                    className="glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-500"
                    style={{
                      backgroundColor: priorityColor,
                      borderColor: borderColor,
                      boxShadow: `0 0 30px ${priorityColor}`,
                    }}
                  >
                    <div
                      className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl transition-colors"
                      style={{ backgroundColor: borderColor, opacity: 0.2 }}
                    />
                    <div className="flex items-center justify-between relative z-10">
                      <div className="space-y-1">
                        <p
                          className="text-[9px] font-black uppercase tracking-widest"
                          style={{ color: "var(--text-dim)" }}
                        >
                          Next Mission Sector
                        </p>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-2xl font-black italic tracking-tighter"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {nextSlot.time}
                            </span>
                            <span className="text-sm font-black text-cyan-400">
                              {nextSlot.emoji}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm"
                              style={{
                                backgroundColor: "var(--card-bg)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--card-border)",
                              }}
                            >
                              {nextSlot.geo}
                            </span>
                            <span
                              className="text-[10px] font-bold italic"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {nextSlot.expectation}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* ALARM TOGGLE */}
                        {(() => {
                          const nextSlotNum = slotsCompleted + 1;
                          const isAlarmSet =
                            enabledAlarms.includes(nextSlotNum);
                          return (
                            <button
                              onClick={() => {
                                setEnabledAlarms((prev) => {
                                  const next = prev.includes(nextSlotNum)
                                    ? prev.filter((s) => s !== nextSlotNum)
                                    : [...prev, nextSlotNum];
                                  localStorage.setItem(
                                    "cpa:enabledAlarms",
                                    JSON.stringify(next)
                                  );
                                  return next;
                                });
                              }}
                              className={`p-3 rounded-full transition-all ${
                                isAlarmSet
                                  ? "bg-white text-[#020617] shadow-lg scale-110"
                                  : "bg-black/20 border border-white/10 text-white/50"
                              }`}
                            >
                              {isAlarmSet ? (
                                <Bell size={20} className="fill-current" />
                              ) : (
                                <BellOff size={20} />
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {view === "schedule" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">
                  Daily Rotation Array
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span
                    className="text-xs font-black uppercase tracking-widest"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Live Sync
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {SCHEDULE.map((s) => (
                  <div
                    key={s.slot}
                    className={`glass-card rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 ${
                      s.slot === slotsCompleted
                        ? "border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_30px_rgba(6,182,212,0.1)]"
                        : "hover:bg-[var(--card-bg)] hover:opacity-80"
                    }`}
                  >
                    <div
                      className="text-2xl w-12 h-12 flex items-center justify-center rounded-xl border"
                      style={{
                        backgroundColor: "var(--card-bg)",
                        borderColor: "var(--card-border)",
                      }}
                    >
                      {s.emoji}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p
                          className={`text-base font-black italic tracking-tighter ${
                            s.slot === slotsCompleted ? "text-cyan-400" : ""
                          }`}
                          style={{
                            color:
                              s.slot === slotsCompleted
                                ? ""
                                : "var(--text-primary)",
                          }}
                        >
                          {s.time}
                        </p>
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            s.priority === "RED"
                              ? "bg-red-500/20 text-red-500 border border-red-500/30 neon-glow-red"
                              : s.priority === "BLUE"
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 neon-glow-cyan"
                              : s.priority === "GREEN"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 neon-glow-emerald"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {s.priority}
                        </span>
                        {s.slot === slotsCompleted && (
                          <div className="flex items-center gap-1 bg-cyan-500 text-[#020617] px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter animate-pulse">
                            ACTIVE SECTOR
                          </div>
                        )}
                      </div>
                      <p
                        className="text-[11px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {s.geo} • {s.expectation}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEnabledAlarms((prev) => {
                            const next = prev.includes(s.slot)
                              ? prev.filter((id) => id !== s.slot)
                              : [...prev, s.slot];
                            localStorage.setItem(
                              "cpa:enabledAlarms",
                              JSON.stringify(next)
                            );
                            return next;
                          });
                        }}
                        className={`p-3 rounded-xl transition-all ${
                          enabledAlarms.includes(s.slot)
                            ? "bg-cyan-500 text-[#020617] shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                            : "hover:opacity-80 border"
                        }`}
                        style={{
                          backgroundColor: enabledAlarms.includes(s.slot)
                            ? ""
                            : "var(--card-bg)",
                          color: enabledAlarms.includes(s.slot)
                            ? ""
                            : "var(--text-dim)",
                          borderColor: enabledAlarms.includes(s.slot)
                            ? ""
                            : "var(--card-border)",
                        }}
                      >
                        {enabledAlarms.includes(s.slot) ? (
                          <Bell size={16} />
                        ) : (
                          <BellOff size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "analytics" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              {/* TOP ANALYTICS HIGHLIGHTS */}
              <div className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl opacity-20"
                  style={{ backgroundColor: "var(--text-dim)" }}
                />

                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/30">
                    <Activity size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <h2
                      className="text-lg font-black uppercase italic tracking-tighter"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Performance Engine
                    </h2>
                    <p
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Live Yield & Delta Analysis
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div
                    className="glass-card rounded-3xl p-6 text-left relative overflow-hidden border-none"
                    style={{ backgroundColor: "var(--bg-primary)" }}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400 mb-2">
                      Real-time Velocity
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p
                        className="text-2xl font-black italic font-mono"
                        style={{ color: "var(--text-primary)" }}
                      >
                        ${analyticsEngine.velocity.toFixed(2)}
                      </p>
                      <span className="text-[10px] font-black uppercase opacity-40">
                        /hr
                      </span>
                    </div>
                  </div>

                  <div
                    className="glass-card rounded-3xl p-6 text-left relative overflow-hidden border-none"
                    style={{ backgroundColor: "var(--bg-primary)" }}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">
                      Yield Efficiency
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p
                        className="text-2xl font-black italic font-mono"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {analyticsEngine.yield.toFixed(1)}
                      </p>
                      <span className="text-[10px] font-black uppercase opacity-40">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="p-4 rounded-2xl flex items-center justify-between"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Growth Trace
                    </span>
                  </div>
                  <span className="text-xs font-black italic text-cyan-400">
                    +
                    {checkpoints.length > 0
                      ? (revenueSoFar - (checkpoints[0]?.revenue || 0)).toFixed(
                          2
                        )
                      : "0.00"}{" "}
                    today
                  </span>
                </div>

                {/* INTRADAY LINE CHART */}
                <div className="glass-card p-4 rounded-2xl flex justify-center relative overflow-hidden mt-6">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/20 to-transparent" />
                  {intradayChartData.length > 1 ? (
                    <MiniLineChart
                      data={intradayChartData}
                      width={280}
                      height={80}
                      color="#06b6d4"
                    />
                  ) : (
                    <div className="h-20 w-fit px-8 flex items-center justify-center border border-dashed border-cyan-500/20 rounded-xl bg-cyan-500/5">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-cyan-400">
                        Awaiting Sync Data
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* GROWTH LOGS (THE NEW LOG VIEW) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Sync Log History
                  </h3>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {analyticsEngine.logs.length} syncs
                  </span>
                </div>

                <div className="space-y-3">
                  {analyticsEngine.logs.length > 0 ? (
                    analyticsEngine.logs.map((log, i) => (
                      <div
                        key={i}
                        className="glass-card rounded-3xl p-5 flex items-center justify-between group hover:scale-[1.01] transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner"
                            style={{ backgroundColor: "var(--bg-primary)" }}
                          >
                            {SCHEDULE[log.slot - 1]?.emoji || "⚙️"}
                          </div>
                          <div>
                            <p
                              className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                              style={{ color: "var(--text-dim)" }}
                            >
                              Sector {log.slot} •{" "}
                              {new Date(log.time).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                            <p
                              className="text-sm font-black italic tracking-tighter"
                              style={{ color: "var(--text-primary)" }}
                            >
                              Sync Balance: ${(log.revenue || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-emerald-400 font-mono italic leading-none">
                              +{(log.delta || 0).toFixed(2)}
                            </span>
                            <p className="text-[7px] font-black uppercase opacity-40">
                              DELTA
                            </p>
                          </div>

                          {log.projected && (
                            <div
                              className="flex flex-col items-end pt-1 border-t"
                              style={{ borderTopColor: "var(--card-border)" }}
                            >
                              <span className="text-[9px] font-black text-cyan-400/70 font-mono leading-none">
                                ${(log.projected || 0).toFixed(2)}
                              </span>
                              <p className="text-[6px] font-black uppercase opacity-30 tracking-tighter">
                                PROJ @ SYNC
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      className="glass-card rounded-3xl p-12 text-center opacity-40"
                      style={{ borderStyle: "dashed" }}
                    >
                      <p className="text-xs font-black uppercase tracking-widest">
                        Waiting for Sync Data
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === "history" && (
            <ErrorBoundary>
              <div className="space-y-4 pb-20">
                {/* VISUAL ANALYTICS DASHBOARD */}
                <div className="grid grid-cols-2 gap-3">
                  {/* WEEKLY TREND (BAR CHART) */}
                  <div className="col-span-2 glass-card rounded-3xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <BarChart2 size={64} className="text-cyan-400" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-cyan-400 relative z-10">
                      Weekly Velocity
                    </h3>
                    <div className="relative z-10 flex justify-center">
                      <WeeklyBarChart
                        data={weeklyChartData}
                        width={280}
                        height={100}
                      />
                    </div>
                  </div>

                  {/* SECTOR DOMINANCE (PIE CHART) */}
                  <div className="glass-card rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden min-h-[160px]">
                    <div className="absolute top-0 left-0 p-2 opacity-10">
                      <PieChart size={48} className="text-emerald-400" />
                    </div>
                    <h3 className="text-[9px] font-black uppercase tracking-widest mb-4 text-emerald-400 relative z-10 w-full text-left ml-4">
                      Earnings Distribution
                    </h3>
                    <div className="relative z-10 w-full flex justify-center">
                      <MiniPieChart data={sectorDistributionData} size={100} />
                    </div>
                  </div>

                  {/* WEEKLY STAT SUMMARY */}
                  <div className="glass-card rounded-3xl p-5 flex flex-col justify-center gap-1">
                    <p
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      7-Day Total
                    </p>
                    <p className="text-2xl font-black italic text-cyan-400 font-mono tracking-tighter">
                      $
                      {weeklyChartData
                        .reduce((acc, curr) => acc + curr.value, 0)
                        .toFixed(2)}
                    </p>
                    <div
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md w-fit mt-1 uppercase tracking-widest ${
                        weeklyChartData.filter((d) => d.success).length >= 4
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {weeklyChartData.filter((d) => d.success).length >= 4
                        ? "On Target"
                        : "Needs Scale"}
                    </div>
                  </div>
                </div>

                {/* MISSION LOG (CALENDAR) AT TOP */}
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6 px-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                      Mission Log
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCalendarDate(
                            new Date(
                              calendarDate.setMonth(calendarDate.getMonth() - 1)
                            )
                          )
                        }
                        className="p-2.5 rounded-xl transition-colors"
                        style={{
                          backgroundColor: "var(--card-bg)",
                          border: "1px solid var(--card-border)",
                        }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[10px] font-black uppercase italic tracking-widest bg-cyan-400 text-[#020617] px-3 py-1 rounded-lg">
                        {calendarDate.toLocaleDateString("default", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <button
                        onClick={() =>
                          setCalendarDate(
                            new Date(
                              calendarDate.setMonth(calendarDate.getMonth() + 1)
                            )
                          )
                        }
                        className="p-2.5 rounded-xl transition-colors"
                        style={{
                          backgroundColor: "var(--card-bg)",
                          border: "1px solid var(--card-border)",
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                      <div
                        key={i}
                        className="text-center text-[8px] font-black uppercase"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({
                      length: new Date(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth(),
                        1
                      ).getDay(),
                    }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square"></div>
                    ))}
                    {Array.from({
                      length: new Date(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth() + 1,
                        0
                      ).getDate(),
                    }).map((_, i) => {
                      const d = i + 1;
                      const dateKey = `${calendarDate.getFullYear()}-${String(
                        calendarDate.getMonth() + 1
                      ).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const dayData = history[dateKey];
                      const isToday = currentDay === dateKey;
                      return (
                        <button
                          key={d}
                          onClick={() =>
                            setEditingRecord({
                              date: dateKey,
                              revenue: dayData?.revenue || 0,
                              goal: dayData?.goal || dailyGoal,
                            })
                          }
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-black border ${
                            dayData
                              ? dayData.revenue >= (dayData.goal || dailyGoal)
                                ? "bg-emerald-500/20 border-emerald-500/40"
                                : "bg-red-500/10 border-red-500/20"
                              : isToday
                              ? "bg-cyan-500/20 border-cyan-500/40"
                              : "border"
                          }`}
                          style={{
                            backgroundColor:
                              dayData || isToday ? "" : "var(--card-bg)",
                            borderColor:
                              dayData || isToday ? "" : "var(--card-border)",
                          }}
                        >
                          <span
                            style={{ color: isToday ? "" : "var(--text-dim)" }}
                            className={isToday ? "text-cyan-400" : ""}
                          >
                            {d}
                          </span>
                          {dayData && (
                            <span
                              className="text-[7px]"
                              style={{ color: "var(--text-dim)" }}
                            >
                              $
                              {dayData.revenue >= 1000
                                ? `${(dayData.revenue / 1000).toFixed(1)}k`
                                : dayData.revenue.toFixed(0)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* COLLAPSIBLE SECTIONS */}
                <div className="space-y-3">
                  {/* Pattern Recognition */}
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <button
                      onClick={() =>
                        setCollapsedSections((prev) => ({
                          ...prev,
                          pattern: !prev.pattern,
                        }))
                      }
                      className="w-full flex items-center justify-between p-4"
                      style={{ backgroundColor: "var(--card-bg)" }}
                    >
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                        Pattern Recognition
                      </h3>
                      {collapsedSections.pattern ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronUp size={14} />
                      )}
                    </button>
                    {!collapsedSections.pattern && analytics && (
                      <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between">
                          <span
                            className="text-[10px] font-black uppercase"
                            style={{ color: "var(--text-dim)" }}
                          >
                            Weekly Total
                          </span>
                          <span className="text-base font-black italic text-emerald-400 font-mono">
                            ${analytics.weekTotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className="text-[10px] font-black uppercase"
                            style={{ color: "var(--text-dim)" }}
                          >
                            Daily Avg
                          </span>
                          <span className="text-base font-black italic text-cyan-400 font-mono">
                            ${analytics.avgDaily.toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-3 pt-3">
                          <div>
                            <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                              <span className="text-red-500">RED Hit Rate</span>
                              <span className="text-red-500">
                                {analytics.redRate.toFixed(0)}%
                              </span>
                            </div>
                            <div
                              className="h-1 rounded-full overflow-hidden"
                              style={{ backgroundColor: "var(--card-border)" }}
                            >
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${analytics.redRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tactical Milestones */}
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <button
                      onClick={() =>
                        setCollapsedSections((prev) => ({
                          ...prev,
                          milestones: !prev.milestones,
                        }))
                      }
                      className="w-full flex items-center justify-between p-4"
                      style={{ backgroundColor: "var(--card-bg)" }}
                    >
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                        Tactical Milestones
                      </h3>
                      {collapsedSections.milestones ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronUp size={14} />
                      )}
                    </button>
                    {!collapsedSections.milestones && analytics && (
                      <div className="p-5 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                          <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">
                            Peak Operation
                          </p>
                          <p
                            className="text-xl font-black italic font-mono"
                            style={{ color: "var(--text-primary)" }}
                          >
                            ${analytics.bestDay?.revenue.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                          <p className="text-[8px] font-black text-red-400 uppercase mb-1">
                            Lowest Sector
                          </p>
                          <p className="text-xl font-black italic text-red-400 font-mono">
                            ${analytics.worstDay?.revenue.toFixed(2) || "0.00"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slot Performance Analysis */}
                  {Object.keys(history).length >= 3 && (
                    <div className="glass-card rounded-2xl overflow-hidden">
                      <button
                        onClick={() =>
                          setCollapsedSections((prev) => ({
                            ...prev,
                            performance: !prev.performance,
                          }))
                        }
                        className="w-full flex items-center justify-between p-4"
                        style={{ backgroundColor: "var(--card-bg)" }}
                      >
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                          Slot Performance
                        </h3>
                        {collapsedSections.performance ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronUp size={14} />
                        )}
                      </button>
                      {!collapsedSections.performance && (
                        <div className="p-5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          {calculateSlotPerformance()
                            .slice(0, 5)
                            .map((slot) => (
                              <div
                                key={slot.slot}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{slot.emoji}</span>
                                  <span className="text-[10px] font-black">
                                    Slot {slot.slot}
                                  </span>
                                </div>
                                <span className="text-sm font-black text-emerald-400 font-mono">
                                  {slot.hitRate}%
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Intraday Timeline remains at bottom for history context */}
                {checkpoints.length > 0 && (
                  <div className="glass-card rounded-3xl p-6 border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-4">
                      Intraday Timeline
                    </h3>
                    <div className="space-y-2">
                      {checkpoints.map((cp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 rounded-xl border"
                          style={{
                            backgroundColor: "var(--card-bg)",
                            borderColor: "var(--card-border)",
                          }}
                        >
                          <div
                            className="text-[10px] font-black uppercase"
                            style={{ color: "var(--text-dim)" }}
                          >
                            Slot {cp.slot} •{" "}
                            {new Date(cp.time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-lg font-black text-cyan-400 font-mono">
                            ${cp.revenue.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline Editing Interface */}
                {editingRecord && (
                  <div className="glass-card rounded-[2.5rem] p-8 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                        Edit Tactical Record: {editingRecord.date}
                      </h3>
                      <button
                        onClick={() => setEditingRecord(null)}
                        className="p-2 text-white/20 hover:text-white transition-colors bg-white/5 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="group">
                          <label
                            className="block text-[10px] font-black uppercase tracking-widest mb-3 group-hover:text-cyan-400 transition-colors"
                            style={{ color: "var(--text-dim)" }}
                          >
                            Revenue ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingRecord.revenue}
                            onChange={(e) =>
                              setEditingRecord({
                                ...editingRecord,
                                revenue: e.target.value,
                              })
                            }
                            className="w-full rounded-2xl px-6 py-4 text-base font-black focus:ring-2 focus:ring-cyan-500/50 transition-all italic"
                            style={{
                              backgroundColor: "var(--card-bg)",
                              border: "1px solid var(--card-border)",
                              color: "var(--text-primary)",
                            }}
                          />
                        </div>
                        <div className="group">
                          <label
                            className="block text-[10px] font-black uppercase tracking-widest mb-3 group-hover:text-cyan-400 transition-colors"
                            style={{ color: "var(--text-dim)" }}
                          >
                            Goal ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingRecord.goal}
                            onChange={(e) =>
                              setEditingRecord({
                                ...editingRecord,
                                goal: e.target.value,
                              })
                            }
                            className="w-full rounded-2xl px-6 py-4 text-base font-black focus:ring-2 focus:ring-cyan-500/50 transition-all italic"
                            style={{
                              backgroundColor: "var(--card-bg)",
                              border: "1px solid var(--card-border)",
                              color: "var(--text-primary)",
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={() =>
                            handleSaveHistory(
                              editingRecord.date,
                              editingRecord.revenue,
                              editingRecord.goal
                            )
                          }
                          className="flex-1 bg-cyan-500 text-[#020617] py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Commit Record
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteHistory(editingRecord.date)
                          }
                          className="px-8 bg-red-500/10 text-red-400 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-500/10 hover:bg-red-500/20 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Details */}
                <div className="space-y-4">
                  <h3
                    className="text-xs font-black uppercase tracking-[0.3em] px-1"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Mission Log Archive
                  </h3>
                  {Object.entries(history)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .slice(0, 7)
                    .map(([date, stats]) => (
                      <React.Fragment key={date}>
                        <button
                          onClick={() =>
                            setEditingRecord({
                              date,
                              revenue: stats.revenue,
                              goal: stats.goal,
                            })
                          }
                          className="w-full glass-card p-6 rounded-[2rem] flex items-center justify-between transition-all text-left group"
                        >
                          <div className="space-y-1">
                            <p
                              className="text-[11px] font-black uppercase tracking-widest"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {new Date(date).toLocaleDateString()}
                            </p>
                            <p className="text-2xl font-black italic text-cyan-400 font-mono tracking-tighter">
                              ${(stats.revenue || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right space-y-2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full ${
                                stats.revenue >= (stats.goal || dailyGoal)
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/10"
                              }`}
                            >
                              {stats.revenue >= (stats.goal || dailyGoal)
                                ? "SUCCESS"
                                : "DEVIATION"}
                            </span>
                            {stats.logs && stats.logs.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedArchiveDate(
                                    selectedArchiveDate === date ? null : date
                                  );
                                }}
                                className="text-[9px] font-black uppercase tracking-widest text-cyan-400 hover:underline"
                              >
                                {selectedArchiveDate === date
                                  ? "Hide Logs"
                                  : `View Logs (${stats.logs.length})`}
                              </button>
                            )}
                            <p
                              className="text-[10px] font-black uppercase tracking-tighter"
                              style={{ color: "var(--text-dim)" }}
                            >
                              TARGET VECTOR: ${stats.goal || dailyGoal}
                            </p>
                          </div>
                        </button>
                        {/* Expandable Sync Log Archive */}
                        {selectedArchiveDate === date && stats.logs && (
                          <div className="mt-3 p-4 glass-card rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                Sync Log Archive
                              </h4>
                              <span
                                className="text-[9px] font-bold italic"
                                style={{ color: "var(--text-dim)" }}
                              >
                                {stats.logs.length} Checkpoints
                              </span>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                              {stats.logs.map((log, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                                    log.isClosing
                                      ? "bg-emerald-500/10 border border-emerald-500/20"
                                      : "bg-[var(--card-bg)] border border-[var(--card-border)]"
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <p
                                      className="text-[10px] font-bold"
                                      style={{ color: "var(--text-dim)" }}
                                    >
                                      {new Date(log.time).toLocaleTimeString(
                                        [],
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }
                                      )}
                                      <span className="ml-2 text-cyan-500">
                                        Slot {log.slot}
                                      </span>
                                      {log.isClosing && (
                                        <span className="ml-2 text-emerald-400 font-black">
                                          📋 RECONCILED
                                        </span>
                                      )}
                                    </p>
                                    <p
                                      className="text-base font-black italic font-mono"
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      ${(log.revenue || 0).toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`text-sm font-black italic ${
                                        (log.delta || 0) >= 0
                                          ? "text-emerald-400"
                                          : "text-red-400"
                                      }`}
                                    >
                                      {(log.delta || 0) >= 0 ? "+" : ""}$
                                      {(log.delta || 0).toFixed(2)}
                                    </p>
                                    <p
                                      className="text-[9px] font-bold"
                                      style={{ color: "var(--text-dim)" }}
                                    >
                                      Proj: ${(log.projected || 0).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* HISTORICAL INTRADAY GRAPH */}
                            <div className="pt-2 border-t border-[var(--card-border)]">
                              <p className="text-[8px] font-black uppercase tracking-widest mb-3 opacity-50 text-center">
                                Intraday Momentum Visualizer
                              </p>
                              <div className="flex justify-center">
                                <MiniLineChart
                                  data={(stats.logs || []).map((l) => ({
                                    value: l.revenue || 0,
                                    label: `S${l.slot}`,
                                  }))}
                                  width={240}
                                  height={60}
                                  color="#10b981"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                </div>
              </div>
            </ErrorBoundary>
          )}
        </main>

        {/* BOTTOM NAVIGATION DOCK (FIXED WIDTH) */}
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 glass-card rounded-full z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[calc(100%-2rem)] max-w-sm justify-between text-[var(--text-dim)]">
          <button
            onClick={() => setView("tracker")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all duration-500 flex-1 ${
              view === "tracker"
                ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                : "hover:text-cyan-400"
            }`}
            style={{ color: view === "tracker" ? "" : "var(--text-dim)" }}
          >
            <TrendingUp
              size={16}
              className={view === "tracker" ? "animate-pulse" : ""}
            />
            <span className="text-[9px] font-black uppercase tracking-widest">
              Dash
            </span>
          </button>

          <button
            onClick={() => setView("analytics")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all duration-500 flex-1 ${
              view === "analytics"
                ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,185,129,0.1)]"
                : "hover:text-cyan-400"
            }`}
            style={{ color: view === "analytics" ? "" : "var(--text-dim)" }}
          >
            <PieChart
              size={16}
              className={view === "analytics" ? "animate-pulse" : ""}
            />
            <span className="text-[9px] font-black uppercase tracking-widest">
              Stats
            </span>
          </button>

          <button
            onClick={() => setView("history")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all duration-500 flex-1 ${
              view === "history"
                ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                : "hover:text-cyan-400"
            }`}
            style={{ color: view === "history" ? "" : "var(--text-dim)" }}
          >
            <History
              size={16}
              className={view === "history" ? "animate-pulse" : ""}
            />
            <span className="text-[9px] font-black uppercase tracking-widest">
              Logs
            </span>
          </button>

          <button
            onClick={() => setView("schedule")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all duration-500 flex-1 ${
              view === "schedule"
                ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                : "hover:text-cyan-400"
            }`}
            style={{ color: view === "schedule" ? "" : "var(--text-dim)" }}
          >
            <Clock
              size={16}
              className={view === "schedule" ? "animate-spin-slow" : ""}
            />
            <span className="text-[9px] font-black uppercase tracking-widest">
              Alarms
            </span>
          </button>
        </nav>

        {/* FACTORY RESET MODAL (GLASS STYLE) */}
        {showResetModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 transition-all duration-300">
            <div
              className={`absolute inset-0 backdrop-blur-xl animate-in fade-in duration-300 ${
                isDarkMode ? "bg-[#020617]/90" : "bg-slate-900/40"
              }`}
              onClick={() => setShowResetModal(false)}
            />
            <div className="relative w-full max-w-sm glass-card rounded-[2.5rem] p-8 text-center animate-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(239,68,68,0.3)] border-red-500/30">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/30">
                <AlertTriangle
                  size={32}
                  className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                />
              </div>

              <div className="mb-8 space-y-3">
                <h3
                  className="text-xl font-black uppercase italic tracking-tighter"
                  style={{ color: "var(--text-primary)" }}
                >
                  Atomic Reset
                </h3>
                <p
                  className="text-sm font-medium leading-relaxed px-2"
                  style={{ color: "var(--text-dim)" }}
                >
                  This will wipe all local data, checkpoints, and history. This
                  action is irreversible.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    localStorage.removeItem("cpa:history");
                    localStorage.removeItem("cpa:config");
                    localStorage.removeItem("cpa:checkpoints");
                    Object.keys(localStorage).forEach((key) => {
                      if (key.startsWith("cpa:")) {
                        localStorage.removeItem(key);
                      }
                    });
                    window.location.reload();
                  }}
                  className="w-full py-4 rounded-xl bg-red-500 text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Execute Wipe
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 font-black uppercase tracking-widest text-xs transition-colors"
                  style={{ color: "var(--text-dim)" }}
                >
                  Abort Mission
                </button>
              </div>
            </div>
          </div>
        )}
        {/* SESSION RECONCILIATION POPUP (AIRPODS STYLE) */}
        {pendingReconciliation && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center px-4 pb-1 group/reconcile">
            <div
              className={`absolute inset-0 backdrop-blur-sm animate-in fade-in duration-500 ${
                isDarkMode ? "bg-[#020617]/40" : "bg-slate-900/10"
              }`}
            />
            <div className="relative w-full max-w-lg glass-card rounded-[3rem] p-8 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-700 ease-out border-b-0 rounded-b-none mb-[-4px]">
              <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8 cursor-grab active:cursor-grabbing" />

              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <CheckCircle className="text-emerald-400" size={32} />
                </div>
                <div>
                  <h2
                    className="text-2xl font-black italic tracking-tighter"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Mission Recap
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                    Day Ended: {pendingReconciliation.date}
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                <div
                  className="p-6 rounded-3xl relative overflow-hidden"
                  style={{ backgroundColor: "var(--card-bg)" }}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-500/20" />
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Last Logged Revenue
                  </p>
                  <p
                    className="text-3xl font-black italic font-mono"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ${pendingReconciliation.revenue.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-3">
                  <label
                    className="text-[11px] font-black uppercase tracking-widest block px-1"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Absolute Final Dashboard Total
                  </label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black italic text-cyan-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={reconcileDraft}
                      onChange={(e) => setReconcileDraft(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#020617] border-2 border-cyan-500/20 rounded-[2rem] py-8 pl-14 pr-8 text-4xl font-black italic font-mono focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all placeholder:text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 px-2 leading-relaxed italic">
                    Input exactly what you see on your CPAGrip Dashboard to seal
                    the records for this mission.
                  </p>
                </div>

                <button
                  onClick={handleReconcile}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#020617] font-black italic py-7 rounded-[2rem] transition-all shadow-[0_20px_40px_rgba(6,182,212,0.2)] active:scale-[0.98] uppercase tracking-widest text-base mb-2"
                >
                  Confirm & Lock Archive
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- ROOT APP COMPONENT (ERROR BOUNDARY SHELL) ---
export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
