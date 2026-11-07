/* ============================================================
   CrafterTools · Contact Us
   Form validation, localStorage persistence, animations
   ============================================================ */

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ============================================================
       1. SCROLL REVEAL (Intersection Observer, once only)
       ============================================================ */
    function initScrollReveal() {
        if (prefersReducedMotion) {
            document.querySelectorAll('.reveal-up, .reveal-scale').forEach((el) => el.classList.add('visible'));
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const delay = parseInt(entry.target.dataset.delay || 0, 10);
                setTimeout(() => entry.target.classList.add('visible'), delay);
                obs.unobserve(entry.target);
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -60px 0px'
        });

        document.querySelectorAll('.reveal-up, .reveal-scale').forEach((el) => observer.observe(el));
    }

    /* ============================================================
       2. RIPPLE EFFECT ON BUTTONS
       ============================================================ */
    function initRipple() {
        if (prefersReducedMotion) return;

        document.querySelectorAll('.btn-primary, .submit-btn, .btn-nav, .cta-btn').forEach((btn) => {
            btn.addEventListener('click', function (e) {
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                const ripple = document.createElement('span');
                ripple.className = 'ripple-effect';
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';

                this.appendChild(ripple);
                setTimeout(() => {
                    if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
                }, 700);
            });
        });
    }

    /* ============================================================
       3. BACKGROUND ORBS
       ============================================================ */
    function initBackgroundOrbs() {
        if (prefersReducedMotion) return;
        if (document.querySelector('.bg-float-container')) return;

        const container = document.createElement('div');
        container.className = 'bg-float-container';
        container.setAttribute('aria-hidden', 'true');

        for (let i = 0; i < 3; i++) {
            const orb = document.createElement('div');
            orb.className = 'bg-float-orb';
            container.appendChild(orb);
        }

        document.body.insertBefore(container, document.body.firstChild);
    }

    /* ============================================================
       4. FAQ ACCORDION
       ============================================================ */
    function initFAQ() {
        document.querySelectorAll('.faq-item').forEach((item) => {
            const question = item.querySelector('.faq-question');
            if (!question) return;

            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                document.querySelectorAll('.faq-item.open').forEach((o) => o.classList.remove('open'));
                if (!isOpen) item.classList.add('open');
            });
        });
    }

    /* ============================================================
       5. SMOOTH ANCHOR SCROLLING
       ============================================================ */
    function initSmoothScroll() {
        if (prefersReducedMotion) return;

        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (!targetId || targetId.length <= 1) return;

                const target = document.querySelector(targetId);
                if (!target) return;

                e.preventDefault();
                const offset = 90;
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            });
        });
    }

    /* ============================================================
       6. CONTACT FORM VALIDATION + SUBMISSION
       ============================================================ */
    function initContactForm() {
        const form = document.getElementById('contactFormEl');
        if (!form) return;

        const submitBtn = document.getElementById('submitBtn');
        const formSuccess = document.getElementById('formSuccess');

        const fields = {
            fullName: {
                input: document.getElementById('fullName'),
                error: document.getElementById('errFullName'),
                validate: (v) => {
                    if (!v.trim()) return 'Please enter your full name.';
                    if (v.trim().length < 2) return 'Name must be at least 2 characters.';
                    if (v.trim().length > 80) return 'Name is too long.';
                    return '';
                }
            },
            email: {
                input: document.getElementById('email'),
                error: document.getElementById('errEmail'),
                validate: (v) => {
                    if (!v.trim()) return 'Please enter your email address.';
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
                    if (!emailRegex.test(v.trim())) return 'Please enter a valid email address.';
                    return '';
                }
            },
            subject: {
                input: document.getElementById('subject'),
                error: document.getElementById('errSubject'),
                validate: (v) => {
                    if (!v.trim()) return 'Please enter a subject.';
                    if (v.trim().length < 3) return 'Subject must be at least 3 characters.';
                    if (v.trim().length > 120) return 'Subject is too long.';
                    return '';
                }
            },
            message: {
                input: document.getElementById('message'),
                error: document.getElementById('errMessage'),
                validate: (v) => {
                    if (!v.trim()) return 'Please enter your message.';
                    if (v.trim().length < 10) return 'Message must be at least 10 characters.';
                    if (v.trim().length > 2000) return 'Message is too long (max 2000 characters).';
                    return '';
                }
            }
        };

        // Live validation on blur
        Object.values(fields).forEach(({ input, error, validate }) => {
            if (!input) return;

            input.addEventListener('blur', () => {
                const msg = validate(input.value);
                if (msg) {
                    input.classList.add('invalid');
                    error.textContent = msg;
                    error.classList.add('visible');
                }
            });

            input.addEventListener('input', () => {
                if (input.classList.contains('invalid')) {
                    const msg = validate(input.value);
                    if (!msg) {
                        input.classList.remove('invalid');
                        error.classList.remove('visible');
                        error.textContent = '';
                    }
                }
            });
        });

        // Submit handler
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Validate all fields
            let isValid = true;
            const data = {};

            Object.entries(fields).forEach(([key, { input, error, validate }]) => {
                if (!input) return;

                const msg = validate(input.value);
                data[key] = input.value.trim();

                if (msg) {
                    isValid = false;
                    input.classList.add('invalid');
                    error.textContent = msg;
                    error.classList.add('visible');
                } else {
                    input.classList.remove('invalid');
                    error.classList.remove('visible');
                    error.textContent = '';
                }
            });

            if (!isValid) {
                // Scroll first invalid field into view
                const firstInvalid = form.querySelector('.form-input.invalid');
                if (firstInvalid) {
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstInvalid.focus({ preventScroll: true });
                }
                return;
            }

            // Show loading
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-spinner"></span><span>Sending...</span>';

            // Simulate processing delay (no backend)
            setTimeout(() => {
                try {
                    // Save to localStorage
                    const stored = JSON.parse(localStorage.getItem('craftertools_messages') || '[]');
                    stored.push({
                        ...data,
                        id: Date.now(),
                        timestamp: new Date().toISOString()
                    });
                    localStorage.setItem('craftertools_messages', JSON.stringify(stored));
                } catch (err) {
                    console.warn('Could not save to localStorage:', err);
                }

                // Show success
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;

                formSuccess.classList.remove('hidden');
                formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Reset form fields (but keep success visible)
                form.reset();

                // Hide success after 6 seconds
                setTimeout(() => {
                    formSuccess.classList.add('hidden');
                }, 6000);
            }, 1200);
        });
    }

    /* ============================================================
       7. INIT
       ============================================================ */
    function init() {
        initScrollReveal();
        initRipple();
        initBackgroundOrbs();
        initFAQ();
        initSmoothScroll();
        initContactForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();