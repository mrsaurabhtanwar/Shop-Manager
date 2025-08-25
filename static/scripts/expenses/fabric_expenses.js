/// Calculate total price automatically 
const quantityInput=document.getElementById('quantity');
const pricePerMeterInput=document.getElementById('pricePerMeter');
const totalPriceInput=document.getElementById('totalPrice');

function calculateTotal() {
    const quantity=parseFloat(quantityInput.value) || 0;
    const pricePerMeter=parseFloat(pricePerMeterInput.value) || 0;
    const total=quantity * pricePerMeter;
    totalPriceInput.value=total.toFixed(2);
}

quantityInput.addEventListener('input', calculateTotal);
pricePerMeterInput.addEventListener('input', calculateTotal);

// Handle form submission
document.getElementById('fabricForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Submitting...';
    }

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    // Basic validation
    if (!data.supplier || !data.purchaseDate || !data.fabricBrand) {
        showMessage('Please fill Supplier, Purchase Date and Fabric Brand', 'error');
        submitBtn.disabled = false;
        return;
    }

    // Add current timestamp
    data.timestamp = new Date().toISOString();

    const payload = JSON.stringify({ type: 'fabric', data });

    // Use text/plain to avoid CORS preflight; GAS doPost reads e.postData.contents
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    fetch('https://script.google.com/macros/s/AKfycbxT5VTEBWxliIxm3P9LgtaNgKjiucgGa75jyAIExtHGRKTlUMspaCrbg5d4QdIdmtOY/exec', {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script often requires no-cors; response will be opaque
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: payload,
        signal: controller.signal
    })
    .then(async response => {
        clearTimeout(timeout);
        // When mode: 'no-cors' is used the browser returns an opaque response we cannot inspect.
        // Treat opaque responses as success (data is still delivered to GAS). If it's not opaque,
        // check status and try to parse JSON.
        if (response.type === 'opaque') return { success: true };
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        try {
            return await response.json();
        } catch (e) {
            // If JSON parsing fails, assume success (GAS sometimes responds with empty body)
            return { success: true };
        }
    })
    .then(result => {
        if (result && result.success) {
            showMessage('Fabric purchase recorded successfully!', 'success');
            this.reset();
            totalPriceInput.value = '';
        } else {
            showMessage('Error: ' + (result?.error || result?.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error submitting fabric expense:', error);
        showMessage('Failed to submit data. Please try again.', 'error');
    })
    .finally(() => {
        clearTimeout(timeout);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});

// Top message helper
function showMessage(text, type='info') {
    const el = document.getElementById('message');
    if (!el) { alert(text); return; }
    el.style.display = 'block';
    el.textContent = text;
    el.style.background = type === 'success' ? '#e6ffed' : type === 'error' ? '#ffe6e6' : '#eef3ff';
    el.style.color = type === 'success' ? '#1a6f35' : type === 'error' ? '#8a1a1a' : '#0b3a66';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
    // Scroll message into view so user sees it immediately
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
}