import { Dimensions, Platform } from "react-native";

export const isIOS     = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
export const isWeb     = Platform.OS === "web";

export function getWindowDimensions() {
  return Dimensions.get("window");
}

// Matches the 768px breakpoint already used in ScreenLayout.js / AppDrawer.js
export function isTablet() {
  return Dimensions.get("window").width >= 768;
}

export function isLargeScreen() {
  return Dimensions.get("window").width >= 1024;
}

// Build a multipart FormData file object from expo-image-picker result.
// Usage: buildImageFile(pickerResult.assets[0])
export function buildImageFile(asset, fieldName = "file") {
  const uri   = asset.uri;
  const name  = uri.split("/").pop();
  const match = /\.(\w+)$/.exec(name);
  const type  = match ? `image/${match[1]}` : "image/jpeg";

  const fd = new FormData();
  fd.append(fieldName, { uri, name, type });
  return fd;
}
