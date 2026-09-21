/* ===================================================
   SUBJECTS ONLINE — Super Admin Panel Module (admin-panel.js)
   Full User Registry, Credentials Tracking, Block/Unblock & Analytics
   =================================================== */

// ── 0. Firebase Helper ────────────────────────────────────────────────────────
function getFirebaseDB() {
    if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.firestore();
    }
    return null;
}

// ── 1. Real Student Registry (Admin Excluded) ─────────────────────────────────
function getUsersRegistry() {
    try {
        // Clear legacy caches
        if (localStorage.getItem('so_users_registry')) localStorage.removeItem('so_users_registry');
        if (localStorage.getItem('so_users_registry_v2')) localStorage.removeItem('so_users_registry_v2');

        const stored = localStorage.getItem('so_students_registry_v3');
        if (!stored) {
            return [];
        }

        let list = JSON.parse(stored);
        if (!Array.isArray(list)) list = [];
        // Strictly exclude admin accounts from the student list
        return list.filter(u =>
            !(u.email && u.email.toLowerCase() === 'ahmed_tamer2006@elgamel.com') &&
            !(u.name && u.name.toLowerCase() === 'ahmed tamer') &&
            u.role !== 'admin'
        );
    } catch (e) {
        console.error('Error reading users registry:', e);
        return [];
    }
}

/**
 * Saves students list to localStorage & syncs to Firestore if available
 */
function saveUsersRegistry(list) {
    try {
        localStorage.setItem('so_students_registry_v3', JSON.stringify(list));
        const db = getFirebaseDB();
        if (db) {
            list.forEach(u => {
                db.collection('students_registry').doc(u.id || u.uid).set(u, { merge: true }).catch(() => {});
            });
        }
    } catch (e) {
        console.error('Error saving users registry:', e);
    }
}

/**
 * Records or updates a student in the centralized registry & Firebase Firestore
 */
window.recordUserInRegistry = function ({ name, email, password, photoURL, dept, loginType, uid }) {
    try {
        const studentName = name || '';
        const studentEmail = email || '';
        const studentPass = password || '';

        // Exclude Admin Ahmed Tamer from being listed in the student registry
        if (
            studentName.toLowerCase().includes('ahmed tamer') ||
            studentEmail.toLowerCase() === 'ahmed_tamer2006@elgamel.com' ||
            studentPass === 'Ahmed_Tamer2006@elgamel.com'
        ) {
            return;
        }

        let registry = getUsersRegistry();
        const currentStudentName = studentName || 'Student';
        const currentEmail = studentEmail;
        const currentUID = uid || 'usr_' + Date.now();
        const currentPhoto = photoURL || '';
        const currentDept = dept || 'Accounting';
        const currentLoginType = loginType || 'manual';

        // Check if student already exists
        const existingIdx = registry.findIndex(u =>
            (currentUID && u.uid === currentUID) ||
            (currentEmail && u.email && u.email.toLowerCase() === currentEmail.toLowerCase()) ||
            (currentStudentName && u.name && u.name.toLowerCase() === currentStudentName.toLowerCase())
        );

        const now = new Date().toISOString();
        let targetRecord;

        if (existingIdx >= 0) {
            const existing = registry[existingIdx];
            targetRecord = {
                ...existing,
                name: currentStudentName || existing.name,
                email: currentEmail || existing.email,
                photoURL: currentPhoto || existing.photoURL,
                dept: currentDept || existing.dept,
                loginType: currentLoginType || existing.loginType,
                password: password || existing.password || (currentLoginType === 'google' ? 'N/A (Google Auth)' : '••••••••'),
                lastLogin: now
            };
            registry[existingIdx] = targetRecord;
        } else {
            targetRecord = {
                id: 'usr_' + Date.now(),
                uid: currentUID,
                name: currentStudentName,
                email: currentEmail,
                password: password || (currentLoginType === 'google' ? 'N/A (Google Auth)' : 'Standard Login'),
                photoURL: currentPhoto,
                dept: currentDept,
                semester: localStorage.getItem('soSemester') || '1',
                loginType: currentLoginType,
                isBlocked: false,
                registeredAt: now,
                lastLogin: now,
                role: 'student'
            };
            registry.unshift(targetRecord);
        }

        saveUsersRegistry(registry);

        // Instant write to Cloud Firestore
        const db = getFirebaseDB();
        if (db) {
            db.collection('students_registry').doc(targetRecord.id || targetRecord.uid).set(targetRecord, { merge: true })
                .then(() => console.log('☁️ Student recorded to Firebase Firestore:', targetRecord.name))
                .catch(err => console.log('Firestore write notice:', err));
        }
    } catch (e) {
        console.error('Failed to record user in registry:', e);
    }
};

/**
 * Checks if a given user is blocked by Admin
 */
