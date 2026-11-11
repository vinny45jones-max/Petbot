// Чат поддержки Tawk.to: грузим только после согласия на cookie и при заданных ID (§9, §16.1).
export interface TawkEnv { propertyId: string; widgetId: string }

export function shouldLoadTawk(consentGiven: boolean, env: TawkEnv): boolean {
  return consentGiven && Boolean(env.propertyId) && Boolean(env.widgetId);
}

export function tawkSrc(propertyId: string, widgetId: string): string {
  return `https://embed.tawk.to/${encodeURIComponent(propertyId)}/${encodeURIComponent(widgetId)}`;
}
