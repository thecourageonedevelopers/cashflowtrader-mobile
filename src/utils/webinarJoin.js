import { Linking } from "react-native";
import { webinarsApi } from "../api/webinars";
import { launchTarget } from "./webinars";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Join = ask the backend for a one-time launch URL, then hand it to the system browser, which follows
// the gateway's redirect to the webinar provider (Zoom/Teams app or web). The provider link itself never
// reaches this code, and the bearer token is never put in the URL — the ticket is the credential.
// Returns { ok: true } or { ok: false, message } — never throws.
export async function joinWebinar(webinarId) {
  try {
    const { data } = await webinarsApi.join(webinarId);
    const target = launchTarget(API_URL, data?.launch_url);
    if (!target) {
      return { ok: false, message: "We couldn't connect you to this webinar. Please try again in a minute." };
    }
    await Linking.openURL(target);
    return { ok: true };
  } catch (e) {
    const status = e?.response?.status;
    const detail = e?.response?.data?.detail;
    if (detail) return { ok: false, message: detail };
    if (status === 404) return { ok: false, message: "This webinar isn't available right now." };
    if (e?.message === "Network Error" || e?.code === "ECONNABORTED") {
      return { ok: false, message: "No connection. Please check your network and try again." };
    }
    return { ok: false, message: "Could not join the webinar." };
  }
}