window.isUserBlocked = function (identifier) {
    if (!identifier) return false;
    const registry = getUsersRegistry();
    const cleanId = String(identifier).toLowerCase().trim();
    const found = registry.find(u =>
        (u.uid && u.uid.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.name && u.name.toLowerCase() === cleanId) ||
        (u.id && u.id.toLowerCase() === cleanId)
    );
    return !!(found && found.isBlocked);
};

// ── 3. Admin Panel UI State & Rendering ──────────────────────────────────────

let adminSearchQuery = '';
let adminDeptFilter = 'all';
let adminAuthFilter = 'all';

/**
 * Main initialization for Admin Panel
 */
window.initAdminPanel = function () {
    renderAdminStats();
    renderAdminUserTable();
    bindAdminPanelEvents();
    subscribeToFirestoreStudents();
};

let firestoreStudentsUnsub = null;
function subscribeToFirestoreStudents() {
    try {
        const db = getFirebaseDB();
        if (!db) return;

        if (firestoreStudentsUnsub) {
            firestoreStudentsUnsub();
        }

        firestoreStudentsUnsub = db.collection('students_registry').onSnapshot((snapshot) => {
            const cloudStudents = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (
                    !(data.email && data.email.toLowerCase() === 'ahmed_tamer2006@elgamel.com') &&
                    !(data.name && data.name.toLowerCase() === 'ahmed tamer') &&
                    data.role !== 'admin'
                ) {
                    cloudStudents.push(data);
                }
            });

            // Sort by registration date descending
            cloudStudents.sort((a, b) => new Date(b.registeredAt || b.lastLogin || 0) - new Date(a.registeredAt || a.lastLogin || 0));

            localStorage.setItem('so_students_registry_v3', JSON.stringify(cloudStudents));
            renderAdminStats();
            renderAdminUserTable();
        }, (err) => {
            console.log('Firebase realtime student listener:', err);
        });
    } catch (e) {
        console.log('Firestore subscribe exception:', e);
    }
}

/**
 * Renders Top 4 Metric Cards
 */
function renderAdminStats() {
    const registry = getUsersRegistry();
    const totalUsers = registry.length;
    const googleUsers = registry.filter(u => u.loginType === 'google').length;
    const manualUsers = registry.filter(u => u.loginType === 'manual').length;
    const blockedUsers = registry.filter(u => u.isBlocked).length;

    animateCounter('admin-stat-total', totalUsers);
    animateCounter('admin-stat-google', googleUsers);
    animateCounter('admin-stat-manual', manualUsers);
    animateCounter('admin-stat-blocked', blockedUsers);
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    if (typeof gsap !== 'undefined') {
        const obj = { val: parseInt(el.textContent, 10) || 0 };
        gsap.to(obj, {
            val: target,
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.val); }
        });
    } else {
        el.textContent = target;
    }
}

/**
 * Renders the full User Management Table & Grid
 */
