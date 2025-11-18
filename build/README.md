# BuildLab 360 - Offline-First PWA

A modern, responsive Progressive Web App (PWA) designed for offline access to building construction guides, specifications, and resources. Built with manual caching controls that allow users to selectively download pages for offline viewing.

## Features

### 🚀 Progressive Web App
- **Installable**: Install as a standalone app on desktop and mobile devices
- **Offline-First**: Core functionality works without internet connection
- **Responsive**: Adapts seamlessly to all screen sizes
- **Fast Loading**: Optimized caching strategies for instant page loads

### 📥 Manual Offline Caching
- **Selective Downloads**: Choose which pages to cache for offline access
- **Visual Feedback**: Clear indicators showing cached status
- **Resource Bundling**: Automatically caches all page dependencies (CSS, JS, images, PDFs, videos, 3D models)
- **Cache Management**: Easy removal of cached content when needed

### 🎨 Modern UI/UX
- **Dark/Light Themes**: System-aware theme with manual toggle
- **Smooth Animations**: Polished transitions and micro-interactions
- **Notification System**: Toast notifications for user feedback
- **Online/Offline Indicators**: Real-time connection status display

### 📱 Rich Media Support
- **3D Models**: Interactive model viewing with model-viewer
- **PDF Documents**: Embedded PDF viewing with auto-sizing
- **Video Content**: Native HTML5 video playback
- **Responsive Images**: Optimized image delivery

## Getting Started

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd buildlab-360/build
   ```

2. **Serve with a local web server**
   
   The app requires HTTPS or localhost to enable service workers. Choose any method:

   **Option A: Python**
   ```bash
   # Python 3
   python -m http.server 8000
   ```

   **Option B: Node.js (http-server)**
   ```bash
   npx http-server -p 8000
   ```

   **Option C: VS Code Live Server**
   - Install "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

3. **Open in browser**
   ```
   http://localhost:8000
   ```

### Installing as PWA

1. Open the app in Chrome, Edge, or Safari
2. Look for the install prompt in the address bar
3. Click "Install" to add to your device
4. Launch from your app drawer or desktop

## Usage Guide

### Downloading Pages for Offline Access

1. **Navigate to any page** you want to access offline
2. **Click the "Download for Offline" button** at the top of the page
3. **Wait for confirmation** - you'll see "Cached X resources" notification
4. **Button changes** to "Cached Offline" with checkmark icon
5. **Access offline** - the page and all its resources are now available offline

### Managing Cached Content

**To Remove Cached Pages:**
1. Click the "Cached Offline" button on any cached page
2. Confirm removal
3. Content is removed from offline storage

**To View Cache Status:**
- Green checkmark = Page is cached
- Blue download icon = Page not cached
- Status indicator shows "Online" or "Offline"

### Offline Mode

When offline:
- **Orange banner** appears at the top: "⚠️ You're offline - viewing cached content"
- **Status indicator** shows red dot with "Offline" text
- **Only cached pages** and resources are accessible
- **External links** (CDN resources) may not load unless previously cached

## Technical Details

### Architecture

```
build/
├── index.html              # Main entry point
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline functionality
├── css/
│   ├── style.css          # Main styles
│   ├── cache-ui.css       # Cache UI components
│   └── ...
├── js/
│   ├── main.js            # Core application logic
│   ├── cache-manager.js   # Manual caching system
│   └── ...
├── pages/
│   └── *.html             # Content pages
└── assets/
    ├── models/            # 3D model files
    ├── pdfs/              # PDF documents
    ├── videos/            # Video files
    └── fonts/             # Web fonts
