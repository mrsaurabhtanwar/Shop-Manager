// ============= CONFIGURATION =============
        // Google Apps Script URL for saving combined orders
        const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFsxqgYxfi5nXNMo9hiRVhzyYtFuQaexV_mVwt8Mdk9Veb1_mUkJR3fg7CNvZk_L7x/exec';
        
        // Base URL for navigation
        const BASE_URL = window.location.origin;
        
        // Get URL parameters for returned order data
        const urlParams = new URLSearchParams(window.location.search);
        
        // State trackingp
        let hasFabricOrder = false;
        let hasTailoringOrder = false;
        
        // Master Order ID for linking related orders
        let masterOrderId = null;
        
        /**
         * Generate linked OrderIDs for fabric, tailor, and combined orders
         */
        function generateLinkedOrderIds() {
            if (!masterOrderId) {
                // Generate master order ID: CMB (Combined) + timestamp + random
                const timestamp = Date.now();
                const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                masterOrderId = `CMB${timestamp}${random}`;
            }
            
            return {
                master: masterOrderId,
                fabric: `F-${masterOrderId}`,
                tailor: `T-${masterOrderId}`,
                combined: `C-${masterOrderId}`
            };
        }
        
        // Initialize page when loaded
        document.addEventListener('DOMContentLoaded', function() {
            setDefaultDate();
            loadSavedData();
            handleReturnedOrderData();
            setupEventListeners();
            updateTotals();
            updateSaveButtonState();
        });
        
        /**
         * Set today's date as default
         */
        function setDefaultDate() {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('order_date').value = today;
        }
        
        /**
         * Load saved form data from sessionStorage
         */
        function loadSavedData() {
            const savedData = sessionStorage.getItem('combinedOrderData');
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    Object.keys(data).forEach(key => {
                        const element = document.getElementById(key);
                        if (element) {
                            element.value = data[key];
                        }
                    });
                    
                    // Restore order status
                    if (data.fabric_price > 0) {
                        hasFabricOrder = true;
                        updateOrderStatus('fabric', data.fabric_price, data.fabric_order_id);
                    }
                    if (data.tailoring_price > 0) {
                        hasTailoringOrder = true;
                        updateOrderStatus('tailoring', data.tailoring_price, data.tailoring_order_id);
                    }
                    
                    updateTotals();
                } catch (e) {
                    console.error('Error loading saved data:', e);
                }
            }
        }
        
        // Address helper: store a single global address for combined orders
function loadAddress() {
    const addr = sessionStorage.getItem('combinedOrderAddress');
    if (addr) document.getElementById('address').value = addr;
}

function saveAddress() {
    const addr = document.getElementById('address').value.trim();
    sessionStorage.setItem('combinedOrderAddress', addr);
}

// Integrate address into saveFormData
const originalSaveFormData = window.saveFormData || function(){};
function saveFormData_withAddress() {
    try { originalSaveFormData(); } catch(e){}
    saveAddress();
}
window.saveFormData = saveFormData_withAddress;

// Ensure address loads on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // ...existing DOMContentLoaded handlers in file will still run; call loadAddress after they run
    setTimeout(loadAddress, 10);
});

// When saving combined order, include address in the payload (wrap existing saveCombinedOrder)
if (typeof saveCombinedOrder === 'function') {
    const originalSaveCombinedOrder = saveCombinedOrder;
    saveCombinedOrder = function(e) {
        // Ensure address is saved to session and available to combined payload
        saveAddress();
        return originalSaveCombinedOrder.call(this, e);
    }
}

