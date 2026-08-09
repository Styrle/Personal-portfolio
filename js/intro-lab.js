/* ==========================================================================
   Intro lab — preview controller
   Restarts CSS animations by toggling .is-running with a forced reflow.
   ========================================================================== */
(function () {
  "use strict";

  var player = document.getElementById("player");
  if (!player) return;

  var holder = player.querySelector("[data-player-holder]");
  var bar = player.querySelector("[data-player-bar]");
  var nameEl = player.querySelector("[data-player-name]");
  var barTimer = null;
  var current = null;

  function play(stage) {
    stage.classList.remove("is-running");
    void stage.offsetWidth;          /* force reflow so the animations restart */
    stage.classList.add("is-running");
  }

  /* ---------- Cards ---------- */
  var cards = document.querySelectorAll(".lab-card");

  cards.forEach(function (card) {
    var stage = card.querySelector(".stage");

    card.querySelector("[data-replay]").addEventListener("click", function () { play(stage); });
    card.querySelector("[data-fullscreen]").addEventListener("click", function () { open(stage); });

    /* replay on hover, but don't interrupt a run already in progress */
    var cooling = false;
    card.addEventListener("mouseenter", function () {
      if (cooling) return;
      cooling = true;
      play(stage);
      setTimeout(function () { cooling = false; }, Number(stage.dataset.duration) + 250);
    });
  });

  /* Play each preview once as it scrolls into view */
  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        play(entry.target);
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    document.querySelectorAll(".lab-card .stage").forEach(function (s) { seen.observe(s); });
  } else {
    document.querySelectorAll(".lab-card .stage").forEach(play);
  }

  /* ---------- Full-screen player ---------- */
  function open(stage) {
    holder.innerHTML = "";
    var clone = stage.cloneNode(true);
    clone.classList.remove("is-running");
    holder.appendChild(clone);

    current = clone;
    nameEl.textContent = stage.dataset.name;
    player.classList.add("is-open");
    document.body.classList.add("is-locked");

    bar.classList.remove("is-shown");
    play(clone);

    /* show the controls once the sequence has finished playing */
    clearTimeout(barTimer);
    barTimer = setTimeout(function () {
      bar.classList.add("is-shown");
    }, Number(stage.dataset.duration) + 300);
  }

  function close() {
    clearTimeout(barTimer);
    player.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    holder.innerHTML = "";
    current = null;
  }

  player.querySelector("[data-player-close]").addEventListener("click", close);
  player.querySelector("[data-player-replay]").addEventListener("click", function () {
    if (!current) return;
    bar.classList.remove("is-shown");
    play(current);
    clearTimeout(barTimer);
    barTimer = setTimeout(function () { bar.classList.add("is-shown"); },
      Number(current.dataset.duration) + 300);
  });

  document.addEventListener("keydown", function (e) {
    if (!player.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (current) play(current);
    }
  });
})();
