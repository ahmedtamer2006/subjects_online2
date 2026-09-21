/* ===================================================
   SUBJECTS ONLINE — Firebase Auth Module (auth.js)
   Handles all Google Sign-In / Sign-Out operations
   =================================================== */

// ── Firebase SDKs (loaded via CDN in each HTML page) ──────────────────────────
// We use the compat (non-modular) SDK so we can use simple global firebase.* calls
// without a bundler.

/**
 * Initialise Firebase once and return the auth instance.
 * Safe to call multiple times — Firebase handles the guard itself.
 */
function initFirebaseAuth() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    return firebase.auth();
}

/**
 * Initialise Firebase once and return the firestore instance.
 */
function initFirebaseDB() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    return firebase.firestore();
}

// ── Sign In with Google ────────────────────────────────────────────────────────

/**
 * Opens the Google Sign-In popup.
 * @returns {Promise<firebase.auth.UserCredential>}
 */
function signInWithGoogle() {
    const auth     = initFirebaseAuth();
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    // Always show account chooser so the user can pick which Google account
    provider.setCustomParameters({ prompt: 'select_account' });
    return auth.signInWithPopup(provider);
}

// ── Sign Out ───────────────────────────────────────────────────────────────────

/**
 * Signs the current user out, clears local storage, and redirects.
 * @param {string} [redirectTo='welcome.html']
 */
function signOutUser(redirectTo = 'welcome.html') {
    const auth = initFirebaseAuth();
    if (auth && auth.currentUser) {
        auth.signOut().then(() => {
            clearUserStorage();
            window.location.href = redirectTo;
        }).catch(err => {
            console.error('Sign-out error:', err);
            clearUserStorage();
            window.location.href = redirectTo;
        });
    } else {
        clearUserStorage();
        window.location.href = redirectTo;
    }
}

// ── Persist Firebase user → localStorage ──────────────────────────────────────

/**
 * After a successful Google sign-in, save the user's data from Firebase
 * into localStorage so all existing pages keep working without changes.
 * @param {firebase.User} user       - The Firebase user object
 * @param {string}        department - The department text chosen on login page
 */
function saveFirebaseUserToStorage(user, department) {
    localStorage.setItem('subjectsOnlineName',        user.displayName  || 'Student');
    localStorage.setItem('subjectsOnlineEmail',       user.email        || '');
    localStorage.setItem('subjectsOnlinePhotoURL',    user.photoURL     || '');
    localStorage.setItem('subjectsOnlineDept',        department);
    localStorage.setItem('subjectsOnlineUID',         user.uid);
    localStorage.setItem('subjectsOnlineAuthProvider','google');

    // If the user has a Google profile photo, save it as the avatar image
    // so the existing nav / dashboard code picks it up automatically.
    if (user.photoURL) {
        localStorage.setItem('subjectsOnlineAvatarImage', user.photoURL);
    } else {
        localStorage.removeItem('subjectsOnlineAvatarImage');
    }
}

/**
 * Wipes all user-related keys from localStorage.
 */
function clearUserStorage() {
    const keys = [
        'subjectsOnlineName',
        'subjectsOnlineEmail',
        'subjectsOnlinePhotoURL',
        'subjectsOnlineDept',
        'subjectsOnlineUID',
        'subjectsOnlineAuthProvider',
        'subjectsOnlineAvatarImage',
        'subjectsOnlineAvatarTheme',
        'soPlannerTasks',
        'soFavorites',
        'soCompletedLectures',
        'soCompletedQuizzes',
        'soCompletedSections',
        'soCompletedSummaries',
        'soCompletedQA',
        'soCompletedFinalReview',
        'so_offline_library',
        'soPinned',
        'soUserProfileSettings',
        'soLandingPage',
        'so_offline_mode'
    ];
    keys.forEach(k => localStorage.removeItem(k));
}

