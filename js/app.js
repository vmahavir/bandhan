// ============================================
// APP.JS - Main Application Logic
// ============================================

// ===== APPLICATION STATE =====
const AppState = {
    currentUser: null,
    currentUserData: null,
    currentProfile: null,
    userRole: 'USER',
    selectedTab: 'home',
    isLoading: false
};

// ===== DOM REFS =====
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== TOAST SYSTEM =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ===== LOADING STATE =====
function setLoading(loading) {
    AppState.isLoading = loading;
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = loading ? 'flex' : 'none';
    }
}

// ===== TAB MANAGEMENT =====
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    
    const content = document.getElementById(`tab-${tabId}`);
    if (content) content.classList.add('active');
    
    document.querySelectorAll('.tab-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.tab === tabId) {
            el.classList.add('active');
        }
    });
    
    AppState.selectedTab = tabId;
}

// ===== NAVIGATION =====
function navigateTo(page, params = {}) {
    const url = new URL(page, window.location.origin);
    Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
    });
    window.location.href = url.toString();
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function emailToDocumentId(email) {
    if (!email) return '';
    return email.replace(/[@.]/g, '_').toLowerCase();
}

function getCurrentUser() {
    return auth.currentUser;
}

function getCurrentUserEmailKey(email = null) {
    const userEmail = email || auth.currentUser?.email;
    if (!userEmail) return null;
    return userEmail.replace(/[@.]/g, '_').toLowerCase();
}

function getSavedEmail() {
    const localEmail = localStorage.getItem('bandhan_email');
    if (localEmail) return localEmail;
    const sessionEmail = sessionStorage.getItem('bandhan_temp_session');
    if (sessionEmail) return sessionEmail;
    return null;
}

function clearSession() {
    localStorage.removeItem('bandhan_email');
    localStorage.removeItem('bandhan_stay_logged_in');
    sessionStorage.removeItem('bandhan_temp_session');
}

function saveSession(email, stayLoggedIn) {
    if (stayLoggedIn) {
        localStorage.setItem('bandhan_email', email);
        localStorage.setItem('bandhan_stay_logged_in', 'true');
        sessionStorage.removeItem('bandhan_temp_session');
    } else {
        sessionStorage.setItem('bandhan_temp_session', email);
        localStorage.removeItem('bandhan_email');
        localStorage.removeItem('bandhan_stay_logged_in');
    }
}

// ============================================
// USER FUNCTIONS
// ============================================

async function isAdmin() {
    const user = auth.currentUser;
    if (!user) return false;
    const emailKey = getCurrentUserEmailKey();
    try {
        const doc = await db.collection('users').doc(emailKey).get();
        return doc.exists && doc.data().role === 'ADMIN';
    } catch (e) {
        console.error('Error checking admin:', e);
        return false;
    }
}

async function getUserProfile(emailKey = null) {
    const key = emailKey || getCurrentUserEmailKey();
    if (!key) return null;
    try {
        const doc = await db.collection('profiles').doc(key).get();
        if (doc.exists) {
            return { id: key, ...doc.data() };
        }
        return null;
    } catch (e) {
        console.error('Error getting profile:', e);
        return null;
    }
}

async function createOrGetUserDocument(user) {
    const emailKey = emailToDocumentId(user.email);
    
    try {
        const userDoc = await db.collection('users').doc(emailKey).get();
        
        if (userDoc.exists) {
            return userDoc.data();
        } else {
            const userData = {
                email: user.email,
                role: 'USER',
                accountStatus: 'ACTIVE',
                name: user.displayName || user.email.split('@')[0],
                createdAt: Date.now(),
                lastLogin: Date.now(),
                hasProfile: false
            };
            
            await db.collection('users').doc(emailKey).set(userData);
            return userData;
        }
    } catch (error) {
        console.error('Firestore error:', error);
        return {
            email: user.email,
            role: 'USER',
            accountStatus: 'ACTIVE'
        };
    }
}

// ===== LOGOUT =====
function logout() {
    clearSession();
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch(err => {
        console.error('Logout error:', err);
        window.location.href = 'index.html';
    });
}

// ============================================
// PAGE INITIALIZATION - HANDLES ROLE-BASED REDIRECT
// ============================================

function initPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('📄 Initializing page:', currentPage);
    
    // If user is not logged in and not on public page, redirect to login
    if (!auth.currentUser) {
        if (!['index.html', 'register.html'].includes(currentPage)) {
            window.location.href = 'index.html';
        }
        return;
    }
    
    // Check if user is admin
    isAdmin().then(isAdminUser => {
        AppState.userRole = isAdminUser ? 'ADMIN' : 'USER';
        console.log('👤 User role:', AppState.userRole);
        
        // If user is on wrong page based on role, redirect
        if (isAdminUser && currentPage === 'dashboard.html') {
            console.log('➡️ Admin on dashboard - redirecting to admin.html');
            window.location.href = 'admin.html';
            return;
        }
        
        if (!isAdminUser && currentPage === 'admin.html') {
            console.log('➡️ User on admin page - redirecting to dashboard.html');
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Initialize page based on current page
        switch(currentPage) {
            case 'index.html':
                initLoginPage();
                break;
            case 'register.html':
                initRegisterPage();
                break;
            case 'dashboard.html':
                initDashboardPage();
                break;
            case 'admin.html':
                initAdminPage();
                break;
            case 'profile-detail.html':
                initProfileDetailPage();
                break;
            case 'edit-profile.html':
                initEditProfilePage();
                break;
            case 'gallery-management.html':
                initGalleryPage();
                break;
            case 'create-profile.html':
                initCreateProfilePage();
                break;
            default:
                console.log('Unknown page:', currentPage);
        }
    });
}

// ============================================
// INITIALIZE APP
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App initializing...');
    
    // Check auth state
    auth.onAuthStateChanged(async user => {
        AppState.currentUser = user;
        console.log('🔥 Auth state changed:', user ? user.email : 'No user');
        
        if (user) {
            try {
                // Get user data
                const emailKey = getCurrentUserEmailKey();
                const userDoc = await db.collection('users').doc(emailKey).get();
                if (userDoc.exists) {
                    AppState.currentUserData = userDoc.data();
                    AppState.userRole = userDoc.data().role || 'USER';
                    
                    // Check if account is active
                    if (userDoc.data().accountStatus === 'INACTIVE') {
                        await auth.signOut();
                        clearSession();
                        showToast('Your account has been deactivated.', 'error');
                        if (!['index.html', 'register.html'].includes(window.location.pathname.split('/').pop())) {
                            window.location.href = 'index.html';
                        }
                        return;
                    }
                }
                
                // Get user profile
                AppState.currentProfile = await getUserProfile();
                
                // Initialize page
                initPage();
            } catch (e) {
                console.error('Error loading user data:', e);
                showToast('Error loading user data', 'error');
            }
        } else {
            // Not logged in
            AppState.currentUserData = null;
            AppState.currentProfile = null;
            
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            if (!['index.html', 'register.html'].includes(currentPage)) {
                window.location.href = 'index.html';
            } else {
                // Initialize login or register page
                if (currentPage === 'index.html') {
                    initLoginPage();
                } else if (currentPage === 'register.html') {
                    initRegisterPage();
                }
            }
        }
    });
});

// ============================================
// PLACEHOLDER PAGE INIT FUNCTIONS
// (These will be overridden by page-specific scripts)
// ============================================

function initLoginPage() {
    console.log('🔐 Login page initialized');
    // Login page logic is in index.html
}

function initRegisterPage() {
    console.log('📝 Register page initialized');
}

function initDashboardPage() {
    console.log('📊 Dashboard page initialized');
}

function initAdminPage() {
    console.log('👑 Admin page initialized');
}

function initProfileDetailPage() {
    console.log('👤 Profile detail page initialized');
}

function initEditProfilePage() {
    console.log('✏️ Edit profile page initialized');
}

function initGalleryPage() {
    console.log('📸 Gallery page initialized');
}

function initCreateProfilePage() {
    console.log('📝 Create profile page initialized');
}

// ============================================
// EXPOSE FUNCTIONS GLOBALLY
// ============================================

window.App = {
    auth,
    db,
    AppState,
    CLOUDINARY_CONFIG,
    showToast,
    showTab,
    navigateTo,
    getUrlParams,
    getCurrentUser,
    getCurrentUserEmailKey,
    emailToDocumentId,
    isAdmin,
    getUserProfile,
    createOrGetUserDocument,
    logout,
    setLoading,
    getSavedEmail,
    clearSession,
    saveSession,
    initPage
};

// Expose individual functions
window.emailToDocumentId = emailToDocumentId;
window.isAdmin = isAdmin;
window.logout = logout;
window.showToast = showToast;
window.getSavedEmail = getSavedEmail;
window.clearSession = clearSession;
window.saveSession = saveSession;

console.log('✅ App.js loaded successfully');
