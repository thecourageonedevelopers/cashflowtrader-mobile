import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY } from "../auth/AuthStyles";
import { formsApi } from "../../src/api/forms";
import { useAlert } from "../../src/context/AlertContext";

// Web equivalent: PushFormModal.jsx
// Shows pending push-forms as a modal overlay.
// Lifecycle: GET /forms/pending → filter questions → queue
// Submit: POST /forms/{id}/respond; Dismiss: POST /forms/{id}/dismiss

export default function PushFormModal() {
  const { showAlert } = useAlert();
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    formsApi.pending()
      .then((r) => {
        if (active) {
          setQueue(
            (r.data.forms || []).filter(
              (f) => Array.isArray(f.questions) && f.questions.length > 0
            )
          );
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const form = queue[0];
  if (!form) return null;
  const q = form.questions[idx];
  if (!q) return null;
  const last = idx === form.questions.length - 1;
  const answered = !q?.required || (
    Array.isArray(answers[q.id])
      ? answers[q.id].length > 0
      : answers[q.id] !== undefined && answers[q.id] !== ""
  );
  const progress = ((idx + 1) / form.questions.length) * 100;

  const next = async () => {
    if (!last) { setIdx((i) => i + 1); return; }
    setSubmitting(true);
    try {
      await formsApi.respond(form.form_id, answers);
      showAlert({ type: "success", title: "Thanks", message: "Thanks for your feedback!" });
      setQueue((qq) => qq.slice(1));
      setIdx(0);
      setAnswers({});
    } catch {
      showAlert({ type: "error", title: "Error", message: "Could not submit" });
    } finally {
      setSubmitting(false);
    }
  };

  const dismiss = async () => {
    try { await formsApi.dismiss(form.form_id); } catch {}
    setQueue((qq) => qq.slice(1));
    setIdx(0);
    setAnswers({});
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          {/* Progress bar — neon, ((idx+1)/total)*100% */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.body}>
            {/* Header: label + dismiss X */}
            <View style={styles.header}>
              <Text style={styles.beforeCopy}>Before you continue</Text>
              <TouchableOpacity
                onPress={dismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color="rgba(255,255,255,0.40)" />
              </TouchableOpacity>
            </View>

            {/* Form description */}
            {form.description ? (
              <Text style={styles.formDesc}>{form.description}</Text>
            ) : (
              <View style={{ height: 12 }} />
            )}

            {/* Question label + asterisk for required */}
            <Text style={styles.questionLabel}>
              {q.label}
              {q.required ? <Text style={{ color: PRIMARY }}> *</Text> : null}
            </Text>
            {q.sub ? <Text style={styles.questionSub}>{q.sub}</Text> : null}

            {/* Answer input */}
            <View style={styles.inputWrap}>
              <QuestionInput
                q={q}
                value={answers[q.id]}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            </View>

            {/* Actions: "Maybe later" + Next/Submit */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={dismiss}>
                <Text style={styles.skipText}>Maybe later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={next}
                disabled={!answered || submitting}
                style={[styles.nextBtn, (!answered || submitting) && { opacity: 0.5 }]}
              >
                <Text style={styles.nextBtnText}>
                  {last ? (submitting ? "Submitting…" : "Submit") : "Next"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Renders the answer input based on question type.
// Matches web QuestionInput: text, rating (1-5 stars), select (radio), multiselect (checkboxes)
function QuestionInput({ q, value, onChange }) {
  const type = q.type || (q.options?.length ? "select" : "text");

  if (type === "select" && q.options?.length) {
    return (
      <View style={{ gap: 8 }}>
        {q.options.map((opt, i) => {
          const optVal = typeof opt === "string" ? opt : opt.value;
          const optLabel = typeof opt === "string" ? opt : (opt.label || opt.value);
          const selected = value === optVal;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onChange(optVal)}
              style={[styles.radioOption, selected && styles.radioOptionSelected]}
              activeOpacity={0.75}
            >
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{optLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  if (type === "rating") {
    return (
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => onChange(s)}>
            <Ionicons
              name={value >= s ? "star" : "star-outline"}
              size={28}
              color={value >= s ? PRIMARY : "rgba(255,255,255,0.30)"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (type === "multiselect" && q.options?.length) {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (optVal) => {
      onChange(
        selected.includes(optVal)
          ? selected.filter((v) => v !== optVal)
          : [...selected, optVal]
      );
    };
    return (
      <View style={{ gap: 8 }}>
        {q.options.map((opt, i) => {
          const optVal = typeof opt === "string" ? opt : opt.value;
          const optLabel = typeof opt === "string" ? opt : (opt.label || opt.value);
          const isSelected = selected.includes(optVal);
          return (
            <TouchableOpacity
              key={i}
              onPress={() => toggle(optVal)}
              style={[styles.radioOption, isSelected && styles.radioOptionSelected]}
              activeOpacity={0.75}
            >
              <View style={[styles.checkOuter, isSelected && styles.checkOuterSelected]}>
                {isSelected && <Ionicons name="checkmark" size={11} color="#000" />}
              </View>
              <Text style={styles.radioLabel}>{optLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Default: text / textarea
  return (
    <TextInput
      value={value || ""}
      onChangeText={onChange}
      placeholder="Type your answer..."
      placeholderTextColor="rgba(255,255,255,0.30)"
      multiline
      numberOfLines={3}
      style={styles.textInput}
      autoFocus
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  panel: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
  },

  // Progress bar
  progressTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.06)" },
  progressFill: { height: "100%", backgroundColor: "#39FF14" },

  body: { padding: 24 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  beforeCopy: {
    color: "#39FF14",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  formDesc: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Question
  questionLabel: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    lineHeight: 27,
    marginBottom: 4,
  },
  questionSub: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 16,
  },

  inputWrap: { marginTop: 16, marginBottom: 24 },

  // Text input
  textInput: {
    backgroundColor: "rgba(0,0,0,0.40)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
  },

  // Radio (select)
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  radioOptionSelected: {
    borderColor: "rgba(57,255,20,0.50)",
    backgroundColor: "rgba(57,255,20,0.05)",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#555",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: { borderColor: "#39FF14" },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#39FF14" },
  radioLabel: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },

  // Checkbox (multiselect)
  checkOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#555",
    justifyContent: "center",
    alignItems: "center",
  },
  checkOuterSelected: {
    backgroundColor: "#39FF14",
    borderColor: "#39FF14",
  },

  // Actions
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipText: {
    color: "rgba(255,255,255,0.40)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  nextBtn: {
    backgroundColor: "#39FF14",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  nextBtnText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
