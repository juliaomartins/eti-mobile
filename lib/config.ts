/**
 * Backend configuration.
 *
 * Override per-environment with EXPO_PUBLIC_API_URL (e.g. in .env or eas.json)
 * without touching the code.
 */
/**
 * Candidate backends, tried in order. The school server is reachable on
 * different subnets depending on which network the phone is joined to, so a
 * failure to connect on one host falls through to the next.
 *
 * Override with EXPO_PUBLIC_API_URL — a single URL or a comma-separated list.
 */
const DEFAULT_API_HOSTS = [
  "http://192.168.0.63:8000",
  "http://10.101.196.41:8000",
];

const normalizeHost = (value: string) => value.trim().replace(/\/+$/, "");

export const API_HOSTS: string[] = (() => {
  const configured = process.env.EXPO_PUBLIC_API_URL;

  const hosts = configured
    ? configured.split(",").map(normalizeHost).filter(Boolean)
    : DEFAULT_API_HOSTS.map(normalizeHost);

  return hosts.length ? hosts : DEFAULT_API_HOSTS.map(normalizeHost);
})();

/** First candidate. The active host can change at runtime — see lib/api.ts. */
export const API_BASE_URL = API_HOSTS[0];

export const AUTH_ENDPOINTS = {
  login: "/api/auth/login/",
  logout: "/api/auth/logout/",
  refresh: "/api/auth/refresh/",
  verify: "/api/auth/verify/",
  me: "/api/auth/me/",
} as const;

// Trailing slashes are required — Django 301-redirects without them, and the
// POST body is dropped on the hop.
export const PREZENSA_ENDPOINTS = {
  checkin: "/api/prezensa/checkin/",
  checkout: "/api/prezensa/checkout/",
  ohin: "/api/prezensa/ohin/",
  istoria: "/api/prezensa/istoria/",
} as const;

export const KONFIG_ENDPOINT = "/api/konfig/";

/** Requests to these paths never carry a Bearer token and are never retried. */
export const PUBLIC_PATHS: string[] = [
  AUTH_ENDPOINTS.login,
  AUTH_ENDPOINTS.refresh,
  AUTH_ENDPOINTS.verify,
];
