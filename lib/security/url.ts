const PRIVATE_HOST = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|\[::1\])$/i;

export function assertPublicHttpsUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (!host || host.endsWith(".local") || PRIVATE_HOST.test(host)) return null;
  if (host.includes(":") && host.startsWith("[")) return null;
  return url;
}

export function isFetchablePublicUrl(value: string): boolean {
  const url = assertPublicHttpsUrl(value);
  if (!url) return false;
  if (url.hostname.toLowerCase().endsWith(".invalid")) return false;
  return true;
}
