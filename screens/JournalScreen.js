import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ScreenLayout from "../components/common/ScreenLayout";
import { journalApi } from "../src/api/journal";
import { tokenService } from "../src/services/tokenService";
import { useAlert } from "../src/context/AlertContext";
import { formatDate, formatMoney, moneyColor } from "../src/utils/format";
import WithdrawalsCard from "../components/journal/WithdrawalsCard";
import AutoJournalCard from "../components/journal/AutoJournalCard";

const PRIMARY = "#39FF14";
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const GLASS_BG = "rgba(255,255,255,0.03)";
const GLASS_BORDER = "rgba(255,255,255,0.08)";
const GLASS_STRONG_BG = "rgba(10,10,10,0.9)";
const GLASS_STRONG_BORDER = "rgba(255,255,255,0.1)";
const AMBER = "#FBBF24";
const RED = "#f87171";

// ─────────────────────────────────────────────────────────────────────────────
// Small shared components
// ─────────────────────────────────────────────────────────────────────────────

function HeaderChip({ icon, children }) {
  return (
    <View style={s.headerChip}>
      {icon ? (
        <Ionicons name={icon} size={12} color={PRIMARY} style={{ marginRight: 5 }} />
      ) : null}
      <Text style={s.headerChipText}>{children}</Text>
    </View>
  );
}

