const card = document.querySelector(".code-window");

if (!card) {
  console.warn("No .code-window found");
} else {
  gsap.set(card, { transformPerspective: 650, transformStyle: "preserve-3d" });

  const rx = gsap.quickTo(card, "rotationX", { duration: 0.3, ease: "power3.out" });
  const ry = gsap.quickTo(card, "rotationY", { duration: 0.3, ease: "power3.out" });

  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   // 0..1
    const py = (e.clientY - r.top) / r.height;   // 0..1

    rx(gsap.utils.interpolate(12, -12, py));
    ry(gsap.utils.interpolate(-12, 12, px));
  });

  card.addEventListener("pointerleave", () => {
    rx(0);
    ry(0);
  });
}