/**
         * Save form data to sessionStorage
         */
        function saveFormData() {
            const formData = {};
            const form = document.getElementById('combinedForm');
            const inputs = form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                if (input.name || input.id) {
                    formData[input.name || input.id] = input.value;
                }
            });
            
            sessionStorage.setItem('combinedOrderData', JSON.stringify(formData));
        }
        
        /**
         * Handle returned order data from fabric/tailor pages
         */
        function handleReturnedOrderData() {
            // First restore any existing order data from sessionStorage
            const existingData = sessionStorage.getItem('combinedOrderData');
            if (existingData) {
                try {
                    const data = JSON.parse(existingData);
                    
                    // Restore existing fabric order if it exists
                    if (data.fabric_price && parseFloat(data.fabric_price) > 0) {
                        document.getElementById('fabric_price').value = data.fabric_price;
                        document.getElementById('fabric_order_id').value = data.fabric_order_id || '';
                        hasFabricOrder = true;
                        updateOrderStatus('fabric', parseFloat(data.fabric_price), data.fabric_order_id);
                    }
                    
                    // Restore existing tailoring order if it exists
                    if (data.tailoring_price && parseFloat(data.tailoring_price) > 0) {
                        document.getElementById('tailoring_price').value = data.tailoring_price;
                        document.getElementById('tailoring_order_id').value = data.tailoring_order_id || '';
                        hasTailoringOrder = true;
                        updateOrderStatus('tailoring', parseFloat(data.tailoring_price), data.tailoring_order_id);
                    }
                } catch (e) {
                    console.error('Error restoring existing order data:', e);
                }
            }
            
            // Check for NEW fabric order data
            if (urlParams.get('fabric_order_added') === 'true') {
                const fabricPrice = parseFloat(urlParams.get('fabric_price')) || 0;
                const fabricOrderId = urlParams.get('fabric_order_id') || '';
                
                // Restore customer data
                if (urlParams.get('customer_name')) {
                    document.getElementById('customer_name').value = urlParams.get('customer_name');
                }
                if (urlParams.get('contact')) {
                    document.getElementById('contact').value = urlParams.get('contact');
                }
                if (urlParams.get('customer_type')) {
                    document.getElementById('customer_type').value = urlParams.get('customer_type');
                }
                if (urlParams.get('order_date')) {
                    document.getElementById('order_date').value = urlParams.get('order_date');
                }
                if (urlParams.get('sessions')) {
                    document.getElementById('sessions').value = urlParams.get('sessions');
                }
                if (urlParams.get('notes')) {
                    document.getElementById('notes').value = urlParams.get('notes');
                }
                
                // Set NEW fabric order data
                document.getElementById('fabric_price').value = fabricPrice;
                document.getElementById('fabric_order_id').value = fabricOrderId;
                
                hasFabricOrder = true;
                updateOrderStatus('fabric', fabricPrice, fabricOrderId);
                showMessage('✅ Fabric order added successfully! Price: ₹' + fabricPrice + ' | ID: ' + fabricOrderId, 'success');
            }
            
            // Check for NEW tailoring order data
            if (urlParams.get('tailoring_order_added') === 'true') {
                const tailoringPrice = parseFloat(urlParams.get('tailoring_price')) || 0;
                const tailoringOrderId = urlParams.get('tailoring_order_id') || '';
                
                // Restore customer data
                if (urlParams.get('customer_name')) {
                    document.getElementById('customer_name').value = urlParams.get('customer_name');
                }
                if (urlParams.get('contact')) {
                    document.getElementById('contact').value = urlParams.get('contact');
                }
                if (urlParams.get('customer_type')) {
                    document.getElementById('customer_type').value = urlParams.get('customer_type');
                }
                if (urlParams.get('order_date')) {
                    document.getElementById('order_date').value = urlParams.get('order_date');
                }
                if (urlParams.get('sessions')) {
                    document.getElementById('sessions').value = urlParams.get('sessions');
                }
                if (urlParams.get('notes')) {
                    document.getElementById('notes').value = urlParams.get('notes');
                }
                
                // Set NEW tailoring order data
                document.getElementById('tailoring_price').value = tailoringPrice;
                document.getElementById('tailoring_order_id').value = tailoringOrderId;
                
                hasTailoringOrder = true;
                updateOrderStatus('tailoring', tailoringPrice, tailoringOrderId);
                showMessage('✅ Tailoring order added successfully! Price: ₹' + tailoringPrice + ' | ID: ' + tailoringOrderId, 'success');
            }
            
            // Check for NEW tailoring order data from tailor.js (using tailor_returned parameter)
            if (urlParams.get('tailor_returned') === 'true') {
                // Get tailor order data from sessionStorage
                const tailorOrderDataStr = sessionStorage.getItem('tailor_order_data');
                if (tailorOrderDataStr) {
                    try {
                        const tailorData = JSON.parse(tailorOrderDataStr);
                        const tailoringPrice = parseFloat(tailorData.price) || 0;
                        const tailoringOrderId = tailorData.order_id || urlParams.get('order_id') || '';
                        const masterOrderId = tailorData.master_order_id || urlParams.get('master_order_id') || '';
                        
                        // Set NEW tailoring order data
                        document.getElementById('tailoring_price').value = tailoringPrice;
                        document.getElementById('tailoring_order_id').value = tailoringOrderId;
                        
                        hasTailoringOrder = true;
                        updateOrderStatus('tailoring', tailoringPrice, tailoringOrderId);
                        
                        if (masterOrderId) {
                            showMessage(`✅ Tailoring order added successfully! Price: ₹${tailoringPrice} | ID: ${tailoringOrderId} (Linked to Master: ${masterOrderId})`, 'success');
                        } else {
                            showMessage(`✅ Tailoring order added successfully! Price: ₹${tailoringPrice} | ID: ${tailoringOrderId}`, 'success');
                        }
                        
                        // Clean up the sessionStorage after processing
                        sessionStorage.removeItem('tailor_order_data');
                    } catch (e) {
                        console.error('Error parsing tailor order data:', e);
                        showMessage('⚠️ Tailoring order was created but there was an issue displaying it. Please refresh the page.', 'warning');
                    }
                } else {
                    // Fallback - use URL parameters if sessionStorage is not available
                    const tailoringOrderId = urlParams.get('order_id') || '';
                    const masterOrderId = urlParams.get('master_order_id') || '';
                    
                    if (tailoringOrderId) {
                        // Set order ID but price will need to be entered manually
                        document.getElementById('tailoring_order_id').value = tailoringOrderId;
                        hasTailoringOrder = true;
                        updateOrderStatus('tailoring', 0, tailoringOrderId); // 0 price as fallback
                        showMessage(`⚠️ Tailoring order ${tailoringOrderId} was created. Please enter the price manually.`, 'warning');
                    }
                }
            }
            
            updateTotals();
            updateSaveButtonState();
            saveFormData();
        }
        
        /**
         * Setup event listeners
         */
        function setupEventListeners() {
            // Save form data on input changes
            document.getElementById('combinedForm').addEventListener('input', function() {
                saveFormData();
                updateTotals();
                updateSaveButtonState();
            });
            
            // Add Fabric button
            document.getElementById('addFabricBtn').addEventListener('click', function() {
                console.log('Add Fabric button clicked');
                if (!validateCustomerInfo()) return;
                
                // Save current form data before navigating
                saveFormData();
                
                // Generate linked OrderIDs
                const linkedIds = generateLinkedOrderIds();
                
                // Get current form data and pass as URL parameters
                const customerData = {
                    customer_name: document.getElementById('customer_name').value,
                    contact: document.getElementById('contact').value,
                    customer_type: document.getElementById('customer_type').value,
                    order_date: document.getElementById('order_date').value,
                    sessions: document.getElementById('sessions').value,
                    notes: document.getElementById('notes').value,
                    return_to_combined: 'true',
                    master_order_id: linkedIds.master,
                    expected_fabric_id: linkedIds.fabric
                };
                
                const urlParams = new URLSearchParams(customerData);
                window.location.href = `/orders/fabric?${urlParams.toString()}`;
            });
            
            // Add Tailoring button
            document.getElementById('addTailoringBtn').addEventListener('click', function() {
                console.log('Add Tailoring button clicked');
                if (!validateCustomerInfo()) return;
                
                // Save current form data before navigating
                saveFormData();
                
                // Generate linked OrderIDs (use existing master ID if available)
                const linkedIds = generateLinkedOrderIds();
                
                // Get current form data and pass as URL parameters
                const customerData = {
                    customer_name: document.getElementById('customer_name').value,
                    contact: document.getElementById('contact').value,
                    customer_type: document.getElementById('customer_type').value,
                    order_date: document.getElementById('order_date').value,
                    sessions: document.getElementById('sessions').value,
                    notes: document.getElementById('notes').value,
                    return_to_combined: 'true',
                    master_order_id: linkedIds.master,
                    expected_tailor_id: linkedIds.tailor
                };
                
                const urlParams = new URLSearchParams(customerData);
                window.location.href = `/orders/tailor?${urlParams.toString()}`;
            });
            
            // Price input changes
            document.getElementById('fabric_price').addEventListener('input', function() {
                updateTotals();
                updateSaveButtonState();
                saveFormData();
            });
            
            document.getElementById('tailoring_price').addEventListener('input', function() {
                updateTotals();
                updateSaveButtonState();
                saveFormData();
            });
            
            // Form submission
            document.getElementById('combinedForm').addEventListener('submit', saveCombinedOrder);
            
            // Clear button
            document.getElementById('clearBtn').addEventListener('click', clearForm);
        }
        
        /**
         * Validate customer information before navigating to order pages
         */
        function validateCustomerInfo() {
            const customerName = document.getElementById('customer_name').value.trim();
            const contact = document.getElementById('contact').value.trim();
            const orderDate = document.getElementById('order_date').value;
            
            if (!customerName) {
                showMessage('⚠️ Please enter customer name before adding orders', 'error');
                document.getElementById('customer_name').focus();
                return false;
            }
            
            if (!contact) {
                showMessage('⚠️ Please enter contact information before adding orders', 'error');
                document.getElementById('contact').focus();
                return false;
            }
            
            if (!orderDate) {
                showMessage('⚠️ Please select order date before adding orders', 'error');
                document.getElementById('order_date').focus();
                return false;
            }
            
            return true;
        }
        
        /**
         * Update order status display
         */
        function updateOrderStatus(type, price, orderId) {
            const statusText = document.getElementById(`${type}StatusText`);
            const statusPrice = document.getElementById(`${type}StatusPrice`);
            const orderIdElement = document.getElementById(`${type}OrderId`);
            const statusCard = document.getElementById(`${type}Status`);
            
            if (price > 0) {
                statusText.textContent = 'Added ✅';
                statusPrice.textContent = `₹${parseFloat(price).toFixed(2)}`;
                orderIdElement.textContent = orderId ? `ID: ${orderId}` : '';
                statusCard.classList.add('status-added');
            } else {
                statusText.textContent = 'Not added';
                statusPrice.textContent = '₹0.00';
                orderIdElement.textContent = '';
                statusCard.classList.remove('status-added');
            }
        }
        
        /**
         * Update price totals
         */
        function updateTotals() {
            const fabricPrice = parseFloat(document.getElementById('fabric_price').value) || 0;
            const tailoringPrice = parseFloat(document.getElementById('tailoring_price').value) || 0;
            const subtotal = fabricPrice + tailoringPrice;
            const total = subtotal; // Add any taxes/discounts here if needed
            
            document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
            document.getElementById('total').innerHTML = `<strong>₹${total.toFixed(2)}</strong>`;
            
            // Update status displays
            updateOrderStatus('fabric', fabricPrice, document.getElementById('fabric_order_id').value);
            updateOrderStatus('tailoring', tailoringPrice, document.getElementById('tailoring_order_id').value);
        }
        
        /**
         * Update save button state
         */
        function updateSaveButtonState() {
            const saveBtn = document.getElementById('saveCombinedBtn');
            const fabricPrice = parseFloat(document.getElementById('fabric_price').value) || 0;
            const tailoringPrice = parseFloat(document.getElementById('tailoring_price').value) || 0;
            const hasValidCustomer = document.getElementById('customer_name').value.trim() && 
                                   document.getElementById('contact').value.trim() && 
                                   document.getElementById('order_date').value;
            
            // Enable save button if we have customer info and at least one order
            if (hasValidCustomer && (fabricPrice > 0 || tailoringPrice > 0)) {
                saveBtn.disabled = false;
                saveBtn.classList.remove('disabled');
            } else {
                saveBtn.disabled = true;
                saveBtn.classList.add('disabled');
            }
        }
        
        /**
         * Save combined order
         */
        function saveCombinedOrder(e) {
            e.preventDefault();
            
            // Final validation
            const fabricPrice = parseFloat(document.getElementById('fabric_price').value) || 0;
            const tailoringPrice = parseFloat(document.getElementById('tailoring_price').value) || 0;
            
            if (fabricPrice === 0 && tailoringPrice === 0) {
                showMessage('⚠️ Please add at least one order (fabric or tailoring) before saving', 'error');
                return;
            }
            
            // Generate linked order IDs
            const linkedIds = generateLinkedOrderIds();
            
            const formData = new FormData();
            formData.append('path', '/orders/combined');
            
            // Add linked order IDs
            formData.append('master_order_id', linkedIds.master);
            formData.append('combined_order_id', linkedIds.combined);
            formData.append('linked_fabric_id', linkedIds.fabric);
            formData.append('linked_tailor_id', linkedIds.tailor);
            
            // Add all form fields
            const form = document.getElementById('combinedForm');
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.name) {
                    formData.append(input.name, input.value);
                }
            });
            
            // Show loading state
            const saveBtn = document.getElementById('saveCombinedBtn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '⏳ Saving...';
            saveBtn.disabled = true;
            
            // Prepare data for Google Sheets
            const combinedOrderData = {
                customer_name: document.getElementById('customer_name').value || '',
                contact: document.getElementById('contact').value || '',
                customer_type: document.getElementById('customer_type').value || 'New',
                order_date: document.getElementById('order_date').value || '',
                sessions: document.getElementById('sessions').value || '',
                notes: document.getElementById('notes').value || '',
                // Include the address field so Google Sheets receives it
                address: document.getElementById('address') ? document.getElementById('address').value || '' : '',
                fabric_order_id: document.getElementById('fabric_order_id').value || linkedIds.fabric,
                fabric_price: fabricPrice,
                tailoring_order_id: document.getElementById('tailoring_order_id').value || linkedIds.tailor,
                tailoring_price: tailoringPrice,
                total_amount: fabricPrice + tailoringPrice,
                paid_status: document.getElementById('paid_status').value || 'Unpaid',
                combined_order_id: linkedIds.combined,
                master_order_id: linkedIds.master,
                timestamp: new Date().toISOString()
            };
            
            // Submit to Google Sheets
            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain', // Use text/plain to avoid CORS preflight
                },
                body: JSON.stringify(combinedOrderData)
            })
            .then(response => {
                // Read body as text first so we can handle malformed JSON from Apps Script
                return response.text().then(text => ({ ok: response.ok, status: response.status, text }));
            })
            .then(resp => {
                // Try parse JSON if possible
                let data = null;
                try {
                    data = JSON.parse(resp.text);
                } catch (parseErr) {
                    // If parsing fails but HTTP was OK, assume Apps Script received data and wrote to sheet
                    if (resp.ok) {
                        console.warn('Apps Script returned non-JSON response — treating as success:', parseErr, resp.text);
                        data = { success: true, _note: 'non-json-response', raw: resp.text };
                    } else {
                        throw new Error(`HTTP ${resp.status} and non-JSON response`);
                    }
                }

                if (data && data.success) {
                    const masterOrderId = linkedIds.master;
                    const combinedOrderId = data.combinedId || linkedIds.combined;

                    showMessage(`🎉 Combined order saved successfully to Google Sheets!\n\n` +
                               `📋 Master Order ID: ${masterOrderId}\n` +
                               `🧵 Combined Order ID: ${combinedOrderId}\n` +
                               `👕 Fabric Order ID: ${linkedIds.fabric}\n` +
                               `✂️ Tailor Order ID: ${linkedIds.tailor}\n\n` +
                               `💰 Total Amount: ₹${(fabricPrice + tailoringPrice).toFixed(2)}`, 'success');

                    sessionStorage.removeItem('combinedOrderData'); // Clear saved data
                    // Also clear the global combined address saved in sessionStorage
                    sessionStorage.removeItem('combinedOrderAddress');

                    // Show success actions
                    setTimeout(() => {
                        if (confirm('Order saved successfully! 🎉\n\nWould you like to create another combined order?')) {
                            clearForm();
                        } else {
                            // Disable form to prevent duplicate submissions
                            document.getElementById('combinedForm').style.opacity = '0.7';
                            document.getElementById('combinedForm').style.pointerEvents = 'none';
                        }
                    }, 2000);
                } else if (data && data.success === false && typeof data.error === 'string' && data.error.includes('Unexpected token')) {
                    // Known Apps Script JSON parse error: sheet was likely updated but script couldn't return JSON.
                    console.warn('Apps Script returned parse error but data may have been saved:', data.error);
                    showMessage('Combined order likely saved to Google Sheets, but the server returned a parse error. Please verify your sheet.\nProceeding as saved.', 'warning');
                    sessionStorage.removeItem('combinedOrderData');
                    sessionStorage.removeItem('combinedOrderAddress');
                    setTimeout(() => { clearForm(); }, 1500);
                } else {
                    throw new Error((data && (data.error || data.message)) || 'Unknown error from Google Sheets');
                }
            })
            .catch(error => {
                console.error('Error saving to Google Sheets:', error);

                // Log additional details for debugging
                if (error instanceof TypeError && error.message === 'Failed to fetch') {
                    console.warn('This error might be caused by network issues or CORS restrictions.');
                    showMessage(`❌ Network error: Unable to reach the server. Please check your internet connection or contact support.`, 'error');
                } else {
                    showMessage(`❌ Error saving order to Google Sheets: ${error.message}\n\nPlease try again or contact support.`, 'error');
                }
            })
            .finally(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            });
        }
        
        /**
         * Clear form and reset state
         */
        function clearForm() {
            if (confirm('Are you sure you want to clear all data? This will remove any unsaved changes.')) {
                document.getElementById('combinedForm').reset();
                
                // Reset state
                hasFabricOrder = false;
                hasTailoringOrder = false;
                
                // Clear hidden fields
                document.getElementById('fabric_order_id').value = '';
                document.getElementById('tailoring_order_id').value = '';
                
                // Reset status displays
                updateOrderStatus('fabric', 0, '');
                updateOrderStatus('tailoring', 0, '');
                
                // Clear sessionStorage
                sessionStorage.removeItem('combinedOrderData');
                
                // Reset form state
                document.getElementById('combinedForm').style.opacity = '1';
                document.getElementById('combinedForm').style.pointerEvents = 'auto';
                
                setDefaultDate();
                updateTotals();
                updateSaveButtonState();
                hideMessage();
                
                showMessage('🔄 Form cleared successfully', 'info');
            }
        }
        
        /**
         * Show message to user
         */
        function showMessage(text, type = 'info') {
            const messageEl = document.getElementById('message');
            messageEl.innerHTML = text;
            messageEl.className = `message ${type}`;
            messageEl.classList.remove('hidden');
            
            // Auto-hide success and info messages
            if (type === 'success' || type === 'info') {
                setTimeout(hideMessage, 5000);
            }
        }
        
        /**
         * Hide message
         */
        function hideMessage() {
            document.getElementById('message').classList.add('hidden');
        }
        
        // Initialize default values
        setDefaultDate();
        updateTotals();
        updateSaveButtonState();