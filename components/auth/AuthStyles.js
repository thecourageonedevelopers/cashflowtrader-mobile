import { StyleSheet } from "react-native";
import { MONO, BODY } from "../../src/theme/typography";

export const PRIMARY = "#39FF14";

export const authBaseStyles = StyleSheet.create({
  label: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  footerText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontFamily: BODY.regular,
    fontSize: 14,
  },

  footerLink: {
    color: PRIMARY,
    fontFamily: BODY.regular,
  },
});
