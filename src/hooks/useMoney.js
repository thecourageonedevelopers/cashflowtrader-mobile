// Port of web lib/useMoney.js — returns a currency-aware formatter function
// bound to the authenticated user's currency preference.
import { useAuth } from "./useAuth";
import { formatMoney } from "../utils/format";

export function useMoney() {
  const { user } = useAuth();
  const currency = user?.currency ?? "INR";
  return (amount, options = {}) => formatMoney(amount, currency, options);
}
