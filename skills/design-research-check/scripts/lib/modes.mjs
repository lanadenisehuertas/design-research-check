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
  redesign: PHASES,
};

const TRUSTED_SOURCES = new Set(["orchestrator", "user"]);

const RE_REVIEW = /\b(review|critique|audit)\b/i;
const RE_RESEARCH_ONLY = /\b(inspiration|inspire me|options only|just research|references only|show me (some )?(ideas|options)|reference board)\b/i;
const RE_REDESIGN = /\b(redesign|re-design|rebuild|fix|too ai|ai[- ]generated|ai[- ]made|ai slop|not getting the design|use references|look better|looks? (generic|off|bland|cheap)|feels? (generic|ai|cheap|off)|make (it|this|the \w+|our \w+) (look|feel))\b/i;
const RE_WAIT = /\b(wait for|let me (pick|choose|decide)|preview[- ]first|before you (implement|change|touch)|show me .* first)\b/i;

/**
 * @param {{request?: string, hasExistingProject?: boolean, flags?: {mode?: string, wait?: boolean}}} input
 * @returns {{mode: "research"|"review"|"redesign", wait: boolean, edits: boolean, authorized: boolean}}
 */
export function resolveMode({ request = "", hasExistingProject = false, flags = {} } = {}) {
  let mode = flags.mode;
  if (!mode) {
    if (RE_REVIEW.test(request) && !RE_REDESIGN.test(request)) mode = "review";
    else if (RE_RESEARCH_ONLY.test(request)) mode = "research";
    else if (RE_REDESIGN.test(request) && hasExistingProject) mode = "redesign";
    else mode = "research";
  }
  if (!PHASES_BY_MODE[mode]) throw new Error(`unknown mode: ${mode}`);
  const wait = flags.wait ?? RE_WAIT.test(request);
  const edits = mode === "redesign";
  // Asking for a redesign is the authorization to edit. research/review never authorize edits.
  return { mode, wait: edits ? wait : false, edits, authorized: edits };
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
