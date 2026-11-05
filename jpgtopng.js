/* ============================================================
   CrafterTools · JPG to PNG Converter
   Vanilla JS — uses Canvas API, fully offline
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewSection = document.getElementById('previewSection');
    const previewSkeleton = document.getElementById('previewSkeleton');
    const previewContent = document.getElementById('previewContent');
    const previewImage = document.getElementById('previewImage');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewType = document.getElementById('previewType');
    const resetBtn = document.getElementById('resetBtn');

    const convertBtn = document.getElementById('convertBtn');
    const loadingAnimation = document.getElementById('loadingAnimation');
    const successAnimation = document.getElementById('successAnimation');
    const percentText = document.getElementById('percentText');
    const progressStage = document.getElementById('progressStage');
    const ringFill = document.querySelector('.ring-fill');

    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultPngImg = document.getElementById('resultPngImg');
    const detailFilename = document.getElementById('detailFilename');
    const detailDimensions = document.getElementById('detailDimensions');
    const detailSize = document.getElementById('detailSize');
    const convertTime = document.getElementById('convertTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const convertAnotherBtn = document.getElementById('convertAnotherBtn');

    const toast = document.getElementById('toast');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let pngBlob = null, pngDataUrl = null;
    let busy = false;

    const RING_CIRCUMFERENCE = 2 * Math.PI * 38; // ≈ 238.76

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

    /* ---------- Upload handlers ---------- */
    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.match('image/jpeg|image/jpg')) {
            alert('Please select a JPG or JPEG image.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File too large. Max 20MB.');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;
        pngBlob = null;
        pngDataUrl = null;

        previewSection.classList.remove('hidden');
        previewSkeleton.classList.remove('hidden');
        previewContent.classList.add('hidden');
        convertBtn.disabled = true;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        loadingAnimation.classList.add('hidden');
        convertBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Convert to PNG';

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
                previewType.textContent = 'JPG';

                previewSkeleton.classList.add('hidden');
                previewContent.classList.remove('hidden');
                convertBtn.disabled = false;
            };
            img.onerror = () => {
                previewSkeleton.classList.add('hidden');
                alert('Could not load image. Please try another file.');
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

    /* Reset */
    const resetAll = () => {
        previewSection.classList.add('hidden');
        previewSkeleton.classList.add('hidden');
        previewContent.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        loadingAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        pngBlob = null;
        pngDataUrl = null;
        busy = false;
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Convert to PNG';
        percentText.textContent = '0%';
        ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE;
        progressStage.textContent = 'Preparing...';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    convertAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Progress animation ---------- */
    const STAGES = [
        { until: 12, text: 'Preparing...' },
        { until: 32, text: 'Reading Image...' },
        { until: 55, text: 'Converting...' },
        { until: 78, text: 'Creating PNG...' },
        { until: 98, text: 'Finalizing...' },
        { until: 100, text: 'Done!' }
    ];

    const animateProgress = (duration = 2400) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            percentText.textContent = percent + '%';
            ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - p);

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                progressStage.style.opacity = '0';
                setTimeout(() => {
                    progressStage.textContent = stage.text;
                    progressStage.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else resolve();
        };
        requestAnimationFrame(step);
    });

    /* ---------- Convert JPG → PNG using Canvas ---------- */
    const convertToPng = (img) => new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);

        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Conversion failed'));
            resolve({ blob, dataUrl: canvas.toDataURL('image/png') });
        }, 'image/png');
    });

    /* ---------- Main convert handler ---------- */
    convertBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        busy = true;

        convertBtn.disabled = true;
        convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
        loadingAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');
        ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE;
        percentText.textContent = '0%';
        progressStage.textContent = 'Preparing...';

        const t0 = performance.now();

        try {
            const animationPromise = animateProgress(2400);
            const convertPromise = convertToPng(originalImage);
            const [, result] = await Promise.all([animationPromise, convertPromise]);

            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            pngBlob = result.blob;
            pngDataUrl = result.dataUrl;

            loadingAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                convertBtn.innerHTML = '<i class="fas fa-check"></i> Converted!';
                convertBtn.disabled = true;

                populateResult(timeTaken);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            loadingAnimation.classList.add('hidden');
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Convert to PNG';
            busy = false;
            alert('Conversion failed. Please try again.');
        }
    });

    /* ---------- Populate result card ---------- */
    const populateResult = (time) => {
        resultOriginalImg.src = originalImage.src;
        resultPngImg.src = pngDataUrl;

        detailFilename.textContent = currentFile.name.replace(/\.[^/.]+$/, '') + '.png';
        detailDimensions.textContent = `${originalWidth} × ${originalHeight}`;
        detailSize.textContent = formatSize(pngBlob.size);
        convertTime.textContent = time + 's';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadBtn.disabled = false;
    };

    /* ---------- Download ---------- */
    downloadBtn.addEventListener('click', () => {
        if (!pngBlob) return;
        const url = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.name.replace(/\.[^/.]+$/, '') + '.png';
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