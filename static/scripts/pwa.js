// PWA Service Worker Registration with Offline Indicator
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });

  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, url, version } = event.data;
    
    switch (type) {
      case 'SW_ACTIVATED':
        console.log('Service Worker activated:', version);
        break;
      case 'DATA_FRESH':
        hideOfflineIndicator();
        break;
      case 'DATA_STALE':
        showOfflineIndicator('Using cached data - you may be offline');
        break;
      case 'OFFLINE':
        showOfflineIndicator('You are offline - some features may not work');
        break;
      case 'DATA_UPDATED':
        // Data was updated in background, optionally refresh UI
        console.log('Fresh data available:', url);
        break;
      case 'STALE_DATA':
        showOfflineIndicator('Showing older data - connection issues detected');
        break;
      case 'FALLBACK_TO_CACHE':
        showOfflineIndicator('Loading from cache - check your connection');
        break;
    }
  });
}

// Offline indicator functions
let offlineIndicator = null;

function showOfflineIndicator(message = 'You are offline') {
  if (!offlineIndicator) {
    offlineIndicator = document.createElement('div');
    offlineIndicator.id = 'offline-indicator';
    offlineIndicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #f39c12, #e74c3c);
      color: white;
      padding: 8px 16px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      transform: translateY(-100%);
      transition: transform 0.3s ease;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(offlineIndicator);
  }
  
  offlineIndicator.innerHTML = `
    <i class="fas fa-exclamation-triangle me-2"></i>
    ${message}
    <button onclick="hideOfflineIndicator()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer;">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Show indicator
  setTimeout(() => {
    offlineIndicator.style.transform = 'translateY(0)';
  }, 100);
  
  // Auto-hide after 5 seconds for non-offline messages
  if (!message.includes('offline')) {
    setTimeout(hideOfflineIndicator, 5000);
  }
}

function hideOfflineIndicator() {
  if (offlineIndicator) {
    offlineIndicator.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      if (offlineIndicator && offlineIndicator.parentNode) {
        offlineIndicator.parentNode.removeChild(offlineIndicator);
        offlineIndicator = null;
      }
    }, 300);
  }
}

// Update notification for service worker updates
function showUpdateNotification() {
  const updateNotification = document.createElement('div');
  updateNotification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #4299e1, #9f7aea);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    z-index: 9999;
    max-width: 300px;
    animation: slideInFromRight 0.3s ease;
  `;
  
  updateNotification.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 8px;">
      <i class="fas fa-sync-alt me-2"></i>
      <strong>App Updated!</strong>
    </div>
    <p style="margin: 0 0 12px 0; font-size: 14px;">A new version is available.</p>
    <div style="display: flex; gap: 8px;">
      <button onclick="refreshApp()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
        Refresh
      </button>
      <button onclick="this.parentElement.parentElement.remove()" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
        Later
      </button>
    </div>
  `;
  
  document.body.appendChild(updateNotification);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (updateNotification.parentNode) {
      updateNotification.remove();
    }
  }, 10000);
}

function refreshApp() {
  window.location.reload();
}

// Online/Offline event listeners
window.addEventListener('online', () => {
  console.log('Back online');
  hideOfflineIndicator();
  // Optionally refresh data
  if (typeof refreshDashboard === 'function') {
    setTimeout(refreshDashboard, 1000);
  }
});

window.addEventListener('offline', () => {
  console.log('Gone offline');
  showOfflineIndicator('You are offline - some features may not work');
});

// Add CSS animation
if (!document.getElementById('pwa-styles')) {
  const style = document.createElement('style');
  style.id = 'pwa-styles';
  style.textContent = `
    @keyframes slideInFromRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// Make functions globally available
window.hideOfflineIndicator = hideOfflineIndicator;
window.refreshApp = refreshApp;
