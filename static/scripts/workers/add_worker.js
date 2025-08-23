        document.getElementById('addWorkerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const message = document.getElementById('message');
            const form = this;
            
            // Get form data
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim();
            
            if (!name || !phone) {
                showMessage('Please fill in all required fields.', 'error');
                return;
            }
            
            // Show loading
            submitBtn.disabled = true;
            loading.style.display = 'block';
            message.style.display = 'none';
            
            console.log('Form submitted with data:', { name, phone, address });
            console.log('WorkerAPI object:', WorkerAPI);
            
            // Show loading immediately
            submitBtn.disabled = true;
            loading.style.display = 'block';
            message.style.display = 'none';
            
            // Add a timeout to prevent infinite loading
            const timeoutId = setTimeout(() => {
                loading.style.display = 'none';
                submitBtn.disabled = false;
                showMessage('Request timed out. Please check your connection and try again.', 'error');
                console.error('Request timeout after 30 seconds');
            }, 30000);
            
            console.log('Attempting to add worker:', { name, phone, address });
            
            // Use the modern WorkerAPI for better error handling
            WorkerAPI.addWorker(name, phone, address)
                .then(function(result) {
                    clearTimeout(timeoutId); // Clear the timeout
                    console.log('Add worker response:', result);
                    loading.style.display = 'none';
                    submitBtn.disabled = false;
                    
                    if (result && result.success) {
                        showMessage(result.message || 'Worker added successfully!', 'success');
                        form.reset();
                        
                        // Optional: Refresh the worker list if on the same page
                        if (typeof refreshWorkerList === 'function') {
                            setTimeout(refreshWorkerList, 1000);
                        }
                    } else {
                        const errorMsg = result?.message || result?.error || 'Failed to add worker';
                        showMessage(errorMsg, 'error');
                        console.error('Server returned error:', result);
                    }
                })
                .catch(function(error) {
                    clearTimeout(timeoutId); // Clear the timeout
                    console.error('Network or other error:', error);
                    loading.style.display = 'none';
                    submitBtn.disabled = false;
                    
                    let errorMessage = 'Failed to add worker. ';
                    if (error && error.message) {
                        errorMessage += 'Error: ' + error.message;
                    } else if (typeof error === 'string') {
                        errorMessage += error;
                    } else {
                        errorMessage += 'Please check your internet connection and try again.';
                    }
                    
                    showMessage(errorMessage, 'error');
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
        }