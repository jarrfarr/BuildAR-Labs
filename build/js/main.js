// ======================
// Service Worker Registration
// ======================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Determine correct path based on current location
    const swPath = window.location.pathname.includes("/pages/")
      ? "../service-worker.js"
      : "./service-worker.js";

    navigator.serviceWorker
      .register(swPath)
      .then((reg) => {
        console.log("Service Worker registered:", reg);
        if (window.cacheManager) {
          window.cacheManager.registration = reg;
        }
      })
      .catch((err) => console.error("Service Worker failed:", err));
  });
}

// ======================
// Manual Page Caching Support
// ======================
async function cachePageAssets() {
  if (!("serviceWorker" in navigator)) return;
  const urlsToCache = [
    window.location.href,
    "../css/style.css",
    "../js/main.js",
    "../assets/models/wall.glb",
    "../assets/models/model.glb",
    "../assets/videos/sample.mp4",
    "../assets/pdfs/siga-majvest_200-system_guidlines.pdf",
  ];
  try {
    const swReg = await navigator.serviceWorker.ready;
    const messageChannel = new MessageChannel();
    return new Promise((resolve, reject) => {
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) resolve(event.data.result);
        else reject(event.data.error);
      };
      swReg.active.postMessage(
        { type: "CACHE_URLS", urls: urlsToCache },
        [messageChannel.port2]
      );
    });
  } catch (err) {
    console.error("Cache operation failed:", err);
  }
}

// Add listener for "Download for Offline" button
document.addEventListener("DOMContentLoaded", () => {
  const cacheBtn = document.querySelector(".cache-page-btn");
  if (cacheBtn) {
    cacheBtn.addEventListener("click", async () => {
      cacheBtn.disabled = true;
      cacheBtn.textContent = "Caching...";
      try {
        await cachePageAssets();
        alert("✅ This page and its assets are now available offline!");
      } catch (err) {
        alert("⚠️ Failed to cache page assets. Check console for details.");
      } finally {
        cacheBtn.disabled = false;
        cacheBtn.textContent = "📥 Download for Offline";
      }
    });
  }
});

// ======================
// Theme initialization and toggle
// ======================
function applyStoredTheme() {
  const stored = localStorage.getItem("theme");
  const theme = stored === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
}
applyStoredTheme();

function wireThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;
  themeToggle.checked = localStorage.getItem("theme") === "dark";
  themeToggle.addEventListener("change", () => {
    const newTheme = themeToggle.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wireThemeToggle);
} else {
  wireThemeToggle();
}

// ======================
// Auto cache toggle
// ======================
const cacheToggle = document.getElementById("cache-toggle");
if (cacheToggle) {
  cacheToggle.checked = localStorage.getItem("autoCache") === "true";
  cacheToggle.addEventListener("change", () => {
    localStorage.setItem("autoCache", cacheToggle.checked);
  });
}

// ======================
// Custom Circular Cursor
// ======================
(function enableCustomCursor() {
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cursor = document.createElement("div");
  cursor.id = "custom-cursor";
  document.body.appendChild(cursor);
  document.documentElement.classList.add("custom-cursor-enabled");

  let isDown = false;

  function move(e) {
    const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    cursor.style.left = x + "px";
    cursor.style.top = y + "px";
  }

  function setDown(down) {
    isDown = !!down;
    if (isDown) {
      cursor.style.transform = "translate(-50%, -50%) scale(1.6)";
      cursor.style.opacity = "0.9";
    } else {
      cursor.style.transform = "translate(-50%, -50%) scale(1)";
      cursor.style.opacity = "1";
    }
  }

  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerdown", () => setDown(true));
  window.addEventListener("pointerup", () => setDown(false));

  window.addEventListener("pointerleave", () => (cursor.style.opacity = "0"));
  window.addEventListener("pointerenter", () => (cursor.style.opacity = "1"));

  document.addEventListener("mouseover", (e) => {
    const t = e.target;
    if (t && (t.tagName === "A" || t.tagName === "BUTTON" || t.closest?.("button,a"))) {
      cursor.style.transform = "translate(-50%, -50%) scale(1.4)";
      cursor.style.background = "white";
      cursor.style.borderColor = "var(--accent)";
    }
  });
  document.addEventListener("mouseout", () => {
    if (!isDown) cursor.style.transform = "translate(-50%, -50%) scale(1)";
    cursor.style.background = "var(--accent)";
    cursor.style.borderColor =
      getComputedStyle(document.documentElement).getPropertyValue("--accent") || "white";
  });
})();