function renderAdminUserTable() {
    const tableBody = document.getElementById('admin-users-tbody');
    const emptyState = document.getElementById('admin-no-users-state');
    const countBadge = document.getElementById('admin-table-count-badge');
    if (!tableBody) return;

    let registry = getUsersRegistry();

    // 1. Apply Search Filter
    if (adminSearchQuery.trim()) {
        const q = adminSearchQuery.toLowerCase().trim();
        registry = registry.filter(u =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.password && u.password.toLowerCase().includes(q)) ||
            (u.dept && u.dept.toLowerCase().includes(q)) ||
            (u.id && u.id.toLowerCase().includes(q))
        );
    }

    // 2. Apply Department Filter
    if (adminDeptFilter !== 'all') {
        registry = registry.filter(u => (u.dept || '').toLowerCase().includes(adminDeptFilter.toLowerCase()));
    }

    // 3. Apply Auth / Status Filter
    if (adminAuthFilter === 'google') {
        registry = registry.filter(u => u.loginType === 'google');
    } else if (adminAuthFilter === 'manual') {
        registry = registry.filter(u => u.loginType === 'manual');
    } else if (adminAuthFilter === 'blocked') {
        registry = registry.filter(u => u.isBlocked);
    } else if (adminAuthFilter === 'active') {
        registry = registry.filter(u => !u.isBlocked);
    }

    if (countBadge) {
        countBadge.textContent = `${registry.length} Students`;
    }

    if (registry.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            const titleEl = emptyState.querySelector('h4');
            const descEl = emptyState.querySelector('p');
            if (adminSearchQuery.trim() || adminDeptFilter !== 'all' || adminAuthFilter !== 'all') {
                if (titleEl) titleEl.textContent = 'No Matching Students Found';
                if (descEl) descEl.textContent = 'Try adjusting your search terms or department filters.';
            } else {
                if (titleEl) titleEl.textContent = 'No Students Registered Yet';
                if (descEl) descEl.textContent = 'When students log in or register on Subjects Online, their names, credentials, and departments will automatically appear here live from Firebase.';
            }
        }
        return;
    }

    if (emptyState) {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
    }

    tableBody.innerHTML = registry.map((user, index) => {
        const isGoogle = user.loginType === 'google';
        const isBlocked = !!user.isBlocked;
        const initial = (user.name || 'S').charAt(0).toUpperCase();
        const formattedDate = user.registeredAt
            ? new Date(user.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Recent';

        // Department Badge Colors
        const deptColors = {
            'Accounting': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
            'Business Administration': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
            'Economics': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            'Statistics': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            'Financial & Customs Studies': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        };
        const deptBadgeClass = deptColors[user.dept] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';

        const safeId = user.id || `usr_${index}`;
        const maskedPassId = `pass-val-${safeId}`;

        return `
        <tr class="border-b border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-500/5 transition-colors ${isBlocked ? 'bg-rose-500/5 dark:bg-rose-950/20' : ''}">

            <!-- Student Avatar & Name -->
            <td class="py-4 px-4 sm:px-6">
                <div class="flex items-center gap-3">
                    <div class="relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white shadow-sm overflow-hidden border-2 ${isBlocked ? 'border-rose-500' : 'border-sky-500/30'}" style="background: linear-gradient(135deg, #0ea5e9, #6366f1);">
                        ${user.photoURL
                            ? `<img src="${user.photoURL}" alt="${user.name}" class="w-full h-full object-cover">`
                            : `<span>${initial}</span>`}
                    </div>
                    <div>
                        <span class="font-heading font-bold text-sm text-slate-900 dark:text-white block">${user.name}</span>
                        <span class="text-[11px] text-slate-400 font-mono tracking-tight block">ID: ${user.id || user.uid || 'N/A'}</span>
                    </div>
                </div>
            </td>

            <!-- Department -->
            <td class="py-4 px-4">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${deptBadgeClass}">
                    ${user.dept || 'Accounting'}
                </span>
            </td>

            <!-- Auth Method -->
            <td class="py-4 px-4">
                ${isGoogle ? `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                        </svg>
                        Google Auth
                    </span>
                ` : `
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                        Direct Password
                    </span>
                `}
            </td>

            <!-- Credentials (Password / Email) -->
            <td class="py-4 px-4">
                <div class="flex items-center gap-2">
                    ${isGoogle ? `
                        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 max-w-[210px]">
                            <span class="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all" title="${user.email}">${user.email || 'No email synced'}</span>
                            <button type="button" class="text-slate-400 hover:text-sky-500 p-0.5 transition-colors" onclick="copyToClipboard('${user.email || ''}', this)" title="Copy Email">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            </button>
                        </div>
                    ` : `
                        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 max-w-[210px]">
                            <span id="${maskedPassId}" class="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold truncate select-all" data-real="${user.password || ''}">••••••••</span>
                            <button type="button" class="text-slate-400 hover:text-indigo-500 p-0.5 transition-colors" onclick="togglePasswordMask('${maskedPassId}', this)" title="Reveal Password">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </button>
                            <button type="button" class="text-slate-400 hover:text-sky-500 p-0.5 transition-colors" onclick="copyToClipboard('${user.password || ''}', this)" title="Copy Password">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            </button>
                        </div>
                    `}
                </div>
            </td>

            <!-- Status -->
            <td class="py-4 px-4">
                ${isBlocked ? `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                        <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        BLOCKED
                    </span>
                ` : `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                    </span>
                `}
            </td>

            <!-- Date -->
            <td class="py-4 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                ${formattedDate}
            </td>

            <!-- Admin Actions -->
            <td class="py-4 px-4 sm:px-6 text-right">
                <div class="flex items-center justify-end gap-1.5">

                    <!-- Block / Unblock Toggle Button -->
                    <button type="button"
                        onclick="toggleAdminUserBlock('${user.id || user.uid}')"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${isBlocked
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-300 dark:border-rose-800/60'}"
                        title="${isBlocked ? 'Unblock and restore student access' : 'Block student from accessing platform'}">
                        ${isBlocked ? `
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span>Unblock</span>
                        ` : `
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                            <span>Block</span>
                        `}
                    </button>

                    <!-- Delete Student Button -->
                    <button type="button"
                        onclick="deleteAdminUser('${user.id || user.uid}')"
                        class="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Student Record">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </td>

        </tr>
        `;
    }).join('');
}

/**
 * Event Bindings for Admin Panel Filters & Search
 */
