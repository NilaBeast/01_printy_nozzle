//---------------------- SCROLL REVEAL EFFECTS ----------------------//

if (typeof ScrollReveal !== "undefined") {
  const sr = ScrollReveal({
    reset: false,
    distance: "60px",
    duration: 900,
    delay: 200,
    easing: "cubic-bezier(0.25, 0.8, 0.25, 1)",
    opacity: 0,
    scale: 0.98,
    viewFactor: 0.15,
  });

  sr.reveal(".top", { origin: "top" });
  sr.reveal(".bottom", { origin: "bottom", interval: 80 });
  sr.reveal(".left", { origin: "left" });
  sr.reveal(".right", { origin: "right", interval: 80 });

  // 3-side collage image reveals (glitch-free staggered)
  sr.reveal(".collage-img-main", { origin: "left", distance: "60px", duration: 1000, delay: 100 });
  sr.reveal(".collage-img-top-right", { origin: "top", distance: "60px", duration: 1000, delay: 250 });
  sr.reveal(".collage-img-bottom-right", { origin: "bottom", distance: "60px", duration: 1000, delay: 400 });
}