function KpiCard({ label, value, sub }) {
  return (
    <View style={s.kpiCard}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function MicroCard({ label, value, color }) {
  const has = value && value !== "—";
  return (
    <View style={[s.microCard, has && { borderColor: color + "55" }]}>
      <View style={s.microCardHeader}>
        <View style={[s.microDot, { backgroundColor: has ? color : "rgba(255,255,255,0.25)" }]} />
        <Text style={s.microLabel}>{label}</Text>
      </View>
      <Text style={[s.microValue, { color: has ? color : "rgba(255,255,255,0.4)" }]} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

function FilterChipBtn({ label, active, tone, onPress }) {
  const activeBg =
    tone === "green" ? PRIMARY : tone === "red" ? RED : "#fff";
  const activeText = "#000";
  const activeBorder = tone === "green" ? PRIMARY : tone === "red" ? RED : "#fff";
  return (
    <TouchableOpacity
      style={[
        s.filterChip,
        active && { backgroundColor: activeBg, borderColor: activeBorder },
      ]}
      onPress={onPress}
    >
      <Text style={[s.filterChipText, active && { color: activeText }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade card (mirrors web journal card)
// ─────────────────────────────────────────────────────────────────────────────
function TradeCard({ entry, onPress, onDelete }) {
  const pnl = parseFloat(entry.pnl ?? 0);
  const pnlCol = moneyColor(pnl);
  const result = (entry.result || "").toLowerCase();
  const direction = (entry.direction || "").toLowerCase();
  const isPending = (entry.status || "") === "pending";

  const dirCol = direction === "long" ? PRIMARY : RED;
  const resCol =
    result === "win" ? PRIMARY : result === "loss" ? RED : "rgba(255,255,255,0.7)";

  const setupTags = (entry.setup_tags || []).slice(0, 3);
  const emotions = (entry.emotions || []).slice(0, 2);
  const mistakes = (entry.mistakes || []).slice(0, 2);
  const hasTags = setupTags.length + emotions.length + mistakes.length > 0;

  return (
    <TouchableOpacity style={s.tradeCard} onPress={onPress} activeOpacity={0.8}>
      {/* Delete */}
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={15} color="rgba(255,255,255,0.35)" />
      </TouchableOpacity>

      {/* Badge row */}
      <View style={s.badgeRow}>
        {entry.market ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{entry.market}</Text>
          </View>
        ) : null}
        {direction ? (
          <View style={[s.badge, { borderColor: dirCol + "55", backgroundColor: dirCol + "1A" }]}>
            <Ionicons
              name={direction === "long" ? "trending-up-outline" : "trending-down-outline"}
              size={11}
              color={dirCol}
              style={{ marginRight: 3 }}
            />
            <Text style={[s.badgeText, { color: dirCol }]}>{direction.toUpperCase()}</Text>
          </View>
        ) : null}
        {result ? (
          <View style={[s.badge, { borderColor: resCol + "55", backgroundColor: resCol + "1A" }]}>
            <Text style={[s.badgeText, { color: resCol }]}>{result.toUpperCase()}</Text>
          </View>
        ) : null}
        {isPending ? (
          <View style={[s.badge, { borderColor: AMBER + "55", backgroundColor: AMBER + "1A" }]}>
            <Text style={[s.badgeText, { color: AMBER }]}>PENDING</Text>
          </View>
        ) : null}
      </View>

      {/* P&L hero */}
      {(entry.pnl !== 0 && entry.pnl != null) ? (
        <Text style={[s.pnlHero, { color: pnlCol }]}>
          {formatMoney(pnl, "INR", { showSign: true })}
        </Text>
      ) : null}

      {/* Trade name */}
      <Text style={s.tradeName} numberOfLines={1}>{entry.trade_name || "Untitled Trade"}</Text>

      {/* Date */}
      {entry.date ? (
        <View style={s.dateRow}>
          <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
          <Text style={s.dateText}>{formatDate(entry.date)}</Text>
        </View>
      ) : null}

      {/* Tags */}
      {hasTags ? (
        <View style={s.tagRow}>
          {setupTags.map((t) => (
            <View key={t} style={s.tagPillWhite}>
              <Text style={s.tagTextWhite}>{t}</Text>
            </View>
          ))}
          {emotions.map((t) => (
            <View key={t} style={s.tagPillNeon}>
              <Text style={s.tagTextNeon}>{t}</Text>
            </View>
          ))}
          {mistakes.map((t) => (
            <View key={t} style={s.tagPillRed}>
              <Text style={s.tagTextRed}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Reflection */}
      {entry.reflection ? (
        <Text style={s.reflection} numberOfLines={2}>
          &ldquo;{entry.reflection}&rdquo;
        </Text>
      ) : null}

      {/* Footer */}
      <View style={s.cardFooter}>
        <Text style={s.footerLeft}>Tap for full breakdown</Text>
        <Text style={s.footerRight}>Open →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function JournalScreen({ navigation }) {
  const qc = useQueryClient();
  const { showAlert, showConfirm } = useAlert();

  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fDir, setFDir] = useState("all");
  const [fResult, setFResult] = useState("all");
  const [fMarket, setFMarket] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const parsePickerDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const {
    data: entries = [],
    isLoading: loadingEntries,
    refetch: refetchEntries,
  } = useQuery({
    queryKey: ["journals"],
    queryFn: () => journalApi.list().then((r) => r.data || []),
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["analyticsDashboard"],
    queryFn: () => journalApi.analyticsDashboard().then((r) => r.data).catch(() => null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => journalApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journals"] });
      qc.invalidateQueries({ queryKey: ["analyticsDashboard"] });
    },
  });

  const handleDelete = (entry) => {
    showConfirm({
      title: "Delete trade?",
      message: `"${entry.trade_name || "Untitled"}" will be permanently removed.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => deleteMutation.mutate(entry.entry_id),
    });
  };

  const markets = useMemo(
    () => [...new Set(entries.map((e) => e.market).filter(Boolean))].sort(),
    [entries]
  );

  const ql = q.trim().toLowerCase();
  const view = useMemo(
    () =>
      entries.filter((e) => {
        if (fDir !== "all" && (e.direction || "").toLowerCase() !== fDir) return false;
        if (fResult !== "all" && (e.result || "").toLowerCase() !== fResult) return false;
        if (fMarket !== "all" && (e.market || "") !== fMarket) return false;
        if (dateFrom && (e.date || "") < dateFrom) return false;
        if (dateTo && (e.date || "") > dateTo) return false;
        if (ql) {
          const hay = [
            e.trade_name, e.market, e.reflection, e.notes,
            ...(e.setup_tags || []), ...(e.emotions || []), ...(e.mistakes || []),
          ].join(" ").toLowerCase();
          if (!hay.includes(ql)) return false;
        }
        return true;
      }),
    [entries, fDir, fResult, fMarket, dateFrom, dateTo, ql]
  );

  const filtersActive =
    fDir !== "all" || fResult !== "all" || fMarket !== "all" || !!ql || !!dateFrom || !!dateTo;

  const clearFilters = () => {
    setFDir("all"); setFResult("all"); setFMarket("all");
    setQ(""); setDateFrom(""); setDateTo("");
  };

  const downloadReport = async (format) => {
    setReportBusy(format);
    setReportOpen(false);
    try {
      const token = await tokenService.get();
      const params = { format };
      if (q) params.q = q;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (fDir !== "all") params.direction = fDir;
      if (fResult !== "all") params.result = fResult;
      if (fMarket !== "all") params.market = fMarket;
      const qs = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      const url = `${API_URL}/api/journal/report?${qs}`;
      const ext = format === "pdf" ? "pdf" : format === "csv" ? "csv" : "html";
      const dest = new File(Paths.cache, `cashflow_report.${ext}`);
      const downloaded = await File.downloadFileAsync(url, dest, {
        headers: { Authorization: `Bearer ${token || ""}` },
        idempotent: true,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showAlert({ type: "success", title: "Downloaded", message: `Report saved as cashflow_report.${ext}` });
        return;
      }
      const mimeMap = { pdf: "application/pdf", csv: "text/csv", html: "text/html" };
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: mimeMap[format] || "application/octet-stream",
        dialogTitle: `cashflow_report.${ext}`,
        UTI: format === "pdf" ? "com.adobe.pdf" : format === "csv" ? "public.comma-separated-values-text" : "public.html",
      });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: "Could not generate the report." });
    } finally {
      setReportBusy("");
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEntries(), refetchStats()]);
    setRefreshing(false);
  }, [refetchEntries, refetchStats]);

  return (
    <ScreenLayout screenName="JournalScreen" navigation={navigation}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <HeaderChip icon="scan-outline">Trading AI</HeaderChip>
          <Text style={s.h1}>
            Your trading <Text style={{ color: PRIMARY }}>brain.</Text>
          </Text>
        </View>

        {/* ── Withdrawals ─────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <WithdrawalsCard onNavigate={(screen) => navigation.navigate(screen)} />
        </View>

        {/* ── AutoJournal ─────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <AutoJournalCard
            onImported={() => {
              refetchEntries();
              refetchStats();
            }}
            onNavigateToNew={() => navigation.navigate("JournalNew")}
          />
        </View>

        {/* ── Analytics KPIs ─────────────────────────────────────────────── */}
        {stats ? (
          <>
            <View style={s.kpiGrid}>
              <KpiCard
                label="Total Trades"
                value={stats.total_trades != null ? String(stats.total_trades) : "—"}
                sub={stats.total_trades ? `${stats.wins || 0}W · ${stats.losses || 0}L` : "First trade waiting"}
              />
              <KpiCard
                label="Win Rate"
                value={stats.total_trades ? `${stats.win_rate}%` : "—"}
                sub={stats.total_trades ? "Of all trades logged" : "Day 1"}
              />
              <KpiCard
                label="Net P&L"
                value={
                  stats.total_trades
                    ? formatMoney(stats.net_pnl || 0, "INR", { showSign: true })
                    : "—"
                }
                sub={stats.total_trades ? "All-time" : "Awaiting data"}
              />
              <KpiCard
                label="Avg Risk:Reward"
                value={stats.avg_risk_reward || "—"}
                sub={stats.avg_risk_reward ? "Wins ÷ Losses" : "Awaiting data"}
              />
              <KpiCard
                label="Avg Holding Time"
                value={stats.avg_holding_label || "—"}
                sub={stats.avg_holding_minutes ? "Open → close" : "Add trade times"}
              />
            </View>

            {/* MicroStats */}
            <View style={s.microRow}>
              <MicroCard label="TOP MISTAKE" value={stats.top_mistake || "—"} color={AMBER} />
              <MicroCard label="BEST MARKET" value={stats.best_market || "—"} color={PRIMARY} />
            </View>

          </>
        ) : null}

        {/* ── Search + Date filters ───────────────────────────────────────── */}
        <View style={s.filterCard}>
          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search trade, market, tag..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={q}
              onChangeText={setQ}
            />
          </View>
          <View style={s.filterDatesRow}>
            {Platform.OS === "web" ? (
              <>
                <View style={s.dateButton}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 6 }} />
                  <input
                    type="date"
                    value={dateFrom || ""}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: dateFrom ? "#fff" : "rgba(255,255,255,0.2)",
                      fontSize: "13px",
                      cursor: "pointer",
                      colorScheme: "dark",
                      fontFamily: "inherit",
                    }}
                  />
                </View>
                <View style={s.dateButton}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 6 }} />
                  <input
                    type="date"
                    value={dateTo || ""}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: dateTo ? "#fff" : "rgba(255,255,255,0.2)",
                      fontSize: "13px",
                      cursor: "pointer",
                      colorScheme: "dark",
                      fontFamily: "inherit",
                    }}
                  />
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity style={s.dateButton} onPress={() => setShowFromPicker(true)}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 6 }} />
                  <Text style={dateFrom ? s.dateButtonText : s.dateButtonPlaceholder}>
                    {dateFrom || "From date"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.dateButton} onPress={() => setShowToPicker(true)}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 6 }} />
                  <Text style={dateTo ? s.dateButtonText : s.dateButtonPlaceholder}>
                    {dateTo || "To date"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.filterApplyBtn} onPress={() => refetchEntries()}>
                  <Ionicons name="funnel-outline" size={16} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Date pickers ─────────────────────────────────────────────────── */}
        {showFromPicker && Platform.OS === "android" && (
          <DateTimePicker
            value={parsePickerDate(dateFrom)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowFromPicker(false);
              if (event.type !== "dismissed" && date) {
                setDateFrom(date.toISOString().slice(0, 10));
              }
            }}
          />
        )}
        {showToPicker && Platform.OS === "android" && (
          <DateTimePicker
            value={parsePickerDate(dateTo)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowToPicker(false);
              if (event.type !== "dismissed" && date) {
                setDateTo(date.toISOString().slice(0, 10));
              }
            }}
          />
        )}
        <Modal
          transparent
          animationType="fade"
          visible={showFromPicker && Platform.OS === "ios"}
          onRequestClose={() => setShowFromPicker(false)}
        >
          <View style={s.pickerOverlay}>
            <View style={s.pickerBox}>
              <DateTimePicker
                value={parsePickerDate(dateFrom)}
                mode="date"
                display="inline"
                onChange={(event, date) => {
                  if (date) setDateFrom(date.toISOString().slice(0, 10));
                }}
                themeVariant="dark"
                accentColor={PRIMARY}
              />
              <TouchableOpacity style={s.pickerDoneBtn} onPress={() => setShowFromPicker(false)}>
                <Text style={s.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          transparent
          animationType="fade"
          visible={showToPicker && Platform.OS === "ios"}
          onRequestClose={() => setShowToPicker(false)}
        >
          <View style={s.pickerOverlay}>
            <View style={s.pickerBox}>
              <DateTimePicker
                value={parsePickerDate(dateTo)}
                mode="date"
                display="inline"
                onChange={(event, date) => {
                  if (date) setDateTo(date.toISOString().slice(0, 10));
                }}
                themeVariant="dark"
                accentColor={PRIMARY}
              />
              <TouchableOpacity style={s.pickerDoneBtn} onPress={() => setShowToPicker(false)}>
                <Text style={s.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Quick filter chips (only when entries exist) ────────────────── */}
        {entries.length > 0 ? (
          <View style={s.quickFilterCard}>
            <View style={s.quickFilterHeader}>
              <Text style={s.quickFilterTitle}>FILTERS</Text>
              <TouchableOpacity
                style={[s.reportBtn, !!reportBusy && { opacity: 0.5 }]}
                onPress={() => setReportOpen((o) => !o)}
                disabled={!!reportBusy}
              >
                <Ionicons name="download-outline" size={12} color="#000" style={{ marginRight: 5 }} />
                <Text style={s.reportBtnText}>
                  {reportBusy ? `${reportBusy.toUpperCase()}…` : "Get Report"}
                </Text>
                {!reportBusy ? (
                  <Ionicons
                    name={reportOpen ? "chevron-up" : "chevron-down"}
                    size={11}
                    color="#000"
                    style={{ marginLeft: 4 }}
                  />
                ) : null}
              </TouchableOpacity>
            </View>

            {/* Report dropdown */}
            {reportOpen ? (
              <View style={s.reportMenu}>
                {[
                  ["pdf", "PDF — full report"],
                  ["html", "HTML — vibrant"],
                  ["csv", "CSV — raw data"],
                ].map(([fmt, label]) => (
                  <TouchableOpacity
                    key={fmt}
                    style={s.reportMenuItem}
                    onPress={() => downloadReport(fmt)}
                  >
                    <Text style={s.reportMenuItemText}>{label}</Text>
                  </TouchableOpacity>
                ))}
                {filtersActive ? (
                  <View style={s.reportMenuFooter}>
                    <Text style={s.reportMenuFooterText}>
                      Filters applied · {view.length} trade{view.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Direction */}
            <View style={s.chipGroup}>
              <Text style={s.chipGroupLabel}>Direction</Text>
              <View style={s.chipGroupRow}>
                {[
                  { val: "all", label: "All" },
                  { val: "long", label: "Long", tone: "green" },
                  { val: "short", label: "Short", tone: "red" },
                ].map(({ val, label, tone }) => (
                  <FilterChipBtn
                    key={val}
                    label={label}
                    active={fDir === val}
                    tone={tone}
                    onPress={() => setFDir(val)}
                  />
                ))}
              </View>
            </View>

            {/* Result */}
            <View style={s.chipGroup}>
              <Text style={s.chipGroupLabel}>Result</Text>
              <View style={s.chipGroupRow}>
                {[
                  { val: "all", label: "All" },
                  { val: "win", label: "Win", tone: "green" },
                  { val: "loss", label: "Loss", tone: "red" },
                  { val: "breakeven", label: "Breakeven" },
                ].map(({ val, label, tone }) => (
                  <FilterChipBtn
                    key={val}
                    label={label}
                    active={fResult === val}
                    tone={tone}
                    onPress={() => setFResult(val)}
                  />
                ))}
              </View>
            </View>

            {/* Symbol */}
            {markets.length > 0 ? (
              <View style={s.chipGroup}>
                <Text style={s.chipGroupLabel}>Symbol</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[s.chipGroupRow, { paddingRight: 4 }]}>
                    <FilterChipBtn label="All" active={fMarket === "all"} onPress={() => setFMarket("all")} />
                    {markets.map((m) => (
                      <FilterChipBtn key={m} label={m} active={fMarket === m} onPress={() => setFMarket(m)} />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}

            {/* Active filter count + clear */}
            {filtersActive ? (
              <View style={s.filterStatusRow}>
                <Text style={s.filterCount}>
                  Showing {view.length} of {entries.length}
                </Text>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={s.clearBtn}>Clear filters</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Entry list ─────────────────────────────────────────────────── */}
        {loadingEntries ? (
          <Text style={s.loadingMono}>Loading...</Text>
        ) : entries.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>
              Your first trade <Text style={{ color: PRIMARY }}>is waiting.</Text>
            </Text>
            <Text style={s.emptySubtitle}>
              30 seconds. Tap a few chips. Insights generate themselves.
            </Text>
            <TouchableOpacity
              style={s.neonBtn}
              onPress={() => navigation.navigate("JournalNew")}
            >
              <Ionicons name="add" size={15} color="#000" style={{ marginRight: 6 }} />
              <Text style={s.neonBtnText}>Log First Trade</Text>
            </TouchableOpacity>
          </View>
        ) : view.length === 0 ? (
          <View style={s.noMatchCard}>
            <Text style={s.noMatchTitle}>No trades match these filters.</Text>
            <TouchableOpacity style={s.neonBtn} onPress={clearFilters}>
              <Text style={s.neonBtnText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.cardList}>
            {view.map((entry) => (
              <TradeCard
                key={entry.entry_id}
                entry={entry}
                onPress={() => navigation.navigate("TradeDetail", { entry })}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Header
  header: { marginBottom: 20 },
  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PRIMARY + "55",
    backgroundColor: PRIMARY + "15",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  headerChipText: {
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  h1: {
    fontFamily: "Inter_900Black",
    fontSize: 36,
    color: "#fff",
    letterSpacing: -1,
    lineHeight: 42,
  },

  // KPI grid: 2 cols, last item stretches full width if odd count
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  kpiCard: {
    width: "47.5%",
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 10,
    padding: 14,
  },
  kpiLabel: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  kpiValue: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 28,
    marginTop: 6,
    lineHeight: 32,
  },
  kpiSub: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 6,
  },

  // MicroStats
  microRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  microCard: {
    flex: 1,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 10,
    padding: 14,
  },
  microCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  microLabel: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  microValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },

  // Filters
  filterCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  filterDatesRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButtonText: {
    flex: 1,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  dateButtonPlaceholder: {
    flex: 1,
    color: "rgba(255,255,255,0.2)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  filterApplyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerBox: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    width: 340,
  },
  pickerDoneBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    alignItems: "center",
  },
  pickerDoneText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1,
  },

  // Quick filters
  quickFilterCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 10,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  quickFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickFilterTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  reportBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  reportBtnText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  reportMenu: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: -4,
  },
  reportMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  reportMenuItemText: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  reportMenuFooter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  reportMenuFooterText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  chipGroup: { gap: 8 },
  chipGroupLabel: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  chipGroupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  filterChipText: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  filterStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterCount: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  clearBtn: {
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },

  // Loading / empty
  loadingMono: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 20,
  },
  emptyCard: {
    backgroundColor: GLASS_STRONG_BG,
    borderWidth: 1,
    borderColor: GLASS_STRONG_BORDER,
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  emptyTitle: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 32,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 6,
  },
  noMatchCard: {
    backgroundColor: GLASS_STRONG_BG,
    borderWidth: 1,
    borderColor: GLASS_STRONG_BORDER,
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  noMatchTitle: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 22,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  // Trade cards
  cardList: { gap: 12, marginTop: 4 },
  tradeCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 12,
    padding: 18,
  },
  deleteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingRight: 32,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  pnlHero: {
    fontFamily: "Inter_900Black",
    fontSize: 30,
    marginTop: 10,
    lineHeight: 34,
  },
  tradeName: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginTop: 4,
    lineHeight: 24,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  dateText: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tagPillWhite: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tagTextWhite: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  tagPillNeon: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY + "55",
    backgroundColor: PRIMARY + "14",
  },
  tagTextNeon: {
    color: PRIMARY,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  tagPillRed: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RED + "55",
    backgroundColor: RED + "14",
  },
  tagTextRed: {
    color: RED,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  reflection: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
    marginTop: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  footerLeft: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  footerRight: {
    color: PRIMARY,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
  },

  // Neon button
  neonBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  neonBtnText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1,
  },

});