```

### Service Worker Strategy

**Core Files (Always Cached on Install):**
- index.html
- Essential CSS files
- Core JavaScript
- App icon
- Manifest

**Runtime Caching:**
- Automatically caches CSS, JS, fonts, and images on first request
- Manual caching system for full page bundles

**Cache-First Strategy:**
1. Check cache first
2. If not in cache, fetch from network
3. Cache successful responses
4. Fallback to index.html for navigation requests when offline

### Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Required Features:**
- Service Workers
- Cache API
- Promises
- Fetch API
- ES6 Modules

## Development

### File Structure

**Key Files:**
- `service-worker.js` - Handles caching and offline functionality
- `js/cache-manager.js` - Manual cache management and UI controls
- `js/main.js` - Service worker registration and app initialization
- `css/cache-ui.css` - Styling for cache controls and notifications

### Adding New Pages

1. **Create HTML file** in `/pages/` directory
2. **Include required scripts and styles:**
   ```html
   <link rel="stylesheet" href="../css/style.css" />
   <link rel="stylesheet" href="../css/cache-ui.css" />
   <script defer src="../js/cache-manager.js"></script>
   <script defer src="../js/main.js"></script>
   ```

3. **Add cache button** to page header:
   ```html
   <div class="page-header-actions">
     <button class="cache-page-btn" data-page-url="../pages/your-page.html">
       <!-- SVG icon -->
       <span>Download for Offline</span>
     </button>
   </div>
   ```

4. **Page auto-discovers resources** - the cache manager will automatically find:
   - Stylesheets
   - JavaScript files
   - Images
   - Videos
   - PDFs
   - 3D models

### Customization

**Change Theme Colors:**
Edit CSS variables in `css/theme-light.css` and `css/theme-dark.css`

**Modify Cache Strategy:**
Edit `service-worker.js` to change caching behavior

**Update App Manifest:**
Edit `manifest.json` for app name, colors, icons, etc.

## Best Practices

### For Content Authors

1. **Optimize Media:**
   - Compress images before adding
   - Use appropriate video formats and resolutions
   - Keep PDF file sizes reasonable

2. **Structure Content:**
   - Break large guides into multiple pages
   - Use clear section headings
   - Link related content

3. **Test Offline:**
   - Cache your page and test in offline mode
   - Verify all resources load correctly
   - Check for broken external links

### For Users

1. **Cache Strategically:**
   - Cache pages you need most frequently
   - Remove old cached content periodically
   - Monitor storage usage

2. **Update Regularly:**
   - Re-cache pages to get latest updates
   - Clear cache if content seems outdated

3. **Check Status:**
   - Use online/offline indicator
   - Look for cache status on buttons

## Troubleshooting

### Service Worker Not Registering

**Solution:**
- Ensure you're using HTTPS or localhost
- Check browser console for errors
- Try hard refresh (Ctrl+Shift+R)

### Cached Content Not Loading Offline

**Possible Causes:**
1. External CDN resources (model-viewer, PDF.js)
2. Resources not fully cached
3. Cache cleared by browser

**Solutions:**
- Re-cache the page
- Check browser storage settings
- Ensure you clicked "Download for Offline"

### Cache Taking Too Much Space

**Solution:**
- Remove unused cached pages
- Clear browser cache
- Check available storage in browser settings

### App Not Installing

**Requirements:**
- Valid manifest.json
- HTTPS or localhost
- Service worker registered
- Meet browser-specific PWA criteria

## Performance Tips

1. **Initial Load:**
   - Core files cached on first visit
   - Subsequent loads are instant

2. **Media Loading:**
   - Videos and 3D models load on demand
   - PDFs are embedded but cached separately

3. **Cache Size:**
   - Typical page: 1-5 MB
   - With video: 10-50 MB
   - Monitor in browser DevTools → Application → Storage

## Security

- All resources served over current origin
- External CDN resources loaded on-demand
- No sensitive data stored in cache
- Service worker scoped to current directory

## License

[Your License Here]

## Support

For issues or questions:
1. Check browser console for errors
2. Verify service worker is registered
3. Test in multiple browsers
4. Clear cache and retry

---

Built with ❤️ for offline-first construction documentation
