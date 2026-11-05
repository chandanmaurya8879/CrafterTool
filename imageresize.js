/* ============================================================
   PixelPress — Image Resizer
   Vanilla JS · no dependencies · reuses compressor animations
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
    const previewDimensions = document.getElementById('previewDimensions');
    const previewSize = document.getElementById('previewSize');
    const previewType = document.getElementById('previewType');
    const resetBtn = document.getElementById('resetBtn');

    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const lockBtn = document.getElementById('lockBtn');
    const percentRow = document.getElementById('percentRow');
    const presetRow = document.getElementById('presetRow');
    const liveDim = document.getElementById('liveDim');
    const copyDimBtn = document.getElementById('copyDimBtn');

    const resizeBtn = document.getElementById('resizeBtn');
    const loadingAnimation = document.getElementById('loadingAnimation');
    const successAnimation = document.getElementById('successAnimation');
    const percentText = document.getElementById('percentText');
    const ringFill = document.querySelector('.ring-fill');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultResizedImg = document.getElementById('resultResizedImg');
    const origDim = document.getElementById('origDim');
    const newDim = document.getElementById('newDim');
    const origSize = document.getElementById('origSize');
    const newSize = document.getElementById('newSize');
    const statOrigSize = document.getElementById('statOrigSize');
    const statNewSize = document.getElementById('statNewSize');
    const statOrigRes = document.getElementById('statOrigRes');
    const statNewRes = document.getElementById('statNewRes');
    const statAspect = document.getElementById('statAspect');
    const statPercent = document.getElementById('statPercent');
    const resizeTime = document.getElementById('resizeTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const newImageBtn = document.getElementById('newImageBtn');
    const toast = document.getElementById('toast');

    /* Compare slider */
    const compareSlider = document.getElementById('compareSlider');
    const compareAfterClip = document.getElementById('compareAfterClip');
    const compareHandle = document.getElementById('compareHandle');
    const compareBefore = document.getElementById('compareBefore');
    const compareAfter = document.getElementById('compareAfter');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let resizedBlob = null, resizedDataUrl = null;
    let newWidth = 0, newHeight = 0;
    let aspectLocked = true;
    let activeChip = null;
    let busy = false;

    /* ---------- Utils ---------- */
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024, s = ['B','KB','MB','GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
    };

    const showToast = (msg) => {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    const animateNumber = (el, target, duration = 900, suffix = '', decimals = 0) => {
        const start = 0, t0 = performance.now();
        const step = (now) => {
            const p = Math.min((now - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (start + (target - start) * eased).toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = target.toFixed(decimals) + suffix;
        };
        requestAnimationFrame(step);
    };

    /* ---------- Upload ---------- */
    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.match('image/jpeg|image/png|image/webp')) {
            alert('Please select a JPG, PNG or WEBP image.');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            alert('File too large. Max 15MB.');
            return;
        }
        currentFile = file;
        originalFileSize = file.size;
        resizedBlob = null;
        resizedDataUrl = null;
        resultCard.classList.add('hidden');

        editorSection.classList.remove('hidden');
        previewSkeleton.classList.remove('hidden');
        previewContent.classList.add('hidden');
        resizeBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                originalWidth = img.width;
                originalHeight = img.height;

                previewImage.src = e.target.result;
                previewName.textContent = file.name;
                previewDimensions.textContent = `${img.width} × ${img.height}`;
                previewSize.textContent = formatSize(file.size);
                previewType.textContent = file.type.split('/')[1].toUpperCase();

                widthInput.value = img.width;
                heightInput.value = img.height;
                updateLivePreview();

                previewSkeleton.classList.add('hidden');
                previewContent.classList.remove('hidden');
                resizeBtn.disabled = false;
                resizeBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> Resize Image';
            };
            img.onerror = () => {
                previewSkeleton.classList.add('hidden');
                alert('Could not load image.');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    /* ---------- Drag & drop ---------- */
    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.style.borderColor = '#8b5cf6';
        uploadArea.style.background = '#f5f0ff';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#d9d6fe';
        uploadArea.style.background = '#fcfaff';
    });
    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d9d6fe';
        uploadArea.style.background = '#fcfaff';
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.setAttribute('tabindex', '0');
    uploadArea.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    fileInput.addEventListener('change', e => {
        if (e.target.files.length) handleFile(e.target.files[0]);
        fileInput.value = '';
    });

    /* ---------- Reset ---------- */
    const fullReset = () => {
        editorSection.classList.add('hidden');
        previewSkeleton.classList.add('hidden');
        previewContent.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        loadingAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        resizedBlob = null;
        resizedDataUrl = null;
        busy = false;
        widthInput.value = '';
        heightInput.value = '';
        liveDim.textContent = '—';
        resizeBtn.disabled = true;
        resizeBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> Resize Image';
        percentText.textContent = '0%';
        ringFill.style.strokeDashoffset = 213.6;
        activeChip && activeChip.classList.remove('active');
        activeChip = null;
        document.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'));
        document.querySelector('.chip[data-percent="100"]').classList.add('active');
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', fullReset);
    newImageBtn.addEventListener('click', fullReset);

    /* ---------- Live preview & aspect ratio ---------- */
    const updateLivePreview = () => {
        const w = parseInt(widthInput.value, 10) || 0;
        const h = parseInt(heightInput.value, 10) || 0;
        liveDim.textContent = (w && h) ? `${w} × ${h} px` : (w ? `${w} × auto` : (h ? `auto × ${h}` : '—'));
    };

    const fitToAspect = (changed) => {
        if (!aspectLocked || !originalWidth) return;
        const ratio = originalWidth / originalHeight;
        if (changed === 'width') {
            const w = parseInt(widthInput.value, 10);
            if (w > 0) heightInput.value = Math.round(w / ratio);
        } else if (changed === 'height') {
            const h = parseInt(heightInput.value, 10);
            if (h > 0) widthInput.value = Math.round(h * ratio);
        }
        updateLivePreview();
    };

    widthInput.addEventListener('input', () => {
        if (aspectLocked) fitToAspect('width'); else updateLivePreview();
    });
    heightInput.addEventListener('input', () => {
        if (aspectLocked) fitToAspect('height'); else updateLivePreview();
    });

    lockBtn.addEventListener('click', () => {
        aspectLocked = !aspectLocked;
        lockBtn.classList.toggle('active', aspectLocked);
        lockBtn.innerHTML = aspectLocked
            ? '<i class="fas fa-lock"></i>'
            : '<i class="fas fa-lock-open"></i>';
        lockBtn.title = aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked';
        if (aspectLocked && originalWidth) fitToAspect('width');
    });

    /* ---------- Percentage chips ---------- */
    percentRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip[data-percent]');
        if (!chip || !originalWidth) return;
        const pct = parseFloat(chip.dataset.percent) / 100;
        widthInput.value = Math.round(originalWidth * pct);
        heightInput.value = Math.round(originalHeight * pct);
        updateLivePreview();
        percentRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    });

    /* ---------- Presets ---------- */
    presetRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip.preset');
        if (!chip) return;
        const w = parseInt(chip.dataset.w, 10);
        const h = parseInt(chip.dataset.h, 10);
        widthInput.value = w;
        heightInput.value = h;
        updateLivePreview();
        presetRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeChip = chip;
    });

    /* ---------- Copy dimensions ---------- */
    copyDimBtn.addEventListener('click', async () => {
        const text = `${widthInput.value} × ${heightInput.value}`;
        try {
            await navigator.clipboard.writeText(text);
            showToast('📋 Dimensions copied!');
        } catch {
            showToast('Could not copy');
        }
    });

    /* ---------- Progress animation ---------- */
    const animateCompression = (duration = 2200) => new Promise(resolve => {
        let start = null;
        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            percentText.textContent = Math.floor(p * 100) + '%';
            ringFill.style.strokeDashoffset = 213.6 * (1 - p);
            if (p < 1) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
    });

    /* ---------- Resize engine ---------- */
    const resizeImage = (img, w, h, quality = 0.92) => new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Resize failed'));
            resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', quality) });
        }, 'image/jpeg', quality);
    });

    /* ---------- Main resize handler ---------- */
    resizeBtn.addEventListener('click', async () => {
        if (!originalImage || busy) return;
        const w = parseInt(widthInput.value, 10);
        const h = parseInt(heightInput.value, 10);
        if (!w || !h || w < 1 || h < 1) {
            alert('Please enter valid width and height.');
            return;
        }
        busy = true;
        resizeBtn.disabled = true;
        resizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resizing...';
        loadingAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');
        ringFill.style.strokeDashoffset = 213.6;
        percentText.textContent = '0%';

        const t0 = performance.now();
        try {
            const animationPromise = animateCompression(2200);
            const resizePromise = resizeImage(originalImage, w, h);
            const [, result] = await Promise.all([animationPromise, resizePromise]);
            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            resizedBlob = result.blob;
            resizedDataUrl = result.dataUrl;
            newWidth = w;
            newHeight = h;

            loadingAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                resizeBtn.innerHTML = '<i class="fas fa-check"></i> Resized!';
                resizeBtn.disabled = true;
                populateResult(timeTaken);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            loadingAnimation.classList.add('hidden');
            resizeBtn.disabled = false;
            resizeBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> Resize Image';
            busy = false;
            alert('Resize failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time) => {
        resultOriginalImg.src = originalImage.src;
        resultResizedImg.src = resizedDataUrl;
        compareBefore.src = originalImage.src;
        compareAfter.src = resizedDataUrl;

        origDim.textContent = `${originalWidth} × ${originalHeight}`;
        newDim.textContent = `${newWidth} × ${newHeight}`;
        origSize.textContent = formatSize(originalFileSize);
        newSize.textContent = formatSize(resizedBlob.size);

        // Animated stats
        statOrigSize.textContent = '0 KB';
        statNewSize.textContent = '0 KB';
        animateNumber(statOrigSize, originalFileSize / 1024, 900, ' KB', 1);
        animateNumber(statNewSize, resizedBlob.size / 1024, 900, ' KB', 1);
        statOrigRes.textContent = `${originalWidth}×${originalHeight}`;
        statNewRes.textContent = `${newWidth}×${newHeight}`;

        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const g = gcd(newWidth, newHeight);
        statAspect.textContent = `${Math.round(newWidth / g)}:${Math.round(newHeight / g)}`;

        const ratio = ((newWidth * newHeight) / (originalWidth * originalHeight)) * 100;
        animateNumber(statPercent, ratio, 900, '%', 1);

        resizeTime.textContent = time + 's';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadBtn.disabled = false;

        // Reset slider
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
        if (!resizedBlob) return;
        const url = URL.createObjectURL(resizedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resized_${currentFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📥 Download started!');
    });

    /* ---------- Ripple ---------- */
    document.querySelectorAll('.btn-primary').forEach(btn => {
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
});