function bindAdminPanelEvents() {
    const searchInput = document.getElementById('admin-user-search');
    if (searchInput && !searchInput._bound) {
        searchInput._bound = true;
        searchInput.addEventListener('input', (e) => {
            adminSearchQuery = e.target.value;
            renderAdminUserTable();
        });
    }

    const deptSelect = document.getElementById('admin-dept-filter');
    if (deptSelect && !deptSelect._bound) {
        deptSelect._bound = true;
        deptSelect.addEventListener('change', (e) => {
            adminDeptFilter = e.target.value;
            renderAdminUserTable();
        });
    }

    const authSelect = document.getElementById('admin-auth-filter');
    if (authSelect && !authSelect._bound) {
        authSelect._bound = true;
        authSelect.addEventListener('change', (e) => {
            adminAuthFilter = e.target.value;
            renderAdminUserTable();
        });
    }
}

// ── 4. Admin Actions: Block, Delete, Reveal, Copy & Export ───────────────────

/**
 * Toggles block status for a user
 */
window.toggleAdminUserBlock = function (userId) {
    let registry = getUsersRegistry();
    const idx = registry.findIndex(u => (u.id === userId || u.uid === userId));
    if (idx === -1) return;

    registry[idx].isBlocked = !registry[idx].isBlocked;
    const targetStudent = registry[idx];
    saveUsersRegistry(registry);

    // Sync block state to Cloud Firestore
    const db = getFirebaseDB();
    if (db) {
        db.collection('students_registry').doc(userId).set({ isBlocked: targetStudent.isBlocked }, { merge: true })
            .then(() => console.log('☁️ Student block state synced to Firebase'))
            .catch(err => console.error('Firestore block update error:', err));
    }

    renderAdminStats();
    renderAdminUserTable();

    const actionText = targetStudent.isBlocked ? 'Blocked 🚫' : 'Unblocked ✅';
    showAdminToast(`Student ${actionText}`, `${targetStudent.name} access status updated.`);
};

/**
 * Deletes user from registry
 */
window.deleteAdminUser = function (userId) {
    if (!confirm('Are you sure you want to delete this student record from the cloud database?')) return;
    let registry = getUsersRegistry();
    const filtered = registry.filter(u => (u.id !== userId && u.uid !== userId));
    saveUsersRegistry(filtered);

    // Delete from Cloud Firestore
    const db = getFirebaseDB();
    if (db) {
        db.collection('students_registry').doc(userId).delete()
            .then(() => console.log('☁️ Student deleted from Firebase Firestore'))
            .catch(err => console.error('Firestore delete error:', err));
    }

    renderAdminStats();
    renderAdminUserTable();
    showAdminToast('Student Deleted', 'User has been removed from cloud database.');
};

/**
 * Toggles masking of password in table
 */
window.togglePasswordMask = function (elementId, btn) {
    const span = document.getElementById(elementId);
    if (!span) return;
    const real = span.dataset.real || '';
    if (span.textContent === '••••••••') {
        span.textContent = real;
        if (btn) btn.classList.add('text-indigo-500');
    } else {
        span.textContent = '••••••••';
        if (btn) btn.classList.remove('text-indigo-500');
    }
};

/**
 * Copies text to clipboard with quick feedback
 */
window.copyToClipboard = function (text, btn) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showAdminToast('Copied to Clipboard', text);
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '✓';
            setTimeout(() => { btn.innerHTML = originalHTML; }, 1200);
        }
    });
};

/**
 * Export Users to JSON
 */
window.exportUsersJSON = function () {
    const registry = getUsersRegistry();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registry, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `subjects_online_users_${Date.now()}.json`);
    dlAnchorElem.click();
    showAdminToast('Database Exported', 'Downloaded users JSON successfully.');
};

/**
 * Export Users to CSV
 */
window.exportUsersCSV = function () {
    const registry = getUsersRegistry();
    let csv = "ID,Name,Email,Password,Department,LoginType,Status,RegisteredAt,LastLogin\n";
    registry.forEach(u => {
        const safeName = `"${(u.name || '').replace(/"/g, '""')}"`;
        const safeEmail = `"${(u.email || '').replace(/"/g, '""')}"`;
        const safePass = `"${(u.password || '').replace(/"/g, '""')}"`;
        const safeDept = `"${(u.dept || '').replace(/"/g, '""')}"`;
        const status = u.isBlocked ? 'Blocked' : 'Active';
        csv += `${u.id || u.uid},${safeName},${safeEmail},${safePass},${safeDept},${u.loginType},${status},${u.registeredAt || ''},${u.lastLogin || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `subjects_online_users_${Date.now()}.csv`);
    link.click();
    showAdminToast('Database Exported', 'Downloaded users CSV successfully.');
};

/**
 * Helper to show toast messages in profile
 */
function showAdminToast(title, desc) {
    const toastEl = document.getElementById('settings-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastDesc = document.getElementById('toast-desc');
    if (toastEl && toastTitle && toastDesc) {
        toastTitle.textContent = title;
        toastDesc.textContent = desc;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 3000);
    }
}
