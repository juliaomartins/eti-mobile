import Feather from "@expo/vector-icons/Feather";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { apiErrorMessage, getActiveHost } from "@/lib/api";
import { login } from "@/lib/auth";
import { checkServer, type ServerCheck } from "@/lib/server-check";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [server, setServer] = useState<ServerCheck | null>(null);
  const router = useRouter();

  // Re-checked on focus, so returning from the settings screen reflects the
  // address that was just saved. A teacher sees the server is unreachable
  // before typing a password, instead of after a failed login.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      checkServer(getActiveHost())
        .then((result) => {
          if (isMounted) setServer(result);
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const handleLogin = async () => {
    if (isSubmitting) return;

    if (username.length === 0 || password.length === 0) {
      setError("Favor hatama naran utilizador no password");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
      setError("");
      router.replace("/(eti)");
    } catch (e) {
      setError(apiErrorMessage(e, "Naran utilizador ka password inkorreta"));
      setUsername("");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Server status and settings */}
          <View style={styles.serverBar}>
            {server ? (
              <View style={styles.serverStatus}>
                <View
                  style={[
                    styles.serverDot,
                    { backgroundColor: server.online ? "#16A34A" : "#DC2626" },
                  ]}
                />
                <Text
                  style={[
                    styles.serverText,
                    { color: server.online ? "#16A34A" : "#DC2626" },
                  ]}
                >
                  {server.online ? "Online" : "Offline"}
                </Text>
              </View>
            ) : (
              <View style={styles.serverStatus} />
            )}

            <Pressable
              hitSlop={12}
              onPress={() => router.push("/server")}
              accessibilityLabel="Konfigurasaun servidor"
            >
              <Feather name="settings" size={22} color="#64748B" />
            </Pressable>
          </View>

          {/* Header / Logo */}
          <View style={styles.header}>
            <Image
              source={require("@/assets/images/eti.jpg")} // change logo here!
              style={styles.logo}
            />
            <Text style={styles.title}>ETI PREZENSA</Text>
            <Text style={styles.subtitle}>Sistema Prezensa Digital</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="naran@eti.tl"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="••••••••"
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, { opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleLogin}
              disabled={
                isSubmitting || username.length === 0 || password.length === 0
              }
            >
              {isSubmitting && <ActivityIndicator color="#FFFFFF" size={25} />}
              <Text style={styles.buttonText}>Tama</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 Escola Técnica Informática de Díli
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  serverBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  serverStatus: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    minHeight: 20,
  },
  serverDot: { width: 8, height: 8, borderRadius: 4 },
  serverText: { fontSize: 13, fontWeight: "700" },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    color: "#64748B",
  },
  form: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  button: {
    flexDirection: "row",
    columnGap: 8,
    height: 48,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});