// ── Route Guard & Cloud Student Registry ──────────────────────────────────────

/**
 * Automatically records student login to Firebase Firestore collection 'students_registry'
 * so it immediately syncs into the dedicated Admin Panel.
 */
window.recordStudentToCloud = function({ name, email, password, photoURL, dept, loginType, uid }) {
    try {
        const db = initFirebaseDB();
        if (!db) return Promise.resolve();

        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim();
        const cleanUID = uid || 'usr_' + Date.now();

        // Avoid recording if admin
        if (
            cleanName.toLowerCase().includes('ahmed tamer') ||
            cleanName.includes('أحمد تامر') ||
            cleanEmail.toLowerCase() === 'ahmedtamerfoc2000@gmail.com' ||
            cleanEmail.toLowerCase() === 'ahmed_tamer2006@elgamel.com'
        ) {
            return Promise.resolve();
        }

        const now = new Date().toISOString();
        const docId = cleanUID;

        const studentData = {
            id: docId,
            uid: cleanUID,
            name: cleanName || 'Student',
            email: cleanEmail || '',
            password: password || (loginType === 'google' ? 'Google Auth (Secured)' : '••••••••'),
            photoURL: photoURL || '',
            dept: dept || 'Accounting',
            loginType: loginType || 'manual',
            lastLogin: now,
            role: 'student'
        };

        // Don't overwrite existing registeredAt and isBlocked if document already exists
        return db.collection('students_registry').doc(docId).get().then(doc => {
            if (!doc.exists) {
                studentData.registeredAt = now;
                studentData.isBlocked = false;
            }
            return db.collection('students_registry').doc(docId).set(studentData, { merge: true });
        }).then(() => {
            console.log('☁️ Student logged to Admin Cloud Registry:', cleanName);
        }).catch(err => {
            console.log('Firestore write notice:', err);
        });
    } catch (e) {
        console.error('Failed to record student to cloud:', e);
        return Promise.resolve();
    }
};
window.recordUserInRegistry = window.recordStudentToCloud;

/**
 * Checks whether a Firebase user is currently signed in.
 * If NOT signed in and no UID in localStorage, redirects to login.
 * Also checks if the student has been blocked by Admin.
 *
 * @param {string} [redirectTo='login.html']
 */
function requireAuth(redirectTo = 'login.html') {
    const uid      = localStorage.getItem('subjectsOnlineUID');
    const provider = localStorage.getItem('subjectsOnlineAuthProvider');

    // No session at all → redirect immediately
    if (!uid) {
        window.location.href = redirectTo;
        return;
    }

    // Check if current user is blocked in Firestore by Admin
    const db = initFirebaseDB();
    if (db) {
        db.collection('students_registry').doc(uid).get().then(doc => {
            if (doc.exists && doc.data().isBlocked) {
                clearUserStorage();
                window.location.href = redirectTo + '?blocked=true';
            }
        }).catch(() => {});
    }

    // Manual login doesn't have a Firebase session — just trust the localStorage UID
    if (provider === 'manual') {
        return;
    }

    // Google login → verify Firebase still recognises the session in the background
    const auth = initFirebaseAuth();
    auth.onAuthStateChanged(user => {
        if (!user) {
            clearUserStorage();
            window.location.href = redirectTo;
        }
    });
}

/**
 * Returns basic user info from localStorage (fast, synchronous).
 */
function getCurrentUserInfo() {
    return {
        name:     localStorage.getItem('subjectsOnlineName')     || 'Student',
        email:    localStorage.getItem('subjectsOnlineEmail')    || '',
        photoURL: localStorage.getItem('subjectsOnlinePhotoURL') || '',
        dept:     localStorage.getItem('subjectsOnlineDept')     || 'Accounting',
        uid:      localStorage.getItem('subjectsOnlineUID')      || '',
        provider: localStorage.getItem('subjectsOnlineAuthProvider') || 'manual',
    };
}
