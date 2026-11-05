/* ============================================================
   CrafterTools · PNG to WEBP Converter
   Vanilla JS — Canvas API, fully offline
   UNIQUE animation: pixel grid transformation + glowing line
   Transparency-aware: PNG alpha preserved in WEBP output
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
    const transparencyNotice = document.getElementById('transparencyNotice');
    const transparencyText = document.getElementById('transparencyText');

    const qualitySlider = document.getElementById('qualitySlider');
    const qualityReadout = document.getElementById('qualityReadout');
    const presetRow = document.getElementById('presetRow');

    const convertBtn = document.getElementById('convertBtn');
    const webpAnimation = document.getElementById('webpAnimation');
    const glowLine = document.getElementById('glowLine');
    const pixelStageImg = document.getElementById('pixelStageImg');
    const pixelCanvas = document.getElementById('pixelCanvas');
    const webpStatus = document.getElementById('webpStatus');
    const webpCountValue = document.getElementById('webpCountValue');
    const webpProgressFill = document.getElementById('webpProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultWebpImg = document.getElementById('resultWebpImg');
    const detailFilename = document.getElementById('detailFilename');
    const detailOrigSize = document.getElementById('detailOrigSize');
    const detailWebpSize = document.getElementById('detailWebpSize');
    const detailSaved = document.getElementById('detailSaved');
    const detailResolution = document.getElementById('detailResolution');
    const processTime = document.getElementById('processTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const convertAnotherBtn = document.getElementById('convertAnotherBtn');

    const toast = document.getElementById('toast');

    const pixelCtx = pixelCanvas.getContext('2d');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let hasTransparency = false;
    let webpBlob = null, webpDataUrl = null;
    let currentQuality = 90;
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

    /* ---------- Detect transparency (PNG alpha channel) ---------- */
    const detectTransparency = (img) => {
        // Downsample to 64px for speed
        const c = document.createElement('canvas');
        const size = 64;
        c.width = size;
        c.height = size;
        const cx = c.getContext('2d');
        cx.drawImage(img, 0, 0, size, size);
        const data = cx.getImageData(0, 0, size, size).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) return true;
        }
        return false;
    };

    /* ---------- Upload ---------- */
    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.match('image/png')) {
            alert('Please select a PNG image.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File too large. Max 20MB.');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;
        webpBlob = null;
        webpDataUrl = null;

        editorSection.classList.remove('hidden');
        previewSkeleton.classList.remove('hidden');
        previewContent.classList.add('hidden');
        transparencyNotice.style.display = 'none';
        convertBtn.disabled = true;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        webpAnimation.classList.add('hidden');
        convertBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Convert to WEBP';

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
                previewType.textContent = 'PNG';

                // Detect transparency after image loads
                try {
                    hasTransparency = detectTransparency(img);
                } catch (err) {
                    hasTransparency = false;
                }

                // Show transparency notice
                transparencyNotice.style.display = 'flex';
                if (hasTransparency) {
                    transparencyNotice.classList.remove('no-alpha');
                    transparencyText.textContent = 'Transparency detected — alpha will be preserved in the WEBP output.';
                } else {
                    transparencyNotice.classList.add('no-alpha');
                    transparencyText.textContent = 'No transparency found — this PNG will convert cleanly to WEBP.';
                }

                previewSkeleton.classList.add('hidden');
                previewContent.classList.remove('hidden');
                convertBtn.disabled = false;
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

    /* ---------- Quality slider ---------- */
    qualitySlider.addEventListener('input', (e) => {
        currentQuality = parseInt(e.target.value, 10);
        qualityReadout.textContent = currentQuality + '%';
        document.querySelectorAll('.chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.quality, 10) === currentQuality);
        });
    });
    presetRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const q = parseInt(chip.dataset.quality, 10);
        qualitySlider.value = q;
        currentQuality = q;
        qualityReadout.textContent = q + '%';
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
        webpAnimation.classList.add('hidden');
        transparencyNotice.style.display = 'none';
        currentFile = null;
        originalImage = null;
        webpBlob = null;
        webpDataUrl = null;
        hasTransparency = false;
        busy = false;
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Convert to WEBP';
        webpProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    convertAnotherBtn.addEventListener('click', resetAll);

    /* ============================================================
       UNIQUE PIXEL TRANSFORMATION ANIMATION
       - Splits image into a grid of squares that scatter
       - Then smoothly reassemble back into full image
       ============================================================ */
    const drawPixelGrid = (progress) => {
        const w = pixelCanvas.width;
        const h = pixelCanvas.height;
        pixelCtx.clearRect(0, 0, w, h);

        const cols = 12;
        const rows = 12;
        const cellW = w / cols;
        const cellH = h / rows;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        const sctx = srcCanvas.getContext('2d');
        sctx.drawImage(originalImage, 0, 0, w, h);

        const eased = 1 - Math.pow(1 - progress, 3);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const sx = i * cellW;
                const sy = j * cellH;

                const seed = i * 31 + j * 17;
                const randX = ((seed % 13) - 6) * 6;
                const randY = ((seed % 7) - 3) * 6;
                const randRot = ((seed % 9) - 4) * 0.05;

                const offsetX = randX * (1 - eased);
                const offsetY = randY * (1 - eased);
                const rot = randRot * (1 - eased);
                const alpha = 0.3 + 0.7 * eased;

                pixelCtx.save();
                pixelCtx.globalAlpha = alpha;
                pixelCtx.translate(sx + cellW / 2 + offsetX, sy + cellH / 2 + offsetY);
                pixelCtx.rotate(rot);

                pixelCtx.drawImage(
                    srcCanvas,
                    sx, sy, cellW, cellH,
                    -cellW / 2 - 0.5, -cellH / 2 - 0.5,
                    cellW + 1, cellH + 1
                );
                pixelCtx.restore();
            }
        }
    };

    const initPixelCanvas = () => {
        const size = 360;
        pixelCanvas.width = size;
        pixelCanvas.height = size;
        pixelStageImg.style.opacity = '0';
    };

    const STAGES = [
        { until: 12, text: 'Loading PNG...' },
        { until: 32, text: 'Optimizing Image...' },
        { until: 55, text: 'Creating WEBP...' },
        { until: 78, text: 'Compressing...' },
        { until: 95, text: 'Rendering Preview...' },
        { until: 100, text: 'Conversion Complete!' }
    ];

    const animateConversion = (duration = 2600) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        initPixelCanvas();
        glowLine.classList.add('active');

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            webpProgressFill.style.width = percent + '%';
            webpCountValue.textContent = percent;

            if (p < 0.35) {
                const local = p / 0.35;
                drawPixelGrid(1 - local * 0.4);
            } else {
                const local = (p - 0.35) / 0.65;
                const eased = 1 - Math.pow(1 - local, 3);
                drawPixelGrid(0.6 + eased * 0.4);
            }

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                webpStatus.style.opacity = '0';
                setTimeout(() => {
                    webpStatus.textContent = stage.text;
                    webpStatus.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else {
                glowLine.classList.remove('active');
                pixelStageImg.style.opacity = '1';
                pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
                resolve();
            }
        };
        requestAnimationFrame(step);
    });

    /* ---------- Convert PNG → WEBP using Canvas ----------
       IMPORTANT: Do NOT fill a background. This preserves alpha. */
    const convertToWebp = (img, quality) => new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Leave canvas transparent — do NOT fill with white
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
            if (!blob) return resolve(null);
            // Verify it's actually WEBP (some old browsers fall back to PNG)
            if (blob.type !== 'image/webp') {
                return resolve(null);
            }
            resolve({
                blob,
                dataUrl: canvas.toDataURL('image/webp', quality / 100)
            });
        }, 'image/webp', quality / 100);
    });

    /* ---------- Main convert handler ---------- */
    convertBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        busy = true;

        convertBtn.disabled = true;
        convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
        webpAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        pixelStageImg.src = originalImage.src;
        pixelStageImg.style.opacity = '0';
        webpProgressFill.style.width = '0%';
        webpCountValue.textContent = '0';
        webpStatus.textContent = 'Loading PNG...';
        webpStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            const animationPromise = animateConversion(2600);
            const convertPromise = convertToWebp(originalImage, currentQuality);
            const [, result] = await Promise.all([animationPromise, convertPromise]);

            if (!result) throw new Error('WEBP encoding not supported in this browser. Try Chrome, Edge, or Firefox.');

            webpBlob = result.blob;
            webpDataUrl = result.dataUrl;

            webpAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                convertBtn.innerHTML = '<i class="fas fa-check"></i> Converted!';
                convertBtn.disabled = true;

                populateResult(timeTaken);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            webpAnimation.classList.add('hidden');
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Convert to WEBP';
            busy = false;
            alert(err.message || 'Conversion failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time) => {
        resultOriginalImg.src = originalImage.src;
        resultWebpImg.src = webpDataUrl;

        detailFilename.textContent = currentFile.name.replace(/\.[^/.]+$/, '') + '.webp';
        detailOrigSize.textContent = formatSize(originalFileSize);
        detailWebpSize.textContent = formatSize(webpBlob.size);

        const saved = originalFileSize - webpBlob.size;
        const savedPct = ((saved / originalFileSize) * 100).toFixed(1);
        if (saved > 0) {
            detailSaved.textContent = `${formatSize(saved)} (${savedPct}%)`;
        } else {
            detailSaved.textContent = 'No savings';
        }

        detailResolution.textContent = `${originalWidth} × ${originalHeight}`;
        processTime.textContent = time + 's';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadBtn.disabled = false;
    };

    /* ---------- Download ---------- */
    downloadBtn.addEventListener('click', () => {
        if (!webpBlob) return;
        const url = URL.createObjectURL(webpBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.name.replace(/\.[^/.]+$/, '') + '.webp';
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