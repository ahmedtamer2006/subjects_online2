/* ===================================================
   SUBJECTS ONLINE — Community Page Logic (community.js)
   Handles: Feed Q&A | The Vault | Chat Rooms
   Firebase Firestore + Storage | Anonymous Posts
   =================================================== */

(function () {
    'use strict';

    // ── Firebase Init ──────────────────────────────────────────────────────────
    let db, storage, auth;

    function initFirebase() {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db      = firebase.firestore();
        storage = firebase.storage();
        auth    = firebase.auth();
    }

    // ── User Info ──────────────────────────────────────────────────────────────
    let currentUser = {
        uid:    localStorage.getItem('subjectsOnlineUID')    || null,
        name:   localStorage.getItem('subjectsOnlineName')  || 'Student',
        dept:   localStorage.getItem('subjectsOnlineDept')  || '',
        photo:  localStorage.getItem('subjectsOnlinePhotoURL') || '',
        avatar: localStorage.getItem('subjectsOnlineAvatarImage') || '',
    };

    const ANON_DISPLAY = 'Anonymous Student';
    const ANON_EMOJI   = '👻';

    // ── State ──────────────────────────────────────────────────────────────────
    let currentTab      = 'feed';
    let currentFilter   = 'recent';
    let currentVFilter  = 'all';
    let currentRoomId   = null;
    let chatListener    = null;
    let postsListener   = null;
    let uploadedFile    = null;
    let postImageFile   = null;
    let openPostId      = null;

    // Default study rooms
    const DEFAULT_ROOMS = [
        { id: 'general',    emoji: '💬', name: 'General',    desc: 'Talk about anything' },
        { id: 'math',       emoji: '📐', name: 'Statistics', desc: 'Stats & Math help' },
        { id: 'accounting', emoji: '📊', name: 'Accounting', desc: 'Accounting discussions' },
        { id: 'economics',  emoji: '📈', name: 'Economics',  desc: 'Micro & macro econ' },
        { id: 'management', emoji: '💼', name: 'Management', desc: 'Business & management' },
        { id: 'marketing',  emoji: '🎯', name: 'Marketing',  desc: 'Marketing strategies' },
    ];

    // ── DOM Refs ───────────────────────────────────────────────────────────────
    const $ = id => document.getElementById(id);

    // ── Init ───────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        initFirebase();
        requireAuth('login.html');
        initUI();
        initTabs();
        initComposer();
        initFeed();
        initVault();
        initChat();
        initModals();
        initLenis();
        initGSAP();
    });

    // ══════════════════════════════════════════════════
    // UI INIT
    // ══════════════════════════════════════════════════
    function initUI() {
        // Set user avatars
        const avatarEl = currentUser.avatar || currentUser.photo;
        ['composer-avatar','sidebar-avatar','comment-avatar'].forEach(id => {
            const el = $(id);
            if (!el) return;
            if (avatarEl) {
                el.innerHTML = `<img src="${avatarEl}" alt="You">`;
            } else {
                el.textContent = currentUser.name?.[0]?.toUpperCase() || 'S';
            }
        });

        // Sidebar profile
        if ($('sidebar-name')) $('sidebar-name').textContent = currentUser.name || 'Student';
        if ($('sidebar-dept')) $('sidebar-dept').textContent = currentUser.dept || '—';

        // Load hero stats
        loadHeroStats();
        loadContributors();
        buildQuickRooms();
    }

    async function loadHeroStats() {
        try {
            const [postsSnap, filesSnap, usersSnap] = await Promise.allSettled([
                db.collection('community_posts').get(),
                db.collection('community_materials').get(),
                db.collection('users').get(),
            ]);

            if (postsSnap.status === 'fulfilled') {
                animateCount($('stat-posts'), postsSnap.value.size);
                $('tab-feed-count').textContent = postsSnap.value.size;
            }
            if (filesSnap.status === 'fulfilled') {
                animateCount($('stat-files'), filesSnap.value.size);
                $('tab-vault-count').textContent = filesSnap.value.size;
            }
            if (usersSnap.status === 'fulfilled') {
                animateCount($('stat-members'), usersSnap.value.size || 42);
            }
        } catch (e) {
            // Fallback demo numbers
            animateCount($('stat-posts'), 128);
            animateCount($('stat-files'), 47);
            animateCount($('stat-members'), 312);
        }
    }

    function animateCount(el, target) {
        if (!el) return;
        let start = 0;
        const duration = 1200;
        const step = timestamp => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    async function loadContributors() {
        const list = $('contributors-list');
        if (!list) return;
        try {
            const snap = await db.collection('community_posts')
                .orderBy('upvotes', 'desc')
                .limit(5)
                .get();

            // Group by author
            const map = {};
            snap.forEach(doc => {
                const d = doc.data();
                if (d.isAnonymous || !d.authorId) return;
                if (!map[d.authorId]) map[d.authorId] = { name: d.authorName || 'Student', upvotes: 0 };
                map[d.authorId].upvotes += d.upvotes || 0;
            });

            const sorted = Object.values(map).sort((a,b) => b.upvotes - a.upvotes).slice(0, 4);
            if (!sorted.length) {
                list.innerHTML = `<li class="comm-contributor-item"><span style="color:var(--c-text-4);font-size:0.8rem;">No contributors yet — be the first!</span></li>`;
                return;
            }

            const medalClasses = ['--gold','--silver',''];
            list.innerHTML = sorted.map((c, i) => `
                <li class="comm-contributor-item">
                    <div class="comm-contrib-avatar comm-contrib-avatar${medalClasses[i] || ''}">${c.name[0].toUpperCase()}</div>
                    <span class="comm-contrib-name">${escHtml(c.name)}</span>
                    <span class="comm-contrib-pts">▲ ${c.upvotes}</span>
                </li>
            `).join('');
        } catch (e) {
            list.innerHTML = `<li class="comm-contributor-item"><span style="color:var(--c-text-4);font-size:0.8rem;">Loading...</span></li>`;
        }

        // User personal stats
        if (currentUser.uid) {
            try {
                const myPosts = await db.collection('community_posts').where('authorId','==',currentUser.uid).get();
                let myUpvotes = 0;
                myPosts.forEach(d => myUpvotes += d.data().upvotes || 0);
                $('pstat-posts').textContent = myPosts.size;
                $('pstat-upvotes').textContent = myUpvotes;
            } catch(e) {}
        }
    }

    // ══════════════════════════════════════════════════
    // TABS
    // ══════════════════════════════════════════════════
    function initTabs() {
        const tabs = document.querySelectorAll('.comm-tab');
        const ink  = $('comm-tab-ink');

        function setTab(tabName) {
            tabs.forEach(t => {
                const isActive = t.dataset.tab === tabName;
                t.classList.toggle('active', isActive);
                t.setAttribute('aria-selected', isActive);
            });
            document.querySelectorAll('.comm-panel').forEach(p => {
                p.classList.toggle('active', p.id === `panel-${tabName}`);
            });
            currentTab = tabName;
            moveInk();
        }

        function moveInk() {
            const active = document.querySelector('.comm-tab.active');
            if (!active || !ink) return;
            const tabsEl = document.querySelector('.comm-tabs');
            const tabsRect = tabsEl.getBoundingClientRect();
            const activeRect = active.getBoundingClientRect();
            ink.style.left  = (activeRect.left - tabsRect.left) + 'px';
            ink.style.width = activeRect.width + 'px';
        }

        tabs.forEach(t => {
            t.addEventListener('click', () => setTab(t.dataset.tab));
        });

        // Quick room buttons switch to chat tab
        document.addEventListener('click', e => {
            const btn = e.target.closest('.comm-quick-room-btn');
            if (btn) {
                setTab('chat');
                const roomId = btn.dataset.roomId;
                if (roomId) setTimeout(() => openRoom(roomId), 100);
            }
        });

        window.addEventListener('resize', moveInk);
        setTimeout(moveInk, 100);
    }

    // ══════════════════════════════════════════════════
    // COMPOSER
    // ══════════════════════════════════════════════════
    function initComposer() {
        const textarea   = $('post-textarea');
        const submitBtn  = $('post-submit-btn');
        const imgInput   = $('post-image-input');
        const imgPreview = $('image-preview');
        const previewImg = $('preview-img');
        const removeBtn  = $('remove-img-btn');
        const anonSwitch = $('anon-switch');
        const anonToggle = $('anon-toggle');

        // Auto-resize textarea
        textarea?.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
            submitBtn.disabled = !textarea.value.trim();
        });

        // Image upload
        imgInput?.addEventListener('change', e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 8 * 1024 * 1024) { showToast('Image too large (max 8MB)', 'error'); return; }
            postImageFile = file;
            const reader = new FileReader();
            reader.onload = ev => {
                previewImg.src = ev.target.result;
                imgPreview.style.display = 'block';
                submitBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        });

        // Remove image
        removeBtn?.addEventListener('click', () => {
            postImageFile = null;
            imgPreview.style.display = 'none';
            previewImg.src = '';
            imgInput.value = '';
            submitBtn.disabled = !textarea.value.trim();
        });

        // Anonymous toggle
        anonToggle?.addEventListener('change', () => {
            anonSwitch?.classList.toggle('is-on', anonToggle.checked);
        });

        // Submit
        submitBtn?.addEventListener('click', submitPost);
    }

    async function submitPost() {
        const textarea  = $('post-textarea');
        const anonToggle = $('anon-toggle');
        const submitBtn = $('post-submit-btn');
        const content = textarea.value.trim();
        if (!content && !postImageFile) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg> Posting...`;

        try {
            let imageUrl = null;

            // Upload image if any
            if (postImageFile) {
                const ref = storage.ref(`community_images/${Date.now()}_${postImageFile.name}`);
                await ref.put(postImageFile);
                imageUrl = await ref.getDownloadURL();
            }

            const isAnon = anonToggle?.checked || false;
            await db.collection('community_posts').add({
                content,
                imageUrl,
                authorId:   isAnon ? 'anonymous' : (currentUser.uid || 'guest'),
                authorName: isAnon ? ANON_DISPLAY : currentUser.name,
                authorPhoto:isAnon ? '' : (currentUser.avatar || currentUser.photo || ''),
                isAnonymous: isAnon,
                upvotes:   0,
                downvotes: 0,
                commentCount: 0,
                views: 0,
                voterIds:  [],
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // Reset
            textarea.value = '';
            textarea.style.height = 'auto';
            postImageFile = null;
            $('image-preview').style.display = 'none';
            $('preview-img').src = '';
            $('post-image-input').value = '';
            if (anonToggle) { anonToggle.checked = false; $('anon-switch')?.classList.remove('is-on'); }

            showToast('Post shared! 🎉', 'success');
            loadHeroStats();
            loadContributors();
        } catch (err) {
            console.error(err);
            showToast('Failed to post. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg> Post`;
        }
    }

    // ══════════════════════════════════════════════════
    // FEED
    // ══════════════════════════════════════════════════
    function initFeed() {
        // Filter buttons
        document.querySelectorAll('.comm-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.comm-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                loadPosts();
            });
        });

        loadPosts();
    }

    function loadPosts() {
        const list = $('posts-list');

        // Show skeleton
        list.innerHTML = `
            <div class="comm-loading-skeleton">
                ${[...Array(3)].map(() => `
                    <div class="comm-skeleton-post">
                        <div class="skel-avatar"></div>
                        <div class="skel-body">
                            <div class="skel-line skel-line-short"></div>
                            <div class="skel-line"></div>
                            <div class="skel-line skel-line-medium"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Detach previous listener
        if (postsListener) { postsListener(); postsListener = null; }

        let query = db.collection('community_posts');

        if (currentFilter === 'recent') {
            query = query.orderBy('timestamp', 'desc').limit(30);
        } else if (currentFilter === 'top') {
            query = query.orderBy('upvotes', 'desc').limit(30);
        } else {
            query = query.where('commentCount','==',0).orderBy('timestamp','desc').limit(30);
        }

        postsListener = query.onSnapshot(snap => {
            if (snap.empty) {
                list.innerHTML = `
                    <div style="text-align:center;padding:3rem 1rem;color:var(--c-text-4);">
                        <div style="font-size:2.5rem;margin-bottom:1rem;">💬</div>
                        <p style="font-size:0.9rem;font-weight:600;">No posts yet — start the conversation!</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = '';
            snap.forEach((doc, i) => {
                const data = doc.data();
                list.appendChild(renderPostCard(doc.id, data, i));
            });
        }, err => {
            console.error('Feed error:', err);
            list.innerHTML = `<div style="text-align:center;padding:2rem;color:#ef4444;">Failed to load posts. Check your connection.</div>`;
        });
    }

    function renderPostCard(id, data, index) {
        const isAnon = data.isAnonymous;
        const name   = isAnon ? ANON_DISPLAY : escHtml(data.authorName || 'Student');
        const initial = isAnon ? ANON_EMOJI : (data.authorName?.[0]?.toUpperCase() || 'S');
        const time   = data.timestamp ? timeAgo(data.timestamp.toDate()) : 'just now';
        const upvotes   = data.upvotes   || 0;
        const downvotes = data.downvotes || 0;
        const comments  = data.commentCount || 0;
        const hasVoted  = currentUser.uid && (data.voterIds || []).includes(currentUser.uid);

        const card = document.createElement('div');
        card.className = 'comm-post-card';
        card.style.animationDelay = `${index * 60}ms`;
        card.dataset.postId = id;

        card.innerHTML = `
            <div class="comm-post-header">
                <div class="comm-post-avatar ${isAnon ? 'comm-post-avatar--anon' : ''}">
                    ${!isAnon && data.authorPhoto ? `<img src="${data.authorPhoto}" alt="${name}">` : initial}
                </div>
                <div class="comm-post-meta">
                    <div class="comm-post-author ${isAnon ? 'comm-post-author--anon'  : ''}">${name}</div>
                    <div class="comm-post-time">${time}</div>
                </div>
                ${isAnon ? `<span class="comm-anon-badge">👻 Anonymous</span>` : ''}
            </div>
            <div class="comm-post-content">${escHtml(data.content || '')}</div>
            ${data.imageUrl ? `<img class="comm-post-image" src="${data.imageUrl}" alt="Post image" loading="lazy">` : ''}
            <div class="comm-post-footer">
                <div class="comm-vote-group">
                    <button class="comm-vote-btn upvote ${hasVoted ? 'active' : ''}" data-action="upvote" data-id="${id}">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                        <span class="vote-count-up">${upvotes}</span>
                    </button>
                    <button class="comm-vote-btn downvote" data-action="downvote" data-id="${id}">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        <span class="vote-count-down">${downvotes}</span>
                    </button>
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem; margin-left:auto;">
                    <div style="display:inline-flex; align-items:center; gap:4px; font-size:0.78rem; font-weight:600; color:var(--c-text-4);">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        ${data.views || 0}
                    </div>
                    <button class="comm-comment-count-btn" data-action="open-post" data-id="${id}" style="margin-left:0;">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                        ${comments} comment${comments !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        `;

        // Vote buttons
        card.querySelectorAll('.comm-vote-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                handleVote(id, btn.dataset.action, card);
            });
        });

        // Open post modal
        card.addEventListener('click', e => {
            if (!e.target.closest('.comm-vote-btn') && !e.target.closest('.comm-post-image')) {
                openPostModal(id, data);
            }
        });

        // Image zoom (simple)
        card.querySelector('.comm-post-image')?.addEventListener('click', e => {
            e.stopPropagation();
            window.open(data.imageUrl, '_blank');
        });

        return card;
    }

    async function handleVote(postId, action, cardEl) {
        if (!currentUser.uid) { showToast('Sign in to vote', 'info'); return; }

        try {
            const ref  = db.collection('community_posts').doc(postId);
            const snap = await ref.get();
            const data = snap.data();
            const voters = data.voterIds || [];

            if (voters.includes(currentUser.uid)) {
                showToast('You already voted on this', 'info'); return;
            }

            const field = action === 'upvote' ? 'upvotes' : 'downvotes';
            await ref.update({
                [field]: firebase.firestore.FieldValue.increment(1),
                voterIds: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
            });

            // Update UI
            const countEl = cardEl.querySelector(action === 'upvote' ? '.vote-count-up' : '.vote-count-down');
            if (countEl) countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
            cardEl.querySelector(`.${action}`)?.classList.add('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to vote', 'error');
        }
    }

    // ══════════════════════════════════════════════════
    // VAULT
    // ══════════════════════════════════════════════════
    function initVault() {
        // Filter buttons
        document.querySelectorAll('.comm-vault-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.comm-vault-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentVFilter = btn.dataset.vfilter;
                loadVault();
            });
        });

        // Upload button
        $('vault-upload-btn')?.addEventListener('click', () => openUploadModal());

        initDropzone();
        loadVault();
    }

    function loadVault() {
        const grid = $('vault-grid');
        const empty = $('vault-empty');

        grid.innerHTML = `
            <div class="comm-loading-skeleton" style="grid-column:1/-1;gap:1rem;">
                ${[...Array(3)].map(() => `<div style="height:180px;background:var(--c-white);border:1px solid var(--c-border);border-radius:var(--radius-xl);animation:shimmer 1.5s linear infinite;background:linear-gradient(90deg,var(--c-sky-100) 25%,var(--c-sky-50) 50%,var(--c-sky-100) 75%);background-size:400% 100%;"></div>`).join('')}
            </div>
        `;

        let query = db.collection('community_materials').orderBy('timestamp', 'desc');
        if (currentVFilter !== 'all') query = query.where('type','==',currentVFilter);

        query.get().then(snap => {
            grid.innerHTML = '';
            if (snap.empty) {
                grid.appendChild(empty);
                empty.style.display = 'flex';
                return;
            }
            snap.forEach((doc, i) => {
                grid.appendChild(renderVaultCard(doc.id, doc.data(), i));
            });
        }).catch(err => {
            console.error(err);
            grid.innerHTML = `<div style="text-align:center;padding:2rem;color:#ef4444;grid-column:1/-1;">Failed to load files.</div>`;
        });
    }

    function renderVaultCard(id, data, index) {
        const typeEmojis = { summaries:'📝', exams:'📄', notes:'📌' };
        const emoji = typeEmojis[data.type] || '📁';
        const time  = data.timestamp ? timeAgo(data.timestamp.toDate()) : 'recently';
        const upvotes = data.upvotes || 0;

        const card = document.createElement('div');
        card.className = 'comm-vault-card';
        card.style.animationDelay = `${index * 60}ms`;

        card.innerHTML = `
            <div class="comm-vault-card-top">
                <div class="comm-file-type-icon">${emoji}</div>
                <div class="comm-vault-card-info">
                    <div class="comm-vault-card-title">${escHtml(data.title || 'Untitled')}</div>
                    <div class="comm-vault-card-meta">Shared by ${escHtml(data.authorName || 'Student')} · ${time}</div>
                    ${data.subject ? `<span class="comm-vault-card-subject">${escHtml(data.subject)}</span>` : ''}
                </div>
            </div>
            ${data.description ? `<div class="comm-vault-card-desc">${escHtml(data.description)}</div>` : ''}
            <div class="comm-vault-card-footer">
                <div class="comm-vault-votes">
                    <button class="comm-vote-btn upvote" data-vault-id="${id}" style="font-size:0.75rem;padding:4px 10px;">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                        <span>${upvotes}</span>
                    </button>
                </div>
                ${data.fileUrl ? `
                    <a href="${data.fileUrl}" target="_blank" rel="noopener" class="comm-vault-download-btn">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        Download
                    </a>
                ` : ''}
            </div>
        `;

        // Vault upvote
        card.querySelector('[data-vault-id]')?.addEventListener('click', async () => {
            if (!currentUser.uid) { showToast('Sign in to upvote', 'info'); return; }
            try {
                await db.collection('community_materials').doc(id).update({
                    upvotes: firebase.firestore.FieldValue.increment(1),
                });
                const countEl = card.querySelector('[data-vault-id] span');
                if (countEl) countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
            } catch(e) { console.error(e); }
        });

        return card;
    }

    // ── Dropzone ──────────────────────────────────────
    function initDropzone() {
        const dropzone  = $('upload-dropzone');
        const fileInput = $('vault-file-input');
        const info      = $('selected-file-info');
        const fileName  = $('selected-file-name');
        const removeBtn = $('vault-file-remove');
        const submitBtn = $('vault-submit-btn');
        const titleInput = $('vault-title');

        function setFile(file) {
            if (file.size > 10 * 1024 * 1024) { showToast('File too large (max 10MB)', 'error'); return; }
            uploadedFile = file;
            fileName.textContent = file.name;
            info.style.display = 'flex';
            dropzone.style.display = 'none';
            checkUploadReady();
        }

        function checkUploadReady() {
            submitBtn.disabled = !(uploadedFile && $('vault-title').value.trim());
        }

        dropzone?.addEventListener('click', () => fileInput?.click());
        dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone?.addEventListener('drop', e => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const file = e.dataTransfer?.files?.[0];
            if (file) setFile(file);
        });
        fileInput?.addEventListener('change', e => { if (e.target.files?.[0]) setFile(e.target.files[0]); });
        removeBtn?.addEventListener('click', () => {
            uploadedFile = null;
            fileInput.value = '';
            info.style.display = 'none';
            dropzone.style.display = 'block';
            checkUploadReady();
        });
        titleInput?.addEventListener('input', checkUploadReady);

        // Submit
        $('vault-submit-btn')?.addEventListener('click', submitVaultFile);
    }

    async function submitVaultFile() {
        if (!uploadedFile) return;
        const btn = $('vault-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Uploading...';

        try {
            const ref = storage.ref(`community_materials/${Date.now()}_${uploadedFile.name}`);
            await ref.put(uploadedFile);
            const url = await ref.getDownloadURL();

            await db.collection('community_materials').add({
                title:      $('vault-title').value.trim(),
                description:$('vault-desc').value.trim(),
                subject:    $('vault-subject').value,
                type:       $('vault-type').value,
                fileUrl:    url,
                fileName:   uploadedFile.name,
                authorId:   currentUser.uid || 'guest',
                authorName: currentUser.name,
                upvotes:    0,
                timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
            });

            showToast('File uploaded successfully! 🎉', 'success');
            closeUploadModal();
            loadVault();
            loadHeroStats();
        } catch (err) {
            console.error(err);
            showToast('Upload failed. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Upload File`;
        }
    }

    // ══════════════════════════════════════════════════
    // CHAT ROOMS
    // ══════════════════════════════════════════════════
    function initChat() {
        buildRoomList();
        buildQuickRooms();

        $('new-room-btn')?.addEventListener('click', createNewRoom);

        // Chat send
        $('chat-send-btn')?.addEventListener('click', sendMessage);
        $('chat-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        $('chat-input')?.addEventListener('input', () => {
            $('chat-send-btn').disabled = !$('chat-input').value.trim() || !currentRoomId;
        });

        // Chat anon toggle
        $('chat-anon-toggle')?.addEventListener('change', () => {
            $('chat-anon-switch')?.classList.toggle('is-on', $('chat-anon-toggle').checked);
        });
    }

    function buildRoomList() {
        const list = $('rooms-list');
        if (!list) return;
        list.innerHTML = DEFAULT_ROOMS.map(room => `
            <div class="comm-room-item" data-room-id="${room.id}" id="room-item-${room.id}" onclick="window.__openRoom('${room.id}')">
                <span class="comm-room-emoji">${room.emoji}</span>
                <div class="comm-room-info">
                    <div class="comm-room-name">${room.name}</div>
                    <div class="comm-room-last">${room.desc}</div>
                </div>
            </div>
        `).join('');

        // Expose openRoom globally for onclick
        window.__openRoom = openRoom;
    }

    function buildQuickRooms() {
        const container = $('quick-rooms');
        if (!container) return;
        container.innerHTML = DEFAULT_ROOMS.slice(0, 4).map(room => `
            <button class="comm-quick-room-btn" data-room-id="${room.id}">
                <span class="comm-quick-room-emoji">${room.emoji}</span>
                ${room.name}
            </button>
        `).join('');
    }

    function openRoom(roomId) {
        // Allow re-opening the same room (e.g. from quick-rooms)
        if (chatListener) { chatListener(); chatListener = null; }
        currentRoomId = roomId;

        // Clear previous messages
        const messagesArea = $('messages-area');
        messagesArea.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--c-text-4);font-size:0.8rem;">Loading messages...</div>`;

        // Update active room UI
        document.querySelectorAll('.comm-room-item').forEach(el => {
            el.classList.toggle('active', el.dataset.roomId === roomId);
        });

        const room = DEFAULT_ROOMS.find(r => r.id === roomId);
        if (room) {
            $('chat-room-icon').textContent = room.emoji;
            $('chat-room-name').textContent = room.name;
            $('chat-room-meta').textContent = room.desc;
        }

        // Enable input
        const chatInput = $('chat-input');
        chatInput.disabled = false;
        chatInput.placeholder = 'Type a message...';

        // ── Real-time listener ────────────────────────────────────────────────
        // NOTE: We use only .where() WITHOUT .orderBy() to avoid needing a
        // composite Firestore index. We sort client-side by timestamp instead.
        chatListener = db.collection('community_messages')
            .where('roomId', '==', roomId)
            .limit(80)
            .onSnapshot(snap => {
                messagesArea.innerHTML = '';

                // Sort all docs by timestamp ascending (client-side)
                const docs = [];
                snap.forEach(doc => docs.push(doc.data()));
                docs.sort((a, b) => {
                    const ta = a.timestamp ? a.timestamp.toMillis() : 0;
                    const tb = b.timestamp ? b.timestamp.toMillis() : 0;
                    return ta - tb;
                });

                if (!docs.length) {
                    messagesArea.innerHTML = `
                        <div class="comm-chat-welcome" style="opacity:0.5;">
                            <div class="chat-welcome-icon">${room ? room.emoji : '💬'}</div>
                            <h4>No messages yet</h4>
                            <p>Be the first to say something in ${room ? room.name : 'this room'}!</p>
                        </div>
                    `;
                    return;
                }

                docs.forEach(msg => messagesArea.appendChild(renderMessage(msg)));
                messagesArea.scrollTop = messagesArea.scrollHeight;

            }, err => {
                console.error('Chat listener error:', err);
                messagesArea.innerHTML = `<div style="text-align:center;padding:1rem;color:#ef4444;font-size:0.82rem;">⚠️ Could not load messages: ${err.message}</div>`;
            });
    }

    function renderMessage(data) {
        const isOwn  = data.authorId === currentUser.uid;
        const isAnon = data.isAnonymous;
        const name   = isAnon ? ANON_DISPLAY : (data.authorName || 'Student');
        const initial = isAnon ? ANON_EMOJI : (name[0]?.toUpperCase() || 'S');
        const time   = data.timestamp ? timeAgo(data.timestamp.toDate()) : 'just now';

        const row = document.createElement('div');
        row.className = `comm-msg-row${isOwn ? ' own' : ''}`;

        row.innerHTML = `
            ${!isOwn ? `
                <div class="comm-msg-avatar">
                    ${!isAnon && data.authorPhoto ? `<img src="${data.authorPhoto}" alt="${name}">` : initial}
                </div>
            ` : ''}
            <div class="comm-msg-bubble-wrap">
                ${!isOwn ? `<span class="comm-msg-sender">${escHtml(name)}</span>` : ''}
                <div class="comm-msg-bubble${isAnon ? ' comm-msg-bubble--anon' : ''}">${escHtml(data.content || '')}</div>
                <span class="comm-msg-time">${time}</span>
            </div>
        `;

        return row;
    }

    async function sendMessage() {
        const input   = $('chat-input');
        const sendBtn = $('chat-send-btn');
        const content = input.value.trim();

        if (!content) return;
        if (!currentRoomId) {
            showToast('Please select a room first', 'info');
            return;
        }

        const isAnon = $('chat-anon-toggle')?.checked || false;
        const savedContent = content;
        input.value = '';
        sendBtn.disabled = true;

        try {
            await db.collection('community_messages').add({
                roomId:      currentRoomId,
                content:     savedContent,
                authorId:    isAnon ? 'anonymous' : (currentUser.uid || 'guest'),
                authorName:  isAnon ? ANON_DISPLAY : (currentUser.name || 'Student'),
                authorPhoto: isAnon ? '' : (currentUser.avatar || currentUser.photo || ''),
                isAnonymous: isAnon,
                timestamp:   firebase.firestore.FieldValue.serverTimestamp(),
            });
            // Message sent OK — button stays disabled until user types again
        } catch (err) {
            console.error('Send message error:', err.code, err.message);
            // Restore message so user doesn't lose it
            input.value = savedContent;
            sendBtn.disabled = false;

            // Give a helpful error based on the Firebase error code
            if (err.code === 'permission-denied') {
                showToast('Permission denied — check Firestore rules', 'error');
            } else if (err.code === 'unavailable') {
                showToast('No internet connection', 'error');
            } else {
                showToast(`Failed to send: ${err.message}`, 'error');
            }
        }
    }

    async function createNewRoom() {
        const name = prompt('Enter room name:');
        if (!name?.trim()) return;
        const emoji = prompt('Enter an emoji for the room (e.g. 🔥):') || '💬';

        const roomId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!roomId) { showToast('Invalid room name', 'error'); return; }

        DEFAULT_ROOMS.push({ id: roomId, emoji, name: name.trim(), desc: 'New study room' });
        buildRoomList();
        buildQuickRooms();
        openRoom(roomId);
        showToast(`Room "${name.trim()}" created! 🎉`, 'success');
    }

    // ══════════════════════════════════════════════════
    // POST MODAL
    // ══════════════════════════════════════════════════
    function openPostModal(postId, data) {
        openPostId = postId;
        const overlay = $('post-modal-overlay');
        const body    = $('post-modal-body');

        const isAnon  = data.isAnonymous;
        const name    = isAnon ? ANON_DISPLAY : escHtml(data.authorName || 'Student');
        const initial = isAnon ? ANON_EMOJI : (data.authorName?.[0]?.toUpperCase() || 'S');
        const time    = data.timestamp ? timeAgo(data.timestamp.toDate()) : 'just now';

        let currentViews = data.views || 0;
        const viewedPosts = JSON.parse(localStorage.getItem('subjectsOnlineViewedPosts') || '[]');
        if (!viewedPosts.includes(postId)) {
            viewedPosts.push(postId);
            localStorage.setItem('subjectsOnlineViewedPosts', JSON.stringify(viewedPosts));
            currentViews += 1; // display optimistic increment
            db.collection('community_posts').doc(postId).update({
                views: firebase.firestore.FieldValue.increment(1)
            }).catch(e => console.error('Failed to update view count:', e));
        }

        body.innerHTML = `
            <div class="comm-post-header">
                <div class="comm-post-avatar ${isAnon ? 'comm-post-avatar--anon' : ''}">
                    ${!isAnon && data.authorPhoto ? `<img src="${data.authorPhoto}" alt="${name}">` : initial}
                </div>
                <div class="comm-post-meta">
                    <div class="comm-post-author ${isAnon ? 'comm-post-author--anon' : ''}">${name}</div>
                    <div class="comm-post-time">${time}</div>
                </div>
                ${isAnon ? `<span class="comm-anon-badge">👻 Anonymous</span>` : ''}
            </div>
            <div class="comm-post-content" style="margin-bottom:1rem;">${escHtml(data.content || '')}</div>
            ${data.imageUrl ? `<img src="${data.imageUrl}" style="width:100%;border-radius:var(--radius-md);margin-bottom:1rem;border:1px solid var(--c-border);" loading="lazy">` : ''}
            <div class="comm-post-footer" style="margin-bottom:0.5rem;">
                <div class="comm-vote-group">
                    <button class="comm-vote-btn upvote" data-modal-action="upvote" data-id="${postId}">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                        ${data.upvotes || 0}
                    </button>
                    <button class="comm-vote-btn downvote" data-modal-action="downvote" data-id="${postId}">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        ${data.downvotes || 0}
                    </button>
                </div>
                <div style="display:inline-flex; align-items:center; gap:4px; font-size:0.78rem; font-weight:600; color:var(--c-text-4); margin-left:auto;">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    ${currentViews}
                </div>
            </div>
            <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--c-text-4);margin:1rem 0 0.75rem;">Comments</div>
        `;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        loadComments(postId);

        // Comment send
        $('comment-send-btn').onclick = submitComment;
        $('comment-input').onkeydown = e => { if (e.key === 'Enter') submitComment(); };

        // Comment anon toggle
        $('comment-anon').onchange = () => {
            $('comment-anon-switch')?.classList.toggle('is-on', $('comment-anon').checked);
        };
    }

    function loadComments(postId) {
        const list = $('comments-list');
        list.innerHTML = `<div style="padding:1rem 0;text-align:center;color:var(--c-text-4);font-size:0.85rem;">Loading comments...</div>`;

        db.collection('community_comments')
            .where('postId','==',postId)
            .orderBy('timestamp','asc')
            .get()
            .then(snap => {
                if (snap.empty) {
                    list.innerHTML = `<div style="padding:1.5rem 0;text-align:center;color:var(--c-text-4);font-size:0.85rem;">No comments yet — be the first to reply!</div>`;
                    return;
                }
                list.innerHTML = '';
                snap.forEach(doc => list.appendChild(renderComment(doc.id, doc.data())));
            })
            .catch(() => {
                list.innerHTML = `<div style="color:#ef4444;font-size:0.85rem;">Failed to load comments.</div>`;
            });
    }

    function renderComment(id, data) {
        const isAnon  = data.isAnonymous;
        const name    = isAnon ? ANON_DISPLAY : escHtml(data.authorName || 'Student');
        const initial = isAnon ? ANON_EMOJI : (data.authorName?.[0]?.toUpperCase() || 'S');
        const time    = data.timestamp ? timeAgo(data.timestamp.toDate()) : 'just now';

        const item = document.createElement('div');
        item.className = 'comm-comment-item';
        item.innerHTML = `
            <div class="comm-comment-avatar ${isAnon ? 'comm-post-avatar--anon' : ''}">
                ${!isAnon && data.authorPhoto ? `<img src="${data.authorPhoto}" alt="${name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : initial}
            </div>
            <div class="comm-comment-body">
                <div class="comm-comment-header">
                    <span class="comm-comment-author">${name}</span>
                    <span class="comm-comment-time">${time}</span>
                    ${data.isAccepted ? `<span class="comm-accepted-badge">✓ Best Answer</span>` : ''}
                </div>
                <div class="comm-comment-text">${escHtml(data.content || '')}</div>
            </div>
        `;
        return item;
    }

    async function submitComment() {
        const input  = $('comment-input');
        const content = input.value.trim();
        if (!content || !openPostId) return;

        const isAnon = $('comment-anon')?.checked || false;
        input.value = '';

        try {
            await db.collection('community_comments').add({
                postId:     openPostId,
                content,
                authorId:   isAnon ? 'anonymous' : (currentUser.uid || 'guest'),
                authorName: isAnon ? ANON_DISPLAY : currentUser.name,
                authorPhoto:isAnon ? '' : (currentUser.avatar || currentUser.photo || ''),
                isAnonymous: isAnon,
                isAccepted: false,
                timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
            });

            // Update comment count on post
            await db.collection('community_posts').doc(openPostId).update({
                commentCount: firebase.firestore.FieldValue.increment(1),
            });

            loadComments(openPostId);
            showToast('Comment posted!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to post comment', 'error');
        }
    }

    // ══════════════════════════════════════════════════
    // MODALS
    // ══════════════════════════════════════════════════
    function initModals() {
        // Post modal
        $('post-modal-close')?.addEventListener('click', closePostModal);
        $('post-modal-overlay')?.addEventListener('click', e => {
            if (e.target === $('post-modal-overlay')) closePostModal();
        });

        // Upload modal
        $('upload-modal-close')?.addEventListener('click', closeUploadModal);
        $('cancel-upload-btn')?.addEventListener('click', closeUploadModal);
        $('upload-modal-overlay')?.addEventListener('click', e => {
            if (e.target === $('upload-modal-overlay')) closeUploadModal();
        });

        // ESC key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closePostModal(); closeUploadModal(); }
        });
    }

    function closePostModal() {
        const overlay = $('post-modal-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
        openPostId = null;
    }

    function openUploadModal() {
        const overlay = $('upload-modal-overlay');
        if (overlay) overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeUploadModal() {
        const overlay = $('upload-modal-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
        uploadedFile = null;
        $('vault-file-input').value = '';
        $('selected-file-info').style.display = 'none';
        $('upload-dropzone').style.display = 'block';
        $('vault-title').value = '';
        $('vault-desc').value = '';
        $('vault-subject').value = '';
        $('vault-submit-btn').disabled = true;
    }

    // ══════════════════════════════════════════════════
    // TOASTS
    // ══════════════════════════════════════════════════
    function showToast(message, type = 'info') {
        const container = $('toast-container');
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };

        const toast = document.createElement('div');
        toast.className = `comm-toast comm-toast--${type}`;
        toast.innerHTML = `<span class="comm-toast-icon">${icons[type]}</span><span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ══════════════════════════════════════════════════
    // LENIS SMOOTH SCROLL
    // ══════════════════════════════════════════════════
    function initLenis() {
        if (typeof Lenis === 'undefined') return;
        const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
    }

    // ══════════════════════════════════════════════════
    // GSAP ENTRANCE ANIMATIONS
    // ══════════════════════════════════════════════════
    function initGSAP() {
        if (typeof gsap === 'undefined') return;

        gsap.registerPlugin(ScrollTrigger);

        // Hero entrance
        gsap.from('.comm-hero-badge', { y: -20, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.1 });
        gsap.from('.comm-hero-title',  { y: -25, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.2 });
        gsap.from('.comm-hero-subtitle',{ y: -15, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.35 });
        gsap.from('.comm-stats-row',   { y: -10, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.5 });

        // Floating orbs parallax
        window.addEventListener('mousemove', e => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            gsap.to('.comm-orb-1', { x: x * 0.5, y: y * 0.5, duration: 2, ease: 'power1.out' });
            gsap.to('.comm-orb-2', { x: -x * 0.3, y: -y * 0.3, duration: 2.5, ease: 'power1.out' });
        });
    }

    // ══════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════
    function escHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;')
            .replace(/\n/g,'<br>');
    }

    function timeAgo(date) {
        if (!date) return '';
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60)  return 'just now';
        if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
        return date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
    }

    // CSS spin utility
    const spinStyle = document.createElement('style');
    spinStyle.textContent = `@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite;transform-origin:center;}`;
    document.head.appendChild(spinStyle);

})();
