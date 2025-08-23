// Handle form submission
document.getElementById('otherExpenseForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    if (!data.expenseName || !data.expenseDate || !data.amount) {
        showMessage('Please fill Expense Name, Date and Amount', 'error');
        submitBtn.disabled = false;
        return;
    }

    data.timestamp = new Date().toISOString();

    const payload = JSON.stringify({ type: 'other', data });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    fetch('https://script.google.com/macros/s/AKfycbxT5VTEBWxliIxm3P9LgtaNgKjiucgGa75jyAIExtHGRKTlUMspaCrbg5d4QdIdmtOY/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: payload,
        signal: controller.signal
    })
    .then(async response => {
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(result => {
        if (result && result.success) {
            showMessage('Other expense recorded successfully!', 'success');
            this.reset();
        } else {
            showMessage('Error: ' + (result?.error || result?.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error submitting other expense:', error);
        showMessage('Failed to submit data. Please try again.', 'error');
    })
    .finally(() => {
        clearTimeout(timeout);
        submitBtn.disabled = false;
    });
});

// Set today's date as default
// Set today's date as default
document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];

// Top message helper (reuse across expense forms)
function showMessage(text, type='info') {
    const el = document.getElementById('message');
    if (!el) { alert(text); return; }
    el.style.display = 'block';
    el.textContent = text;
    el.style.background = type === 'success' ? '#e6ffed' : type === 'error' ? '#ffe6e6' : '#eef3ff';
    el.style.color = type === 'success' ? '#1a6f35' : type === 'error' ? '#8a1a1a' : '#0b3a66';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}