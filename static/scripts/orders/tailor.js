// Tailoring Orders Management - JavaScript Functions
// This file contains all the JavaScript functionality for the tailoring orders system

// ============= CONFIGURATION =============
// Replace this URL with your Google Apps Script web app URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4bt4ssQH0Yo3qreX0ZeNblIrVkyf2PwI3M3lcnpV9zPh2niDuYDvJSTmZFmxFTX6u/exec';

// ============= GLOBAL VARIABLES =============
let selectedGarments = new Set();

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
    loadDataFromURL(); // Load data from URL parameters if coming from fabric_tailor
    setTimeout(loadAddressFromURLOrStorage, 10);
});

/**
 * Load customer data from URL parameters (when coming from fabric_tailor form)
 */
function loadDataFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('return_to_combined') === 'true') {
        // Wait for DOM elements to be available
        setTimeout(() => {
            // Auto-populate form fields with data from fabric_tailor
            if (urlParams.get('customer_name')) {
                const customerNameField = document.getElementById('customer_name');
                if (customerNameField) {
                    customerNameField.value = urlParams.get('customer_name');
                }
            }
            
            if (urlParams.get('contact')) {
                const contactField = document.getElementById('contact_info');
                if (contactField) {
                    contactField.value = urlParams.get('contact');
                }
            }
            
            if (urlParams.get('customer_type')) {
                const customerTypeField = document.getElementById('customer_type');
                if (customerTypeField) {
                    customerTypeField.value = urlParams.get('customer_type');
                }
            }
            
            if (urlParams.get('order_date')) {
                const orderDateField = document.getElementById('order_date');
                if (orderDateField) {
                    orderDateField.value = urlParams.get('order_date');
                }
            }
            
            if (urlParams.get('sessions')) {
                const sessionField = document.getElementById('session');
                if (sessionField) {
                    sessionField.value = urlParams.get('sessions');
                }
            }
            
            if (urlParams.get('notes')) {
                const noteField = document.getElementById('note');
                if (noteField) {
                    noteField.value = urlParams.get('notes');
                }
            }
            
            // Store master order ID and expected tailor ID for linked ordering
            if (urlParams.get('master_order_id')) {
                sessionStorage.setItem('master_order_id', urlParams.get('master_order_id'));
            }
            if (urlParams.get('expected_tailor_id')) {
                sessionStorage.setItem('expected_tailor_id', urlParams.get('expected_tailor_id'));
            }
            // Persist address param to sessionStorage if provided
            if (urlParams.get('address')) {
                try { sessionStorage.setItem('combinedOrderAddress', decodeURIComponent(urlParams.get('address'))); } catch(e) { sessionStorage.setItem('combinedOrderAddress', urlParams.get('address')); }
            }
            
            // Show message to user
            showResponseMessage('✅ Customer data loaded from combined order form. Tailoring will be linked to master order.', 'info');
        }, 200); // Wait 200ms for DOM to be fully ready
    }
}

function initializeForm() {
    // Set today's date as default
    document.getElementById('order_date').valueAsDate = new Date();
    
    // Reset all garment selections
    ['shirt', 'pant', 'other'].forEach(garmentType => {
        document.getElementById(`${garmentType}_quantity`).value = '1';
        document.getElementById(`${garmentType}_fabric_meters`).value = '0';
    });
}

function setupEventListeners() {
    // Form submission handler
    document.getElementById('tailoring-form').addEventListener('submit', handleFormSubmission);
    
    // Auto-calculate delivery date
    document.getElementById('order_date').addEventListener('change', function() {
        if (this.value && !document.getElementById('delivery_date').value) {
            const orderDate = new Date(this.value);
            const deliveryDate = new Date(orderDate);
            deliveryDate.setDate(orderDate.getDate() + 7);
            
            document.getElementById('delivery_date').value = deliveryDate.toISOString().split('T')[0];
            showResponseMessage('Delivery date set to 7 days from order date. You can modify if needed.', 'info');
        }
    });
}

// Address support: load address from URL or session, and include in return URLs
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

