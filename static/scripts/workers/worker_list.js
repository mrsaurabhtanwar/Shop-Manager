        let allWorkers = [];
        
        document.addEventListener('DOMContentLoaded', function() {
            loadWorkers();
            setupSearch();
        });
        
        function loadWorkers() {
            const loading = document.getElementById('loading');
            const workersGrid = document.getElementById('workersGrid');
            const noWorkers = document.getElementById('noWorkers');
            const workerCount = document.getElementById('workerCount');

            loading.style.display = 'block';
            workersGrid.style.display = 'none';
            noWorkers.style.display = 'none';

            console.log('Loading workers via WorkerAPI...');
            WorkerAPI.getWorkers()
                .then(result => {
                    loading.style.display = 'none';
                    // result may be { success: true, data: [...] } or an array directly
                    const workers = Array.isArray(result) ? result : (result.data || []);
                    allWorkers = workers;

                    if (workers.length === 0) {
                        noWorkers.style.display = 'block';
                        workerCount.textContent = 'No workers registered';
                    } else {
                        workersGrid.style.display = 'grid';
                        displayWorkers(workers);
                        updateWorkerCount(workers.length, workers.length);
                    }
                })
                .catch(error => {
                    loading.style.display = 'none';
                    noWorkers.style.display = 'block';
                    document.getElementById('noWorkers').innerHTML = 
                        '<h3>Error loading workers</h3><p>Please refresh the page to try again.</p>';
                    console.error('Error loading workers:', error);
                });
        }
        
        function displayWorkers(workers) {
            const workersGrid = document.getElementById('workersGrid');
            
            workersGrid.innerHTML = workers.map(worker => `
                <div class="worker-card">
                    <div class="worker-name">${worker.Name}</div>
                    <div class="worker-detail phone-icon">
                        <strong>Phone:</strong> ${worker.Phone}
                    </div>
                    <div class="worker-detail address-icon">
                        <strong>Address:</strong> ${worker.Address || 'Not provided'}
                    </div>
                    <div class="worker-detail date-icon">
                        <strong>Added:</strong> ${formatDate(worker['Date Added'])}
                    </div>
                </div>
            `).join('');
        }
        
        function setupSearch() {
            const searchInput = document.getElementById('searchInput');
            
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                
                if (searchTerm === '') {
                    displayWorkers(allWorkers);
                    updateWorkerCount(allWorkers.length, allWorkers.length);
                } else {
                    const filteredWorkers = allWorkers.filter(worker => 
                        worker.Name.toLowerCase().includes(searchTerm) ||
                        worker.Phone.includes(searchTerm) ||
                        (worker.Address && worker.Address.toLowerCase().includes(searchTerm))
                    );
                    
                    displayWorkers(filteredWorkers);
                    updateWorkerCount(filteredWorkers.length, allWorkers.length);
                }
            });
        }
        
        function updateWorkerCount(shown, total) {
            const workerCount = document.getElementById('workerCount');
            if (shown === total) {
                workerCount.textContent = `${total} worker${total !== 1 ? 's' : ''} registered`;
            } else {
                workerCount.textContent = `Showing ${shown} of ${total} workers`;
            }
        }
        
        function formatDate(dateString) {
                    if (dateString === null || dateString === undefined || dateString === '') return 'Unknown';

                    // If already a Date object
                    if (Object.prototype.toString.call(dateString) === '[object Date]') {
                        if (isNaN(dateString.getTime())) return 'Unknown';
                        return dateString.toLocaleDateString();
                    }

                    // If it's a number, it may be an epoch ms or Excel serial
                    if (typeof dateString === 'number') {
                        // treat large numbers as ms since epoch
                        if (dateString > 1000000000000) {
                            const d = new Date(dateString);
                            return isNaN(d.getTime()) ? String(dateString) : d.toLocaleDateString();
                        }
                        // Excel serial (days since 1899-12-30)
                        const excelEpoch = new Date(Date.UTC(1899,11,30));
                        const d = new Date(excelEpoch.getTime() + dateString * 24 * 60 * 60 * 1000);
                        return isNaN(d.getTime()) ? String(dateString) : d.toLocaleDateString();
                    }

                    // Try parsing string intelligently
                    const str = String(dateString).trim();
                    // Common ISO or RFC formats will parse
                    let parsed = new Date(str);
                    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString();

                    // Try swapping DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
                    const alt = str.replace(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, '$3-$2-$1');
                    parsed = new Date(alt);
                    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString();

                    // Fallback: return original string
                    return str;
        }