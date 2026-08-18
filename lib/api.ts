import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import { router } from "expo-router";

import {
  API_BASE_URL,
  API_HOSTS,
  AUTH_ENDPOINTS,
  KONFIG_ENDPOINT,
  PUBLIC_PATHS,
} from "./config";
import {
  clearSession,
  getAccessToken,
  getManualHost,
  getPreferredHost,
  getRefreshToken,
  setManualHost,
  setPreferredHost,
  setTokens,
} from "./storage";

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  /** One host re-resolution per request; a second would just stall again. */
  _hostResolved?: boolean;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  // Kept short so an unreachable host fails over quickly. Photo uploads pass
  // their own longer timeout.
  timeout: 12000,
  headers: { Accept: "application/json" },
});

/** Bare client for refresh calls, so interceptors can't recurse into themselves. */
const plain = axios.create({
  baseURL: API_BASE_URL,
  // Kept short so an unreachable host fails over quickly. Photo uploads pass
  // their own longer timeout.
  timeout: 12000,
  headers: { Accept: "application/json" },
});

const isPublicPath = (url?: string) =>
  !!url && PUBLIC_PATHS.some((path) => url.includes(path));

/* ------------------------------------------------------------------ *
 * Host failover — the school server answers on different subnets
 * ------------------------------------------------------------------ */

let activeHost = API_BASE_URL;

function applyHost(host: string) {
  activeHost = host;
  api.defaults.baseURL = host;
  plain.defaults.baseURL = host;
}

/**
 * Set once a teacher has configured a server by hand. While it holds a value
 * it is the only candidate: someone who typed an address meant it, and
 * silently falling back to a compiled-in default would send their punches to
 * a different server than the one on screen.
 */
let manualHost: string | null = null;

/** What failover may choose between: the manual host alone, or the defaults. */
const candidateHosts = () => (manualHost ? [manualHost] : API_HOSTS);

/**
 * Restores the configured server, then the host that last answered.
 *
 * The saved-host guard stays limited to API_HOSTS because that value is only
 * ever written by the probe; a hand-typed address arrives through
 * `applyManualHost` instead and is not filtered.
 */
const hostReady = (async () => {
  const manual = await getManualHost();
  if (manual) {
    manualHost = manual;
    applyHost(manual);
    return;
  }

  const saved = await getPreferredHost();
  if (saved && API_HOSTS.includes(saved)) applyHost(saved);
})();

/**
 * Points the client at a hand-configured server, or clears it with null and
 * hands control back to the compiled-in candidates.
 */
export async function applyManualHost(host: string | null): Promise<void> {
  manualHost = host;
  await setManualHost(host);

  applyHost(host ?? API_HOSTS[0]);
}

/** The configured server, for screens that display or edit it. */
export const getConfiguredHost = () => manualHost;

export const getActiveHost = () => activeHost;

/**
 * Fire-and-forget POST on the bare client: no auth interceptor, no refresh,
 * no host failover, and a short timeout.
 *
 * For calls whose result the UI must never wait on — logout being the case
 * that matters. Going through `api` would cost a 12s timeout per candidate
 * host before the caller regained control.
 */
export function backgroundPost(
  url: string,
  data: unknown,
  accessToken?: string | null,
  timeout = 4000,
) {
  return plain.post(url, data, {
    timeout,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

/**
 * Long enough for a LAN round trip, short enough that a host on a subnet the
 * phone cannot reach is written off in seconds rather than after the full
 * request timeout.
 */
const PROBE_TIMEOUT = 3000;

/**
 * Is this host answering at all?
 *
 * Any HTTP status counts, 401 included: the question is whether packets reach
 * a server, not whether this call is authorised. Uses a bare axios so the
 * interceptors below cannot recurse into a probe of a probe.
 */
async function probe(host: string): Promise<void> {
  await axios.get(`${host}${KONFIG_ENDPOINT}`, {
    timeout: PROBE_TIMEOUT,
    validateStatus: () => true,
  });
}

/** The first host to answer, or null when none of them do. */
function firstReachable(hosts: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let outstanding = hosts.length;
    let done = false;

    for (const host of hosts) {
      probe(host).then(
        () => {
          if (!done) {
            done = true;
            resolve(host);
          }
        },
        () => {
          outstanding -= 1;
          if (outstanding === 0 && !done) resolve(null);
        },
      );
    }
  });
}

/** In flight while a resolution is running, so callers share one result. */
let hostResolution: Promise<string | null> | null = null;

/**
 * Works out which host the phone can actually reach, once.
 *
 * Rotating blindly on each failure was the bug: a screen fires five requests
 * at once, all five time out together, and each one rotated the shared host —
 * A to B to A to B — so replays landed on whichever won the race, half of them
 * on the subnet the phone genuinely cannot see, each costing another full
 * timeout. Probing decides instead of guessing, every concurrent caller waits
 * on the same probe, and only a host that actually answered is remembered.
 */
function resolveHost(): Promise<string | null> {
  hostResolution ??= firstReachable(candidateHosts())
    .then(async (host) => {
      if (host && host !== activeHost) {
        applyHost(host);
        // Only the probe's own record is updated. A manually configured host
        // is the teacher's decision and is never rewritten from here.
        if (!manualHost) await setPreferredHost(host);
        console.warn(`[api] host resolved to ${host}`);
      }

      return host;
    })
    .finally(() => {
      hostResolution = null;
    });

  return hostResolution;
}

/* ------------------------------------------------------------------ *
 * Request interceptor — attach the access token
 * ------------------------------------------------------------------ */

api.interceptors.request.use(async (config) => {
  // Wait for the remembered host before the first request goes out.
  await hostReady;
  config.baseURL = activeHost;

  const headers = AxiosHeaders.from(config.headers);

  // React Native only appends the multipart boundary when Content-Type is
  // absent. Setting it by hand yields a boundary-less header, Django parses
  // zero parts, and every required field reports as missing.
  //
  // Deleting is not enough: dispatchRequest re-adds a default
  // application/x-www-form-urlencoded for POST *after* this interceptor runs.
  // Assigning `false` both clears it and blocks that default, and axios omits
  // false-valued headers when serialising the request.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    headers.set("Content-Type", false);
  }

  if (!isPublicPath(config.url)) {
    let token = await getAccessToken();

    // No access token but a refresh is on file: mint one before sending,
    // rather than firing a request that is certain to 401.
    if (!token) token = await refreshAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      // Never log the token itself — only whether one was found.
      console.warn(`[api] no access token available for ${config.url}`);
    }
  }

  config.headers = headers;
  return config;
});

