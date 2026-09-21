/* shared-nav.js — Injects the shared navbar and highlights the current page */
(function () {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    const userName = localStorage.getItem('subjectsOnlineName') || 'Student';
    const initial = userName[0].toUpperCase();

    // Sanitize old Arabic values from local storage
    let storedDept = localStorage.getItem('subjectsOnlineDept');
    if (storedDept && storedDept.includes('(')) {
        storedDept = storedDept.replace(/\s*\(.*?\)\s*/g, '').trim();
        localStorage.setItem('subjectsOnlineDept', storedDept);
    }

    const avatarTheme = localStorage.getItem('subjectsOnlineAvatarTheme') || 'blue';
    const avatarImage = localStorage.getItem('subjectsOnlineAvatarImage') || null;

    // Apply global preferences
    const viewDensity = localStorage.getItem('soViewDensity') || 'comfortable';
    if (viewDensity === 'compact') {
        document.documentElement.classList.add('density-compact');
        document.body?.classList.add('density-compact');
    } else {
        document.documentElement.classList.remove('density-compact');
        document.body?.classList.remove('density-compact');
    }

    const reduceMotion = localStorage.getItem('soReduceMotion') === 'true';
    if (reduceMotion) {
        document.documentElement.classList.add('reduce-motion');
        document.body?.classList.add('reduce-motion');
        if (window.gsap) {
            try {
                gsap.globalTimeline.timeScale(100);
            } catch (e) { }
        }
    } else {
        document.documentElement.classList.remove('reduce-motion');
        document.body?.classList.remove('reduce-motion');
    }

    const readingFont = localStorage.getItem('soReadingFontSize') || 'normal';
    document.documentElement.setAttribute('data-font-size', readingFont);

    const progressStyle = localStorage.getItem('soProgressStyle') || 'ring';
    document.documentElement.setAttribute('data-progress-style', progressStyle);

    // Global observer for progress-ring-wrapper on content pages
    function syncPageProgressStyle() {
        const style = localStorage.getItem('soProgressStyle') || 'ring';
        const wrapper = document.getElementById('progress-ring-wrapper');
        if (!wrapper) return;

        const textCircle = document.getElementById('progress-text-circle');
        const pct = textCircle ? parseInt(textCircle.textContent) || 0 : 0;

        let linearTrack = wrapper.querySelector('.linear-progress-track');
        if (style === 'bar') {
            if (!linearTrack) {
                linearTrack = document.createElement('div');
                linearTrack.className = 'linear-progress-track w-full h-3 bg-slate-200 dark:bg-slate-700/80 rounded-full overflow-hidden mt-3';
                linearTrack.innerHTML = `<div class="linear-progress-fill h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-700" style="width: ${pct}%;"></div>`;
                const centerContent = wrapper.querySelector('div:not(#progress-tooltip)');
                if (centerContent) centerContent.appendChild(linearTrack);
            } else {
                const fill = linearTrack.querySelector('.linear-progress-fill');
                if (fill) fill.style.width = `${pct}%`;
            }
        } else if (linearTrack) {
            linearTrack.remove();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            syncPageProgressStyle();
            setTimeout(syncPageProgressStyle, 300);
            setTimeout(syncPageProgressStyle, 1000);
        });
    } else {
        syncPageProgressStyle();
        setTimeout(syncPageProgressStyle, 300);
        setTimeout(syncPageProgressStyle, 1000);
    }

    const themeGradients = {
        'blue': 'linear-gradient(135deg,#bfdbfe,#dbeafe)',
        'emerald': 'linear-gradient(135deg,#6ee7b7,#d1fae5)',
        'rose': 'linear-gradient(135deg,#fda4af,#ffe4e6)',
        'violet': 'linear-gradient(135deg,#c4b5fd,#ede9fe)',
        'amber': 'linear-gradient(135deg,#fcd34d,#fed7aa)',
        'indigo': 'linear-gradient(135deg,#a5b4fc,#c7d2fe)'
    };
    const themeTextColors = {
        'blue': '#1d4ed8', 'emerald': '#047857', 'rose': '#be123c', 'violet': '#6d28d9',
        'amber': '#b45309', 'indigo': '#3730a3'
    };

    const bgGradient = avatarImage ? 'transparent' : (themeGradients[avatarTheme] || themeGradients['blue']);
    const textColor = themeTextColors[avatarTheme] || themeTextColors['blue'];

    // Construct avatar content
    const avatarContent = avatarImage
        ? `<img src="${avatarImage}" alt="User Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
        : initial;
    const isDashboardPage = (currentPage === 'dashboard.html' || currentPage === '' || currentPage === '/' || currentPage === 'index.html');

    const dashboardNavHTML = `
            <a href="#wi-section" title="What's Inside" class="pill-nav-item pill-nav-wi" onclick="const el=document.getElementById('wi-section');if(el){el.scrollIntoView({behavior:'smooth'});return false;}">
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 01-2-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 01-2-2m0 0V5a2 2 0 01-2-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <span>What's Inside</span>
            </a>

            <div class="pill-sep" aria-hidden="true"></div>

            <a href="#tyg-section" title="Track Your Growth" class="pill-nav-item pill-nav-tyg" onclick="const el=document.getElementById('tyg-section');if(el){el.scrollIntoView({behavior:'smooth'});return false;}">
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                <span>Track Your Growth</span>
            </a>
    `;

    const subpageNavHTML = `
            <a href="dashboard.html" title="Home" class="pill-nav-item pill-nav-home">
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                <span>Home</span>
            </a>

            <div class="pill-sep" aria-hidden="true"></div>

            <a href="browse.html" title="Browse" class="pill-nav-item pill-nav-browse ${currentPage === 'browse.html' ? 'active' : ''}">
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <path d="M9 7h6M9 11h4"/>
                </svg>
                <span>Browse</span>
            </a>

            <div class="pill-sep" aria-hidden="true"></div>

            <a href="library.html" title="Library" class="pill-nav-item pill-nav-library ${currentPage === 'library.html' ? 'active' : ''}">
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <span>Library</span>
            </a>

            <div class="pill-sep" aria-hidden="true"></div>

            <a href="essays.html" title="Essays" class="pill-nav-item pill-nav-essays ${currentPage === 'essays.html' ? 'active' : ''}">
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span>Essays</span>
            </a>

            <div class="pill-sep" aria-hidden="true"></div>

            <a href="favorites.html" title="Favorites" class="pill-nav-item pill-nav-favorites ${currentPage === 'favorites.html' ? 'active' : ''}">
                <div class="heart-icon-wrap" style="display:inline-flex;align-items:center;justify-content:center;position:relative;">
                    <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                </div>
                <span>Favorites</span>
            </a>
    `;

    const navHTML = `
    <header id="shared-nav" class="shared-main-navbar" style="
        position: absolute; top: 0; left: 0; right: 0; z-index: 100;
        width: 100%;
        height: 76px;
        padding: 0 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        pointer-events: none;
    ">
        <!-- LEFT SIDE: Brand Logo -->
        <a id="shared-nav-logo" href="dashboard.html" title="Subjects Online Home" style="
            display: flex;
            align-items: center;
            text-decoration: none;
            pointer-events: auto;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 101;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <img src="images/robot-logo.png" alt="Subjects Online Logo" class="shared-nav-logo-img">
        </a>

        <!-- CENTER: Interactive Luxury Navigation Bar -->
        <nav id="custom-landing-pill" class="custom-landing-pill-nav" style="
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            z-index: 101;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 5px 8px;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(30px) saturate(210%);
            -webkit-backdrop-filter: blur(30px) saturate(210%);
            border: 1px solid rgba(14, 165, 233, 0.22);
            box-shadow:
                0 15px 35px -5px rgba(14, 165, 233, 0.18),
                0 4px 12px rgba(0, 0, 0, 0.04),
                inset 0 1px 1px rgba(255, 255, 255, 1);
            opacity: 1;
            pointer-events: auto;
        ">
            <!-- Glass Shimmer sweep -->
            <div class="pill-shimmer" aria-hidden="true"></div>

            ${isDashboardPage ? dashboardNavHTML : subpageNavHTML}
        </nav>

        ${isDashboardPage ? `
        <!-- RIGHT SIDE: User Profile Section / Icon -->
        <a id="shared-nav-profile-right" href="profile.html" title="Profile Settings — ${userName}" style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(30px) saturate(210%);
            -webkit-backdrop-filter: blur(30px) saturate(210%);
            border: 1.5px solid rgba(14, 165, 233, 0.35);
            box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.22), 0 4px 12px rgba(0,0,0,0.04);
            text-decoration: none;
            cursor: pointer;
            pointer-events: auto;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 101;
        " onmouseover="this.style.transform='scale(1.08)'; this.style.borderColor='rgba(14,165,233,0.8)';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='rgba(14,165,233,0.35)';">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${bgGradient}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', Inter, sans-serif; font-weight: 800; font-size: 0.9rem; overflow: hidden; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">
                ${avatarContent}
            </div>
        </a>
        ` : ''}
    </header>
    <style>
        /* ═══════════════════════════════════════════════════
           ULTRA-LUXURY PILL NAVBAR
           ═══════════════════════════════════════════════════ */

        .custom-landing-pill-nav {
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(14, 165, 233, 0.22) !important;
        }

        /* Glass Shimmer Light Sweep */
        .pill-shimmer {
            position: absolute;
            top: 0; left: -100%;
            width: 70%;
            height: 100%;
            background: linear-gradient(
                110deg,
                transparent 30%,
                rgba(255, 255, 255, 0.7) 50%,
                transparent 70%
            );
            pointer-events: none;
            z-index: 10;
            border-radius: inherit;
            animation: pillShimmerSweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes pillShimmerSweep {
            0%   { left: -100%; opacity: 0; }
            12%  { opacity: 1; }
            45%  { left: 140%; opacity: 0.7; }
            100% { left: 140%; opacity: 0; }
        }

        /* Separator line between items */
        .pill-sep {
            width: 1px;
            height: 20px;
            background: linear-gradient(to bottom, transparent, rgba(14, 165, 233, 0.22), transparent);
            flex-shrink: 0;
            border-radius: 1px;
            transition: opacity 0.3s ease;
        }

        /* Nav Item Base */
        .pill-nav-item {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 9px 18px;
            border-radius: 9999px;
            font-family: 'Plus Jakarta Sans', Inter, system-ui, sans-serif;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 0.025em;
            color: #475569;
            text-decoration: none;
            transition: all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            white-space: nowrap;
            z-index: 1;
            border: 1px solid transparent;
        }

        .pill-nav-item svg {
            transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.32s ease, fill 0.32s ease, filter 0.32s ease;
            flex-shrink: 0;
        }

        /* ── 1. HOME HOVER (Sky Blue Glow) ── */
        .pill-nav-home:not(.active):hover {
            color: #0ea5e9 !important;
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(56, 189, 248, 0.08) 100%) !important;
            border-color: rgba(14, 165, 233, 0.3) !important;
            box-shadow:
                0 6px 20px -2px rgba(14, 165, 233, 0.25),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
            transform: translateY(-2px);
        }
        .pill-nav-home:not(.active):hover svg {
            stroke: #0ea5e9;
            transform: translateY(-2px) scale(1.18);
            filter: drop-shadow(0 2px 6px rgba(14, 165, 233, 0.4));
        }

        /* ── 2. BROWSE HOVER (Cyan / Sky Glow) ── */
        .pill-nav-browse:not(.active):hover {
            color: #0ea5e9 !important;
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(56, 189, 248, 0.08) 100%) !important;
            border-color: rgba(14, 165, 233, 0.3) !important;
            box-shadow:
                0 6px 20px -2px rgba(14, 165, 233, 0.25),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
            transform: translateY(-2px);
        }
        .pill-nav-browse:not(.active):hover svg {
            stroke: #0ea5e9;
            transform: scale(1.2) rotate(6deg);
            filter: drop-shadow(0 2px 6px rgba(14, 165, 233, 0.4));
        }

        /* ── 2. LIBRARY HOVER (Indigo Royal Glow) ── */
        .pill-nav-library:not(.active):hover {
            color: #6366f1 !important;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(129, 140, 248, 0.08) 100%) !important;
            border-color: rgba(99, 102, 241, 0.3) !important;
            box-shadow:
                0 6px 20px -2px rgba(99, 102, 241, 0.25),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
            transform: translateY(-2px);
        }
        .pill-nav-library:not(.active):hover svg {
            stroke: #6366f1;
            transform: rotate(-12deg) scale(1.22);
            filter: drop-shadow(0 2px 6px rgba(99, 102, 241, 0.4));
        }

        /* ── 3. ESSAYS HOVER (Golden Amber Glow) ── */
        .pill-nav-essays:not(.active):hover {
            color: #d97706 !important;
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(251, 191, 36, 0.08) 100%) !important;
            border-color: rgba(245, 158, 11, 0.35) !important;
            box-shadow:
                0 6px 20px -2px rgba(245, 158, 11, 0.25),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
            transform: translateY(-2px);
        }
        html.dark-mode .pill-nav-essays:not(.active):hover {
            color: #fbbf24 !important;
        }
        .pill-nav-essays:not(.active):hover svg {
            stroke: #d97706;
            transform: rotate(14deg) translateY(-1px) scale(1.22);
            filter: drop-shadow(0 2px 6px rgba(245, 158, 11, 0.4));
        }
        html.dark-mode .pill-nav-essays:not(.active):hover svg {
            stroke: #fbbf24;
        }

        /* ── 4. FAVORITES HOVER (Vivid Red Heartbeat + Fill + Red Aura) ── */
        .pill-nav-favorites:not(.active):hover {
            color: #f43f5e !important;
            background: linear-gradient(135deg, rgba(244, 63, 94, 0.16) 0%, rgba(251, 113, 133, 0.08) 100%) !important;
            border-color: rgba(244, 63, 94, 0.4) !important;
            box-shadow:
                0 6px 22px -2px rgba(244, 63, 94, 0.35),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
            transform: translateY(-2px);
        }
        .pill-nav-favorites:not(.active):hover svg {
            stroke: #ef4444;
            fill: #ef4444;
            filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6));
            animation: luxuryHeartBeat 0.85s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        @keyframes luxuryHeartBeat {
            0%   { transform: scale(1.15); }
            20%  { transform: scale(1.42); }
            40%  { transform: scale(1.22); }
            60%  { transform: scale(1.38); }
            80%  { transform: scale(1.18); }
            100% { transform: scale(1.15); }
        }

        /* ── 5. PROFILE HOVER (Sky Blue / Indigo Glow) ── */
        .pill-nav-profile:not(.active):hover {
            color: #0ea5e9 !important;
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(99, 102, 241, 0.08) 100%) !important;
            border-color: rgba(14, 165, 233, 0.35) !important;
            box-shadow:
                0 6px 20px -2px rgba(14, 165, 233, 0.25),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
            transform: translateY(-2px);
        }
        .pill-nav-profile:not(.active):hover .profile-avatar-pill {
            transform: scale(1.15);
            box-shadow: 0 0 10px rgba(14, 165, 233, 0.5);
        }

        /* ── ACTIVE ITEM STATE (Luminous Pill) ── */
        .pill-nav-item.active {
            background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%) !important;
            color: #ffffff !important;
            border-color: rgba(255, 255, 255, 0.4) !important;
            box-shadow:
                0 8px 24px -2px rgba(14, 165, 233, 0.45),
                0 2px 6px rgba(0, 0, 0, 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 0.45);
        }

        .pill-nav-item.active svg {
            stroke: #ffffff;
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.2));
        }

        /* ── Dark Mode Ultra-Luxury Enhancements ── */
        html.dark-mode #shared-nav-profile-right {
            background: rgba(15, 23, 42, 0.88) !important;
            border-color: rgba(56, 189, 248, 0.35) !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08) inset !important;
        }

        html.dark-mode .custom-landing-pill-nav {
            background: rgba(8, 15, 30, 0.88) !important;
            border-color: rgba(56, 189, 248, 0.22) !important;
            box-shadow:
                0 20px 45px -10px rgba(0, 0, 0, 0.8),
                0 0 0 1px rgba(255, 255, 255, 0.08) inset,
                inset 0 1px 1px rgba(255, 255, 255, 0.05) !important;
        }

        html.dark-mode .pill-sep {
            background: linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.18), transparent);
        }

        html.dark-mode .pill-shimmer {
            background: linear-gradient(
                110deg,
                transparent 30%,
                rgba(255, 255, 255, 0.12) 50%,
                transparent 70%
            );
        }

        html.dark-mode .pill-nav-item {
            color: #94a3b8;
        }

        html.dark-mode .pill-nav-item.active {
            background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #818cf8 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 8px 25px rgba(14, 165, 233, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
        }

        /* ── Responsive Shared Nav Logo ── */
        .shared-nav-logo-img {
            height: 110px;
            margin-top: -10px;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 4px 12px rgba(14, 165, 233, 0.25));
            transition: all 0.3s ease;
        }

        /* ── Mobile: icon-only & responsive logo ── */
        @media (max-width: 768px) {
            #shared-nav {
                padding: 0 16px !important;
            }
            .shared-nav-logo-img {
                height: 88px !important;
                margin-top: 0 !important;
            }
        }

        @media (max-width: 640px) {
            #shared-nav {
                padding: 0 12px !important;
            }
            .shared-nav-logo-img {
                height: 80px !important;
                margin-top: 0 !important;
                margin-left:-5px;
            }
            .pill-nav-item span { display: none !important; }
            .pill-nav-item { padding: 9px 10px !important; }
            .custom-landing-pill-nav { padding: 4px 5px !important; gap: 1px !important; }
            .pill-sep { height: 14px; }
        }

        @media (max-width: 400px) {
            #shared-nav {
                padding: 0 8px !important;
            }
            .shared-nav-logo-img {
                height: 80px !important;
                margin-top: 0 !important;
                margin-left:-5px !important
            }
            .logo-text-secondary { display: none; }
        }
    </style>
    `;


    const footerHTML = `
    <footer style="
        margin-top: 5rem;
        width: 100%;
        background: rgba(255, 255, 255, 0.6);
        backdrop-filter: blur(40px);
        -webkit-backdrop-filter: blur(40px);
        border-top: 1px solid rgba(255, 255, 255, 0.8);
        padding: 5rem 2rem 2rem 2rem;
        position: relative;
        z-index: 10;
        box-shadow: 0 -20px 40px rgba(15, 23, 42, 0.02);
    " class="shared-footer-mega">

        <div style="max-width: 76rem; margin: 0 auto;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 3rem; margin-bottom: 4rem;">

                <!-- Column 1: Brand & About -->
                <div style="display:flex; flex-direction: column; gap: 1.5rem;">
                    <div style="display:flex;align-items:center;">
                        <img src="images/robot-logo.png" alt="Subjects Online Logo" style="height:140px;width:auto;object-fit:contain;">
                    </div>
                    <p style="font-size:0.9rem;color:#64748b;line-height:1.7;margin:0;font-weight:300;" class="mega-desc">
                        A premium educational platform crafted specifically for commerce students. Elevate your learning experience with our modern tools and resources.
                    </p>
                    <div style="display:flex;gap:1rem;margin-top:0.5rem;" class="mega-socials">
                        <!-- Facebook -->
                        <a href="#" style="width:36px;height:36px;border-radius:50%;background:rgba(37,99,235,0.1);display:flex;align-items:center;justify-content:center;color:#2563eb;transition:all 0.3s;" onmouseover="this.style.background='#2563eb';this.style.color='#fff';" onmouseout="this.style.background='rgba(37,99,235,0.1)';this.style.color='#2563eb';">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.597 0 0 .597 0 1.325v21.351C0 23.403.597 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.597 1.323-1.325V1.325C24 .597 23.403 0 22.675 0z"/></svg>
                        </a>
                        <!-- Twitter/X -->
                        <a href="#" style="width:36px;height:36px;border-radius:50%;background:rgba(37,99,235,0.1);display:flex;align-items:center;justify-content:center;color:#2563eb;transition:all 0.3s;" onmouseover="this.style.background='#2563eb';this.style.color='#fff';" onmouseout="this.style.background='rgba(37,99,235,0.1)';this.style.color='#2563eb';">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.873 11.633Z"/></svg>
                        </a>
                        <!-- YouTube -->
                        <a href="#" style="width:36px;height:36px;border-radius:50%;background:rgba(37,99,235,0.1);display:flex;align-items:center;justify-content:center;color:#2563eb;transition:all 0.3s;" onmouseover="this.style.background='#2563eb';this.style.color='#fff';" onmouseout="this.style.background='rgba(37,99,235,0.1)';this.style.color='#2563eb';">
                           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        </a>
                    </div>
                </div>

                <!-- Column 2: Platform -->
                <div style="display:flex; flex-direction: column; gap: 1rem;">
                    <h4 style="font-size:1.05rem;font-weight:700;color:#1e3a8a;margin:0 0 0.5rem 0;" class="mega-col-title">Platform</h4>
                    <a href="dashboard.html" class="mega-link">Home Dashboard</a>
                    <a href="browse.html" class="mega-link">Library & Materials</a>
                    <a href="essays.html" class="mega-link">Doctor Essays</a>
                    <a href="favorites.html" class="mega-link">My Favorites</a>
                    <a href="#" class="mega-link">Study Planner</a>
                </div>

                <!-- Column 3: Resources -->
                <div style="display:flex; flex-direction: column; gap: 1rem;">
                    <h4 style="font-size:1.05rem;font-weight:700;color:#1e3a8a;margin:0 0 0.5rem 0;" class="mega-col-title">Resources</h4>
                    <a href="#" class="mega-link">Help Center & FAQ</a>
                    <a href="#" class="mega-link">Contact Support</a>
                    <a href="#" class="mega-link">Report a Bug</a>
                    <a href="#" class="mega-link">System Status</a>
                </div>

                <!-- Column 4: Legal -->
                <div style="display:flex; flex-direction: column; gap: 1rem;">
                    <h4 style="font-size:1.05rem;font-weight:700;color:#1e3a8a;margin:0 0 0.5rem 0;" class="mega-col-title">Legal & Privacy</h4>
                    <a href="#" class="mega-link">Terms of Service</a>
                    <a href="#" class="mega-link">Privacy Policy</a>
                    <a href="#" class="mega-link">Cookie Policy</a>
                    <a href="#" class="mega-link">Accessibility</a>
                </div>

            </div>

            <div style="width: 100%; height: 1px; background: rgba(59,130,246,0.15); margin: 2rem 0;"></div>

            <div style="display:flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <p style="font-size:0.85rem;color:#64748b;margin:0;font-weight:500;" class="mega-copy">
                    &copy; ${new Date().getFullYear()} Subjects Online. All rights reserved.
                </p>
                <div style="display:flex; gap: 1.5rem;">
                    <span style="font-size:0.8rem;color:#94a3b8;" class="mega-lang">Developed By Ahmed Tamer</span>
                </div>
            </div>
        </div>
    </footer>
    `;

    // Inject at top of body
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // Scroll spy for Dashboard page navigation pill items
    if (isDashboardPage) {
        window.addEventListener('scroll', () => {
            const wiSec = document.getElementById('wi-section');
            const tygSec = document.getElementById('tyg-section');
            const wiItem = document.querySelector('#custom-landing-pill .pill-nav-wi');
            const tygItem = document.querySelector('#custom-landing-pill .pill-nav-tyg');

            if (!wiItem || !tygItem) return;

            const scrollPos = window.scrollY + 250;
            const wiTop = wiSec ? wiSec.offsetTop : 999999;
            const tygTop = tygSec ? tygSec.offsetTop : 999999;

            [wiItem, tygItem].forEach(el => el.classList.remove('active'));

            if (scrollPos >= tygTop) {
                tygItem.classList.add('active');
            } else if (scrollPos >= wiTop) {
                wiItem.classList.add('active');
            }
        });
    }

    // Inject footer only on dashboard
    if (currentPage === 'dashboard.html' || currentPage === '' || currentPage === '/') {
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }

    // ── Global Sky Blue Theme Injection ──────────────────────────────────────────
    const globalTheme = document.createElement('style');
    globalTheme.textContent = `
        /* =====================================================
           GLOBAL WHITE & SKY BLUE THEME — Subjects Online
           Applied site-wide via shared-nav.js
           ===================================================== */

        /* Viewport Horizontal Overflow Protection */
        html, body {
            overflow-x: hidden !important;
            max-width: 100vw !important;
            position: relative;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #F0F9FF; }
        ::-webkit-scrollbar-thumb { background: #7DD3FC; border-radius: 999px; }

        /* Override welcome.css dark variables */
        html:not(.dark-mode) body:not(.dashboard-page) {
            --bg:           #F0F9FF !important;
            --bg-1:         #FFFFFF !important;
            --bg-2:         #EFF6FF !important;
            --border:       rgba(14,165,233,0.12) !important;
            --border-hover: rgba(14,165,233,0.25) !important;
            --accent:       #0EA5E9 !important;
            --accent-2:     #38BDF8 !important;
            --accent-glow:  rgba(14,165,233,0.25) !important;
            --text-1:       #0C1A2E !important;
            --text-2:       #334155 !important;
            --text-3:       #64748B !important;
        }

        /* Body background global override */
        html:not(.dark-mode) body {
            background: #F0F9FF !important;
            color: #0C1A2E !important;
        }

        /* Dark mesh orbs → light sky blue orbs */
        html:not(.dark-mode) .mesh-orb-1 {
            background: radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 65%) !important;
        }
        html:not(.dark-mode) .mesh-orb-2 {
            background: radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 65%) !important;
        }
        html:not(.dark-mode) .mesh-orb-3 {
            background: radial-gradient(circle, rgba(99,214,250,0.06) 0%, transparent 65%) !important;
        }

        /* Site header — light frosted glass */
        html:not(.dark-mode) .site-header {
            background: rgba(240, 249, 255, 0.85) !important;
            border-bottom-color: rgba(14,165,233,0.1) !important;
        }

        /* Nav logo text */
        html:not(.dark-mode) .nav-logo-name { color: #0C1A2E !important; }
        html:not(.dark-mode) .nav-link { color: #334155 !important; }
        html:not(.dark-mode) .nav-link:hover { color: #0EA5E9 !important; }

        /* Cards — white with sky blue borders */
        html:not(.dark-mode) .preview-main, html:not(.dark-mode) .preview-stat, html:not(.dark-mode) .preview-badge-float {
            background: #FFFFFF !important;
            border-color: rgba(14,165,233,0.15) !important;
            box-shadow: 0 4px 20px rgba(14,165,233,0.06) !important;
        }
        html:not(.dark-mode) .subject-card {
            background: #F0F9FF !important;
            border-color: rgba(14,165,233,0.12) !important;
        }
        html:not(.dark-mode) .subject-card.active {
            background: rgba(14,165,233,0.06) !important;
            border-color: rgba(14,165,233,0.3) !important;
        }
        html:not(.dark-mode) .subject-name { color: #0C1A2E !important; }
        html:not(.dark-mode) .subject-meta { color: #64748B !important; }
        html:not(.dark-mode) .preview-stat-value { color: #0C1A2E !important; }
        html:not(.dark-mode) .preview-stat-label { color: #64748B !important; }

        /* Stats strip */
        html:not(.dark-mode) .stats-strip {
            border-color: rgba(14,165,233,0.1) !important;
            background: rgba(14,165,233,0.03) !important;
        }
        html:not(.dark-mode) .stat-item { border-right-color: rgba(14,165,233,0.1) !important; }
        html:not(.dark-mode) .stat-value { color: #0C1A2E !important; }
        html:not(.dark-mode) .stat-label { color: #64748B !important; }

        /* Headings in light sections */
        html:not(.dark-mode) .section-heading { color: #0C1A2E !important; }
        html:not(.dark-mode) .hero-title { color: #0C1A2E !important; }
        html:not(.dark-mode) .hero-subtitle { color: #334155 !important; }

        /* Feature cards */
        html:not(.dark-mode) .feature-visual {
            background: #FFFFFF !important;
            border-color: rgba(14,165,233,0.12) !important;
        }
        html:not(.dark-mode) .feature-visual::after {
            background: linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent) !important;
        }

        /* Chapter cards in light mode */
        html:not(.dark-mode) .chap-card {
            background: rgba(255,255,255,0.95) !important;
            border-color: rgba(14,165,233,0.12) !important;
        }
        html:not(.dark-mode) .chap-card:hover {
            border-color: rgba(14,165,233,0.3) !important;
        }

        /* proof-avatars */
        html:not(.dark-mode) .proof-avatar { border-color: #F0F9FF !important; }

        /* Ghost button */
        html:not(.dark-mode) .btn-hero-ghost {
            border-color: rgba(14,165,233,0.25) !important;
            color: #334155 !important;
        }
        html:not(.dark-mode) .btn-hero-ghost:hover {
            border-color: rgba(14,165,233,0.45) !important;
            color: #0C1A2E !important;
            background: rgba(14,165,233,0.05) !important;
        }

        /* Subject progress fill */
        html:not(.dark-mode) .subject-progress-fill { background: #0EA5E9 !important; }
        html:not(.dark-mode) .subject-progress-bar { background: #BFDBFE !important; }

        /* Section labels */
        html:not(.dark-mode) .section-label-line { background: #0EA5E9 !important; }
        html:not(.dark-mode) .section-label-text { color: #0EA5E9 !important; }
        html:not(.dark-mode) .eyebrow-text { color: #0EA5E9 !important; }
        html:not(.dark-mode) .eyebrow-dot { background: #0EA5E9 !important; }

        /* outline text */
        html:not(.dark-mode) .hero-title-outline {
            -webkit-text-stroke-color: rgba(14,165,233,0.25) !important;
        }

        /* Topbar preview dots context */
        html:not(.dark-mode) .preview-topbar {
            background: rgba(240,249,255,0.5) !important;
            border-bottom-color: rgba(14,165,233,0.1) !important;
        }
        html:not(.dark-mode) .topbar-title { color: #94A3B8 !important; }
    `;
    document.head.appendChild(globalTheme);

    const style = document.createElement('style');
    style.textContent = `
        /* Mega Footer Styles */
        .mega-link {
            font-size: 0.9rem;
            color: #475569;
            text-decoration: none;
            transition: all 0.2s;
            font-weight: 500;
            display: inline-block;
        }
        .mega-link:hover {
            color: #0EA5E9;
            transform: translateX(4px);
        }

        /* Dark mode overrides for Mega Footer */
        html.dark-mode .shared-footer-mega {
            background: rgba(10, 15, 25, 0.7) !important;
            border-top-color: rgba(255,255,255,0.08) !important;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.3) !important;
        }
        html.dark-mode .mega-logo-text { color: #f8fafc !important; }
        html.dark-mode .mega-desc { color: #94a3b8 !important; }
        html.dark-mode .mega-col-title { color: #e2e8f0 !important; }
        html.dark-mode .mega-link { color: #cbd5e1 !important; }
        html.dark-mode .mega-link:hover { color: #38BDF8 !important; }
        html.dark-mode .mega-copy, html.dark-mode .mega-lang { color: #64748b !important; }
        html.dark-mode .mega-socials a { background: rgba(255,255,255,0.05) !important; color: #94a3b8 !important; }
        html.dark-mode .mega-socials a:hover { background: #0EA5E9 !important; color: #fff !important; }
    `;
    // ── Global Dark Theme Injection (Applies to all pages) ──────────────────────
    const darkTheme = document.createElement('style');
    darkTheme.textContent = `
        /* =====================================================
           GLOBAL DARK MODE THEME (Applies to all pages)
           ===================================================== */
        html.dark-mode body {
            background: #020617 !important;
            color: #f8fafc !important;
        }

        /* Typography */
        html.dark-mode h1, html.dark-mode h2, html.dark-mode h3, html.dark-mode h4,
        html.dark-mode .browse-title, html.dark-mode .favorites-title, html.dark-mode .essays-title,
        html.dark-mode .card-title, html.dark-mode .section-heading, html.dark-mode .essay-title {
            color: #f8fafc !important;
        }

        html.dark-mode p, html.dark-mode span:not(.hero-level-badge):not(.display-dept),
        html.dark-mode .browse-subtitle, html.dark-mode .card-desc, html.dark-mode .empty-state {
            color: #94a3b8 !important;
        }

        /* Generic Gradients */
        html.dark-mode .browse-hero::before, html.dark-mode .favorites-hero::before, html.dark-mode .essays-hero::before {
            background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(14,165,233,0.05) 0%, transparent 70%),
                        radial-gradient(ellipse 40% 40% at 80% 100%, rgba(99,102,241,0.05) 0%, transparent 70%) !important;
        }

        /* Inputs */
        html.dark-mode .search-input {
            background: #0f172a !important;
            border-color: rgba(56,189,248,0.15) !important;
            color: #f8fafc !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
        }
        html.dark-mode .search-input:focus {
            border-color: #38bdf8 !important;
            box-shadow: 0 0 0 4px rgba(56,189,248,0.1), 0 4px 20px rgba(0,0,0,0.3) !important;
        }

        /* General Cards */
        html.dark-mode .material-card, html.dark-mode .essay-card, html.dark-mode .subject-card, html.dark-mode .preview-main {
            background: #0f172a !important;
            border-color: rgba(56,189,248,0.1) !important;
        }
        html.dark-mode .material-card:hover, html.dark-mode .essay-card:hover, html.dark-mode .subject-card.active {
            border-color: rgba(56,189,248,0.35) !important;
            box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2) !important;
            background: rgba(15,23,42,0.9) !important;
        }

        /* Action Buttons */
        html.dark-mode .action-btn {
            background: rgba(255,255,255,0.05) !important;
            border-color: rgba(255,255,255,0.1) !important;
            color: #94a3b8 !important;
        }
        html.dark-mode .action-btn:hover {
            background: rgba(14,165,233,0.15) !important;
            border-color: rgba(56,189,248,0.4) !important;
            color: #38bdf8 !important;
        }

        /* Icons */
        html.dark-mode .card-icon-wrap {
            border-color: rgba(56,189,248,0.2) !important;
            background: rgba(14,165,233,0.1) !important;
        }

        /* Links and accents */
        html.dark-mode .card-title { color: #f8fafc !important; }
        html.dark-mode .material-card:hover .card-title { color: #38bdf8 !important; }
        html.dark-mode .card-cta {
            color: #38bdf8 !important;
            border-color: rgba(56,189,248,0.3) !important;
        }
        html.dark-mode .material-card:hover .card-cta {
            background: rgba(14,165,233,0.1) !important;
        }

        /* Modals and Overlays */
        html.dark-mode .modal-content, html.dark-mode .dropdown-menu {
            background: #0f172a !important;
            border-color: rgba(56,189,248,0.2) !important;
        }
        html.dark-mode .modal-header { border-bottom-color: rgba(255,255,255,0.1) !important; }
        html.dark-mode .modal-footer { border-top-color: rgba(255,255,255,0.1) !important; }

        /* Scrollbars (Dark Mode) */
        html.dark-mode ::-webkit-scrollbar-track { background: #020617 !important; }
        html.dark-mode ::-webkit-scrollbar-thumb { background: #1e293b !important; }
        html.dark-mode ::-webkit-scrollbar-thumb:hover { background: #334155 !important; }
    `;
    document.head.appendChild(darkTheme);

    // ── Sign Out Button ────────────────────────────────────────────────────────
    const signoutBtn = document.getElementById('snav-signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => {
            // Use Firebase signOut if available, otherwise just clear storage
            if (typeof signOutUser === 'function') {
                signOutUser('index.html');
            } else {
                localStorage.removeItem('subjectsOnlineName');
                localStorage.removeItem('subjectsOnlineDept');
                localStorage.removeItem('subjectsOnlineAvatarImage');
                localStorage.removeItem('subjectsOnlineAvatarTheme');
                localStorage.removeItem('subjectsOnlineUID');
                localStorage.removeItem('subjectsOnlineAuthProvider');
                localStorage.removeItem('subjectsOnlineEmail');
                localStorage.removeItem('subjectsOnlinePhotoURL');
                localStorage.removeItem('soPlannerTasks');
                window.location.href = 'index.html';
            }
        });
    }

    // ── 10. INNER PAGE NAVBAR (always visible on non-dashboard pages) ──────────
    function initInnerPageNav() {
        // On dashboard page: return early
        if (currentPage === 'dashboard.html' || currentPage === '' || currentPage === '/') return;

        const logoEl = document.getElementById('shared-nav-logo');
        const libBtn = document.getElementById('library-nav-btn');
        const pillNav = document.getElementById('custom-landing-pill');

        if (!pillNav) return;

        // Hide logo & old library shortcut — pill nav replaces them on inner pages
        if (logoEl) logoEl.style.display = 'none';
        if (libBtn) libBtn.style.display = 'none';

        // Place pill nav at top-center immediately (no delay, no dependency on landing pref)
        pillNav.style.left = '50%';
        pillNav.style.right = 'auto';
        pillNav.style.top = '24px';
        pillNav.style.transform = 'translateX(-50%)';

        // Play entrance animation only on the very first load of this page in the session
        const animKey = 'soNavAnimated_' + currentPage;
        const alreadyAnimated = sessionStorage.getItem(animKey);

        if (!alreadyAnimated) {
            sessionStorage.setItem(animKey, 'true');
            const runAnimation = () => {
                if (typeof gsap === 'undefined') {
                    // Fallback: just show it instantly
                    pillNav.style.opacity = '1';
                    pillNav.style.transform = 'translateX(-50%)';
                    return;
                }
                gsap.fromTo(pillNav,
                    { opacity: 0, scale: 0.7, y: -10 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(1.5)', delay: 0.2 }
                );
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', runAnimation);
            } else {
                runAnimation();
            }
        } else {
            // Already animated this session — show instantly
            pillNav.style.opacity = '1';
        }
    }

    initInnerPageNav();

    // Ensure clean light mode across entire site
    document.documentElement.classList.remove('dark-mode');
    localStorage.removeItem('subjectsOnlineTheme');
})();
