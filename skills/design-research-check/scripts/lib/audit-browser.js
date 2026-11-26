// Runs INSIDE the page being audited (a browser context). It is read as text and injected, so it must be
// self-contained: no imports, no Node APIs. Entry point: drcAudit(doc, win) returns { findings, skipped, stats }.
// Findings carry a severity: critical (fix before delivery), major (fix or justify), minor (note).
// Rules follow WCAG 2.2 AA and the priority order accessibility > touch > layout > type > motion.
function drcAudit(doc, win) {
  const findings = [];
  const skipped = { contrast: 0 };
  const add = (id, severity, message, el, extra) => {
    findings.push({ id, severity, message, selector: el ? sel(el) : undefined, ...(extra || {}) });
  };
  function sel(el) {
    if (!el || !el.tagName) return "";
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + el.id;
    const c = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (c.length) s += "." + c.join(".");
    return s;
  }
  const cs = (el) => win.getComputedStyle(el);
  function visible(el) {
    const s = cs(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function parseColor(str) {
    if (!str) return null;
    let m = str.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i);
    if (m) {
      let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { r: +m[1], g: +m[2], b: +m[3], a };
    }
    m = str.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);
    if (m) {
      let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a };
    }
    return null; // lab(), oklch() and others: not parsed
  }
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (top.r * top.a + under.r * under.a * (1 - top.a)) / a,
      g: (top.g * top.a + under.g * under.a * (1 - top.a)) / a,
      b: (top.b * top.a + under.b * under.a * (1 - top.a)) / a,
      a,
    };
  };
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = lum(a) > lum(b) ? [a, b] : [b, a];
    return (lum(hi) + 0.05) / (lum(lo) + 0.05);
  };
  // Effective background: composite ancestor background colors. Returns null when an image or gradient sits behind.
  function backgroundOf(el) {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = cs(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      const c = parseColor(s.backgroundColor);
      if (c && c.a > 0) layers.push(c);
      if (c && c.a >= 1) break;
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return bg;
  }

  const vw = win.innerWidth;
  const root = doc.documentElement;

  // 1. Accessibility (critical)
  if (!root.getAttribute("lang")) add("html-lang", "major", "<html> has no lang attribute", root);
  const vp = doc.querySelector('meta[name="viewport"]');
  if (!vp) add("viewport-meta", "major", "no viewport meta tag; mobile browsers will lay the page out at desktop width", null);
  else {
    const c = (vp.getAttribute("content") || "").toLowerCase();
    const max = c.match(/maximum-scale\s*=\s*([\d.]+)/);
    if (/user-scalable\s*=\s*(no|0)/.test(c) || (max && parseFloat(max[1]) < 2)) add("zoom-disabled", "critical", "viewport blocks pinch zoom", null, { detail: c });
  }

  doc.querySelectorAll("img").forEach((img) => {
    if (!img.hasAttribute("alt") && visible(img)) add("img-alt", "critical", "image has no alt attribute (use alt=\"\" if decorative)", img);
  });

  const hasName = (el) => {
    if ((el.getAttribute("aria-label") || "").trim() || (el.getAttribute("title") || "").trim()) return true;
    const lb = el.getAttribute("aria-labelledby");
    if (lb && lb.split(/\s+/).some((id) => (doc.getElementById(id)?.textContent || "").trim())) return true;
    if ((el.textContent || "").trim()) return true;
    if (el.querySelector("img[alt]:not([alt=''])") || el.querySelector("svg title")) return true;
    if (el.tagName === "INPUT" && (el.getAttribute("value") || "").trim()) return true;
    return false;
  };
  doc.querySelectorAll("button, a[href], [role=button]").forEach((el) => {
    if (visible(el) && !hasName(el)) add("control-name", "critical", "button or link has no accessible name (icon-only without aria-label)", el);
  });
  doc.querySelectorAll("input, select, textarea").forEach((el) => {
    const t = (el.getAttribute("type") || "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(t) || !visible(el)) return;
    const labelled =
      (el.getAttribute("aria-label") || "").trim() ||
      el.getAttribute("aria-labelledby") ||
      (el.getAttribute("title") || "").trim() ||
      el.closest("label") ||
      (el.id && doc.querySelector('label[for="' + el.id.replace(/"/g, '\\"') + '"]'));
    if (!labelled) add("input-label", "critical", "form field has no visible or programmatic label (placeholder is not a label)", el);
  });

  const heads = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible);
  const h1s = heads.filter((h) => h.tagName === "H1").length;
  if (heads.length && h1s === 0) add("h1-missing", "major", "page has headings but no h1", null);
  if (h1s > 1) add("h1-multiple", "minor", h1s + " h1 elements", null);
  for (let i = 1; i < heads.length; i++) {
    const prev = +heads[i - 1].tagName[1], now = +heads[i].tagName[1];
    if (now > prev + 1) add("heading-skip", "minor", "heading level jumps from h" + prev + " to h" + now, heads[i]);
  }

  // 2. Contrast (critical for body text)
  const seen = new Set();
  const walker = doc.createTreeWalker(doc.body || root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.nodeValue || "").trim();
    const el = node.parentElement;
    if (!text || !el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || !visible(el)) continue;
    const s = cs(el);
    const fg = parseColor(s.color);
    const bg = backgroundOf(el);
    if (!fg || !bg) {
      skipped.contrast++;
      continue;
    }
    const eff = over(fg, bg);
    const r = ratio(eff, bg);
    const size = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (r < need) {
      const key = sel(el) + s.color + JSON.stringify(bg);
      if (seen.has(key)) continue;
      seen.add(key);
      add("contrast", "critical", "text contrast " + r.toFixed(2) + ":1, needs " + need + ":1", el, { text: text.slice(0, 40), color: s.color, background: "rgb(" + Math.round(bg.r) + "," + Math.round(bg.g) + "," + Math.round(bg.b) + ")" });
    }
  }

  // 3. Layout and responsive (critical when content escapes the viewport)
  const sw = root.scrollWidth;
  if (sw > vw + 1) {
    const offenders = [];
    doc.querySelectorAll("body *").forEach((el) => {
      if (!visible(el)) return;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && cs(el).position !== "fixed") offenders.push({ el, over: Math.round(r.right - vw) });
    });
    offenders.sort((a, b) => b.over - a.over);
    add("overflow-x", "critical", "page scrolls horizontally: content is " + (sw - vw) + "px wider than the " + vw + "px viewport", null, {
      offenders: offenders.slice(0, 5).map((o) => sel(o.el) + " (+" + o.over + "px)"),
    });
  }

  // 4. Touch targets and interaction
  const narrow = vw <= 820;
  doc.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]").forEach((el) => {
    if (!visible(el)) return;
    const s = cs(el);
    if (el.tagName === "A" && s.display === "inline" && el.parentElement && (el.parentElement.textContent || "").trim().length > (el.textContent || "").trim().length + 10) return; // inline link in running text
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) add("target-size-min", "major", "interactive target " + Math.round(r.width) + "x" + Math.round(r.height) + "px is under the 24x24 WCAG 2.2 minimum", el);
    else if (narrow && (r.width < 44 || r.height < 44)) add("target-size-touch", "minor", "touch target " + Math.round(r.width) + "x" + Math.round(r.height) + "px is under the recommended 44x44", el);
  });

  // Static CSS: focus outline removal, reduced motion
  let outlineRemoved = 0, anim = false, reduced = false;
  const scan = (rules) => {
    for (const rule of rules) {
      if (rule.type === 4 || rule.type === 12) { // @media, @supports
        if (rule.type === 4 && /prefers-reduced-motion/i.test(rule.conditionText || rule.media?.mediaText || "")) reduced = true;
        scan(rule.cssRules);
      } else if (rule.type === 7) anim = true; // @keyframes
      else if (rule.type === 1) {
        const st = rule.style;
        if (st.animationName && st.animationName !== "none") anim = true;
        if (/transform|translate|scale|rotate/.test(st.transitionProperty || "")) anim = true; // motion, not just color fades
        const removed = st.outlineStyle === "none" || /^0(px)?$/.test(st.outlineWidth || "");
        const hitsFocus = (rule.selectorText || "").split(",").some((part) => /:focus(?!-visible)/.test(part) || /^\s*(a|button|input|select|textarea|summary|\*)\s*$/.test(part));
        if (removed && hitsFocus && !st.boxShadow && !st.borderColor && !st.backgroundColor && !st.textDecoration) outlineRemoved++;
      }
    }
  };
  for (const sheet of doc.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; } // cross-origin sheet
    if (rules) scan(rules);
  }
  if (outlineRemoved) add("focus-outline-removed", "major", outlineRemoved + " rule(s) remove the focus outline with no replacement style; keyboard users lose their place", null);
  if (anim && !reduced) add("reduced-motion", "major", "page has animation but no prefers-reduced-motion rule", null);

  // 5. Typography
  let tiny = 0, tinyEl = null;
  const w2 = doc.createTreeWalker(doc.body || root, NodeFilter.SHOW_TEXT);
  while ((node = w2.nextNode())) {
    const el = node.parentElement;
    if (!el || !(node.nodeValue || "").trim() || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || !visible(el)) continue;
    if (parseFloat(cs(el).fontSize) < 12) { tiny++; tinyEl = tinyEl || el; }
  }
  if (tiny) add("text-tiny", "minor", tiny + " text run(s) under 12px", tinyEl);
  const body = doc.body && parseFloat(cs(doc.body).fontSize);
  if (body && body < 16 && narrow) add("body-text-small", "minor", "body text is " + body + "px; 16px avoids iOS auto-zoom on inputs and reads better on mobile", doc.body);
  doc.querySelectorAll("p").forEach((p) => {
    if (!visible(p) || (p.textContent || "").length < 120) return;
    const fs = parseFloat(cs(p).fontSize);
    const cpl = p.getBoundingClientRect().width / (fs * 0.5);
    if (cpl > 95) add("line-length", "minor", "about " + Math.round(cpl) + " characters per line; 45-75 reads best", p);
  });

  return { findings, skipped, stats: { viewport: vw, scrollWidth: sw } };
}