// ============= FORM SUBMISSION HANDLING =============
async function handleFormSubmission(e) {
    e.preventDefault();
    
    // Validation
    if (!validateForm()) {
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    setButtonLoading(submitBtn, true);

    try {
        // Prepare form data
        const formData = new FormData(e.target);
        const orderData = {};
        
        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            orderData[key] = value;
        }

        // Add timestamp
        orderData.timestamp = new Date().toISOString();

        // Send to Google Sheets
        await sendToGoogleSheets(orderData);

        // Use expected tailor ID if available for linked ordering
        const expectedTailorId = sessionStorage.getItem('expected_tailor_id');
        const masterOrderId = sessionStorage.getItem('master_order_id');
        const actualOrderId = expectedTailorId || ('T' + Date.now());

        // Show success message with linked order information
        if (masterOrderId && expectedTailorId) {
            showResponseMessage(`🎉 Tailoring Order successful! Order ID: ${actualOrderId} (Linked to Master Order: ${masterOrderId})\nData has been added to your Google Sheets.`, 'success');
        } else {
            showResponseMessage('🎉 Order saved successfully! Data has been added to your Google Sheets.', 'success');
        }
        
        // Check if we need to redirect back to fabric_tailor
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('return_to_combined') === 'true') {
            // Use expected tailor ID if available for linked ordering
            const expectedTailorId = sessionStorage.getItem('expected_tailor_id');
            const masterOrderId = sessionStorage.getItem('master_order_id');
            const actualOrderId = expectedTailorId || ('T' + Date.now());
            
            // Calculate total price (from tailoring_charges field)
            const tailoringPrice = parseFloat(document.getElementById('price').value) || 0;
            
            setTimeout(() => {
                // Store order data in sessionStorage for fabric_tailor form
                const returnOrderData = {
                    order_id: actualOrderId,
                    customer_name: orderData.customer_name || urlParams.get('customer_name') || '',
                    customer_type: orderData.customer_type || urlParams.get('customer_type') || '',
                    order_date: orderData.order_date || urlParams.get('order_date') || '',
                    session: orderData.session || urlParams.get('sessions') || '',
                    note: orderData.note || urlParams.get('notes') || '',
                    price: tailoringPrice,
                    master_order_id: masterOrderId
                };
                
                sessionStorage.setItem('tailor_order_data', JSON.stringify(returnOrderData));
                
                // Clean up linked order session storage
                sessionStorage.removeItem('expected_tailor_id');
                sessionStorage.removeItem('master_order_id');
                
                // Redirect back to fabric_tailor with order data
                window.location.href = includeAddressInReturn(`/orders/fabric-tailor?tailor_returned=true&order_id=${actualOrderId}&master_order_id=${masterOrderId || ''}`);
            }, 1500); // Reduced timeout to make transition faster
        } else {
            // Clear form after successful submission (normal flow)
            clearForm();
        }
        
    } catch (error) {
        console.error('Error saving order:', error);
        showResponseMessage('❌ Error saving order. Please check your internet connection and try again.', 'error');
    } finally {
        // Reset button state
        setButtonLoading(submitBtn, false);
    }
}

async function sendToGoogleSheets(orderData) {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Apps Script
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
    });
    
    // Note: With no-cors mode, we can't read the response
    // We assume success if no error is thrown
    return response;
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = '⏳ Saving to Google Sheets...';
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        button.innerHTML = '💾 Save Tailoring Order';
    }
}

// ============= FORM VALIDATION =============
function validateForm() {
    const customerName = document.getElementById('customer_name').value.trim();
    const garmentType = document.getElementById('garment_type').value;
    const price = parseFloat(document.getElementById('price').value);
    const orderDate = document.getElementById('order_date').value;
    
    // Basic validation
    if (!customerName) {
        showResponseMessage('❌ Customer name is required!', 'error');
        document.getElementById('customer_name').focus();
        return false;
    }
    
    if (!garmentType) {
        showResponseMessage('❌ Please select at least one garment type!', 'error');
        document.querySelector('.garment-selection-container').scrollIntoView({ behavior: 'smooth' });
        return false;
    }
    
    if (price <= 0 || isNaN(price)) {
        showResponseMessage('❌ Price must be greater than 0!', 'error');
        document.getElementById('price').focus();
        return false;
    }

    if (!orderDate) {
        showResponseMessage('❌ Order date is required!', 'error');
        document.getElementById('order_date').focus();
        return false;
    }

    // Garment-specific validation
    if (selectedGarments.has('shirt')) {
        const quantity = document.getElementById('shirt_quantity').value;
        const chest = document.getElementById('shirt_chest').value;
        
        if (!quantity || quantity < 1) {
            showResponseMessage('❌ Please enter valid quantity for shirt!', 'error');
            openMeasurementPopup('shirt');
            return false;
        }
        
        if (!chest || chest <= 0) {
            showResponseMessage('❌ Please enter chest measurement for shirt!', 'error');
            openMeasurementPopup('shirt');
            return false;
        }
    }
    
    if (selectedGarments.has('pant')) {
        const quantity = document.getElementById('pant_quantity').value;
        const waist = document.getElementById('pant_waist').value;
        
        if (!quantity || quantity < 1) {
            showResponseMessage('❌ Please enter valid quantity for pant!', 'error');
            openMeasurementPopup('pant');
            return false;
        }
        
        if (!waist || waist <= 0) {
            showResponseMessage('❌ Please enter waist measurement for pant!', 'error');
            openMeasurementPopup('pant');
            return false;
        }
    }

    if (selectedGarments.has('other')) {
        const quantity = document.getElementById('other_quantity').value;
        
        if (!quantity || quantity < 1) {
            showResponseMessage('❌ Please enter valid quantity for other garment!', 'error');
            openMeasurementPopup('other');
            return false;
        }
    }

    return true;
}

