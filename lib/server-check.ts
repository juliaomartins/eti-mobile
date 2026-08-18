import axios from "axios";

import { PREZENSA_ENDPOINTS } from "./config";

/** Short on purpose: a wrong address should be rejected in seconds. */
const TEST_TIMEOUT = 5000;

export type ServerCheck =
  | { online: true; status: number }
  | { online: false; reason: string };

/** Builds a host URL from the parts the settings screen collects. */
export const buildHost = (ip: string, port: string) =>
  `http://${ip.trim()}:${(port.trim() || "8000")}`;

/**
 * IPv4 or a hostname. Deliberately permissive about hostnames — a school may
 * put the server behind a DNS name — but it rejects the scheme and paths,
 * which belong to buildHost.
 */
export const isValidIp = (value: string) => {
  const host = value.trim();
  if (!host || /[\s/\:]/.test(host)) return false;

  const parts = host.split(".");
  const looksNumeric = parts.every((part) => /^\d+$/.test(part));

  if (looksNumeric) {
    return (
      parts.length === 4 &&
      parts.every((part) => Number(part) >= 0 && Number(part) <= 255)
    );
  }

  return /^[a-zA-Z0-9.-]+$/.test(host);
};

export const isValidPort = (value: string) => {
  const port = Number(value.trim() || "8000");
  return Number.isInteger(port) && port > 0 && port <= 65535;
};

/**
 * Is a backend answering on this host?
 *
 * Hits an authenticated route without a token, so **401 is the success case**:
 * it proves a Django reachable enough to reject us. Anything that answers with
 * an HTTP status proves reachability; only a transport failure means offline.
 */
export async function checkServer(host: string): Promise<ServerCheck> {
  try {
    const { status } = await axios.get(`${host}${PREZENSA_ENDPOINTS.checkin}`, {
      timeout: TEST_TIMEOUT,
      // Every status is a result, not an exception: it is the reply itself
      // that proves the server is there.
      validateStatus: () => true,
    });

    // 401/403 mean a guarded API answered. 2xx/405 mean something answered
    // too, so the host is fine even if this route behaves unexpectedly.
    if (status === 401 || status === 403) return { online: true, status };
    if (status < 500) return { online: true, status };

    return { online: false, reason: `Responde la loos (${status})` };
  } catch (error: any) {
    if (error?.code === "ECONNABORTED" || /timeout/i.test(error?.message ?? "")) {
      return { online: false, reason: "Servidor la responde" };
    }

    if (error?.code === "ECONNREFUSED") {
      return { online: false, reason: "Servidor rejeita koneksaun" };
    }

    return { online: false, reason: "La konsege konekta ba servidor" };
  }
}
