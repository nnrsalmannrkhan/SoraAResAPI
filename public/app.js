/**
 * Main Application Controller - Agency & Micro-SaaS Edition
 * Handles authentication, API communication, and dynamic UI rendering
 */

// Global state
let currentUser = null;
let authToken = localStorage.getItem('authToken') || null;
let projects = [];
let teams = [];
let currentSection = 'dashboard';

// API Helper Functions
const api = {
    request: async (endpoint, options = {}) => {
        const url = `${APP_CONFIG.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(url, { ...options, headers });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error?.message || 'API request failed');
        }

        return data;
    },

    // Auth endpoints
    register: (userData) => api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),

    login: (credentials) => api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
    }),

    getMe: () => api.request('/auth/me'),

    updateProfile: (data) => api.request('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    deleteAccount: () => api.request('/auth/me', {
        method: 'DELETE'
    }),

    // Project endpoints
    createProject: (projectData) => api.request('/projects', {
        method: 'POST',
        body: JSON.stringify(projectData)
    }),

    getProjects: (params = '') => api.request(`/projects${params}`),

    getProject: (id) => api.request(`/projects/${id}`),

    updateProject: (id, data) => api.request(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    deleteProject: (id) => api.request(`/projects/${id}`, {
        method: 'DELETE'
    }),

    getStats: () => api.request('/projects/stats'),

    // Team endpoints (admin only)
    getAllUsers: () => api.request('/auth/users'),
};

// Auth Functions
function showLogin() {
    document.getElementById('register-page').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.remove('hidden');
    document.getElementById('register-form').reset();
    document.getElementById('register-error').classList.add('hidden');
    document.getElementById('register-success').classList.add('hidden');
}

// Check auth status on load
async function checkAuth() {
    const loading = document.getElementById('auth-loading');
    const dashboard = document.getElementById('dashboard-app');
    const loginPage = document.getElementById('login-page');
    
    if (authToken) {
        try {
            const res = await api.getMe();
            currentUser = res.data.user;
            updateUserAvatar();
            dashboard.classList.remove('hidden');
            loginPage.classList.add('hidden');
            loading.classList.add('hidden');
            loadProjects();
            setActiveSection('dashboard');
        } catch (error) {
            localStorage.removeItem('authToken');
            authToken = null;
            showLogin();
            loading.classList.add('hidden');
        }
    } else {
        dashboard.classList.add('hidden');
        showLogin();
        loading.classList.add('hidden');
    }
}

// Update user avatar initials
function updateUserAvatar() {
    if (currentUser) {
        const initials = (currentUser.username || 'U').substring(0, 2).toUpperCase();
        const avatarEl = document.getElementById('user-initials');
        if (avatarEl) avatarEl.textContent = initials;
    }
}

// Login handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const res = await api.login({ email, password });
        authToken = res.token;
        localStorage.setItem('authToken', authToken);
        checkAuth();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    }
});

// Register handler
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    
    try {
        const res = await api.register({ username, email, password });
        successDiv.textContent = 'Registration successful! Please log in.';
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        setTimeout(showLogin, 1500);
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
    }
});

// Logout
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    document.getElementById('dashboard-app').classList.add('hidden');
    showLogin();
}

// Navigation
function setActiveSection(section) {
    currentSection = section;
    const pageTitle = {
        'dashboard': 'Agency Dashboard',
        'projects': 'Client Projects',
        'team': 'Team Management',
        'services': 'Services & Pricing',
        'profile': 'Account Profile'
    }[section] || 'Agency Dashboard';
    
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = pageTitle;

    const content = document.getElementById('main-content');
    if (content) content.innerHTML = getSectionContent(section);
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'bg-gray-800');
        link.classList.add('text-gray-300');
    });
    
    // Find and highlight the clicked link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const text = link.textContent.trim().toLowerCase();
        if (text.includes(section) || 
            (section === 'dashboard' && text.includes('dashboard')) ||
            (section === 'profile' && text.includes('profile')) ||
            (section === 'services' && text.includes('services'))) {
            link.classList.add('active', 'bg-gray-800');
            link.classList.remove('text-gray-300');
        }
    });

    // --- FIX: Ensure proper functions are called after section render ---
    if (section === 'projects') loadProjects();
    if (section === 'dashboard') loadDashboard();
    if (section === 'team') loadTeam();
    if (section === 'profile') {
        // Delay slightly to ensure DOM elements are fully injected
        setTimeout(() => {
            loadProfile();
        }, 50);
    }
}

// Get section content
function getSectionContent(section) {
    switch (section) {
        case 'dashboard': return getDashboardHTML();
        case 'projects': return getProjectsHTML();
        case 'team': return getTeamHTML();
        case 'services': return getServicesHTML();
        case 'profile': return getProfileHTML();
        default: return '';
    }
}

// Dashboard rendering
async function loadDashboard() {
    try {
        const stats = await api.getStats();
        const statsData = stats.data.stats;
        const statsContent = document.getElementById('stats-content');
        if (statsContent) {
            statsContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                        <div class="text-3xl font-extrabold text-blue-600">${statsData.total || 0}</div>
                        <div class="text-sm font-medium text-gray-500 mt-1">Total Projects</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                        <div class="text-3xl font-extrabold text-amber-600">${statsData.pending || 0}</div>
                        <div class="text-sm font-medium text-gray-500 mt-1">Pending</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                        <div class="text-3xl font-extrabold text-indigo-600">${statsData.in_progress || 0}</div>
                        <div class="text-sm font-medium text-gray-500 mt-1">In Progress</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                        <div class="text-3xl font-extrabold text-emerald-600">${statsData.completed || 0}</div>
                        <div class="text-sm font-medium text-gray-500 mt-1">Completed</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                        <div class="text-3xl font-extrabold text-rose-600">${statsData.cancelled || 0}</div>
                        <div class="text-sm font-medium text-gray-500 mt-1">Cancelled</div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

function getDashboardHTML() {
    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Agency Overview</h2>
                    <p class="text-sm text-gray-500 mt-1">Monitor your business performance and active client projects.</p>
                </div>
            </div>
            <div id="stats-content">
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-full mb-4"></div>
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                        ${Array(5).fill().map(() => '<div class="h-24 bg-gray-200 rounded-xl"></div>').join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getProjectsHTML() {
    return `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Client Projects</h2>
                    <p class="text-sm text-gray-500 mt-1">Manage and track all ongoing and completed deliverables.</p>
                </div>
                <button onclick="openProjectModal()" class="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition flex items-center shadow-sm">
                    <i class="fas fa-plus mr-2"></i>New Project
                </button>
            </div>
            <div id="projects-table" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-8 text-center text-gray-400">Loading projects...</div>
            </div>
        </div>
    `;
}

async function loadProjects() {
    try {
        const res = await api.getProjects();
        projects = res.data.projects;
        renderProjectsTable();
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

function renderProjectsTable() {
    const container = document.getElementById('projects-table');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = '<div class="p-12 text-center text-gray-500 font-medium">No client projects found. Click "New Project" to create one!</div>';
        return;
    }

    container.innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                    <th class="p-4">Title</th>
                    <th class="p-4">Status</th>
                    <th class="p-4">Priority</th>
                    <th class="p-4">Created Date</th>
                    <th class="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm">
                ${projects.map(project => `
                    <tr class="hover:bg-gray-50/50 transition">
                        <td class="p-4 font-semibold text-gray-800">${project.title}</td>
                        <td class="p-4">
                            <span class="px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}">
                                ${project.status}
                            </span>
                        </td>
                        <td class="p-4 capitalize text-gray-600">${project.priority}</td>
                        <td class="p-4 text-gray-500">${new Date(project.created_at).toLocaleDateString()}</td>
                        <td class="p-4 text-right space-x-2">
                            <button onclick="editProject(${project.id})" class="text-blue-600 hover:text-blue-800 p-1 transition" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteProject(${project.id})" class="text-rose-600 hover:text-rose-800 p-1 transition" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getStatusColor(status) {
    const colors = {
        'pending': 'bg-amber-50 text-amber-700 border border-amber-200/50',
        'in-progress': 'bg-indigo-50 text-indigo-700 border border-indigo-200/50',
        'completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
        'cancelled': 'bg-rose-50 text-rose-700 border border-rose-200/50'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// Project modal functions
function openProjectModal(project = null) {
    let modal = document.getElementById('project-modal');
    if (!modal) {
        createProjectModal();
        modal = document.getElementById('project-modal');
    }
    modal.classList.remove('hidden');
    document.getElementById('project-modal-title').textContent = project ? 'Edit Project' : 'New Project';
    document.getElementById('project-title').value = project?.title || '';
    document.getElementById('project-description').value = project?.description || '';
    document.getElementById('project-priority').value = project?.priority || 'medium';
    document.getElementById('project-status').value = project?.status || 'pending';
    document.getElementById('project-id').value = project?.id || '';
}

function createProjectModal() {
    const modal = document.createElement('div');
    modal.id = 'project-modal';
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100">
            <h3 id="project-modal-title" class="text-xl font-bold text-gray-800 mb-5">New Project</h3>
            <input type="hidden" id="project-id">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Project Title</label>
                    <input type="text" id="project-title" class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                    <textarea id="project-description" rows="3" class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                        <select id="project-priority" class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                        <select id="project-status" class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
                <button onclick="closeProjectModal()" class="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition">Cancel</button>
                <button onclick="saveProject()" class="px-5 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-sm">Save Project</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) modal.classList.add('hidden');
}

async function saveProject() {
    const projectId = document.getElementById('project-id').value;
    const projectData = {
        title: document.getElementById('project-title').value,
        description: document.getElementById('project-description').value,
        priority: document.getElementById('project-priority').value,
        status: document.getElementById('project-status').value
    };

    try {
        if (projectId) {
            await api.updateProject(projectId, projectData);
        } else {
            await api.createProject(projectData);
        }
        closeProjectModal();
        loadProjects();
        loadDashboard();
    } catch (error) {
        alert('Error saving project: ' + error.message);
    }
}

async function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (project) openProjectModal(project);
}

async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
        await api.deleteProject(id);
        loadProjects();
        loadDashboard();
    } catch (error) {
        alert('Error deleting project: ' + error.message);
    }
}

