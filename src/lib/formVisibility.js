// Port of web src/lib/formVisibility.js — conditional ("branching") question visibility for
// admin-built forms. Only the subset FormItem (challenge "form" item type) actually needs;
// web's admin-only builder helpers (conditionSourceOptions/conditionValueOptions) are not ported
// since mobile has no form-builder UI.
//
// This MUST stay in lockstep with FormsService.isQuestionVisible on the backend — same contract
// web's copy documents. Both sides fail open (a malformed/missing condition means "always
// visible") so a bad builder edit degrades to showing too much, never to a dead form.

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim());

/** True when `question` should be shown, given the answers so far. */
export function isQuestionVisible(question, answers) {
  const cond = question?.visible_if;
  if (!cond || typeof cond !== "object") return true;

  const sourceId = norm(cond.question_id);
  if (!sourceId) return true;

  const actual = norm(answers?.[sourceId]).toLowerCase();
  const operator = norm(cond.operator) || "eq";

  if (operator === "neq") return actual !== norm(cond.value).toLowerCase();
  if (operator === "any_of") {
    if (!Array.isArray(cond.value)) return true;
    return cond.value.some((o) => norm(o).toLowerCase() === actual);
  }
  return actual === norm(cond.value).toLowerCase();
}

/** The subset of `questions` that is both enabled and currently visible. */
export function visibleQuestions(questions, answers) {
  return (questions || [])
    .filter((q) => q.enabled !== false)
    .filter((q) => isQuestionVisible(q, answers));
}

/** Answers with entries for now-hidden questions stripped out — call before submitting. */
export function pruneHiddenAnswers(questions, answers) {
  const visibleIds = new Set(visibleQuestions(questions, answers).map((q) => q.id));
  return Object.fromEntries(Object.entries(answers || {}).filter(([id]) => visibleIds.has(id)));
}
