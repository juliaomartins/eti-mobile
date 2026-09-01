import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  buildSesaun,
  formatLoronShort,
  ihaAtrazadu,
  seidaukMarka,
  type LoronRecord,
  type SlotView,
} from "@/lib/istoria";
import { ISTORIA_COLORS } from "./IstoriaSummary";

type Props = { day: LoronRecord };

export function IstoriaDayCard({ day }: Props) {
  const empty = seidaukMarka(day);
  const late = ihaAtrazadu(day);
  const sesaun = buildSesaun(day);
  const [evidence, setEvidence] = useState<SlotView | null>(null);

  // Every punch that actually carries a photo, in slot order.
  const withPhotos = sesaun
    .flatMap((session) => session.slots)
    .filter((slot) => !!slot.foto);

  // An administrator refused this day's evidence. It arrives as ABSENT with
  // "Falta" in status_display, which the badge would otherwise have painted
  // green -- the same colour as a day that went perfectly.
  const rejeitadu = !!day.rejeita_motivu;

  const badgeColor = rejeitadu
    ? ISTORIA_COLORS.rejeitadu
    : empty
      ? ISTORIA_COLORS.muted
      : late
        ? ISTORIA_COLORS.late
        : ISTORIA_COLORS.present;

  const badgeText = rejeitadu
    ? (day.status_display ?? "Falta")
    : empty
      ? "Seidauk marka"
      : (day.status_display ?? (late ? "Atrazadu" : "Prezente"));

  return (
    <View style={[styles.card, empty && styles.cardEmpty]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.dayName, empty && styles.textMuted]}>
            {day.loron}
          </Text>
          <Text style={styles.dayDate}>{formatLoronShort(day.data)}</Text>
          {day.sabadu ? <Text style={styles.sabaduTag}>Sábadu</Text> : null}
        </View>

        <View style={[styles.badge, { backgroundColor: `${badgeColor}1A` }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {badgeText}
          </Text>
        </View>
      </View>

      {sesaun.map((session) => (
        <View key={session.key} style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>{session.label}</Text>
          <View style={styles.slots}>
            {session.slots.map((slot) => (
              <Slot key={slot.kolumna} slot={slot} />
            ))}
          </View>
        </View>
      ))}

      {withPhotos.length ? (
        <View style={styles.evidenceRow}>
          {withPhotos.map((slot) => (
            <Pressable
              key={`foto-${slot.kolumna}`}
              onPress={() => setEvidence(slot)}
              style={styles.thumbWrap}
            >
              <Image
                source={{ uri: slot.foto! }}
                style={styles.thumb}
                contentFit="cover"
              />
              <Text style={styles.thumbLabel}>{slot.oras}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {rejeitadu ? (
        <View style={styles.rejeitadu}>
          <Text style={styles.rejeitaduTitle}>
            Prezensa rejeita{"—"}
            {day.rejeita_motivu_display ?? ""}
          </Text>
          {day.rejeita_obs ? (
            <Text style={styles.rejeitaduObs}>{day.rejeita_obs}</Text>
          ) : null}
          {day.rejeita_husi_naran ? (
            <Text style={styles.rejeitaduObs}>
              Husi {day.rejeita_husi_naran}
            </Text>
          ) : null}
        </View>
      ) : null}

      {day.obs ? <Text style={styles.obs}>{day.obs}</Text> : null}

      <EvidenceModal
        slot={evidence}
        loron={day.loron}
        onClose={() => setEvidence(null)}
      />
    </View>
  );
}

/** Full-size punch photo with the evidence recorded alongside it. */
function EvidenceModal({
  slot,
  loron,
  onClose,
}: {
  slot: SlotView | null;
  loron: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!slot}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.evidenceCard} onPress={() => {}}>
          {slot?.foto ? (
            <Image
              source={{ uri: slot.foto }}
              style={styles.evidencePhoto}
              contentFit="cover"
            />
          ) : null}

          <View style={styles.evidenceBody}>
            <Text style={styles.evidenceTitle}>
              {loron} · {slot?.label} {slot?.oras}
            </Text>

            {slot?.atrazadu && slot?.orasOrariu ? (
              <Text style={[styles.evidenceMeta, styles.evidenceLate]}>
                Atrazadu — orariu {slot.orasOrariu}
              </Text>
            ) : null}

            {typeof slot?.distansiaMetru === "number" ? (
              <Text style={styles.evidenceMeta}>
                {Math.round(slot.distansiaMetru)} metru husi eskola
                {slot.ihaEskola === false ? " — iha liur" : ""}
              </Text>
            ) : null}
          </View>

          <Pressable style={styles.evidenceClose} onPress={onClose}>
            <Text style={styles.evidenceCloseText}>Taka</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Slot({ slot }: { slot: SlotView }) {
  // Saturday afternoon does not exist — an em dash, not a missing punch.
  if (slot.laiha) {
    return (
      <View style={styles.slot}>
        <Text style={styles.slotLabel}>{slot.label}</Text>
        <Text style={styles.slotAbsent}>—</Text>
      </View>
    );
  }

  const color = slot.oras
    ? slot.atrazadu
      ? ISTORIA_COLORS.late
      : ISTORIA_COLORS.present
    : ISTORIA_COLORS.muted;

  return (
    <View style={styles.slot}>
      <Text style={styles.slotLabel}>{slot.label}</Text>
      <Text style={[styles.slotTime, { color }]}>{slot.oras ?? "--:--"}</Text>
      {slot.atrazadu && slot.orasOrariu ? (
        <Text style={styles.slotSchedule}>orariu {slot.orasOrariu}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ISTORIA_COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardEmpty: {
    backgroundColor: "#FBFCFE",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    flexShrink: 1,
  },
  dayName: {
    fontSize: 15,
    fontWeight: "700",
    color: ISTORIA_COLORS.text,
  },
  textMuted: {
    color: ISTORIA_COLORS.subtle,
  },
  dayDate: {
    fontSize: 13,
    color: ISTORIA_COLORS.subtle,
  },
  sabaduTag: {
    fontSize: 11,
    color: ISTORIA_COLORS.subtle,
    backgroundColor: ISTORIA_COLORS.track,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionLabel: {
    width: 78,
    fontSize: 12,
    fontWeight: "600",
    color: ISTORIA_COLORS.subtle,
  },
  slots: {
    flex: 1,
    flexDirection: "row",
  },
  slot: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 11,
    color: ISTORIA_COLORS.muted,
  },
  slotTime: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 1,
  },
  slotAbsent: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 1,
    color: ISTORIA_COLORS.muted,
  },
  slotSchedule: {
    fontSize: 10,
    color: ISTORIA_COLORS.late,
    marginTop: 1,
  },
  rejeitadu: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  rejeitaduTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: ISTORIA_COLORS.rejeitadu,
  },
  rejeitaduObs: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: ISTORIA_COLORS.rejeitadu,
  },
  obs: {
    fontSize: 12,
    color: ISTORIA_COLORS.subtle,
    fontStyle: "italic",
    marginTop: 4,
  },
  evidenceRow: {
    flexDirection: "row",
    columnGap: 8,
    marginTop: 4,
  },
  thumbWrap: {
    alignItems: "center",
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: ISTORIA_COLORS.track,
  },
  thumbLabel: {
    fontSize: 10,
    color: ISTORIA_COLORS.subtle,
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.65)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  evidenceCard: {
    backgroundColor: ISTORIA_COLORS.card,
    borderRadius: 18,
    overflow: "hidden",
  },
  evidencePhoto: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: ISTORIA_COLORS.track,
  },
  evidenceBody: {
    padding: 14,
    rowGap: 4,
  },
  evidenceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ISTORIA_COLORS.text,
  },
  evidenceMeta: {
    fontSize: 12,
    color: ISTORIA_COLORS.subtle,
  },
  evidenceLate: {
    color: ISTORIA_COLORS.late,
  },
  evidenceClose: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: ISTORIA_COLORS.track,
  },
  evidenceCloseText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
});