// ============= MEASUREMENT POPUP SYSTEM =============
function openMeasurementPopup(garmentType) {
    let popupContent = '';
    let title = '';
    let icon = '';
    
    switch(garmentType) {
        case 'shirt':
            title = 'Shirt Measurements';
            icon = '👔';
            popupContent = createShirtMeasurementForm();
            break;
        case 'pant':
            title = 'Pant Measurements';
            icon = '👖';
            popupContent = createPantMeasurementForm();
            break;
        case 'other':
            title = 'Other Garment';
            icon = '👕';
            popupContent = createOtherGarmentForm();
            break;
        default:
            return;
    }

    // Create popup overlay
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'popup-overlay';
    popupOverlay.id = 'measurementPopup';
    
    popupOverlay.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="closeMeasurementPopup()">×</button>
            <div class="popup-header">
                <span style="font-size: 2.5rem;">${icon}</span>
                <h3 class="popup-title">${title}</h3>
            </div>
            ${popupContent}
            <div class="popup-actions">
                <button onclick="saveMeasurements('${garmentType}')" class="btn btn-success">
                    💾 Save Measurements
                </button>
                <button onclick="unselectGarment('${garmentType}')" class="btn btn-danger">
                    🗑️ Remove Selection
                </button>
                <button onclick="closeMeasurementPopup()" class="btn btn-secondary">
                    ❌ Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popupOverlay);
    
    // Add click outside to close
    popupOverlay.addEventListener('click', function(e) {
        if (e.target === popupOverlay) {
            closeMeasurementPopup();
        }
    });
    
    // Focus on first input
    setTimeout(() => {
        const firstInput = popupOverlay.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function createShirtMeasurementForm() {
    const currentQuantity = document.getElementById('shirt_quantity').value || '1';
    const currentFabric = document.getElementById('shirt_fabric_meters').value || '';
    
    return `
        <div class="quantity-fabric-row">
            <div class="measurement-field">
                <label>👕 Quantity (pieces): <span class="required">*</span></label>
                <input type="number" id="popup_shirt_quantity" min="1" max="50" value="${currentQuantity}" placeholder="How many shirts?" required>
            </div>
            <div class="measurement-field">
                <label>📏 Tailoring Charges:</label>
                <input type="number" id="popup_shirt_fabric_meters" step="0.25" min="0" max="100" value="${currentFabric}" placeholder="Tailoring Charges">
            </div>
        </div>
        
        <div class="measurement-grid">
            <div class="measurement-field">
                <label>📐 Chest (inches): <span class="required">*</span></label>
                <input type="number" id="popup_shirt_chest" step="0.5" min="20" max="80" value="${document.getElementById('shirt_chest').value || ''}" placeholder="Chest measurement" required>
            </div>
            <div class="measurement-field">
                <label>👤 Shoulder (inches):</label>
                <input type="number" id="popup_shirt_shoulder" step="0.5" min="10" max="30" value="${document.getElementById('shirt_shoulder').value || ''}" placeholder="Shoulder width">
            </div>
            <div class="measurement-field">
                <label>💪 Sleeve Length (inches):</label>
                <input type="number" id="popup_shirt_sleeve" step="0.5" min="15" max="40" value="${document.getElementById('shirt_sleeve').value || ''}" placeholder="Sleeve length">
            </div>
            <div class="measurement-field">
                <label>📏 Shirt Length (inches):</label>
                <input type="number" id="popup_shirt_length" step="0.5" min="20" max="50" value="${document.getElementById('shirt_length').value || ''}" placeholder="Total shirt length">
            </div>
            <div class="measurement-field">
                <label>🔗 Neck (inches):</label>
                <input type="number" id="popup_shirt_neck" step="0.25" min="10" max="25" value="${document.getElementById('shirt_neck').value || ''}" placeholder="Neck size">
            </div>
            <div class="measurement-field">
                <label>💪 Bicep (inches):</label>
                <input type="number" id="popup_shirt_bicep" step="0.25" min="8" max="25" value="${document.getElementById('shirt_bicep').value || ''}" placeholder="Bicep measurement">
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #e3f2fd, #f3e5f5); padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <small style="color: #1976d2;">💡 <strong>Tip:</strong> All measurements should be taken comfortably, not too tight or too loose.</small>
        </div>
    `;
}

function createPantMeasurementForm() {
    const currentQuantity = document.getElementById('pant_quantity').value || '1';
    const currentFabric = document.getElementById('pant_fabric_meters').value || '';
    
    return `
        <div class="quantity-fabric-row">
            <div class="measurement-field">
                <label>👖 Quantity (pieces): <span class="required">*</span></label>
                <input type="number" id="popup_pant_quantity" min="1" max="50" value="${currentQuantity}" placeholder="How many pants?" required>
            </div>
            <div class="measurement-field">
                <label>📏 Tailoring Charges:</label>
                <input type="number" id="popup_pant_fabric_meters" step="0.25" min="0" max="100" value="${currentFabric}" placeholder="Tailoring Charges">
            </div>
        </div>
        
        <div class="measurement-grid">
            <div class="measurement-field">
                <label>⭕ Waist (inches): <span class="required">*</span></label>
                <input type="number" id="popup_pant_waist" step="0.5" min="20" max="80" value="${document.getElementById('pant_waist').value || ''}" placeholder="Waist measurement" required>
            </div>
            <div class="measurement-field">
                <label>🍑 Hip (inches):</label>
                <input type="number" id="popup_pant_hip" step="0.5" min="25" max="90" value="${document.getElementById('pant_hip').value || ''}" placeholder="Hip measurement">
            </div>
            <div class="measurement-field">
                <label>📏 Inseam (inches):</label>
                <input type="number" id="popup_pant_inseam" step="0.5" min="15" max="50" value="${document.getElementById('pant_inseam').value || ''}" placeholder="Inner leg length">
            </div>
            <div class="measurement-field">
                <label>📐 Outseam (inches):</label>
                <input type="number" id="popup_pant_outseam" step="0.5" min="30" max="65" value="${document.getElementById('pant_outseam').value || ''}" placeholder="Outer leg length">
            </div>
            <div class="measurement-field">
                <label>🦵 Thigh (inches):</label>
                <input type="number" id="popup_pant_thigh" step="0.25" min="15" max="40" value="${document.getElementById('pant_thigh').value || ''}" placeholder="Thigh measurement">
            </div>
            <div class="measurement-field">
                <label>🦵 Knee (inches):</label>
                <input type="number" id="popup_pant_knee" step="0.25" min="10" max="30" value="${document.getElementById('pant_knee').value || ''}" placeholder="Knee measurement">
            </div>
            <div class="measurement-field">
                <label>👠 Bottom (inches):</label>
                <input type="number" id="popup_pant_bottom" step="0.25" min="6" max="25" value="${document.getElementById('pant_bottom').value || ''}" placeholder="Bottom opening width">
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #e8f5e8, #f1f8e9); padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <small style="color: #2e7d32;">💡 <strong>Tip:</strong> For best fit, measure existing well-fitting pants or take body measurements.</small>
        </div>
    `;
}

function createOtherGarmentForm() {
    const currentQuantity = document.getElementById('other_quantity').value || '1';
    const currentFabric = document.getElementById('other_fabric_meters').value || '';
    
    return `
        <div class="quantity-fabric-row">
            <div class="measurement-field">
                <label>👕 Quantity (pieces): <span class="required">*</span></label>
                <input type="number" id="popup_other_quantity" min="1" max="50" value="${currentQuantity}" placeholder="How many items?" required>
            </div>
            <div class="measurement-field">
                <label>📏 Tailoring Charges:</label>
                <input type="number" id="popup_other_fabric_meters" step="0.25" min="0" max="100" value="${currentFabric}" placeholder="Tailoring Charges">
            </div>
        </div>
        
        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #fff3e0, #fce4ec); border-radius: 15px; margin: 20px 0;">
            <div style="font-size: 3rem; margin-bottom: 15px;">📝</div>
            <h4 style="color: #ff6f00; margin-bottom: 10px;">General Garment Category</h4>
            <p style="color: #e65100; margin-bottom: 15px;">
                This category is for custom garments like kurtas, suits, dresses, or any other clothing items.
            </p>
            <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid #ff6f00;">
                <small style="color: #bf360c;">
                    <strong>📋 Note:</strong> Specific measurements and details can be added in the "Additional Notes" section of the main form.
                </small>
            </div>
        </div>
    `;
}

function closeMeasurementPopup() {
    const popup = document.getElementById('measurementPopup');
    if (popup) {
        popup.remove();
    }
}

function saveMeasurements(garmentType) {
    let measurementCount = 0;
    let isValid = true;
    
    if (garmentType === 'shirt') {
        // Validate required fields
        const quantity = document.getElementById('popup_shirt_quantity').value;
        const chest = document.getElementById('popup_shirt_chest').value;
        
        if (!quantity || quantity < 1) {
            showResponseMessage('❌ Please enter a valid quantity for shirts!', 'error');
            return;
        }
        
        if (!chest || chest <= 0) {
            showResponseMessage('❌ Please enter chest measurement for shirt!', 'error');
            return;
        }
        
        // Save all shirt measurements
        const measurements = ['quantity', 'fabric_meters', 'chest', 'shoulder', 'sleeve', 'length', 'neck', 'bicep'];
        measurements.forEach(measurement => {
            const value = document.getElementById(`popup_shirt_${measurement}`).value;
            document.getElementById(`shirt_${measurement}`).value = value || '';
            if (value && value.trim() !== '' && parseFloat(value) > 0) measurementCount++;
        });
        
    } else if (garmentType === 'pant') {
        // Validate required fields
        const quantity = document.getElementById('popup_pant_quantity').value;
        const waist = document.getElementById('popup_pant_waist').value;
        
        if (!quantity || quantity < 1) {
            showResponseMessage('❌ Please enter a valid quantity for pants!', 'error');
            return;
        }
        
        if (!waist || waist <= 0) {
            showResponseMessage('❌ Please enter waist measurement for pant!', 'error');
            return;
        }
        
        // Save all pant measurements
        const measurements = ['quantity', 'fabric_meters', 'waist', 'hip', 'inseam', 'outseam', 'thigh', 'knee', 'bottom'];
        measurements.forEach(measurement => {
            const value = document.getElementById(`popup_pant_${measurement}`).value;
            document.getElementById(`pant_${measurement}`).value = value || '';
            if (value && value.trim() !== '' && parseFloat(value) > 0) measurementCount++;
        });
        
    } else if (garmentType === 'other') {
        // Validate required fields
        const quantity = document.getElementById('popup_other_quantity').value;
        
        if (!quantity || quantity < 1) {
            showResponseMessage('❌ Please enter a valid quantity for other garment!', 'error');
            return;
        }
        
        // Save other garment data
        const fabric = document.getElementById('popup_other_fabric_meters').value;
        
        document.getElementById('other_quantity').value = quantity;
        document.getElementById('other_fabric_meters').value = fabric || '0';
        
        measurementCount = fabric && parseFloat(fabric) > 0 ? 2 : 1;
    }

    if (!isValid) return;

    // Update selection status
    document.getElementById(`${garmentType}_selected`).value = "1";
    selectedGarments.add(garmentType);
    
    // Update visual status
    updateGarmentStatus(garmentType, measurementCount);
    
    // Update form display
    updateSelectedGarmentsList();
    
    closeMeasurementPopup();
    
    const garmentName = garmentType.charAt(0).toUpperCase() + garmentType.slice(1);
    showResponseMessage(`✅ ${garmentName} measurements saved successfully! (${measurementCount} fields completed)`, 'success');
}

function unselectGarment(garmentType) {
    selectedGarments.delete(garmentType);
    document.getElementById(`${garmentType}_selected`).value = "0";
    
    // Clear all measurements for this garment type
    const inputs = document.querySelectorAll(`input[id^="${garmentType}_"]:not([id$="_selected"])`);
    inputs.forEach(input => {
        if (input.id.includes('quantity')) {
            input.value = '1';
        } else if (input.id.includes('fabric_meters')) {
            input.value = '0';
        } else {
            input.value = '';
        }
    });
    
    updateGarmentStatus(garmentType, 0, false);
    updateSelectedGarmentsList();
    closeMeasurementPopup();
    
    const garmentName = garmentType.charAt(0).toUpperCase() + garmentType.slice(1);
    showResponseMessage(`🗑️ ${garmentName} selection removed successfully.`, 'info');
}

// ============= UI UPDATES =============
function updateGarmentStatus(garmentType, measurementCount, isSelected = true) {
    const card = document.getElementById(`${garmentType}_card`);
    const status = document.getElementById(`${garmentType}_status`);
    
    if (isSelected || measurementCount > 0) {
        card.classList.add('selected');
        if (measurementCount > 0) {
            status.textContent = `✅ Selected (${measurementCount} fields)`;
        } else {
            status.textContent = '✅ Selected';
        }
        status.className = 'garment-status status-selected';
    } else {
        card.classList.remove('selected');
        status.textContent = 'Not Selected';
        status.className = 'garment-status status-not-selected';
    }
}

function updateSelectedGarmentsList() {
    const listContainer = document.getElementById('selected_garments_list');
    const noGarmentsText = document.getElementById('no_garments_selected');
    
    if (selectedGarments.size === 0) {
        listContainer.style.display = 'none';
        noGarmentsText.style.display = 'block';
        document.getElementById('garment_type').value = '';
        return;
    }
    
    noGarmentsText.style.display = 'none';
    listContainer.style.display = 'flex';
    
    // Create badges for selected garments
    const badges = Array.from(selectedGarments).map(garmentType => {
        const quantity = document.getElementById(`${garmentType}_quantity`).value || '1';
        const fabric = parseFloat(document.getElementById(`${garmentType}_fabric_meters`).value) || 0;
        
        let badgeText = `${garmentType.charAt(0).toUpperCase() + garmentType.slice(1)} (${quantity}×)`;
        if (fabric > 0) {
            badgeText += ` - ${fabric}m`;
        }
        
        return `<span class="garment-badge">${badgeText}</span>`;
    }).join('');
    
    listContainer.innerHTML = badges;
    
    // Update hidden input
    document.getElementById('garment_type').value = Array.from(selectedGarments).join(', ');
}

// ============= RESPONSE MESSAGES =============
function showResponseMessage(message, type = 'info', duration = 7000) {
    const container = document.getElementById('responseContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `response-message response-${type}`;
    messageDiv.innerHTML = message; // Use innerHTML to support emojis and HTML
    
    container.appendChild(messageDiv);
    
    // Trigger animation
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 400);
    }, duration);
}

