/* ============================================================
   CrafterTools · Add Watermark
   Vanilla JS — Canvas API, fully offline
   Text + Image watermarks, 9 positions, tiling, opacity, rotation
   UNIQUE animation: stamp imprint (ring pulse + check + ripple)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewWatermark = document.getElementById('previewWatermark');
    const resetBtn = document.getElementById('resetBtn');

    const wmCanvas = document.getElementById('wmCanvas');
    const canvasWrap = document.getElementById('canvasWrap');

    // Type toggle
    const typeTextBtn = document.getElementById('typeTextBtn');
    const typeImageBtn = document.getElementById('typeImageBtn');
    const textWatermarkPanel = document.getElementById('textWatermarkPanel');
    const imageWatermarkPanel = document.getElementById('imageWatermarkPanel');

    // Text watermark controls
    const watermarkText = document.getElementById('watermarkText');
    const wmFont = document.getElementById('wmFont');
    const wmSize = document.getElementById('wmSize');
    const wmSizeReadout = document.getElementById('wmSizeReadout');
    const wmColor = document.getElementById('wmColor');
    const wmColorValue = document.getElementById('wmColorValue');
    const wmBoldBtn = document.getElementById('wmBoldBtn');
    const wmItalicBtn = document.getElementById('wmItalicBtn');

    // Image watermark controls
    const wmImageUpload = document.getElementById('wmImageUpload');
    const wmImageInput = document.getElementById('wmImageInput');
    const wmImageScale = document.getElementById('wmImageScale');
    const wmImageScaleReadout = document.getElementById('wmImageScaleReadout');

    // Common controls
    const positionGrid = document.getElementById('positionGrid');
    const wmOpacity = document.getElementById('wmOpacity');
    const wmOpacityReadout = document.getElementById('wmOpacityReadout');
    const wmRotation = document.getElementById('wmRotation');
    const wmRotationReadout = document.getElementById('wmRotationReadout');
    const wmTile = document.getElementById('wmTile');
    const wmMargin = document.getElementById('wmMargin');
    const wmMarginReadout = document.getElementById('wmMarginReadout');
    const resetWatermarkBtn = document.getElementById('resetWatermarkBtn');

    const applyBtn = document.getElementById('applyBtn');
    const stampAnimation = document.getElementById('stampAnimation');
    const glowLine = document.getElementById('glowLine');
    const stampStageImg = document.getElementById('stampStageImg');
    const stampOverlay = document.getElementById('stampOverlay');
    const stampRipple = document.getElementById('stampRipple');
    const stampStatus = document.getElementById('stampStatus');
    const stampCountValue = document.getElementById('stampCountValue');
    const stampProgressFill = document.getElementById('stampProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultImage = document.getElementById('resultImage');
    const detailFilename = document.getElementById('detailFilename');
    const detailType = document.getElementById('detailType');
    const detailResolution = document.getElementById('detailResolution');
    const detailSize = document.getElementById('detailSize');
    const processTime = document.getElementById('processTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const editAnotherBtn = document.getElementById('editAnotherBtn');

    const toast = document.getElementById('toast');

    const ctx = wmCanvas.getContext('2d');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let outputFormat = 'image/png';
    let wmType = 'text'; // 'text' | 'image'
    let wmImage = null;  // loaded watermark image
    let filteredBlob = null, filteredDataUrl = null;
    let busy = false;

    // Watermark config
    const wmConfig = {
        text: '© CrafterTools',
        font: 'Inter, sans-serif',
        size: 48,
        color: '#ffffff',
        bold: false,
        italic: false,
        imageScale: 30,      // percent of image width
        position: 'center',
        opacity: 70,
        rotation: 0,
        tile: false,
        margin: 20
    };

    let displayScaleX = 1, displayScaleY = 1;

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
        filteredBlob = null;
        filteredDataUrl = null;

        editorSection.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        stampAnimation.classList.add('hidden');
        applyBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                originalWidth = img.width;
                originalHeight = img.height;

                wmCanvas.width = originalWidth;
                wmCanvas.height = originalHeight;

                previewName.textContent = file.name;
                previewSize.textContent = formatSize(file.size);
                previewDimensions.textContent = `${img.width} × ${img.height}`;
                updateWatermarkLabel();

                fitCanvasToContainer();
                drawAll();
                applyBtn.disabled = false;
            };
            img.onerror = () => alert('Could not load image.');
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const fitCanvasToContainer = () => {
        const maxW = canvasWrap.clientWidth - 32;
        const maxH = Math.min(window.innerHeight - 240, 600);
        const ratio = Math.min(maxW / originalWidth, maxH / originalHeight);
        const displayW = Math.round(originalWidth * ratio);
        const displayH = Math.round(originalHeight * ratio);

        wmCanvas.style.width = displayW + 'px';
        wmCanvas.style.height = displayH + 'px';

        displayScaleX = displayW / originalWidth;
        displayScaleY = displayH / originalHeight;
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

    /* ---------- Type toggle ---------- */
    typeTextBtn.addEventListener('click', () => {
        wmType = 'text';
        typeTextBtn.classList.add('active');
        typeImageBtn.classList.remove('active');
        textWatermarkPanel.classList.remove('hidden');
        imageWatermarkPanel.classList.add('hidden');
        updateWatermarkLabel();
        drawAll();
    });
    typeImageBtn.addEventListener('click', () => {
        wmType = 'image';
        typeImageBtn.classList.add('active');
        typeTextBtn.classList.remove('active');
        imageWatermarkPanel.classList.remove('hidden');
        textWatermarkPanel.classList.add('hidden');
        updateWatermarkLabel();
        drawAll();
    });

    const updateWatermarkLabel = () => {
        previewWatermark.textContent = `Watermark: ${wmType === 'text' ? 'Text' : 'Image'}`;
    };

    /* ---------- Text controls ---------- */
    watermarkText.addEventListener('input', (e) => {
        wmConfig.text = e.target.value;
        drawAll();
    });
    wmFont.addEventListener('change', (e) => {
        wmConfig.font = e.target.value;
        drawAll();
    });
    wmSize.addEventListener('input', (e) => {
        wmConfig.size = parseInt(e.target.value, 10);
        wmSizeReadout.textContent = wmConfig.size + 'px';
        drawAll();
    });
    wmColor.addEventListener('input', (e) => {
        wmConfig.color = e.target.value;
        wmColorValue.textContent = wmConfig.color.toUpperCase();
        drawAll();
    });
    document.querySelectorAll('.quick-color').forEach(btn => {
        btn.addEventListener('click', () => {
            const c = btn.dataset.color;
            wmConfig.color = c;
            wmColor.value = c;
            wmColorValue.textContent = c.toUpperCase();
            drawAll();
        });
    });
    wmBoldBtn.addEventListener('click', () => {
        wmConfig.bold = !wmConfig.bold;
        wmBoldBtn.classList.toggle('active', wmConfig.bold);
        drawAll();
    });
    wmItalicBtn.addEventListener('click', () => {
        wmConfig.italic = !wmConfig.italic;
        wmItalicBtn.classList.toggle('active', wmConfig.italic);
        drawAll();
    });

    /* ---------- Image controls ---------- */
    wmImageUpload.addEventListener('click', () => wmImageInput.click());
    wmImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.match('image/(png|jpeg|webp)')) {
            alert('Please select a PNG, JPG or WEBP image.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                wmImage = img;
                wmImageUpload.innerHTML = `
                    <img src="${ev.target.result}" style="max-width:100%;max-height:60px;border-radius:6px;margin-bottom:6px;">
                    <span>${file.name}</span>
                    <span class="image-upload-hint">Click to change</span>
                `;
                drawAll();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        wmImageInput.value = '';
    });
    wmImageScale.addEventListener('input', (e) => {
        wmConfig.imageScale = parseInt(e.target.value, 10);
        wmImageScaleReadout.textContent = wmConfig.imageScale + '%';
        drawAll();
    });

    /* ---------- Position ---------- */
    positionGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.position-btn');
        if (!btn) return;
        wmConfig.position = btn.dataset.pos;
        positionGrid.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawAll();
    });

    /* ---------- Opacity / Rotation / Margin / Tiling ---------- */
    wmOpacity.addEventListener('input', (e) => {
        wmConfig.opacity = parseInt(e.target.value, 10);
        wmOpacityReadout.textContent = wmConfig.opacity + '%';
        drawAll();
    });
    wmRotation.addEventListener('input', (e) => {
        wmConfig.rotation = parseInt(e.target.value, 10);
        wmRotationReadout.textContent = wmConfig.rotation + '°';
        drawAll();
    });
    wmMargin.addEventListener('input', (e) => {
        wmConfig.margin = parseInt(e.target.value, 10);
        wmMarginReadout.textContent = wmConfig.margin + 'px';
        drawAll();
    });
    wmTile.addEventListener('change', (e) => {
        wmConfig.tile = e.target.checked;
        drawAll();
    });

    /* ---------- Reset watermark ---------- */
    resetWatermarkBtn.addEventListener('click', () => {
        wmType = 'text';
        typeTextBtn.classList.add('active');
        typeImageBtn.classList.remove('active');
        textWatermarkPanel.classList.remove('hidden');
        imageWatermarkPanel.classList.add('hidden');

        wmConfig.text = '© CrafterTools';
        wmConfig.font = 'Inter, sans-serif';
        wmConfig.size = 48;
        wmConfig.color = '#ffffff';
        wmConfig.bold = false;
        wmConfig.italic = false;
        wmConfig.imageScale = 30;
        wmConfig.position = 'center';
        wmConfig.opacity = 70;
        wmConfig.rotation = 0;
        wmConfig.tile = false;
        wmConfig.margin = 20;
        wmImage = null;

        watermarkText.value = wmConfig.text;
        wmFont.value = wmConfig.font;
        wmSize.value = wmConfig.size;
        wmSizeReadout.textContent = wmConfig.size + 'px';
        wmColor.value = wmConfig.color;
        wmColorValue.textContent = wmConfig.color.toUpperCase();
        wmBoldBtn.classList.remove('active');
        wmItalicBtn.classList.remove('active');
        wmImageScale.value = wmConfig.imageScale;
        wmImageScaleReadout.textContent = wmConfig.imageScale + '%';
        wmOpacity.value = wmConfig.opacity;
        wmOpacityReadout.textContent = wmConfig.opacity + '%';
        wmRotation.value = wmConfig.rotation;
        wmRotationReadout.textContent = wmConfig.rotation + '°';
        wmMargin.value = wmConfig.margin;
        wmMarginReadout.textContent = wmConfig.margin + 'px';
        wmTile.checked = false;
        positionGrid.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
        positionGrid.querySelector('[data-pos="center"]').classList.add('active');

        wmImageUpload.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <span>Upload watermark image</span>
            <span class="image-upload-hint">PNG with transparency recommended</span>
        `;

        updateWatermarkLabel();
        drawAll();
    });

    /* ---------- Reset all ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        stampAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        filteredBlob = null;
        filteredDataUrl = null;
        wmImage = null;
        busy = false;
        applyBtn.disabled = true;
        stampProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    editAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Canvas drawing ---------- */
    const drawAll = () => {
        if (!originalImage) return;

        ctx.clearRect(0, 0, wmCanvas.width, wmCanvas.height);
        ctx.drawImage(originalImage, 0, 0);

        ctx.save();
        ctx.globalAlpha = wmConfig.opacity / 100;

        if (wmType === 'text') {
            drawTextWatermark(ctx, wmCanvas.width, wmCanvas.height);
        } else if (wmImage) {
            drawImageWatermark(ctx, wmCanvas.width, wmCanvas.height);
        }

        ctx.restore();
    };

    /* ---------- Compute positions ---------- */
    const getPosition = (w, h, pos, wmW, wmH, margin) => {
        let x, y;
        switch (pos) {
            case 'top-left': x = margin; y = margin; break;
            case 'top-center': x = (w - wmW) / 2; y = margin; break;
            case 'top-right': x = w - wmW - margin; y = margin; break;
            case 'middle-left': x = margin; y = (h - wmH) / 2; break;
            case 'center': x = (w - wmW) / 2; y = (h - wmH) / 2; break;
            case 'middle-right': x = w - wmW - margin; y = (h - wmH) / 2; break;
            case 'bottom-left': x = margin; y = h - wmH - margin; break;
            case 'bottom-center': x = (w - wmW) / 2; y = h - wmH - margin; break;
            case 'bottom-right': x = w - wmW - margin; y = h - wmH - margin; break;
            default: x = (w - wmW) / 2; y = (h - wmH) / 2;
        }
        return { x, y };
    };

    /* ---------- Text watermark drawing ---------- */
    const drawTextWatermark = (c, w, h) => {
        const fontStr = `${wmConfig.italic ? 'italic ' : ''}${wmConfig.bold ? 'bold ' : ''}${wmConfig.size}px ${wmConfig.font}`;
        c.font = fontStr;
        c.fillStyle = wmConfig.color;
        c.textAlign = 'left';
        c.textBaseline = 'top';

        const lines = wmConfig.text.split('\n');
        const lineHeight = wmConfig.size * 1.2;
        const totalHeight = lines.length * lineHeight;
        let maxWidth = 0;
        lines.forEach(line => {
            const m = c.measureText(line);
            if (m.width > maxWidth) maxWidth = m.width;
        });

        const wmW = maxWidth;
        const wmH = totalHeight;

        if (wmConfig.tile) {
            // Tile across the image with generous spacing
            const spacingX = wmW + wmConfig.margin * 4 + 80;
            const spacingY = wmH + wmConfig.margin * 4 + 80;
            for (let ty = -wmH; ty < h + spacingY; ty += spacingY) {
                for (let tx = -wmW; tx < w + spacingX; tx += spacingX) {
                    drawOneTextBlock(c, tx, ty, lines, lineHeight);
                }
            }
        } else {
            const pos = getPosition(w, h, wmConfig.position, wmW, wmH, wmConfig.margin);
            const cx = pos.x + wmW / 2;
            const cy = pos.y + wmH / 2;

            c.save();
            c.translate(cx, cy);
            c.rotate((wmConfig.rotation * Math.PI) / 180);
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            const startY = -totalHeight / 2 + lineHeight / 2;
            lines.forEach((line, i) => {
                c.fillText(line, 0, startY + i * lineHeight);
            });
            c.restore();
        }
    };

    const drawOneTextBlock = (c, x, y, lines, lineHeight) => {
        c.save();
        c.translate(x, y);
        c.rotate((wmConfig.rotation * Math.PI) / 180);
        c.textAlign = 'left';
        c.textBaseline = 'top';
        lines.forEach((line, i) => {
            c.fillText(line, 0, i * lineHeight);
        });
        c.restore();
    };

    /* ---------- Image watermark drawing ---------- */
    const drawImageWatermark = (c, w, h) => {
        const targetW = (w * wmConfig.imageScale) / 100;
        const ratio = targetW / wmImage.width;
        const targetH = wmImage.height * ratio;

        if (wmConfig.tile) {
            const spacingX = targetW + wmConfig.margin * 2 + 40;
            const spacingY = targetH + wmConfig.margin * 2 + 40;
            for (let ty = -targetH; ty < h + spacingY; ty += spacingY) {
                for (let tx = -targetW; tx < w + spacingX; tx += spacingX) {
                    c.save();
                    c.translate(tx + targetW / 2, ty + targetH / 2);
                    c.rotate((wmConfig.rotation * Math.PI) / 180);
                    c.drawImage(wmImage, -targetW / 2, -targetH / 2, targetW, targetH);
                    c.restore();
                }
            }
        } else {
            const pos = getPosition(w, h, wmConfig.position, targetW, targetH, wmConfig.margin);
            const cx = pos.x + targetW / 2;
            const cy = pos.y + targetH / 2;

            c.save();
            c.translate(cx, cy);
            c.rotate((wmConfig.rotation * Math.PI) / 180);
            c.drawImage(wmImage, -targetW / 2, -targetH / 2, targetW, targetH);
            c.restore();
        }
    };

    /* ---------- UNIQUE stamp animation ---------- */
    const STAGES = [
        { until: 15, text: 'Preparing Image...' },
        { until: 35, text: 'Rendering Watermark...' },
        { until: 60, text: 'Positioning...' },
        { until: 85, text: 'Applying Opacity...' },
        { until: 100, text: 'Stamped!' }
    ];

    const animateStamp = (duration = 2400) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        glowLine.classList.add('active');

        // Reset overlay/ripple
        stampOverlay.classList.remove('active');
        stampRipple.classList.remove('active');

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            stampProgressFill.style.width = percent + '%';
            stampCountValue.textContent = percent;

            // Trigger stamp overlay at ~65%
            if (percent >= 65 && !stampOverlay.classList.contains('active')) {
                stampOverlay.classList.add('active');
                stampRipple.classList.add('active');
                // Reset animations
                const ring = stampOverlay.querySelector('.stamp-ring');
                const check = stampOverlay.querySelector('.stamp-check');
                if (ring) { ring.style.animation = 'none'; void ring.offsetWidth; ring.style.animation = ''; }
                if (check) { check.style.animation = 'none'; void check.offsetWidth; check.style.animation = ''; }
            }

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                stampStatus.style.opacity = '0';
                setTimeout(() => {
                    stampStatus.textContent = stage.text;
                    stampStatus.style.opacity = '1';
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

    /* ---------- Render final image ---------- */
    const renderFinalImage = () => new Promise((resolve) => {
        const out = document.createElement('canvas');
        out.width = originalWidth;
        out.height = originalHeight;
        const octx = out.getContext('2d');

        if (outputFormat === 'image/jpeg') {
            octx.fillStyle = '#ffffff';
            octx.fillRect(0, 0, out.width, out.height);
        }
        octx.drawImage(originalImage, 0, 0);

        octx.save();
        octx.globalAlpha = wmConfig.opacity / 100;

        if (wmType === 'text') {
            drawTextWatermark(octx, out.width, out.height);
        } else if (wmImage) {
            drawImageWatermark(octx, out.width, out.height);
        }

        octx.restore();

        const quality = outputFormat === 'image/jpeg' ? 0.92 : undefined;
        out.toBlob((blob) => {
            if (!blob) return resolve(null);
            resolve({ blob, dataUrl: out.toDataURL(outputFormat, quality) });
        }, outputFormat, quality);
    });

    /* ---------- Apply ---------- */
    applyBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        if (wmType === 'image' && !wmImage) {
            showToast('⚠️ Please upload a watermark image first');
            return;
        }
        busy = true;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
        stampAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        stampStageImg.src = originalImage.src;
        stampProgressFill.style.width = '0%';
        stampCountValue.textContent = '0';
        stampStatus.textContent = 'Preparing Image...';
        stampStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            const animationPromise = animateStamp(2400);
            const renderPromise = renderFinalImage();
            const [, result] = await Promise.all([animationPromise, renderPromise]);

            if (!result) throw new Error('Render failed');

            filteredBlob = result.blob;
            filteredDataUrl = result.dataUrl;

            stampAnimation.classList.add('hidden');
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
            stampAnimation.classList.add('hidden');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-stamp"></i> Apply Watermark &amp; Download';
            busy = false;
            alert('Watermark failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (time) => {
        resultImage.src = filteredDataUrl;

        detailFilename.textContent = currentFile.name.replace(/\.[^/.]+$/, '') +
            (outputFormat === 'image/png' ? '_watermarked.png' : '_watermarked.jpg');
        detailType.textContent = wmType === 'text' ? 'Text' : 'Image';
        detailResolution.textContent = `${originalWidth} × ${originalHeight}`;
        detailSize.textContent = formatSize(filteredBlob.size);
        processTime.textContent = time + 's';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadBtn.disabled = false;
    };

    /* ---------- Download ---------- */
    downloadBtn.addEventListener('click', () => {
        if (!filteredBlob) return;
        const url = URL.createObjectURL(filteredBlob);
        const a = document.createElement('a');
        a.href = url;
        const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
        a.download = currentFile.name.replace(/\.[^/.]+$/, '') + '_watermarked.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📥 Download started!');
    });

    /* ---------- Resize ---------- */
    window.addEventListener('resize', () => {
        if (originalImage) {
            fitCanvasToContainer();
        }
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