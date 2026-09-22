const WEATHER_CODES = {
  0: ["Ясно", "☀️"],
  1: ["Преимущественно ясно", "🌤️"],
  2: ["Переменная облачность", "⛅"],
  3: ["Пасмурно", "☁️"],
  45: ["Туман", "🌫️"],
  48: ["Изморозь и туман", "🌫️"],
  51: ["Лёгкая морось", "🌦️"],
  53: ["Морось", "🌦️"],
  55: ["Сильная морось", "🌧️"],
  61: ["Небольшой дождь", "🌦️"],
  63: ["Дождь", "🌧️"],
  65: ["Сильный дождь", "🌧️"],
  71: ["Небольшой снег", "🌨️"],
  73: ["Снег", "🌨️"],
  75: ["Сильный снег", "❄️"],
  80: ["Небольшие ливни", "🌦️"],
  81: ["Ливни", "🌧️"],
  82: ["Сильные ливни", "⛈️"],
  85: ["Снегопад", "🌨️"],
  86: ["Сильный снегопад", "❄️"],
  95: ["Гроза", "⛈️"],
  96: ["Гроза с градом", "⛈️"],
  99: ["Сильная гроза с градом", "⛈️"],
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }
  const date = String(request.query?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return response.status(400).json({ error: "Invalid date" });

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: "48.7080",
    longitude: "44.5133",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Europe/Moscow",
    forecast_days: "16",
  });

  try {
    const forecastResponse = await fetch(url, { headers: { Accept: "application/json" } });
    if (!forecastResponse.ok) throw new Error("Forecast request failed");
    const forecast = await forecastResponse.json();
    const index = forecast.daily?.time?.indexOf(date) ?? -1;
    if (index < 0) return response.status(404).json({ error: "Forecast unavailable" });
    const code = forecast.daily.weather_code[index];
    const [description, icon] = WEATHER_CODES[code] || ["Погода без особенностей", "🌤️"];
    response.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return response.status(200).json({
      description,
      icon,
      minTemperature: Math.round(forecast.daily.temperature_2m_min[index]),
      maxTemperature: Math.round(forecast.daily.temperature_2m_max[index]),
      precipitationProbability: Math.round(forecast.daily.precipitation_probability_max[index] || 0),
    });
  } catch {
    return response.status(502).json({ error: "Weather unavailable" });
  }
}
