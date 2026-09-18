function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// --- Hero: figure walks in, world drops in after 2s ---
const heroEl = document.getElementById("top");

function replayHero() {
  heroEl.classList.remove("play");
  void heroEl.offsetWidth; // force reflow so the animation restarts cleanly
  heroEl.classList.add("play");
}

// --- Navigation: outer horizontal panels, with a vertical pair nested inside the bubble group ---
const panelsEl = document.getElementById("panels");
const panels = [...panelsEl.children];
const BUBBLE_GROUP_INDEX = panels.findIndex((p) => p.id === "bubble-group");
const vgroupEl = document.getElementById("vgroup");
const subPanels = [...vgroupEl.children];
const dotsEl = document.getElementById("panel-dots");

let currentPanel = 0;
let currentSub = 0;
let isAnimating = false;

panels.forEach((_, i) => {
  const dot = document.createElement("button");
  dot.className = "panel-dot";
  dot.setAttribute("aria-label", `Go to section ${i + 1}`);
  dot.addEventListener("click", () => goToPanel(i, i > currentPanel ? "forward" : "backward"));
  dotsEl.appendChild(dot);
});
const dots = [...dotsEl.children];

function updateDots() {
  dots.forEach((d, i) => d.classList.toggle("active", i === currentPanel));
}

// Keep off-screen panels (and off-screen sub-slides) out of tab order and
// out of reach for assistive tech, so keyboard/screen-reader users never
// land on controls they can't see.
function updateInert() {
  panels.forEach((panel, i) => {
    panel.inert = i !== currentPanel;
  });
  if (currentPanel === BUBBLE_GROUP_INDEX) {
    subPanels.forEach((sub, i) => {
      sub.inert = i !== currentSub;
    });
  }
  updateScrollHint();
}

function isEditableTarget(el) {
  return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable);
}

// A small bobbing "keep scrolling" hint, shown everywhere except the very
// last stop, so it never lies about there being more to see.
const scrollHintEl = document.getElementById("scroll-hint");

function isAtLastPosition() {
  if (currentPanel !== panels.length - 1) return false;
  if (currentPanel === BUBBLE_GROUP_INDEX) return currentSub === subPanels.length - 1;
  return true;
}

function updateScrollHint() {
  scrollHintEl.classList.toggle("hidden-hint", isAtLastPosition());
}

const hammertimeEl = document.getElementById("hammertime");

function playHammertime() {
  hammertimeEl.classList.remove("play");
  void hammertimeEl.offsetWidth; // force reflow so the animation restarts cleanly
  hammertimeEl.classList.add("play");
}

const HUG_SUB_INDEX = subPanels.findIndex((p) => p.id === "hug");
let hugLockUntil = 0;

const HUG_DURATION = 5000;

const hugEl = document.getElementById("hug");
const hugThoughtText = document.getElementById("hug-thought-text");
const HUG_THOUGHT_FULL_TEXT = "I wish you could see yourself the way others do";
const HUG_TYPEWRITER_START = 2800; // ms — right as the thought bubble finishes appearing
const HUG_TYPEWRITER_CHAR_DELAY = 45; // ms per character
let hugTypewriterTimer = null;

function typeHugThought() {
  let i = 0;
  const tick = () => {
    hugThoughtText.textContent = HUG_THOUGHT_FULL_TEXT.slice(0, i);
    i++;
    if (i <= HUG_THOUGHT_FULL_TEXT.length) {
      hugTypewriterTimer = setTimeout(tick, HUG_TYPEWRITER_CHAR_DELAY);
    }
  };
  tick();
}

function playHug() {
  hugEl.classList.remove("play");
  void hugEl.offsetWidth; // force reflow so the animation restarts cleanly
  clearTimeout(hugTypewriterTimer);
  hugThoughtText.textContent = "";
  hugEl.classList.add("play");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    hugThoughtText.textContent = HUG_THOUGHT_FULL_TEXT;
  } else {
    hugTypewriterTimer = setTimeout(typeHugThought, HUG_TYPEWRITER_START);
  }
}

function updateSubTransform() {
  vgroupEl.style.transform = `translateY(-${currentSub * 100}dvh)`;
  updateInert();
  if (currentSub === 1) playHammertime();
  if (currentSub === HUG_SUB_INDEX) {
    playHug();
    // No auto-advance here on purpose — the user scrolls forward themselves
    // once they're ready. This lock just keeps them from skipping the
    // moment before it's had a chance to play out.
    hugLockUntil = Date.now() + HUG_DURATION;
  }
}