// ============= UTILITY FUNCTIONS =============
function clearForm() {
    // Reset form
    document.getElementById('tailoring-form').reset();
    document.getElementById('order_date').valueAsDate = new Date();
    
    // Clear selections
    selectedGarments.clear();
    
    // Reset all garment cards
    ['shirt', 'pant', 'other'].forEach(garmentType => {
        document.getElementById(`${garmentType}_selected`).value = "0";
        updateGarmentStatus(garmentType, 0, false);
        
        // Reset quantities and fabric
        document.getElementById(`${garmentType}_quantity`).value = '1';
        document.getElementById(`${garmentType}_fabric_meters`).value = '0';
        
        // Clear measurements
        const inputs = document.querySelectorAll(`input[id^="${garmentType}_"]:not([id$="_selected"]):not([id$="_quantity"]):not([id$="_fabric_meters"])`);
        inputs.forEach(input => {
            input.value = '';
        });
    });
    
    updateSelectedGarmentsList();
    
    showResponseMessage('📝 Form cleared successfully. Ready for new order!', 'info', 3000);
}

// ============= KEYBOARD SHORTCUTS =============
document.addEventListener('keydown', function(e) {
    // Escape key to close popup
    if (e.key === 'Escape') {
        closeMeasurementPopup();
    }
    
    // Ctrl+Enter to submit form (if not in popup)
    if (e.ctrlKey && e.key === 'Enter' && !document.getElementById('measurementPopup')) {
        const submitBtn = document.getElementById('submit-btn');
        if (!submitBtn.disabled) {
            document.getElementById('tailoring-form').dispatchEvent(new Event('submit'));
        }
    }
});

// ============= EXPORT FUNCTIONS FOR GLOBAL ACCESS =============
window.openMeasurementPopup = openMeasurementPopup;
window.closeMeasurementPopup = closeMeasurementPopup;
window.saveMeasurements = saveMeasurements;
window.unselectGarment = unselectGarment;
window.clearForm = clearForm;