export type Mood = "Cold" | "Hot" | "Windy" | "Uncomfortable" | "Pleasant" | "Mild" | "Moderate";

export function getWeatherMood(tempC: number, humidity: number, windKph: number): Mood {
  // Strict priority order as specified
  if (tempC < 12) return "Cold";
  if (tempC > 32) return "Hot";
  if (windKph > 25) return "Windy";
  if ((humidity > 75 && tempC > 28) || humidity > 85) return "Uncomfortable";
  if (tempC >= 18 && tempC <= 26 && humidity <= 65 && windKph <= 20) return "Pleasant";
  return "Mild";
  // Note: spec says "Mild / Moderate" fallback — we use "Mild"
}

export function moodStyles(mood: Mood) {
  switch (mood) {
    case "Cold":
      return "bg-sky-100 text-sky-800 border-sky-200 ring-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800";
    case "Hot":
      return "bg-amber-100 text-amber-800 border-amber-200 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800";
    case "Windy":
      return "bg-slate-200 text-slate-800 border-slate-300 ring-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600";
    case "Uncomfortable":
      return "bg-rose-100 text-rose-800 border-rose-200 ring-rose-300 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800";
    case "Pleasant":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";
    case "Mild":
    case "Moderate":
    default:
      return "bg-zinc-100 text-zinc-800 border-zinc-200 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700";
  }
}

export function moodEmoji(mood: Mood) {
  switch (mood) {
    case "Cold": return "❄️";
    case "Hot": return "🔥";
    case "Windy": return "💨";
    case "Uncomfortable": return "🥵";
    case "Pleasant": return "😊";
    default: return "🌤️";
  }
}
