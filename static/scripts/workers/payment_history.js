        let allPayments = [];
        let filteredPayments = [];
        
        document.addEventListener('DOMContentLoaded', function() {
            loadPaymentHistory();
            setupFilters();
        });
        
        function loadPaymentHistory() {
            const loading = document.getElementById('loading');
            const historyTable = document.getElementById('historyTable');
            const noData = document.getElementById('noData');
            const entryCount = document.getElementById('entryCount');
            
            loading.style.display = 'block';
            historyTable.style.display = 'none';
            noData.style.display = 'none';
            
            console.log('Loading payment history via WorkerAPI...');
            WorkerAPI.getPaymentHistory()
                .then(result => {
                    loading.style.display = 'none';
                    const payments = Array.isArray(result) ? result : (result.data || []);
                    allPayments = payments;
                    filteredPayments = payments;

                    if (payments.length === 0) {
                        noData.style.display = 'block';
                        entryCount.textContent = 'No payment records found';
                        updateSummary([]);
                    } else {
                        historyTable.style.display = 'block';
                        displayPayments(payments);
                        updateSummary(payments);
                        populateWorkerFilter(payments);
                        updateEntryCount(payments.length, payments.length);
                    }
                })
                .catch(error => {
                    loading.style.display = 'none';
                    noData.style.display = 'block';
                    document.getElementById('noData').innerHTML = 
                        '<h3>Error loading payment history</h3><p>Please refresh the page to try again.</p>';
                    console.error('Error loading payment history:', error);
                });
        }
        
        function displayPayments(payments) {
            const tbody = document.getElementById('historyTableBody');
            
            tbody.innerHTML = payments.map(payment => `
                <tr>
                    <td>${formatDate(payment.Date)}</td>
                    <td class="worker-name">${payment['Worker Name']}</td>
                    <td>${payment['Paint Count']}</td>
                    <td>${payment['Shirt Count']}</td>
                    <td class="amount positive">₹${payment['Total Work Amount']}</td>
                    <td class="amount ${payment['Advance Taken'] > 0 ? 'negative' : ''}">₹${payment['Advance Taken']}</td>
                    <td class="amount ${payment['Remaining Payment'] >= 0 ? 'positive' : 'negative'}">₹${payment['Remaining Payment']}</td>
                    <td class="notes" title="${payment.Notes || ''}">${payment.Notes || '-'}</td>
                </tr>
            `).join('');
        }
        
        function updateSummary(payments) {
            const totalWork = payments.reduce((sum, payment) => sum + (payment['Total Work Amount'] || 0), 0);
            const totalAdvance = payments.reduce((sum, payment) => sum + (payment['Advance Taken'] || 0), 0);
            const totalRemaining = payments.reduce((sum, payment) => sum + (payment['Remaining Payment'] || 0), 0);
            
            document.getElementById('totalWork').textContent = '₹' + totalWork.toLocaleString();
            document.getElementById('totalAdvance').textContent = '₹' + totalAdvance.toLocaleString();
            document.getElementById('totalRemaining').textContent = '₹' + totalRemaining.toLocaleString();
            document.getElementById('totalEntries').textContent = payments.length.toLocaleString();
        }
        
        function populateWorkerFilter(payments) {
            const workerFilter = document.getElementById('workerFilter');
            const workers = [...new Set(payments.map(p => p['Worker Name']))].sort();
            
            workerFilter.innerHTML = '<option value="">All Workers</option>';
            workers.forEach(worker => {
                workerFilter.innerHTML += `<option value="${worker}">${worker}</option>`;
            });
        }
        
        function setupFilters() {
            const workerFilter = document.getElementById('workerFilter');
            const dateFrom = document.getElementById('dateFrom');
            const dateTo = document.getElementById('dateTo');
            const searchInput = document.getElementById('searchInput');
            
            [workerFilter, dateFrom, dateTo, searchInput].forEach(filter => {
                filter.addEventListener('change', applyFilters);
                filter.addEventListener('input', applyFilters);
            });
        }
        
        function applyFilters() {
            const workerFilter = document.getElementById('workerFilter').value;
            const dateFrom = document.getElementById('dateFrom').value;
            const dateTo = document.getElementById('dateTo').value;
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            
            filteredPayments = allPayments.filter(payment => {
                // Worker filter
                if (workerFilter && payment['Worker Name'] !== workerFilter) {
                    return false;
                }
                
                // Date filters
                const paymentDate = new Date(payment.Date);
                if (dateFrom && paymentDate < new Date(dateFrom)) {
                    return false;
                }
                if (dateTo && paymentDate > new Date(dateTo)) {
                    return false;
                }
                
                // Search in notes
                if (searchTerm && !(payment.Notes || '').toLowerCase().includes(searchTerm)) {
                    return false;
                }
                
                return true;
            });
            
            displayPayments(filteredPayments);
            updateSummary(filteredPayments);
            updateEntryCount(filteredPayments.length, allPayments.length);
        }
        
        function updateEntryCount(shown, total) {
            const entryCount = document.getElementById('entryCount');
            if (shown === total) {
                entryCount.textContent = `${total} payment record${total !== 1 ? 's' : ''} found`;
            } else {
                entryCount.textContent = `Showing ${shown} of ${total} records`;
            }
        }
        
        function formatDate(dateString) {
                    if (dateString === null || dateString === undefined || dateString === '') return 'Unknown';

                    if (Object.prototype.toString.call(dateString) === '[object Date]') {
                        if (isNaN(dateString.getTime())) return 'Unknown';
                        return dateString.toLocaleDateString();
                    }

                    if (typeof dateString === 'number') {
                        if (dateString > 1000000000000) {
                            const d = new Date(dateString);
                            return isNaN(d.getTime()) ? String(dateString) : d.toLocaleDateString();
                        }
                        const excelEpoch = new Date(Date.UTC(1899,11,30));
                        const d = new Date(excelEpoch.getTime() + dateString * 24 * 60 * 60 * 1000);
                        return isNaN(d.getTime()) ? String(dateString) : d.toLocaleDateString();
                    }

                    const str = String(dateString).trim();
                    let parsed = new Date(str);
                    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString();

                    const alt = str.replace(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, '$3-$2-$1');
                    parsed = new Date(alt);
                    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString();

                    return str;
        }