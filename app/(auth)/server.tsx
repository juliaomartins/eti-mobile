import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ISTORIA_COLORS } from "@/components/IstoriaSummary";
import { getActiveHost, getConfiguredHost, applyManualHost } from "@/lib/api";
import {
  buildHost,
  checkServer,
  isValidIp,
  isValidPort,
  type ServerCheck,
} from "@/lib/server-check";

const DEFAULT_PORT = "8000";

/** Splits `http://192.168.0.63:8000` back into its parts for editing. */
function splitHost(host: string | null): { ip: string; port: string } {
  if (!host) return { ip: "", port: DEFAULT_PORT };

  const withoutScheme = host.replace(/^https?:\/\//, "");
  const [ip, port] = withoutScheme.split(":");

  return { ip: ip ?? "", port: port ?? DEFAULT_PORT };
}

export default function ServerSettingsScreen() {
  const router = useRouter();

  const initial = splitHost(getConfiguredHost() ?? getActiveHost());
  const [ip, setIp] = useState(initial.ip);
  const [port, setPort] = useState(initial.port);

  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ServerCheck | null>(null);
  const [saved, setSaved] = useState(false);

  const validIp = isValidIp(ip);
  const validPort = isValidPort(port);
  const canTest = validIp && validPort && !testing;

  // Any edit invalidates the previous test: Save must never apply an address
  // that was never reached.
  useEffect(() => {
    setResult(null);
    setSaved(false);
  }, [ip, port]);

  const handleTest = async () => {
    if (!canTest) return;

    setTesting(true);
    setResult(await checkServer(buildHost(ip, port)));
    setTesting(false);
  };

  const handleSave = async () => {
    if (!result?.online) return;

    await applyManualHost(buildHost(ip, port));
    setSaved(true);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: "Konfigurasaun servidor" }} />
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.intro}>
              Hatama enderesu servidor eskola nian. Testa koneksaun molok rai.
            </Text>

            <Text style={styles.label}>Enderesu IP</Text>
            <TextInput
              style={[styles.input, ip.length > 0 && !validIp && styles.inputBad]}
              value={ip}
              onChangeText={setIp}
              placeholder="192.168.0.63"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.label}>Port</Text>
            <TextInput
              style={[styles.input, port.length > 0 && !validPort && styles.inputBad]}
              value={port}
              onChangeText={setPort}
              placeholder={DEFAULT_PORT}
              keyboardType="number-pad"
              maxLength={5}
            />

            <Text style={styles.preview}>{buildHost(ip || "…", port)}</Text>

            {result ? (
              <View
                style={[
                  styles.status,
                  {
                    backgroundColor: result.online ? "#E8F7EE" : "#FDECEC",
                  },
                ]}
              >
                <Feather
                  name={result.online ? "check-circle" : "alert-circle"}
                  size={18}
                  color={result.online ? ISTORIA_COLORS.present : "#DC2626"}
                />
                <View style={styles.statusText}>
                  <Text
                    style={[
                      styles.statusTitle,
                      { color: result.online ? ISTORIA_COLORS.present : "#DC2626" },
                    ]}
                  >
                    {result.online ? "Online" : "Offline"}
                  </Text>
                  {!result.online ? (
                    <Text style={styles.statusReason}>{result.reason}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <Pressable
              style={[styles.testButton, !canTest && styles.buttonOff]}
              onPress={handleTest}
              disabled={!canTest}
            >
              {testing ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Feather name="wifi" size={18} color={canTest ? "#007AFF" : ISTORIA_COLORS.muted} />
              )}
              <Text style={[styles.testText, !canTest && styles.textOff]}>
                Test koneksaun
              </Text>
            </Pressable>

            {/* Save stays shut until a test has actually succeeded. */}
            <Pressable
              style={[styles.saveButton, !result?.online && styles.saveOff]}
              onPress={handleSave}
              disabled={!result?.online || saved}
            >
              <Feather name="save" size={18} color="#FFFFFF" />
              <Text style={styles.saveText}>Rai</Text>
            </Pressable>

            <Text style={styles.hint}>
              Servidor ne&apos;e sei uza to&apos;o ita troka fila fali.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, rowGap: 4 },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: ISTORIA_COLORS.subtle,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: ISTORIA_COLORS.subtle,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: ISTORIA_COLORS.track,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    color: ISTORIA_COLORS.text,
    backgroundColor: "#FFFFFF",
  },
  inputBad: { borderColor: "#DC2626" },
  preview: {
    marginTop: 12,
    fontSize: 13,
    color: ISTORIA_COLORS.muted,
    fontVariant: ["tabular-nums"],
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: "700" },
  statusReason: {
    fontSize: 13,
    color: ISTORIA_COLORS.subtle,
    marginTop: 2,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    marginTop: 20,
  },
  testText: { fontSize: 15, fontWeight: "700", color: "#007AFF" },
  buttonOff: { borderColor: ISTORIA_COLORS.track },
  textOff: { color: ISTORIA_COLORS.muted },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    marginTop: 12,
  },
  saveOff: { backgroundColor: "#CBD5E1" },
  saveText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  hint: {
    fontSize: 12,
    color: ISTORIA_COLORS.muted,
    textAlign: "center",
    marginTop: 14,
  },
});
