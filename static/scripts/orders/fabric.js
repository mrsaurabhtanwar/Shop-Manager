// Fabric Orders Management - JavaScript
// Author: Assistant
// Date: 2025

// TODO: Replace with your Google Apps Script Web App URL
// You get this URL after deploying your Apps Script as a web app
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjSO7ZIe0-GR5hRmsVWznWptRgfhouGen_6HM4ZODcerywXAvrym9usyrpFd429dzK/exec';

// Global variables
let fabricItemCounter = 0;

// Brand names array
const brandNames = [
    '', 'Raymond', 'Peter England', 'Louis Philippe', 'Van Heusen', 'Arrow', 
    'Allen Solly', 'Blackberrys', 'Park Avenue', 'ColorPlus', 'Zodiac', 
    'Siyaram', 'Donear', 'Bombay Rayon', 'Graviera', 'Dinesh Suitings',
    'Arvind', 'Vimal', 'Reid & Taylor', 'Digjam', 'Other'
];

// Initialize the form when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
    loadDataFromURL(); // Load data from URL parameters if coming from fabric_tailor
});

/**
 * Load customer data from URL parameters (when coming from fabric_tailor form)
 */
function loadDataFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('return_to_combined') === 'true') {
        // Auto-populate form fields with data from fabric_tailor
        if (urlParams.get('customer_name')) {
            document.getElementById('customer_name').value = urlParams.get('customer_name');
        }
        if (urlParams.get('contact')) {
            document.getElementById('contact_number').value = urlParams.get('contact');
        }
        if (urlParams.get('customer_type')) {
            document.getElementById('customer_type').value = urlParams.get('customer_type');
        }
        if (urlParams.get('order_date')) {
            document.getElementById('purchase_date').value = urlParams.get('order_date');
        }
        if (urlParams.get('sessions')) {
            document.getElementById('session').value = urlParams.get('sessions');
        }
        if (urlParams.get('notes')) {
            document.getElementById('note').value = urlParams.get('notes');
        }
        
        // Store master order ID and expected fabric ID for linked ordering
        if (urlParams.get('master_order_id')) {
            sessionStorage.setItem('master_order_id', urlParams.get('master_order_id'));
        }
        if (urlParams.get('expected_fabric_id')) {
            sessionStorage.setItem('expected_fabric_id', urlParams.get('expected_fabric_id'));
        }
        // If address param was passed, persist it to sessionStorage for combined form
        if (urlParams.get('address')) {
            try { sessionStorage.setItem('combinedOrderAddress', decodeURIComponent(urlParams.get('address'))); } catch(e) { sessionStorage.setItem('combinedOrderAddress', urlParams.get('address')); }
        }
        
        // Show message to user
        displayFlashMessage('Customer data loaded from combined order form. Fabric will be linked to master order.', 'info');
    }
}

/**
 * Display flash message to user
 */
function displayFlashMessage(message, type = 'info') {
    const container = document.getElementById('flash-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.textContent = message;
    
    container.innerHTML = '';
    container.appendChild(messageDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (container.contains(messageDiv)) {
            container.removeChild(messageDiv);
        }
    }, 5000);
}

/**
 * Initialize the form with default values
 */
function initializeForm() {
    // Set today's date
    document.getElementById('purchase_date').value = new Date().toISOString().split('T')[0];
    
    // Add initial fabric item
    addFabricItem();
    
    // Update order total
    updateOrderTotal();

    // Prevent zoom on input focus for iOS
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (window.innerWidth <= 768) {
                input.style.fontSize = '16px';
            }
        });
    });
}

/**
 * Setup event listeners for form validation
 */
function setupEventListeners() {
    document.getElementById('customer_name').addEventListener('input', updateOrderTotal);
    document.getElementById('customer_type').addEventListener('change', updateOrderTotal);
    
    // Form submission handler
    document.getElementById('fabric-form').addEventListener('submit', handleFormSubmission);
}

/**
 * Add a new fabric item to the form
 */
