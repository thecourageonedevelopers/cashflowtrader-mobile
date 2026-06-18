import { StyleSheet } from "react-native";

export const PRIMARY = "#39FF14";

export const authBaseStyles = StyleSheet.create({
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  logoLetter: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
  },

  brandText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },

  label: {
    color: "#777",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },

  footerText: {
    textAlign: "center",
    color: "#888",
  },

  footerLink: {
    color: PRIMARY,
    fontWeight: "700",
  },
});
