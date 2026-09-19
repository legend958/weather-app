import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");

  if (!city || !city.trim()) {
    return NextResponse.json({ error: "City parameter is required" }, { status: 400 });
  }

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server misconfiguration: WEATHER_API_KEY not set" }, { status: 500 });
  }

  const start = Date.now();
  try {
    const url = `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(city.trim())}&aqi=no`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    const latency = Date.now() - start;

    if (!res.ok) {
      // WeatherAPI returns { error: { code, message } }
      const message = data?.error?.message || "Failed to fetch weather data";
      const code = data?.error?.code || res.status;
      return NextResponse.json(
        { error: message, code, providerStatus: res.status },
        { status: res.status, headers: { "x-response-time": `${latency}ms` } }
      );
    }

    return NextResponse.json(data, {
      headers: { "x-response-time": `${latency}ms` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
