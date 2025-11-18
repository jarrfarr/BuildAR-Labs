// Theme toggle (reuses system from main.js)
const themeBtn = document.getElementById('theme-toggle');
themeBtn.textContent = document.body.classList.contains('dark')
  ? 'Switch to Light'
  : 'Switch to Dark';

themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeBtn.textContent = isDark ? 'Switch to Light' : 'Switch to Dark';
});

// Auto-cache toggle
const cacheToggle = document.getElementById('auto-cache');
const autoCacheEnabled = localStorage.getItem('autoCache') === 'true';

cacheToggle.checked = autoCacheEnabled;

cacheToggle.addEventListener('change', () => {
  const enabled = cacheToggle.checked;
  localStorage.setItem('autoCache', enabled);
  alert(`Auto Cache is now ${enabled ? 'enabled' : 'disabled'}`);
});