/* ------------------------------------------------------------------ *
 * Token refresh — single-flight, so N concurrent 401s cause 1 refresh
 * ------------------------------------------------------------------ */

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  try {
    const { data } = await plain.post(AUTH_ENDPOINTS.refresh, { refresh });
    const access: string | undefined = data?.access;
    if (!access) return null;

    // SimpleJWT rotates the refresh token when ROTATE_REFRESH_TOKENS is on —
    // persist the new one or the next refresh fails.
    await setTokens(access, data?.refresh ?? null);
    return access;
  } catch {
    return null;
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/* ------------------------------------------------------------------ *
 * Session expiry — wipe storage and send the teacher back to login
 * ------------------------------------------------------------------ */

let redirecting = false;

export async function forceLogin() {
  if (redirecting) return;
  redirecting = true;

  await clearSession();
  try {
    router.replace("/(auth)");
  } catch {
    // Navigation not mounted yet; the root layout guard will catch it.
  }

  setTimeout(() => {
    redirecting = false;
  }, 1000);
}

/* ------------------------------------------------------------------ *
 * Response interceptor — refresh once, replay, otherwise bounce to login
 * ------------------------------------------------------------------ */

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // No response at all: log the target so a misconfigured host, an
    // unreachable server and a stalled upload can be told apart.
    if (!error.response) {
      console.warn(
        `[api] no response from ${config?.baseURL ?? ""}${config?.url ?? ""}` +
          ` — code=${error.code ?? "none"} message=${error.message}`,
      );

      // Find out which host is reachable before assuming this one is not.
      // A slow server and a wrong subnet both surface here as "no response",
      // and treating them alike is what made the app ping-pong between the
      // two addresses: the office server was answering, just not within the
      // timeout, and every timed-out request dragged the whole app onto the
      // hotspot address and back.
      if (config && !config._hostResolved && candidateHosts().length > 1) {
        config._hostResolved = true;

        const usedHost = config.baseURL;
        const reachable = await resolveHost();

        // Replay only when the phone is now pointed somewhere else. If the
        // probe came back with the same host, that host is alive and the
        // request simply took too long — retrying would spend another full
        // timeout to fail in exactly the same way.
        if (reachable && reachable !== usedHost) {
          return api(config);
        }
      }
    }

    if (!config || isPublicPath(config.url)) {
      return Promise.reject(error);
    }

    if (status === 401 && !config._retry) {
      config._retry = true;

      const access = await refreshAccessToken();
      if (access) {
        const headers = AxiosHeaders.from(config.headers);
        headers.set("Authorization", `Bearer ${access}`);
        config.headers = headers;
        return api(config);
      }

      // Refresh token is gone or blacklisted — a real re-login is required.
      await forceLogin();
      return Promise.reject(error);
    }

    if (status === 401 || status === 403) {
      await forceLogin();
    }

    return Promise.reject(error);
  },
);

/** Human-readable message from a DRF error body, for the existing error slots. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;

  if (!error.response) {
    return error.code === "ECONNABORTED"
      ? "Servidor la responde. Verifika koneksaun no koko fila fali."
      : "La konsege konekta ba servidor";
  }

  const data = error.response.data as Record<string, unknown> | string | null;
  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object") {
    const direct = data.detail ?? data.message ?? data.error;
    if (typeof direct === "string") return direct;

    // DRF returns {field: [msg, ...]} — report every field, not just the
    // first, so a partial payload doesn't hide the rest of the problem.
    const parts = Object.entries(data).map(([field, value]) => {
      const text = Array.isArray(value) ? value.join(" ") : String(value);
      return field === "non_field_errors" ? text : `${field}: ${text}`;
    });

    if (parts.length) return parts.join("\n");
  }

  return fallback;
}
