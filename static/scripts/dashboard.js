        // Configuration - Google Sheets IDs from your scripts
        const SHEET_CONFIG = {
            combinedOrders: {
                id: '199mFt3yz1cZQUGcF84pZgNQoxCpOS2gHxFGDD71CZVg',
                sheetName: 'Combine Orders'
            },
            fabricOrders: {
                id: '1tFb4EBzzvdmDNY0bOtyTXAhX1aRqzfq7NzXLhDqYj0o',
                sheetName: 'Fabric Orders'
            },
            tailoringOrders: {
                id: '128vwp1tjsej9itNAkQY1Y-5sJsMv3N1TZi5Pl9Wgn6Y',
                sheets: ['Orders', 'Shirts', 'Pants', 'Others']
            },
            expenses: {
                id: '1QD0FHcJl7og1Fc1_BdQG2BCQq-N7KIr49jw3whzarXc',
                sheets: ['Fabric_Expense', 'Other_Expense']
            },
            workers: {
                id: '1msVf01VuWsk1mhSMVrvypq_7ubSVjDKlr8aG-6bqE7Q',
                sheets: ['Worker_List', 'Payment_Daily_Entry']
            }
        };

        let API_KEY = '';
        let dashboardData = {
            combinedOrders: [],
            fabricOrders: [],
            tailoringOrders: [],
            expenses: { fabric: [], other: [] },
            workers: [],
            payments: []
        };

        // Chart instances
        let charts = {};

        // Initialize Dashboard
        document.addEventListener('DOMContentLoaded', function() {
            // Check if API key is stored
            const storedKey = localStorage.getItem('googleSheetsApiKey');
            if (storedKey) {
                API_KEY = storedKey;
                loadDashboardData();
            } else {
                // No automatic setup popup - user can manually open via Setup API button
                console.log('No API key found. Use Setup API button to configure.');
            }
        });

        // Setup Functions
        function openSetup() {
            document.getElementById('setupModal').style.display = 'block';
            const stored = localStorage.getItem('googleSheetsApiKey');
            if (stored) {
                document.getElementById('apiKeyInput').value = stored;
            }
        }

        function closeSetup() {
            document.getElementById('setupModal').style.display = 'none';
        }

        async function testConnection() {
            const apiKey = document.getElementById('apiKeyInput').value.trim();
            if (!apiKey) {
                showStatus('Please enter an API key', 'error');
                return;
            }

            showStatus('Testing connection...', 'warning');
            
            try {
                // Test connection with a simple sheet read
                const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.workers.id}/values/Worker_List?key=${apiKey}`;
                const response = await fetch(testUrl);
                
                if (response.ok) {
                    API_KEY = apiKey;
                    localStorage.setItem('googleSheetsApiKey', apiKey);
                    try { window.sessionManager && window.sessionManager.TestCache && window.sessionManager.TestCache.set(apiKey, { success: true, message: 'OK' }); } catch(e){}
                    showStatus('✅ Connection successful! API key saved.', 'success');
                    
                    setTimeout(() => {
                        closeSetup();
                        loadDashboardData();
                    }, 2000);
                } else {
                    const error = await response.json();
                    showStatus(`❌ Connection failed: ${error.error?.message || 'Invalid API key'}`, 'error');
                }
            } catch (error) {
                showStatus(`❌ Connection failed: ${error.message}`, 'error');
            }
        }

        function showStatus(message, type) {
            const statusDiv = document.getElementById('connectionStatus');
            statusDiv.innerHTML = `<div class="connection-status status-${type}">${message}</div>`;
        }

        // Data Loading Functions
        async function loadDashboardData() {
            if (!API_KEY) {
                openSetup();
                return;
            }

            try {
                showLoadingStates();
                
                // Load all data in parallel
                await Promise.all([
                    loadCombinedOrders(),
                    loadFabricOrders(),
                    loadTailoringOrders(),
                    loadExpenses(),
                    loadWorkers(),
                    loadPayments()
                ]);
                
                updateDashboard();
                hideLoadingStates();
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                hideLoadingStates();
                alert('Error loading data. Please check your API key and sheet permissions.');
            }
        }

        async function loadCombinedOrders() {
            try {
                const data = await fetchSheetData(SHEET_CONFIG.combinedOrders.id, SHEET_CONFIG.combinedOrders.sheetName);
                dashboardData.combinedOrders = parseSheetData(data, [
                    'Timestamp', 'Combined Order ID', 'Master Order ID', 'Customer Name', 'Contact',
                    'Address', 'Customer Type', 'Order Date', 'Session', 'Notes', 'Fabric Order ID',
                    'Fabric Price', 'Tailoring Order ID', 'Tailoring Price', 'Total Amount', 'Payment Status'
                ]);
            } catch (error) {
                console.error('Error loading combined orders:', error);
                dashboardData.combinedOrders = [];
            }
        }

        async function loadFabricOrders() {
            try {
                const data = await fetchSheetData(SHEET_CONFIG.fabricOrders.id, SHEET_CONFIG.fabricOrders.sheetName);
                dashboardData.fabricOrders = parseSheetData(data, [
                    'Order ID', 'Customer Name', 'Contact Number', 'Address', 'Customer Type',
                    'Purchase Date', 'Payment Status', 'Session', 'Note', 'Brand Name',
                    'Fabric For', 'Fabric Type', 'Fabric Color', 'Quantity (meters)',
                    'Price per Meter', 'Fabric Total', 'Timestamp'
                ]);
            } catch (error) {
                console.error('Error loading fabric orders:', error);
                dashboardData.fabricOrders = [];
            }
        }

        async function loadTailoringOrders() {
            try {
                const data = await fetchSheetData(SHEET_CONFIG.tailoringOrders.id, 'Orders');
                dashboardData.tailoringOrders = parseSheetData(data, [
                    'Order ID', 'Customer Name', 'Contact Info', 'Address', 'Customer Type',
                    'Garment Types', 'Order Date', 'Delivery Date', 'Delivery Status',
                    'Price', 'Payment Status', 'Season', 'Festival', 'Notes', 'Created At'
                ]);
            } catch (error) {
                console.error('Error loading tailoring orders:', error);
                dashboardData.tailoringOrders = [];
            }
        }

        async function loadExpenses() {
            try {
                const [fabricData, otherData] = await Promise.all([
                    fetchSheetData(SHEET_CONFIG.expenses.id, 'Fabric_Expense'),
                    fetchSheetData(SHEET_CONFIG.expenses.id, 'Other_Expense')
                ]);

                dashboardData.expenses.fabric = parseSheetData(fabricData, [
                    'Supplier', 'Address', 'Purchase Date', 'Fabric Brand', 'Fabric Type',
                    'Quantity (m)', 'Price/meter', 'Total Price', 'Timestamp'
                ]);

                dashboardData.expenses.other = parseSheetData(otherData, [
                    'Expense Name', 'Expense Date', 'Amount', 'Notes', 'Timestamp'
                ]);
            } catch (error) {
                console.error('Error loading expenses:', error);
                dashboardData.expenses = { fabric: [], other: [] };
            }
        }

        async function loadWorkers() {
            try {
                const data = await fetchSheetData(SHEET_CONFIG.workers.id, 'Worker_List');
                dashboardData.workers = parseSheetData(data, [
                    'Name', 'Phone', 'Address', 'Date Added'
                ]);
            } catch (error) {
                console.error('Error loading workers:', error);
                dashboardData.workers = [];
            }
        }

        async function loadPayments() {
            try {
                const data = await fetchSheetData(SHEET_CONFIG.workers.id, 'Payment_Daily_Entry');
                dashboardData.payments = parseSheetData(data, [
                    'Date', 'Worker Name', 'Paint Count', 'Shirt Count', 'Total Work Amount',
                    'Advance Taken', 'Remaining Payment', 'Notes'
                ]);
            } catch (error) {
                console.error('Error loading payments:', error);
                dashboardData.payments = [];
            }
        }

        // Helper Functions
        async function fetchSheetData(sheetId, sheetName) {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch ${sheetName}: ${response.statusText}`);
            }
            
            const result = await response.json();
            return result.values || [];
        }

        function parseSheetData(rawData, headers) {
            if (!rawData || rawData.length < 2) return [];
            
            // Skip header row and convert to objects
            return rawData.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
        }

        function updateDashboard() {
            updateKPIs();
            updateCharts();
            updateRecentActivities();
        }

        function updateKPIs() {
            // Calculate total revenue
            let totalRevenue = 0;
            
            // Combined orders
            totalRevenue += dashboardData.combinedOrders.reduce((sum, order) => 
                sum + (parseFloat(order['Total Amount']) || 0), 0);
            
            // Fabric orders
            totalRevenue += dashboardData.fabricOrders.reduce((sum, order) => 
                sum + (parseFloat(order['Fabric Total']) || 0), 0);
            
            // Tailoring orders
            totalRevenue += dashboardData.tailoringOrders.reduce((sum, order) => 
                sum + (parseFloat(order['Price']) || 0), 0);
            
            // Calculate total expenses
            let totalExpenses = 0;
            
            // Fabric expenses
            totalExpenses += dashboardData.expenses.fabric.reduce((sum, expense) => 
                sum + (parseFloat(expense['Total Price']) || 0), 0);
            
            // Other expenses
            totalExpenses += dashboardData.expenses.other.reduce((sum, expense) => 
                sum + (parseFloat(expense['Amount']) || 0), 0);
            
            // Worker payments
            totalExpenses += dashboardData.payments.reduce((sum, payment) => 
                sum + (parseFloat(payment['Total Work Amount']) || 0), 0);
            
            // Update DOM elements
            document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
            
            const totalOrders = dashboardData.combinedOrders.length + 
                               dashboardData.fabricOrders.length + 
                               dashboardData.tailoringOrders.length;
            document.getElementById('totalOrders').textContent = totalOrders;
            
            document.getElementById('totalWorkers').textContent = dashboardData.workers.length;
            
            const monthlyProfit = totalRevenue - totalExpenses;
            document.getElementById('monthlyProfit').textContent = `₹${monthlyProfit.toLocaleString()}`;
            
            // Update profit trend
            const profitTrend = document.getElementById('profitTrend');
            if (monthlyProfit > 0) {
                profitTrend.className = 'trend-indicator trend-up';
                profitTrend.innerHTML = '<i class="fas fa-arrow-up"></i> Profitable';
            } else {
                profitTrend.className = 'trend-indicator trend-down';
                profitTrend.innerHTML = '<i class="fas fa-arrow-down"></i> Loss';
            }
        }

        function updateCharts() {
            createRevenueChart();
            createMonthlyChart();
            createPaymentChart();
            createExpenseChart();
        }

        function createRevenueChart() {
            const ctx = document.getElementById('revenueChart').getContext('2d');
            
            const combinedRevenue = dashboardData.combinedOrders.reduce((sum, order) => 
                sum + (parseFloat(order['Total Amount']) || 0), 0);
            const fabricRevenue = dashboardData.fabricOrders.reduce((sum, order) => 
                sum + (parseFloat(order['Fabric Total']) || 0), 0);
            const tailoringRevenue = dashboardData.tailoringOrders.reduce((sum, order) => 
                sum + (parseFloat(order['Price']) || 0), 0);
            
            if (charts.revenue) charts.revenue.destroy();
            charts.revenue = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Combined Orders', 'Fabric Only', 'Tailoring Only'],
                    datasets: [{
                        data: [combinedRevenue, fabricRevenue, tailoringRevenue],
                        backgroundColor: ['#f39c12', '#3498db', '#27ae60'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        function createMonthlyChart() {
            const ctx = document.getElementById('monthlyChart').getContext('2d');
            
            // Group orders by month
            const monthlyData = {};
            const currentDate = new Date();
            
            // Initialize last 6 months
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                monthlyData[monthKey] = 0;
            }
            
            // Add combined orders
            dashboardData.combinedOrders.forEach(order => {
                const orderDate = new Date(order['Order Date'] || order['Timestamp']);
                if (!isNaN(orderDate)) {
                    const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    if (monthlyData.hasOwnProperty(monthKey)) {
                        monthlyData[monthKey] += parseFloat(order['Total Amount']) || 0;
                    }
                }
            });
            
            // Add fabric orders
            dashboardData.fabricOrders.forEach(order => {
                const orderDate = new Date(order['Purchase Date'] || order['Timestamp']);
                if (!isNaN(orderDate)) {
                    const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    if (monthlyData.hasOwnProperty(monthKey)) {
                        monthlyData[monthKey] += parseFloat(order['Fabric Total']) || 0;
                    }
                }
            });
            
            // Add tailoring orders
            dashboardData.tailoringOrders.forEach(order => {
                const orderDate = new Date(order['Order Date'] || order['Created At']);
                if (!isNaN(orderDate)) {
                    const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    if (monthlyData.hasOwnProperty(monthKey)) {
                        monthlyData[monthKey] += parseFloat(order['Price']) || 0;
                    }
                }
            });
            
            const months = Object.keys(monthlyData);
            const revenues = Object.values(monthlyData);
            
            if (charts.monthly) charts.monthly.destroy();
            charts.monthly = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Revenue',
                        data: revenues,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₹' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }

        function createPaymentChart() {
            const ctx = document.getElementById('paymentChart').getContext('2d');
            
            // Count payment statuses across all order types
            let paid = 0, unpaid = 0, partial = 0;
            
            const allOrders = [
                ...dashboardData.combinedOrders,
                ...dashboardData.fabricOrders,
                ...dashboardData.tailoringOrders
            ];
            
            allOrders.forEach(order => {
                const status = (order['Payment Status'] || '').toLowerCase();
                if (status.includes('paid') && !status.includes('unpaid')) {
                    paid++;
                } else if (status.includes('partial')) {
                    partial++;
                } else {
                    unpaid++;
                }
            });
            
            if (charts.payment) charts.payment.destroy();
            charts.payment = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Paid', 'Unpaid', 'Partial'],
                    datasets: [{
                        data: [paid, unpaid, partial],
                        backgroundColor: ['#27ae60', '#e74c3c', '#f39c12'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        function createExpenseChart() {
            const ctx = document.getElementById('expenseChart').getContext('2d');
            
            const fabricExpenses = dashboardData.expenses.fabric.reduce((sum, expense) => 
                sum + (parseFloat(expense['Total Price']) || 0), 0);
            const otherExpenses = dashboardData.expenses.other.reduce((sum, expense) => 
                sum + (parseFloat(expense['Amount']) || 0), 0);
            const workerPayments = dashboardData.payments.reduce((sum, payment) => 
                sum + (parseFloat(payment['Total Work Amount']) || 0), 0);
            
            if (charts.expense) charts.expense.destroy();
            charts.expense = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Fabric Purchases', 'Worker Payments', 'Other Expenses'],
                    datasets: [{
                        label: 'Amount (₹)',
                        data: [fabricExpenses, workerPayments, otherExpenses],
                        backgroundColor: ['#3498db', '#27ae60', '#f39c12'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₹' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }

        function updateRecentActivities() {
            const activities = [];
            
            // Combine all orders with timestamps
            const allOrders = [];
            
            // Add combined orders
            dashboardData.combinedOrders.forEach(order => {
                allOrders.push({
                    type: 'Combined Order',
                    customer: order['Customer Name'],
                    amount: parseFloat(order['Total Amount']) || 0,
                    status: order['Payment Status'],
                    date: new Date(order['Timestamp'] || order['Order Date'])
                });
            });
            
            // Add fabric orders
            dashboardData.fabricOrders.forEach(order => {
                allOrders.push({
                    type: 'Fabric Order',
                    customer: order['Customer Name'],
                    amount: parseFloat(order['Fabric Total']) || 0,
                    status: order['Payment Status'],
                    date: new Date(order['Timestamp'] || order['Purchase Date'])
                });
            });
            
            // Add tailoring orders
            dashboardData.tailoringOrders.forEach(order => {
                allOrders.push({
                    type: 'Tailoring Order',
                    customer: order['Customer Name'],
                    amount: parseFloat(order['Price']) || 0,
                    status: order['Payment Status'],
                    date: new Date(order['Created At'] || order['Order Date'])
                });
            });
            
            // Sort by date (most recent first) and take top 5
            allOrders.sort((a, b) => b.date - a.date)
                     .slice(0, 5)
                     .forEach(order => {
                if (!isNaN(order.date.getTime()) && order.customer) {
                    const statusClass = (order.status || '').toLowerCase().replace(/\s+/g, '');
                    activities.push(`
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <div>
                                <strong>${order.type}:</strong> ${order.customer}
                                <br><small class="text-muted">₹${order.amount.toLocaleString()} • ${order.date.toLocaleDateString()}</small>
                            </div>
                            <span class="status-badge status-${statusClass}">${order.status || 'Pending'}</span>
                        </div>
                    `);
                }
            });
            
            // Add recent worker payments
            dashboardData.payments.slice(0, 3).forEach(payment => {
                const amount = parseFloat(payment['Total Work Amount']) || 0;
                if (payment['Worker Name'] && amount > 0) {
                    activities.push(`
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <div>
                                <strong>Worker Payment:</strong> ${payment['Worker Name']}
                                <br><small class="text-muted">₹${amount.toLocaleString()} • ${payment['Date']}</small>
                            </div>
                            <span class="text-success"><i class="fas fa-check-circle"></i> Paid</span>
                        </div>
                    `);
                }
            });
            
            // Update the content
            const recentActivitiesDiv = document.getElementById('recentActivities');
            if (activities.length > 0) {
                recentActivitiesDiv.innerHTML = activities.slice(0, 8).join('');
            } else {
                recentActivitiesDiv.innerHTML = `
                    <div class="activity-placeholder">
                        <i class="fas fa-clock fa-2x mb-3 text-muted"></i>
                        <p class="text-muted">No recent activities to display</p>
                        <small class="text-muted">Activities will appear here when you start using the system</small>
                    </div>
                `;
            }
        }

        function showLoadingStates() {
            const loadingElements = document.querySelectorAll('.loading');
            loadingElements.forEach(el => {
                el.innerHTML = '<i class="fas fa-spinner"></i><p>Loading data from Google Sheets...</p>';
            });
            
            // Show loading in KPI cards
            document.getElementById('totalRevenue').textContent = 'Loading...';
            document.getElementById('totalOrders').textContent = 'Loading...';
            document.getElementById('totalWorkers').textContent = 'Loading...';
            document.getElementById('monthlyProfit').textContent = 'Loading...';
        }

        function hideLoadingStates() {
            // Loading states are replaced by actual content in update functions
        }

        function refreshDashboard() {
            // Update the text/icon in the menu instead of a button
            const menuItem = document.querySelector('[onclick="refreshDashboard(); return false;"]');
            if (menuItem) {
                const originalHTML = menuItem.innerHTML;
                menuItem.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                
                loadDashboardData().finally(() => {
                    menuItem.innerHTML = originalHTML;
                });
            } else {
                // Fallback if menu item not found
                loadDashboardData();
            }
        }

        // Auto-refresh every 5 minutes
        setInterval(() => {
            if (API_KEY) {
                loadDashboardData();
            }
        }, 5 * 60 * 1000);

        // Handle window resize for charts
        window.addEventListener('resize', function() {
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        });