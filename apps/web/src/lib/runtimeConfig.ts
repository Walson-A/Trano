/**
 * Configuration HA résolue au runtime.
 * En dev : variables VITE_ du .env.local.
 * En prod (add-on Freebox/HAOS) : fournie par le serveur Trano via /api/config,
 * ce qui évite de figer l'URL et le token dans le build.
 */
export interface RuntimeConfig {
  haUrl: string | null;
  haToken: string | null;
  weatherEntity: string;
}

let cached: RuntimeConfig | null = null;

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  if (cached) return cached;

  const envUrl = import.meta.env.VITE_HA_URL;
  const envToken = import.meta.env.VITE_HA_TOKEN;
  if (envUrl && envToken) {
    cached = {
      haUrl: envUrl,
      haToken: envToken,
      weatherEntity: import.meta.env.VITE_HA_WEATHER_ENTITY || 'weather.forecast_home',
    };
    return cached;
  }

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      cached = {
        haUrl: data.haUrl ?? null,
        haToken: data.haToken ?? null,
        weatherEntity: data.weatherEntity || 'weather.forecast_home',
      };
      return cached;
    }
  } catch {
    // serveur injoignable — on retombe sur la config vide
  }

  cached = { haUrl: null, haToken: null, weatherEntity: 'weather.forecast_home' };
  return cached;
}

/** Entité météo courante (après résolution de la config) */
export function getWeatherEntity(): string {
  return cached?.weatherEntity ?? 'weather.forecast_home';
}
