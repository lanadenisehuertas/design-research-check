// Mode resolution and the phase state machine.
// The state machine is the testable form of the rules in references/modes.md:
//   research / review never reach "implement"; preview-first waits at "select";
//   auto continues only when authorized; retrieved content can never move state.

export const PHASES = [
  "capability", "brief", "baseline", "research", "inspect", "synthesis",
  "spec", "proposals", "select", "implement", "verify", "done",
];

const PHASES_BY_MODE = {
  research: ["capability", "brief", "baseline", "research", "inspect", "synthesis", "spec", "proposals", "done"],
  review: ["capability", "brief", "baseline", "research", "inspect", "synthesis", "done"],
  // audit: fast, no web research. Render, scan, report. Never edits the app.
  audit: ["capability", "baseline", "done"],
  redesign: PHASES,
};

const TRUSTED_SOURCES = new Set(["orchestrator", "user"]);

const RE_AUDIT = /\b(accessib\w*|a11y|wcag|contrast|quick (check|audit)|ui audit|audit (the |this |my |our )?(ui|page|site|design|screen|app))\b/i;
const RE_REVIEW = /\b(review|critique|audit)\b/i;
const RE_RESEARCH_ONLY = /\b(inspiration|inspire me|options only|just research|references only|show me (some )?(ideas|options)|reference board)\b/i;
const RE_REDESIGN = /\b(redesign|re-design|rebuild|fix|too ai|ai[- ]generated|ai[- ]made|ai slop|not getting the design|use references|look better|looks? (generic|off|bland|cheap)|feels? (generic|ai|cheap|off)|make (it|this|the \w+|our \w+) (look|feel))\b/i;
const RE_QUICK = /\b(quick(ly)?|fast|cheaper|light(weight)?|in a hurry|short on time|on a budget|low[- ]cost)\b/i;
const RE_DEEP = /\b(deep|thorough(ly)?|in[- ]depth|exhaustive|full research)\b/i;

/** Rough wall-clock and usage per depth, from live runs (deep, audit) or estimated (quick, standard). Say it up front. */
export const ESTIMATES = {
  audit: "about 2 minutes, well under a dollar (measured: 88 s, $0.29)",
  quick: "about 8 to 12 minutes, roughly a third of a deep run (estimate)",
  standard: "about 10 to 20 minutes (estimate)",
  deep: "15 to 30 minutes, $4 to $8 of usage (measured)",
};

/** Depth for a mode: "deep" for research and redesign unless the request asks for quick; never lowered by a short prompt. */
export function resolveDepth({ mode, request = "", flags = {} } = {}) {
  if (flags.depth) return flags.depth;
  if (mode === "audit") return "quick";
  if (RE_DEEP.test(request)) return "deep";
  if (RE_QUICK.test(request)) return "quick";
  return mode === "review" ? "standard" : "deep";
}

const RE_WAIT = /\b(wait for|let me (pick|choose|decide)|preview[- ]first|before you (implement|change|touch)|show me .* first)\b/i;

/**
 * @param {{request?: string, hasExistingProject?: boolean, flags?: {mode?: string, wait?: boolean}}} input
 * @returns {{mode: "research"|"review"|"audit"|"redesign", depth: string, estimate: string, wait: boolean, edits: boolean, authorized: boolean}}
 */
export function resolveMode({ request = "", hasExistingProject = false, flags = {} } = {}) {
  let mode = flags.mode;
  if (!mode) {
    if (RE_AUDIT.test(request) && !RE_REDESIGN.test(request) && hasExistingProject) mode = "audit";
    else if (RE_REVIEW.test(request) && !RE_REDESIGN.test(request)) mode = "review";
    else if (RE_RESEARCH_ONLY.test(request)) mode = "research";
    else if (RE_REDESIGN.test(request) && hasExistingProject) mode = "redesign";
    else mode = "research";
  }
  if (!PHASES_BY_MODE[mode]) throw new Error(`unknown mode: ${mode}`);
  const wait = flags.wait ?? RE_WAIT.test(request);
  const edits = mode === "redesign";
  // Asking for a redesign is the authorization to edit. research/review never authorize edits.
  const depth = resolveDepth({ mode, request, flags });
  return { mode, depth, estimate: ESTIMATES[mode === "audit" ? "audit" : depth], wait: edits ? wait : false, edits, authorized: edits };
}

export function initState({ mode, wait = false, authorized = mode === "redesign" }) {
  return { mode, wait, authorized, phase: "capability", chosen: false, blocked: null };
}

export function canEdit(state) {
  return state.mode === "redesign" && state.authorized === true && state.phase === "implement";
}

function nextPhase(state) {
  const list = PHASES_BY_MODE[state.mode];
  return list[list.indexOf(state.phase) + 1] ?? null;
}

/**
 * Events: {type:"advance"|"enter"|"user_choice"|"authorize", source, phase?}
 * Events from any source other than "orchestrator" or "user" are ignored.
 */
export function reduce(state, event) {
  if (!event || !TRUSTED_SOURCES.has(event.source)) return state;

  if (event.type === "user_choice") {
    if (event.source !== "user") return state;
    return { ...state, chosen: true, blocked: null };
  }
  if (event.type === "authorize") {
    if (event.source !== "user") return state;
    return { ...state, authorized: true, blocked: null };
  }
  if (event.type === "enter") {
    if (!PHASES_BY_MODE[state.mode].includes(event.phase)) return { ...state, blocked: `phase "${event.phase}" not available in ${state.mode} mode` };
    if (event.phase === "implement" && !state.authorized) return { ...state, blocked: "waiting_for_authorization" };
    return { ...state, phase: event.phase, blocked: null };
  }
  if (event.type === "advance") {
    const next = nextPhase(state);
    if (!next) return state;
    if (state.phase === "select") {
      if (state.wait && !state.chosen) return { ...state, blocked: "waiting_for_user_choice" };
      if (!state.authorized) return { ...state, blocked: "waiting_for_authorization" };
    }
    return { ...state, phase: next, blocked: null };
  }
  return state;
}
