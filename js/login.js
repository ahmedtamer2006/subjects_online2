/* ===================================================
   SUBJECTS ONLINE — Login Page JS
   GSAP Animations, File Upload, and Validation
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Initial GSAP Intro Animation
    initIntroAnimation();

    // 3. Setup Form Validation
    setupFormValidation();

    // Check if redirected because blocked
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('blocked') === 'true') {
        setTimeout(() => {
            showAuthError('🚫 Access Denied: Your account has been suspended by Admin Ahmed Tamer.');
        }, 500);
    }
});

/**
 * GSAP Intro Animation
 */
function initIntroAnimation() {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    // Header fades down
    tl.fromTo('.login-header',
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5, clearProps: 'transform' },
        0.2
    );

    // Card fades up
    tl.fromTo('.login-card',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5, clearProps: 'transform' },
        0.5
    );
}


/**
 * Form Validation Logic
 */
function setupFormValidation() {
    const form = document.getElementById('login-form');
    const nameInput = document.getElementById('user-name');
    const nameErrorMsg = document.getElementById('name-error');
    const nameValidIcon = document.getElementById('name-valid-icon');

    const passInput = document.getElementById('user-password');
    const passErrorMsg = document.getElementById('password-error');
    const passValidIcon = document.getElementById('password-valid-icon');

    const deptInput = document.getElementById('user-department');
    const deptErrorMsg = document.getElementById('dept-error');

    // Real-time validation for Name
    nameInput.addEventListener('input', () => {
        if (nameInput.value.trim().length > 0) {
            nameValidIcon.classList.remove('opacity-0');
            nameValidIcon.classList.add('opacity-100');
            nameErrorMsg.classList.add('hidden');
            nameInput.classList.remove('border-red-400', 'focus:ring-red-500/50');
            nameInput.classList.add('border-blue-200', 'focus:ring-blue-500/50');
        } else {
            nameValidIcon.classList.remove('opacity-100');
            nameValidIcon.classList.add('opacity-0');
        }
    });

    // Real-time validation for Password
    passInput.addEventListener('input', () => {
        if (passInput.value.length > 0) {
            passValidIcon.classList.remove('opacity-0');
            passValidIcon.classList.add('opacity-100');
            passErrorMsg.classList.add('hidden');
            passInput.classList.remove('border-red-400', 'focus:ring-red-500/50');
            passInput.classList.add('border-blue-200', 'focus:ring-blue-500/50');
        } else {
            passValidIcon.classList.remove('opacity-100');
            passValidIcon.classList.add('opacity-0');
        }
    });

    // Real-time validation for Department
    deptInput.addEventListener('change', () => {
        if (deptInput.value) {
            deptErrorMsg.classList.add('hidden');
            deptInput.classList.remove('border-red-400', 'focus:ring-red-500/50');
            deptInput.classList.add('border-blue-200', 'focus:ring-blue-500/50');
        }
    });

    const googleBtn = document.getElementById('google-btn');

    // ── Real Firebase Google Sign-In ──────────────────────────────────────────
    googleBtn.addEventListener('click', async () => {
        // 1. Validate department first
        if (!deptInput.value) {
            deptErrorMsg.classList.remove('hidden');
            deptInput.classList.remove('border-blue-200', 'focus:ring-blue-500/50');
            deptInput.classList.add('border-red-400', 'focus:ring-red-500/50', 'ring-2', 'ring-red-500/50');

            gsap.fromTo(deptInput,
                { x: -5 },
                { x: 5, duration: 0.05, yoyo: true, repeat: 5, ease: 'none', onComplete: () => gsap.set(deptInput, { x: 0 }) }
            );
            return;
        }

        const selectedDeptText = deptInput.options[deptInput.selectedIndex].text;

        // 2. Disable button and show loading state while popup opens
        googleBtn.disabled = true;
        googleBtn.style.opacity = '0.7';
        googleBtn.innerHTML = `
            <svg class="animate-spin w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            Connecting to Google...
        `;

        try {
            // 3. Open Google popup via Firebase
            const result = await signInWithGoogle();

            // Check if user is blocked by admin
            if (typeof isUserBlocked === 'function' && (isUserBlocked(result.user.email) || isUserBlocked(result.user.displayName) || isUserBlocked(result.user.uid))) {
                googleBtn.disabled = false;
                googleBtn.style.opacity = '1';
                googleBtn.innerHTML = `Continue with Google`;
                if (typeof signOutUser === 'function') signOutUser('login.html');
                showAuthError('🚫 Access Denied: Your account has been suspended by Admin Ahmed Tamer.');
                return;
            }

            // 4. Persist user data (name, photo, email) from Google into localStorage
            saveFirebaseUserToStorage(result.user, selectedDeptText);

            // Record in Admin User Registry
            if (typeof recordUserInRegistry === 'function') {
                recordUserInRegistry({
                    name: result.user.displayName,
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    dept: selectedDeptText,
                    loginType: 'google',
                    uid: result.user.uid
                });
            }

            // 5. Download cloud data if it exists, otherwise it will just trigger an initial upload
            await syncFromFirebase(result.user.uid);

            // 6. Trigger the existing creative loader animation → then redirect
            triggerCreativeLoader(selectedDeptText);

        } catch (err) {
            console.error('Google Sign-In failed:', err);

            // Restore button
            googleBtn.disabled = false;
            googleBtn.style.opacity = '1';
            googleBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-6 h-6">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Sign in with Google
            `;

            // Show a user-friendly error message
            let msg = 'Sign-in failed. Please try again.';
            if (err.code === 'auth/popup-closed-by-user') {
                msg = 'You closed the sign-in window. Please try again.';
            } else if (err.code === 'auth/network-request-failed') {
                msg = 'Network error. Please check your internet connection.';
            } else if (err.code === 'auth/popup-blocked') {
                msg = 'Popup was blocked by your browser. Please allow popups and try again.';
            } else if (err.code === 'auth/configuration-not-found' || err.message?.includes('YOUR_')) {
                msg = '⚠️ Firebase not configured yet. Please add your project credentials to js/firebase-config.js';
            }

            // Show a toast notification below the button
            showAuthError(msg);
        }
    });

    // Submit handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const password = passInput.value;
        let hasError = false;

        // Validate Name
        if (!name) {
            hasError = true;
            nameErrorMsg.classList.remove('hidden');
            nameInput.classList.remove('border-blue-200', 'focus:ring-blue-500/50');
            nameInput.classList.add('border-red-400', 'focus:ring-red-500/50', 'ring-2', 'ring-red-500/50');

            gsap.fromTo(nameInput,
                { x: -5 },
                { x: 5, duration: 0.05, yoyo: true, repeat: 5, ease: 'none', onComplete: () => gsap.set(nameInput, {x: 0}) }
            );
        }

        // Validate Password
        if (!password) {
            hasError = true;
            passErrorMsg.classList.remove('hidden');
            passInput.classList.remove('border-blue-200', 'focus:ring-blue-500/50');
            passInput.classList.add('border-red-400', 'focus:ring-red-500/50', 'ring-2', 'ring-red-500/50');

            gsap.fromTo(passInput,
                { x: -5 },
                { x: 5, duration: 0.05, yoyo: true, repeat: 5, ease: 'none', onComplete: () => gsap.set(passInput, {x: 0}) }
            );
        }

        // Validate Department
        if (!deptInput.value) {
            hasError = true;
            deptErrorMsg.classList.remove('hidden');
            deptInput.classList.remove('border-blue-200', 'focus:ring-blue-500/50');
            deptInput.classList.add('border-red-400', 'focus:ring-red-500/50', 'ring-2', 'ring-red-500/50');

            gsap.fromTo(deptInput,
                { x: -5 },
                { x: 5, duration: 0.05, yoyo: true, repeat: 5, ease: 'none', onComplete: () => gsap.set(deptInput, {x: 0}) }
            );
        }

        if (hasError) return;

        // Check if user is blocked by admin
        if (typeof isUserBlocked === 'function' && isUserBlocked(name)) {
            showAuthError('🚫 Access Denied: Your account has been suspended by Admin Ahmed Tamer.');
            return;
        }

        // --- SUCCESS STATE ---
        const selectedDeptText = deptInput.options[deptInput.selectedIndex].text;
        const newUID = 'manual_' + encodeURIComponent(name.toLowerCase()).replace(/%/g, '_');

        // Save manual session so requireAuth() passes on dashboard
        localStorage.setItem('subjectsOnlineName',        nameInput.value.trim());
        localStorage.setItem('subjectsOnlineDept',        selectedDeptText);
        localStorage.setItem('subjectsOnlineUID',         newUID);
        localStorage.setItem('subjectsOnlineAuthProvider','manual');

        // Record in Admin User Registry
        if (typeof recordUserInRegistry === 'function') {
            recordUserInRegistry({
                name: name,
                password: password,
                dept: selectedDeptText,
                loginType: 'manual',
                uid: newUID
            });
        }

        triggerCreativeLoader(selectedDeptText);
    });
}

/**
 * Triggers the fullscreen creative loading animation
 */
function triggerCreativeLoader(departmentName) {
    const loader = document.getElementById('creative-loader');
    const loginCard = document.querySelector('.login-card');
    const loginHeader = document.querySelector('.login-header');

    // 1. Hide Form smoothly
    gsap.to([loginCard, loginHeader], {
        y: -30,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.in'
    });

    // 2. Show Loader
    loader.classList.remove('pointer-events-none');
    gsap.to(loader, { opacity: 1, duration: 1, delay: 0.4 });

    // 3. Animate Progress Bar
    gsap.to('#loader-progress', { width: '100%', duration: 4.5, ease: 'power1.inOut', delay: 0.8 });

    // 4. Cycle text
    const statusText = document.getElementById('loader-status-text');
    const phrases = [
        "Authenticating Securely...",
        `Loading ${departmentName} Data...`,
        "Preparing Your Modules...",
        "Almost Ready..."
    ];

    let tl = gsap.timeline({ delay: 1 });
    phrases.forEach((phrase) => {
        tl.to(statusText, { opacity: 0, y: -10, duration: 0.3 })
          .call(() => statusText.innerText = phrase)
          .fromTo(statusText, { y: 10, opacity: 0 }, { opacity: 1, y: 0, duration: 0.4 })
          .to({}, { duration: 0.6 }); // wait
    });

    // 5. When done, redirect
    tl.call(() => {
        gsap.to('#creative-loader', { opacity: 0, duration: 0.5, onComplete: () => {
            // If signed in with Google, data is already in localStorage from saveFirebaseUserToStorage().
            // For manual form, save name & dept from inputs.
            const provider = localStorage.getItem('subjectsOnlineAuthProvider');
            if (provider !== 'google') {
                const nameInput = document.getElementById('user-name').value.trim();
                if (nameInput) localStorage.setItem('subjectsOnlineName', nameInput);
                localStorage.setItem('subjectsOnlineDept', departmentName);
            }

            // Redirect
            const landingTarget = localStorage.getItem('soLandingPage') || 'dashboard.html';
            window.location.href = landingTarget;
        }});
    });
}

/**
 * Displays a styled error toast below the Google button.
 * @param {string} message
 */
function showAuthError(message) {
    // Remove any existing toast
    const existing = document.getElementById('auth-error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'auth-error-toast';
    toast.style.cssText = [
        'margin-top:12px',
        'width:100%',
        'padding:12px 16px',
        'background:#fef2f2',
        'border:1px solid #fecaca',
        'border-radius:12px',
        'color:#dc2626',
        'font-size:0.82rem',
        'font-weight:500',
        'text-align:center',
        'opacity:0',
        'transform:translateY(6px)',
        'transition:opacity 0.3s,transform 0.3s',
    ].join(';');
    toast.textContent = message;

    // Insert after the Google button
    const googleBtn = document.getElementById('google-btn');
    googleBtn.insertAdjacentElement('afterend', toast);

    // Trigger fade-in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Auto-remove after 6 s
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 6000);
}
