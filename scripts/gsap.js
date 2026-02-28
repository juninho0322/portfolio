// gsap.js
// Smooth, premium motion (NO parallax except floating code window)

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* =========================
   HERO: intro animation
========================= */
function animateHero() {
  if (prefersReducedMotion) return;

  const hero = document.querySelector(".hero");
  if (!hero) return;

  const tag = hero.querySelector(".hero__tag");
  const titleSpans = hero.querySelectorAll(".hero__subtitle span");
  const subtitle = hero.querySelectorAll(".hero__subtitle")[1];
  const actions = hero.querySelector(".hero__actions");
  const code = hero.querySelector(".code-window");

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.fromTo(tag, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6 })
    .fromTo(
      titleSpans,
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 },
      "-=0.25"
    )
    .fromTo(
      subtitle,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.6 },
      "-=0.35"
    )
    .fromTo(
      actions,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.55 },
      "-=0.35"
    )
    .fromTo(
      code,
      { autoAlpha: 0, y: 26, rotateX: 6 },
      { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.75 },
      "-=0.45"
    );
}

/* =========================
   FLOATING MAC WINDOW (keep this ✨)
========================= */
function setupFloatingCodeWindow() {
  if (prefersReducedMotion) return;

  const codeWindow = document.querySelector(".code-window");
  if (!codeWindow) return;

  gsap.to(codeWindow, {
    y: -10,
    duration: 2.8,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
  });
}

/* =========================
   SECTION REVEAL
========================= */
function animateSection(section) {
  if (!section || prefersReducedMotion) return;
  if (section.classList.contains("animated")) return;

  section.classList.add("animated");

  const head = section.querySelector("h2");
  const cards = section.querySelectorAll(
    ".project-card, .about__panel, .panel, .contact-card, .edu-item, .skill-group"
  );
  const paragraphs = section.querySelectorAll("p");
  const lists = section.querySelectorAll("ul");

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.to(section, { autoAlpha: 1, y: 0, duration: 0.8 });

  if (head) {
    tl.fromTo(
      head,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.5 },
      "-=0.55"
    );
  }

  const items = [...paragraphs, ...lists].slice(0, 6);
  if (items.length) {
    tl.fromTo(
      items,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06 },
      "-=0.35"
    );
  }

  if (cards.length) {
    tl.fromTo(
      cards,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08 },
      "-=0.25"
    );
  }
}

window.animateSection = animateSection;

/* =========================
   3D TILT (keep this too)
========================= */
function setupTiltCard() {
  const card = document.querySelector(".code-window");
  if (!card || prefersReducedMotion) return;

  gsap.set(card, { transformPerspective: 650, transformStyle: "preserve-3d" });

  const rx = gsap.quickTo(card, "rotationX", {
    duration: 0.3,
    ease: "power3.out"
  });

  const ry = gsap.quickTo(card, "rotationY", {
    duration: 0.3,
    ease: "power3.out"
  });

  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;

    rx(gsap.utils.interpolate(10, -10, py));
    ry(gsap.utils.interpolate(-10, 10, px));
  });

  card.addEventListener("pointerleave", () => {
    rx(0);
    ry(0);
  });
}

/* =========================
   INIT
========================= */
animateHero();
setupFloatingCodeWindow();
setupTiltCard();