/* ============================================================
   CrafterTools · About Us
   Intersection Observer scroll reveals, count-up stats,
   ripple buttons, FAQ accordion — all lightweight, no deps.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       1. SCROLL REVEAL (Intersection Observer)
       ============================================================ */
    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay || 0, 10);
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                // Run only once
                obs.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -60px 0px'
    });

    document.querySelectorAll('.reveal-up, .reveal-down, .reveal-left, .reveal-scale')
        .forEach((el) => revealObserver.observe(el));

    /* ============================================================
       2. COUNT-UP STATISTICS
       ============================================================ */
    const countObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const el = entry.target;
            const target = parseInt(el.dataset.target, 10);
            const duration = 1600;
            const startTime = performance.now();

            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

            const animate = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeOutCubic(progress);
                el.textContent = Math.round(target * eased);
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    el.textContent = target;
                }
            };
            requestAnimationFrame(animate);

            obs.unobserve(el);
        });
    }, { threshold: 0.4 });

    document.querySelectorAll('.count').forEach((el) => countObserver.observe(el));

    /* ============================================================
       3. RIPPLE EFFECT ON PRIMARY BUTTONS
       ============================================================ */
    document.querySelectorAll('.btn-primary').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            this.style.setProperty('--ripple-x', x + '%');
            this.style.setProperty('--ripple-y', y + '%');
            this.classList.remove('rippling');
            void this.offsetWidth; // force reflow
            this.classList.add('rippling');

            setTimeout(() => this.classList.remove('rippling'), 700);
        });
    });

    /* ============================================================
       4. FAQ ACCORDION
       ============================================================ */
    document.querySelectorAll('.faq-item').forEach((item) => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            // Close all
            document.querySelectorAll('.faq-item.open').forEach((o) => o.classList.remove('open'));
            // Open clicked if it was closed
            if (!isOpen) item.classList.add('open');
        });
    });

    /* ============================================================
       5. SMOOTH ANCHOR SCROLLING (fallback for older browsers)
       ============================================================ */
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId.length <= 1) return;
            const target = document.querySelector(targetId);
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    /* ============================================================
       6. INITIAL FADE-IN FOR PAGE HEADER
       ============================================================ */
    // Hero elements already use .reveal-* which triggers immediately
    // since they're in view on load. Add a tiny delay to let CSS settle.
    window.addEventListener('load', () => {
        document.querySelectorAll('.hero-section .reveal-up, .hero-section .reveal-down, .hero-section .reveal-scale')
            .forEach((el) => el.classList.add('visible'));
    });
});