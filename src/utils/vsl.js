// VSL (21-Day Challenge sales video) playback helpers. Pure — no React Native imports — so they can be
// unit-tested with `node --test`.
//
// Source of truth is the portal's components/VslContent.jsx:
//   export const VSL_VIDEO_URL = "https://player.mux.com/<playbackId>";
// The portal turns that into a <mux-player playback-id="..."> element (public, unsigned playback). The
// mobile app plays the same Mux asset with the same <mux-player> web component inside a WebView, the
// technique SecureVideoPlayer.js already uses for lesson videos — Mux's own player supplies play/pause,
// 10-second seek buttons, a progress bar with current time / duration, buffering state and fullscreen.
// Keep this URL in sync with the portal.
export const VSL_VIDEO_URL = "https://player.mux.com/AhzwG8Yfi4nNNsd2pWBSU4UzPsfrmHgmaHv6NPYr6gA";

// Same pattern as the portal's lib/mux.js muxPlaybackId (stream.mux.com / player.mux.com links).
export function muxPlaybackId(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/(?:stream|player)\.mux\.com\/([\w-]+)/i);
  return m ? m[1] : null;
}

// Origin presented to Mux/jsDelivr for the HTML document (WebView `baseUrl`). The portal plays this
// video from its own https origin; a null/about:blank origin is rejected by some embed hosts.
export const VSL_BASE_URL = "https://cashflowtrader.in";

export const VSL_LOAD_TIMEOUT_MS = 20000;

// Builds the self-contained HTML document. The playback id is validated (it is interpolated into
// markup), and the page reports back to React Native through postMessage:
//   { type: "ready" }            — metadata loaded / playing
//   { type: "error", reason }    — player error, script failed to load, or load timeout
export function buildVslHtml(playbackId, timeoutMs = VSL_LOAD_TIMEOUT_MS) {
  if (!playbackId || !/^[\w-]+$/.test(playbackId)) throw new Error("Invalid Mux playback id");
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden}
  mux-player{width:100%;height:100%;display:block;--media-object-fit:contain;--media-object-position:center}
</style>
<script>
  function post(m){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));}catch(e){}}
  window.addEventListener('error',function(){});
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.js"
  onerror="post({type:'error',reason:'script'})"></script>
</head><body>
<mux-player id="p" playback-id="${playbackId}" stream-type="on-demand" autoplay playsinline
  accent-color="#39FF14" forward-seek-offset="10" backward-seek-offset="10"
  metadata-video-title="Cashflow Trader Introduction"></mux-player>
<script>
  var done=false;
  function ready(){ if(!done){done=true;post({type:'ready'});} }
  var p=document.getElementById('p');
  ['loadedmetadata','playing','canplay'].forEach(function(n){p.addEventListener(n,ready);});
  p.addEventListener('error',function(){ if(!done){post({type:'error',reason:'player'});} });
  setTimeout(function(){ if(!done){post({type:'error',reason:'timeout'});} }, ${Number(timeoutMs) || VSL_LOAD_TIMEOUT_MS});
</script>
</body></html>`;
}

// Parses a WebView message into a known shape, or null for anything else.
export function parseVslMessage(raw) {
  try {
    const m = JSON.parse(raw);
    if (m && (m.type === "ready" || m.type === "error")) return m;
  } catch { /* ignore */ }
  return null;
}

export function vslErrorMessage(reason) {
  if (reason === "timeout") return "The video is taking too long to load. Check your connection and try again.";
  if (reason === "script") return "Couldn't load the video player. Check your connection and try again.";
  return "This video couldn't be played right now. Please try again.";
}
