import { Language, RealTimeInfo, Season, TimeOfDay, WeatherInfo, WeatherKind } from '../scene/types';

// Approximate coordinates for major global IANA timezones so live local weather
// works immediately without intrusive geolocation popups.
const TIMEZONE_COORDS: Record<string, [number, number]> = {
  'Asia/Shanghai': [31.23, 121.47],
  'Asia/Chongqing': [29.56, 106.55],
  'Asia/Harbin': [45.8, 126.53],
  'Asia/Urumqi': [43.82, 87.62],
  'Asia/Hong_Kong': [22.32, 114.17],
  'Asia/Macau': [22.19, 113.54],
  'Asia/Taipei': [25.03, 121.56],
  'Asia/Tokyo': [35.68, 139.65],
  'Asia/Seoul': [37.57, 126.98],
  'Asia/Singapore': [1.35, 103.82],
  'Asia/Bangkok': [13.76, 100.5],
  'Asia/Kolkata': [28.61, 77.21],
  'Asia/Dubai': [25.2, 55.27],
  'Europe/London': [51.51, -0.13],
  'Europe/Paris': [48.86, 2.35],
  'Europe/Berlin': [52.52, 13.4],
  'Europe/Madrid': [40.42, -3.7],
  'Europe/Rome': [41.9, 12.5],
  'Europe/Moscow': [55.76, 37.62],
  'America/Los_Angeles': [34.05, -118.24],
  'America/Vancouver': [49.28, -123.12],
  'America/Denver': [39.74, -104.99],
  'America/Chicago': [41.88, -87.63],
  'America/New_York': [40.71, -74.01],
  'America/Toronto': [43.65, -79.38],
  'America/Sao_Paulo': [-23.55, -46.63],
  'Australia/Sydney': [-33.87, 151.21],
  'Australia/Melbourne': [-37.81, 144.96],
  'Pacific/Auckland': [-36.85, 174.76],
};

export function getRealSeasonForDate(date: Date, lat = 35): Season {
  // Traditional solar-term boundaries (立春 Feb 4, 立夏 May 5, 立秋 Aug 7, 立冬 Nov 7)
  // so late November (e.g. Nov 24) is properly Winter in the Northern Hemisphere.
  const mmdd = (date.getMonth() + 1) * 100 + date.getDate();
  const southern = lat < 0;
  if (!southern) {
    if (mmdd >= 204 && mmdd < 505) return 'spring';
    if (mmdd >= 505 && mmdd < 807) return 'summer';
    if (mmdd >= 807 && mmdd < 1107) return 'autumn';
    return 'winter';
  }
  if (mmdd >= 807 && mmdd < 1107) return 'spring';
  if (mmdd >= 1107 || mmdd < 204) return 'summer';
  if (mmdd >= 204 && mmdd < 505) return 'autumn';
  return 'winter';
}

export function getPhaseFromHour(hourDecimal: number): TimeOfDay {
  if (hourDecimal >= 6.0 && hourDecimal < 16.75) return 'morning';
  if (hourDecimal >= 16.75 && hourDecimal < 19.5) return 'sunset';
  return 'night';
}

export function getApproxCoordsFromTimezone(): { lat: number; lon: number; timeZone: string } {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const mapped = TIMEZONE_COORDS[timeZone];
  if (mapped) {
    return { lat: mapped[0], lon: mapped[1], timeZone };
  }
  // Fallback from browser timezone offset (15 degrees per UTC hour, northern temperate latitude)
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  const lon = Math.max(-180, Math.min(180, offsetHours * 15));
  return { lat: 35, lon, timeZone };
}

export function getRealTimeSnapshot(language: Language): RealTimeInfo {
  const now = new Date();
  const { lat, timeZone } = getApproxCoordsFromTimezone();
  const hourDecimal = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';

  let dateText: string;
  let timeText: string;
  try {
    dateText = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).format(now);
    timeText = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
  } catch {
    dateText = `${now.getMonth() + 1}/${now.getDate()}`;
    timeText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  return {
    dateText,
    timeText,
    hourDecimal,
    timeZone,
    season: getRealSeasonForDate(now, lat),
    phase: getPhaseFromHour(hourDecimal),
  };
}

export function mapWmoCodeToWeather(code: number): WeatherKind {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return 'rain';
  }
  return 'clear';
}

export function getFallbackWeather(): WeatherInfo {
  const now = new Date();
  const { lat } = getApproxCoordsFromTimezone();
  const season = getRealSeasonForDate(now, lat);
  // Deterministic realistic ambient weather by local day & season if offline
  const seed = now.getFullYear() * 37 + now.getMonth() * 13 + now.getDate() * 7;
  const mod = seed % 10;
  if (season === 'winter') {
    const kind: WeatherKind = mod < 4 ? 'snow' : mod < 7 ? 'cloudy' : 'clear';
    return { kind, temperatureC: kind === 'snow' ? 1 : 6, weatherCode: 0, isLive: false };
  }
  if (season === 'autumn') {
    const kind: WeatherKind = mod < 2 ? 'rain' : mod < 6 ? 'cloudy' : 'clear';
    return { kind, temperatureC: 15, weatherCode: 0, isLive: false };
  }
  if (season === 'summer') {
    const kind: WeatherKind = mod < 2 ? 'rain' : mod < 4 ? 'cloudy' : 'clear';
    return { kind, temperatureC: 26, weatherCode: 0, isLive: false };
  }
  const kind: WeatherKind = mod < 2 ? 'rain' : mod < 5 ? 'cloudy' : 'clear';
  return { kind, temperatureC: 19, weatherCode: 0, isLive: false };
}

export async function fetchLocalWeather(): Promise<WeatherInfo> {
  const { lat, lon } = getApproxCoordsFromTimezone();

  // Prefer server proxy first (keeps network requests clean and same-origin),
  // fall back to Open-Meteo directly when running as a static build, and finally seasonal fallback.
  const endpoints = [
    `/api/weather?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`,
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=temperature_2m,weather_code,is_day&timezone=auto`,
  ];

  for (let i = 0; i < endpoints.length; i++) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpoints[i], { signal: controller.signal });
      window.clearTimeout(timer);
      if (!res.ok) continue;

      if (i === 0) {
        const data = (await res.json()) as {
          temperatureC?: number | null;
          weatherCode?: number;
        };
        if (typeof data.weatherCode === 'number') {
          return {
            kind: mapWmoCodeToWeather(data.weatherCode),
            temperatureC: typeof data.temperatureC === 'number' ? data.temperatureC : null,
            weatherCode: data.weatherCode,
            isLive: true,
          };
        }
      } else {
        const data = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
        };
        const cur = data.current;
        if (cur && typeof cur.weather_code === 'number') {
          return {
            kind: mapWmoCodeToWeather(cur.weather_code),
            temperatureC:
              typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null,
            weatherCode: cur.weather_code,
            isLive: true,
          };
        }
      }
    } catch {
      // Try next endpoint or fallback
    }
  }

  return getFallbackWeather();
}
