/* ==========================================================================
   Josh Serpis — blog scripts
   Loads after script.js on blog.html and on post pages.
   Zero dependencies. With JS off: every post is listed, the filters simply
   do nothing, and the article reads normally.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------
     1. Tag filter (index)
     Entries carry data-tags="ai-engineering full-stack". Buttons carry
     data-filter="ai-engineering", or "all".
     ---------------------------------------------------------------------- */
  var chips = document.querySelectorAll("[data-filter]");
  var entries = document.querySelectorAll("[data-tags]");

  if (chips.length && entries.length) {
    var countEl = document.querySelector("[data-filter-count]");
    var emptyEl = document.querySelector(".post-empty");

    function apply(tag) {
      var shown = 0;

      entries.forEach(function (entry) {
        var tags = (entry.getAttribute("data-tags") || "").split(/\s+/);
        var match = tag === "all" || tags.indexOf(tag) !== -1;
        /* the feature card is its own element; list rows hide via their li */
        var row = entry.closest("li");
        (row || entry).classList.toggle("is-hidden", !match);
        /* the featured post also appears in the list, so only rows are
           counted — otherwise the newest post is tallied twice */
        if (match && row) shown++;
      });

      chips.forEach(function (chip) {
        chip.setAttribute("aria-pressed", chip.getAttribute("data-filter") === tag ? "true" : "false");
      });

      if (countEl) countEl.textContent = shown + (shown === 1 ? " post" : " posts");
      if (emptyEl) emptyEl.classList.toggle("is-shown", shown === 0);

      /* keep the URL shareable without adding a history entry per click */
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", tag === "all" ? location.pathname : "#" + tag);
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        apply(chip.getAttribute("data-filter"));
      });
    });

    /* deep link: blog.html#ai-engineering opens pre-filtered */
    function fromHash() {
      var tag = (location.hash || "").replace("#", "");
      var known = Array.prototype.some.call(chips, function (c) {
        return c.getAttribute("data-filter") === tag;
      });
      apply(known ? tag : "all");
    }

    /* a hash-only change doesn't reload the page, so the filter has to
       follow it — otherwise a shared #tag link lands on whatever was
       already showing */
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  /* ----------------------------------------------------------------------
     2. Reading progress (article)
     Measured against the article itself, not the document, so the footer
     and the CTA don't count as unread.
     ---------------------------------------------------------------------- */
  var bar = document.querySelector(".read-bar");
  var article = document.querySelector("[data-article]");

  if (bar && article) {
    var readTick = false;

    function readScroll() {
      var box = article.getBoundingClientRect();
      var scrollable = box.height - window.innerHeight;
      var progress = scrollable <= 0 ? 1 : (-box.top) / scrollable;
      bar.style.setProperty("--read", Math.min(1, Math.max(0, progress)).toFixed(4));
      readTick = false;
    }

    window.addEventListener("scroll", function () {
      if (!readTick) { readTick = true; requestAnimationFrame(readScroll); }
    }, { passive: true });
    window.addEventListener("resize", readScroll, { passive: true });
    readScroll();
  }

  /* ----------------------------------------------------------------------
     3. Contents highlighting (article)
     ---------------------------------------------------------------------- */
  var tocLinks = document.querySelectorAll(".toc a");

  if (tocLinks.length) {
    var pairs = [];

    tocLinks.forEach(function (link) {
      var head = document.getElementById(link.getAttribute("href").replace("#", ""));
      if (head) pairs.push({ link: link, head: head });
    });

    /* An IntersectionObserver band is the obvious way to do this and it's
       the wrong one: a heading can cross a narrow band between two frames
       and nothing ever highlights. Measuring instead — the active heading is
       simply the last one to have passed under the sticky bar. */
    var tocTick = false;

    function tocScroll() {
      var active = null;

      for (var i = 0; i < pairs.length; i++) {
        if (pairs[i].head.getBoundingClientRect().top <= 130) active = pairs[i];
      }
      /* above the first heading, light nothing rather than guessing */
      pairs.forEach(function (p) {
        p.link.classList.toggle("is-here", active !== null && p === active);
      });

      tocTick = false;
    }

    window.addEventListener("scroll", function () {
      if (!tocTick) { tocTick = true; requestAnimationFrame(tocScroll); }
    }, { passive: true });
    window.addEventListener("resize", tocScroll, { passive: true });
    tocScroll();
  }

  /* Smooth jumps only when motion is welcome — script.js already sets
     scroll-behavior globally, this just avoids fighting it. */
  if (reduced) document.documentElement.style.scrollBehavior = "auto";
})();