// ============================================================
// TEAM CONTROL FUNCTIONS
// ============================================================

function getTeamHTML() {
    return `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Team Control</h2>
                    <p class="text-sm text-gray-500 mt-1">Manage staff, roles, and agency member permissions.</p>
                </div>
                <button onclick="openInviteModal()" class="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition flex items-center shadow-sm">
                    <i class="fas fa-user-plus mr-2"></i>Invite Member
                </button>
            </div>

            <!-- Team Stats -->
            <div id="team-stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div class="text-3xl font-extrabold text-purple-600" id="team-total">-</div>
                    <div class="text-sm font-medium text-gray-500 mt-1">Total Members</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div class="text-3xl font-extrabold text-blue-600" id="team-admin">-</div>
                    <div class="text-sm font-medium text-gray-500 mt-1">Admins</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div class="text-3xl font-extrabold text-emerald-600" id="team-active">-</div>
                    <div class="text-sm font-medium text-gray-500 mt-1">Active</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div class="text-3xl font-extrabold text-amber-600" id="team-pending">-</div>
                    <div class="text-sm font-medium text-gray-500 mt-1">Pending Invitations</div>
                </div>
            </div>

            <!-- Team Tabs -->
            <div class="border-b border-gray-200">
                <nav class="flex space-x-8">
                    <button onclick="switchTeamTab('members')" id="tab-members" class="tab-button active border-b-2 border-purple-600 text-purple-600 py-3 px-1 font-semibold text-sm">
                        <i class="fas fa-users mr-2"></i>Team Members
                    </button>
                    <button onclick="switchTeamTab('agencies')" id="tab-agencies" class="tab-button border-b-2 border-transparent text-gray-500 hover:text-gray-800 py-3 px-1 font-semibold text-sm transition">
                        <i class="fas fa-building mr-2"></i>Agencies
                    </button>
                </nav>
            </div>

            <!-- Tab Content -->
            <div id="team-tab-content" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-center py-12 text-gray-500">
                <div class="animate-pulse">Loading team data...</div>
            </div>
        </div>
    `;
}

