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
        console.log("Service Worker registered:", reg.scope);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available, show update notification
              showUpdateNotification(reg);
            }
          });
        });

        // Check for updates periodically
        setInterval(() => {
          reg.update().catch(err => console.warn('SW update check failed:', err));
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}

// ======================
// Service Worker Update Notification
// ======================
function showUpdateNotification(registration) {
  const updateToast = document.createElement('div');
  updateToast.id = 'sw-update-toast';
  updateToast.innerHTML = `
    <div style="
      position: fixed;
      top: 10px;
      right: 10px;
      background: var(--accent);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      cursor: pointer;
      max-width: 300px;
    ">
      <p style="margin: 0 0 10px 0; font-weight: bold;">App Updated!</p>
      <p style="margin: 0 0 15px 0; font-size: 14px;">A new version is available. Click to reload.</p>
      <button id="update-now" style="
        background: white;
        color: var(--accent);
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">Update Now</button>
      <button id="update-later" style="
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 8px;
      ">Later</button>
    </div>
  `;

  document.body.appendChild(updateToast);

  document.getElementById('update-now').addEventListener('click', () => {
    registration.waiting.postMessage({ action: 'skipWaiting' });
    window.location.reload();
  });

  document.getElementById('update-later').addEventListener('click', () => {
    updateToast.remove();
  });

// Auto-remove after 10 seconds
  setTimeout(() => {
    if (updateToast.parentNode) {
      updateToast.remove();
    }
  }, 10000);
}

// ======================
// Manual Page Caching Support
// ======================
async function cachePageAssets() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported");
    return;
  }

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
    const channel = new MessageChannel();

    return new Promise((resolve, reject) => {
      channel.port1.onmessage = (event) => {
        const data = event.data;
        if (data.success) {
          resolve(data);
        } else {
          reject(new Error(data.error || "Caching failed"));
        }
      };

      const target = swReg.active;
      if (target) {
        target.postMessage({ type: "CACHE_URLS", urls: urlsToCache }, [channel.port2]);
      } else {
        reject(new Error("No active service worker"));
      }
    });
  } catch (err) {
    console.error("Cache operation failed:", err);
    throw err;
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
  const downloadsManager = document.getElementById("downloads-manager");

  // Downloads Manager - show per-page caches
  async function updateDownloadsManager(cacheInfo) {
    if (!downloadsManager) return;

    const pageCaches = [
      { name: 'Majvest 200 (Siga)', cacheName: 'buildlab-page-siga', pageId: 'siga', href: 'siga.html' },
      { name: 'Majvest 200 (Install)', cacheName: 'buildlab-page-install', pageId: 'install', href: 'install.html' }
    ];

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';

    for (const page of pageCaches) {
      const cacheData = cacheInfo[page.cacheName];
      const hasCache = cacheData && cacheData.entries > 0;
      const size = hasCache ? formatBytes(cacheData.estimatedSize) : 'Not cached';

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #ccc; border-radius: 8px;">
          <div>
            <strong>${page.name}</strong>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">${size} • ${hasCache ? cacheData.entries + ' files' : '0 files'}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="${page.href}" class="btn-primary" style="padding: 8px 12px; font-size: 12px;">View</a>
            <button class="btn-secondary purge-btn" data-cache="${page.cacheName}" ${!hasCache ? 'disabled' : ''} style="padding: 8px 12px; font-size: 12px; ${!hasCache ? 'opacity: 0.5;' : ''}">Purge</button>
          </div>
        </div>
      `;
    }

    html += '</div>';
    downloadsManager.innerHTML = html;

    // Add purge button listeners
    document.querySelectorAll('.purge-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cacheName = btn.dataset.cache;
        if (!confirm(`Purge cached assets for this page?`)) return;

        try {
          const swReg = await navigator.serviceWorker.ready;
          const channel = new MessageChannel();

          await new Promise((resolve, reject) => {
            channel.port1.onmessage = (event) => {
              const data = event.data;
              if (data.success) {
                resolve();
              } else {
                reject(new Error(data.error));
              }
            };

            swReg.active.postMessage({ type: "CLEAR_CACHE", cacheName: cacheName }, [channel.port2]);
            setTimeout(() => reject(new Error("Timeout")), 5000);
          });

          alert("Page cache purged successfully");
          await refresh();
        } catch (err) {
          alert("Failed to purge cache: " + err.message);
        }
      });
    });
  }

  if (!sizeEl && !downloadsManager) return;

  async function refresh() {
    if (!('serviceWorker' in navigator)) {
      if (sizeEl) sizeEl.textContent = "Service Worker not supported";
      if (downloadsManager) downloadsManager.innerHTML = "<p>Service Worker not supported</p>";
      return;
    }

    if (sizeEl) sizeEl.textContent = "calculating...";
    if (downloadsManager) downloadsManager.innerHTML = "<p>Loading cache information...</p>";

    try {
      const swReg = await navigator.serviceWorker.ready;
      const channel = new MessageChannel();

      const result = await new Promise((resolve, reject) => {
        channel.port1.onmessage = (event) => {
          const data = event.data;
          if (data.success) {
            resolve(data.cacheInfo);
          } else {
            reject(new Error(data.error));
          }
        };

        swReg.active.postMessage({ type: "GET_CACHE_INFO" }, [channel.port2]);

        // Timeout after 5 seconds
        setTimeout(() => reject(new Error("Timeout")), 5000);
      });

      let totalSize = 0;
      let totalEntries = 0;
      for (const [cacheName, cacheData] of Object.entries(result)) {
        totalSize += cacheData.estimatedSize;
        totalEntries += cacheData.entries;
      }

      if (sizeEl) sizeEl.textContent = `${formatBytes(totalSize)} (${totalEntries} files)`;
      if (downloadsManager) updateDownloadsManager(result);
    } catch (err) {
      console.warn("Failed to get cache info:", err);
      if (sizeEl) sizeEl.textContent = "unknown";
      if (downloadsManager) downloadsManager.innerHTML = "<p>Failed to load cache information</p>";
    }
  }

  if (refreshBtn) refreshBtn.addEventListener("click", refresh);
  if (clearBtn)
    clearBtn.addEventListener("click", async () => {
      if (!confirm("Clear ALL cached files? This includes auto-cached app files.")) return;
      if (!('serviceWorker' in navigator)) return;

      try {
        const swReg = await navigator.serviceWorker.ready;
        const channel = new MessageChannel();

        await new Promise((resolve, reject) => {
          channel.port1.onmessage = (event) => {
            const data = event.data;
            if (data.success) {
              resolve();
            } else {
              reject(new Error(data.error));
            }
          };

          swReg.active.postMessage({ type: "CLEAR_CACHE" }, [channel.port2]);

          // Timeout after 10 seconds
          setTimeout(() => reject(new Error("Timeout")), 10000);
        });

        alert("All cache cleared successfully");
        await refresh();
      } catch (err) {
        alert("Failed to clear cache: " + err.message);
      }
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

// ======================
// Page header pin (halfway) behavior
// ======================
function initHeaderPin() {
  const header = document.querySelector("header");
  const pageHeader = document.querySelector(".page-header");
  if (!header || !pageHeader) return;

  function setPinVar() {
    const rect = header.getBoundingClientRect();
    // Use half the header's height as the sticky top offset
    const half = Math.round(rect.height / 2);
    document.documentElement.style.setProperty("--header-pin-half", half + "px");
  }

  // Update small class when the element becomes sticky
  function onScroll() {
    const pinTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-pin-half")) || 44;
    const phRect = pageHeader.getBoundingClientRect();
    // If the top of the pageHeader is at or <= the pinTop, it's stuck
    if (phRect.top <= pinTop) pageHeader.classList.add("stuck");
    else pageHeader.classList.remove("stuck");
  }

  // Keep the var up to date on load/resize; use ResizeObserver if available
  setPinVar();
  window.addEventListener("resize", setPinVar);
  window.addEventListener("scroll", onScroll, { passive: true });

  if (window.ResizeObserver) {
    try {
      const ro = new ResizeObserver(setPinVar);
      ro.observe(header);
    } catch (e) {
      // ignore
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeaderPin);
} else initHeaderPin();
