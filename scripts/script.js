/* =========================
   NAV MENU OBERSERVER
========================= */

// ===== NAV ACTIVE LINK (Scroll + Click) =====
const navLinks = document.querySelectorAll(".nav__list a");
const hero = document.querySelector(".hero"); // your first section (not in nav)

// Map: sectionId -> navLink
const navMap = Object.fromEntries(
  [...navLinks].map((a) => [a.getAttribute("href").slice(1), a])
);

// Only observe sections that exist in the nav
const sections = [...document.querySelectorAll("section[id]")]
  .filter((sec) => navMap[sec.id]);

  // Hide sections from the start (so there's no "flash then animate")
sections.forEach((sec) => {
  gsap.set(sec, { autoAlpha: 0, y: 60 });
});


const clearActive = () => {
  navLinks.forEach((a) => a.classList.remove("active"));
};

const setActive = (id) => {
  clearActive();
  navMap[id]?.classList.add("active");
};

// 1) Observer for sections in the nav (updates active while scrolling)
const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) {
      setActive(visible.target.id);
      animateSection(visible.target);
    }
  },
  { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
);

sections.forEach((sec) => sectionObserver.observe(sec));

// 2) Observer for hero (clears active when hero is visible)
if (hero) {
  const heroObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) clearActive();
    },
    { threshold: 0.5 }
  );

  heroObserver.observe(hero);
}

// 3) Optional: on click, set active immediately (feels snappier)
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const id = link.getAttribute("href").slice(1);
    setActive(id);
  });
});


/* =========================
   OPEN MODAL
========================= */

const cards = document.querySelectorAll(".project-card");

cards.forEach((card) => {
  const openBtn = card.querySelector(".project-more");
  const modal = card.querySelector(".project-modal");
  const closeBtn = card.querySelector(".project-modal__close");

  // Open modal
  openBtn.addEventListener("click", () => {
    // close any other open card first
    document.querySelectorAll(".project-card.is-open")
      .forEach(c => c.classList.remove("is-open"));

    card.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  });

  // Close modal (X button)
  closeBtn.addEventListener("click", () => {
    card.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  });
});

// ESC closes everything
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".project-card.is-open")
      .forEach(c => {
        c.classList.remove("is-open");
        c.querySelector(".project-modal")
          ?.setAttribute("aria-hidden", "true");
      });
  }
});


