/* ============================================================
   CrafterTools · Image Crop
   Vanilla JS — Canvas API, interactive crop editor
   Unique animation: glowing crop + scanning border + zoom
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewCropDims = document.getElementById('previewCropDims');
    const resetBtn = document.getElementById('resetBtn');

    const aspectRow = document.getElementById('aspectRow');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const rotateLeftBtn = document.getElementById('rotateLeftBtn');
    const rotateRightBtn = document.getElementById('rotateRightBtn');
    const resetCropBtn = document.getElementById('resetCropBtn');

    const cropCanvas = document.getElementById('cropCanvas');
    const cropEditorWrap = document.getElementById('cropEditorWrap');
    const cropCanvasContainer = document.getElementById('cropCanvasContainer');
    const cropOverlay = document.getElementById('cropOverlay');
    const cropBox = document.getElementById('cropBox');

    const cropBtn = document.getElementById('cropBtn');
    const cropAnimation = document.getElementById('cropAnimation');
    const cropStageImg = document.getElementById('cropStageImg');
    const cropStageOutside = document.getElementById('cropStageOutside');
    const cropStatus = document.getElementById('cropStatus');
    const cropCountValue = document.getElementById('cropCountValue');
    const cropProgressFill = document.getElementById('cropProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultCroppedImg = document.getElementById('resultCroppedImg');
    const detailResolution = document.getElementById('detailResolution');
    const detailSize = document.getElementById('detailSize');
    const detailFormat = document.getElementById('detailFormat');
    const detailCropDims = document.getElementById('detailCropDims');
    const processTime = document.getElementById('processTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const cropAnotherBtn = document.getElementById('cropAnotherBtn');

    const toast = document.getElementById('toast');

    const ctx = cropCanvas.getContext('2d');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let croppedBlob = null, croppedDataUrl = null;
    let outputFormat = 'image/png';

    // Crop box state (in CSS px within canvas container)
    let cropState = { x: 0, y: 0, w: 0, h: 0 };
    let aspectRatio = null; // null = free
    let rotation = 0; // 0, 90, 180, 270
    let zoomLevel = 1;
    let displayWidth = 0, displayHeight = 0;
    let baseDisplayWidth = 0, baseDisplayHeight = 0;
    let busy = false;

    // Drag state
    let dragMode = null; // 'move' | 'tl'|'tr'|'bl'|'br'|'t'|'b'|'l'|'r' | null
    let dragStart = null;
    let cropStart = null;

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
        croppedBlob = null;
        croppedDataUrl = null;
        outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        rotation = 0;
        zoomLevel = 1;
        aspectRatio = null;

        editorSection.classList.remove('hidden');
        cropBtn.disabled = true;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        cropAnimation.classList.add('hidden');
        cropBtn.innerHTML = '<i class="fas fa-crop-alt"></i> Crop Image';

        // Reset chips
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.chip[data-ratio="free"]').classList.add('active');

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

                setupCanvas();
                cropBtn.disabled = false;
            };
            img.onerror = () => alert('Could not load image.');
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    /* ---------- Canvas setup ---------- */
    const setupCanvas = () => {
        // Compute displayed dimensions to fit within editor wrap
        const maxW = cropEditorWrap.clientWidth - 40;
        const maxH = Math.min(window.innerHeight - 200, 520);

        // Account for rotation: if rotated 90/270, swap effective dims
        const srcW = (rotation % 180 === 0) ? originalWidth : originalHeight;
        const srcH = (rotation % 180 === 0) ? originalHeight : originalWidth;

        let scale = Math.min(maxW / srcW, maxH / srcH);
        scale = Math.min(scale * zoomLevel, 3);
        baseDisplayWidth = Math.round(srcW * scale);
        baseDisplayHeight = Math.round(srcH * scale);
        displayWidth = baseDisplayWidth;
        displayHeight = baseDisplayHeight;

        cropCanvas.width = srcW * zoomLevel;
        cropCanvas.height = srcH * zoomLevel;
        cropCanvas.style.width = displayWidth + 'px';
        cropCanvas.style.height = displayHeight + 'px';
        cropCanvasContainer.style.width = displayWidth + 'px';
        cropCanvasContainer.style.height = displayHeight + 'px';

        drawCanvas();

        // Reset crop box to a centered 80% area on first setup
        if (cropState.w === 0) {
            const pad = 0.1;
            cropState = {
                x: displayWidth * pad,
                y: displayHeight * pad,
                w: displayWidth * (1 - pad * 2),
                h: displayHeight * (1 - pad * 2)
            };
        } else {
            // clamp to new bounds
            clampCrop();
        }
        updateCropBox();
    };

    const drawCanvas = () => {
        const cw = cropCanvas.width;
        const ch = cropCanvas.height;
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();

        // rotate around center
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        // Draw scaled image
        const sw = (rotation % 180 === 0) ? cw : ch;
        const sh = (rotation % 180 === 0) ? ch : cw;
        ctx.drawImage(originalImage, -sw / 2, -sh / 2, sw, sh);
        ctx.restore();
    };

    /* ---------- Crop box update ---------- */
    const updateCropBox = () => {
        cropBox.style.left = cropState.x + 'px';
        cropBox.style.top = cropState.y + 'px';
        cropBox.style.width = cropState.w + 'px';
        cropBox.style.height = cropState.h + 'px';

        // Convert CSS px to image px for info
        const scaleX = cropCanvas.width / displayWidth;
        const scaleY = cropCanvas.height / displayHeight;
        const imgW = Math.round(cropState.w * scaleX);
        const imgH = Math.round(cropState.h * scaleY);
        previewCropDims.textContent = `Crop: ${imgW} × ${imgH}`;
    };

    /* ---------- Clamp ---------- */
    const clampCrop = () => {
        const minSize = 20;
        cropState.w = Math.max(minSize, Math.min(cropState.w, displayWidth));
        cropState.h = Math.max(minSize, Math.min(cropState.h, displayHeight));
        cropState.x = Math.max(0, Math.min(cropState.x, displayWidth - cropState.w));
        cropState.y = Math.max(0, Math.min(cropState.y, displayHeight - cropState.h));
    };

    /* ---------- Drag & Resize ---------- */
    const onPointerDown = (e) => {
        const handle = e.target.closest('.crop-handle');
        if (handle) {
            dragMode = handle.dataset.handle;
        } else if (e.target === cropBox || cropBox.contains(e.target)) {
            dragMode = 'move';
        } else {
            return;
        }
        e.preventDefault();
        const rect = cropCanvasContainer.getBoundingClientRect();
        dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        cropStart = { ...cropState };
        document.body.style.userSelect = 'none';
    };

    const onPointerMove = (e) => {
        if (!dragMode) return;
        const rect = cropCanvasContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;

        if (dragMode === 'move') {
            cropState.x = cropStart.x + dx;
            cropState.y = cropStart.y + dy;
        } else {
            let nx = cropStart.x, ny = cropStart.y, nw = cropStart.w, nh = cropStart.h;

            if (dragMode.includes('l')) { nx = cropStart.x + dx; nw = cropStart.w - dx; }
            if (dragMode.includes('r')) { nw = cropStart.w + dx; }
            if (dragMode.includes('t')) { ny = cropStart.y + dy; nh = cropStart.h - dy; }
            if (dragMode.includes('b')) { nh = cropStart.h + dy; }

            // Enforce aspect ratio
            if (aspectRatio) {
                const [rW, rH] = aspectRatio.split(':').map(Number);
                const target = rW / rH;
                if (dragMode === 'l' || dragMode === 'r') {
                    nh = nw / target;
                    if (dragMode.includes('t')) ny = cropStart.y + (cropStart.h - nh);
                } else if (dragMode === 't' || dragMode === 'b') {
                    nw = nh * target;
                    if (dragMode.includes('l')) nx = cropStart.x + (cropStart.w - nw);
                } else {
                    // corner — choose larger dimension change
                    if (Math.abs(dx) > Math.abs(dy)) {
                        nh = nw / target;
                        if (dragMode.includes('t')) ny = cropStart.y + (cropStart.h - nh);
                    } else {
                        nw = nh * target;
                        if (dragMode.includes('l')) nx = cropStart.x + (cropStart.w - nw);
                    }
                }
            }

            // Apply with min size
            const minSize = 30;
            if (nw < minSize) {
                if (dragMode.includes('l')) nx = cropStart.x + cropStart.w - minSize;
                nw = minSize;
            }
            if (nh < minSize) {
                if (dragMode.includes('t')) ny = cropStart.y + cropStart.h - minSize;
                nh = minSize;
            }

            // Clamp to canvas
            if (nx < 0) { nw += nx; nx = 0; }
            if (ny < 0) { nh += ny; ny = 0; }
            if (nx + nw > displayWidth) nw = displayWidth - nx;
            if (ny + nh > displayHeight) nh = displayHeight - ny;

            cropState = { x: nx, y: ny, w: nw, h: nh };
        }

        clampCrop();
        updateCropBox();
    };

    const onPointerUp = () => {
        dragMode = null;
        dragStart = null;
        cropStart = null;
        document.body.style.userSelect = '';
    };

    cropOverlay.addEventListener('mousedown', onPointerDown);
    cropOverlay.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    /* ---------- Aspect ratio ---------- */
    aspectRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const ratio = chip.dataset.ratio;
        if (ratio === 'free') {
            aspectRatio = null;
        } else {
            aspectRatio = ratio;
            // Adjust crop box to match
            const [rW, rH] = ratio.split(':').map(Number);
            const target = rW / rH;
            const cx = cropState.x + cropState.w / 2;
            const cy = cropState.y + cropState.h / 2;

            // Fit within current size
            let newW = cropState.w;
            let newH = newW / target;
            if (newH > displayHeight) {
                newH = displayHeight;
                newW = newH * target;
            }
            if (newW > displayWidth) {
                newW = displayWidth;
                newH = newW / target;
            }

            cropState.w = newW;
            cropState.h = newH;
            cropState.x = Math.max(0, Math.min(cx - newW / 2, displayWidth - newW));
            cropState.y = Math.max(0, Math.min(cy - newH / 2, displayHeight - newH));
            clampCrop();
            updateCropBox();
        }
    });

    /* ---------- Zoom & Rotate ---------- */
    zoomInBtn.addEventListener('click', () => {
        if (zoomLevel < 3) {
            zoomLevel = Math.min(3, zoomLevel + 0.25);
            setupCanvas();
        }
    });
    zoomOutBtn.addEventListener('click', () => {
        if (zoomLevel > 0.5) {
            zoomLevel = Math.max(0.5, zoomLevel - 0.25);
            setupCanvas();
        }
    });
    rotateLeftBtn.addEventListener('click', () => {
        rotation = (rotation + 270) % 360;
        zoomLevel = 1;
        cropState = { x: 0, y: 0, w: 0, h: 0 };
        setupCanvas();
    });
    rotateRightBtn.addEventListener('click', () => {
        rotation = (rotation + 90) % 360;
        zoomLevel = 1;
        cropState = { x: 0, y: 0, w: 0, h: 0 };
        setupCanvas();
    });
    resetCropBtn.addEventListener('click', () => {
        zoomLevel = 1;
        cropState = { x: 0, y: 0, w: 0, h: 0 };
        setupCanvas();
    });

    /* ---------- Reset all ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        cropAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        croppedBlob = null;
        croppedDataUrl = null;
        cropState = { x: 0, y: 0, w: 0, h: 0 };
        zoomLevel = 1;
        rotation = 0;
        aspectRatio = null;
        busy = false;
        cropBtn.disabled = true;
        cropBtn.innerHTML = '<i class="fas fa-crop-alt"></i> Crop Image';
        cropProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    cropAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Progress animation ---------- */
    const STAGES = [
        { until: 15, text: 'Preparing Image...' },
        { until: 38, text: 'Calculating Crop Area...' },
        { until: 62, text: 'Processing Selection...' },
        { until: 88, text: 'Rendering Final Image...' },
        { until: 100, text: 'Crop Complete!' }
    ];

    const animateCrop = (duration = 2400) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            cropProgressFill.style.width = percent + '%';
            cropCountValue.textContent = percent;

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                cropStatus.style.opacity = '0';
                setTimeout(() => {
                    cropStatus.textContent = stage.text;
                    cropStatus.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else resolve();
        };
        requestAnimationFrame(step);
    });

    /* ---------- Do the crop ---------- */
    const performCrop = () => {
        // Map cropState CSS coords → canvas coords
        const scaleX = cropCanvas.width / displayWidth;
        const scaleY = cropCanvas.height / displayHeight;
        const cx = cropState.x * scaleX;
        const cy = cropState.y * scaleY;
        const cw = cropState.w * scaleX;
        const ch = cropState.h * scaleY;

        const out = document.createElement('canvas');
        out.width = Math.round(cw);
        out.height = Math.round(ch);
        const octx = out.getContext('2d');

        if (outputFormat === 'image/jpeg') {
            octx.fillStyle = '#ffffff';
            octx.fillRect(0, 0, out.width, out.height);
        }
        octx.drawImage(cropCanvas, Math.round(cx), Math.round(cy), Math.round(cw), Math.round(ch), 0, 0, out.width, out.height);

        const quality = outputFormat === 'image/jpeg' ? 0.92 : undefined;
        return new Promise((resolve) => {
            out.toBlob((blob) => {
                if (!blob) return resolve(null);
                resolve({ blob, dataUrl: out.toDataURL(outputFormat, quality), width: out.width, height: out.height });
            }, outputFormat, quality);
        });
    };

    /* ---------- Main crop handler ---------- */
    cropBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        busy = true;

        cropBtn.disabled = true;
        cropBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cropping...';
        cropAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        // Show source preview in stage
        cropStageImg.src = cropCanvas.toDataURL('image/png');
        cropProgressFill.style.width = '0%';
        cropCountValue.textContent = '0';
        cropStatus.textContent = 'Preparing Image...';
        cropStatus.style.opacity = '1';

        // Trigger zoom-out-inside effect on stage
        cropStageImg.style.transform = 'scale(1)';
        const t0 = performance.now();

        try {
            const animationPromise = animateCrop(2400);
            const cropPromise = performCrop();
            const [, result] = await Promise.all([animationPromise, cropPromise]);

            if (!result) throw new Error('Crop failed');

            croppedBlob = result.blob;
            croppedDataUrl = result.dataUrl;

            cropAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                cropBtn.innerHTML = '<i class="fas fa-check"></i> Cropped!';
                cropBtn.disabled = true;

                populateResult(((performance.now() - t0) / 1000).toFixed(2), result.width, result.height);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            cropAnimation.classList.add('hidden');
            cropBtn.disabled = false;
            cropBtn.innerHTML = '<i class="fas fa-crop-alt"></i> Crop Image';
            busy = false;
            alert('Crop failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time, cw, ch) => {
        resultOriginalImg.src = originalImage.src;
        resultCroppedImg.src = croppedDataUrl;

        detailResolution.textContent = `${originalWidth} × ${originalHeight}`;
        detailSize.textContent = formatSize(croppedBlob.size);
        detailFormat.textContent = outputFormat === 'image/png' ? 'PNG' : 'JPG';
        detailCropDims.textContent = `${cw} × ${ch}`;
        processTime.textContent = time + 's';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadBtn.disabled = false;
    };

    /* ---------- Download ---------- */
    downloadBtn.addEventListener('click', () => {
        if (!croppedBlob) return;
        const url = URL.createObjectURL(croppedBlob);
        const a = document.createElement('a');
        const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
        a.href = url;
        a.download = `cropped_${currentFile.name.replace(/\.[^/.]+$/, '')}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📥 Download started!');
    });

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

    /* ---------- Resize handler ---------- */
    window.addEventListener('resize', () => {
        if (originalImage && !editorSection.classList.contains('hidden')) {
            setupCanvas();
        }
    });
});