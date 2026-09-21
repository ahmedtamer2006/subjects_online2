/* =========================================================
   chapters.js — Timeline Renderer with Weeks Accordion
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get('id');

    // Section configurations
    const SECTION_KEY = 'chapters';
    const STORE_KEY = 'soCompletedLectures';
    const THEME_COLOR = 'blue';
    const LABEL_PREFIX = 'Chapter';
    const THEME_ACCENT = '#0ea5e9';
    const THEME_GLOW = '#7dd3fc';

    // Find subject across all departments
    let subject = null;
    for (const dept in MATERIALS) {
        const found = MATERIALS[dept].find(m => m.id === subjectId);
        if (found) { subject = found; break; }
    }

    if (!subject) {
        document.body.innerHTML = '<h1 style="color:white;text-align:center;margin-top:20%;">Subject Not Found</h1>';
        return;
    }

    // Force Theme Colors for this page
    document.documentElement.style.setProperty('--subject-accent', THEME_ACCENT);
    document.documentElement.style.setProperty('--subject-glow', THEME_GLOW);

    // Setup Hero
    const subjTitleEl = document.getElementById('chap-subj-title');
    if (subjTitleEl) subjTitleEl.textContent = subject.title;

    const defaultChapters = [
        {
            num: 1, title: "Introduction & Basic Concepts", time: "2h 15m",
            weeks: [
                {
                    num: 1,
                    title: "Week 1",
                    lectures: [
                        { id: 101, title: "Part 1: Overview", type: "pdf", url: "materials/dummy.pdf" },
                        { id: 102, title: "Part 2: Concepts", type: "pdf", url: "materials/dummy.pdf" }
                    ]
                }
            ]
        }
    ];

    // Fallback normalizer if data.js normalizeChapterData is not available
    function normalizeChapter(ch) {
        if (!ch) return ch;
        const cloned = { ...ch };
        if (!Array.isArray(cloned.weeks) || cloned.weeks.length === 0) {
            if (Array.isArray(cloned.lectures)) {
                cloned.weeks = [
                    {
                        num: 1,
                        title: "",
                        lectures: cloned.lectures
                    }
                ];
            } else {
                cloned.weeks = [];
            }
        } else {
            cloned.weeks = cloned.weeks.map((w, idx) => ({
                ...w,
                num: w.num !== undefined ? w.num : (idx + 1),
                title: w.title || "",
                lectures: Array.isArray(w.lectures) ? w.lectures : []
            }));
        }
        cloned.lectures = cloned.weeks.flatMap(w => w.lectures || []);
        return cloned;
    }

    // Load chapters for the specific subject, or fallback to default
    const rawChapters = (typeof getSubjectSectionData === 'function')
        ? getSubjectSectionData(subject, SECTION_KEY)
        : ((subject.content && subject.content[SECTION_KEY] && subject.content[SECTION_KEY].length > 0)
            ? subject.content[SECTION_KEY]
            : defaultChapters);

    const chapters = rawChapters.map(ch => (typeof normalizeChapterData === 'function') ? normalizeChapterData(ch) : normalizeChapter(ch));

    const timelineContainer = document.getElementById('timeline-container');

    // Toggle Chapter accordion
    window.toggleChapter = function (element) {
        const card = element.closest('.chap-card');
        if (card) {
            card.classList.toggle('expanded');
        }
    };

    // Toggle Week accordion
    window.toggleWeek = function (event, headerEl) {
        if (event) event.stopPropagation();
        const weekCard = headerEl.closest('.week-card');
        if (weekCard) {
            weekCard.classList.toggle('expanded');
        }
    };

    window.markLectureDone = function (event, element, lecId) {
        if (event) event.stopPropagation();
        element.classList.add('done');
        const key = subjectId + '_' + lecId;
        const completed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        completed[key] = Date.now();
        localStorage.setItem(STORE_KEY, JSON.stringify(completed));
        updateSidebarProgress();
    };

    window.removeLectureDone = function (event, element, lecId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const key = subjectId + '_' + lecId;
        const completedLectures = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        delete completedLectures[key];
        localStorage.setItem(STORE_KEY, JSON.stringify(completedLectures));
        const lecItem = element.closest('.lecture-item');
        if (lecItem) lecItem.classList.remove('done');
        updateSidebarProgress();
    };

    window.toggleCircleDone = function (event, btn, lecId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const lecItem = btn.closest('.lecture-item');
        const isDone = btn.classList.contains('is-done');
        const key = subjectId + '_' + lecId;
        const completed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        if (isDone) {
            btn.classList.remove('is-done');
            if (lecItem) lecItem.classList.remove('done');
            delete completed[key];
        } else {
            btn.classList.add('is-done');
            if (lecItem) lecItem.classList.add('done');
            completed[key] = Date.now();
            btn.classList.add('burst');
            setTimeout(() => btn.classList.remove('burst'), 600);
        }
        localStorage.setItem(STORE_KEY, JSON.stringify(completed));
        updateSidebarProgress();
    };

    window.togglePdfLibrary = function (event, btn, argLecId, argTitle, argUrl) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const lecId = argLecId || btn.getAttribute('data-id');
        const title = argTitle || decodeURIComponent(btn.getAttribute('data-title') || '');
        const url = argUrl || decodeURIComponent(btn.getAttribute('data-url') || '');
        let offlineLib = JSON.parse(localStorage.getItem('so_offline_library') || '[]');
        const inLib = offlineLib.some(item =>
            (item.subjectId === subjectId && String(item.lecId) === String(lecId)) ||
            (item.title === title && item.url === url) ||
            (item.id === (subjectId + '_' + lecId))
        );
        if (inLib) {
            offlineLib = offlineLib.filter(item =>
                !(item.subjectId === subjectId && String(item.lecId) === String(lecId)) &&
                !(item.title === title && item.url === url) &&
                !(item.id === (subjectId + '_' + lecId))
            );
            btn.classList.remove('in-lib');
            btn.title = "Add to Library";
        } else {
            offlineLib.push({
                id: (subjectId + '_' + lecId),
                subjectId: subjectId,
                lecId: lecId,
                title: title,
                url: url,
                addedAt: Date.now()
            });
            // Flash green checkmark briefly before settling into in-lib (red) state
            btn.classList.add('lib-saved-flash');
            btn.disabled = true;
            setTimeout(() => {
                btn.classList.remove('lib-saved-flash');
                btn.classList.add('in-lib');
                btn.disabled = false;
                btn.title = "Remove from Library";
            }, 700);
        }
        localStorage.setItem('so_offline_library', JSON.stringify(offlineLib));
    };


    // ── Sidebar Progress Update ───────────────────────────
    function updateSidebarProgress() {
        const completed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');

        let total = 0;
        let done  = 0;
        chapters.forEach(ch => {
            const wList = (ch.weeks && ch.weeks.length > 0) ? ch.weeks : [{ lectures: ch.lectures || [] }];
            wList.forEach(w => {
                (w.lectures || []).forEach(lec => {
                    total++;
                    if (completed[subjectId + '_' + lec.id]) done++;
                });
            });
        });

        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        const progressText = document.getElementById('progress-text-circle');
        const progressCount = document.getElementById('progress-count');
        const progressBar  = document.getElementById('circular-progress-bar');

        if (progressText)  progressText.textContent  = pct + '%';
        if (progressCount) progressCount.textContent = done + ' of ' + total + ' items completed';
        if (progressBar) {
            const circumference = 264; // 2 * π * 42
            const offset = circumference - (pct / 100) * circumference;
            progressBar.style.strokeDashoffset = offset;
        }
    }

    const completedLectures = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    const offlineLib = JSON.parse(localStorage.getItem('so_offline_library') || '[]');

    // Flat list of all lectures to easily find next lecture
    const allLecturesList = chapters.flatMap(ch => (ch.weeks && ch.weeks.length > 0) ? ch.weeks.flatMap(w => w.lectures || []) : (ch.lectures || []));

    const html = chapters.map((ch, chIndex) => {
        const weeks = ch.weeks && ch.weeks.length > 0 ? ch.weeks : [
            { num: 1, title: "", lectures: ch.lectures || [] }
        ];

        const weeksHtml = weeks.map((week, wIndex) => {
            const weekLecturesHtml = (week.lectures || []).map((lec) => {
                const isPdf = lec.type === 'pdf';
                const isDone = !!completedLectures[subjectId + '_' + lec.id];

                // Find next lecture in entire sequence
                const currGlobalIdx = allLecturesList.findIndex(l => l.id === lec.id);
                const nextLec = (currGlobalIdx >= 0 && currGlobalIdx + 1 < allLecturesList.length)
                    ? allLecturesList[currGlobalIdx + 1]
                    : null;

                let nextParams = '';
                if (nextLec) {
                    nextParams = '&nextType=' + nextLec.type + '&nextUrl=' + encodeURIComponent(nextLec.url) + '&nextTitle=' + encodeURIComponent(nextLec.title);
                }

                // Get saved progress if video
                let isWatching = false;
                let actionText = isPdf ? "Open" : "Play";

                if (!isPdf && !isDone) {
                    const storageKey = 'so_vid_progress_' + encodeURIComponent(lec.url);
                    const savedTime = localStorage.getItem(storageKey);
                    if (savedTime && !isNaN(savedTime) && parseFloat(savedTime) > 0) {
                        isWatching = true;
                        const currentMins = Math.floor(parseFloat(savedTime) / 60);
                        const currentSecs = Math.floor(parseFloat(savedTime) % 60);
                        const currentFormatted = currentMins + ':' + currentSecs.toString().padStart(2, '0');

                        if (lec.duration) {
                            const totalMins = Math.floor(lec.duration / 60);
                            const totalSecs = Math.floor(lec.duration % 60);
                            actionText = currentFormatted + ' / ' + totalMins + ':' + totalSecs.toString().padStart(2, '0');
                        } else {
                            actionText = currentFormatted + ' / ...';
                        }
                    }
                }

                const actionIcon = isPdf
                    ? '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>'
                    : (isWatching
                        ? '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>');

                const clickHandler = isPdf ? ('onclick="markLectureDone(event, this, ' + lec.id + ')"') : '';

                const inLib = isPdf && offlineLib.some(item =>
                    (item.subjectId === subjectId && String(item.lecId) === String(lec.id)) ||
                    (item.title === lec.title && item.url === lec.url) ||
                    (item.id === (subjectId + '_' + lec.id))
                );

                return '<div class="lecture-item ' + (isPdf ? 'is-pdf' : 'is-video') + ' ' + (isDone ? 'done' : '') + '">' +
                    '<div class="lec-icon">' +
                        (isPdf
                            ? '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>'
                            : '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>'
                        ) +
                    '</div>' +
                    '<div class="lec-body">' +
                        '<span class="lec-title">' + lec.title + '</span>' +
                        '<span class="lec-dur-text" id="dur-' + lec.id + '">Loading...</span>' +
                        '<div class="lec-btns">' +
                            (isPdf
                                ? '<a href="' + lec.url + '" download class="lec-pill-btn lec-download-pill" onclick="event.stopPropagation(); markLectureDone(event, this, ' + lec.id + ');">Download <svg xmlns=\'http://www.w3.org/2000/svg\' style=\'display:inline;vertical-align:middle;margin-left:2px\' width=\'13\' height=\'13\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\' stroke-width=\'2.5\'><path stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4\'/></svg></a>' +
                                  '<button class="lec-pill-btn lec-lib-pill ' + (inLib ? 'in-lib' : '') + '" data-id="' + lec.id + '" data-title="' + encodeURIComponent(lec.title) + '" data-url="' + encodeURIComponent(lec.url) + '" onclick="togglePdfLibrary(event, this)" title="' + (inLib ? 'Remove from Library' : 'Save to Library') + '"><svg xmlns=\'http://www.w3.org/2000/svg\' style=\'display:inline;vertical-align:middle\' width=\'13\' height=\'13\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\' stroke-width=\'2\'><path stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253\'/></svg><span class="lib-plus-sym">+</span><span class="lib-minus-sym">\u2212</span></button>'
                                : '<a href="player.html?id=' + subjectId + '&type=' + lec.type + '&title=' + encodeURIComponent(lec.title) + '&url=' + encodeURIComponent(lec.url) + '&lecId=' + lec.id + '&chapTitle=' + encodeURIComponent(ch.title) + '&chapNum=' + ch.num + '&sec=' + SECTION_KEY + nextParams + '" class="lec-pill-btn lec-play-pill" onclick="event.stopPropagation();"><span id="action-text-' + lec.id + '">' + actionText + '</span> <svg xmlns=\'http://www.w3.org/2000/svg\' style=\'display:inline;vertical-align:middle;margin-left:1px\' width=\'13\' height=\'13\' viewBox=\'0 0 20 20\' fill=\'currentColor\'><path fill-rule=\'evenodd\' d=\'M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z\' clip-rule=\'evenodd\' /></svg></a>'
                            ) +
                        '</div>' +
                    '</div>' +
                    '<button class="lec-circle-btn ' + (isDone ? 'is-done' : '') + '" onclick="toggleCircleDone(event, this, ' + lec.id + ')" title="Mark as done">' +
                        '<svg class="circle-check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>' +
                    '</button>' +
                '</div>';
            }).join('');

            return '<div class="week-card" data-week-index="' + wIndex + '">' +
                '<div class="week-header" onclick="toggleWeek(event, this)">' +
                    '<div class="week-header-left">' +
                        '<span class="week-badge">' +
                            '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' +
                            'Week ' + week.num +
                        '</span>' +
                        (week.title ? ('<span class="week-title-text">' + week.title + '</span>') : '') +
                    '</div>' +
                    '<div class="week-header-right">' +
                        '<span class="week-count-badge">' + (week.lectures || []).length + ' ' + ((week.lectures || []).length === 1 ? 'item' : 'items') + '</span>' +
                        '<div class="week-toggle-btn">' +
                            '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="week-lectures-wrapper">' +
                    '<div class="week-lectures-inner">' +
                        '<div class="week-lectures-list">' +
                            (weekLecturesHtml || '<p class="text-xs text-slate-400 py-2 text-center">No materials in this week yet.</p>') +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        return '<div class="chap-card group relative" onclick="toggleChapter(this)">' +
            '<span class="chap-num font-heading font-black italic absolute -top-4 right-2 text-' + THEME_COLOR + '-100 opacity-40 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 pointer-events-none select-none text-[5rem] leading-none" style="text-shadow: 0 10px 30px rgba(0,0,0,0.06);">' + String(ch.num).padStart(2, '0') + '</span>' +
            '<div class="chap-main-content relative z-10">' +
                '<div class="chap-header flex items-start justify-between">' +
                    '<div class="chap-header-left flex flex-col gap-1.5">' +
                        '<span class="chap-ch-label text-[0.65rem] font-black uppercase tracking-[0.2em] text-' + THEME_COLOR + '-500 bg-' + THEME_COLOR + '-50/50 w-fit px-2.5 py-1 rounded-md border border-' + THEME_COLOR + '-100/50">' + LABEL_PREFIX + ' ' + ch.num + '</span>' +
                        '<h2 class="chap-title-text font-heading text-[1.75rem] font-bold text-slate-800 leading-[1.15] tracking-tight group-hover:text-' + THEME_COLOR + '-700 transition-colors">' + ch.title + '</h2>' +
                    '</div>' +
                    '<div class="chap-toggle-icon w-10 h-10 rounded-full bg-white/60 border border-white/80 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-center text-' + THEME_COLOR + '-500 group-hover:bg-' + THEME_COLOR + '-500 group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all duration-300 transform group-hover:scale-105">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>' +
                    '</div>' +
                '</div>' +
                '<div class="chap-meta">' +
                    '<div class="chap-meta-item shadow-sm border border-' + THEME_COLOR + '-50/50">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' +
                        weeks.length + ' ' + (weeks.length === 1 ? 'Week' : 'Weeks') +
                    '</div>' +
                    '<div class="chap-meta-item shadow-sm border border-' + THEME_COLOR + '-50/50">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
                        weeks.reduce((acc, w) => acc + (w.lectures || []).length, 0) + ' Materials' +
                    '</div>' +
                    (ch.time ? (
                    '<div class="chap-meta-item shadow-sm border border-' + THEME_COLOR + '-50/50">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
                        ch.time +
                    '</div>'
                    ) : '') +
                '</div>' +
            '</div>' +
            '<div class="chap-lectures-wrapper" onclick="event.stopPropagation()">' +
                '<div class="chap-lectures-inner">' +
                    '<div class="chap-weeks-list">' +
                        weeksHtml +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    if (timelineContainer) {
        timelineContainer.innerHTML = html;
    }

    // Show correct progress on initial load
    updateSidebarProgress();

    // Smooth CSS entrance for cards
    document.querySelectorAll('.chap-card').forEach((card, i) => {
        card.style.animation = 'soCardFadeIn 0.4s ease-out ' + (i * 0.04) + 's forwards';
    });

    // Progress Tooltip Logic
    const progressWrapper = document.getElementById('progress-ring-wrapper');
    const progressTooltip = document.getElementById('progress-tooltip');

    if (progressWrapper && progressTooltip) {
        progressWrapper.addEventListener('mouseenter', () => {
            let pdfTotal = 0, pdfDone = 0;
            let vidTotal = 0, vidDone = 0;
            const completed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');

            chapters.forEach(ch => {
                (ch.lectures || []).forEach(lec => {
                    if (lec.type === 'pdf') {
                        pdfTotal++;
                        if (completed[subjectId + '_' + lec.id]) pdfDone++;
                    } else {
                        vidTotal++;
                        if (completed[subjectId + '_' + lec.id]) vidDone++;
                    }
                });
            });

            const pdfTooltipSpan = document.getElementById('tooltip-pdfs');
            const vidTooltipSpan = document.getElementById('tooltip-videos');

            if (pdfTooltipSpan) pdfTooltipSpan.textContent = pdfDone + ' / ' + pdfTotal;
            if (vidTooltipSpan) vidTooltipSpan.textContent = vidDone + ' / ' + vidTotal;

            progressTooltip.style.opacity = '1';
            progressTooltip.style.transform = 'translateX(-50%) scale(1)';
        });

        progressWrapper.addEventListener('mouseleave', () => {
            progressTooltip.style.opacity = '0';
            progressTooltip.style.transform = 'translateX(-50%) scale(0.92)';
        });
    }

    // Process metadata asynchronously
    if (window['pdfjs-dist/build/pdf']) {
        window.pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    chapters.forEach(ch => {
        (ch.lectures || []).forEach(lec => {
            if (lec.type === 'video') {
                const videoEl = document.createElement('video');
                videoEl.src = lec.url;
                videoEl.onloadedmetadata = () => {
                    lec.duration = videoEl.duration;
                    const durationSpan = document.getElementById('dur-' + lec.id);
                    if (durationSpan) {
                        durationSpan.textContent = formatDuration(videoEl.duration);
                    }

                    const isDone = !!completedLectures[subjectId + '_' + lec.id];
                    if (!isDone) {
                        const storageKey = 'so_vid_progress_' + encodeURIComponent(lec.url);
                        const savedTime = localStorage.getItem(storageKey);
                        if (savedTime && !isNaN(savedTime) && parseFloat(savedTime) > 0) {
                            const actionSpan = document.getElementById('action-text-' + lec.id);
                            if (actionSpan) {
                                const mCurrent = Math.floor(parseFloat(savedTime) / 60);
                                const sCurrent = Math.floor(parseFloat(savedTime) % 60);
                                const mTotal = Math.floor(lec.duration / 60);
                                const sTotal = Math.floor(lec.duration % 60);
                                actionSpan.textContent = mCurrent + ':' + sCurrent.toString().padStart(2, '0') + ' / ' + mTotal + ':' + sTotal.toString().padStart(2, '0');
                            }
                        }
                    }
                };
            } else if (lec.type === 'pdf') {
                const durationSpan = document.getElementById('dur-' + lec.id);
                if (window.pdfjsLib && durationSpan) {
                    pdfjsLib.getDocument(lec.url).promise.then(pdf => {
                        durationSpan.innerHTML = pdf.numPages + ' Pages';
                    }).catch(err => {
                        durationSpan.innerHTML = "PDF";
                    });
                } else if (durationSpan) {
                    durationSpan.innerHTML = "PDF";
                }
            }
        });
    });

    function formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return "N/A";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return h + 'h ' + m + 'm';
        return m + 'm ' + s + 's';
    }
});
