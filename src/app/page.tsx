"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search, X, MapPin, Droplets, Wind, Thermometer, Gauge, Sun, Clock, CloudSun,
  Copy, Check, ChevronDown, Eye, Code2, Loader2, AlertTriangle, CloudOff, Sparkles,
  Cloud, CloudRain, Snowflake, Zap, Sunrise
} from "lucide-react";
import { getWeatherMood, moodStyles, moodEmoji, Mood } from "@/lib/weatherMood";

// --- Types for WeatherAPI ---
type WeatherData = {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime: string;
    localtime_epoch: number;
  };
  current: {
    last_updated: string;
    temp_c: number;
    temp_f: number;
    is_day: number;
    condition: { text: string; icon: string; code: number };
    wind_mph: number;
    wind_kph: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    windchill_c: number;
    windchill_f: number;
    heatindex_c: number;
    heatindex_f: number;
    dewpoint_c: number;
    dewpoint_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
  };
};

const POPULAR_CITIES = [
  "New York", "London", "Tokyo", "Paris", "Sydney", "Dubai", "Singapore", "Mumbai", "Toronto", "Berlin"
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

// --- JSON Viewer Component ---
function JsonNode({ data, name, depth = 0, isLast = true }: { data: any; name?: string; depth?: number; isLast?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const isObject = data !== null && typeof data === "object";
  const isArray = Array.isArray(data);
  const keys = isObject ? Object.keys(data) : [];
  const isEmpty = isObject && keys.length === 0;
  const indent = depth * 16;

  if (!isObject) {
    const type = data === null ? "null" : typeof data;
    const color =
      type === "string" ? "text-emerald-600 dark:text-emerald-400" :
      type === "number" ? "text-amber-600 dark:text-amber-400" :
      type === "boolean" ? "text-sky-600 dark:text-sky-400" :
      "text-zinc-500 dark:text-zinc-400";
    const display = type === "string" ? `"${data}"` : String(data);
    return (
      <div style={{ paddingLeft: indent }} className="flex gap-1.5 py-0.5 font-mono text-[13px] leading-5">
        <span className="text-slate-400 select-none w-6 text-right shrink-0 text-[12px]">{depth+1}</span>
        {name !== undefined && <><span className="text-violet-600 dark:text-violet-400">"{name}"</span><span className="text-slate-500">:</span></>}
        <span className={color}>{display}</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div style={{ paddingLeft: indent }} className="flex gap-1.5 font-mono text-[13px]">
        <span className="text-slate-400 select-none w-6 text-right shrink-0 text-[12px]">{depth+1}</span>
        {name !== undefined && <><span className="text-violet-600 dark:text-violet-400">"{name}"</span><span className="text-slate-500">:</span></>}
        <span className="text-slate-500">{isArray ? "[]" : "{}"}</span>{!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  const bracketOpen = isArray ? "[" : "{";
  const bracketClose = isArray ? "]" : "}";

  return (
    <div className="font-mono text-[13px]">
      <div style={{ paddingLeft: indent }} className="flex items-center gap-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded">
        <span className="text-slate-400 select-none w-6 text-right shrink-0 text-[12px]">{depth+1}</span>
        <button onClick={() => setCollapsed(!collapsed)} className="size-4 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center shrink-0">
          <ChevronDown className={`size-3 text-slate-500 transition ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        {name !== undefined && <><span className="text-violet-600 dark:text-violet-400">"{name}"</span><span className="text-slate-500">:</span></>}
        <span className="text-slate-500">{bracketOpen}</span>
        {collapsed && <span className="text-slate-400 ml-1">… {bracketClose} {!isLast && ","} <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1 rounded">{keys.length} items</span></span>}
      </div>
      {!collapsed && (
        <>
          {keys.map((k, i) => (
            <JsonNode key={k} data={data[k]} name={isArray ? undefined : k} depth={depth + 1} isLast={i === keys.length - 1} />
          ))}
          <div style={{ paddingLeft: indent }} className="flex gap-1 text-slate-500">
            <span className="text-slate-400 select-none w-6 text-right shrink-0 text-[12px]"></span>
            <span className="ml-5">{bracketClose}{!isLast && ","}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [inspectorMode, setInspectorMode] = useState<"formatted" | "raw">("formatted");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [payloadSize, setPayloadSize] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchWeather = async (city: string) => {
    if (!city.trim()) {
      setError("Please enter a city name.");
      setErrorStatus(400);
      return;
    }
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    const t0 = performance.now();
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city.trim())}`);
      const json = await res.json();
      const t1 = performance.now();
      setLatency(Math.round(t1 - t0));
      if (!res.ok) {
        const msg = json.error || "Failed to fetch";
        setError(msg);
        setErrorStatus(res.status);
        setData(null);
        setPayloadSize(JSON.stringify(json).length);
        return;
      }
      setData(json);
      setPayloadSize(JSON.stringify(json).length);
      setActiveCity(city.trim());
      setQuery(city.trim());
    } catch (e: any) {
      setError(e?.message || "Network error. Please try again.");
      setErrorStatus(500);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchWeather(query);
  const handleChip = (city: string) => fetchWeather(city);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const tempDisplay = (d: WeatherData) => unit === "C" ? `${Math.round(d.current.temp_c)}°C` : `${Math.round(d.current.temp_f)}°F`;
  const feelsDisplay = (d: WeatherData) => unit === "C" ? `${Math.round(d.current.feelslike_c)}°C` : `${Math.round(d.current.feelslike_f)}°F`;
  const windDisplay = (d: WeatherData) => unit === "C" ? `${d.current.wind_kph} km/h` : `${d.current.wind_mph} mph`;

  const mood: Mood | null = data ? getWeatherMood(data.current.temp_c, data.current.humidity, data.current.wind_kph) : null;

  const copyJson = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Weather icon helper
  const ConditionIcon = ({ code, isDay, size = 56 }: { code: number; isDay: number; size?: number }) => {
    // simple mapping
    if (code === 1000) return <Sun className="text-amber-500" style={{ width: size, height: size }} />;
    if ([1003, 1006, 1009].includes(code)) return <Cloud className="text-slate-400" style={{ width: size, height: size }} />;
    if ([1063, 1180, 1183, 1240].includes(code)) return <CloudRain className="text-sky-500" style={{ width: size, height: size }} />;
    if ([1114, 1210, 1213, 1222].includes(code)) return <Snowflake className="text-sky-300" style={{ width: size, height: size }} />;
    if ([1087, 1273, 1276].includes(code)) return <Zap className="text-amber-400" style={{ width: size, height: size }} />;
    return <CloudSun className="text-amber-500" style={{ width: size, height: size }} />;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <CloudSun className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-slate-900 dark:text-white leading-none">WeatherScope</h1>
              <p className="text-[11px] font-medium tracking-widest uppercase text-slate-500 dark:text-slate-400">Real-time Intelligence • Vercel Ready</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden lg:inline">Secure proxy</span>
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">/api/weather</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Search location</h2>
            <span className="ml-auto text-xs text-slate-400">Press Enter ↵</span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 group-focus-within:text-indigo-500 transition" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search city — e.g. Paris, Tokyo, Mumbai..."
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none text-[15px] placeholder:text-slate-400 transition"
              />
              {query && (
                <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="h-11 px-5 sm:px-6 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-sm hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-md transition"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4 hidden sm:block" />}
              Search
            </button>
          </div>

          {/* Chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {POPULAR_CITIES.map((c) => {
              const active = activeCity?.toLowerCase() === c.toLowerCase() && !!data;
              return (
                <button
                  key={c}
                  onClick={() => handleChip(c)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-md scale-[1.02]"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Inline validation / error */}
          {error && (
            <div className={`mt-4 rounded-xl border px-4 py-3 flex items-start gap-3 text-sm ${
              errorStatus === 400 || error?.toLowerCase().includes("not found")
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
            }`}>
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">
                  {errorStatus === 400 || error?.toLowerCase().includes("not found") ? "City not found. Please check spelling." : error}
                </p>
                {(errorStatus === 401 || errorStatus === 429 || errorStatus === 500) && (
                  <p className="text-xs opacity-80 mt-1">Network/Rate limit error. Please retry in a moment.</p>
                )}
              </div>
              <button onClick={() => query && fetchWeather(query)} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-current/20 text-xs font-medium hover:bg-black/5 shrink-0">Retry</button>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-5 gap-6 mt-6">
          {/* Weather Card */}
          <div className="lg:col-span-3">
            {!data && !loading ? (
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900 rounded-[20px] border border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-10 text-center">
                <div className="size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-4">
                  <Sunrise className="size-7 text-indigo-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Welcome to WeatherScope</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">Search a city or tap a popular location chip to view live meteorological metrics, mood classification, and raw API payload.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-slate-400">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">°C / °F Toggle</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Weather Mood Engine</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">JSON Inspector</span>
                </div>
              </div>
            ) : loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-pulse">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded mt-2" />
                <div className="flex gap-4 mt-6">
                  <div className="size-16 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                  <div className="space-y-3 flex-1">
                    <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
                </div>
              </div>
            ) : data ? (
              <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Top banner with mood */}
                <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
                <div className="p-6 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                      <MapPin className="size-4 text-slate-400" />
                      <span className="font-medium text-slate-900 dark:text-white">{data.location.name}</span>
                      <span>• {data.location.region ? `${data.location.region}, ` : ""}{data.location.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {mood && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${moodStyles(mood)}`}>
                          <span>{moodEmoji(mood)}</span> {mood}
                        </span>
                      )}
                      <div className="flex items-center rounded-full border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
                        <button onClick={() => setUnit("C")} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${unit === "C" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow" : "text-slate-500"}`}>°C</button>
                        <button onClick={() => setUnit("F")} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${unit === "F" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow" : "text-slate-500"}`}>°F</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <Clock className="size-3.5" /> Local time: {data.location.localtime} <span className="mx-1">•</span> {data.location.tz_id} <span className="mx-1">•</span> Updated {data.current.last_updated}
                  </div>

                  <div className="flex items-center gap-5 mt-6">
                    <div className="size-[72px] rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {/* Use WeatherAPI icon via img fallback plus lucide */}
                      <img src={`https:${data.current.condition.icon}`} alt={data.current.condition.text} className="size-14 object-contain" onError={(e) => (e.currentTarget.style.display='none')} />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">{tempDisplay(data)}</span>
                        <span className="text-sm font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{data.current.is_day ? "Day" : "Night"}</span>
                      </div>
                      <p className="text-[15px] font-medium text-slate-700 dark:text-slate-200 mt-1">{data.current.condition.text}</p>
                      <p className="text-xs text-slate-500">Feels like {feelsDisplay(data)} • Cloud {data.current.cloud}%</p>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-7">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"><Droplets className="size-3.5 text-sky-500" /> Humidity</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{data.current.humidity}%</div>
                      <div className="text-xs text-slate-500">{data.current.humidity > 75 ? "High" : data.current.humidity < 40 ? "Low" : "Comfortable"}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"><Wind className="size-3.5 text-slate-500" /> Wind</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{windDisplay(data)}</div>
                      <div className="text-xs text-slate-500">{data.current.wind_dir} • Gust {unit==="C" ? data.current.gust_kph+" km/h" : data.current.gust_mph+" mph"}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"><Thermometer className="size-3.5 text-rose-500" /> Feels Like</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{feelsDisplay(data)}</div>
                      <div className="text-xs text-slate-500">UV Index {data.current.uv}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"><Gauge className="size-3.5 text-violet-500" /> Pressure</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{data.current.pressure_mb} mb</div>
                      <div className="text-xs text-slate-500">{data.current.pressure_in} in • Precip {data.current.precip_mm} mm</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"><Sun className="size-3.5 text-amber-500" /> UV Index</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{data.current.uv}</div>
                      <div className="text-xs text-slate-500">{data.current.uv >= 8 ? "Very High" : data.current.uv >=6 ? "High" : data.current.uv >=3 ? "Moderate" : "Low"}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"><Cloud className="size-3.5 text-sky-400" /> Visibility</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{unit==="C" ? data.current.vis_km+" km" : data.current.vis_miles+" mi"}</div>
                      <div className="text-xs text-slate-500">Cloud cover {data.current.cloud}%</div>
                    </div>
                  </div>

                  {/* Mood explanation */}
                  {mood && (
                    <div className="mt-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 px-4 py-3 flex gap-3">
                      <div className="size-8 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shrink-0 text-sm">{moodEmoji(mood)}</div>
                      <div className="text-sm">
                        <p className="font-semibold text-indigo-900 dark:text-indigo-200">Mood: {mood}</p>
                        <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 leading-relaxed">
                          {mood==="Cold" && "Temperature < 12°C — chilly conditions, layer up."}
                          {mood==="Hot" && "Temperature > 32°C — stay hydrated, limit sun exposure."}
                          {mood==="Windy" && "Wind > 25 km/h — blustery, secure loose items."}
                          {mood==="Uncomfortable" && "High humidity + heat — muggy and sticky, ventilation recommended."}
                          {mood==="Pleasant" && "18–26°C, humidity ≤65%, wind ≤20 km/h — ideal outdoor weather!"}
                          {mood==="Mild" && "Balanced conditions — no extreme tags, comfortable for most activities."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* JSON Inspector */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center">
                    <Code2 className="size-3.5 text-white dark:text-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-none">Developer Inspector</h3>
                    <p className="text-[11px] text-slate-500">Raw WeatherAPI payload</p>
                  </div>
                </div>
                <button onClick={() => setInspectorOpen(!inspectorOpen)} className="size-7 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center">
                  <ChevronDown className={`size-4 text-slate-500 transition ${inspectorOpen ? "" : "-rotate-90"}`} />
                </button>
              </div>

              {inspectorOpen && (
                <>
                  <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
                    <div className="flex rounded-full bg-slate-200 dark:bg-slate-800 p-1">
                      <button onClick={() => setInspectorMode("formatted")} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${inspectorMode==="formatted" ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                        <Eye className="size-3" /> Formatted
                      </button>
                      <button onClick={() => setInspectorMode("raw")} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${inspectorMode==="raw" ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                        <Code2 className="size-3" /> Raw
                      </button>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {data && (
                        <>
                          <span className="hidden sm:inline text-[11px] font-mono text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full">
                            {payloadSize ? formatBytes(payloadSize) : "—"} • {latency ? `${latency}ms` : "—"}
                          </span>
                          <button onClick={copyJson} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition">
                            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied!" : "Copy JSON"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-h-[380px] max-h-[520px] overflow-auto scrollbar-thin bg-[#fcfcfd] dark:bg-[#0b1220]">
                    {!data ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        <CloudOff className="size-8 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No payload yet</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Fetch weather for a city to inspect the full JSON response with syntax highlighting and line numbers.</p>
                        <div className="mt-4 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-left w-full max-w-[300px]">
                          <div className="text-slate-500">// Example endpoint</div>
                          <div className="text-indigo-600 dark:text-indigo-400">GET /api/weather?city=Tokyo</div>
                        </div>
                      </div>
                    ) : inspectorMode === "raw" ? (
                      <pre className="p-4 text-[12px] font-mono leading-5 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    ) : (
                      <div className="p-2">
                        <JsonNode data={data} depth={0} />
                      </div>
                    )}
                  </div>

                  {data && (
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className="size-2 rounded-full bg-emerald-500" /> 200 OK • api.weatherapi.com • {new Date().toLocaleTimeString()}
                      <span className="ml-auto">Latency {latency}ms • Size {payloadSize ? formatBytes(payloadSize) : "—"}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Info card */}
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="size-4" /> Weather Mood Engine</h4>
              <p className="text-xs text-white/80 mt-1 leading-relaxed">Algorithmic classification with strict priority: Cold → Hot → Windy → Uncomfortable → Pleasant → Mild.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Cold","Hot","Windy","Uncomfortable","Pleasant","Mild"].map(m => (
                  <span key={m} className="text-[11px] font-medium bg-white/15 backdrop-blur px-2 py-1 rounded-full border border-white/20">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-slate-500">
          <p>© 2026 WeatherScope • Built for Vercel • Secure proxy shields <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">WEATHER_API_KEY</span> from client inspection</p>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">Next.js App Router</span>
            <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">Tailwind CSS</span>
          </div>
        </footer>
      </main>

      {/* Toast */}
      {copied && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-sm font-medium z-50">
          <Check className="size-4 text-emerald-400 dark:text-emerald-600" /> JSON copied to clipboard
        </div>
      )}
    </div>
  );
}
