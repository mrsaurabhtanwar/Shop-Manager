        const PAINT_RATE = 110;
        const SHIRT_RATE = 65;
        
        document.addEventListener('DOMContentLoaded', function() {
            loadWorkerNames();
            setupCalculations();
        });
        
        function loadWorkerNames() {
            const workerSelect = document.getElementById('workerName');
            console.log('Loading worker names via WorkerAPI...');
            WorkerAPI.getWorkerNames()
                .then(result => {
                    const workerNames = Array.isArray(result) ? result : (result.data || []);
                    workerSelect.innerHTML = '<option value="">Select a worker</option>';

                    if (workerNames.length === 0) {
                        workerSelect.innerHTML = '<option value="">No workers found - Add workers first</option>';
                    } else {
                        workerNames.forEach(name => {
                            workerSelect.innerHTML += `<option value="${name}">${name}</option>`;
                        });
                    }
                })
                .catch(error => {
                    workerSelect.innerHTML = '<option value="">Error loading workers</option>';
                    console.error('Error loading worker names:', error);
                });
        }
        
        function setupCalculations() {
            const paintCount = document.getElementById('paintCount');
            const shirtCount = document.getElementById('shirtCount');
            const advanceTaken = document.getElementById('advanceTaken');
            
            [paintCount, shirtCount, advanceTaken].forEach(input => {
                input.addEventListener('input', updateCalculations);
            });
            
            updateCalculations();
        }
        
        function updateCalculations() {
            const paintCount = parseInt(document.getElementById('paintCount').value) || 0;
            const shirtCount = parseInt(document.getElementById('shirtCount').value) || 0;
            const advanceTaken = parseFloat(document.getElementById('advanceTaken').value) || 0;
            
            const paintAmount = paintCount * PAINT_RATE;
            const shirtAmount = shirtCount * SHIRT_RATE;
            const totalAmount = paintAmount + shirtAmount;
            const remainingAmount = totalAmount - advanceTaken;
            
            // Update display
            document.getElementById('paintDisplay').textContent = paintCount;
            document.getElementById('shirtDisplay').textContent = shirtCount;
            document.getElementById('paintAmount').textContent = paintAmount;
            document.getElementById('shirtAmount').textContent = shirtAmount;
            document.getElementById('totalAmount').textContent = totalAmount;
            document.getElementById('remainingAmount').textContent = remainingAmount;
        }
        
        document.getElementById('addPaymentForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const message = document.getElementById('message');
            const form = this;
            
            // Get form data
            const workerName = document.getElementById('workerName').value;
            const paintCount = parseInt(document.getElementById('paintCount').value) || 0;
            const shirtCount = parseInt(document.getElementById('shirtCount').value) || 0;
            const advanceTaken = parseFloat(document.getElementById('advanceTaken').value) || 0;
            const notes = document.getElementById('notes').value.trim();
            
            if (!workerName) {
                showMessage('Please select a worker.', 'error');
                return;
            }
            
            if (paintCount === 0 && shirtCount === 0) {
                showMessage('Please enter at least one paint or shirt count.', 'error');
                return;
            }
            
            // Show loading
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Submitting...';
            loading.style.display = 'block';
            message.style.display = 'none';
            
            console.log('Adding payment via WorkerAPI:', { workerName, paintCount, shirtCount, advanceTaken, notes });
            WorkerAPI.addPayment(workerName, paintCount, shirtCount, advanceTaken, notes)
                .then(result => {
                    loading.style.display = 'none';
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    const ok = result && result.success !== false;
                    if (ok) {
                        const msg = result.message || 'Payment entry added successfully!';
                        showMessage(msg, 'success');
                        form.reset();
                        updateCalculations();
                    } else {
                        const msg = result?.message || 'Failed to add payment entry.';
                        showMessage(msg, 'error');
                        console.error('Server returned error for addPayment:', result);
                    }
                })
                .catch(error => {
                    loading.style.display = 'none';
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    showMessage('Failed to add payment entry. Please try again.', 'error');
                    console.error('Network or other error adding payment:', error);
                });
        });
        
        function showMessage(text, type) {
            const message = document.getElementById('message');
            message.textContent = text;
            message.className = 'message ' + type;
            message.style.display = 'block';
            
            // Auto hide success messages after 3 seconds
            if (type === 'success') {
                setTimeout(() => {
                    message.style.display = 'none';
                }, 3000);
            }
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
        }