// destroy-mode.js
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

    // ----------------------------
    // CONFIG
    // ----------------------------
    const FIRE_KEY = "f"; // shoot with F
    const speed = 7;

    const bullets = [];
    const BULLET = {
        speedPxPerFrame: 18, // slightly faster
        maxLifeMs: 1800,
        thickness: 4, // thicker = easier to see
        length: 18,
        cooldownMs: 100,
    };
    let lastShotAt = 0;

    // fire.png ONLY on hit (bigger + 20 bursts)
    const IMPACT = {
        imgUrl: "./img/fire.png",
        lifeMs: 420,
        size: 190,
        burstCount: 20, // ✅ 20 pngs
        burstSpreadPx: 70, // spread more
    };

    // Smooth scroll (when a section is cleared)
    const SCROLL = { durationMs: 900 };

    // ✅ show the thank-you popup when score reaches this
    const THANKS_SCORE = 80;

    // All sections (bottom -> top)
    const sections = Array.from(document.querySelectorAll("main section[id], .hero")).filter(
        (v, i, a) => a.indexOf(v) === i
    );

    // Exclusions (never destroy these)
    const EXCLUDE_SELECTORS = [
        ".destroy-toggle",
        ".destroy-layer",
        ".ship",
        ".ship *",
        ".destroy-intro",
        ".destroy-intro *",
        ".page-flash",
        ".destroy-hud",
        ".destroy-toast",

        // ✅ also exclude thank you popup from being destroyable
        ".portfolio-thanks",
        ".portfolio-thanks *",

        // your hero overlay helpers (can block clicks if pointer-events not none)
        ".destroy-ui",
        ".hero-hit-bg",
        ".hero-hit-divider",

        "script",
        "style",
        "meta",
        "link",
        "head",
    ];

    // ----------------------------
    // HP
    // ----------------------------
    const HP = {
        item: 3, // each item needs 3 hits
        section: 12, // ✅ section containers (for gradient borders) are destroyable
        header: 10, // header as a "boss"
    };

    // Fine-grained hittables inside sections
    const ITEM_SELECTOR = [
        // text + headings
        "h1",
        "h2",
        "h3",
        "h4",
        "p",
        "li",
        "span",
        "strong",
        "em",
        "time",
        "small",

        // interactive
        "a",
        "button",
        "input",
        "textarea",
        "label",

        // hero / headings / nav blocks
        ".hero__tag",
        ".hero__subtitle",
        ".hero__actions",
        ".section-head",
        ".nav",
        ".nav__list li",

        // your UI blocks
        ".btn",
        ".nav__list a",
        ".logo",
        ".tags li",
        ".skill-pills li",
        ".project-links a",
        ".project-more",
        ".edu-item",
        ".field__control",
        ".link-btn",
        ".contact-btn",
        ".project-thumb",
        ".project-card",
        ".about__panel",
        ".panel",
        ".code-window",
    ].join(",");

    const SECTION_SELECTOR = "main section[id], .hero"; // ✅ gradient borders live here

    // Ship->scroll tuning (mouse-wheel feel)
    const SCROLL_BY_KEYS = {
        maxPxPerFrame: 12,
        accel: 0.2,
        friction: 0.18,
    };
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
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    function matchesExcluded(el) {
        return EXCLUDE_SELECTORS.some((sel) => el.matches?.(sel) || el.closest?.(sel));
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
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

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

    function shakeOnDestroy() {
        document.body.classList.remove("page-shake");
        void document.body.offsetWidth;
        document.body.classList.add("page-shake");
        setTimeout(() => document.body.classList.remove("page-shake"), 650);
    }

    function ensureHUD() {
        if (hud) return;

        hud = document.createElement("div");
        hud.className = "destroy-hud";
        hud.innerHTML = `
      <span class="pill">Score: <b class="hud-score">0</b></span>
      <span class="pill">Time: <b class="hud-time">0.0s</b></span>
      <span class="pill">Hits: <b class="hud-hits">0</b></span>
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

        document.body.classList.remove("page-shake");
        void document.body.offsetWidth;
        document.body.classList.add("page-shake");

        await wait(650);
        document.body.classList.remove("page-shake");

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
        });
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

        let touchActive = false;

        function onTouchStart(e) {
            if (!isOn) return;
            touchActive = true;
            const t = e.touches[0];
            positionShip(t.clientX);
            fireBullet(); // tap shoots
        }

        function onTouchMove(e) {
            if (!isOn || !touchActive) return;
            const t = e.touches[0];
            positionShip(t.clientX); // drag moves ship
        }

        function onTouchEnd() {
            touchActive = false;
        }

        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd);
    }

    function stopMode() {
        isOn = false;
        firing = false;

        document.body.classList.remove("destroy-mode-on");
        toggleBtn.classList.remove("is-on");
        toggleBtn.setAttribute("aria-pressed", "false");

        ship.style.opacity = "0";
        ship.classList.remove("is-thrusting");

        clearBullets();
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
        fx.style.zIndex = "10003";
        fx.style.background = `url("${IMPACT.imgUrl}") center/contain no-repeat`;
        fx.style.opacity = "1";
        fx.style.filter = "drop-shadow(0 0 26px rgba(255,120,0,0.8))";
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

    function spawnImpact(x, y) {
        // center
        spawnImpactSingle(x, y, 1);

        // ✅ 19 more around it (total 20)
        for (let i = 0; i < IMPACT.burstCount - 1; i++) {
            const dx = (Math.random() * 2 - 1) * IMPACT.burstSpreadPx;
            const dy = (Math.random() * 2 - 1) * IMPACT.burstSpreadPx;
            const s = 0.55 + Math.random() * 0.9;
            spawnImpactSingle(x + dx, y + dy, s);
        }
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
    async function destroyElement(el) {
        // safety
        if (!el || el.classList.contains("destroyed") || el.style.visibility === "hidden") return;

        // ✅ every hit counts
        totalHits++;
        score += 5;
        updateHUD();

        // take 1 HP
        const prevHp = Number(el.dataset.hp || 1);
        const hp = prevHp - 1;
        el.dataset.hp = String(hp);

        applyDamageVisual(el);

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

        shakeOnDestroy();

        // bonuses + special actions
        if (el.dataset.kind === "section") {
            score += 35;
            showToast("💥 BORDER DOWN +35");
            updateHUD();
        }

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

        // move to next section when current is cleared
        if (activeSection && sectionIsCleared(activeSection)) {
            await goToNextSection();
        }
    }
    // ----------------------------
    // BULLETS + COLLISION
    // ----------------------------
    function createBulletElement() {
        const b = document.createElement("div");
        b.style.position = "fixed";
        b.style.width = BULLET.thickness + "px";
        b.style.height = BULLET.length + "px";
        b.style.borderRadius = "999px";
        b.style.pointerEvents = "none";
        b.style.transform = "translate(-50%, -50%)";
        b.style.background =
            "linear-gradient(to bottom, rgba(139,92,246,0), rgba(139,92,246,1), rgba(167,139,250,1), rgba(139,92,246,0))";
        b.style.boxShadow = "0 0 18px rgba(139,92,246,0.85)";
        b.style.zIndex = "10001";
        document.body.appendChild(b);
        return b;
    }

    function fireBullet() {
        const now = performance.now();
        if (now - lastShotAt < BULLET.cooldownMs) return;
        lastShotAt = now;

        const startX = shipX;
        const startY = shipY - 42;

        const el = createBulletElement();

        bullets.push({
            el,
            x: startX,
            y: startY,
            px: startX, // previous position (for raycast)
            py: startY,
            vx: 0,
            vy: -BULLET.speedPxPerFrame,
            bornAt: now,
        });
    }

    // ✅ Bigger hitbox: more samples
    function getHitDestroyableAtPoint(x, y, bulletEl) {
        const prev = bulletEl?.style.visibility;
        if (bulletEl) bulletEl.style.visibility = "hidden";

        const raw = document.elementFromPoint(x, y);

        if (bulletEl) bulletEl.style.visibility = prev ?? "";

        if (!raw) return null;

        // If you hit an excluded overlay, walk up to the section behind it by using closest section hit later
        if (matchesExcluded(raw)) {
            // still allow section hit if raw is excluded but inside a section
            const maybeSec = raw.closest?.(SECTION_SELECTOR);
            if (
                maybeSec &&
                maybeSec.classList.contains("destroyable") &&
                maybeSec.dataset.kind === "section"
            ) {
                if (!activeSection || maybeSec === activeSection) return maybeSec;
            }
            return null;
        }

        // allow header always
        const header = raw.closest?.(".site-header.destroyable");
        if (
            header &&
            !header.classList.contains("destroyed") &&
            header.style.visibility !== "hidden"
        ) {
            return header;
        }

        const inActive =
            !activeSection || activeSection.contains(raw) || raw.closest?.(".hero") === activeSection;

        // 1) item first
        const item = raw.closest?.(".destroyable[data-kind='item']");
        if (
            item &&
            !item.classList.contains("destroyed") &&
            item.style.visibility !== "hidden" &&
            inActive
        ) {
            return item;
        }

        // 2) section fallback (big border area)
        const sec = raw.closest?.(".destroyable[data-kind='section']");
        if (sec && !sec.classList.contains("destroyed") && sec.style.visibility !== "hidden") {
            if (activeSection && sec !== activeSection) return null;
            return sec;
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

        // step every ~8px
        const steps = Math.max(1, Math.ceil(dist / 8));
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
                spawnImpact(res.x, res.y);
                destroyElement(res.hit);

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

        if (["arrowleft", "arrowright", "a", "d", "arrowup", "arrowdown", "w", "s"].includes(k)) {
            e.preventDefault();
            keys.add(k);
            return;
        }

        if (k === FIRE_KEY) {
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
            let nx = shipX;
            let moving = false;

            if (keys.has("arrowleft") || keys.has("a")) {
                nx -= speed;
                moving = true;
            }
            if (keys.has("arrowright") || keys.has("d")) {
                nx += speed;
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