async function loadTeam(tab) {
    try {
        const res = await api.getAllUsers();
        teams = res.data.users || [];
        renderTeamStats();
        renderTeamTab(tab || 'members');
    } catch (error) {
        console.error('Failed to load team data:', error);
        const container = document.getElementById('team-tab-content');
        if (container) {
            var isForbidden = error.message.includes('403') ||
                error.message.toLowerCase().includes('permission') ||
                error.message.toLowerCase().includes('access');
            container.innerHTML = '<div class="p-12 text-center text-gray-500">' +
                (isForbidden
                    ? '<i class="fas fa-lock text-3xl mb-3 text-purple-500"></i><p class="font-semibold text-gray-700 text-lg">Admin Access Required</p><p class="text-sm text-gray-400 mt-1">You need administrator clearance to view agency team members.</p>'
                    : '<i class="fas fa-exclamation-triangle text-3xl mb-3 text-amber-500"></i><p class="font-medium">' + error.message + '</p>') +
                '</div>';
        }
    }
}

function renderTeamStats() {
    var adminCount = teams.filter(u => u.role === 'admin').length;
    var totalEl = document.getElementById('team-total');
    var adminEl = document.getElementById('team-admin');
    var activeEl = document.getElementById('team-active');
    var pendingEl = document.getElementById('team-pending');
    if (totalEl) totalEl.textContent = teams.length;
    if (adminEl) adminEl.textContent = adminCount;
    if (activeEl) activeEl.textContent = teams.length;
    if (pendingEl) pendingEl.textContent = 0;
}

