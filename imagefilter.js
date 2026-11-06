/* ============================================================
   CrafterTools · Image Filter
   Vanilla JS — Canvas API, fully offline
   12+ CSS filter presets + intensity blending
   UNIQUE animation: film-develop reveal (shine sweep + scanline)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- Filter Presets ---------- */
    // Each preset is a set of base CSS filter values.
    // Intensity blends from identity (0%) to full filter (100%).
    const FILTERS = [
        { name: 'Original',    css: 'none' },
        { name: 'Vintage',     css: 'sepia(0.55) saturate(1.1) contrast(0.95) brightness(0.95)' },
        { name: 'Noir',        css: 'grayscale(1) contrast(1.25) brightness(0.95)' },
        { name: 'Warm',        css: 'sepia(0.25) saturate(1.3) hue-rotate(-10deg) brightness(1.05)' },
        { name: 'Cool',        css: 'saturate(1.15) hue-rotate(15deg) brightness(1.02)' },
        { name: 'Dramatic',    css: 'contrast(1.5) brightness(0.9) saturate(1.2)' },
        { name: 'Fade',        css: 'contrast(0.85) brightness(1.1) saturate(0.8) sepia(0.2)' },
        { name: 'Sepia',       css: 'sepia(1) saturate(0.9) contrast(1.05)' },
        { name: 'Vivid',       css: 'saturate(1.8) contrast(1.15) brightness(1.05)' },
        { name: 'Cool Blue',   css: 'hue-rotate(180deg) saturate(1.1) brightness(1.05)' },
        { name: 'Pink Dream',  css: 'sepia(0.3) saturate(1.5) hue-rotate(-30deg) brightness(1.05)' },
        { name: 'Mono',        css: 'grayscale(1) contrast(1.1)' },
        { name: 'Invert',      css: 'invert(1)' }
    ];

    // Map for parsing CSS filter strings for canvas application.
    // We parse each filter's numeric values and interpolate them by intensity.

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewFilter = document.getElementById('previewFilter');
    const resetBtn = document.getElementById('resetBtn');

    const previewImage = document.getElementById('previewImage');
    const glowBorder = document.getElementById('glowBorder');
    const filterNameBadge = document.getElementById('filterNameBadge');

    const filterGrid = document.getElementById('filterGrid');
    const intensitySlider = document.getElementById('intensitySlider');
    const intensityReadout = document.getElementById('intensityReadout');
    const resetFilterBtn = document.getElementById('resetFilterBtn');

    const applyBtn = document.getElementById('applyBtn');
    const developAnimation = document.getElementById('developAnimation');
    const glowLine = document.getElementById('glowLine');
    const developStageImg = document.getElementById('developStageImg');
    const developStatus = document.getElementById('developStatus');
    const developCountValue = document.getElementById('developCountValue');
    const developProgressFill = document.getElementById('developProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultFilteredImg = document.getElementById('resultFilteredImg');
    const detailFilename = document.getElementById('detailFilename');
    const detailFilter = document.getElementById('detailFilter');
    const detailResolution = document.getElementById('detailResolution');
    const detailSize = document.getElementById('detailSize');
    const processTime = document.getElementById('processTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const editAnotherBtn = document.getElementById('editAnotherBtn');

    const compareSlider = document.getElementById('compareSlider');
    const compareBefore = document.getElementById('compareBefore');
    const compareAfter = document.getElementById('compareAfter');
    const compareAfterClip = document.getElementById('compareAfterClip');
    const compareHandle = document.getElementById('compareHandle');

    const toast = document.getElementById('toast');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let outputFormat = 'image/png';
    let selectedFilterIndex = 0;
    let intensity = 100;
    let filteredBlob = null, filteredDataUrl = null;
    let busy = false;

    /* ---------- Utils ---------- */
    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const showToast = (msg) => {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    /* ---------- Filter application to preview (live CSS) ---------- */
    const applyPreviewFilter = () => {
        if (!originalImage) return;
        const f = FILTERS[selectedFilterIndex];
        const pct = intensity / 100;

        // Build interpolated CSS filter string
        // We can simply scale each function's value by pct, or use opacity blend via two layers.
        // Simple approach: use CSS filter with full effect + opacity blend isn't natively possible.
        // Instead we build interpolated filter string.

        if (f.name === 'Original' || pct === 0) {
            previewImage.style.filter = 'none';
            glowBorder.classList.remove('active');
            filterNameBadge.textContent = 'Original';
            previewFilter.textContent = 'Filter: Original';
            return;
        }

        const interpolated = interpolateFilter(f.css, pct);
        previewImage.style.filter = interpolated;

        glowBorder.classList.add('active');
        filterNameBadge.textContent = `${f.name} · ${intensity}%`;
        previewFilter.textContent = `Filter: ${f.name} (${intensity}%)`;
    };

    /* ---------- Parse & interpolate CSS filter string ---------- */
    // Example: "sepia(0.55) saturate(1.1) contrast(0.95)"
    // We identify each function, parse its value, interpolate from identity:
    // - brightness/contrast/saturate/sepia/grayscale/invert/hue-rotate: identity = (1) or (0)
    // - brightness: identity = 1
    // - contrast:   identity = 1
    // - saturate:   identity = 1
    // - sepia:      identity = 0
    // - grayscale:  identity = 0
    // - invert:     identity = 0
    // - hue-rotate: identity = 0deg
    const FUNCTION_IDENTITY = {
        'brightness': 1,
        'contrast': 1,
        'saturate': 1,
        'sepia': 0,
        'grayscale': 0,
        'invert': 0,
        'hue-rotate': 0
    };

    const interpolateFilter = (filterStr, pct) => {
        if (filterStr === 'none') return 'none';

        // Match each function: name(value with optional unit)
        const regex = /([a-z-]+)\(([\d.]+)(deg|%)?\)/gi;
        let result = '';
        let match;

        while ((match = regex.exec(filterStr)) !== null) {
            const name = match[1].toLowerCase();
            const value = parseFloat(match[2]);
            const unit = match[3] || '';
            const identity = FUNCTION_IDENTITY[name] !== undefined ? FUNCTION_IDENTITY[name] : 1;

            // Interpolate from identity → target value
            const interp = identity + (value - identity) * pct;
            result += `${name}(${interp.toFixed(4)}${unit}) `;
        }

        return result.trim() || 'none';
    };

    /* ---------- Render filter to canvas (bake it in) ---------- */
    const renderFilteredImage = () => new Promise((resolve) => {
        const f = FILTERS[selectedFilterIndex];
        const pct = intensity / 100;

        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');

        if (outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Apply filter via ctx.filter (supported in all modern browsers)
        if (f.name === 'Original' || pct === 0) {
            ctx.filter = 'none';
        } else {
            ctx.filter = interpolateFilter(f.css, pct);
        }

        ctx.drawImage(originalImage, 0, 0);
        ctx.filter = 'none';

        const quality = outputFormat === 'image/jpeg' ? 0.92 : undefined;
        canvas.toBlob((blob) => {
            if (!blob) return resolve(null);
            resolve({ blob, dataUrl: canvas.toDataURL(outputFormat, quality) });
        }, outputFormat, quality);
    });

    /* ---------- Upload ---------- */
    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.match('image/(jpeg|png|webp)')) {
            alert('Please select a JPG, PNG or WEBP image.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File too large. Max 20MB.');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;
        outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        filteredBlob = null;
        filteredDataUrl = null;
        selectedFilterIndex = 0;
        intensity = 100;

        editorSection.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        developAnimation.classList.add('hidden');
        applyBtn.disabled = true;
        intensitySlider.value = 100;
        intensityReadout.textContent = '100%';

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                originalWidth = img.width;
                originalHeight = img.height;

                previewImage.src = e.target.result;
                previewName.textContent = file.name;
                previewSize.textContent = formatSize(file.size);
                previewDimensions.textContent = `${img.width} × ${img.height}`;

                buildFilterGrid();
                applyPreviewFilter();

                applyBtn.disabled = false;
            };
            img.onerror = () => alert('Could not load image.');
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    /* ---------- Filter grid ---------- */
    const buildFilterGrid = () => {
        filterGrid.innerHTML = '';
        FILTERS.forEach((f, i) => {
            const item = document.createElement('div');
            item.className = 'filter-item' + (i === selectedFilterIndex ? ' active' : '');
            item.dataset.index = i;

            const thumb = document.createElement('div');
            thumb.className = 'filter-thumb';

            const img = document.createElement('img');
            img.src = originalImage.src;
            img.alt = f.name;
            img.style.filter = f.css === 'none' ? 'none' : f.css;

            thumb.appendChild(img);

            const label = document.createElement('span');
            label.className = 'filter-label';
            label.textContent = f.name;

            item.appendChild(thumb);
            item.appendChild(label);

            item.addEventListener('click', () => {
                selectedFilterIndex = i;
                document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                applyPreviewFilter();
            });

            filterGrid.appendChild(item);
        });
    };

    /* ---------- Intensity slider ---------- */
    intensitySlider.addEventListener('input', (e) => {
        intensity = parseInt(e.target.value, 10);
        intensityReadout.textContent = intensity + '%';
        applyPreviewFilter();
    });

    /* ---------- Reset filter ---------- */
    resetFilterBtn.addEventListener('click', () => {
        selectedFilterIndex = 0;
        intensity = 100;
        intensitySlider.value = 100;
        intensityReadout.textContent = '100%';
        document.querySelectorAll('.filter-item').forEach((el, i) => {
            el.classList.toggle('active', i === 0);
        });
        applyPreviewFilter();
    });

    /* ---------- Reset all ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        developAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        filteredBlob = null;
        filteredDataUrl = null;
        selectedFilterIndex = 0;
        intensity = 100;
        busy = false;
        applyBtn.disabled = true;
        developProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    editAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Upload interactions ---------- */
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#8b5cf6';
        uploadArea.style.background = '#f5f0ff';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#d9d6fe';
        uploadArea.style.background = '#fcfaff';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d9d6fe';
        uploadArea.style.background = '#fcfaff';
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.setAttribute('tabindex', '0');
    uploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
        fileInput.value = '';
    });

    /* ---------- UNIQUE develop animation ---------- */
    const STAGES = [
        { until: 12, text: 'Preparing Image...' },
        { until: 35, text: 'Applying Filter...' },
        { until: 60, text: 'Developing Colors...' },
        { until: 85, text: 'Enhancing Details...' },
        { until: 100, text: 'Complete!' }
    ];

    const animateDevelop = (duration = 2400) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        glowLine.classList.add('active');

        // Animate the stage image from grayscale → filtered look
        const f = FILTERS[selectedFilterIndex];
        const targetFilter = (f.name === 'Original' || intensity === 0)
            ? 'none'
            : interpolateFilter(f.css, intensity / 100);

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            developProgressFill.style.width = percent + '%';
            developCountValue.textContent = percent;

            // Blend stage image from grayscale to target filter
            const blend = Math.min(p * 1.4, 1); // reaches full at ~70% of animation
            // We approximate by applying grayscale reduction + filter at full
            if (blend < 1) {
                developStageImg.style.filter =
                    `grayscale(${(1 - blend) * 100}%) brightness(${0.9 + blend * 0.1})`;
            } else {
                developStageImg.style.filter = targetFilter === 'none' ? 'none' : targetFilter;
            }

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                developStatus.style.opacity = '0';
                setTimeout(() => {
                    developStatus.textContent = stage.text;
                    developStatus.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else {
                glowLine.classList.remove('active');
                resolve();
            }
        };
        requestAnimationFrame(step);
    });

    /* ---------- Apply button ---------- */
    applyBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        busy = true;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
        developAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        developStageImg.src = originalImage.src;
        developStageImg.style.filter = 'grayscale(100%) brightness(0.9)';
        developProgressFill.style.width = '0%';
        developCountValue.textContent = '0';
        developStatus.textContent = 'Preparing Image...';
        developStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            const animationPromise = animateDevelop(2400);
            const renderPromise = renderFilteredImage();
            const [, result] = await Promise.all([animationPromise, renderPromise]);

            if (!result) throw new Error('Render failed');

            filteredBlob = result.blob;
            filteredDataUrl = result.dataUrl;

            developAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                applyBtn.innerHTML = '<i class="fas fa-check"></i> Applied!';
                applyBtn.disabled = false;

                populateResult(timeTaken);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            developAnimation.classList.add('hidden');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-check"></i> Apply Filter &amp; Download';
            busy = false;
            alert('Filter failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time) => {
        resultOriginalImg.src = originalImage.src;
        resultFilteredImg.src = filteredDataUrl;
        compareBefore.src = originalImage.src;
        compareAfter.src = filteredDataUrl;

        const f = FILTERS[selectedFilterIndex];
        detailFilename.textContent = currentFile.name.replace(/\.[^/.]+$/, '') +
            (outputFormat === 'image/png' ? '_filtered.png' : '_filtered.jpg');
        detailFilter.textContent = `${f.name} (${intensity}%)`;
        detailResolution.textContent = `${originalWidth} × ${originalHeight}`;
        detailSize.textContent = formatSize(filteredBlob.size);
        processTime.textContent = time + 's';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadBtn.disabled = false;

        setSliderPosition(50);
    };

    /* ---------- Before/After slider ---------- */
    const setSliderPosition = (pct) => {
        pct = Math.max(0, Math.min(100, pct));
        compareAfterClip.style.width = pct + '%';
        compareHandle.style.left = pct + '%';
    };

    const isDragging = { value: false };
    const onPointerDown = (e) => {
        isDragging.value = true;
        e.preventDefault();
        handleMove(e);
    };
    const onPointerMove = (e) => {
        if (!isDragging.value) return;
        handleMove(e);
    };
    const onPointerUp = () => { isDragging.value = false; };

    const handleMove = (e) => {
        const rect = compareSlider.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        setSliderPosition((x / rect.width) * 100);
    };

    compareSlider.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    compareSlider.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    /* ---------- Download ---------- */
    downloadBtn.addEventListener('click', () => {
        if (!filteredBlob) return;
        const url = URL.createObjectURL(filteredBlob);
        const a = document.createElement('a');
        a.href = url;
        const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
        a.download = currentFile.name.replace(/\.[^/.]+$/, '') + '_filtered.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📥 Download started!');
    });

    /* ---------- Ripple ---------- */
    document.querySelectorAll('.btn-primary').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position:absolute; left:${e.clientX - rect.left}px; top:${e.clientY - rect.top}px;
                width:10px; height:10px; background:rgba(255,255,255,0.5);
                border-radius:50%; transform:translate(-50%,-50%) scale(0);
                animation:ripple 0.6s ease-out; pointer-events:none;`;
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 700);
        });
    });

    /* ---------- FAQ accordion ---------- */
    document.querySelectorAll('.faq-item').forEach((item) => {
        const q = item.querySelector('.faq-question');
        q.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item.open').forEach((o) => o.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });
});