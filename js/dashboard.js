/* ===================================================
   SUBJECTS ONLINE — Dashboard Home JS
   =================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // ── Guard: redirect to login if not signed in ────────────────────────────
  requireAuth("login.html");

  const userName = localStorage.getItem("subjectsOnlineName") || "Student";
  const userDept = localStorage.getItem("subjectsOnlineDept") || "Accounting";
  const avatarImg = localStorage.getItem("subjectsOnlineAvatarImage") || null;

  // Top hero info
  const displayDept = document.getElementById("display-dept");
  const heroAvatar = document.getElementById("hero-avatar");

  if (displayDept) displayDept.textContent = userDept;

  if (heroAvatar) {
    if (avatarImg) {
      heroAvatar.style.backgroundImage = `url(${avatarImg})`;
      heroAvatar.textContent = "";
      heroAvatar.classList.remove("bg-gradient-to-tr");
    } else {
      heroAvatar.textContent = userName[0].toUpperCase();
    }
  }

  // Direct Display Name Assignment
  const nameTextEl = document.getElementById("display-name-text");
  const cursorEl = document.querySelector(".hero-cursor");

  if (cursorEl) cursorEl.style.display = "none";

  if (nameTextEl) {
    nameTextEl.textContent = userName;
  }

  // Spawn floating particles
  spawnHeroParticles();

  // Initialize animations
  initAnimations();
  initHologramAvatarSequence();

  // Load dashboard data
  loadStats(userDept);
  loadPlanner();

  showSalawatNotification();
});

/**
 * Shows "صلى على النبي" notification
 */
function showSalawatNotification() {
  if (document.getElementById("salawat-toast")) return;

  const toast = document.createElement("div");
  toast.id = "salawat-toast";
  toast.className = "salawat-notification-toast";

  toast.innerHTML = `
        <div class="salawat-toast-icon">🤍</div>
        <span class="salawat-toast-text">صَلِّ عَلَى نَبِيِّنَا مُحَمَّدٍ</span>
        <span class="salawat-toast-sparkle">✨</span>
        <button class="salawat-toast-close"
                onclick="this.parentElement.remove()"
                title="إغلاق">✕</button>
    `;

  document.body.appendChild(toast);

  if (!document.getElementById("salawat-toast-style")) {
    const style = document.createElement("style");

    style.id = "salawat-toast-style";

    style.textContent = `
            .salawat-notification-toast {
                position: fixed;
                top: 88px;
                right: 24px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 18px;
                border-radius: 9999px;
                background: rgba(255, 255, 255, 0.92);
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                border: 1px solid rgba(16, 185, 129, 0.3);
                box-shadow:
                    0 10px 30px -5px rgba(16, 185, 129, 0.2),
                    0 4px 12px rgba(0,0,0,0.04);
                font-family: 'Plus Jakarta Sans', system-ui,
                    -apple-system, sans-serif;
                direction: rtl;
                animation:
                    salawatSlideIn 0.6s
                    cubic-bezier(0.34, 1.56, 0.64, 1)
                    forwards;
                user-select: none;
            }

            .dark .salawat-notification-toast {
                background: rgba(15, 23, 42, 0.92);
                border-color: rgba(16, 185, 129, 0.4);
                box-shadow:
                    0 10px 30px -5px rgba(16, 185, 129, 0.3),
                    0 4px 15px rgba(0,0,0,0.4);
            }

            @keyframes salawatSlideIn {
                0% {
                    opacity: 0;
                    transform: translateY(-15px) scale(0.92);
                }

                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .salawat-toast-icon {
                font-size: 16px;
                animation:
                    salawatPulse 2s ease-in-out infinite;
            }

            @keyframes salawatPulse {
                0%, 100% {
                    transform: scale(1);
                }

                50% {
                    transform: scale(1.2);
                }
            }

            .salawat-toast-text {
                font-size: 0.92rem;
                font-weight: 800;
                color: #047857;
                letter-spacing: -0.01em;
            }

            .dark .salawat-toast-text {
                color: #34d399;
            }

            .salawat-toast-sparkle {
                font-size: 14px;
            }

            .salawat-toast-close {
                border: none;
                background: transparent;
                color: #94a3b8;
                font-size: 12px;
                cursor: pointer;
                padding: 2px 4px;
                margin-right: 4px;
                border-radius: 50%;
                transition: color 0.2s, background 0.2s;
                line-height: 1;
            }

            .salawat-toast-close:hover {
                color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
            }
        `;

    document.head.appendChild(style);
  }

  // Auto-remove after 6 seconds
  setTimeout(() => {
    if (toast && toast.parentElement) {
      toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";

      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";

      setTimeout(() => toast.remove(), 400);
    }
  }, 6000);
}

