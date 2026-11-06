/* ============================================================
   CrafterTools · Image Flip
   Vanilla JS — Canvas API, fully offline
   Horizontal / Vertical / Both flip modes
   UNIQUE animation: mirror glint (light sweep + flip axis pulse)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewFlip = document.getElementById('previewFlip');
    const resetBtn = document.getElementById('resetBtn');

    const previewImage = document.getElementById('previewImage');
    const glowBorder = document.getElementById('glowBorder');
    const flipNameBadge = document.getElementById('flipNameBadge');
    const mirrorGlint = document.getElementById('mirrorGlint');

    const flipHBtn = document.getElementById('flipHBtn');
    const flipVBtn = document.getElementById('flipVBtn');
    const flipBothBtn = document.getElementById('flipBothBtn');
    const resetFlipBtn = document.getElementById('resetFlipBtn');

    const applyBtn = document.getElementById('applyBtn');
    const flipAnimation = document.getElementById('flipAnimation');
    const glowLine = document.getElementById('glowLine');
    const flipStageImg = document.getElementById('flipStageImg');
    const glintSweep = document.getElementById('glintSweep');
    const flipAxis = document.getElementById('flipAxis');
    const flipStatus = document.getElementById('flipStatus');
    const flipCountValue = document.getElementById('flipCountValue');
    const flipProgressFill = document.getElementById('flipProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultFlippedImg = document.getElementById('resultFlippedImg');
    const detailFilename = document.getElementById('detailFilename');
    const detailFlip = document.getElementById('detailFlip');
    const detailResolution = document.getElementById('detailResolution');
    const detailSize = document.getElementById('detailSize');
    const processTime = document.getElementById('processTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const editAnotherBtn = document.getElementById('editAnotherBtn');

    const toast = document.getElementById('toast');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let outputFormat = 'image/png';
    let flipMode = 'none'; // 'none' | 'horizontal' | 'vertical' | 'both'
    let flippedBlob = null, flippedDataUrl = null;
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
        flipMode = 'none';
        flippedBlob = null;
        flippedDataUrl = null;

        editorSection.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        flipAnimation.classList.add('hidden');
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-download"></i> Apply Flip &amp; Download';

        // Reset flip buttons
        [flipHBtn, flipVBtn, flipBothBtn].forEach(b => b.classList.remove('active'));
        glowBorder.classList.remove('active');

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

                updateFlipLabel();
                applyBtn.disabled = false;
            };
            img.onerror = () => alert('Could not load image.');
            img.src = e.target.result;
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

    /* ---------- Flip mode selection ---------- */
    const updateFlipLabel = () => {
        const labels = {
            'none': 'None',
            'horizontal': 'Horizontal',
            'vertical': 'Vertical',
            'both': 'Both (180°)'
        };
        previewFlip.textContent = `Flip: ${labels[flipMode]}`;
        flipNameBadge.textContent = labels[flipMode] === 'None' ? 'Original' : `Flipped · ${labels[flipMode]}`;

        if (flipMode === 'none') {
            glowBorder.classList.remove('active');
        } else {
            glowBorder.classList.add('active');
        }
    };

    const triggerGlint = () => {
        mirrorGlint.classList.remove('active');
        void mirrorGlint.offsetWidth;
        mirrorGlint.classList.add('active');
        setTimeout(() => mirrorGlint.classList.remove('active'), 800);
    };

    const applyPreviewFlip = () => {
        let transform = '';
        if (flipMode === 'horizontal') {
            transform = 'scaleX(-1)';
        } else if (flipMode === 'vertical') {
            transform = 'scaleY(-1)';
        } else if (flipMode === 'both') {
            transform = 'scaleX(-1) scaleY(-1)';
        } else {
            transform = 'scaleX(1) scaleY(1)';
        }
        previewImage.style.transform = transform;
    };

    const setFlipMode = (mode) => {
        flipMode = mode;
        [flipHBtn, flipVBtn, flipBothBtn].forEach(b => b.classList.remove('active'));

        if (mode === 'horizontal') flipHBtn.classList.add('active');
        else if (mode === 'vertical') flipVBtn.classList.add('active');
        else if (mode === 'both') flipBothBtn.classList.add('active');

        applyPreviewFlip();
        updateFlipLabel();
        if (mode !== 'none') triggerGlint();
    };

    flipHBtn.addEventListener('click', () => {
        setFlipMode(flipMode === 'horizontal' ? 'none' : 'horizontal');
    });
    flipVBtn.addEventListener('click', () => {
        setFlipMode(flipMode === 'vertical' ? 'none' : 'vertical');
    });
    flipBothBtn.addEventListener('click', () => {
        setFlipMode(flipMode === 'both' ? 'none' : 'both');
    });
    resetFlipBtn.addEventListener('click', () => {
        setFlipMode('none');
    });

    /* ---------- Reset all ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        flipAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        flippedBlob = null;
        flippedDataUrl = null;
        flipMode = 'none';
        busy = false;
        applyBtn.disabled = true;
        flipProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    editAnotherBtn.addEventListener('click', resetAll);

    /* ---------- UNIQUE mirror glint animation ---------- */
    const STAGES = [
        { until: 15, text: 'Preparing Image...' },
        { until: 40, text: 'Mirroring Pixels...' },
        { until: 65, text: 'Reflecting Light...' },
        { until: 88, text: 'Finalizing...' },
        { until: 100, text: 'Flipped!' }
    ];

    const animateFlip = (duration = 2400) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        glowLine.classList.add('active');
        glintSweep.classList.remove('active');
        flipAxis.classList.remove('active', 'vertical', 'both');

        // Set axis class based on flip mode
        if (flipMode === 'horizontal') {
            flipAxis.classList.add('active');
        } else if (flipMode === 'vertical') {
            flipAxis.classList.add('active', 'vertical');
        } else if (flipMode === 'both') {
            flipAxis.classList.add('active', 'both');
        }

        // Set initial image transform (start unflipped)
        flipStageImg.style.transform = 'scaleX(1) scaleY(1)';

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            flipProgressFill.style.width = percent + '%';
            flipCountValue.textContent = percent;

            // Animate the stage image towards the target flip
            // Use 0.4s ease-in-out timing for the flip
            const flipProgress = Math.min(p / 0.4, 1); // First 40% of progress
            let scaleX = 1, scaleY = 1;

            if (flipMode === 'horizontal' || flipMode === 'both') {
                scaleX = 1 - 2 * flipProgress; // 1 → -1
            }
            if (flipMode === 'vertical' || flipMode === 'both') {
                scaleY = 1 - 2 * flipProgress; // 1 → -1
            }
            flipStageImg.style.transform = `scaleX(${scaleX}) scaleY(${scaleY})`;

            // Trigger glint sweep at 40%
            if (percent >= 40 && !glintSweep.classList.contains('active')) {
                glintSweep.classList.add('active');
            }

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                flipStatus.style.opacity = '0';
                setTimeout(() => {
                    flipStatus.textContent = stage.text;
                    flipStatus.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else {
                glowLine.classList.remove('active');
                glintSweep.classList.remove('active');
                flipAxis.classList.remove('active', 'vertical', 'both');
                resolve();
            }
        };
        requestAnimationFrame(step);
    });

    /* ---------- Render final image ---------- */
    const renderFlippedImage = () => new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');

        // Apply transform based on flip mode
        ctx.save();

        if (flipMode === 'horizontal') {
            ctx.translate(originalWidth, 0);
            ctx.scale(-1, 1);
        } else if (flipMode === 'vertical') {
            ctx.translate(0, originalHeight);
            ctx.scale(1, -1);
        } else if (flipMode === 'both') {
            ctx.translate(originalWidth, originalHeight);
            ctx.scale(-1, -1);
        }

        if (outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, originalWidth, originalHeight);
        }

        ctx.drawImage(originalImage, 0, 0);
        ctx.restore();

        const quality = outputFormat === 'image/jpeg' ? 0.92 : undefined;
        canvas.toBlob((blob) => {
            if (!blob) return resolve(null);
            resolve({ blob, dataUrl: canvas.toDataURL(outputFormat, quality) });
        }, outputFormat, quality);
    });

    /* ---------- Apply ---------- */
    applyBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        if (flipMode === 'none') {
            showToast('⚠️ Choose a flip direction first');
            return;
        }
        busy = true;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
        flipAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        flipStageImg.src = originalImage.src;
        flipProgressFill.style.width = '0%';
        flipCountValue.textContent = '0';
        flipStatus.textContent = 'Preparing Image...';
        flipStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            const animationPromise = animateFlip(2400);
            const renderPromise = renderFlippedImage();
            const [, result] = await Promise.all([animationPromise, renderPromise]);

            if (!result) throw new Error('Render failed');

            flippedBlob = result.blob;
            flippedDataUrl = result.dataUrl;

            flipAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                applyBtn.innerHTML = '<i class="fas fa-check"></i> Flipped!';
                applyBtn.disabled = false;

                populateResult(timeTaken);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            flipAnimation.classList.add('hidden');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-download"></i> Apply Flip &amp; Download';
            busy = false;
            alert('Flip failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time) => {
        resultOriginalImg.src = originalImage.src;
        resultFlippedImg.src = flippedDataUrl;

        const labels = {
            'horizontal': 'Horizontal',
            'vertical': 'Vertical',
            'both': 'Both (180°)'
        };

        detailFilename.textContent = currentFile.name.replace(/\.[^/.]+$/, '') +
            (outputFormat === 'image/png' ? '_flipped.png' : '_flipped.jpg');
        detailFlip.textContent = labels[flipMode] || 'None';
        detailResolution.textContent = `${originalWidth} × ${originalHeight}`;
        detailSize.textContent = formatSize(flippedBlob.size);
        processTime.textContent = time + 's';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadBtn.disabled = false;
    };

    /* ---------- Download ---------- */
    downloadBtn.addEventListener('click', () => {
        if (!flippedBlob) return;
        const url = URL.createObjectURL(flippedBlob);
        const a = document.createElement('a');
        a.href = url;
        const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
        a.download = currentFile.name.replace(/\.[^/.]+$/, '') + '_flipped.' + ext;
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