function lockAnimating() {
  isAnimating = true;
  setTimeout(() => {
    isAnimating = false;
  }, 750);
}

function enterBubbleGroup(direction) {
  currentSub = direction === "backward" ? subPanels.length - 1 : 0;
  updateSubTransform();
  resetBubbleGroup();
}

function goToPanel(index, direction) {
  const clamped = Math.max(0, Math.min(panels.length - 1, index));
  if (clamped === currentPanel) return;
  lockAnimating();
  currentPanel = clamped;
  panelsEl.style.transform = `translateX(-${currentPanel * 100}dvw)`;
  updateDots();
  if (currentPanel === 0) replayHero();
  if (currentPanel === BUBBLE_GROUP_INDEX) enterBubbleGroup(direction);
  updateInert();
}

function step(direction) {
  if (isAnimating) return;
  if (currentPanel === BUBBLE_GROUP_INDEX) {
    if (direction > 0 && currentSub === HUG_SUB_INDEX && Date.now() < hugLockUntil) {
      return;
    }
    if (direction > 0 && currentSub < subPanels.length - 1) {
      lockAnimating();
      currentSub++;
      updateSubTransform();
      return;
    }
    if (direction < 0 && currentSub > 0) {
      lockAnimating();
      currentSub--;
      updateSubTransform();
      return;
    }
    goToPanel(currentPanel + direction, direction > 0 ? "forward" : "backward");
    return;
  }
  goToPanel(currentPanel + direction, direction > 0 ? "forward" : "backward");
}

let wheelCooldown = false;
window.addEventListener(
  "wheel",
  (e) => {
    if (isEditableTarget(document.activeElement)) return;
    e.preventDefault();
    if (isAnimating || wheelCooldown) return;
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 12) return;
    wheelCooldown = true;
    setTimeout(() => {
      wheelCooldown = false;
    }, 60);
    step(delta > 0 ? 1 : -1);
  },
  { passive: false }
);

window.addEventListener("keydown", (e) => {
  if (isEditableTarget(e.target)) return;
  if (["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)) {
    e.preventDefault();
    step(1);
  }
  if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
    e.preventDefault();
    step(-1);
  }
});

let touchStartY = null;
window.addEventListener(
  "touchstart",
  (e) => {
    // Tapping a bubble/bug/dot is a deliberate interaction, not a page
    // swipe — don't let it also count as scroll-navigation input.
    if (isEditableTarget(document.activeElement) || e.target.closest("button")) {
      touchStartY = null;
      return;
    }
    touchStartY = e.touches[0].clientY;
  },
  { passive: true }
);
window.addEventListener(
  "touchend",
  (e) => {
    if (touchStartY === null) return;
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) step(dy > 0 ? 1 : -1);
    touchStartY = null;
  },
  { passive: true }
);

updateDots();
updateSubTransform();
replayHero();

// --- Write it out ---
const writeInput = document.getElementById("write-input");
const writeReveal = document.getElementById("write-reveal");
const writeSubmit = document.getElementById("write-submit");
const writeForm = document.getElementById("write-form");

function resetWriteout() {
  writeInput.value = "";
  writeInput.classList.remove("clearing", "has-text");
  writeInput.disabled = false;
  writeSubmit.disabled = true;
  writeForm.hidden = false;
  writeForm.style.display = "";
  writeForm.classList.remove("fading-out");
  writeReveal.hidden = true;
  writeReveal.classList.remove("show");
}

writeInput.addEventListener("input", () => {
  const hasText = writeInput.value.trim().length > 0;
  writeInput.classList.toggle("has-text", hasText);
  writeSubmit.disabled = !hasText;
});

function submitWriteout() {
  if (!writeInput.value.trim() || writeInput.disabled) return;

  writeInput.disabled = true;
  writeSubmit.disabled = true;
  writeInput.classList.add("clearing");

  setTimeout(() => {
    writeInput.value = "";
    writeInput.classList.remove("has-text");
    writeForm.classList.add("fading-out");

    setTimeout(() => {
      writeForm.hidden = true;
      writeForm.style.display = "none";
      writeReveal.hidden = false;
      requestAnimationFrame(() => writeReveal.classList.add("show"));
    }, 400);
  }, 400);
}

writeInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  submitWriteout();
});

writeSubmit.addEventListener("click", submitWriteout);

// --- Bubbles ---
const BUBBLE_COLORS = ["#ff5d73", "#ff9a76", "#ffcf7a", "#ff8fab", "#6f8fa8", "#8fd0a0"];
const bubbleField = document.getElementById("bubble-field");
const bubblePrompt = document.getElementById("bubble-prompt");
const bubbleResult = document.getElementById("bubble-result");
const bugPreview = document.getElementById("bug-preview");
const BUBBLE_COUNT = 9;
let poppedCount = 0;

const BUBBLE_POSITIONS = [
  { top: "16%", left: "6%" },
  { top: "12%", left: "58%" },
  { top: "38%", left: "0%" },
  { top: "36%", left: "68%" },
  { top: "60%", left: "18%" },
  { top: "56%", left: "56%" },
  { top: "76%", left: "38%" },
  { top: "28%", left: "34%" },
  { top: "68%", left: "2%" },
];

function spawnBurst(bubble) {
  const rect = bubble.getBoundingClientRect();
  const fieldRect = bubbleField.getBoundingClientRect();
  const size = rect.width * 1.4;
  const burst = document.createElement("span");
  burst.className = "bubble-burst";
  burst.style.width = `${size}px`;
  burst.style.height = `${size}px`;
  burst.style.left = `${rect.left - fieldRect.left + rect.width / 2}px`;
  burst.style.top = `${rect.top - fieldRect.top + rect.height / 2}px`;
  bubbleField.appendChild(burst);
  setTimeout(() => burst.remove(), 550);
}

function makeBubbles() {
  bubbleField.innerHTML = "";
  poppedCount = 0;
  bubblePrompt.style.display = "";
  bubbleResult.hidden = true;
  bugPreview.classList.remove("crawl-in");

  const positions = shuffle(BUBBLE_POSITIONS);

  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const bubble = document.createElement("button");
    const size = 38 + Math.round(Math.random() * 34);
    bubble.className = "bubble";
    bubble.setAttribute("aria-label", "Pop");
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.background = `radial-gradient(circle at 35% 30%, #fff9, ${BUBBLE_COLORS[i % BUBBLE_COLORS.length]})`;
    bubble.style.top = positions[i].top;
    bubble.style.left = positions[i].left;
    bubble.style.animationDelay = `${i * 0.1}s, ${i * 0.25}s`;
    bubble.style.setProperty("--float-dur", `${rand(2.4, 3.6)}s`);
    bubble.style.setProperty("--dx1", `${rand(10, 26)}px`);
    bubble.style.setProperty("--dy1", `${rand(-30, -16)}px`);
    bubble.style.setProperty("--rot1", `${rand(4, 12)}deg`);
    bubble.style.setProperty("--dx2", `${rand(-26, -10)}px`);
    bubble.style.setProperty("--dy2", `${rand(-36, -20)}px`);
    bubble.style.setProperty("--rot2", `${rand(-12, -4)}deg`);
    bubble.style.setProperty("--dx3", `${rand(8, 22)}px`);
    bubble.style.setProperty("--dy3", `${rand(-16, -4)}px`);
    bubble.style.setProperty("--rot3", `${rand(2, 9)}deg`);

    bubble.addEventListener("click", () => {
      if (bubble.classList.contains("popped")) return;
      spawnBurst(bubble);
      bubble.classList.add("popped");
      poppedCount++;
      if (poppedCount === BUBBLE_COUNT) {
        setTimeout(() => {
          bubblePrompt.style.display = "none";
          bubbleResult.hidden = false;
          setTimeout(() => {
            bugPreview.classList.add("crawl-in");
          }, 2000);
        }, 300);
      }
    });

    bubbleField.appendChild(bubble);
  }
}

// --- Hammer time ---
const bugField = document.getElementById("bug-field");
const bigHammerEl = document.getElementById("hammer-svg");
const BUG_COUNT = 6;
let smashedCount = 0;

const BUG_TOPS = ["6%", "18%", "32%", "48%", "62%", "76%"];
const FANTASY_COLORS = ["#ff9a76", "#8fd0a0", "#8fc7e8", "#ffcf7a", "#ff8fab", "#c9a0ff"];

