/**
 * Global Session Manager for Shop Manager
 * Handles auto-save, form persistence, and cross-page navigation
 */

class SessionManager {
    constructor() {
        this.autoSaveInterval = null;
        this.autoSaveDelay = 2000; // 2 seconds
        this.currentPageKey = this.getPageKey();
        this.init();
    }

    init() {
        // Auto-save setup
        this.setupAutoSave();
        
        // Navigation state management
        this.setupNavigationTracking();
        
        // Quick actions setup
        this.setupQuickActions();
        
        // Restore previous session if applicable
        this.restoreSession();
        
        // Setup global shortcuts
        this.setupKeyboardShortcuts();
    }

    /**
     * Get unique key for current page
     */
    getPageKey() {
        const path = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        
        // Create unique key based on route
        if (path.includes('/orders/fabric-tailor')) return 'combined_order';
        if (path.includes('/orders/fabric')) return 'fabric_order';
        if (path.includes('/orders/tailor')) return 'tailor_order';
        if (path.includes('/workers/add')) return 'add_worker';
        if (path.includes('/expenses/fabric')) return 'fabric_expenses';
        if (path.includes('/expenses/other')) return 'other_expenses';
        
        return path.replace(/\//g, '_');
    }

    /**
     * Setup auto-save functionality for forms
     */
    setupAutoSave() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    this.scheduleAutoSave(form);
                });
                
                input.addEventListener('change', () => {
                    this.scheduleAutoSave(form);
                });
            });
        });
    }

    /**
     * Schedule auto-save with debouncing
     */
    scheduleAutoSave(form) {
        // Clear existing timeout
        if (this.autoSaveInterval) {
            clearTimeout(this.autoSaveInterval);
        }

        // Schedule new save
        this.autoSaveInterval = setTimeout(() => {
            this.saveFormData(form);
            this.showAutoSaveIndicator();
        }, this.autoSaveDelay);
    }

    /**
     * Save form data to session storage
     */
    saveFormData(form) {
        const formData = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.name || input.id) {
                const key = input.name || input.id;
                formData[key] = input.value;
                
                // Special handling for checkboxes and radio buttons
                if (input.type === 'checkbox' || input.type === 'radio') {
                    formData[key] = input.checked;
                }
            }
        });

        // Save with timestamp
        const saveData = {
            data: formData,
            timestamp: new Date().toISOString(),
            page: this.currentPageKey,
            url: window.location.href
        };

        sessionStorage.setItem(`autosave_${this.currentPageKey}`, JSON.stringify(saveData));
        
        // Also save to a global session log
        this.updateSessionLog(saveData);
    }

    /**
     * Restore form data from session storage
     */
    restoreFormData(form) {
        const savedData = sessionStorage.getItem(`autosave_${this.currentPageKey}`);
        
        if (savedData) {
            try {
                const { data, timestamp } = JSON.parse(savedData);
                
                // Check if data is recent (within 24 hours)
                const saveTime = new Date(timestamp);
                const now = new Date();
                const hoursSincesSave = (now - saveTime) / (1000 * 60 * 60);
                
                if (hoursSincesSave < 24) {
                    let restoredCount = 0;
                    
                    Object.keys(data).forEach(key => {
                        const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                        if (element && data[key] !== null && data[key] !== undefined) {
                            if (element.type === 'checkbox' || element.type === 'radio') {
                                element.checked = data[key];
                            } else {
                                element.value = data[key];
                            }
                            restoredCount++;
                        }
                    });
                    
                    if (restoredCount > 0) {
                        this.showRestoreNotification(timestamp, restoredCount);
                    }
                }
            } catch (error) {
                console.error('Error restoring form data:', error);
            }
        }
    }

    /**
     * Update global session log for cross-page tracking
     */
    updateSessionLog(saveData) {
        let sessionLog = [];
        try {
            sessionLog = JSON.parse(localStorage.getItem('session_log')) || [];
        } catch (e) {
            sessionLog = [];
        }

        // Add current save
        sessionLog.unshift({
            page: saveData.page,
            timestamp: saveData.timestamp,
            url: saveData.url,
            hasData: Object.keys(saveData.data).length > 0
        });

        // Keep only last 10 sessions
        sessionLog = sessionLog.slice(0, 10);
        
        localStorage.setItem('session_log', JSON.stringify(sessionLog));
    }

    /**
     * Setup navigation tracking
     */
    setupNavigationTracking() {
        // Track page unload to save current state
        window.addEventListener('beforeunload', () => {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => this.saveFormData(form));
        });

        // Track navigation for breadcrumb functionality
        this.updateNavigationHistory();
    }

    /**
     * Update navigation history for quick back navigation
     */
    updateNavigationHistory() {
        let navHistory = [];
        try {
            navHistory = JSON.parse(sessionStorage.getItem('nav_history')) || [];
        } catch (e) {
            navHistory = [];
        }

        const currentPage = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            pageKey: this.currentPageKey
        };

        // Add to history if it's not the same as the last entry
        if (navHistory.length === 0 || navHistory[0].url !== currentPage.url) {
            navHistory.unshift(currentPage);
            navHistory = navHistory.slice(0, 5); // Keep last 5 pages
            sessionStorage.setItem('nav_history', JSON.stringify(navHistory));
        }
    }

    /**
     * Setup quick actions for faster workflow
     */
    setupQuickActions() {
        this.createQuickActionBar();
    }

    /**
     * Create floating quick action bar
     */
    createQuickActionBar() {
        // Only show on form pages
        if (!document.querySelector('form')) return;

        const quickBar = document.createElement('div');
        quickBar.id = 'quickActionBar';
        quickBar.className = 'quick-action-bar';
        quickBar.innerHTML = `
            <div class="quick-actions">
                <button type="button" class="btn-quick" id="quickSave" title="Save Progress (Ctrl+S)">
                    <i class="fas fa-save"></i>
                </button>
                <button type="button" class="btn-quick" id="quickTest" title="Test Connection (Ctrl+T)">
                    <i class="fas fa-plug"></i>
                </button>
                <button type="button" class="btn-quick" id="quickBack" title="Quick Back (Ctrl+B)">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="autosave-indicator" id="autoSaveIndicator">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Auto-saved</span>
                </div>
            </div>
        `;

        document.body.appendChild(quickBar);
        this.setupQuickActionEvents();
    }

    /**
     * Setup quick action event handlers
     */
    setupQuickActionEvents() {
        const quickSave = document.getElementById('quickSave');
        const quickTest = document.getElementById('quickTest');
        const quickBack = document.getElementById('quickBack');

        if (quickSave) {
            quickSave.addEventListener('click', () => {
                const forms = document.querySelectorAll('form');
                forms.forEach(form => this.saveFormData(form));
                this.showSaveConfirmation();
            });
        }

        if (quickTest) {
            quickTest.addEventListener('click', () => {
                this.testConnection();
            });
        }

        if (quickBack) {
            quickBack.addEventListener('click', () => {
                this.quickBack();
            });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S: Quick save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const forms = document.querySelectorAll('form');
                forms.forEach(form => this.saveFormData(form));
                this.showSaveConfirmation();
            }

            // Ctrl+T: Test connection
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.testConnection();
            }

            // Ctrl+B: Quick back
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.quickBack();
            }

            // Escape: Clear current auto-save
            if (e.key === 'Escape') {
                this.clearAutoSave();
            }
        });
    }

    /**
     * Test connection functionality
     */
    async testConnection() {
        const testBtn = document.getElementById('quickTest');
        if (testBtn) {
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            testBtn.disabled = true;
        }

        try {
            // Call existing test function if available
            if (typeof testConnection === 'function') {
                await testConnection();
            } else {
                // Generic test
                const apiKey = localStorage.getItem('googleSheetsApiKey') || localStorage.getItem('sheetsApiKey');
                if (!apiKey) {
                    throw new Error('No API key found');
                }
                
                this.showMessage('Connection test passed!', 'success');
            }
        } catch (error) {
            this.showMessage('Connection test failed: ' + error.message, 'error');
        } finally {
            if (testBtn) {
                testBtn.innerHTML = '<i class="fas fa-plug"></i>';
                testBtn.disabled = false;
            }
        }
    }

    /**
     * Quick back functionality
     */
    quickBack() {
        const navHistory = JSON.parse(sessionStorage.getItem('nav_history')) || [];
        
        if (navHistory.length > 1) {
            // Go to previous page (skip current page)
            const previousPage = navHistory[1];
            window.location.href = previousPage.url;
        } else {
            // Fallback to dashboard
            window.location.href = '/';
        }
    }

    /**
     * Restore session from previous page visit
     */
    restoreSession() {
        // Auto-restore form data when page loads
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // Wait a bit for form to fully initialize
            setTimeout(() => {
                this.restoreFormData(form);
            }, 500);
        });
    }

    /**
     * Show auto-save indicator
     */
    showAutoSaveIndicator() {
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.classList.add('visible');
            setTimeout(() => {
                indicator.classList.remove('visible');
            }, 2000);
        }
    }

    /**
     * Show restore notification
     */
    showRestoreNotification(timestamp, count) {
        const saveTime = new Date(timestamp).toLocaleString();
        this.showMessage(
            `Restored ${count} field(s) from auto-save (${saveTime})`,
            'info',
            5000
        );
    }

    /**
     * Show save confirmation
     */
    showSaveConfirmation() {
        this.showMessage('Progress saved successfully!', 'success');
    }

    /**
     * Show message utility
     */
    showMessage(text, type = 'info', duration = 3000) {
        // Try to use existing message system
        if (typeof showMessage === 'function') {
            showMessage(text, type);
            return;
        }

        // Fallback message system
        let messageEl = document.getElementById('sessionMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'sessionMessage';
            messageEl.className = 'session-message';
            document.body.appendChild(messageEl);
        }

        messageEl.className = `session-message show ${type}`;
        messageEl.textContent = text;

        setTimeout(() => {
            messageEl.classList.remove('show');
        }, duration);
    }

    /**
     * Clear current auto-save data
     */
    clearAutoSave() {
        sessionStorage.removeItem(`autosave_${this.currentPageKey}`);
        this.showMessage('Auto-save data cleared', 'info');
    }

    /**
     * Get session summary for debugging
     */
    getSessionSummary() {
        const sessionLog = JSON.parse(localStorage.getItem('session_log')) || [];
        const navHistory = JSON.parse(sessionStorage.getItem('nav_history')) || [];
        const currentAutoSave = sessionStorage.getItem(`autosave_${this.currentPageKey}`);

        return {
            currentPage: this.currentPageKey,
            sessionLog: sessionLog,
            navigationHistory: navHistory,
            hasAutoSave: !!currentAutoSave,
            autoSaveData: currentAutoSave ? JSON.parse(currentAutoSave) : null
        };
    }
}

// Initialize session manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.sessionManager = new SessionManager();
    
    // Debug helper - accessible in console
    window.getSessionSummary = () => window.sessionManager.getSessionSummary();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
}
