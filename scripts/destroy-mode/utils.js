export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}
