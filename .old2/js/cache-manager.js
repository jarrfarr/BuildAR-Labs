/**
 * Cache Manager for BuildLab 360
 * Handles manual caching of page-specific assets
 */

async function cachePageAssets(pageId, urls) {
  if (!('serviceWorker' in navigator)) return;

  const reg = await navigator.serviceWorker.ready;
  const channel = new MessageChannel();

  return new Promise((resolve, reject) => {
    channel.port1.onmessage = event => {
      if (event.data.success) resolve(event.data);
      else reject(event.data.error);
    };
    reg.active.postMessage({ type: 'CACHE_PAGE', pageId: pageId, urls: urls }, [channel.port2]);
  });
}

// Hook up "Download for Offline" buttons
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.cache-page-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const pageId = btn.dataset.pageId || detectCurrentPage();
      const urls = getPageAssets(pageId);

      if (!urls || urls.length === 0) {
        alert('No assets defined for this page');
        return;
      }

      btn.disabled = true;
      const originalText = btn.querySelector('span').textContent;
      btn.querySelector('span').textContent = 'Downloading...';

      try {
        const result = await cachePageAssets(pageId, urls);
        btn.querySelector('span').textContent = `Downloaded ✓ (${result.cached.length}/${urls.length})`;
        btn.classList.add('cached');

        // Show success notification
        if (typeof showNotification === 'function') {
          showNotification(`Downloaded ${result.cached.length} of ${urls.length} assets`, 'success');
        } else {
          alert(`Downloaded ${result.cached.length} of ${urls.length} assets`);
        }
      } catch (err) {
        if (typeof showNotification === 'function') {
          showNotification('Failed to cache assets: ' + err, 'error');
        } else {
          alert('Failed to cache assets: ' + err);
        }
        btn.querySelector('span').textContent = 'Retry Download';
      } finally {
        btn.disabled = false;
        setTimeout(() => {
          btn.classList.remove('cached');
          btn.querySelector('span').textContent = originalText;
        }, 2000);
      }
    });
  });
});

// Detect current page ID from URL
function detectCurrentPage() {
  const path = window.location.pathname;
  if (path.includes('siga.html')) return 'siga';
  if (path.includes('install.html')) return 'install';
  return null;
}

// Define assets for each page
function getPageAssets(pageId) {
  const assetDefinitions = {
    siga: [
      '../assets/models/wall.glb',
      '../assets/models/model.glb',
      '../assets/videos/sample.mp4',
      '../assets/pdfs/siga-majvest_200-system_guidlines.pdf'
    ],
    install: [
      '../assets/models/wall.glb',
      '../assets/models/model.glb',
      '../assets/videos/sample.mp4',
      '../assets/pdfs/siga-majvest_200-system_guidlines.pdf'
    ]
  };

  return assetDefinitions[pageId] || [];
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `<span>${message}</span>`;

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
