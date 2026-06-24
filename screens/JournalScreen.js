import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
} from "react-native";
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
const BLUE = "#60A5FA";
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

function Collapsible({ icon, iconColor, title, preview, children }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.collapsible}>
      <TouchableOpacity
        style={s.collapsibleHeader}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <View style={s.collapsibleTitleRow}>
          <View style={[s.collapsibleIconBox, { borderColor: iconColor + "40", backgroundColor: iconColor + "12" }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.collapsibleTitle}>{title}</Text>
            {!open && preview ? (
              <Text style={s.collapsiblePreview} numberOfLines={1}>{preview}</Text>
            ) : null}
          </View>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="rgba(255,255,255,0.4)"
        />
      </TouchableOpacity>
      {open ? <View style={s.collapsibleBody}>{children}</View> : null}
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
// Markdown block (mirrors AiCoach.jsx MarkdownBlock)
// ─────────────────────────────────────────────────────────────────────────────
function MarkdownBlock({ text }) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let bullets = [];
  let ordered = [];

  const flushBullets = () => {
    if (bullets.length) { blocks.push({ type: "ul", items: [...bullets] }); bullets = []; }
  };
  const flushOrdered = () => {
    if (ordered.length) { blocks.push({ type: "ol", items: [...ordered] }); ordered = []; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushBullets(); flushOrdered(); continue; }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      flushBullets(); flushOrdered();
      blocks.push({ type: "h2", text: line.replace(/^#+\s+/, "") });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushOrdered();
      bullets.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      flushBullets();
      ordered.push(line.replace(/^\d+\.\s/, ""));
    } else {
      flushBullets(); flushOrdered();
      blocks.push({ type: "p", text: line });
    }
  }
  flushBullets(); flushOrdered();

  const renderText = (str) => str.replace(/\*\*(.+?)\*\*/g, "$1");

  return (
    <View style={{ gap: 8 }}>
      {blocks.map((b, i) => {
        if (b.type === "h2") {
          return <Text key={i} style={s.mdH2}>{b.text}</Text>;
        }
        if (b.type === "ul") {
          return (
            <View key={i} style={{ gap: 6 }}>
              {b.items.map((it, j) => (
                <View key={j} style={s.mdBulletRow}>
                  <View style={s.mdBulletDot} />
                  <Text style={s.mdBody}>{renderText(it)}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (b.type === "ol") {
          return (
            <View key={i} style={{ gap: 6 }}>
              {b.items.map((it, j) => (
                <View key={j} style={s.mdBulletRow}>
                  <Text style={[s.mdBody, { color: PRIMARY, width: 20 }]}>
                    {String(j + 1).padStart(2, "0")}
                  </Text>
                  <Text style={s.mdBody}>{renderText(it)}</Text>
                </View>
              ))}
            </View>
          );
        }
        return <Text key={i} style={s.mdBody}>{renderText(b.text)}</Text>;
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Coach section (embedded in Collapsible — mirrors AiCoach.jsx embedded mode)
// ─────────────────────────────────────────────────────────────────────────────
function AiCoachSection() {
  const { showAlert } = useAlert();
  const [period, setPeriod] = useState(30);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchCached = useCallback(async (days) => {
    setLoading(true);
    try {
      const { data } = await journalApi.aiCoachReport(days);
      setReport(data?.exists ? data : null);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchCached(period); }, [period, fetchCached]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await journalApi.generateAiCoachReport(period);
      setReport({ exists: true, ...data });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "AI coach is unavailable right now." });
    } finally {
      setGenerating(false);
    }
  };

  const totals = report?.stats?.totals;

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.coachHint}>
        Pick a window and generate a deep-dive on what&apos;s leaking, what&apos;s working, and the exact rules to follow next.
      </Text>

      {/* Period picker */}
      <View style={s.periodRow}>
        {[7, 30, 60, 90].map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.periodBtn, period === p && s.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[s.periodBtnText, period === p && s.periodBtnTextActive]}>{p}d</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Generate button */}
      <TouchableOpacity
        style={[s.neonBtn, generating && { opacity: 0.5 }]}
        onPress={generate}
        disabled={generating}
      >
        <Ionicons
          name={generating ? "time-outline" : report?.exists ? "refresh-outline" : "sparkles-outline"}
          size={15}
          color="#000"
          style={{ marginRight: 6 }}
        />
        <Text style={s.neonBtnText}>
          {generating ? "Coach is thinking..." : report?.exists ? "Regenerate Report" : "Generate AI Report"}
        </Text>
      </TouchableOpacity>

      {/* Tilt warning */}
      {report?.tilt_warning ? (
        <View style={s.tiltWarning}>
          <Ionicons name="warning-outline" size={16} color={AMBER} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.tiltTitle}>TILT WATCH</Text>
            <Text style={s.tiltBody}>{report.tilt_warning}</Text>
          </View>
        </View>
      ) : null}

      {/* Body */}
      {loading ? (
        <Text style={s.loadingMono}>Loading...</Text>
      ) : !report?.exists ? (
        <View style={s.coachEmpty}>
          <Ionicons name="analytics-outline" size={28} color="rgba(57,255,20,0.6)" />
          <Text style={s.coachEmptyTitle}>
            No report yet for{" "}
            <Text style={{ color: PRIMARY }}>last {period} days</Text>.
          </Text>
          <Text style={s.coachEmptyHint}>
            Tap Generate AI Report and your coach will analyze every trade, every emotion, every mistake — then ship a plan for next week.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {/* Stat strip */}
          {totals && totals.trades > 0 ? (
            <View style={s.statStrip}>
              {[
                { label: "Trades", val: String(totals.trades), accent: false, bad: false },
                { label: "Win Rate", val: `${totals.win_rate_pct}%`, accent: true, bad: false },
                { label: "Net P&L", val: formatMoney(totals.net_pnl, "INR", { showSign: true }), accent: totals.net_pnl >= 0, bad: totals.net_pnl < 0 },
                { label: "R:R", val: totals.risk_reward_ratio || "—", accent: false, bad: false },
              ].map((st) => (
                <View
                  key={st.label}
                  style={[
                    s.statPill,
                    st.bad && { borderColor: RED + "50", backgroundColor: RED + "0D" },
                    st.accent && !st.bad && { borderColor: PRIMARY + "50", backgroundColor: PRIMARY + "0D" },
                  ]}
                >
                  <Text style={s.statPillLabel}>{st.label}</Text>
                  <Text style={[s.statPillVal, st.bad && { color: RED }, st.accent && !st.bad && { color: PRIMARY }]}>
                    {st.val}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <MarkdownBlock text={report.report_markdown} />

          {report.generated_at ? (
            <Text style={s.generatedAt}>
              Generated {new Date(report.generated_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          ) : null}
        </View>
      )}
    </View>
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

            {/* Collapsibles */}
            <View style={s.collapsiblesBlock}>
              {/* Weekly AI Snapshot */}
              <Collapsible
                icon="sparkles-outline"
                iconColor={PRIMARY}
                title="Weekly AI Snapshot"
                preview={stats.weekly?.report || "Log more trades to unlock"}
              >
                <Text style={s.weeklyReport}>
                  {stats.weekly?.report || "Log more trades to unlock your weekly snapshot."}
                </Text>
                {stats.weekly?.trades > 0 ? (
                  <View style={s.miniGrid}>
                    {[
                      { l: "Trades", v: stats.weekly.trades, tone: "white" },
                      { l: "Win Rate", v: `${stats.weekly.win_rate}%`, tone: stats.weekly.win_rate >= 50 ? "neon" : "white" },
                      { l: "Net P&L", v: formatMoney(stats.weekly.net_pnl, "INR", { showSign: true }), tone: stats.weekly.net_pnl >= 0 ? "neon" : "red" },
                    ].map((cell) => (
                      <View key={cell.l} style={s.miniCell}>
                        <Text style={s.miniLabel}>{cell.l}</Text>
                        <Text style={[s.miniVal, cell.tone === "neon" && { color: PRIMARY }, cell.tone === "red" && { color: RED }]}>
                          {String(cell.v)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={s.weeklyHint}>
                  For 7d / 30d / 60d / 90d reports → open AI Trading Coach below
                </Text>
              </Collapsible>

              {/* Pattern Detection */}
              <Collapsible
                icon="analytics-outline"
                iconColor={BLUE}
                title="Pattern Detection"
                preview={
                  stats.patterns?.length
                    ? `${stats.patterns.length} pattern${stats.patterns.length > 1 ? "s" : ""} detected`
                    : "Patterns emerge after 3+ trades"
                }
              >
                {!stats.patterns?.length ? (
                  <Text style={s.emptyHint}>Patterns emerge after 3+ trades with shared tags.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {stats.patterns.map((p, i) => (
                      <View key={i} style={s.patternRow}>
                        <View style={s.patternDot} />
                        <Text style={s.patternText}>{p.message}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {stats.recommendations?.length > 0 ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={s.recTitle}>RECOMMENDATIONS</Text>
                    <View style={{ gap: 4, marginTop: 6 }}>
                      {stats.recommendations.map((r, i) => (
                        <Text key={i} style={s.recItem}>· {r}</Text>
                      ))}
                    </View>
                  </View>
                ) : null}
              </Collapsible>

              {/* AI Trading Coach */}
              <Collapsible
                icon="chatbubble-ellipses-outline"
                iconColor={PRIMARY}
                title="AI Trading Coach"
                preview="GPT deep-dive on 7d / 30d / 60d / 90d performance"
              >
                <AiCoachSection />
              </Collapsible>
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
            <View style={s.dateInputWrap}>
              <TextInput
                style={s.dateInput}
                placeholder="From YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={dateFrom}
                onChangeText={setDateFrom}
              />
            </View>
            <View style={s.dateInputWrap}>
              <TextInput
                style={s.dateInput}
                placeholder="To YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={dateTo}
                onChangeText={setDateTo}
              />
            </View>
          </View>
        </View>

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

  // Collapsibles
  collapsiblesBlock: { gap: 10, marginBottom: 10 },
  collapsible: {
    backgroundColor: GLASS_STRONG_BG,
    borderWidth: 1,
    borderColor: GLASS_STRONG_BORDER,
    borderRadius: 10,
    overflow: "hidden",
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  collapsibleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  collapsibleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  collapsibleTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  collapsiblePreview: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  collapsibleBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Weekly AI section
  weeklyReport: {
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  weeklyHint: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 12,
  },
  miniGrid: {
    flexDirection: "row",
    gap: 8,
  },
  miniCell: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: 10,
  },
  miniLabel: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  miniVal: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginTop: 4,
  },

  // Pattern detection
  patternRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginTop: 7,
  },
  patternText: {
    flex: 1,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  recTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  recItem: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },

  // AI Coach section
  coachHint: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  periodRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 4,
    alignSelf: "flex-start",
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodBtnActive: { backgroundColor: PRIMARY },
  periodBtnText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  periodBtnTextActive: { color: "#000" },
  tiltWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderWidth: 1,
    borderColor: AMBER + "66",
    backgroundColor: AMBER + "0D",
    borderRadius: 8,
  },
  tiltTitle: {
    color: "rgba(251,191,36,0.8)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  tiltBody: {
    color: "#fef3c7",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  coachEmpty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  coachEmptyTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    textAlign: "center",
  },
  coachEmptyHint: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  statStrip: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statPill: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 10,
  },
  statPillLabel: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  statPillVal: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginTop: 2,
  },
  generatedAt: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },

  // Markdown
  mdH2: {
    color: PRIMARY,
    fontFamily: "Inter_900Black",
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  mdBody: {
    flex: 1,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  mdBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  mdBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginTop: 7,
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
  dateInputWrap: { flex: 1 },
  dateInput: {
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  emptyHint: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
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
