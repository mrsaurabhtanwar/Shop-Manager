// Google Apps Script Client - Workers Section Optimized
class GASClient {
    constructor(scriptUrl) {
        this.scriptUrl = scriptUrl;
    }

    async callFunction(functionName, ...args) {
        try {
            let response;
            let requestData;
            
            console.log(`Calling ${functionName} with args:`, args);
            
            // Handle POST requests (addWorker, addPayment)
            if (functionName === 'addWorker') {
                requestData = {
                    action: 'addWorker',
                    name: args[0] || '',
                    phone: args[1] || '',
                    address: args[2] || ''
                };
                
                response = await this.makePostRequest(requestData);
                
            } else if (functionName === 'addPayment') {
                requestData = {
                    action: 'addPayment',
                    workerName: args[0] || '',
                    paintCount: parseInt(args[1]) || 0,
                    shirtCount: parseInt(args[2]) || 0,
                    advanceTaken: parseFloat(args[3]) || 0,
                    notes: args[4] || ''
                };
                
                response = await this.makePostRequest(requestData);
                
            } else {
                // Handle GET requests (getWorkers, getWorkerNames, getPaymentHistory)
                const action = functionName === 'getPaymentHistory' ? 'getPayments' : functionName;
                response = await this.makeGetRequest(action);
            }

            return await this.handleResponse(response);
            
        } catch (error) {
            console.error(`Error in ${functionName}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    async makePostRequest(data) {
        console.log('POST Request Data:', data);
        // Send JSON as text/plain to avoid CORS preflight (Google Apps Script doPost can still read e.postData.contents)
        const body = JSON.stringify(data);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const resp = await fetch(this.scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=UTF-8'
                },
                body: body,
                signal: controller.signal
            });
            return resp;
        } catch (err) {
            // Normalize network/cors/abort errors
            console.error('Fetch POST failed:', err);
            throw err;
        } finally {
            clearTimeout(timeout);
        }
    }
    
    async makeGetRequest(action) {
        const url = `${this.scriptUrl}?action=${encodeURIComponent(action)}`;
        console.log('GET Request URL:', url);
        
        return await fetch(url, {
            method: 'GET',
            mode: 'cors'
        });
    }
    
    async handleResponse(response) {
        console.log('Response status:', response.status, response.statusText);

        const text = await response.text();
        console.log('Raw response text:', text);

        if (!response.ok) {
            // Include body text for easier debugging (may contain GAS error message)
            console.error('Non-OK HTTP response:', response.status, response.statusText, text);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
        }

        try {
            const result = JSON.parse(text);
            console.log('Parsed result:', result);
            return result;
        } catch (e) {
            console.error('JSON Parse Error:', e, 'Raw text:', text);
            throw new Error('Invalid JSON response from server: ' + text);
        }
    }

    // Helper methods for legacy google.script.run compatibility
    withSuccessHandler(successCallback) {
        this.successCallback = successCallback;
        return this;
    }

    withFailureHandler(failureCallback) {
        this.failureCallback = failureCallback;
        return this;
    }

    async executeFunction(functionName, ...args) {
        try {
            const result = await this.callFunction(functionName, ...args);
            
            // Check if the result indicates success
            if (result && result.success !== false) {
                if (this.successCallback) {
                    // Pass the result data or the full result if no data property
                    const dataToPass = result.data !== undefined ? result.data : result;
                    this.successCallback(dataToPass);
                }
            } else {
                if (this.failureCallback) {
                    const errorMsg = result.error || result.message || 'Unknown error';
                    this.failureCallback(errorMsg);
                }
            }
            
            return result;
        } catch (error) {
            if (this.failureCallback) {
                this.failureCallback(error.message);
            }
            throw error;
        } finally {
            // Reset callbacks after use
            this.successCallback = null;
            this.failureCallback = null;
        }
    }
}

// Google Apps Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwVae82BjVTQhiqt0B0aMgg2_C2oNoq6jsWeqsuSrk6KO6b6fBYBG0mefqqFaMtco0S/exec';
const gasClient = new GASClient(SCRIPT_URL);

// Log initialization
console.log('🚀 GAS Client initialized with URL:', SCRIPT_URL);
console.log('🔧 GASClient instance:', gasClient);

// Legacy google.script.run API compatibility
window.google = {
    script: {
        run: {
            withSuccessHandler: function(callback) {
                return {
                    withFailureHandler: function(errorCallback) {
                        return {
                            // Worker management functions
                            getWorkers: () => {
                                return gasClient.withSuccessHandler(callback).withFailureHandler(errorCallback).executeFunction('getWorkers');
                            },
                            addWorker: (name, phone, address) => {
                                return gasClient.withSuccessHandler(callback).withFailureHandler(errorCallback).executeFunction('addWorker', name, phone, address);
                            },
                            getWorkerNames: () => {
                                return gasClient.withSuccessHandler(callback).withFailureHandler(errorCallback).executeFunction('getWorkerNames');
                            },
                            
                            // Payment management functions
                            addPayment: (workerName, paintCount, shirtCount, advanceTaken, notes) => {
                                return gasClient.withSuccessHandler(callback).withFailureHandler(errorCallback).executeFunction('addPayment', workerName, paintCount, shirtCount, advanceTaken, notes);
                            },
                            getPaymentHistory: () => {
                                return gasClient.withSuccessHandler(callback).withFailureHandler(errorCallback).executeFunction('getPaymentHistory');
                            }
                        };
                    }
                };
            }
        }
    }
};

// Modern Promise-based API for easier async/await usage
window.WorkerAPI = {
    // Worker management
    async getWorkers() {
        try {
            console.log('🔄 WorkerAPI.getWorkers() called');
            const result = await gasClient.callFunction('getWorkers');
            console.log('✅ getWorkers result:', result);
            return result;
        } catch (error) {
            console.error('❌ Error getting workers:', error);
            throw error;
        }
    },
    
    async addWorker(name, phone, address) {
        try {
            console.log('🔄 WorkerAPI.addWorker() called with:', { name, phone, address });
            
            if (!name || name.trim() === '') {
                throw new Error('Worker name is required');
            }
            
            const result = await gasClient.callFunction('addWorker', name.trim(), phone.trim(), address.trim());
            console.log('✅ addWorker result:', result);
            return result;
        } catch (error) {
            console.error('❌ Error adding worker:', error);
            throw error;
        }
    },
    
    async getWorkerNames() {
        try {
            const result = await gasClient.callFunction('getWorkerNames');
            return result;
        } catch (error) {
            console.error('Error getting worker names:', error);
            throw error;
        }
    },
    
    // Payment management
    async addPayment(workerName, paintCount, shirtCount, advanceTaken, notes) {
        try {
            if (!workerName || workerName.trim() === '') {
                throw new Error('Worker name is required');
            }
            
            const result = await gasClient.callFunction('addPayment', workerName.trim(), paintCount, shirtCount, advanceTaken, notes.trim());
            return result;
        } catch (error) {
            console.error('Error adding payment:', error);
            throw error;
        }
    },
    
    async getPaymentHistory() {
        try {
            const result = await gasClient.callFunction('getPaymentHistory');
            return result;
        } catch (error) {
            console.error('Error getting payment history:', error);
            throw error;
        }
    }
};

// Log WorkerAPI initialization
console.log('🎯 WorkerAPI initialized:', typeof window.WorkerAPI);
console.log('📝 WorkerAPI.addWorker:', typeof window.WorkerAPI?.addWorker);

// (debug test function removed)