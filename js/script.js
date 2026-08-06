/* ==========================================================================
   Josh Serpis — portfolio scripts
   Zero dependencies. Everything degrades: no JS = a plain, working site.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var body = document.body;

  /* ----------------------------------------------------------------------
     1. Kinetic type — split text into per-character spans
     ---------------------------------------------------------------------- */
  function split(el, indexVar, colours) {
    var text = el.textContent;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement("span");
      var isSpace = text[i] === " ";
      span.className = isSpace ? "ch ch--space" : "ch";
      span.textContent = isSpace ? "\u00A0" : text[i];
      span.style.setProperty(indexVar, i);
      if (colours) span.style.setProperty("--chc", colours[i % colours.length]);
      frag.appendChild(span);
    }
    el.textContent = "";
    el.appendChild(frag);
    el.setAttribute("aria-label", text);
  }

  document.querySelectorAll(".split").forEach(function (el) {
    split(el, "--i");
  });

  /* Menu links get a colour per letter, cycling the palette */
  var menuPalette = ["#ffc329", "#7d7ef0", "#f9f9ff", "#e5a300", "#7d7ef0"];
  document.querySelectorAll(".u-link .link-text").forEach(function (el) {
    var label = el.textContent;
    split(el, "--j", menuPalette);
    el.removeAttribute("aria-label");
    el.parentElement.setAttribute("aria-label", label);
  });

  /* ----------------------------------------------------------------------
     2. Scroll reveals — one observer lights everything
     ---------------------------------------------------------------------- */
  var lightables = document.querySelectorAll(".reveal, [data-lit]");
  if (lightables.length && "IntersectionObserver" in window) {
    var lightObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-lit");
          lightObserver.unobserve(entry.target);
        });
      },
      /* threshold 0: project screenshots can be many viewports tall, so a
         percentage threshold would never be met and they'd never reveal */
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    lightables.forEach(function (el) { lightObserver.observe(el); });
  } else {
    lightables.forEach(function (el) { el.classList.add("is-lit"); });
  }

  /* ----------------------------------------------------------------------
     3. The universe menu
     ---------------------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var universe = document.querySelector(".universe");

  if (toggle && universe) {
    var planets = universe.querySelectorAll(".planet");
    var lastFocus = null;

    function setMenu(open) {
      universe.classList.toggle("is-open", open);
      universe.setAttribute("aria-hidden", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      body.classList.toggle("menu-open", open);
      body.classList.toggle("is-locked", open);

      if (open) {
        lastFocus = document.activeElement;
        var first = universe.querySelector(".u-link");
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 520);
      } else {
        universe.classList.remove("dim");
        planets.forEach(function (p) { p.classList.remove("is-hot"); });
        if (lastFocus) lastFocus.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener("click", function () {
      setMenu(!universe.classList.contains("is-open"));
    });

    document.addEventListener("keydown", function (e) {
      if (!universe.classList.contains("is-open")) return;
      if (e.key === "Escape") { setMenu(false); return; }
      if (e.key !== "Tab") return;

      var focusable = [toggle].concat(
        Array.prototype.slice.call(universe.querySelectorAll("a[href], button"))
      );
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    /* Hovering a menu item lights its planet and dims the rest of the system */
    universe.querySelectorAll(".u-link").forEach(function (link) {
      var key = link.getAttribute("data-planet");
      function on() {
        universe.classList.add("dim");
        planets.forEach(function (p) {
          p.classList.toggle("is-hot", p.getAttribute("data-planet") === key);
        });
      }
      function off() {
        universe.classList.remove("dim");
        planets.forEach(function (p) { p.classList.remove("is-hot"); });
      }
      link.addEventListener("mouseenter", on);
      link.addEventListener("mouseleave", off);
      link.addEventListener("blur", off);
      link.addEventListener("focus", function () {
        /* programmatic focus on open shouldn't fire the hover state */
        try { if (link.matches(":focus-visible")) on(); } catch (err) { /* older browsers */ }
      });
    });
  }

  /* ----------------------------------------------------------------------
     4. Top bar — condense on scroll, retreat when scrolling down
     ---------------------------------------------------------------------- */
  var nav = document.querySelector(".site-nav");
  var bar = document.querySelector(".hud-bar");
  var hudNum = document.querySelector("[data-hud-current]");
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    if (nav) {
      nav.classList.toggle("is-stuck", y > 40);
      nav.classList.toggle("is-hidden", y > 300 && y > lastY && !body.classList.contains("menu-open"));
    }
    if (bar) bar.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);

    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* HUD section counter — "03 / 06" */
  var sections = document.querySelectorAll("[data-section]");
  if (hudNum && sections.length && "IntersectionObserver" in window) {
    var total = document.querySelector("[data-hud-total]");
    if (total) total.textContent = String(sections.length).padStart(2, "0");
    var hudObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            hudNum.textContent = entry.target.getAttribute("data-section");
          }
        });
      },
      { rootMargin: "-48% 0px -48% 0px" }
    );
    sections.forEach(function (s) { hudObserver.observe(s); });
  }

  /* ----------------------------------------------------------------------
     5. Hero parallax — planets drift against the pointer, and against scroll
     ---------------------------------------------------------------------- */
  var field = document.querySelector(".orbit-field");
  if (field && finePointer && !reduced) {
    var mx = 0, my = 0, cx = 0, cy = 0, fieldRaf = null;

    function driftLoop() {
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      field.style.setProperty("--px", cx.toFixed(2) + "px");
      field.style.setProperty("--py", cy.toFixed(2) + "px");
      if (Math.abs(mx - cx) > 0.1 || Math.abs(my - cy) > 0.1) {
        fieldRaf = requestAnimationFrame(driftLoop);
      } else {
        fieldRaf = null;
      }
    }

    window.addEventListener("mousemove", function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 60;
      my = (e.clientY / window.innerHeight - 0.5) * 60;
      if (!fieldRaf) fieldRaf = requestAnimationFrame(driftLoop);
    }, { passive: true });
  }

  if (field && !reduced) {
    var fieldTick = false;
    window.addEventListener("scroll", function () {
      if (fieldTick) return;
      fieldTick = true;
      requestAnimationFrame(function () {
        field.style.transform = "translate3d(0," + (window.scrollY * 0.16).toFixed(1) + "px,0)";
        fieldTick = false;
      });
    }, { passive: true });
  }

  /* ----------------------------------------------------------------------
     6. Work index — a preview planet that trails the cursor
     ---------------------------------------------------------------------- */
  var list = document.querySelector("[data-preview-list]");
  var preview = document.querySelector(".work-preview");

  if (list && preview && finePointer && !reduced) {
    var imgs = preview.querySelectorAll("img");
    var px = window.innerWidth / 2, py = window.innerHeight / 2;
    var tx = px, ty = py, previewRaf = null;

    function previewLoop() {
      tx += (px - tx) * 0.12;
      ty += (py - ty) * 0.12;
      preview.style.left = (tx - 160) + "px";
      preview.style.top = (ty - 160) + "px";
      previewRaf = requestAnimationFrame(previewLoop);
    }

    list.addEventListener("mousemove", function (e) { px = e.clientX; py = e.clientY; }, { passive: true });

    list.querySelectorAll(".work-row").forEach(function (row) {
      row.addEventListener("mouseenter", function () {
        var key = row.getAttribute("data-preview");
        imgs.forEach(function (img) {
          img.classList.toggle("is-active", img.getAttribute("data-key") === key);
        });
        preview.classList.add("is-visible");
        if (!previewRaf) { tx = px; ty = py; previewLoop(); }
      });
    });

    list.addEventListener("mouseleave", function () {
      preview.classList.remove("is-visible");
      if (previewRaf) { cancelAnimationFrame(previewRaf); previewRaf = null; }
    });
  }

  /* ----------------------------------------------------------------------
     7. Custom cursor
     ---------------------------------------------------------------------- */
  if (finePointer && !reduced) {
    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    body.appendChild(dot);
    body.appendChild(ring);

    var rx = 0, ry = 0, dx = 0, dy = 0, cursorRaf = null;

    function cursorLoop() {
      rx += (dx - rx) * 0.16;
      ry += (dy - ry) * 0.16;
      dot.style.transform = "translate3d(" + dx + "px," + dy + "px,0)";
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      cursorRaf = requestAnimationFrame(cursorLoop);
    }

    window.addEventListener("mousemove", function (e) {
      dx = e.clientX; dy = e.clientY;
      if (!body.classList.contains("has-cursor")) body.classList.add("has-cursor");
      if (!cursorRaf) { rx = dx; ry = dy; cursorLoop(); }
    }, { passive: true });

    document.addEventListener("mouseover", function (e) {
      var hot = e.target.closest("a, button, .work-row, .cap-card, input, textarea");
      body.classList.toggle("cursor-hot", !!hot);
    });

    document.addEventListener("mouseleave", function () { body.classList.remove("has-cursor"); });
  }

  /* ----------------------------------------------------------------------
     8. The warp — page-to-page transition
     ---------------------------------------------------------------------- */
  var warp = document.querySelector(".warp-out");

  function sameOrigin(link) {
    return link.hostname === window.location.hostname && link.protocol.indexOf("http") === 0;
  }

  if (warp && !reduced) {
    document.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var link = e.target.closest("a[href]");
      if (!link) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      if (!sameOrigin(link)) return;

      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      if (link.href.split("#")[0] === window.location.href.split("#")[0]) return;

      e.preventDefault();
      warp.style.setProperty("--wx", e.clientX + "px");
      warp.style.setProperty("--wy", e.clientY + "px");
      warp.classList.add("is-active");
      setTimeout(function () { window.location.href = link.href; }, 560);
    });

    /* Coming back via the browser's back button restores from cache — reset */
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) warp.classList.remove("is-active");
    });
  }

  /* ----------------------------------------------------------------------
     9. Footer year
     ---------------------------------------------------------------------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
