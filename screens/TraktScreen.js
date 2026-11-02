import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLIENT_KEY = "trakt_client_id";
const TOKEN_KEY = "trakt_token";

export default function TraktScreen() {
  const [clientId, setClientId] = useState("");
  const [token, setToken] = useState(null);
  const [userCode, setUserCode] = useState(null);
  const [verifyUrl, setVerifyUrl] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | polling | connected | error
  const [message, setMessage] = useState("");
  const pollingRef = useRef(null);

  useEffect(() => {
    (async () => {
      const cid = await AsyncStorage.getItem(CLIENT_KEY);
      const tok = await AsyncStorage.getItem(TOKEN_KEY);
      if (cid) setClientId(cid);
      if (tok) { setToken(JSON.parse(tok)); setStatus("connected"); }
    })();
  }, []);

  const saveClientId = async () => {
    await AsyncStorage.setItem(CLIENT_KEY, clientId.trim());
    Alert.alert("Kaydedildi", "Client ID saklandı.");
  };

  const startDeviceFlow = async () => {
    const cid = clientId.trim();
    if (!cid) { Alert.alert("Eksik", "Önce Trakt Client ID girin."); return; }
    await AsyncStorage.setItem(CLIENT_KEY, cid);
    setStatus("polling");
    setMessage("Kod üretiliyor...");
    try {
      const res = await fetch("https://api.trakt.tv/oauth/device/code", {
        method: "POST",
        headers: { "Content-Type": "application/json", "trakt-api-version": "2", "trakt-api-key": cid },
        body: JSON.stringify({ client_id: cid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error_description || "Kod üretilemedi");
      setUserCode(data.user_code);
      setVerifyUrl(data.verification_url);
      setMessage(`Kodu ${data.verification_url} adresinde girin: ${data.user_code}`);
      // polling
      const deviceCode = data.device_code;
      const interval = (data.interval || 5) * 1000;
      const expires = Date.now() + (data.expires_in || 600) * 1000;
      const poll = async () => {
        if (Date.now() > expires) { setStatus("error"); setMessage("Süre doldu. Tekrar deneyin."); return; }
        try {
          const r = await fetch("https://api.trakt.tv/oauth/device/token", {
            method: "POST",
            headers: { "Content-Type": "application/json", "trakt-api-version": "2", "trakt-api-key": cid },
            body: JSON.stringify({ code: deviceCode, client_id: cid, grant_type: "urn:ietf:params:oauth:grant-type:device_code" })
          });
          const d = await r.json();
          if (r.ok && d.access_token) {
            await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(d));
            setToken(d);
            setStatus("connected");
            setMessage("Bağlantı başarılı!");
            return;
          }
          if (d.error === "authorization_pending") {
            pollingRef.current = setTimeout(poll, interval);
          } else if (d.error === "slow_down") {
            pollingRef.current = setTimeout(poll, interval + 2000);
          } else {
            setStatus("error");
            setMessage(d.error_description || d.error || "Hata");
          }
        } catch (e) {
          setStatus("error");
          setMessage(e.message);
        }
      };
      pollingRef.current = setTimeout(poll, interval);
    } catch (e) {
      setStatus("error");
      setMessage(e.message);
    }
  };

  const disconnect = async () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setStatus("idle");
    setUserCode(null);
    setVerifyUrl(null);
    setMessage("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trakt</Text>
      <Text style={styles.desc}>Trakt API ile senkronizasyon (device code flow).</Text>

      <TextInput
        style={styles.input}
        placeholder="Trakt Client ID"
        placeholderTextColor="#888"
        value={clientId}
        onChangeText={setClientId}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.smallBtn} onPress={saveClientId}>
        <Text style={styles.smallBtnText}>Client ID Kaydet</Text>
      </TouchableOpacity>

      {status === "connected" && token ? (
        <View style={styles.card}>
          <Text style={styles.connected}>✓ Bağlı</Text>
          <Text style={styles.tokenInfo}>Token: {token.access_token?.slice(0, 12)}…</Text>
          <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
            <Text style={styles.disconnectText}>Bağlantıyı Kes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.btn} onPress={startDeviceFlow} disabled={status === "polling"}>
            {status === "polling" ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Trakt'a Bağlan</Text>}
          </TouchableOpacity>
          {userCode ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Kod:</Text>
              <Text style={styles.code}>{userCode}</Text>
              {verifyUrl ? (
                <TouchableOpacity onPress={() => Linking.openURL(verifyUrl)}>
                  <Text style={styles.link}>{verifyUrl}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </>
      )}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Text style={styles.note}>Not: Trakt API app oluşturup Client ID almanız gerekir (trakt.tv/oauth/applications).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f", padding: 24 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  desc: { color: "#888", fontSize: 14, textAlign: "center", marginBottom: 16 },
  input: { backgroundColor: "#15151f", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#2a2a3a", width: "100%" },
  smallBtn: { backgroundColor: "#2a2a3a", padding: 10, borderRadius: 10, alignItems: "center", marginBottom: 16 },
  smallBtnText: { color: "#fff", fontSize: 13 },
  btn: { backgroundColor: "#ed1c24", padding: 14, borderRadius: 12, alignItems: "center", width: "100%", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: "#15151f", padding: 16, borderRadius: 12, marginTop: 16, width: "100%", alignItems: "center" },
  connected: { color: "#22c55e", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  tokenInfo: { color: "#888", fontSize: 12, marginBottom: 12 },
  disconnectBtn: { backgroundColor: "#ef4444", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  disconnectText: { color: "#fff", fontWeight: "600" },
  codeBox: { backgroundColor: "#15151f", padding: 16, borderRadius: 12, marginTop: 16, width: "100%", alignItems: "center" },
  codeLabel: { color: "#888", fontSize: 12, marginBottom: 4 },
  code: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: 4, marginBottom: 8 },
  link: { color: "#3b82f6", fontSize: 12, textAlign: "center" },
  message: { color: "#f59e0b", fontSize: 13, marginTop: 12, textAlign: "center" },
  note: { color: "#555", fontSize: 11, marginTop: 24, textAlign: "center" }
});