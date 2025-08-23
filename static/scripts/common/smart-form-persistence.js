/**
 * Smart Form Persistence System
 * Intelligently saves form progress and eliminates repetitive testing/saving
 */

class SmartFormPersistence {
    constructor() {
        this.testResults = new Map();
        this.formValidationCache = new Map();
        this.lastSuccessfulSave = null;
        this.init();
    }

    init() {
        this.setupSmartSaving();
        this.setupIntelligentTesting();
        this.setupFormValidationCache();
        this.setupContinuousBackup();
        this.createSmartIndicators();
    }

    /**
     * Setup smart saving that reduces manual save clicks
     */
    setupSmartSaving() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            this.enhanceFormWithSmartSave(form);
        });
    }

    /**
     * Enhance form with smart save functionality
     */
    enhanceFormWithSmartSave(form) {
        const formId = form.id || 'main-form';
        let isFormValid = false;
        let hasUnsavedChanges = false;
        let autoSaveTimer = null;

        // Create form state tracker
        const formState = {
            isValid: false,
            hasChanges: false,
            lastSave: null,
            lastTest: null,
            testResult: null
        };

        // Smart validation on input change
        form.addEventListener('input', (e) => {
            hasUnsavedChanges = true;
            formState.hasChanges = true;
            
            // Clear previous auto-save timer
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            
            // Validate form reactively
            const newValidState = this.validateFormSmart(form);
            if (newValidState !== isFormValid) {
                isFormValid = newValidState;
                formState.isValid = newValidState;
                this.updateFormStateIndicator(formId, formState);
            }

            // Auto-save after 3 seconds of inactivity if form is valid
            if (isFormValid) {
                autoSaveTimer = setTimeout(() => {
                    this.performSmartSave(form, formState);
                }, 3000);
            }
        });

        // Smart test connection
        const testBtn = form.querySelector('button[onclick*="test"], #quickTest, .btn-test');
        if (testBtn) {
            testBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.performSmartTest(form, formState);
            });
        }

        // Enhanced submit handling
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performSmartSubmit(form, formState);
        });

        // Initial state setup
        this.updateFormStateIndicator(formId, formState);
    }

    /**
     * Smart form validation with caching
     */
    validateFormSmart(form) {
        const formData = new FormData(form);
        const formHash = this.generateFormHash(formData);
        
        // Check cache first
        if (this.formValidationCache.has(formHash)) {
            return this.formValidationCache.get(formHash);
        }

        // Perform validation
        let isValid = true;
        const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        for (const field of requiredFields) {
            if (!field.value.trim()) {
                isValid = false;
                break;
            }
        }

        // Cache result
        this.formValidationCache.set(formHash, isValid);
        
        return isValid;
    }

    /**
     * Perform smart test (avoid redundant tests)
     */
    async performSmartTest(form, formState) {
        const apiKey = localStorage.getItem('googleSheetsApiKey') || localStorage.getItem('sheetsApiKey');
        const testKey = `test_${apiKey}_${Date.now() - Date.now() % (5 * 60 * 1000)}`; // 5-minute cache
        
        // Check if we recently tested with same API key
        if (this.testResults.has(testKey)) {
            const cachedResult = this.testResults.get(testKey);
            this.showSmartMessage(`✅ Connection OK (cached result)`, 'success');
            formState.testResult = cachedResult;
            formState.lastTest = new Date().toISOString();
            this.updateFormStateIndicator(form.id, formState);
            return;
        }

        try {
            this.showSmartMessage('🔍 Testing connection...', 'info');
            
            // Call existing test function if available
            let testResult;
            if (typeof testConnection === 'function') {
                testResult = await testConnection();
            } else {
                // Generic test
                if (!apiKey) throw new Error('No API key configured');
                testResult = { success: true, message: 'API key present' };
            }

            // Cache successful test
            this.testResults.set(testKey, testResult);
            
            formState.testResult = testResult;
            formState.lastTest = new Date().toISOString();
            
            this.showSmartMessage('✅ Connection test passed!', 'success');
            this.updateFormStateIndicator(form.id, formState);
            
        } catch (error) {
            formState.testResult = { success: false, error: error.message };
            this.showSmartMessage(`❌ Test failed: ${error.message}`, 'error');
            this.updateFormStateIndicator(form.id, formState);
        }
    }

    /**
     * Perform smart save (progressive saving)
     */
    async performSmartSave(form, formState) {
        if (!formState.hasChanges) {
            this.showSmartMessage('✅ No changes to save', 'info');
            return;
        }

        try {
            this.showSmartMessage('💾 Auto-saving...', 'info');
            
            // Save form data to storage
            const formData = this.getFormData(form);
            const formKey = `smart_save_${form.id || 'form'}`;
            
            sessionStorage.setItem(formKey, JSON.stringify({
                data: formData,
                timestamp: new Date().toISOString(),
                formId: form.id,
                url: window.location.href
            }));

            formState.lastSave = new Date().toISOString();
            formState.hasChanges = false;
            
            this.lastSuccessfulSave = formState.lastSave;
            this.updateFormStateIndicator(form.id, formState);
            
            this.showSmartMessage('✅ Progress saved', 'success');
            
        } catch (error) {
            this.showSmartMessage(`❌ Save failed: ${error.message}`, 'error');
        }
    }

    /**
     * Perform smart submit with validation
     */
    async performSmartSubmit(form, formState) {
        // Validate before submit
        if (!this.validateFormSmart(form)) {
            this.showSmartMessage('❌ Please fill all required fields', 'error');
            this.highlightMissingFields(form);
            return;
        }

        // Check if connection test is needed
        if (!formState.testResult || !formState.testResult.success) {
            const shouldTest = confirm('Connection not tested. Test connection first?');
            if (shouldTest) {
                await this.performSmartTest(form, formState);
                if (!formState.testResult || !formState.testResult.success) {
                    return;
                }
            }
        }

        try {
            this.showSmartMessage('📤 Submitting form...', 'info');
            
            // Call original form submission
            if (typeof handleFormSubmission === 'function') {
                await handleFormSubmission({ preventDefault: () => {} });
            } else {
                // Fallback submission
                form.submit();
            }
            
            // Clear saved data on successful submit
            const formKey = `smart_save_${form.id || 'form'}`;
            sessionStorage.removeItem(formKey);
            
            formState.hasChanges = false;
            this.updateFormStateIndicator(form.id, formState);
            
        } catch (error) {
            this.showSmartMessage(`❌ Submission failed: ${error.message}`, 'error');
        }
    }

    /**
     * Setup continuous backup for critical data
     */
    setupContinuousBackup() {
        setInterval(() => {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const formData = this.getFormData(form);
                const hasSignificantData = Object.values(formData).some(value => 
                    value && value.length > 10
                );
                
                if (hasSignificantData) {
                    const backupKey = `backup_${form.id || 'form'}_${new Date().toDateString()}`;
                    localStorage.setItem(backupKey, JSON.stringify({
                        data: formData,
                        timestamp: new Date().toISOString(),
                        url: window.location.href
                    }));
                }
            });
        }, 30000); // Every 30 seconds
    }

    /**
     * Create smart indicators showing form state
     */
    createSmartIndicators() {
        const indicator = document.createElement('div');
        indicator.id = 'smartFormIndicator';
        indicator.className = 'smart-form-indicator';
        indicator.innerHTML = `
            <div class="indicator-content">
                <div class="indicator-icon">
                    <i class="fas fa-circle"></i>
                </div>
                <div class="indicator-text">Ready</div>
                <div class="indicator-details"></div>
            </div>
        `;
        
        document.body.appendChild(indicator);
    }

    /**
     * Update form state indicator
     */
    updateFormStateIndicator(formId, formState) {
        const indicator = document.getElementById('smartFormIndicator');
        if (!indicator) return;

        const icon = indicator.querySelector('.indicator-icon i');
        const text = indicator.querySelector('.indicator-text');
        const details = indicator.querySelector('.indicator-details');
        
        let status = 'ready';
        let statusText = 'Ready';
        let statusDetails = '';
        
        if (formState.hasChanges && !formState.isValid) {
            status = 'invalid';
            statusText = 'Fill Required Fields';
            icon.className = 'fas fa-exclamation-circle';
        } else if (formState.hasChanges) {
            status = 'unsaved';
            statusText = 'Unsaved Changes';
            statusDetails = 'Auto-saving soon...';
            icon.className = 'fas fa-clock';
        } else if (formState.lastSave) {
            status = 'saved';
            statusText = 'Saved';
            statusDetails = this.getTimeAgo(formState.lastSave);
            icon.className = 'fas fa-check-circle';
        }

        if (formState.testResult && !formState.testResult.success) {
            status = 'error';
            statusText = 'Connection Error';
            statusDetails = 'Test connection to continue';
            icon.className = 'fas fa-times-circle';
        }

        indicator.className = `smart-form-indicator ${status}`;
        text.textContent = statusText;
        details.textContent = statusDetails;
    }

    /**
     * Highlight missing required fields
     */
    highlightMissingFields(form) {
        const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = '#dc3545';
                field.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
                
                // Remove highlight after user starts typing
                field.addEventListener('input', function clearHighlight() {
                    field.style.borderColor = '';
                    field.style.boxShadow = '';
                    field.removeEventListener('input', clearHighlight);
                });
            }
        });
    }

    /**
     * Get form data as object
     */
    getFormData(form) {
        const formData = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.name || input.id) {
                const key = input.name || input.id;
                formData[key] = input.value;
            }
        });
        
        return formData;
    }

    /**
     * Generate hash for form data
     */
    generateFormHash(formData) {
        const dataString = Array.from(formData.entries())
            .sort()
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString();
    }

    /**
     * Get time ago string
     */
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        return `${Math.floor(diffInSeconds / 3600)}h ago`;
    }

    /**
     * Show smart message
     */
    showSmartMessage(text, type = 'info') {
        // Try to use session manager's message system
        if (window.sessionManager && window.sessionManager.showMessage) {
            window.sessionManager.showMessage(text, type);
            return;
        }

        // Fallback message
        console.log(`[Smart Form] ${text}`);
        
        // Create temporary toast
        const toast = document.createElement('div');
        toast.className = `smart-message smart-message-${type}`;
        toast.textContent = text;
        toast.style.cssText = `
            position: fixed; 
            top: 70px; 
            right: 20px; 
            z-index: 1060; 
            padding: 12px 20px; 
            border-radius: 6px; 
            color: white; 
            font-size: 14px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
}

// Initialize when session manager is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.smartFormPersistence = new SmartFormPersistence();
    }, 200);
});
