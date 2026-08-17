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
    var keyedPlanets = universe.querySelectorAll(".planet[data-planet]");
    var uLinks = universe.querySelectorAll(".u-link");
    var uList = universe.querySelector(".u-list");
    var lastFocus = null;

    /* One pair of functions drives the highlight, so hovering a planet and
       hovering its menu item produce exactly the same state. */
    function focusKey(key) {
      universe.classList.add("dim");
      if (uList) uList.classList.add("dim");
      planets.forEach(function (pl) {
        pl.classList.toggle("is-hot", pl.getAttribute("data-planet") === key);
      });
      uLinks.forEach(function (l) {
        l.classList.toggle("is-hot", l.getAttribute("data-planet") === key);
      });
    }

    function clearKey() {
      universe.classList.remove("dim");
      if (uList) uList.classList.remove("dim");
      planets.forEach(function (pl) { pl.classList.remove("is-hot"); });
      uLinks.forEach(function (l) { l.classList.remove("is-hot"); });
    }

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
        clearKey();
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
        Array.prototype.slice.call(universe.querySelectorAll(".u-link, .u-meta a, button"))
      );
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    /* Menu item -> planet */
    uLinks.forEach(function (link) {
      var key = link.getAttribute("data-planet");
      link.addEventListener("mouseenter", function () { focusKey(key); });
      link.addEventListener("mouseleave", clearKey);
      link.addEventListener("blur", clearKey);
      link.addEventListener("focus", function () {
        /* programmatic focus on open shouldn't fire the hover state */
        try { if (link.matches(":focus-visible")) focusKey(key); } catch (err) { /* older browsers */ }
      });
    });

    /* Planet -> menu item (and the planet itself navigates) */
    keyedPlanets.forEach(function (pl) {
      var key = pl.getAttribute("data-planet");
      pl.addEventListener("mouseenter", function () { focusKey(key); });
      pl.addEventListener("mouseleave", clearKey);
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

  /* Scroll-linked shape work: --sy drives drift, --sp (0-1 through the hero)
     drives growth, rotation and the circle-to-squircle morph. Each orb scales
     those with its own --driftX/--driftY/--grow/--spin/--morph. */
  var hero = document.querySelector(".hero");
  var ctaSection = document.querySelector(".big-cta");
  if ((field || ctaSection) && !reduced) {
    var shapeTick = false;

    function shapeScroll() {
      var y = window.scrollY;
      var vh = window.innerHeight;

      if (field && hero) {
        var span = hero.offsetHeight || vh;
        field.style.setProperty("--sy", y.toFixed(1) + "px");
        field.style.setProperty("--sp", Math.min(1, y / span).toFixed(4));
      }

      if (ctaSection) {
        var box = ctaSection.getBoundingClientRect();
        /* 0 as the section enters the viewport, 1 once it's fully arrived */
        var cp = 1 - Math.min(1, Math.max(0, box.top / vh));
        ctaSection.style.setProperty("--cp", cp.toFixed(4));
      }

      shapeTick = false;
    }

    window.addEventListener("scroll", function () {
      if (!shapeTick) { shapeTick = true; requestAnimationFrame(shapeScroll); }
    }, { passive: true });
    window.addEventListener("resize", shapeScroll, { passive: true });
    shapeScroll();
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
     9. Contact form
     Posts to a form service via fetch, but degrades to a plain POST if the
     JS never runs. If the endpoint hasn't been configured yet it says so
     rather than silently swallowing the message.
     ---------------------------------------------------------------------- */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("button[type=submit]");

    form.addEventListener("submit", function (e) {
      var action = form.getAttribute("action") || "";

      if (action.indexOf("YOUR_FORM_ID") !== -1 || !action) {
        e.preventDefault();
        status.className = "form-status is-err";
        status.textContent = "This form isn't connected yet — email me directly at joshserpis@gmail.com.";
        return;
      }

      if (!window.fetch) return; /* let the browser POST normally */

      e.preventDefault();
      status.className = "form-status";
      status.textContent = "Sending…";
      submit.disabled = true;

      fetch(action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (res) {
          if (!res.ok) throw new Error("bad response");
          form.reset();
          status.className = "form-status is-ok";
          status.textContent = "Sent — I'll come back to you within a day.";
        })
        .catch(function () {
          status.className = "form-status is-err";
          status.textContent = "Something went wrong. Email me at joshserpis@gmail.com instead.";
        })
        .then(function () { submit.disabled = false; });
    });
  }


  /* ----------------------------------------------------------------------
     10. Intro sequence — "Orbit Lock"
     One continuous run rather than discrete beats, so any input (scroll,
     tap, key, click, or the skip control) simply ends it. Only armed on a
     genuine first arrival by the inline head script.
     ---------------------------------------------------------------------- */
  var intro = document.querySelector(".intro");
  if (intro && document.documentElement.classList.contains("intro-armed")) {
    /* The CSS scales every intro duration by --intro-speed; read it here so
       RUN and the animation can't fall out of step. */
    var introSpeed = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--intro-speed")
    ) || 1;
    var RUN = Math.round(4600 * introSpeed);   /* must match the CSS animation length */
    var introTimer = null;
    var introDone = false;

    function endIntro() {
      if (introDone) return;
      introDone = true;
      clearTimeout(introTimer);
      detachIntro();

      intro.classList.add("is-done");
      /* keep .intro-armed so main's entrance styles stay; .intro-done releases
         the scroll lock and drops the delay, then we restart the animation so
         the hero always rises — even when the intro was skipped at 0.5s */
      document.documentElement.classList.add("intro-done");
      try { sessionStorage.setItem("jsx-intro", "1"); } catch (err) { /* private mode */ }

      var mainEl = document.querySelector("main");
      if (mainEl && mainEl.getAnimations) {
        mainEl.getAnimations().forEach(function (a) { a.cancel(); a.play(); });
      }
      setTimeout(function () { intro.classList.add("is-gone"); }, Math.round(950 * introSpeed));
    }

    function onIntroKey(e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " " ||
          e.key === "ArrowDown" || e.key === "PageDown") endIntro();
    }

    function detachIntro() {
      window.removeEventListener("wheel", endIntro);
      window.removeEventListener("touchstart", endIntro);
      window.removeEventListener("keydown", onIntroKey);
      intro.removeEventListener("click", endIntro);
    }

    window.addEventListener("wheel", endIntro, { passive: true });
    window.addEventListener("touchstart", endIntro, { passive: true });
    window.addEventListener("keydown", onIntroKey);
    intro.addEventListener("click", endIntro);

    intro.classList.add("is-running");
    introTimer = setTimeout(endIntro, RUN);
  }

  /* ----------------------------------------------------------------------
     11. Footer year
     ---------------------------------------------------------------------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
