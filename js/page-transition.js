// js/page-transition.js
// Lightweight page transition overlay & scroll reveal animations (Optimized)

(function() {
    // Determine the background color based on Dark Mode preference
    const isDark = localStorage.getItem('soDarkMode') === '1';
    const bgColor = isDark ? '#050505' : '#ffffff';

    // Create the overlay element immediately
    const overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = bgColor;
    overlay.style.zIndex = '999999';
    overlay.style.opacity = '1';

    // On mobile, use a near-instant transition to prevent perceived lag
    const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    overlay.style.transition = isMobile ? 'opacity 0.1s ease' : 'opacity 0.3s ease-in-out';
    overlay.style.pointerEvents = 'none';

    // Append it to html element as early as possible
    document.documentElement.appendChild(overlay);

    // Fade out the overlay when the page is fully loaded
    window.addEventListener('load', () => {
        requestAnimationFrame(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 350);
        });
    });

    // Intercept navigation clicks to trigger a fade out before leaving the page
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        const href = link.getAttribute("href");

        // Ignore links that shouldn't transition (hashes, external, new tabs, js)
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || link.getAttribute("target") === "_blank" ||
            (link.hostname && link.hostname !== window.location.hostname)) {
            return;
        }

        e.preventDefault();

        // Add overlay back to fade out
        document.documentElement.appendChild(overlay);
        window.getComputedStyle(overlay).opacity; // Force a CSS reflow
        overlay.style.opacity = '1';

        // Wait for fade to complete, then navigate
        setTimeout(() => {
            window.location.href = href;
        }, 300);
    });

    // Fix for Back/Forward cache (bfcache) - if user clicks 'back' button
    window.addEventListener("pageshow", (e) => {
        if (e.persisted && overlay.parentNode) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 350);
        }
    });

    // ==========================================
    // 1. SCROLL PROGRESS BAR
    // ==========================================
    window.addEventListener('DOMContentLoaded', () => {
        const bar = document.createElement('div');
        bar.id = 'scroll-progress-bar';
        Object.assign(bar.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            height: '3px',
            width: '0%',
            background: 'linear-gradient(90deg, #2563eb, #60a5fa, #a78bfa)',
            zIndex: '999997',
            pointerEvents: 'none',
            transition: 'width 0.1s linear',
            boxShadow: '0 0 8px rgba(96, 165, 250, 0.8)',
        });
        document.documentElement.appendChild(bar);

        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            bar.style.width = pct + '%';
        }, { passive: true });
    });

    // ==========================================
    // 2. SCROLL REVEAL ANIMATIONS
    // ==========================================
    window.addEventListener('DOMContentLoaded', () => {
        // Inject the CSS for reveal animations
        const css = `
            .so-reveal {
                opacity: 0;
                transform: translateY(32px);
                transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                            transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .so-reveal.so-visible {
                opacity: 1;
                transform: translateY(0);
            }
            .so-reveal-left {
                opacity: 0;
                transform: translateX(-40px);
                transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                            transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .so-reveal-left.so-visible {
                opacity: 1;
                transform: translateX(0);
            }
            .so-reveal-right {
                opacity: 0;
                transform: translateX(40px);
                transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                            transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .so-reveal-right.so-visible {
                opacity: 1;
                transform: translateX(0);
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        // Selectors to animate on scroll
        const revealSelectors = [
            { sel: '.home-card',        cls: 'so-reveal',       delay: true },
            { sel: '.stat-card',        cls: 'so-reveal',       delay: true },
            { sel: '.stats-section',    cls: 'so-reveal',       delay: false },
            { sel: '.planner-section',  cls: 'so-reveal',       delay: false },
            { sel: '.cta-block',        cls: 'so-reveal',       delay: false },
        ];

        // On pages that use GSAP (welcome.html), skip feature elements entirely
        const isGSAPPage = !!document.querySelector('.feature-row');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('so-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealSelectors.forEach(({ sel, cls, delay }) => {
            document.querySelectorAll(sel).forEach((el, i) => {
                if (isGSAPPage && (el.classList.contains('feature-img-wrapper') || el.classList.contains('feature-text') || el.classList.contains('feature-card'))) return;
                el.classList.add(cls);
                if (delay) el.style.transitionDelay = (i * 0.08) + 's';
                observer.observe(el);
            });
        });
    });

    // ==========================================
    // 3. STAGGERED TEXT REVEAL (Headings)
    // ==========================================
    window.addEventListener('DOMContentLoaded', () => {
        const headingCss = `
            .so-word-wrap { display: inline-block; overflow: hidden; vertical-align: bottom; }
            .so-word {
                display: inline-block;
                opacity: 0;
                transform: translateY(110%);
                transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                            transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .so-word.so-word-visible {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        const hStyle = document.createElement('style');
        hStyle.textContent = headingCss;
        document.head.appendChild(hStyle);

        // Target h1 and h2 headings that are NOT already split by the page's own JS
        const headings = document.querySelectorAll(
            'h1:not(.hero-title-animated):not(.wi-heading), h2:not(.hero-title-animated):not(.wi-heading)'
        );

        const wordObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll('.so-word').forEach((w, i) => {
                        setTimeout(() => w.classList.add('so-word-visible'), i * 60);
                    });
                    wordObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        headings.forEach(h => {
            // Skip empty or JS-filled headings
            if (!h.textContent.trim() || h.closest('[id$="-list"]') || h.closest('#stats-row')) return;
            if (h.querySelector('#display-name, #display-dept')) return;

            const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null);
            const textNodes = [];
            let node;
            while ((node = walker.nextNode())) {
                if (node.nodeValue.trim()) textNodes.push(node);
            }

            textNodes.forEach(textNode => {
                const words = textNode.nodeValue.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                words.forEach(part => {
                    if (/^\s+$/.test(part)) {
                        frag.appendChild(document.createTextNode(part));
                    } else if (part) {
                        const wrap = document.createElement('span');
                        wrap.className = 'so-word-wrap';
                        const inner = document.createElement('span');
                        inner.className = 'so-word';
                        inner.textContent = part;
                        wrap.appendChild(inner);
                        frag.appendChild(wrap);
                    }
                });
                textNode.parentNode.replaceChild(frag, textNode);
            });

            wordObserver.observe(h);
        });
    });

})();