function addFabricItem() {
    fabricItemCounter++;
    const container = document.getElementById('fabric-items-container');
    
    const fabricItem = document.createElement('div');
    fabricItem.className = 'fabric-item';
    fabricItem.id = `fabric-item-${fabricItemCounter}`;
    
    fabricItem.innerHTML = `
        <h4>Fabric Item ${fabricItemCounter}</h4>
        ${fabricItemCounter > 1 ? `<button type="button" class="remove-fabric" onclick="removeFabricItem(${fabricItemCounter})">&times;</button>` : ''}
        
        <div class="form-grid">
            <div class="form-group">
                <label for="brand_name_${fabricItemCounter}">Brand Name:</label>
                <select id="brand_name_${fabricItemCounter}" name="brand_name_${fabricItemCounter}">
                    ${brandNames.map(brand => `<option value="${brand}">${brand || '-- Select Brand --'}</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label for="fabric_for_${fabricItemCounter}">Fabric For: <span class="required">*</span></label>
                <select id="fabric_for_${fabricItemCounter}" name="fabric_for_${fabricItemCounter}" required>
                    <option value="">-- Select --</option>
                    <option value="Shirt">Shirt</option>
                    <option value="Pant">Pant</option>
                    <option value="Dress">Dress</option>
                    <option value="Kurta">Kurta</option>
                    <option value="cout">Coat</option>
                </select>
            </div>

            <div class="form-group">
                <label for="fabric_type_${fabricItemCounter}">Fabric Type: <span class="required">*</span></label>
                <select id="fabric_type_${fabricItemCounter}" name="fabric_type_${fabricItemCounter}" required>
                    <option value="">-- Select --</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Linen">Linen</option>
                    <option value="Silk">Silk</option>
                    <option value="Polyester">Polyester</option>
                    <option value="Wool">Wool</option>
                    <option value="Chiffon">Chiffon</option>
                    <option value="Georgette">Georgette</option>
                    <option value="Crepe">Crepe</option>
                    <option value="Satin">Satin</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div class="form-group">
                <label for="fabric_color_${fabricItemCounter}">Fabric Color:</label>
                <select id="fabric_color_${fabricItemCounter}" name="fabric_color_${fabricItemCounter}">
                    <option value="">-- Select Color --</option>
                    <option>White</option>
                    <option>Black</option>
                    <option>Red</option>
                    <option>Blue</option>
                    <option>Green</option>
                    <option>Yellow</option>
                    <option>Pink</option>
                    <option>Purple</option>
                    <option>Brown</option>
                    <option>Gray</option>
                    <option>Navy</option>
                    <option>Beige</option>
                    <option>Orange</option>
                    <option>Maroon</option>
                    <option>Teal</option>
                    <option>Other</option>
                </select>
            </div>

            <div class="form-group">
                <label for="quantity_meters_${fabricItemCounter}">Quantity (meters): <span class="required">*</span></label>
                <input type="number" id="quantity_meters_${fabricItemCounter}" name="quantity_meters_${fabricItemCounter}" step="0.01" min="0.01" required onchange="updateFabricTotal(${fabricItemCounter})">
            </div>

            <div class="form-group">
                <label for="price_per_meter_${fabricItemCounter}">Price per Meter: <span class="required">*</span></label>
                <input type="number" id="price_per_meter_${fabricItemCounter}" name="price_per_meter_${fabricItemCounter}" step="0.01" min="0.01" required onchange="updateFabricTotal(${fabricItemCounter})">
            </div>
        </div>
        
        <div class="fabric-total" id="fabric-total-${fabricItemCounter}">
            Fabric Total: ₹0.00
        </div>
    `;
    
    container.appendChild(fabricItem);
    updateOrderTotal();
}

/**
 * Remove a fabric item from the form
 */
function removeFabricItem(itemId) {
    const item = document.getElementById(`fabric-item-${itemId}`);
    if (item) {
        item.remove();
        updateOrderTotal();
    }
}

/**
 * Update the total for a specific fabric item
 */
function updateFabricTotal(itemId) {
    const quantity = parseFloat(document.getElementById(`quantity_meters_${itemId}`).value) || 0;
    const price = parseFloat(document.getElementById(`price_per_meter_${itemId}`).value) || 0;
    const total = (quantity * price).toFixed(2);
    
    document.getElementById(`fabric-total-${itemId}`).textContent = `Fabric Total: ₹${total}`;
    updateOrderTotal();
}

/**
 * Calculate the order total and return the value
 */
function calculateOrderTotal() {
    let orderTotal = 0;
    const fabricItems = document.querySelectorAll('.fabric-item');
    
    fabricItems.forEach(item => {
        const itemId = item.id.split('-')[2];
        const quantity = parseFloat(document.getElementById(`quantity_meters_${itemId}`).value) || 0;
        const price = parseFloat(document.getElementById(`price_per_meter_${itemId}`).value) || 0;
        orderTotal += (quantity * price);
    });
    
    return orderTotal.toFixed(2);
}

/**
 * Update the overall order total
 */
function updateOrderTotal() {
    let orderTotal = 0;
    const fabricItems = document.querySelectorAll('.fabric-item');
    
    fabricItems.forEach(item => {
        const itemId = item.id.split('-')[2];
        const quantity = parseFloat(document.getElementById(`quantity_meters_${itemId}`).value) || 0;
        const price = parseFloat(document.getElementById(`price_per_meter_${itemId}`).value) || 0;
        orderTotal += (quantity * price);
    });
    
    document.getElementById('order-total-display').textContent = `Total: ₹${orderTotal.toFixed(2)}`;
    document.getElementById('order-total-section').style.display = orderTotal > 0 ? 'block' : 'none';
    
    // Update submit button state
    const submitBtn = document.getElementById('submit-btn');
    const customerName = document.getElementById('customer_name').value.trim();
    const customerType = document.getElementById('customer_type').value;
    
    if (orderTotal > 0 && customerName && customerType) {
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = '#007bff';
    } else {
        submitBtn.disabled = true;
        submitBtn.style.backgroundColor = '#cccccc';
    }
}

/**
 * Handle form submission to Google Sheets
 */
async function handleFormSubmission(e) {
    e.preventDefault();
    
    // Validate Google Script URL
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
        showMessage('Please configure the Google Apps Script URL in the JavaScript file.', 'danger');
        return;
    }
    
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    showLoading(true);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
        // Prepare form data
        const formData = new FormData(document.getElementById('fabric-form'));
        
        // Convert FormData to URLSearchParams for better compatibility
        const params = new URLSearchParams();
        for (let [key, value] of formData.entries()) {
            params.append(key, value);
        }
        
        // Send data to Google Apps Script
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            
            // Add success animation to the form
            document.querySelector('.form-section').classList.add('success-animation');
            setTimeout(() => {
                document.querySelector('.form-section').classList.remove('success-animation');
            }, 600);
            
            // Check if we need to redirect back to fabric_tailor
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('return_to_combined') === 'true') {
                // Calculate total price and prepare data for return
                const totalPrice = calculateOrderTotal();
                
                // Get the expected fabric ID from storage or generate one
                let fabricOrderId = sessionStorage.getItem('expected_fabric_id') || 'F-' + Date.now();
                
                setTimeout(() => {
                    // Redirect back to fabric_tailor with order data
                    const returnData = new URLSearchParams({
                        fabric_order_added: 'true',
                        fabric_price: totalPrice,
                        fabric_order_id: fabricOrderId,
                        master_order_id: sessionStorage.getItem('master_order_id') || '',
                        customer_name: urlParams.get('customer_name') || '',
                        contact: urlParams.get('contact') || '',
                        customer_type: urlParams.get('customer_type') || '',
                        order_date: urlParams.get('order_date') || '',
                        sessions: urlParams.get('sessions') || '',
                        notes: urlParams.get('notes') || ''
                    });

                    // Clear the session storage keys used for linking
                    sessionStorage.removeItem('master_order_id');
                    sessionStorage.removeItem('expected_fabric_id');

                    // Build return URL and include address if present
                    let returnUrl = `/orders/fabric-tailor?${returnData.toString()}`;
                    // If the combined address was present in sessionStorage, append it
                    const storedAddr = sessionStorage.getItem('combinedOrderAddress');
                    if (storedAddr) {
                        const sep = returnUrl.includes('?') ? '&' : '?';
                        returnUrl = returnUrl + sep + 'address=' + encodeURIComponent(storedAddr);
                    }

                    window.location.href = returnUrl;
                }, 2000);
            } else {
                // Clear form after successful submission (normal flow)
                setTimeout(() => {
                    clearForm();
                }, 2000);
            }
            
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('Error saving order: ' + error.message, 'danger');
    } finally {
        // Reset button state
        showLoading(false);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

/**
 * Clear the form and reset to initial state
 */
function clearForm() {
    document.getElementById('fabric-form').reset();
    document.getElementById('purchase_date').value = new Date().toISOString().split('T')[0];
    
    // Clear all fabric items and start fresh
    const container = document.getElementById('fabric-items-container');
    container.innerHTML = '';
    fabricItemCounter = 0; // Reset counter for new order
    addFabricItem(); // Add one fresh fabric item
    updateOrderTotal();
    
    // Hide order total section for new order
    document.getElementById('order-total-section').style.display = 'none';
    
    showMessage('Form cleared. Ready for new order.', 'info');
}

/**
 * Show loading state
 */
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (!loadingElement) {
        // Create loading element if it doesn't exist
        const loading = document.createElement('div');
        loading.id = 'loading';
        loading.className = 'loading';
        loading.innerHTML = `
            <div class="spinner"></div>
            <p>Saving to Google Sheets...</p>
        `;
        document.querySelector('.form-section').appendChild(loading);
    }
    
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

/**
 * Show flash messages with auto-hide
 */
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.alert');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    // Auto-hide after 7 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        }
    }, 7000);
    
    // Scroll to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Validate form before submission
 */
function validateForm() {
    const customerName = document.getElementById('customer_name').value.trim();
    const customerType = document.getElementById('customer_type').value;
    
    if (!customerName) {
        showMessage('Please enter customer name.', 'warning');
        document.getElementById('customer_name').focus();
        return false;
    }
    
    if (!customerType) {
        showMessage('Please select customer type.', 'warning');
        document.getElementById('customer_type').focus();
        return false;
    }
    
    // Validate fabric items
    const fabricItems = document.querySelectorAll('.fabric-item');
    let validFabricItems = 0;
    
    fabricItems.forEach(item => {
        const itemId = item.id.split('-')[2];
        const fabricFor = document.getElementById(`fabric_for_${itemId}`).value;
        const fabricType = document.getElementById(`fabric_type_${itemId}`).value;
        const quantity = parseFloat(document.getElementById(`quantity_meters_${itemId}`).value);
        const price = parseFloat(document.getElementById(`price_per_meter_${itemId}`).value);
        
        if (fabricFor && fabricType && quantity > 0 && price > 0) {
            validFabricItems++;
        }
    });
    
    if (validFabricItems === 0) {
        showMessage('Please add at least one complete fabric item with all required fields.', 'warning');
        return false;
    }
    
    return true;
}

/**
 * Format currency display
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Auto-save form data to localStorage (optional feature)
 */
function autoSaveForm() {
    const formData = {
        customer_name: document.getElementById('customer_name').value,
        contact_number: document.getElementById('contact_number').value,
        customer_type: document.getElementById('customer_type').value,
        payment_status: document.getElementById('payment_status').value,
        session: document.getElementById('session').value,
        note: document.getElementById('note').value
    };
    
    localStorage.setItem('fabricOrderDraft', JSON.stringify(formData));
}

/**
 * Load auto-saved form data (optional feature)
 */
function loadAutoSavedForm() {
    const savedData = localStorage.getItem('fabricOrderDraft');
    if (savedData) {
        try {
            const formData = JSON.parse(savedData);
            Object.keys(formData).forEach(key => {
                const element = document.getElementById(key);
                if (element && formData[key]) {
                    element.value = formData[key];
                }
            });
            showMessage('Auto-saved data loaded.', 'info');
        } catch (error) {
            console.error('Error loading auto-saved data:', error);
        }
    }
}

/**
 * Clear auto-saved data
 */
function clearAutoSavedData() {
    localStorage.removeItem('fabricOrderDraft');
}

// Optional: Auto-save form data every 30 seconds
setInterval(() => {
    const customerName = document.getElementById('customer_name').value.trim();
    if (customerName) {
        autoSaveForm();
    }
}, 30000);

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (validateForm()) {
            document.getElementById('fabric-form').dispatchEvent(new Event('submit'));
        }
    }
    
    // Ctrl+R or Cmd+R to reset (with confirmation)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (confirm('Are you sure you want to clear the form?')) {
            clearForm();
        }
    }
});


// Add this to your existing fabric.js or at the end of your script section

// Handle prefilled data from combined page
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Set form action to the web app URL
    const webAppUrl = urlParams.get('webAppUrl') || 'YOUR_WEB_APP_URL_HERE';
    document.getElementById('fabric-form').action = webAppUrl;
    
    // Store return URL
    document.getElementById('returnUrl').value = urlParams.get('returnUrl') || '';
    
    // Prefill customer data if coming from combined page
    if (urlParams.get('cust_name')) {
        document.getElementById('customer_name').value = urlParams.get('cust_name');
    }
    if (urlParams.get('contact')) {
        document.getElementById('contact_number').value = urlParams.get('contact');
    }
    if (urlParams.get('order_date')) {
        document.getElementById('purchase_date').value = urlParams.get('order_date');
    }
});

// Modify your existing form submission to redirect properly
document.getElementById('fabric-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Your existing submission logic here...
    // After successful save, calculate total price and redirect
    
    const totalPrice = calculateTotalPrice(); // Your existing function
    const returnUrl = document.getElementById('returnUrl').value;
    
    if (returnUrl) {
        // Redirect back to combined page with fabric data
        window.location.href = `${returnUrl}?fabric_price=${totalPrice}&fabric_order_id=FAB${Date.now()}`;
    }
});

// Support for address field (from combined form)
function loadAddressFromURLOrStorage() {
    const urlParams = new URLSearchParams(window.location.search);
    const addrParam = urlParams.get('address');
    if (addrParam) {
        try { document.getElementById('address').value = decodeURIComponent(addrParam); } catch(e){}
    } else {
        const stored = sessionStorage.getItem('combinedOrderAddress');
        if (stored) document.getElementById('address').value = stored;
    }
}

function includeAddressInReturn(url) {
    const addr = document.getElementById('address') ? document.getElementById('address').value.trim() : '';
    if (!addr) return url;
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 'address=' + encodeURIComponent(addr);
}

// Call loader on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadAddressFromURLOrStorage, 10);
});

// When redirecting back to combined page after saving, ensure address is included
// Example: if code does window.location.href = BASE_URL + '/orders/fabric?return_to_combined=true';
// Change to includeAddressInReturn(BASE_URL + '/orders/fabric?return_to_combined=true')