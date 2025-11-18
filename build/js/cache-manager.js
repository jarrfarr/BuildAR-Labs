// cache-manager.js
async function cachePageAssets() {
  if (!('serviceWorker' in navigator)) return;

  const urlsToCache = [
    '../pages/siga-majvest_200.html',
    '../assets/models/wall.glb',
    '../assets/models/model.glb',
    '../assets/videos/sample.mp4',
    '../assets/pdfs/siga-majvest_200-system_guidlines.pdf',
    '../css/style.css',
    '../js/main.js'
  ];

  const reg = await navigator.serviceWorker.ready;
  const channel = new MessageChannel();

  return new Promise((resolve, reject) => {
    channel.port1.onmessage = event => {
      if (event.data.success) resolve(event.data.result);
      else reject(event.data.error);
    };
    reg.active.postMessage({ type: 'CACHE_URLS', urls: urlsToCache }, [channel.port2]);
  });
}

// Hook up “Download for Offline” button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.cache-page-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Downloading...';
      try {
        await cachePageAssets();
        btn.querySelector('span').textContent = 'Downloaded ✔';
      } catch (err) {
        alert('Failed to cache assets: ' + err);
        btn.querySelector('span').textContent = 'Retry Download';
      } finally {
        btn.disabled = false;
      }
    });
  }
});
