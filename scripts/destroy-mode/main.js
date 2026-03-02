import {
    BULLET,
    COMBO_WINDOW_MS,
    DRIFT,
    EXCLUDE_SELECTORS,
    FIRE_KEY,
    HP,
    IMPACT,
    ITEM_SELECTOR,
    SCROLL,
    SCROLL_BY_KEYS,
    SECTION_SELECTOR,
    SHIP_SPEED,
    WEAPONS,
    Z_INDEX,
} from "./constants.js";
import { clamp, easeInOutCubic, isTouchDevice, wait } from "./utils.js";

(() => {
    const toggleBtn = document.querySelector(".destroy-toggle");
    const layer = document.querySelector(".destroy-layer");
    const ship = document.querySelector(".ship");

    // Optional UI bits
    const sentinel = document.getElementById("destroy-sentinel");
    const flash = document.querySelector(".page-flash");
    const intro = document.querySelector(".destroy-intro");
    const introStart = document.querySelector(".destroy-start");
    const introCancel = document.querySelector(".destroy-cancel");

    // ✅ Thank you popup (must exist in HTML)
    const thanksPopup = document.querySelector(".portfolio-thanks");
    const thanksClose = document.querySelector(".portfolio-thanks__close");

    if (!toggleBtn || !layer || !ship) return;

    if (isTouchDevice()) {
        // Hide all destroy-mode UI on mobile
        ship.style.display = "none";
        layer.style.display = "none";
        toggleBtn.style.display = "none";

        // Optional: also hide intro/flash if they exist
        document.querySelector(".destroy-intro")?.style.setProperty("display", "none");
        document.querySelector(".page-flash")?.style.setProperty("display", "none");

        return;
    }

    const bullets = [];
    let lastShotAt = 0;

    // All sections (bottom -> top)
    const sections = Array.from(document.querySelectorAll(SECTION_SELECTOR)).filter(
        (v, i, a) => a.indexOf(v) === i
    );

    let scrollVel = 0;

    // ----------------------------
    // STATE
    // ----------------------------
    let isOn = false;
    let introRunning = false;

    // HUD state
    let score = 0;
    let startAt = 0;
    let hud = null;
    let toast = null;
    let totalHits = 0;
    let combo = 0;
    let lastHitAt = 0;
    let isPaused = false;
    let activeWeaponId = "pulse";
    let driftFx = null;
    let driftTimer = null;
    let totalDestroyables = 1;
    let destroyedCount = 0;
    let lastImpactAt = 0;

    // ✅ thank you popup state
    let thanksShown = false;

    // firing (hold F)
    let firing = false;

    // ship pinned bottom
    let shipX = window.innerWidth * 0.5;
    let shipY = window.innerHeight - 70;

    // movement keys
    const keys = new Set();

    // current section
    let activeSectionIndex = Math.max(0, sections.length - 1);
    let activeSection = sections[activeSectionIndex] || null;

    // ----------------------------
    // THANK YOU POPUP HELPERS
    // ----------------------------
    function openThanksPopup() {
        if (!thanksPopup) return;
        thanksPopup.classList.add("is-open");
        thanksPopup.setAttribute("aria-hidden", "false");
    }

    function closeThanksPopup() {
        if (!thanksPopup) return;
        thanksPopup.classList.remove("is-open");
        thanksPopup.setAttribute("aria-hidden", "true");
    }

    // close button
    thanksClose?.addEventListener("click", closeThanksPopup);

    // click outside panel closes
    thanksPopup?.addEventListener("click", (e) => {
        if (e.target === thanksPopup) closeThanksPopup();
    });

    // ----------------------------
    // HELPERS
    // ----------------------------
    function matchesExcluded(el) {
        return EXCLUDE_SELECTORS.some((sel) => el.matches?.(sel) || el.closest?.(sel));
    }

    function positionShip(x) {
        shipX = clamp(x, 20, window.innerWidth - 20);
        shipY = window.innerHeight - 70;
        ship.style.left = shipX + "px";
        ship.style.top = shipY + "px";
        ship.style.transform = "translate(-50%, -50%)";
    }

    function setDestroyUiPointerEvents(value) {
        document.querySelectorAll(".destroy-ui, .hero-hit-bg, .hero-hit-divider").forEach((el) => {
            el.style.pointerEvents = value;
        });
    }


    function smoothScrollToY(targetY, duration = SCROLL.durationMs) {
        const startY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const endY = clamp(targetY, 0, Math.max(0, maxScroll));
        const startT = performance.now();

        return new Promise((resolve) => {
            function step(now) {
                const t = clamp((now - startT) / duration, 0, 1);
                window.scrollTo(0, startY + (endY - startY) * easeInOutCubic(t));
                if (t < 1) requestAnimationFrame(step);
                else resolve();
            }
            requestAnimationFrame(step);
        });
    }

    function scrollToSection(sec) {
        if (!sec) return Promise.resolve();
        const top = sec.getBoundingClientRect().top + window.scrollY;
        const headerOffset = 90;
        return smoothScrollToY(top - headerOffset);
    }

    // W/ArrowUp = scroll UP, S/ArrowDown = scroll DOWN
    function applyKeyScroll() {
        const up = keys.has("arrowup") || keys.has("w");
        const down = keys.has("arrowdown") || keys.has("s");

        let target = 0;
        if (up && !down) target = -SCROLL_BY_KEYS.maxPxPerFrame;
        if (down && !up) target = SCROLL_BY_KEYS.maxPxPerFrame;

        if (target !== 0) scrollVel += (target - scrollVel) * SCROLL_BY_KEYS.accel;
        else scrollVel += (0 - scrollVel) * SCROLL_BY_KEYS.friction;

        if (Math.abs(scrollVel) > 0.05) window.scrollBy(0, scrollVel);
    }

    function applyDamageVisual(el) {
        const maxHp =
            el.dataset.kind === "header"
                ? HP.header
                : el.dataset.kind === "section"
                    ? HP.section
                    : HP.item;

        const hp = Number(el.dataset.hp || maxHp);
        const dmg = clamp((maxHp - hp) / maxHp, 0, 1);
        el.style.setProperty("--damage", String(dmg));
    }

    function applyHitStyle(el, strength = 1) {
        if (!el) return;
        const hue = 18 + Math.random() * 26;
        const glow = 0.45 + Math.random() * 0.45;
        el.style.setProperty("--hit-hue", hue.toFixed(1));
        el.style.setProperty("--hit-glow", glow.toFixed(2));
        el.style.setProperty("--hit-scale", (1 + Math.min(0.08, strength * 0.03)).toFixed(3));
        el.classList.remove("hit-pulse");
        void el.offsetWidth;
        el.classList.add("hit-pulse");
        window.setTimeout(() => el.classList.remove("hit-pulse"), 220);
    }

    function shakeOnDestroy() {
        // Shake only page content (never the ship layer).
        const targets = [document.querySelector(".site-header"), document.querySelector("main")]
            .filter(Boolean);

        targets.forEach((el) => {
            el.animate(
                [
                    { transform: "translate(0,0)" },
                    { transform: "translate(-6px,2px)" },
                    { transform: "translate(6px,-2px)" },
                    { transform: "translate(-5px,-1px)" },
                    { transform: "translate(5px,2px)" },
                    { transform: "translate(-3px,1px)" },
                    { transform: "translate(3px,-1px)" },
                    { transform: "translate(0,0)" },
                ],
                { duration: 600, easing: "ease-in-out" }
            );
        });
    }

    function ensureHUD() {
        if (hud) return;

        hud = document.createElement("div");
        hud.className = "destroy-hud";
        hud.innerHTML = `
      <span class="pill">Score: <b class="hud-score">0</b></span>
      <span class="pill">Time: <b class="hud-time">0.0s</b></span>
      <span class="pill">Hits: <b class="hud-hits">0</b></span>
      <span class="pill">Combo: <b class="hud-combo">x1</b></span>
      <span class="pill">Weapon: <b class="hud-weapon">Pulse</b></span>
    `;
        document.body.appendChild(hud);

        toast = document.createElement("div");
        toast.className = "destroy-toast";
        document.body.appendChild(toast);
    }

    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = "block";
        toast.animate(
            [
                { opacity: 0, transform: "translateX(-50%) translateY(-6px)" },
                { opacity: 1, transform: "translateX(-50%) translateY(0)" },
            ],
            { duration: 180, fill: "forwards" }
        );
        setTimeout(() => {
            toast.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
            setTimeout(() => (toast.style.display = "none"), 240);
        }, 900);
    }

    function updateHUD() {
        if (!hud) return;
        const t = (performance.now() - startAt) / 1000;
        hud.querySelector(".hud-score").textContent = score;
        hud.querySelector(".hud-time").textContent = `${t.toFixed(1)}s`;
        hud.querySelector(".hud-hits").textContent = totalHits;
        hud.querySelector(".hud-combo").textContent = `x${getComboMultiplier()}`;
        hud.querySelector(".hud-weapon").textContent = WEAPONS[activeWeaponId]?.label || "Pulse";
    }

    function getComboMultiplier() {
        return Math.min(4, 1 + Math.floor(combo / 5));
    }

    function getFireCooldownMs() {
        const weapon = WEAPONS[activeWeaponId] || WEAPONS.pulse;
        return clamp(weapon.cooldownMs - Math.floor(totalHits / 20) * 8, 45, weapon.cooldownMs);
    }

    function getBulletSpeed() {
        const weapon = WEAPONS[activeWeaponId] || WEAPONS.pulse;
        return BULLET.speedPxPerFrame + weapon.speedBoost + Math.min(7, Math.floor(totalHits / 30));
    }

    function setWeapon(id) {
        if (!WEAPONS[id] || activeWeaponId === id) return;
        activeWeaponId = id;
        updateHUD();
        showToast(`🔫 ${WEAPONS[id].label} equipped`);
    }

    function ensureDriftFxLayer() {
        if (driftFx) return driftFx;
        const fx = document.createElement("div");
        fx.className = "destroy-rain";
        layer.appendChild(fx);
        driftFx = fx;
        return driftFx;
    }

    function spawnDriftParticle(intensity = 1) {
        const fx = ensureDriftFxLayer();
        const p = document.createElement("span");
        p.className = "destroy-particle";

        const startX = Math.random() * window.innerWidth;
        const len = DRIFT.baseLengthMin + Math.random() * (DRIFT.baseLengthMax - DRIFT.baseLengthMin);
        const baseDur =
            DRIFT.baseDurationMin + Math.random() * (DRIFT.baseDurationMax - DRIFT.baseDurationMin);
        const dur = Math.max(200, baseDur / intensity);
        const drift = (Math.random() * 70 - 35).toFixed(1);
        const alpha = Math.min(0.95, 0.28 + Math.random() * 0.52);
        const width = 1 + Math.random() * 2.2;

        p.style.left = `${startX}px`;
        p.style.top = `-24px`;
        p.style.height = `${len}px`;
        p.style.width = `${width.toFixed(2)}px`;
        p.style.opacity = alpha.toFixed(2);
        fx.appendChild(p);

        const blink1 = 0.18 + Math.random() * 0.18;
        const blink2 = 0.45 + Math.random() * 0.18;
        const blink3 = 0.72 + Math.random() * 0.16;
        const dim = Math.max(0.04, alpha * 0.2);
        const bright = Math.min(1, alpha * 1.2);

        p.animate(
            [
                { offset: 0, transform: "translate3d(0,0,0)", opacity: alpha },
                { offset: blink1, transform: `translate3d(${(drift * 0.25).toFixed(1)}px, ${(window.innerHeight * 0.25).toFixed(1)}px, 0)`, opacity: bright },
                { offset: Math.min(0.96, blink1 + 0.05), transform: `translate3d(${(drift * 0.3).toFixed(1)}px, ${(window.innerHeight * 0.3).toFixed(1)}px, 0)`, opacity: dim },
                { offset: blink2, transform: `translate3d(${(drift * 0.55).toFixed(1)}px, ${(window.innerHeight * 0.55).toFixed(1)}px, 0)`, opacity: bright },
                { offset: Math.min(0.98, blink2 + 0.06), transform: `translate3d(${(drift * 0.6).toFixed(1)}px, ${(window.innerHeight * 0.6).toFixed(1)}px, 0)`, opacity: dim },
                { offset: blink3, transform: `translate3d(${(drift * 0.82).toFixed(1)}px, ${(window.innerHeight * 0.82).toFixed(1)}px, 0)`, opacity: bright },
                {
                    offset: 1,
                    transform: `translate3d(${drift}px, ${window.innerHeight + 60}px, 0)`,
                    opacity: 0.02,
                },
            ],
            { duration: dur, easing: "linear", fill: "forwards" }
        );

        window.setTimeout(() => p.remove(), dur + 30);
    }

    function startDriftParticles() {
        ensureDriftFxLayer();
        if (driftTimer) clearInterval(driftTimer);
        driftTimer = setInterval(() => {
            if (!isOn || isPaused) return;

            const movingHoriz =
                keys.has("arrowleft") || keys.has("a") || keys.has("arrowright") || keys.has("d");
            const movingScroll =
                keys.has("arrowup") || keys.has("w") || keys.has("arrowdown") || keys.has("s");
            const scrollBoost = clamp(Math.abs(scrollVel) / 10, 0, 1.1);

            let intensity = 1;
            if (movingHoriz) intensity += 0.45;
            if (movingScroll) intensity += 0.55;
            if (firing) intensity += 0.9;
            intensity += scrollBoost;
            intensity += getDestructionProgress() * 3.4;

            const spawnCount = Math.min(18, 3 + Math.floor(intensity) + (Math.random() > 0.28 ? 2 : 1));
            for (let i = 0; i < spawnCount; i++) {
                spawnDriftParticle(intensity);
            }
        }, DRIFT.intervalMs);
    }

    function stopDriftParticles() {
        if (driftTimer) {
            clearInterval(driftTimer);
            driftTimer = null;
        }
        if (driftFx) {
            driftFx.textContent = "";
        }
    }

    // ----------------------------
    // INTRO (optional)
    // ----------------------------
    function openIntro() {
        if (!intro) return;
        intro.classList.add("is-open");
        intro.setAttribute("aria-hidden", "false");
        intro.querySelector(".destroy-start")?.focus();
    }

    function closeIntro() {
        if (!intro) return;
        intro.classList.remove("is-open");
        intro.setAttribute("aria-hidden", "true");
    }

    async function playIntroSequence() {
        if (flash) {
            flash.classList.remove("is-on");
            void flash.offsetWidth;
            flash.classList.add("is-on");
        }

        shakeOnDestroy();
        await wait(650);

        openIntro();
    }

    // ----------------------------
    // Button only at bottom (optional)
    // ----------------------------
    toggleBtn.classList.remove("is-visible");
    if (sentinel) {
        const bottomObserver = new IntersectionObserver(
            (entries) => toggleBtn.classList.toggle("is-visible", !!entries[0]?.isIntersecting),
            { threshold: 0.6 }
        );
        bottomObserver.observe(sentinel);
    } else {
        toggleBtn.classList.add("is-visible");
    }

    // ----------------------------
    // DESTROYABLE MARKING
    // ----------------------------
    function clearDestroyableMarks() {
        document.querySelectorAll(".destroyable, .destroyed").forEach((el) => {
            el.classList.remove("destroyable");
            el.classList.remove("destroyed");
            el.style.visibility = "";
            el.style.pointerEvents = "";
            el.style.removeProperty("--damage");
            delete el.dataset.hp;
            delete el.dataset.kind;
            delete el.dataset.destroyCounted;
        });
        totalDestroyables = 1;
        destroyedCount = 0;
    }

    function markDestroyablesWholeSite() {
        // 1) Section containers (so gradient borders can be "killed")
        const sectionCandidates = Array.from(document.querySelectorAll(SECTION_SELECTOR)).filter(
            (v, i, a) => a.indexOf(v) === i
        );

        sectionCandidates.forEach((sec) => {
            if (!sec) return;
            if (matchesExcluded(sec)) return;

            const r = sec.getBoundingClientRect();
            if (r.width < 80 || r.height < 80) return;

            sec.classList.add("destroyable");
            sec.dataset.hp = String(HP.section);
            sec.dataset.kind = "section";
            applyDamageVisual(sec);
        });

        // 2) Items inside each section
        sectionCandidates.forEach((sec) => {
            const items = Array.from(sec.querySelectorAll(ITEM_SELECTOR));
            items.forEach((el) => {
                if (!el) return;
                if (matchesExcluded(el)) return;
                if (el === sec) return;
                if (el === toggleBtn || el === ship || el === layer) return;

                // ✅ no harsh size filter (your hero p will always be marked)
                const r = el.getBoundingClientRect();
                if (r.width < 8 || r.height < 8) return;

                el.classList.add("destroyable");
                el.dataset.hp = String(HP.item);
                el.dataset.kind = "item";
                applyDamageVisual(el);
            });

        });

        // 3) Header boss
        const header = document.querySelector(".site-header");
        if (header && !matchesExcluded(header)) {
            header.classList.add("destroyable");
            header.dataset.hp = String(HP.header);
            header.dataset.kind = "header";
            applyDamageVisual(header);
        }

        totalDestroyables = document.querySelectorAll(".destroyable").length || 1;
    }

    function markDestroyedProgress(el) {
        if (!el || el.dataset.destroyCounted === "1") return;
        el.dataset.destroyCounted = "1";
        destroyedCount += 1;
    }

    function getDestructionProgress() {
        return clamp(destroyedCount / totalDestroyables, 0, 1);
    }

    // only ITEMS count for clearing a section (not the section container)
    function sectionIsCleared(sec) {
        if (!sec) return true;

        const targets = Array.from(sec.querySelectorAll(".destroyable[data-kind='item']"));
        return !targets.some(
            (el) =>
                !el.classList.contains("destroyed") &&
                el.style.visibility !== "hidden" &&
                el.getClientRects().length > 0
        );
    }

    async function goToNextSection() {
        const nextIndex = activeSectionIndex - 1;
        if (nextIndex < 0) return;

        activeSectionIndex = nextIndex;
        activeSection = sections[activeSectionIndex];

        await scrollToSection(activeSection);
    }

    // Track visible section
    const sectionObserver = new IntersectionObserver(
        (entries) => {
            const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];

            if (!visible) return;

            const idx = sections.indexOf(visible.target);
            if (idx !== -1) {
                activeSectionIndex = idx;
                activeSection = sections[idx];
            }
        },
        { threshold: [0.2, 0.35, 0.5, 0.65] }
    );

    // ----------------------------
    // MODE ON/OFF
    // ----------------------------
    function clearBullets() {
        while (bullets.length) bullets.pop().el.remove();
    }

    async function startMode() {
        ensureHUD();

        score = 0;
        totalHits = 0;
        combo = 0;
        lastHitAt = 0;
        isPaused = false;
        activeWeaponId = "pulse";
        startAt = performance.now();
        hud.style.display = "flex";
        updateHUD();

        // ✅ reset thank you popup state each run
        thanksShown = false;
        closeThanksPopup();

        isOn = true;
        firing = false;
        keys.clear();

        document.body.classList.add("destroy-mode-on");
        toggleBtn.classList.add("is-on");
        toggleBtn.setAttribute("aria-pressed", "true");

        ship.style.opacity = "1";
        ship.style.transform = "translate(-50%, -50%)";
        layer.style.pointerEvents = "none";

        // ✅ make overlays never block hits
        setDestroyUiPointerEvents("none");

        // start at bottom
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });

        activeSectionIndex = Math.max(0, sections.length - 1);
        activeSection = sections[activeSectionIndex] || null;

        await scrollToSection(activeSection);

        clearDestroyableMarks();
        markDestroyablesWholeSite();

        sections.forEach((sec) => sectionObserver.observe(sec));
        positionShip(shipX);
        startDriftParticles();

    }

    function stopMode() {
        isOn = false;
        firing = false;
        isPaused = false;

        document.body.classList.remove("destroy-mode-on");
        toggleBtn.classList.remove("is-on");
        toggleBtn.setAttribute("aria-pressed", "false");

        ship.style.opacity = "0";
        ship.classList.remove("is-thrusting");

        clearBullets();
        stopDriftParticles();
        clearDestroyableMarks();
        sections.forEach((sec) => sectionObserver.unobserve(sec));

        setDestroyUiPointerEvents("");

        if (hud) hud.style.display = "none";
        if (toast) toast.style.display = "none";

    }

    // ----------------------------
    // IMPACT FX (20 bursts)
    // ----------------------------
    function spawnImpactSingle(x, y, scaleMul = 1) {
        const fx = document.createElement("div");
        fx.style.position = "fixed";
        fx.style.left = x + "px";
        fx.style.top = y + "px";
        fx.style.width = IMPACT.size * scaleMul + "px";
        fx.style.height = IMPACT.size * scaleMul + "px";
        fx.style.transform = "translate(-50%, -50%)";
        fx.style.pointerEvents = "none";
        fx.style.zIndex = String(Z_INDEX.impact);
        fx.style.background = `url("${IMPACT.imgUrl}") center/contain no-repeat`;
        fx.style.opacity = "1";
        fx.style.filter = "drop-shadow(0 0 32px rgba(255,120,0,0.9)) saturate(1.25)";
        fx.style.mixBlendMode = "screen";
        document.body.appendChild(fx);

        const rot = (Math.random() * 70 - 35).toFixed(2);

        fx.animate(
            [
                { transform: `translate(-50%, -50%) scale(0.55) rotate(${rot}deg)`, opacity: 1 },
                { transform: `translate(-50%, -50%) scale(1.55) rotate(${rot}deg)`, opacity: 0.25 },
                { transform: `translate(-50%, -50%) scale(1.95) rotate(${rot}deg)`, opacity: 0 },
            ],
            { duration: IMPACT.lifeMs, easing: "cubic-bezier(.12,.8,.2,1)", fill: "forwards" }
        );

        window.setTimeout(() => fx.remove(), IMPACT.lifeMs + 90);
    }

    function spawnShockwave(x, y, scale = 1) {
        const ring = document.createElement("div");
        ring.style.position = "fixed";
        ring.style.left = x + "px";
        ring.style.top = y + "px";
        ring.style.width = `${(26 * scale).toFixed(1)}px`;
        ring.style.height = `${(26 * scale).toFixed(1)}px`;
        ring.style.borderRadius = "999px";
        ring.style.pointerEvents = "none";
        ring.style.zIndex = String(Z_INDEX.impactFront);
        ring.style.border = "2px solid rgba(255,190,120,0.95)";
        ring.style.boxShadow = "0 0 26px rgba(255,140,80,0.8)";
        ring.style.transform = "translate(-50%, -50%) scale(0.2)";
        ring.style.opacity = "1";
        document.body.appendChild(ring);

        ring.animate(
            [
                { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0.95 },
                { transform: "translate(-50%, -50%) scale(5.4)", opacity: 0 },
            ],
            { duration: 360 + scale * 40, easing: "cubic-bezier(.12,.8,.2,1)", fill: "forwards" }
        );

        window.setTimeout(() => ring.remove(), 420);
    }

    function spawnFireShards(x, y, amount = 12, scale = 1) {
        for (let i = 0; i < amount; i++) {
            const s = document.createElement("div");
            s.style.position = "fixed";
            s.style.left = `${x}px`;
            s.style.top = `${y}px`;
            s.style.width = `${(3 + Math.random() * 4.5) * scale}px`;
            s.style.height = `${(8 + Math.random() * 18) * scale}px`;
            s.style.pointerEvents = "none";
            s.style.zIndex = String(Z_INDEX.impactFront);
            s.style.borderRadius = "999px";
            s.style.background =
                "linear-gradient(to bottom, rgba(255,240,190,0.95), rgba(255,145,60,0.95), rgba(255,70,20,0.25))";
            s.style.boxShadow = "0 0 14px rgba(255,120,40,0.8)";
            s.style.transform = "translate(-50%, -50%)";
            document.body.appendChild(s);

            const angle = Math.random() * Math.PI * 2;
            const dist = (40 + Math.random() * 140) * scale;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            const life = 280 + Math.random() * 260;

            s.animate(
                [
                    { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
                    { transform: `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) scale(0.25)`, opacity: 0 },
                ],
                { duration: life, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
            );

            window.setTimeout(() => s.remove(), life + 20);
        }
    }

    function spawnBurnDecal(x, y, scale = 1) {
        const d = document.createElement("div");
        d.className = "burn-decal";
        d.style.left = `${x}px`;
        d.style.top = `${y}px`;
        const size = (22 + Math.random() * 34) * scale;
        d.style.width = `${size.toFixed(1)}px`;
        d.style.height = `${(size * (0.75 + Math.random() * 0.45)).toFixed(1)}px`;
        d.style.transform = `translate(-50%, -50%) rotate(${(Math.random() * 360).toFixed(1)}deg)`;
        d.style.opacity = `${(0.2 + Math.random() * 0.35).toFixed(2)}`;
        document.body.appendChild(d);
        const ttl = 2200 + Math.random() * 2200;
        d.animate([{ opacity: d.style.opacity }, { opacity: 0 }], {
            duration: ttl,
            easing: "linear",
            fill: "forwards",
        });
        window.setTimeout(() => d.remove(), ttl + 40);
    }

    function punchImpactArea(x, y) {
        const radius = 180;
        const candidates = document.elementsFromPoint(x, y);
        const hitRoot = candidates.find((el) => el.matches?.(".destroyable"))?.closest?.(".destroyable");
        if (!hitRoot) return;

        hitRoot.animate(
            [
                { transform: "translate(0,0) scale(1)" },
                { transform: "translate(6px,-5px) scale(1.025)" },
                { transform: "translate(-4px,3px) scale(0.992)" },
                { transform: "translate(0,0) scale(1)" },
            ],
            { duration: 210, easing: "cubic-bezier(.2,.8,.2,1)" }
        );

        const near = Array.from(document.querySelectorAll(".destroyable[data-kind='item']")).filter((el) => {
            if (el.classList.contains("destroyed") || el.style.visibility === "hidden") return false;
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            return Math.hypot(cx - x, cy - y) <= radius;
        });

        near.slice(0, 3).forEach((el, i) => {
            el.animate(
                [
                    { transform: "translate(0,0)" },
                    { transform: `translate(${(Math.random() * 8 - 4).toFixed(1)}px, ${(Math.random() * 8 - 4).toFixed(1)}px)` },
                    { transform: "translate(0,0)" },
                ],
                { duration: 120 + i * 12, easing: "ease-out" }
            );
        });
    }

    function spawnImpact(x, y, opts = {}) {
        const now = performance.now();
        const crit = !!opts.crit;
        const weaponType = opts.weaponType || "pulse";
        const comboLevel = opts.comboLevel || 1;
        const strength = 1 + Math.min(0.8, comboLevel * 0.06) + (crit ? 0.35 : 0);
        const shardAmount = clamp(Math.round(4 + comboLevel + (crit ? 4 : 0)), 4, 12);

        // If impacts are happening too fast, keep only a very light effect path.
        if (now - lastImpactAt < 28) {
            spawnImpactSingle(x, y, 0.85);
            return;
        }
        lastImpactAt = now;

        // center
        spawnImpactSingle(x, y, 1.05 * strength);
        if (crit || Math.random() > 0.62) {
            spawnShockwave(x, y, strength);
        }
        spawnFireShards(x, y, shardAmount, strength);
        if (crit || Math.random() > 0.9) {
            spawnBurnDecal(x, y, 0.7 + Math.random() * 0.35);
        }
        if (crit || Math.random() > 0.55) {
            punchImpactArea(x, y);
        }

        // lighter burst cloud
        const burstExtra = clamp(2 + Math.floor(comboLevel / 2) + (crit ? 3 : 0), 2, IMPACT.burstCount);
        for (let i = 0; i < burstExtra; i++) {
            const dx = (Math.random() * 2 - 1) * IMPACT.burstSpreadPx;
            const dy = (Math.random() * 2 - 1) * IMPACT.burstSpreadPx;
            const s = 0.35 + Math.random() * 0.65;
            spawnImpactSingle(x + dx, y + dy, s * strength);
        }

        // weapon flavor boost
        if (weaponType === "scatter") {
            spawnFireShards(x, y, 4 + Math.round(Math.random() * 3), 0.6 + Math.random() * 0.3);
        }
        if (crit) {
            showToast("⚡ CRITICAL BURST");
        }
    }

    function applyScatterSplash(x, y, primaryTarget) {
        const radius = 150;
        const nearby = Array.from(document.querySelectorAll(".destroyable[data-kind='item']")).filter((el) => {
            if (el === primaryTarget) return false;
            if (el.classList.contains("destroyed") || el.style.visibility === "hidden") return false;
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            return Math.hypot(cx - x, cy - y) <= radius;
        });

        nearby.slice(0, 3).forEach((el) => {
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dist = Math.hypot(cx - x, cy - y);
            const falloff = clamp(1 - dist / radius, 0.18, 0.6);
            applyHitStyle(el, 0.8);
            destroyElement(el, 0.65 * falloff);
        });
    }

    // ----------------------------
    // WIN / ALL CLEAR (kept, but popup is score-based now)
    // ----------------------------
    function isEverythingCleared() {
        const remaining = document.querySelectorAll(".destroyable:not(.destroyed)");
        for (const el of remaining) {
            if (el.style.visibility !== "hidden" && el.getClientRects().length > 0) return false;
        }
        return true;
    }

    function allClearSequence() {
        showToast("✅ ALL CLEAR! SECRET UNLOCKED");

        if (flash) {
            flash.classList.remove("is-on");
            void flash.offsetWidth;
            flash.classList.add("is-on");
        }

        shakeOnDestroy();

        setTimeout(() => stopMode(), 800);
    }

    // ----------------------------
    // DESTROY (HP)
    // ----------------------------
    async function destroyElement(el, damage = 1) {
        // safety
        if (!el || el.classList.contains("destroyed") || el.style.visibility === "hidden") return;

        // ✅ every hit counts
        const now = performance.now();
        combo = now - lastHitAt <= COMBO_WINDOW_MS ? combo + 1 : 1;
        lastHitAt = now;
        totalHits++;
        score += 5 * getComboMultiplier() * damage;
        updateHUD();

        // take 1 HP
        const prevHp = Number(el.dataset.hp || 1);
        const hp = Math.max(0, prevHp - damage);
        el.dataset.hp = String(hp);

        applyDamageVisual(el);
        applyHitStyle(el, damage);

        // small hit feedback
        el.animate(
            [
                { transform: "translate(0,0) scale(1)" },
                { transform: "translate(2px,-2px) scale(1.01)" },
                { transform: "translate(-2px,2px) scale(1.01)" },
                { transform: "translate(0,0) scale(1)" },
            ],
            { duration: 160, easing: "ease-out" }
        );

        // ✅ if still alive, stop here (but hit/score already updated)
        if (hp > 0) return;

        // ✅ NOW it's destroyed
        el.classList.add("destroyed");
        el.style.pointerEvents = "none";
        el.style.visibility = "hidden";
        markDestroyedProgress(el);

        shakeOnDestroy();

        // bonuses + special actions
        if (el.dataset.kind === "header") {
            score += 100;
            showToast("👑 NAVBAR DOWN +100");
            updateHUD();

            // ✅ show popup ONLY when navbar is actually destroyed (hp hit 0)
            if (!thanksShown) {
                thanksShown = true;
                openThanksPopup();
            }

            // ✅ end mode and go to top
            stopMode();
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        // keep your “all cleared” logic
        if (isEverythingCleared()) {
            allClearSequence();
            return;
        }

        // when all inner items are destroyed, auto-destroy that item's section container itself
        if (el.dataset.kind === "item") {
            const sectionOfItem = el.closest(SECTION_SELECTOR);
            if (!sectionOfItem || !sectionIsCleared(sectionOfItem)) return;

            await destroySectionContainer(sectionOfItem);
            if (isEverythingCleared()) {
                allClearSequence();
                return;
            }
            if (sectionOfItem === activeSection) {
                await goToNextSection();
            }
        }
    }

    async function destroySectionContainer(sec) {
        if (!sec) return;
        if (sec.classList.contains("destroyed")) return;
        if (sec.dataset.kind !== "section") return;

        sec.classList.add("destroyed");
        sec.style.pointerEvents = "none";
        sec.style.visibility = "hidden";
        markDestroyedProgress(sec);

        score += 35;
        showToast("💥 SECTION CLEARED +35");
        updateHUD();

        if (flash) {
            flash.classList.remove("is-on");
            void flash.offsetWidth;
            flash.classList.add("is-on");
        }
        shakeOnDestroy();
    }
    // ----------------------------
    // BULLETS + COLLISION
    // ----------------------------
    function createBulletElement(weapon) {
        const b = document.createElement("div");
        b.style.position = "fixed";
        b.style.width = BULLET.thickness + "px";
        b.style.height = BULLET.length + "px";
        b.style.borderRadius = "999px";
        b.style.pointerEvents = "none";
        b.style.transform = "translate(-50%, -50%)";
        b.style.background = weapon.gradient;
        b.style.boxShadow = weapon.glow;
        b.style.zIndex = String(Z_INDEX.bullet);
        document.body.appendChild(b);
        return b;
    }

    function fireBullet() {
        const now = performance.now();
        if (now - lastShotAt < getFireCooldownMs()) return;
        lastShotAt = now;
        const weapon = WEAPONS[activeWeaponId] || WEAPONS.pulse;

        const startX = shipX;
        const startY = shipY - 42;
        const speedY = -getBulletSpeed();
        const count = weapon.pellets;
        const center = (count - 1) / 2;

        for (let i = 0; i < count; i++) {
            const spreadOffset = (i - center) * weapon.spread;
            const el = createBulletElement(weapon);

            bullets.push({
                el,
                x: startX,
                y: startY,
                px: startX,
                py: startY,
                vx: spreadOffset,
                vy: speedY,
                damage: weapon.damage,
                pierce: weapon.pierce,
                weaponType: activeWeaponId,
                bornAt: now,
            });
        }
    }

    function isAliveDestroyable(el) {
        return !!(
            el &&
            el.classList?.contains("destroyable") &&
            !el.classList.contains("destroyed") &&
            el.style.visibility !== "hidden"
        );
    }

    // ✅ Bigger hitbox: more samples + stack-based picking for reliability
    function getHitDestroyableAtPoint(x, y, bulletEl) {
        const prev = bulletEl?.style.visibility;
        if (bulletEl) bulletEl.style.visibility = "hidden";

        const stack = document.elementsFromPoint(x, y);

        if (bulletEl) bulletEl.style.visibility = prev ?? "";

        if (!stack?.length) return null;

        for (const raw of stack) {
            if (matchesExcluded(raw)) continue;

            // 1) prefer normal item targets
            const item = raw.closest?.(".destroyable[data-kind='item']");
            if (isAliveDestroyable(item)) {
                return item;
            }

            // 2) allow header as boss target
            const header = raw.closest?.(".site-header.destroyable");
            if (isAliveDestroyable(header)) {
                return header;
            }
        }

        return null;
    }

    function getHitDestroyableNearPoint(x, y, bulletEl) {
        const samples = [
            [0, 0],
            [0, -8],
            [0, 8],
            [-8, 0],
            [8, 0],
            [-12, -6],
            [12, -6],
            [-12, 6],
            [12, 6],
            [0, -14],
            [0, 14],
            [-14, 0],
            [14, 0],
        ];
        for (const [dx, dy] of samples) {
            const t = getHitDestroyableAtPoint(x + dx, y + dy, bulletEl);
            if (t) return t;
        }
        return null;
    }

    // ✅ Raycast between previous and current bullet position (stops “tunneling”)
    function raycastHit(b) {
        const x0 = b.px,
            y0 = b.py;
        const x1 = b.x,
            y1 = b.y;

        const dx = x1 - x0;
        const dy = y1 - y0;
        const dist = Math.hypot(dx, dy) || 0;

        // step every ~6px for better thin-text hit reliability
        const steps = Math.max(1, Math.ceil(dist / 6));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const sx = x0 + dx * t;
            const sy = y0 + dy * t;
            const hit = getHitDestroyableNearPoint(sx, sy, b.el);
            if (hit) return { hit, x: sx, y: sy };
        }
        return null;
    }

    function updateBullets() {
        const now = performance.now();

        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];

            if (now - b.bornAt > BULLET.maxLifeMs) {
                b.el.remove();
                bullets.splice(i, 1);
                continue;
            }

            // store previous
            b.px = b.x;
            b.py = b.y;

            // move
            b.x += b.vx;
            b.y += b.vy;

            b.el.style.left = b.x + "px";
            b.el.style.top = b.y + "px";

            if (
                b.y < -120 ||
                b.y > window.innerHeight + 120 ||
                b.x < -120 ||
                b.x > window.innerWidth + 120
            ) {
                b.el.remove();
                bullets.splice(i, 1);
                continue;
            }

            const res = raycastHit(b);
            if (res) {
                const comboLevel = getComboMultiplier();
                const critChance = 0.06 + Math.min(0.18, (comboLevel - 1) * 0.03);
                const crit = Math.random() < critChance;
                const damage = (b.damage || 1) * (crit ? 1.85 : 1);

                spawnImpact(res.x, res.y, { crit, weaponType: b.weaponType, comboLevel });
                destroyElement(res.hit, damage);
                if (b.weaponType === "scatter") {
                    applyScatterSplash(res.x, res.y, res.hit);
                }

                if (b.pierce > 0) {
                    b.pierce -= 1;
                    b.px = b.x;
                    b.py = b.y;
                    continue;
                }

                b.el.remove();
                bullets.splice(i, 1);
            }
        }
    }

    // ----------------------------
    // INPUT (NO mouse)
    // ----------------------------
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (intro?.classList.contains("is-open")) {
                closeIntro();
                return;
            }
            if (isOn) stopMode();
            return;
        }

        if (!isOn) return;

        const k = e.key.toLowerCase();

        if (k === "p") {
            e.preventDefault();
            isPaused = !isPaused;
            showToast(isPaused ? "⏸ PAUSED" : "▶ RESUMED");
            return;
        }

        if (k === "1") {
            e.preventDefault();
            setWeapon("pulse");
            return;
        }
        if (k === "2") {
            e.preventDefault();
            setWeapon("scatter");
            return;
        }
        if (k === "3") {
            e.preventDefault();
            setWeapon("rail");
            return;
        }

        if (
            ["arrowleft", "arrowright", "a", "d", "arrowup", "arrowdown", "w", "s", "shift"].includes(
                k
            )
        ) {
            e.preventDefault();
            keys.add(k);
            return;
        }

        if (k === FIRE_KEY) {
            e.preventDefault();
            firing = true;
            fireBullet();
        }
    });

    window.addEventListener("keyup", (e) => {
        const k = e.key.toLowerCase();
        keys.delete(k);
        if (k === FIRE_KEY) firing = false;
    });

    // ----------------------------
    // MAIN LOOP
    // ----------------------------
    function tick() {
        if (isOn) {
            if (combo && performance.now() - lastHitAt > COMBO_WINDOW_MS) combo = 0;
            if (isPaused) {
                requestAnimationFrame(tick);
                return;
            }

            let nx = shipX;
            let moving = false;
            const speedMul = keys.has("shift") ? 0.45 : 1;
            const moveSpeed = SHIP_SPEED * speedMul;

            if (keys.has("arrowleft") || keys.has("a")) {
                nx -= moveSpeed;
                moving = true;
            }
            if (keys.has("arrowright") || keys.has("d")) {
                nx += moveSpeed;
                moving = true;
            }

            positionShip(nx);
            ship.classList.toggle("is-thrusting", moving);

            applyKeyScroll();

            if (firing) fireBullet();

            updateBullets();
            updateHUD();
        }

        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // ----------------------------
    // UI FLOW
    // ----------------------------
    toggleBtn.addEventListener("click", async () => {
        if (isOn) {
            closeIntro();
            stopMode();
            return;
        }

        if (!toggleBtn.classList.contains("is-visible")) return;

        if (!intro) {
            await startMode();
            return;
        }

        if (introRunning) return;
        introRunning = true;

        await playIntroSequence();
        introRunning = false;
    });

    introStart?.addEventListener("click", async () => {
        closeIntro();
        await startMode();
    });

    introCancel?.addEventListener("click", () => {
        closeIntro();
        stopMode();
    });

    intro?.addEventListener("click", (e) => {
        if (e.target === intro) {
            closeIntro();
            stopMode();
        }
    });

    window.addEventListener("resize", () => positionShip(shipX));

    // Start OFF
    stopMode();
})();
