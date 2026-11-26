// FIXTURE-based logic tests for modes and the phase state machine (cases 7, 8, and the state side of 10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { canEdit, initState, reduce, resolveMode, PHASES } from "../skills/design-research-check/scripts/lib/modes.mjs";

const ORCH = (type, extra = {}) => ({ type, source: "orchestrator", ...extra });

function runTo(state, phase) {
  let s = state;
  let guard = 0;
  while (s.phase !== phase && guard++ < 30) s = reduce(s, ORCH("advance"));
  return s;
}

test("redesign request on an existing project resolves to redesign + auto", () => {
  const r = resolveMode({ request: "This looks too AI-generated, redesign this page", hasExistingProject: true });
  assert.deepEqual({ ...r, estimate: undefined }, { mode: "redesign", depth: "deep", estimate: undefined, wait: false, edits: true, authorized: true });
});

for (const request of ["make this look premium", "this feels AI-made, fix it", "make our homepage feel less generic", "the site looks cheap"]) {
  test(`minimal aesthetic request "${request}" resolves to redesign`, () => {
    assert.equal(resolveMode({ request, hasExistingProject: true }).mode, "redesign");
  });
}

test("inspiration request resolves to research with no edits", () => {
  const r = resolveMode({ request: "show me some inspiration for a skincare site", hasExistingProject: true });
  assert.equal(r.mode, "research");
  assert.equal(r.edits, false);
});

test("explicit wait request sets wait", () => {
  const r = resolveMode({ request: "redesign it but let me pick the direction first", hasExistingProject: true });
  assert.equal(r.mode, "redesign");
  assert.equal(r.wait, true);
});

test("review request resolves to review", () => {
  assert.equal(resolveMode({ request: "review my page against the brief", hasExistingProject: true }).mode, "review");
});

test("flags override inference", () => {
  assert.equal(resolveMode({ request: "redesign", hasExistingProject: true, flags: { mode: "research" } }).mode, "research");
});

test("case 7: research and review never reach implement", () => {
  for (const mode of ["research", "review"]) {
    let s = initState({ mode });
    const visited = new Set([s.phase]);
    for (let i = 0; i < 30; i++) {
      s = reduce(s, ORCH("advance"));
      visited.add(s.phase);
      assert.equal(canEdit(s), false);
    }
    assert.ok(!visited.has("implement"), `${mode} visited implement`);
    assert.equal(s.phase, "done");
    const forced = reduce(s, ORCH("enter", { phase: "implement" }));
    assert.equal(forced.phase, "done");
    assert.match(forced.blocked, /not available/);
  }
});

test("case 8: preview-first waits at select until the user chooses", () => {
  let s = runTo(initState({ mode: "redesign", wait: true }), "select");
  s = reduce(s, ORCH("advance"));
  assert.equal(s.phase, "select");
  assert.equal(s.blocked, "waiting_for_user_choice");
  s = reduce(s, { type: "user_choice", source: "user" });
  s = reduce(s, ORCH("advance"));
  assert.equal(s.phase, "implement");
  assert.equal(canEdit(s), true);
});

test("case 8: auto continues past select when authorized", () => {
  let s = runTo(initState({ mode: "redesign", wait: false, authorized: true }), "select");
  s = reduce(s, ORCH("advance"));
  assert.equal(s.phase, "implement");
});

test("auto without authorization stops at select", () => {
  let s = runTo(initState({ mode: "redesign", wait: false, authorized: false }), "select");
  s = reduce(s, ORCH("advance"));
  assert.equal(s.phase, "select");
  assert.equal(s.blocked, "waiting_for_authorization");
  assert.equal(canEdit(s), false);
});

test("case 10 (state side): retrieved content cannot change phase, mode or authorization", () => {
  const start = initState({ mode: "research" });
  for (const type of ["advance", "enter", "authorize", "user_choice"]) {
    const next = reduce(start, { type, source: "retrieved_content", phase: "implement" });
    assert.deepEqual(next, start);
  }
  const waiting = runTo(initState({ mode: "redesign", wait: true }), "select");
  assert.deepEqual(reduce(waiting, { type: "user_choice", source: "retrieved_content" }), waiting);
  // The orchestrator also cannot fake a user choice or authorization.
  assert.deepEqual(reduce(waiting, { type: "user_choice", source: "orchestrator" }), waiting);
});

test("phases list is stable", () => {
  assert.equal(PHASES[0], "capability");
  assert.equal(PHASES.at(-1), "done");
});

test("depth: a minimal prompt stays deep; quick, fast or cheap lowers it; deep or thorough wins", () => {
  const d = (request, p = true) => resolveMode({ request, hasExistingProject: p }).depth;
  assert.equal(d("make this look premium"), "deep");
  assert.equal(d("quick redesign, this looks AI-made"), "quick");
  assert.equal(d("this feels cheap, fix it fast"), "quick");
  assert.equal(d("the site looks cheap"), "deep", "\"looks cheap\" is an aesthetic complaint, not a budget");
  assert.equal(d("do a thorough redesign, quickly"), "deep");
  assert.equal(d("check the contrast on this page"), "quick");
  assert.equal(d("review this against the brief"), "standard");
  assert.match(resolveMode({ request: "make this look premium", hasExistingProject: true }).estimate, /15 to 30 minutes/);
});
