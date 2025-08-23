/**
 * Quick Navigation Component
 * Provides easy navigation between recent pages and common actions
 */

class QuickNavigation {
    constructor() {
        this.maxHistory = 5;
        this.init();
    }

    init() {
        this.createNavigationBar();
        this.setupEventListeners();
        this.loadNavigationHistory();
    }

    /**
     * Create navigation bar
     */
    createNavigationBar() {
        // Only show on form pages or if there's navigation history
        const hasForm = document.querySelector('form');
        const hasHistory = this.getNavigationHistory().length > 1;
        
        if (!hasForm && !hasHistory) return;

        const navBar = document.createElement('div');
        navBar.id = 'quickNavBar';
        navBar.className = 'quick-nav-bar';
        navBar.innerHTML = `
            <div class="nav-content">
                <div class="nav-breadcrumb" id="navBreadcrumb"></div>
                <div class="nav-actions">
                    <button type="button" class="btn-nav" id="navBack" title="Go Back (Alt+←)">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <button type="button" class="btn-nav" id="navDashboard" title="Dashboard (Alt+H)">
                        <i class="fas fa-home"></i>
                    </button>
                    <button type="button" class="btn-nav dropdown-toggle" id="navRecent" title="Recent Pages (Alt+R)">
                        <i class="fas fa-history"></i>
                    </button>
                    <div class="nav-dropdown" id="navDropdown"></div>
                </div>
            </div>
        `;

        // Insert at the top of the page
        const body = document.body;
        const firstChild = body.firstElementChild;
        if (firstChild) {
            body.insertBefore(navBar, firstChild);
        } else {
            body.appendChild(navBar);
        }

        // Add padding to main content to account for fixed nav bar
        document.body.style.paddingTop = '50px';
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const navBack = document.getElementById('navBack');
        const navDashboard = document.getElementById('navDashboard');
        const navRecent = document.getElementById('navRecent');
        const navDropdown = document.getElementById('navDropdown');

        if (navBack) {
            navBack.addEventListener('click', () => this.goBack());
        }

        if (navDashboard) {
            navDashboard.addEventListener('click', () => this.goToDashboard());
        }

        if (navRecent) {
            navRecent.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleRecentDropdown();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (navDropdown && !navDropdown.contains(e.target) && e.target !== navRecent) {
                navDropdown.classList.remove('show');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.goBack();
                        break;
                    case 'h':
                        e.preventDefault();
                        this.goToDashboard();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.toggleRecentDropdown();
                        break;
                }
            }
        });
    }

    /**
     * Load and display navigation history
     */
    loadNavigationHistory() {
        const breadcrumb = document.getElementById('navBreadcrumb');
        const dropdown = document.getElementById('navDropdown');
        
        if (!breadcrumb || !dropdown) return;

        const history = this.getNavigationHistory();
        const currentPage = this.getCurrentPageInfo();

        // Update breadcrumb
        this.updateBreadcrumb(breadcrumb, history, currentPage);
        
        // Update recent pages dropdown
        this.updateRecentDropdown(dropdown, history);
    }

    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb(breadcrumb, history, currentPage) {
        let breadcrumbHtml = '';
        
        // Show current page
        breadcrumbHtml += `<span class="nav-current">${currentPage.title}</span>`;
        
        // Show previous page if exists
        if (history.length > 1) {
            const previousPage = history[1];
            breadcrumbHtml = `
                <a href="${previousPage.url}" class="nav-previous">
                    ${this.getPageIcon(previousPage.pageKey)} ${previousPage.title}
                </a>
                <span class="nav-separator">›</span>
                ${breadcrumbHtml}
            `;
        }

        breadcrumb.innerHTML = breadcrumbHtml;
    }

    /**
     * Update recent pages dropdown
     */
    updateRecentDropdown(dropdown, history) {
        let dropdownHtml = '';
        
        if (history.length > 1) {
            dropdownHtml += '<div class="dropdown-header">Recent Pages</div>';
            
            // Skip current page (index 0)
            history.slice(1).forEach((page, index) => {
                const timeAgo = this.getTimeAgo(page.timestamp);
                dropdownHtml += `
                    <a href="${page.url}" class="dropdown-item">
                        <div class="dropdown-item-content">
                            <div class="dropdown-item-title">
                                ${this.getPageIcon(page.pageKey)} ${page.title}
                            </div>
                            <div class="dropdown-item-time">${timeAgo}</div>
                        </div>
                    </a>
                `;
            });
        } else {
            dropdownHtml = '<div class="dropdown-empty">No recent pages</div>';
        }

        // Add common shortcuts
        dropdownHtml += `
            <div class="dropdown-divider"></div>
            <div class="dropdown-header">Quick Actions</div>
            <a href="/" class="dropdown-item">
                <div class="dropdown-item-content">
                    <div class="dropdown-item-title">
                        <i class="fas fa-chart-line"></i> Dashboard
                    </div>
                </div>
            </a>
            <a href="/orders/fabric-tailor" class="dropdown-item">
                <div class="dropdown-item-content">
                    <div class="dropdown-item-title">
                        <i class="fas fa-plus-circle"></i> New Combined Order
                    </div>
                </div>
            </a>
            <a href="/workers/add" class="dropdown-item">
                <div class="dropdown-item-content">
                    <div class="dropdown-item-title">
                        <i class="fas fa-user-plus"></i> Add Worker
                    </div>
                </div>
            </a>
        `;

        dropdown.innerHTML = dropdownHtml;
    }

    /**
     * Get navigation history from session storage
     */
    getNavigationHistory() {
        try {
            return JSON.parse(sessionStorage.getItem('nav_history')) || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Get current page information
     */
    getCurrentPageInfo() {
        return {
            title: this.getPageTitle(),
            url: window.location.href,
            pageKey: this.getPageKey(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get page title based on URL
     */
    getPageTitle() {
        const path = window.location.pathname;
        
        const titleMap = {
            '/': 'Dashboard',
            '/orders': 'Orders',
            '/orders/fabric': 'Fabric Orders',
            '/orders/tailor': 'Tailor Orders',
            '/orders/fabric-tailor': 'Combined Orders',
            '/workers': 'Workers',
            '/workers/add': 'Add Worker',
            '/workers/list': 'Worker List',
            '/expenses': 'Expenses',
            '/expenses/fabric': 'Fabric Expenses',
            '/expenses/other': 'Other Expenses'
        };

        return titleMap[path] || document.title || 'Shop Manager';
    }

    /**
     * Get page key for identification
     */
    getPageKey() {
        const path = window.location.pathname;
        return path.replace(/\//g, '_') || 'root';
    }

    /**
     * Get icon for page type
     */
    getPageIcon(pageKey) {
        const iconMap = {
            'root': '<i class="fas fa-chart-line"></i>',
            '_orders': '<i class="fas fa-shopping-cart"></i>',
            '_orders_fabric': '<i class="fas fa-cut"></i>',
            '_orders_tailor': '<i class="fas fa-tshirt"></i>',
            '_orders_fabric-tailor': '<i class="fas fa-layer-group"></i>',
            '_workers': '<i class="fas fa-users"></i>',
            '_workers_add': '<i class="fas fa-user-plus"></i>',
            '_workers_list': '<i class="fas fa-list"></i>',
            '_expenses': '<i class="fas fa-wallet"></i>',
            '_expenses_fabric': '<i class="fas fa-cut"></i>',
            '_expenses_other': '<i class="fas fa-receipt"></i>'
        };

        return iconMap[pageKey] || '<i class="fas fa-file"></i>';
    }

    /**
     * Get time ago string
     */
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    /**
     * Navigate back to previous page
     */
    goBack() {
        const history = this.getNavigationHistory();
        if (history.length > 1) {
            window.location.href = history[1].url;
        } else {
            window.history.back();
        }
    }

    /**
     * Navigate to dashboard
     */
    goToDashboard() {
        window.location.href = '/';
    }

    /**
     * Toggle recent pages dropdown
     */
    toggleRecentDropdown() {
        const dropdown = document.getElementById('navDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure session manager has initialized
    setTimeout(() => {
        window.quickNavigation = new QuickNavigation();
    }, 100);
});