/* ===================================================
   DASHBOARD STATS
   =================================================== */

function loadStats(deptText) {
  const deptKey = getDeptKey(deptText);
  const materials = MATERIALS[deptKey] || MATERIALS["accounting"];

  let openedSubjects = 0;

  const favs = getFavorites();
  const favoritesCount = favs.length;

  let totalVideos = 0;
  let totalPDFs = 0;

  let doneVideos = 0;
  let donePDFs = 0;

  let totalLectures = 0;
  let doneLectures = 0;

  let subjectPctsSum = 0;
  let openedSubjectsCount = 0;

  const lastOpened = JSON.parse(localStorage.getItem("soLastOpened") || "{}");

  const contentSections = [
    "chapters",
    "quizzes",
    "sections",
    "summaries",
    "qa",
    "finalReview",
  ];

  materials.forEach((subj) => {
    let subjTotalLectures = 0;
    let subjDoneLectures = 0;

    contentSections.forEach((sec) => {
      const secData =
        typeof getSubjectSectionData !== "undefined"
          ? getSubjectSectionData(subj, sec)
          : subj.content
            ? subj.content[sec]
            : null;

      if (!secData || secData.length === 0) return;

      const storeKey =
        typeof SECTION_STORE_MAP !== "undefined" && SECTION_STORE_MAP[sec]
          ? SECTION_STORE_MAP[sec]
          : "soCompletedLectures";

      const store = JSON.parse(localStorage.getItem(storeKey) || "{}");

      secData.forEach((ch) => {
        if (!ch.lectures) return;

        ch.lectures.forEach((lec) => {
          totalLectures++;
          subjTotalLectures++;

          const key = subj.id + "_" + lec.id;

          const isDone = !!(
            store[key] ||
            (sec === "summaries" &&
              store[subj.id + "_101"] &&
              lec.id === 3001) ||
            (sec === "qa" && store[subj.id + "_101"] && lec.id === 4001)
          );

          if (lec.type === "video") {
            totalVideos++;

            if (isDone) {
              doneVideos++;
            }
          } else {
            totalPDFs++;

            if (isDone) {
              donePDFs++;
            }
          }

          if (isDone) {
            doneLectures++;
            subjDoneLectures++;
          }
        });
      });
    });

    const subjPct =
      subjTotalLectures > 0 ? (subjDoneLectures / subjTotalLectures) * 100 : 0;

    subjectPctsSum += subjPct;

    if (subjDoneLectures > 0 || lastOpened[subj.id]) {
      openedSubjectsCount++;
    }
  });

  /* ===================================================
       CALCULATE PERCENTAGES
       =================================================== */

  const openedPDFsPct =
    totalPDFs > 0 ? Math.round((donePDFs / totalPDFs) * 100) : 0;

  const openedVideosPct =
    totalVideos > 0 ? Math.round((doneVideos / totalVideos) * 100) : 0;

  const progressPct =
    totalLectures > 0 ? Math.round((doneLectures / totalLectures) * 100) : 0;

  const totalSubjects = materials.length;

  const avgSubjectsPct =
    totalSubjects > 0 ? Math.round(subjectPctsSum / totalSubjects) : 0;

  /* ===================================================
       UPDATE OTHER DASHBOARD VALUES
       =================================================== */

  const libCount = document.getElementById("card-lib-count");

  const essaysCount = document.getElementById("card-essays-count");

  const favCount = document.getElementById("card-fav-count");

  const libProgress = document.getElementById("card-lib-progress");

  const myLibCount = document.getElementById("card-my-lib-count");

  if (myLibCount) {
    const offlineLib = JSON.parse(
      localStorage.getItem("so_offline_library") || "[]",
    );

    myLibCount.textContent = offlineLib.length;
  }

  if (libCount) {
    libCount.textContent = `${totalSubjects} Subjects`;
  }

  if (essaysCount) {
    essaysCount.textContent = typeof ESSAYS !== "undefined" ? ESSAYS.length : 0;
  }

  if (favCount) {
    favCount.textContent = favoritesCount;
  }

  if (libProgress) {
    libProgress.style.width = `${progressPct}%`;
  }

  /* ===================================================
       HERO PROGRESS RING
       =================================================== */

  const progressRing = document.getElementById("hero-progress-ring");

  if (progressRing) {
    const circumference = 339.29;

    const offset = circumference - (progressPct / 100) * circumference;

    setTimeout(() => {
      progressRing.style.strokeDashoffset = offset;
    }, 500);
  }

  /* ===================================================
       ANALYTICS HTML
       =================================================== */

  const statsHTML = `

        <div
            class="analytics-bars-container
                   flex flex-col gap-4 sm:gap-6
                   w-full mt-2"
        >

            <!-- PDFs -->

            <div class="analytics-stat-item">

                <div
                    class="flex justify-between
                           items-center mb-1.5"
                >

                    <span
                        class="text-xs sm:text-sm
                               font-bold uppercase
                               tracking-wider
                               text-slate-700
                               dark:text-slate-200
                               flex items-center gap-2"
                    >

                        <span
                            class="w-2.5 h-2.5
                                   rounded-full
                                   bg-purple-500
                                   shadow-[0_0_8px_#8b5cf6]"
                        ></span>

                        PDFs

                    </span>

                    <div
                        class="flex items-center gap-2"
                    >

                        <span
                            class="text-xs sm:text-sm
                                   font-bold
                                   text-slate-400"
                        >
                            <span
                                class="text-purple-500
                                       font-extrabold"
                            >
                                ${donePDFs}
                            </span>
                            /
                            ${totalPDFs}
                        </span>

                        <span
                            class="text-xs sm:text-sm
                                   font-black
                                   text-slate-800
                                   dark:text-slate-100"
                        >
                            ${openedPDFsPct}%
                        </span>

                    </div>

                </div>

                <div
                    class="bento-prog-bar-container"
                >

                    <div
                        class="bento-prog-bar-fill"
                        style="
                            width:${openedPDFsPct}%;
                            background:
                                linear-gradient(
                                    90deg,
                                    #8b5cf6,
                                    #a78bfa
                                );
                            box-shadow:
                                0 0 10px
                                rgba(139,92,246,0.5);
                        "
                    ></div>

                </div>

            </div>


            <!-- VIDEOS -->

            <div class="analytics-stat-item">

                <div
                    class="flex justify-between
                           items-center mb-1.5"
                >

                    <span
                        class="text-xs sm:text-sm
                               font-bold uppercase
                               tracking-wider
                               text-slate-700
                               dark:text-slate-200
                               flex items-center gap-2"
                    >

                        <span
                            class="w-2.5 h-2.5
                                   rounded-full
                                   bg-blue-500
                                   shadow-[0_0_8px_#3b82f6]"
                        ></span>

                        Videos

                    </span>

                    <div
                        class="flex items-center gap-2"
                    >

                        <span
                            class="text-xs sm:text-sm
                                   font-bold
                                   text-slate-400"
                        >
                            <span
                                class="text-blue-500
                                       font-extrabold"
                            >
                                ${doneVideos}
                            </span>
                            /
                            ${totalVideos}
                        </span>

                        <span
                            class="text-xs sm:text-sm
                                   font-black
                                   text-slate-800
                                   dark:text-slate-100"
                        >
                            ${openedVideosPct}%
                        </span>

                    </div>

                </div>

                <div
                    class="bento-prog-bar-container"
                >

                    <div
                        class="bento-prog-bar-fill"
                        style="
                            width:${openedVideosPct}%;
                            background:
                                linear-gradient(
                                    90deg,
                                    #3b82f6,
                                    #60a5fa
                                );
                            box-shadow:
                                0 0 10px
                                rgba(59,130,246,0.5);
                        "
                    ></div>

                </div>

            </div>

        </div>
    `;

  /* ===================================================
       IMPORTANT MOBILE FIX
       =================================================== */

  const analyticsBars = document.getElementById("bento-analytics-bars");

  if (analyticsBars) {
    // Make sure the container itself is visible
    analyticsBars.style.display = "flex";
    analyticsBars.style.flexDirection = "column";
    analyticsBars.style.width = "100%";
    analyticsBars.style.visibility = "visible";
    analyticsBars.style.opacity = "1";

    // Inject content
    analyticsBars.innerHTML = statsHTML;

    // Force browser to calculate the new layout
    void analyticsBars.offsetHeight;

    // Refresh ScrollTrigger after dynamic content changes
    if (typeof ScrollTrigger !== "undefined") {
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    }
  }

  /* ===================================================
       TOTAL SCORE
       =================================================== */

  const totalScore = document.getElementById("bento-total-score");

  if (totalScore) {
    totalScore.innerHTML = `
            ${progressPct}
            <span
                class="text-3xl font-light
                       text-slate-400"
            >
                %
            </span>
        `;
  }

  /* ===================================================
       MOBILE LAYOUT SAFETY
       =================================================== */

  requestAnimationFrame(() => {
    const card = document
      .querySelector("#bento-analytics-bars")
      ?.closest(".bento-card");

    if (!card) return;

    if (window.innerWidth <= 768) {
      card.style.height = "auto";
      card.style.minHeight = "0";

      const cardContent = card.firstElementChild;

      if (cardContent) {
        cardContent.style.height = "auto";
        cardContent.style.minHeight = "0";
      }

      const bars = document.getElementById("bento-analytics-bars");

      if (bars) {
        bars.style.height = "auto";
        bars.style.minHeight = "100px";
        bars.style.overflow = "visible";
      }
    }

    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  });
}

