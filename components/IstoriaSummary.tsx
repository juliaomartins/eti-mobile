import { StyleSheet, Text, View } from "react-native";

import type { Rezumu } from "@/lib/istoria";

/**
 * Colour language for the whole screen.
 * `seidauk_marka` is deliberately grey, never red — a missing day is usually
 * leave, not misconduct.
 */
export const ISTORIA_COLORS = {
  present: "#16A34A",
  late: "#F59E0B",
  /** A day the administration refused. Same red the dashboard badges it with. */
  rejeitadu: "#DC2626",
  muted: "#94A3B8",
  text: "#0F172A",
  subtle: "#64748B",
  card: "#FFFFFF",
  track: "#E2E8F0",
};

type Props = { rezumu: Rezumu };

export function IstoriaSummary({ rezumu }: Props) {
  const total = rezumu.loron_servisu || 0;
  const done = rezumu.marka_ona || 0;
  const ratio = total > 0 ? Math.min(done / total, 1) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Prezensa fulan ne&apos;e</Text>
        <Text style={styles.progressValue}>
          {done}/{total}
        </Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>

      <View style={styles.stats}>
        <Stat label="Marka ona" value={done} color={ISTORIA_COLORS.present} />
        <Stat
          label="Seidauk marka"
          value={rezumu.seidauk_marka ?? 0}
          color={ISTORIA_COLORS.muted}
        />
        <Stat
          label="Atrazadu"
          value={rezumu.atrazadu ?? 0}
          color={ISTORIA_COLORS.late}
        />
        <Stat
          label="Loron servisu"
          value={total}
          color={ISTORIA_COLORS.subtle}
        />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ISTORIA_COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: ISTORIA_COLORS.text,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "700",
    color: ISTORIA_COLORS.present,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: ISTORIA_COLORS.track,
    overflow: "hidden",
    marginBottom: 16,
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: ISTORIA_COLORS.present,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: 8,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    color: ISTORIA_COLORS.subtle,
    textAlign: "center",
    marginTop: 2,
  },
});
