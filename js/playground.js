/* ==========================================================================
   Josh Serpis — playground
   Reads window.PENS (js/pens.js), renders the grid, and drives the editor.

   Every pen runs inside an iframe with sandbox="allow-scripts" and no
   allow-same-origin, so a pen can execute but can't reach this page, its
   storage or its cookies. That's what makes editing safe.
   ========================================================================== */
(function () {
  "use strict";

  var pens = window.PENS || [];
  var grid = document.querySelector("[data-pen-grid]");
  if (!grid || !pens.length) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;
  var edits = {};          /* in-session edits, keyed by slug */

  /* ----------------------------------------------------------------------
     1. Document assembly
     The palette is injected so pens can use the same tokens as the site.
     ---------------------------------------------------------------------- */
  var BASE = [
    "*, *::before, *::after { box-sizing: border-box; }",
    "html, body { margin: 0; padding: 0; height: 100%; }",
    ":root {",
    "  --surface-lowest: #0b0f10; --surface: #101415; --surface-high: #272a2c;",
    "  --on-surface: #e0e3e5; --on-surface-dim: #c5c6cd; --outline: #8f9097;",
    "  --indigo: #4648d4; --indigo-lift: #8f92ff; --periwinkle: #adc6ff;",
    "  --amethyst: #ddb8ff; --amber: #ffc329; --amber-deep: #e5a300;",
    "  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;",
    "}",
    "body {",
    "  background: var(--surface-lowest);",
    "  color: var(--on-surface);",
    "  font-family: 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif;",
    "  -webkit-font-smoothing: antialiased;",
    "}"
  ].join("\n");

  var FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
    "family=Hanken+Grotesk:wght@300;400;600&family=JetBrains+Mono:wght@400;500&display=swap\">";

  function assemble(pen) {
    return [
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
      FONTS,
      "<style>", BASE, "\n", pen.css || "", "</style></head><body>",
      pen.html || "",
      "<script>\ntry {\n", pen.js || "", "\n} catch (e) { document.body.innerHTML = '<pre style=\"color:#ffb4ab;font:12px monospace;padding:16px\">' + e + '</pre>'; }\n<\/script>",
      "</body></html>"
    ].join("");
  }

  /* current source for a pen: whatever's been typed, else the original */
  function sourceOf(pen) {
    var e = edits[pen.slug];
    return e ? { css: e.css, html: e.html, js: e.js } : { css: pen.css, html: pen.html, js: pen.js };
  }

  /* ----------------------------------------------------------------------
     2. The grid
     Cards render from JS, so adding a pen means editing one file. With JS
     off the <noscript> note in the markup explains that.
     ---------------------------------------------------------------------- */
  var frames = {};
  var FRAME_W = 900;   /* must match .pen-frame in playground.css */

  /* Keep the miniature in step with the card as the grid reflows */
  function fit(stage, frame) {
    function measure() {
      var w = stage.clientWidth;
      if (w) frame.style.setProperty("--fit", (w / FRAME_W).toFixed(4));
    }
    measure();
    if ("ResizeObserver" in window) {
      new ResizeObserver(measure).observe(stage);
    } else {
      window.addEventListener("resize", measure, { passive: true });
    }
  }

  function card(pen) {
    var li = document.createElement("li");
    li.setAttribute("data-tags", pen.tags.join(" "));

    var tags = pen.tags.map(function (t) {
      return '<span class="pen-tag">' + t + "</span>";
    }).join("");

    li.innerHTML =
      '<article class="pen-card">' +
        '<div class="pen-stage" data-stage>' +
          '<iframe class="pen-frame" title="' + pen.title + ' preview" ' +
            'sandbox="allow-scripts" loading="lazy" scrolling="no"></iframe>' +
          '<button class="pen-idle" type="button" data-run>Run preview</button>' +
        "</div>" +
        '<div class="pen-body">' +
          "<h3>" + pen.title + "</h3>" +
          "<p>" + pen.blurb + "</p>" +
          '<div class="pen-meta">' + tags + "</div>" +
        "</div>" +
        '<div class="pen-actions">' +
          '<button class="pen-btn pen-btn--go" type="button" data-edit>Open editor</button>' +
          '<button class="pen-btn" type="button" data-replay>Replay</button>' +
        "</div>" +
      "</article>";

    var stage = li.querySelector("[data-stage]");
    var frame = li.querySelector("iframe");
    frames[pen.slug] = { frame: frame, stage: stage };
    fit(stage, frame);
    handOver(frame);

    li.querySelector("[data-run]").addEventListener("click", function () { build(pen); });
    li.querySelector("[data-replay]").addEventListener("click", function () { build(pen); });
    li.querySelector("[data-edit]").addEventListener("click", function () { openEditor(pen); });

    return li;
  }

  /* Swap the site's custom cursor for the real one while the pointer is over
     a pen. enter/leave fire on the iframe element itself, so this works even
     though the moves inside it never reach us. */
  function handOver(frame) {
    frame.addEventListener("mouseenter", function () { body.classList.add("pen-hover"); });
    frame.addEventListener("mouseleave", function () { body.classList.remove("pen-hover"); });
  }

  function build(pen) {
    var slot = frames[pen.slug];
    if (!slot) return;
    var s = sourceOf(pen);
    slot.frame.srcdoc = assemble({ css: s.css, html: s.html, js: s.js });
    slot.stage.classList.add("is-live");
  }

  pens.forEach(function (pen) { grid.appendChild(card(pen)); });

  var countEl = document.querySelector("[data-pen-count]");
  if (countEl) countEl.textContent = ("0" + pens.length).slice(-2);

  /* Build only what's on screen. Under reduced motion nothing autoplays —
     the visitor presses Run when they want it. */
  if (!reduced && "IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (records) {
      records.forEach(function (r) {
        if (!r.isIntersecting) return;
        var slug = r.target.getAttribute("data-slug");
        var pen = find(slug);
        if (pen) build(pen);
        seen.unobserve(r.target);
      });
    }, { rootMargin: "200px 0px", threshold: 0 });

    pens.forEach(function (pen) {
      var slot = frames[pen.slug];
      slot.stage.setAttribute("data-slug", pen.slug);
      seen.observe(slot.stage);
    });
  } else if (!reduced) {
    pens.forEach(build);
  }

  function find(slug) {
    for (var i = 0; i < pens.length; i++) if (pens[i].slug === slug) return pens[i];
    return null;
  }

  /* ----------------------------------------------------------------------
     3. Filters — built from the tags the pens actually declare
     ---------------------------------------------------------------------- */
  var filterRow = document.querySelector("[data-pen-filters]");

  if (filterRow) {
    var all = [];
    pens.forEach(function (pen) {
      pen.tags.forEach(function (t) { if (all.indexOf(t) === -1) all.push(t); });
    });
    all.sort();

    function chip(value, label, pressed) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "filter-chip";
      b.setAttribute("data-filter", value);
      b.setAttribute("aria-pressed", pressed ? "true" : "false");
      b.textContent = label;
      return b;
    }

    filterRow.appendChild(chip("all", "All", true));
    all.forEach(function (t) { filterRow.appendChild(chip(t, t)); });

    filterRow.addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]");
      if (!b) return;
      var tag = b.getAttribute("data-filter");

      grid.querySelectorAll("li").forEach(function (li) {
        var tags = (li.getAttribute("data-tags") || "").split(/\s+/);
        li.classList.toggle("is-hidden", tag !== "all" && tags.indexOf(tag) === -1);
      });

      filterRow.querySelectorAll("[data-filter]").forEach(function (other) {
        other.setAttribute("aria-pressed", other === b ? "true" : "false");
      });
    });
  }

  /* ----------------------------------------------------------------------
     4. The editor
     ---------------------------------------------------------------------- */
  var editor = document.querySelector(".editor");
  if (!editor) return;

  var nameEl = editor.querySelector("[data-editor-name]");
  var frame = editor.querySelector(".editor-frame");
  var status = editor.querySelector(".editor-status");
  var statusText = editor.querySelector("[data-status-text]");
  var preview = editor.querySelector(".editor-preview");
  var tabs = editor.querySelectorAll(".code-tab");
  var areas = {
    html: editor.querySelector('[data-code="html"]'),
    css: editor.querySelector('[data-code="css"]'),
    js: editor.querySelector('[data-code="js"]')
  };

  var current = null;
  var runTimer = null;
  var lastFocus = null;

  handOver(frame);

  function openEditor(pen) {
    current = pen;
    lastFocus = document.activeElement;

    var s = sourceOf(pen);
    areas.html.value = s.html || "";
    areas.css.value = s.css || "";
    areas.js.value = s.js || "";

    nameEl.textContent = pen.title;
    showPane("html");
    run();

    editor.classList.add("is-open");
    body.classList.add("pen-open");
    editor.setAttribute("aria-hidden", "false");

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + pen.slug);
    }

    editor.querySelector("[data-editor-close]").focus();
  }

  function closeEditor() {
    editor.classList.remove("is-open");
    body.classList.remove("pen-open");
    editor.setAttribute("aria-hidden", "true");
    frame.srcdoc = "";           /* stop whatever the pen was doing */
    body.classList.remove("pen-hover");
    clearTimeout(runTimer);
    if (current) build(current); /* the card now shows what you typed */

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", location.pathname);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    current = null;
  }

  function showPane(which) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute("data-pane") === which;
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    Object.keys(areas).forEach(function (key) {
      areas[key].hidden = key !== which;
    });
  }

  function run() {
    if (!current) return;
    frame.srcdoc = assemble({
      html: areas.html.value,
      css: areas.css.value,
      js: areas.js.value
    });

    status.classList.add("is-running");
    if (statusText) statusText.textContent = "running";
    setTimeout(function () {
      status.classList.remove("is-running");
      if (statusText) statusText.textContent = "live";
    }, 700);
  }

  /* Typing re-runs the pen once you pause, and the edit is remembered so
     the card behind the editor picks it up too. */
  function queueRun() {
    if (!current) return;
    edits[current.slug] = {
      html: areas.html.value,
      css: areas.css.value,
      js: areas.js.value
    };
    clearTimeout(runTimer);
    if (statusText) statusText.textContent = "editing";
    runTimer = setTimeout(run, 500);
  }

  Object.keys(areas).forEach(function (key) {
    areas[key].addEventListener("input", queueRun);

    /* Tab indents instead of leaving the field */
    areas[key].addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || e.shiftKey) return;
      e.preventDefault();
      var el = e.target;
      var start = el.selectionStart;
      el.value = el.value.slice(0, start) + "  " + el.value.slice(el.selectionEnd);
      el.selectionStart = el.selectionEnd = start + 2;
      queueRun();
    });
  });

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { showPane(tab.getAttribute("data-pane")); });
  });

  editor.querySelector("[data-editor-close]").addEventListener("click", closeEditor);
  editor.querySelector("[data-editor-run]").addEventListener("click", run);

  editor.querySelector("[data-editor-reset]").addEventListener("click", function () {
    if (!current) return;
    delete edits[current.slug];
    areas.html.value = current.html || "";
    areas.css.value = current.css || "";
    areas.js.value = current.js || "";
    run();
    build(current);
  });

  var fsBtn = editor.querySelector("[data-editor-full]");
  if (fsBtn && preview.requestFullscreen) {
    fsBtn.addEventListener("click", function () { preview.requestFullscreen(); });
  } else if (fsBtn) {
    fsBtn.hidden = true;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && editor.classList.contains("is-open") && !document.fullscreenElement) {
      closeEditor();
    }
  });

  /* playground.html#goo-pointer opens straight into that pen */
  var deep = find((location.hash || "").replace("#", ""));
  if (deep) openEditor(deep);
})();
