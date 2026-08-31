/**
 * SecureVideoPlayer — RN port of the VideoItem() video-rendering block inside web
 * src/pages/dashboard/Challenge.jsx ("secure embed").
 *
 * Web supports three lesson-video sources: YouTube (iframe), Vimeo (iframe), and Mux (a
 * <mux-player> custom element with a server-minted signed playback token). Reproducing all three
 * natively (a separate native Mux SDK, a native YouTube/Vimeo SDK) would be inventing a parallel
 * implementation web doesn't have — instead this renders the *exact same* embed technology web
 * uses (the same iframe URLs, the same @mux/mux-player custom element loaded from the same CDN)
 * inside a WebView, the same technique screens/MarketScreen.js already uses for the TradingView
 * widget. The anti-piracy watermark is a sibling RN overlay (absolute-positioned, repositioning
 * every 8s), matching web's watermark div being a sibling of the iframe rather than inside it.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { MONO } from "../../src/theme/typography";
import { challengeApi } from "../../src/api/challenge";
import { useAuth } from "../../src/hooks/useAuth";

const PRIMARY = "#39FF14";

function youtubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  const v = url.match(/[?&]v=([\w-]{11})/);
  return v ? `https://www.youtube.com/embed/${v[1]}` : null;
}

function vimeoEmbed(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i);
  if (!m) return null;
  const [, id, pathHash] = m;
  const queryHash = url.match(/[?&]h=([a-z0-9]+)/i)?.[1];
  const hash = pathHash || queryHash;
  return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`;
}

function muxPlaybackId(url) {
  if (!url) return null;
  const m = url.match(/(?:stream|player)\.mux\.com\/([\w-]+)/i);
  return m ? m[1] : null;
}

function buildHtml({ embed, muxId, muxToken }) {
  const body = muxId
    ? `<script type="module" src="https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.js"></script>
       <mux-player playback-id="${muxId}" ${muxToken ? `playback-token="${muxToken}"` : ""} stream-type="on-demand" style="width:100%;height:100%;--controls:block;"></mux-player>`
    : `<iframe src="${embed}${embed.includes("?") ? "&" : "?"}rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1"
        style="width:100%;height:100%;border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
    // No allowfullscreen — matches web's lesson-video iframe exactly (Challenge.jsx's VideoItem).
    // Web deliberately omits it: its own comment explains the custom fullscreen button (not the
    // iframe's native one) is the only reliable way to keep the watermark visible in fullscreen,
    // since Vimeo/YouTube's built-in fullscreen control would bypass it.
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>html,body{margin:0;padding:0;background:#000;width:100%;height:100%;overflow:hidden}</style></head>
    <body>${body}</body></html>`;
}

function Watermark({ text }) {
  const [pos, setPos] = useState({ x: 12, y: 12 });
  useEffect(() => {
    const t = setInterval(() => {
      // Matches web's exact random range (Challenge.jsx's wmPos updater): x in [6,76), y in [6,86).
      setPos({ x: 6 + Math.floor(Math.random() * 70), y: 6 + Math.floor(Math.random() * 80) });
    }, 8000);
    return () => clearInterval(t);
  }, []);
  return (
    <View pointerEvents="none" style={[s.watermark, { left: `${pos.x}%`, top: `${pos.y}%` }]}>
      <Text style={s.watermarkText}>{text}</Text>
    </View>
  );
}

function PlayerBody({ url, day }) {
  const { user } = useAuth();
  const embed = useMemo(() => youtubeEmbed(url) || vimeoEmbed(url), [url]);
  const muxId = useMemo(() => (!embed ? muxPlaybackId(url) : null), [embed, url]);
  const [muxToken, setMuxToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const webRef = useRef(null);

  useEffect(() => {
    if (!muxId) return;
    let cancelled = false;
    challengeApi.getMuxToken(muxId).then((r) => {
      if (!cancelled && r.data?.configured) setMuxToken(r.data.token);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [muxId]);

  const watermarkText = `${user?.email || "trader"} · day ${day} · ${new Date().toLocaleDateString()}`;
  const html = useMemo(() => buildHtml({ embed, muxId, muxToken }), [embed, muxId, muxToken]);

  const retry = () => {
    setErrored(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  if (!embed && !muxId) {
    return <Text style={s.pendingText}>Video URL pending.</Text>;
  }

  return (
    <View style={s.playerWrap}>
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ html }}
        style={s.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setErrored(true); setLoading(false); }}
      />
      <Watermark text={watermarkText} />
      {loading && !errored && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}
      {errored && (
        <View style={s.overlay}>
          <Ionicons name="alert-circle-outline" size={28} color="rgba(255,255,255,0.6)" />
          <Text style={s.errorText}>Couldn't load video.</Text>
          <TouchableOpacity onPress={retry} style={s.retryBtn}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function SecureVideoPlayer({ url, day }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <View>
      <View style={s.frame}>
        <PlayerBody url={url} day={day} />
        <TouchableOpacity
          onPress={() => setFullscreen(true)}
          style={s.fullscreenBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="expand" size={16} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>

      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)} supportedOrientations={["portrait", "landscape"]}>
        <View style={s.fullscreenModal}>
          <PlayerBody url={url} day={day} />
          <TouchableOpacity
            onPress={() => setFullscreen(false)}
            style={s.exitFullscreenBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="contract" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#000",
  },
  playerWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: "#000" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: { color: "rgba(255,255,255,0.6)", fontFamily: MONO.regular, fontSize: 12 },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PRIMARY,
  },
  retryBtnText: { color: "#000", fontFamily: MONO.regular, fontWeight: "700", fontSize: 12 },
  watermark: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  watermarkText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  fullscreenBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: "#000",
  },
  exitFullscreenBtn: {
    position: "absolute",
    top: 40,
    right: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