/* ===================================================
   GSAP ANIMATIONS
   =================================================== */

function initAnimations() {
  if (typeof gsap === "undefined") {
    document.querySelectorAll(".bento-card").forEach((card) => {
      card.style.opacity = "1";
      card.style.visibility = "visible";
      card.style.transform = "none";
    });

    return;
  }

  gsap.fromTo(
    ".bento-card",

    {
      y: 60,
      opacity: 0,
      scale: 0.98,
    },

    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 1,
      ease: "power3.out",
      stagger: 0.15,

      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 85%",
      },
    },
  );

  // Important: refresh after cards are rendered
  if (typeof ScrollTrigger !== "undefined") {
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  }
}

/* ===================================================
   HOLOGRAM AVATAR
   =================================================== */

function initHologramAvatarSequence() {
  if (typeof gsap === "undefined") return;

  const arcLeft = document.getElementById("ring-arc-left");

  const arcRight = document.getElementById("ring-arc-right");

  const originDot = document.getElementById("ring-origin-dot");

  const snapDot = document.getElementById("ring-snap-dot");

  const avatarWrap = document.getElementById("hero-avatar-wrap");

  if (!arcLeft || !arcRight) return;

  const arcLength = 298;

  arcLeft.style.strokeDasharray = arcLength;

  arcLeft.style.strokeDashoffset = arcLength;

  arcRight.style.strokeDasharray = arcLength;

  arcRight.style.strokeDashoffset = arcLength;

  const ringTl = gsap.timeline({
    delay: 0.3,
  });

  if (originDot) {
    ringTl.fromTo(
      originDot,

      {
        scale: 0,
        opacity: 0,
      },

      {
        scale: 1.5,
        opacity: 1,
        duration: 0.4,
        ease: "back.out(2)",
      },
    );
  }

  ringTl.to(
    [arcLeft, arcRight],

    {
      strokeDashoffset: 0,
      duration: 1.3,
      ease: "power2.inOut",
    },

    "+=0.1",
  );

  if (snapDot) {
    ringTl.to(
      snapDot,

      {
        opacity: 1,
        scale: 2.2,
        duration: 0.15,
        ease: "power4.out",

        onComplete: () => {
          gsap.to(
            snapDot,

            {
              scale: 1,
              opacity: 0.8,
              duration: 0.4,
            },
          );

          if (avatarWrap) {
            gsap.fromTo(
              avatarWrap,

              {
                opacity: 0,
                scale: 0.85,
              },

              {
                opacity: 1,
                scale: 1,
                duration: 0.7,
                ease: "back.out(1.5)",
              },
            );
          }
        },
      },
    );
  }
}