function bugSvg(color) {
  return `<svg viewBox="0 0 40 60">
    <path class="bug-pants" d="M11,32 C4,34 2,44 8,48 C10,50 14,49 15,46 L17,34 L23,34 L25,46 C26,49 30,50 32,48 C38,44 36,34 29,32 Z" />
    <ellipse class="bug-foot" cx="8" cy="55" rx="4" ry="2.4" />
    <ellipse class="bug-foot" cx="31" cy="55" rx="4" ry="2.4" />
    <path class="bug-shirt" d="M13,16 L27,16 L29,32 L11,32 Z" fill="${color}" />
    <line class="bug-arm" x1="13" y1="18" x2="8" y2="29" />
    <line class="bug-arm" x1="27" y1="18" x2="35" y2="6" />
    <circle class="bug-hand" cx="35" cy="6" r="2.2" />
    <circle class="bug-head" cx="20" cy="9" r="6.4" />
    <rect class="bug-glasses" x="14.5" y="7" width="11" height="3" rx="1.4" />
  </svg>`;
}

function spawnHammer(bug) {
  const rect = bug.getBoundingClientRect();
  const fieldRect = bugField.getBoundingClientRect();
  const hammer = document.createElement("div");
  hammer.className = "hammer-swing";
  hammer.innerHTML = `<svg viewBox="0 0 120 150">
    <line class="hammer-handle" x1="60" y1="145" x2="60" y2="72" />
    <rect class="hammer-head" x="20" y="30" width="80" height="48" rx="10" />
  </svg>`;
  hammer.style.left = `${rect.left - fieldRect.left + rect.width / 2}px`;
  hammer.style.top = `${rect.top - fieldRect.top + rect.height / 2}px`;
  bugField.appendChild(hammer);
  setTimeout(() => hammer.remove(), 480);
}

function fallHammerAndAdvance() {
  bigHammerEl.classList.add("fall-through");
  setTimeout(() => {
    step(1);
  }, 350);
}

function makeBugs() {
  bugField.innerHTML = "";
  smashedCount = 0;
  bigHammerEl.classList.remove("fall-through");

  const tops = shuffle(BUG_TOPS);

  for (let i = 0; i < BUG_COUNT; i++) {
    const bug = document.createElement("button");
    bug.className = "bug";
    bug.setAttribute("aria-label", "Hammer it");
    bug.innerHTML = bugSvg(FANTASY_COLORS[i % FANTASY_COLORS.length]);
    bug.style.top = tops[i];
    const leftPercent = rand(15, 50);
    bug.style.left = `${leftPercent}%`;
    const dur = rand(28, 40);
    bug.style.setProperty("--fly-dur", `${dur}s`);
    bug.style.setProperty("--fly-delay", `${-rand(0, dur)}s`);
    bug.style.setProperty("--lane-y", `${rand(-15, 15)}px`);
    // Keep the whole flight path inside the viewport — travel is measured
    // from this bug's own starting position, staying within an 8vw margin
    // on each side, so it never disappears off the edge of the frame.
    const EDGE_MARGIN = 8;
    bug.style.setProperty("--edge-left", `${-(leftPercent - EDGE_MARGIN)}vw`);
    bug.style.setProperty("--edge-right", `${100 - EDGE_MARGIN - leftPercent}vw`);

    bug.addEventListener("click", () => {
      if (bug.classList.contains("squished")) return;
      // Freeze the bug's current mid-flight position before swapping its
      // animation to the squish — otherwise translate/rotate fall back to
      // the base (starting-edge) value and it visibly jumps there first.
      const flightStyle = getComputedStyle(bug);
      bug.style.translate = flightStyle.translate;
      bug.style.rotate = flightStyle.rotate;
      spawnHammer(bug);
      bug.classList.add("squished");
      smashedCount++;
      if (smashedCount === BUG_COUNT) {
        setTimeout(fallHammerAndAdvance, 500);
      }
    });

    bugField.appendChild(bug);
  }
}

function resetBubbleGroup() {
  makeBubbles();
  makeBugs();
  resetWriteout();
}

makeBubbles();
makeBugs();

// --- PWA service worker (best-effort, ignored if it fails) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
