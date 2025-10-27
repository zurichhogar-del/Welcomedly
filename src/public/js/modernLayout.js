/**
 * Modern Layout JavaScript - Sprint 3.0
 * Handles sidebar toggle, dropdowns, dark mode, and responsive behavior
 */

(function() {
    'use strict';

    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const notificationsToggle = document.getElementById('notifications-toggle');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const headerUserMenuToggle = document.getElementById('header-user-menu-toggle');
    const headerUserDropdown = document.getElementById('header-user-dropdown');
    const userMenuToggle = document.getElementById('user-menu-toggle');
    const userMenu = document.getElementById('user-menu');

    // Sidebar State
    let sidebarCollapsed = false;

    /**
     * Toggle Sidebar (Desktop)
     */
    function toggleSidebar() {
        sidebarCollapsed = !sidebarCollapsed;

        if (sidebarCollapsed) {
            sidebar.classList.remove('sidebar-expanded');
            sidebar.classList.add('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', 'true');
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            sidebar.classList.add('sidebar-expanded');
            localStorage.setItem('sidebarCollapsed', 'false');
        }

        // Hide/show text elements
        const sidebarTexts = sidebar.querySelectorAll('.sidebar-text');
        sidebarTexts.forEach(text => {
            text.style.display = sidebarCollapsed ? 'none' : 'block';
        });
    }

    /**
     * Toggle Mobile Menu
     */
    function toggleMobileMenu() {
        const isHidden = sidebar.classList.contains('sidebar-mobile-hidden');

        if (isHidden) {
            sidebar.classList.remove('sidebar-mobile-hidden');
            mobileMenuOverlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('sidebar-mobile-hidden');
            mobileMenuOverlay.classList.add('hidden');
        }
    }

    /**
     * Close Mobile Menu
     */
    function closeMobileMenu() {
        sidebar.classList.add('sidebar-mobile-hidden');
        mobileMenuOverlay.classList.add('hidden');
    }

    /**
     * Toggle Dropdown
     */
    function toggleDropdown(dropdown) {
        const isHidden = dropdown.classList.contains('hidden');

        // Close all other dropdowns
        closeAllDropdowns();

        if (isHidden) {
            dropdown.classList.remove('hidden');
        }
    }

    /**
     * Close All Dropdowns
     */
    function closeAllDropdowns() {
        if (notificationsDropdown) {notificationsDropdown.classList.add('hidden');}
        if (headerUserDropdown) {headerUserDropdown.classList.add('hidden');}
        if (userMenu) {userMenu.classList.add('hidden');}
    }

    /**
     * Toggle Dark Mode
     */
    function toggleDarkMode() {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');

        if (isDark) {
            html.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
            updateDarkModeIcon(false);
        } else {
            html.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
            updateDarkModeIcon(true);
        }
    }

    /**
     * Update Dark Mode Icon
     */
    function updateDarkModeIcon(isDark) {
        const lightIcon = document.querySelector('.dark-mode-icon-light');
        const darkIcon = document.querySelector('.dark-mode-icon-dark');

        if (lightIcon && darkIcon) {
            if (isDark) {
                lightIcon.classList.add('hidden');
                darkIcon.classList.remove('hidden');
            } else {
                lightIcon.classList.remove('hidden');
                darkIcon.classList.add('hidden');
            }
        }
    }

    /**
     * Initialize from LocalStorage
     */
    function initFromLocalStorage() {
        // Restore sidebar state
        const savedSidebarState = localStorage.getItem('sidebarCollapsed');
        if (savedSidebarState === 'true') {
            sidebarCollapsed = true;
            sidebar.classList.remove('sidebar-expanded');
            sidebar.classList.add('sidebar-collapsed');

            const sidebarTexts = sidebar.querySelectorAll('.sidebar-text');
            sidebarTexts.forEach(text => {
                text.style.display = 'none';
            });
        }

        // Restore dark mode
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'true') {
            document.documentElement.classList.add('dark');
            updateDarkModeIcon(true);
        }
    }

    /**
     * Handle Click Outside Dropdowns
     */
    function handleClickOutside(event) {
        // Check if click is outside dropdowns
        if (!event.target.closest('#notifications-toggle') &&
            !event.target.closest('#notifications-dropdown')) {
            if (notificationsDropdown) {notificationsDropdown.classList.add('hidden');}
        }

        if (!event.target.closest('#header-user-menu-toggle') &&
            !event.target.closest('#header-user-dropdown')) {
            if (headerUserDropdown) {headerUserDropdown.classList.add('hidden');}
        }

        if (!event.target.closest('#user-menu-toggle') &&
            !event.target.closest('#user-menu')) {
            if (userMenu) {userMenu.classList.add('hidden');}
        }
    }

    /**
     * Handle Responsive Behavior
     */
    function handleResize() {
        const width = window.innerWidth;

        // On mobile, hide sidebar by default
        if (width < 768) {
            sidebar.classList.add('sidebar-mobile-hidden');
            mobileMenuOverlay.classList.add('hidden');
        } else {
            sidebar.classList.remove('sidebar-mobile-hidden');
        }
    }

    /**
     * Initialize Event Listeners
     */
    function init() {
        // Sidebar toggle
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', toggleSidebar);
        }

        // Mobile menu toggle
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', toggleMobileMenu);
        }

        // Mobile menu overlay click
        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', closeMobileMenu);
        }

        // Dark mode toggle
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', toggleDarkMode);
        }

        // Notifications dropdown
        if (notificationsToggle && notificationsDropdown) {
            notificationsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown(notificationsDropdown);
            });
        }

        // Header user menu
        if (headerUserMenuToggle && headerUserDropdown) {
            headerUserMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown(headerUserDropdown);
            });
        }

        // Sidebar user menu
        if (userMenuToggle && userMenu) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown(userMenu);
            });
        }

        // Click outside to close dropdowns
        document.addEventListener('click', handleClickOutside);

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Initialize from localStorage
        initFromLocalStorage();

        // Initial resize check
        handleResize();

        console.log('✅ Modern Layout initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
