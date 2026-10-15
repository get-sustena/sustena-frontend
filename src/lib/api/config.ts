const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const productionApiBaseUrl = "https://api.getsustena.com/api/v1";
const normalizedConfiguredApiBaseUrl = configuredApiBaseUrl?.replace(/\/$/, "");

export const API_BASE_URL = normalizedConfiguredApiBaseUrl
  ? !__DEV__ && !isSafeReleaseApiUrl(normalizedConfiguredApiBaseUrl)
    ? productionApiBaseUrl
    : normalizedConfiguredApiBaseUrl
  : __DEV__
    ? "http://192.168.0.177:9000/api/v1"
    : productionApiBaseUrl;

export const ACCESS_TOKEN_EXPIRED_STATUS = 401;

export const API_TIMEOUT_MS = 60_000;


function isSafeReleaseApiUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username && !url.password && !url.search && !url.hash
      && !isPrivateHost(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""));
  } catch {
    return false;
  }
}

function isPrivateHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return true;
  if (hostname === "::" || hostname === "::1" || /^(f[cd]|fe[89ab])/.test(hostname) && hostname.includes(":")) {
    return true;
  }
  // URL normalizes IPv4-mapped IPv6 into hexadecimal, e.g. ::ffff:7f00:1.
  const mapped = hostname.match(/^::ffff:([\da-f]+):([\da-f]+)$/);
  if (mapped) {
    const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
    return isPrivateHost([high >> 8, high & 255, low >> 8, low & 255].join("."));
  }
  const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4) return false;
  const first = Number(ipv4[1]), second = Number(ipv4[2]);
  return first === 0 || first === 10 || first === 127 || first >= 224
    || first === 169 && second === 254
    || first === 172 && second >= 16 && second <= 31
    || first === 192 && second === 168
    || first === 100 && second >= 64 && second <= 127;
}
