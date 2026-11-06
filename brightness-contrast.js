/* ============================================================
   CrafterTools · Brightness & Contrast
   Vanilla JS — Canvas API, fully offline
   UNIQUE animation: light sweep + ambient orbs + soft zoom
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const previewSkeleton = document.getElementById('previewSkeleton');
    const previewContent = document.getElementById('previewContent');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewType = document.getElementById('previewType');
    const resetBtn = document.getElementById('resetBtn');
    const glowFrame = document.getElementById('glowFrame');
    const bcBadge = document.getElementById('bcBadge');

    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    const brightnessReadout = document.getElementById('brightnessReadout');
    const contrastReadout = document.getElementById('contrastReadout');
    const presetRow = document.getElementById('presetRow');
    const resetSlidersBtn = document.getElementById('resetSlidersBtn');

    const applyBtn = document.getElementById('applyBtn');
    const adjustAnimation = document.getElementById('adjustAnimation');
    const adjustStageImg = document.getElementById('adjustStageImg');
    const adjustStageWrap = document.getElementById('adjustStageWrap');
    const lightSweep = document.getElementById('lightSweep');
    const adjustStatus = document.getElementById('adjustStatus');
    const adjustCountValue = document.getElementById('adjustCountValue');
    const adjustProgressFill = document.getElementById('adjustProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultEnhancedImg = document.getElementById('resultEnhancedImg');
    const detailBrightness = document.getElementById('detailBrightness');
    const detailContrast = document.getElementById('detailContrast');
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
    let enhancedBlob = null, enhancedDataUrl = null;
    let currentBrightness = 0;
    let currentContrast = 0;
    let busy = false;
    let outputFormat = 'image/png';

    const previewCtx = previewCanvas.getContext('2d');

    /* ---------- Utils ---------- */
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const showToast = (msg) => {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    const formatSigned = (v) => (v > 0 ? '+' + v : '' + v);

    /* ---------- Core pixel manipulation ---------- */
    /**
     * Applies brightness and contrast to raw ImageData.
     * brightness: -100..+100  →  add offset to each channel
     * contrast:   -100..+100  →  use contrast factor around 128
     */
    const applyBrightnessContrast = (imgData, brightness, contrast) => {
        const data = imgData.data;
        const b = (brightness / 100) * 255;                 // brightness offset
        const cRaw = (contrast / 100) + 1;                   // 0..2 range
        const c = cRaw * cRaw;                                // stronger curve
        const intercept = 128 * (1 - c);

        for (let i = 0; i < data.length; i += 4) {
            data[i]     = Math.max(0, Math.min(255, c * data[i]     + intercept + b));
            data[i + 1] = Math.max(0, Math.min(255, c * data[i + 1] + intercept + b));
            data[i + 2] = Math.max(0, Math.min(255, c * data[i + 2] + intercept + b));
            // alpha untouched
        }
        return imgData;
    };

    /* ---------- Live preview ---------- */
    const updateLivePreview = () => {
        if (!originalImage) return;

        const size = 100;
        const ratio = Math.min(size / originalWidth, size / originalHeight);
        const w = Math.max(1, Math.round(originalWidth * ratio));
        const h = Math.max(1, Math.round(originalHeight * ratio));
        previewCanvas.width = w;
        previewCanvas.height = h;

        // Draw source into a temp canvas at full res to preserve quality
        const src = document.createElement('canvas');
        src.width = originalWidth;
        src.height = originalHeight;
        const sctx = src.getContext('2d');
        sctx.drawImage(originalImage, 0, 0);

        if (currentBrightness !== 0 || currentContrast !== 0) {
            const imgData = sctx.getImageData(0, 0, src.width, src.height);
            applyBrightnessContrast(imgData, currentBrightness, currentContrast);
            sctx.putImageData(imgData, 0, 0);
        }

        previewCtx.clearRect(0, 0, w, h);
        previewCtx.drawImage(src, 0, 0, w, h);

        // Glow frame if any adjustment active
        const active = currentBrightness !== 0 || currentContrast !== 0;
        glowFrame.classList.toggle('active', active);

        // Badge
        bcBadge.textContent = `B: ${formatSigned(currentBrightness)} · C: ${formatSigned(currentContrast)}`;
    };

    /* ---------- Upload ---------- */
    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.match('image/png|image/jpeg|image/webp')) {
            alert('Please select a PNG, JPG, JPEG or WEBP image.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File too large. Max 20MB.');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;
        enhancedBlob = null;
        enhancedDataUrl = null;
        currentBrightness = 0;
        currentContrast = 0;
        outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        editorSection.classList.remove('hidden');
        previewSkeleton.classList.remove('hidden');
        previewContent.classList.add('hidden');
        applyBtn.disabled = true;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        adjustAnimation.classList.add('hidden');
        applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Changes';

        brightnessSlider.value = 0;
        contrastSlider.value = 0;
        brightnessReadout.textContent = '0';
        contrastReadout.textContent = '0';
        glowFrame.classList.remove('active');
        bcBadge.textContent = 'B: 0 · C: 0';
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                originalWidth = img.width;
                originalHeight = img.height;

                previewName.textContent = file.name;
                previewSize.textContent = formatSize(file.size);
                previewDimensions.textContent = `${img.width} × ${img.height}`;
                previewType.textContent = file.type.split('/')[1].toUpperCase();

                updateLivePreview();

                previewSkeleton.classList.add('hidden');
                previewContent.classList.remove('hidden');
                applyBtn.disabled = false;
            };
            img.onerror = () => {
                previewSkeleton.classList.add('hidden');
                alert('Could not load image.');
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            previewSkeleton.classList.add('hidden');
            alert('Could not read file.');
        };
        reader.readAsDataURL(file);
    };

    /* Drag & drop */
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

    /* ---------- Sliders ---------- */
    brightnessSlider.addEventListener('input', (e) => {
        currentBrightness = parseInt(e.target.value, 10);
        brightnessReadout.textContent = formatSigned(currentBrightness);
        updateLivePreview();
    });
    contrastSlider.addEventListener('input', (e) => {
        currentContrast = parseInt(e.target.value, 10);
        contrastReadout.textContent = formatSigned(currentContrast);
        updateLivePreview();
    });

    /* Presets */
    presetRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip[data-bright]');
        if (!chip) return;
        const b = parseInt(chip.dataset.bright, 10);
        const c = parseInt(chip.dataset.contrast, 10);
        brightnessSlider.value = b;
        contrastSlider.value = c;
        currentBrightness = b;
        currentContrast = c;
        brightnessReadout.textContent = formatSigned(b);
        contrastReadout.textContent = formatSigned(c);
        updateLivePreview();
        document.querySelectorAll('.chip').forEach(c2 => c2.classList.remove('active'));
        chip.classList.add('active');
    });

    /* Reset sliders */
    resetSlidersBtn.addEventListener('click', () => {
        brightnessSlider.value = 0;
        contrastSlider.value = 0;
        currentBrightness = 0;
        currentContrast = 0;
        brightnessReadout.textContent = '0';
        contrastReadout.textContent = '0';
        updateLivePreview();
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    });

    /* ---------- Reset ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        previewSkeleton.classList.add('hidden');
        previewContent.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        adjustAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        enhancedBlob = null;
        enhancedDataUrl = null;
        currentBrightness = 0;
        currentContrast = 0;
        busy = false;
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Changes';
        glowFrame.classList.remove('active');
        adjustProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    editAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Render final full-res result ---------- */
    const renderEnhanced = (img, b, c) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        if (b !== 0 || c !== 0) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applyBrightnessContrast(imgData, b, c);
            ctx.putImageData(imgData, 0, 0);
        }
        return canvas;
    };

    /* ---------- UNIQUE ANIMATION ---------- */
    const STAGES = [
        { until: 14, text: 'Loading Image...' },
        { until: 34, text: 'Adjusting Brightness...' },
        { until: 56, text: 'Optimizing Contrast...' },
        { until: 78, text: 'Rendering Preview...' },
        { until: 95, text: 'Applying Enhancements...' },
        { until: 100, text: 'Done!' }
    ];

    const animateAdjust = (targetBrightness, targetContrast, duration = 2400) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        // Start light sweep + glow
        lightSweep.classList.add('active');
        adjustStageWrap.classList.add('glowing');

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            adjustProgressFill.style.width = percent + '%';
            adjustCountValue.textContent = percent;

            // Gradually apply brightness + contrast to the stage image via CSS
            const bNow = (targetBrightness / 100) * p * 255;
            const cNow = 1 + (targetContrast / 100) * p;
            adjustStageImg.style.filter = `brightness(${1 + (targetBrightness / 100) * p}) contrast(${cNow})`;

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                adjustStatus.style.opacity = '0';
                setTimeout(() => {
                    adjustStatus.textContent = stage.text;
                    adjustStatus.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else {
                lightSweep.classList.remove('active');
                adjustStageWrap.classList.remove('glowing');
                resolve();
            }
        };
        requestAnimationFrame(step);
    });

    /* ---------- Main apply handler ---------- */
    applyBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        if (currentBrightness === 0 && currentContrast === 0) {
            showToast('⚠️ Adjust brightness or contrast first');
            return;
        }
        busy = true;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
        adjustAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        adjustStageImg.src = originalImage.src;
        adjustStageImg.style.filter = 'brightness(1) contrast(1)';
        adjustProgressFill.style.width = '0%';
        adjustCountValue.textContent = '0';
        adjustStatus.textContent = 'Loading Image...';
        adjustStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            const animationPromise = animateAdjust(currentBrightness, currentContrast, 2400);
            const renderPromise = new Promise((resolve) => {
                requestAnimationFrame(() => {
                    const canvas = renderEnhanced(originalImage, currentBrightness, currentContrast);
                    const quality = outputFormat === 'image/jpeg' ? 0.92 : undefined;
                    canvas.toBlob((blob) => {
                        if (!blob) return resolve(null);
                        resolve({ blob, dataUrl: canvas.toDataURL(outputFormat, quality) });
                    }, outputFormat, quality);
                });
            });

            const [, result] = await Promise.all([animationPromise, renderPromise]);
            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            if (!result) throw new Error('Render failed');

            enhancedBlob = result.blob;
            enhancedDataUrl = result.dataUrl;

            adjustAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                applyBtn.innerHTML = '<i class="fas fa-check"></i> Applied!';
                applyBtn.disabled = true;

                populateResult(timeTaken);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            adjustAnimation.classList.add('hidden');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Changes';
            busy = false;
            alert('Adjustment failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time) => {
        resultOriginalImg.src = originalImage.src;
        resultEnhancedImg.src = enhancedDataUrl;
        compareBefore.src = originalImage.src;
        compareAfter.src = enhancedDataUrl;

        detailBrightness.textContent = formatSigned(currentBrightness);
        detailContrast.textContent = formatSigned(currentContrast);
        detailResolution.textContent = `${originalWidth} × ${originalHeight}`;
        detailSize.textContent = formatSize(enhancedBlob.size);
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
        if (!enhancedBlob) return;
        const url = URL.createObjectURL(enhancedBlob);
        const a = document.createElement('a');
        const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
        a.href = url;
        a.download = `enhanced_${currentFile.name.replace(/\.[^/.]+$/, '')}.${ext}`;
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