// ======================
// Cache Size Utilities (Preferences Page)
// ======================
async function getCacheSizeBytes(cacheName = "buildlab-cache-v1") {
  if (!("caches" in window)) return null;
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    let total = 0;
    for (const req of requests) {
      try {
        const res = await cache.match(req);
        if (!res) continue;
        const len = res.headers.get("content-length");
        if (len) {
          total += parseInt(len, 10);
          continue;
        }
        const blob = await res.clone().blob();
        total += blob.size || 0;
      } catch (err) {
        console.warn("Error sizing cache entry", req.url, err);
      }
    }
    return total;
  } catch (err) {
    console.warn("Cache size check failed", err);
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes === null) return "unknown";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

async function wireCacheUi() {
  const sizeEl = document.getElementById("cache-size");
  const refreshBtn = document.getElementById("cache-refresh");
  const clearBtn = document.getElementById("cache-clear");
  if (!sizeEl) return;

  async function refresh() {
    sizeEl.textContent = "calculating...";
    const bytes = await getCacheSizeBytes();
    sizeEl.textContent = bytes === null ? "unknown" : formatBytes(bytes);
  }

  if (refreshBtn) refreshBtn.addEventListener("click", refresh);
  if (clearBtn)
    clearBtn.addEventListener("click", async () => {
      if (!confirm("Clear cached files?")) return;
      try {
        await caches.delete("buildlab-cache-v1");
        alert("Cache cleared");
      } catch (err) {
        alert("Failed to clear cache");
      }
      refresh();
    });

  refresh();
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", wireCacheUi);
else wireCacheUi();

// ======================
// FPS Overlay (for model-viewer)
// ======================
function setupFpsOverlays() {
  const fpsToggle = document.getElementById("fps-toggle");
  const fpsEnabled = localStorage.getItem("showFps") === "true";
  if (fpsToggle) fpsToggle.checked = fpsEnabled;

  const viewers = Array.from(document.querySelectorAll(".asset-card model-viewer"));
  const overlays = new Map();

  viewers.forEach((mv) => {
    const assetWrap = mv.closest(".asset-card");
    if (!assetWrap) return;
    let modelWrap =
      mv.parentElement?.classList?.contains("model-wrap") ? mv.parentElement : null;
    if (!modelWrap) {
      modelWrap = document.createElement("div");
      modelWrap.className = "model-wrap";
      mv.parentNode.insertBefore(modelWrap, mv);
      modelWrap.appendChild(mv);
    }
    const overlay = document.createElement("div");
    overlay.className = "fps-overlay";
    overlay.textContent = "FPS —";
    modelWrap.appendChild(overlay);
    overlays.set(mv, { overlay, rafId: null, last: performance.now(), frames: 0, fps: 0 });
  });

  function startLoop(mv, state) {
    function loop(now) {
      state.frames++;
      const dt = now - state.last;
      if (dt >= 500) {
        state.fps = Math.round((state.frames / dt) * 1000);
        state.overlay.textContent = state.fps + " FPS";
        state.frames = 0;
        state.last = now;
      }
      state.rafId = requestAnimationFrame(loop);
    }
    state.rafId = requestAnimationFrame(loop);
  }

  function stopLoop(state) {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  function applyEnabled(enabled) {
    overlays.forEach((state) => {
      state.overlay.style.display = enabled ? "block" : "none";
      if (enabled) {
        state.last = performance.now();
        state.frames = 0;
        startLoop(null, state);
      } else {
        stopLoop(state);
      }
    });
  }

  applyEnabled(fpsEnabled);
  if (fpsToggle) {
    fpsToggle.addEventListener("change", () => {
      const v = fpsToggle.checked;
      localStorage.setItem("showFps", v);
      applyEnabled(v);
    });
  }
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", setupFpsOverlays);
else setupFpsOverlays();

// ======================
// PDF Auto Sizing
// ======================
async function autosizePdfs() {
  if (typeof pdfjsLib === "undefined") return;
  const pdfIframes = Array.from(document.querySelectorAll(".pdf-wrap iframe"));
  if (!pdfIframes.length) return;

  for (const iframe of pdfIframes) {
    const src = iframe.getAttribute("src");
    if (!src) continue;
    try {
      const loadingTask = pdfjsLib.getDocument(src);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const aspect = viewport.width / viewport.height;
      const wrap = iframe.closest(".pdf-wrap");
      if (!wrap) continue;
      const width = wrap.clientWidth || wrap.getBoundingClientRect().width;
      if (width && aspect) {
        wrap.style.height = Math.round(width / aspect) + "px";
      }
    } catch (err) {
      console.warn("PDF autosize failed for", src, err);
    }
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    autosizePdfs();
    window.addEventListener("resize", autosizePdfs);
  });
} else {
  autosizePdfs();
  window.addEventListener("resize", autosizePdfs);
}
