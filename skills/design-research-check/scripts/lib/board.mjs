// Render the reference board from references.json so it cannot show un-inspected work as inspected.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dedupe, isInspected } from "./ledger.mjs";

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates", "board.html");

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function safeHref(url) {
  return /^https?:\/\//i.test(url ?? "") ? esc(url) : "#";
}

export function renderBoard(ledger) {
  const { unique } = dedupe(ledger.references);
  const inspected = unique.filter(isInspected);
  const rest = unique.filter((r) => !isInspected(r));
  const style = /<style>[\s\S]*?<\/style>/.exec(readFileSync(TEMPLATE, "utf8"))[0];
  const banner = ledger.fixture
    ? `<div class="banner">FIXTURE, not real research. Images are labeled placeholders.</div>`
    : "";

  const cards = inspected.map((r) => {
    const tags = (r.elements ?? [])
      .map((e) => `<span class="tag" title="${esc(e.confidence)}">${esc(e.category)}${e.confidence === "inferred" ? " (inferred)" : ""}</span>`)
      .join("");
    const obs = (r.elements ?? []).map((e) => `<li>${esc(e.observation)}${e.confidence === "inferred" ? " <em>(inferred)</em>" : ""}</li>`).join("");
    const original = r.original_url ? ` · <a href="${safeHref(r.original_url)}">original</a>` : "";
    return `<article class="card">
  <img src="${esc(r.local_image)}" alt="${esc(r.title)}">
  <div class="body">
    <div><span class="id">${esc(r.id)}</span> · ${esc(r.title)}</div>
    <div class="meta">${esc(r.creator)} · ${esc(r.platform)} · accessed ${esc(r.accessed_at)}</div>
    <div><a href="${safeHref(r.source_url)}">source</a>${original}</div>
    <div>${tags}</div>
    <ul>${obs}</ul>
    <p class="meta">Limits: ${esc(r.limitations)}</p>
  </div>
</article>`;
  }).join("\n");

  const notInspected = rest
    .map((r) => `<li>${esc(r.id)} · ${esc(r.platform)} · ${esc(r.access_status)} · ${esc(r.evidence_type)} · ${esc(r.limitations)}</li>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reference board: ${esc(ledger.run_id)}</title>
${style}
</head>
<body>
${banner}
<header>
  <h1>Reference board</h1>
  <p class="meta">Run ${esc(ledger.run_id)} · evidence ceiling ${esc(ledger.evidence_ceiling)} · ${ledger.references.length} discovered, ${unique.length} unique, ${inspected.length} inspected</p>
</header>
<main>
  <section class="grid" id="board">
${cards}
  </section>
  <h2>Not inspected</h2>
  <ul id="not-inspected">
${notInspected}
  </ul>
</main>
</body>
</html>
`;
}