/* ===================================================
   TYPING ANIMATION
   =================================================== */

function typeWriter(el, cursorEl, text, speed, onDone) {
  el.textContent = "";

  let i = 0;

  const delay = 600;

  setTimeout(() => {
    const interval = setInterval(() => {
      el.textContent += text[i];

      i++;

      if (i >= text.length) {
        clearInterval(interval);

        if (typeof onDone === "function") {
          onDone();
        }
      }
    }, speed);
  }, delay);
}

/* ===================================================
   FLOATING PARTICLES
   =================================================== */

function spawnHeroParticles() {
  const container = document.getElementById("hero-particles");

  if (!container) return;

  const colors = ["#0EA5E9", "#6366f1", "#a855f7", "#06b6d4", "#38bdf8"];

  const count = 18;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");

    p.className = "hero-particle";

    const size = Math.random() * 5 + 2;

    const angle = Math.random() * 360;

    const dist = 120 + Math.random() * 100;

    const tx = Math.cos((angle * Math.PI) / 180) * dist;

    const ty = Math.sin((angle * Math.PI) / 180) * dist;

    const dur = 3 + Math.random() * 4;

    const delay = Math.random() * dur;

    const color = colors[Math.floor(Math.random() * colors.length)];

    const startX = 185 + Math.random() * 30;

    const startY = 185 + Math.random() * 30;

    Object.assign(
      p.style,

      {
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        left: `${startX}px`,
        top: `${startY}px`,
        "--tx": `${tx}px`,
        "--ty": `${ty}px`,
        animationDuration: `${dur}s`,
        animationDelay: `${delay}s`,
      },
    );

    container.appendChild(p);
  }
}
