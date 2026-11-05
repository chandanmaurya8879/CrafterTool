/* ============================================================
   CrafterTools · Blur Image
   Vanilla JS — Canvas API, fully offline
   NEW animation: glowing border + live blur preview + progress bar
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const previewSkeleton = document.getElementById('previewSkeleton');
    const previewContent = document.getElementById('previewContent');
    const previewImage = document.getElementById('previewImage');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewType = document.getElementById('previewType');
    const resetBtn = document.getElementById('resetBtn');
    const glowBorder = document.getElementById('glowBorder');
    const blurValueBadge = document.getElementById('blurValueBadge');

    const blurSlider = document.getElementById('blurSlider');
    const blurReadout = document.getElementById('blurReadout');
    const presetRow = document.getElementById('presetRow');

    const applyBtn = document.getElementById('applyBtn');
    const blurAnimation = document.getElementById('blurAnimation');
    const blurStageImg = document.getElementById('blurStageImg');
    const blurStatus = document.getElementById('blurStatus');
    const blurCountValue = document.getElementById('blurCountValue');
    const blurProgressFill = document.getElementById('blurProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultBlurredImg = document.getElementById('resultBlurredImg');
    const detailBlur = document.getElementById('detailBlur');
    const detailDimensions = document.getElementById('detailDimensions');
    const detailFormat = document.getElementById('detailFormat');
    const detailSize = document.getElementById('detailSize');
    const processTime = document.getElementById('processTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const blurAnotherBtn = document.getElementById('blurAnotherBtn');

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
    let blurredBlob = null, blurredDataUrl = null;
    let currentBlur = 0;
    let busy = false;
    let outputFormat = 'image/png';

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
        blurredBlob = null;
        blurredDataUrl = null;
        currentBlur = 0;
        outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        editorSection.classList.remove('hidden');
        previewSkeleton.classList.remove('hidden');
        previewContent.classList.add('hidden');
        applyBtn.disabled = true;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        blurAnimation.classList.add('hidden');
        applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Blur';

        // Reset slider
        blurSlider.value = 0;
        blurReadout.textContent = '0px';
        blurValueBadge.textContent = '0px';
        previewImage.style.filter = 'blur(0px)';
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));

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
                previewType.textContent = file.type.split('/')[1].toUpperCase();

                previewSkeleton.classList.add('hidden');
                previewContent.classList.remove('hidden');
                applyBtn.disabled = false;

                // Toggle glow border on preview when slider > 0
                updateGlowBorder();
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

    /* ---------- Live preview on slider ---------- */
    const updateGlowBorder = () => {
        if (currentBlur > 0) glowBorder.classList.add('active');
        else glowBorder.classList.remove('active');
    };

    blurSlider.addEventListener('input', (e) => {
        currentBlur = parseInt(e.target.value, 10);
        blurReadout.textContent = currentBlur + 'px';
        blurValueBadge.textContent = currentBlur + 'px';
        previewImage.style.filter = `blur(${currentBlur}px)`;
        updateGlowBorder();

        // Update preset highlight
        document.querySelectorAll('.chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.blur, 10) === currentBlur);
        });
    });

    /* Preset chips */
    presetRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip[data-blur]');
        if (!chip) return;
        const val = parseInt(chip.dataset.blur, 10);
        blurSlider.value = val;
        currentBlur = val;
        blurReadout.textContent = val + 'px';
        blurValueBadge.textContent = val + 'px';
        previewImage.style.filter = `blur(${val}px)`;
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        updateGlowBorder();
    });

    /* ---------- Reset ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        previewSkeleton.classList.add('hidden');
        previewContent.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        blurAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        blurredBlob = null;
        blurredDataUrl = null;
        currentBlur = 0;
        busy = false;
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Blur';
        glowBorder.classList.remove('active');
        blurProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    blurAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Blur via Canvas ---------- */
    const applyBlurToCanvas = (img, blurPx) => new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // White background if converting to JPEG
        if (outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        ctx.filter = 'none';

        const quality = outputFormat === 'image/jpeg' ? 0.92 : undefined;
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Blur failed'));
            resolve({ blob, dataUrl: canvas.toDataURL(outputFormat, quality) });
        }, outputFormat, quality);
    });

    /* ---------- NEW: Progress-bar animation with glow ---------- */
    const STAGES = [
        { until: 15, text: 'Loading Image...' },
        { until: 45, text: 'Applying Blur...' },
        { until: 70, text: 'Rendering Preview...' },
        { until: 92, text: 'Almost Ready...' },
        { until: 100, text: 'Done!' }
    ];

    const animateBlurProgress = (targetBlur, duration = 2200) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            // Progress bar
            blurProgressFill.style.width = percent + '%';

            // Counter counts up smoothly to target blur value
            const currentCount = Math.round(p * targetBlur);
            blurCountValue.textContent = currentCount;

            // Apply live blur to stage image — this is the "gradually blurrier" effect
            blurStageImg.style.filter = `blur(${currentCount}px)`;

            // Status text
            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                blurStatus.style.opacity = '0';
                setTimeout(() => {
                    blurStatus.textContent = stage.text;
                    blurStatus.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else resolve();
        };
        requestAnimationFrame(step);
    });

    /* ---------- Main apply handler ---------- */
    applyBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        if (currentBlur === 0) {
            showToast('⚠️ Increase blur above 0px first');
            return;
        }
        busy = true;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
        blurAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        // Setup animation stage
        blurStageImg.src = originalImage.src;
        blurStageImg.style.filter = 'blur(0px)';
        blurProgressFill.style.width = '0%';
        blurCountValue.textContent = '0';
        blurStatus.textContent = 'Loading Image...';
        blurStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            const animationPromise = animateBlurProgress(currentBlur, 2200);
            const blurPromise = applyBlurToCanvas(originalImage, currentBlur);
            const [, result] = await Promise.all([animationPromise, blurPromise]);

            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            blurredBlob = result.blob;
            blurredDataUrl = result.dataUrl;

            blurAnimation.classList.add('hidden');
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
            blurAnimation.classList.add('hidden');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-magic"></i> Apply Blur';
            busy = false;
            alert('Blur failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time) => {
        resultOriginalImg.src = originalImage.src;
        resultBlurredImg.src = blurredDataUrl;
        compareBefore.src = originalImage.src;
        compareAfter.src = blurredDataUrl;

        detailBlur.textContent = currentBlur + 'px';
        detailDimensions.textContent = `${originalWidth} × ${originalHeight}`;
        detailFormat.textContent = outputFormat === 'image/png' ? 'PNG' : 'JPG';
        detailSize.textContent = formatSize(blurredBlob.size);
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
        if (!blurredBlob) return;
        const url = URL.createObjectURL(blurredBlob);
        const a = document.createElement('a');
        const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
        a.href = url;
        a.download = `blurred_${currentFile.name.replace(/\.[^/.]+$/, '')}.${ext}`;
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