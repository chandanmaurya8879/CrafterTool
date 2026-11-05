/* ============================================================
   CrafterTools · Sharpen Image
   Vanilla JS — Canvas API, fully offline
   UNIQUE animation: scan-line + sparkles + edge glow + live sharpen
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
    const edgeGlow = document.getElementById('edgeGlow');
    const sharpenValueBadge = document.getElementById('sharpenValueBadge');

    const sharpenSlider = document.getElementById('sharpenSlider');
    const sharpenReadout = document.getElementById('sharpenReadout');
    const presetRow = document.getElementById('presetRow');

    const applyBtn = document.getElementById('applyBtn');
    const sharpenAnimation = document.getElementById('sharpenAnimation');
    const sharpenStageImg = document.getElementById('sharpenStageImg');
    const scanLine = document.getElementById('scanLine');
    const edgeOverlay = document.getElementById('edgeOverlay');
    const sharpenStatus = document.getElementById('sharpenStatus');
    const sharpenCountValue = document.getElementById('sharpenCountValue');
    const sharpenProgressFill = document.getElementById('sharpenProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultSharpenedImg = document.getElementById('resultSharpenedImg');
    const detailResolution = document.getElementById('detailResolution');
    const detailFormat = document.getElementById('detailFormat');
    const detailSize = document.getElementById('detailSize');
    const detailSharpen = document.getElementById('detailSharpen');
    const processTime = document.getElementById('processTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const sharpenAnotherBtn = document.getElementById('sharpenAnotherBtn');

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
    let sharpenedBlob = null, sharpenedDataUrl = null;
    let currentSharpen = 0;
    let busy = false;
    let outputFormat = 'image/png';

    // Offscreen canvas for live preview + full-res processing
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

    /* ---------- Core sharpening algorithm (convolution) ---------- */
    /**
     * Applies an unsharp-mask-like convolution to a canvas context.
     * strength: 0 = no change, 1 = max sharpening (approximated by amount).
     */
    const sharpenImageData = (imgData, strength) => {
        if (strength <= 0) return imgData;

        const { data, width, height } = imgData;
        const src = new Uint8ClampedArray(data);
        const dst = data;

        // Unsharp mask kernel: center = 1 + 4*amount, neighbors = -amount
        // amount scaled by strength (0..1) → 0..0.8 for stability
        const amount = strength * 0.8;

        // 4-neighbor Laplacian sharpen
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const up    = ((y - 1) * width + x) * 4;
                const down  = ((y + 1) * width + x) * 4;
                const left  = (y * width + (x - 1)) * 4;
                const right = (y * width + (x + 1)) * 4;

                for (let c = 0; c < 3; c++) {
                    const center = src[idx + c];
                    const lap = center * (1 + 4 * amount)
                              - amount * (src[up + c] + src[down + c] + src[left + c] + src[right + c]);
                    dst[idx + c] = Math.max(0, Math.min(255, lap));
                }
            }
        }
        return imgData;
    };

    /* ---------- Render sharpened image to a canvas ---------- */
    const renderSharpened = (img, strength) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        if (strength > 0) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const sharpened = sharpenImageData(imgData, strength / 100);
            ctx.putImageData(sharpened, 0, 0);
        }
        return canvas;
    };

    /* ---------- Live preview on slider ---------- */
    const updateLivePreview = () => {
        if (!originalImage) return;

        // Downscale to fit preview thumb (100x100) but keep aspect
        const size = 100;
        const ratio = Math.min(size / originalWidth, size / originalHeight);
        const w = Math.max(1, Math.round(originalWidth * ratio));
        const h = Math.max(1, Math.round(originalHeight * ratio));
        previewCanvas.width = w;
        previewCanvas.height = h;

        const src = document.createElement('canvas');
        src.width = originalWidth;
        src.height = originalHeight;
        const sctx = src.getContext('2d');
        sctx.drawImage(originalImage, 0, 0);

        let drawSrc = src;
        if (currentSharpen > 0) {
            const imgData = sctx.getImageData(0, 0, src.width, src.height);
            sharpenImageData(imgData, currentSharpen / 100);
            sctx.putImageData(imgData, 0, 0);
        }

        previewCtx.clearRect(0, 0, w, h);
        previewCtx.drawImage(drawSrc, 0, 0, w, h);

        // Toggle edge glow based on sharpen value
        edgeGlow.classList.toggle('active', currentSharpen > 0);
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
        sharpenedBlob = null;
        sharpenedDataUrl = null;
        currentSharpen = 0;
        outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        editorSection.classList.remove('hidden');
        previewSkeleton.classList.remove('hidden');
        previewContent.classList.add('hidden');
        applyBtn.disabled = true;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        sharpenAnimation.classList.add('hidden');
        applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Sharpen';

        sharpenSlider.value = 0;
        sharpenReadout.textContent = '0%';
        sharpenValueBadge.textContent = '0%';
        edgeGlow.classList.remove('active');
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

    /* ---------- Slider ---------- */
    sharpenSlider.addEventListener('input', (e) => {
        currentSharpen = parseInt(e.target.value, 10);
        sharpenReadout.textContent = currentSharpen + '%';
        sharpenValueBadge.textContent = currentSharpen + '%';
        updateLivePreview();

        document.querySelectorAll('.chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.sharpen, 10) === currentSharpen);
        });
    });

    /* Presets */
    presetRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip[data-sharpen]');
        if (!chip) return;
        const val = parseInt(chip.dataset.sharpen, 10);
        sharpenSlider.value = val;
        currentSharpen = val;
        sharpenReadout.textContent = val + '%';
        sharpenValueBadge.textContent = val + '%';
        updateLivePreview();
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    });

    /* ---------- Reset ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        previewSkeleton.classList.add('hidden');
        previewContent.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        sharpenAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        sharpenedBlob = null;
        sharpenedDataUrl = null;
        currentSharpen = 0;
        busy = false;
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Sharpen';
        edgeGlow.classList.remove('active');
        sharpenProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    sharpenAnotherBtn.addEventListener('click', resetAll);

    /* ---------- UNIQUE ANIMATION ---------- */
    const STAGES = [
        { until: 15, text: 'Analyzing Image...' },
        { until: 38, text: 'Enhancing Details...' },
        { until: 62, text: 'Increasing Sharpness...' },
        { until: 84, text: 'Optimizing Quality...' },
        { until: 97, text: 'Rendering Final Image...' },
        { until: 100, text: 'Sharpen Complete!' }
    ];

    const animateSharpen = (targetStrength, duration = 2400) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        // Start slightly soft
        sharpenStageImg.style.filter = 'contrast(0.85) brightness(0.95)';
        scanLine.classList.add('active');
        edgeOverlay.classList.add('active');

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            // Progress bar
            sharpenProgressFill.style.width = percent + '%';

            // Counter counts up
            const currentCount = Math.round(p * targetStrength);
            sharpenCountValue.textContent = currentCount;

            // Gradually sharpen the stage image via CSS filter
            const contrast = 0.85 + (currentCount / 100) * 0.35;
            const brightness = 0.95 + (currentCount / 100) * 0.08;
            sharpenStageImg.style.filter = `contrast(${contrast}) brightness(${brightness})`;

            // Status text
            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                sharpenStatus.style.opacity = '0';
                setTimeout(() => {
                    sharpenStatus.textContent = stage.text;
                    sharpenStatus.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else {
                scanLine.classList.remove('active');
                edgeOverlay.classList.remove('active');
                resolve();
            }
        };
        requestAnimationFrame(step);
    });

    /* ---------- Main apply handler ---------- */
    applyBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        if (currentSharpen === 0) {
            showToast('⚠️ Increase sharpen strength above 0% first');
            return;
        }
        busy = true;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
        sharpenAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        sharpenStageImg.src = originalImage.src;
        sharpenStageImg.style.filter = 'contrast(0.85) brightness(0.95)';
        sharpenProgressFill.style.width = '0%';
        sharpenCountValue.textContent = '0';
        sharpenStatus.textContent = 'Analyzing Image...';
        sharpenStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            const animationPromise = animateSharpen(currentSharpen, 2400);
            const renderPromise = new Promise((resolve) => {
                // Defer heavy render slightly so animation runs first
                requestAnimationFrame(() => {
                    const canvas = renderSharpened(originalImage, currentSharpen);
                    const quality = outputFormat === 'image/jpeg' ? 0.92 : undefined;
                    canvas.toBlob((blob) => {
                        if (!blob) return resolve(null);
                        resolve({ blob, dataUrl: canvas.toDataURL(outputFormat, quality) });
                    }, outputFormat, quality);
                });
            });

            const [, result] = await Promise.all([animationPromise, renderPromise]);
            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            if (!result) throw new Error('Sharpen failed');

            sharpenedBlob = result.blob;
            sharpenedDataUrl = result.dataUrl;

            sharpenAnimation.classList.add('hidden');
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
            sharpenAnimation.classList.add('hidden');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Sharpen';
            busy = false;
            alert('Sharpen failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time) => {
        resultOriginalImg.src = originalImage.src;
        resultSharpenedImg.src = sharpenedDataUrl;
        compareBefore.src = originalImage.src;
        compareAfter.src = sharpenedDataUrl;

        detailResolution.textContent = `${originalWidth} × ${originalHeight}`;
        detailFormat.textContent = outputFormat === 'image/png' ? 'PNG' : 'JPG';
        detailSize.textContent = formatSize(sharpenedBlob.size);
        detailSharpen.textContent = currentSharpen + '%';
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
        if (!sharpenedBlob) return;
        const url = URL.createObjectURL(sharpenedBlob);
        const a = document.createElement('a');
        const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
        a.href = url;
        a.download = `sharpened_${currentFile.name.replace(/\.[^/.]+$/, '')}.${ext}`;
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