function switchTeamTab(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-purple-600', 'text-purple-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    var activeTab = document.getElementById('tab-' + tab);
    if (activeTab) {
        activeTab.classList.add('active', 'border-purple-600', 'text-purple-600');
        activeTab.classList.remove('border-transparent', 'text-gray-500');
    }
    renderTeamTab(tab);
}

function renderTeamTab(tab) {
    var container = document.getElementById('team-tab-content');
    if (!container) return;

    if (tab === 'members') {
        if (teams.length === 0) {
            container.innerHTML = '<div class="p-12 text-center text-gray-500 font-medium">No team members found.</div>';
            return;
        }
        container.innerHTML = `
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                        <th class="p-4">Member</th>
                        <th class="p-4">Email</th>
                        <th class="p-4">Role</th>
                        <th class="p-4">Joined Date</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-sm">
                    ${teams.map(user => `
                        <tr class="hover:bg-gray-50/50 transition">
                            <td class="p-4 font-semibold text-gray-800">${user.username}</td>
                            <td class="p-4 text-gray-600">${user.email}</td>
                            <td class="p-4">
                                <span class="px-2.5 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200/50' : 'bg-blue-50 text-blue-700 border border-blue-200/50'}">
                                    ${user.role}
                                </span>
                            </td>
                            <td class="p-4 text-gray-500">${new Date(user.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else if (tab === 'agencies') {
        container.innerHTML = `
            <div class="text-center py-16 px-4">
                <div class="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                    <i class="fas fa-building text-2xl text-purple-600"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-1">Agency Management</h3>
                <p class="text-gray-500 text-sm max-w-sm mx-auto">Advanced multi-agency workspace management features are arriving soon.</p>
            </div>
        `;
    }
}

function openInviteModal() {
    alert('Invite member feature is under development.');
}

// ============================================================
// SERVICES & PRICING FUNCTIONS
// ============================================================

function getServicesHTML() {
    return `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Services & Pricing Packages</h2>
                    <p class="text-sm text-gray-500 mt-1">Choose the optimal plan to scale your digital agency operations.</p>
                </div>
                <button onclick="openNewServiceModal()" class="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition flex items-center shadow-sm">
                    <i class="fas fa-plus mr-2"></i>Add Service
                </button>
            </div>

            <!-- Pricing Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between hover:border-blue-300 transition">
                    <div>
                        <div class="text-center mb-6">
                            <div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100">
                                <i class="fas fa-bolt text-xl text-blue-600"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800">Starter Plan</h3>
                            <p class="text-3xl font-extrabold text-blue-600 mt-2">$9<span class="text-sm font-normal text-gray-500">/mo</span></p>
                        </div>
                        <ul class="space-y-3 mb-6 text-sm text-gray-600">
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Up to 10 active projects</li>
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> 5GB cloud storage</li>
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Basic agency analytics</li>
                            <li class="flex items-center text-gray-300"><i class="fas fa-times mr-2.5"></i> Priority client support</li>
                        </ul>
                    </div>
                    <button class="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition shadow-sm">Get Started</button>
                </div>

                <div class="bg-white rounded-2xl shadow-xl border-2 border-purple-600 p-6 flex flex-col justify-between relative transform md:-translate-y-2">
                    <div class="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
                        <span class="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">Most Popular</span>
                    </div>
                    <div>
                        <div class="text-center mb-6 pt-2">
                            <div class="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-purple-100">
                                <i class="fas fa-crown text-xl text-purple-600"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800">Professional Agency</h3>
                            <p class="text-3xl font-extrabold text-purple-600 mt-2">$29<span class="text-sm font-normal text-gray-500">/mo</span></p>
                        </div>
                        <ul class="space-y-3 mb-6 text-sm text-gray-600">
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Unlimited client projects</li>
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> 50GB fast storage</li>
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Advanced agency metrics</li>
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Priority 24/7 support</li>
                        </ul>
                    </div>
                    <button class="w-full bg-purple-600 text-white py-2.5 rounded-xl font-medium hover:bg-purple-700 transition shadow-sm">Get Started</button>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between hover:border-emerald-300 transition">
                    <div>
                        <div class="text-center mb-6">
                            <div class="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                                <i class="fas fa-building text-xl text-emerald-600"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800">Enterprise</h3>
                            <p class="text-3xl font-extrabold text-emerald-600 mt-2">Custom</p>
                        </div>
                        <ul class="space-y-3 mb-6 text-sm text-gray-600">
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Unlimited everything</li>
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Dedicated support lead</li>
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Custom tool integrations</li>
                            <li class="flex items-center"><i class="fas fa-check text-emerald-500 mr-2.5"></i> Custom SLA guarantee</li>
                        </ul>
                    </div>
                    <button class="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition shadow-sm">Contact Sales</button>
                </div>
            </div>
        </div>
    `;
}

function openNewServiceModal() {
    alert('Add service feature is under development.');
}

// ============================================================
// PROFILE FUNCTIONS
// ============================================================

function getProfileHTML() {
    return `
        <div class="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">Account Profile</h2>
                <p class="text-sm text-gray-500 mt-1">Manage your credentials, login information, and user account settings.</p>
            </div>

            <!-- Profile Info Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div class="flex items-center space-x-5 mb-8 pb-6 border-b border-gray-100">
                    <div class="w-20 h-20 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md">
                        <span id="profile-initials" class="text-3xl font-extrabold text-white">U</span>
                    </div>
                    <div>
                        <h3 id="profile-name" class="text-xl font-bold text-gray-800">Loading...</h3>
                        <p id="profile-email-display" class="text-sm text-gray-500 mt-0.5"></p>
                        <span id="profile-role" class="inline-block mt-2 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200/50">Role: user</span>
                    </div>
                </div>

                <!-- Profile Form -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                        <input type="text" id="profile-username" class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                        <input type="email" id="profile-email" class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                        <input type="password" id="profile-password" class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none">
                        <p class="text-xs text-gray-400 mt-1.5">Leave blank if you do not want to change your password.</p>
                    </div>
                </div>

                <div id="profile-error" class="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm hidden mt-6"></div>
                <div id="profile-success" class="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl text-sm hidden mt-6"></div>

                <div class="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                    <button onclick="deleteAccount()" class="px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium border border-rose-200 transition flex items-center">
                        <i class="fas fa-trash mr-2"></i>Delete Account
                    </button>
                    <button onclick="saveProfile()" class="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition flex items-center shadow-sm">
                        <i class="fas fa-save mr-2"></i>Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
}

function loadProfile() {
    if (!currentUser) return;

    var initials = (currentUser.username || 'U').substring(0, 2).toUpperCase();
    var profileInitials = document.getElementById('profile-initials');
    var profileName = document.getElementById('profile-name');
    var profileEmailDisplay = document.getElementById('profile-email-display');
    var profileRole = document.getElementById('profile-role');
    var profileUsername = document.getElementById('profile-username');
    var profileEmail = document.getElementById('profile-email');

    if (profileInitials) profileInitials.textContent = initials;
    if (profileName) profileName.textContent = currentUser.username;
    if (profileEmailDisplay) profileEmailDisplay.textContent = currentUser.email;
    if (profileRole) profileRole.textContent = 'Role: ' + (currentUser.role || 'user');
    if (profileUsername) profileUsername.value = currentUser.username || '';
    if (profileEmail) profileEmail.value = currentUser.email || '';
}

async function saveProfile() {
    var updateData = {
        username: document.getElementById('profile-username').value,
        email: document.getElementById('profile-email').value,
    };

    var password = document.getElementById('profile-password').value;
    if (password) {
        updateData.password = password;
    }

    var errorDiv = document.getElementById('profile-error');
    var successDiv = document.getElementById('profile-success');

    try {
        var res = await api.updateProfile(updateData);
        currentUser = res.data.user;
        updateUserAvatar();
        loadProfile();
        successDiv.textContent = 'Profile updated successfully!';
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        document.getElementById('profile-password').value = '';
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
    }
}

async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;

    try {
        await api.deleteAccount();
        alert('Your account has been deleted.');
        logout();
    } catch (error) {
        alert('Error deleting account: ' + error.message);
    }
}

// Initialize app on page load
checkAuth();