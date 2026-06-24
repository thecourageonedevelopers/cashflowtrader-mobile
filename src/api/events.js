import { AppState } from "react-native";
import client from "./client";

// Ports the web tracker.js — AppState replaces document.visibilityState
// Session ID lives in module memory (matches sessionStorage semantics: cleared on app close).
let _sessionId = null;
let _heartbeatTimer = null;
let _currentRoute = null;

function getSessionId() {
  if (!_sessionId) {
    _sessionId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
  return _sessionId;
}

export function setCurrentRoute(routeName) {
  _currentRoute = routeName;
}

export async function trackEvent(eventType, metadata = {}) {
  try {
    await client.post("/events", {
      event_type: eventType,
      session_id: getSessionId(),
      metadata: { route: _currentRoute, ...metadata },
    });
  } catch {
    // Event tracking is fire-and-forget — never block the UI on failure
  }
}

export function startHeartbeat() {
  if (_heartbeatTimer) return;
  _heartbeatTimer = setInterval(() => {
    if (AppState.currentState === "active") {
      trackEvent("heartbeat", { route: _currentRoute });
    }
  }, 60_000);
}

export function stopHeartbeat() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
}
