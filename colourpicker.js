/* ============================================================
   CrafterTools · Image Color Picker
   Vanilla JS — Canvas API, 100% browser-based, no server
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const processingAnimation = document.getElementById('processingAnimation');
    const processingRing = document.getElementById('processingRing');
    const processingPercent = document.getElementById('processingPercent');
    const processingStatus = document.getElementById('processingStatus');
    const processingBarFill = document.getElementById('processingBarFill');
    const successAnimation = document.getElementById('successAnimation');

    const editorSection = document.getElementById('editorSection');
    const previewThumb = document.getElementById('previewThumb');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewType = document.getElementById('previewType');
    const replaceBtn = document.getElementById('replaceBtn');
    const removeBtn = document.getElementById('removeBtn');

    const pickCanvas = document.getElementById('pickCanvas');
    const pickerWrap = document.getElementById('pickerWrap');
    const magnifier = document.getElementById('magnifier');
    const magnifierCanvas = document.getElementById('magnifierCanvas');

    const selectedSwatch = document.getElementById('selectedSwatch');
    const colorValues = document.getElementById('colorValues');

    const paletteGrid = document.getElementById('paletteGrid');
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    const downloadCssBtn = document.getElementById('downloadCssBtn');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');

    const pickAnotherBtn = document.getElementById('pickAnotherBtn');
    const toast = document.getElementById('toast');

    const pickCtx = pickCanvas.getContext('2d', { willReadFrequently: true });
    const magCtx = magnifierCanvas.getContext('2d');

    const RING_CIRCUMFERENCE = 2 * Math.PI * 34; // ≈ 213.6

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let displayWidth = 0, displayHeight = 0;
    let scaleX = 1, scaleY = 1;
    let currentColor = { r: 255, g: 255, b: 255, a: 255 };
    let dominantColors = [];
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
        setTimeout(() => toast.classList.remove('show'), 2200);
    };

    const setProgress = (percent, status) => {
        processingBarFill.style.width = percent + '%';
        processingRing.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - percent / 100);
        processingPercent.textContent = percent + '%';
        if (status) {
            processingStatus.style.opacity = '0';
            setTimeout(() => {
                processingStatus.textContent = status;
                processingStatus.style.opacity = '1';
            }, 100);
        }
    };

    /* ---------- Color conversions ---------- */
    const rgbToHex = (r, g, b) => {
        const toHex = (n) => n.toString(16).padStart(2, '0');
        return '#' + toHex(r) + toHex(g) + toHex(b);
    };

    const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    const rgbToHsv = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;

        if (max !== min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
    };

    const rgbToCmyk = (r, g, b) => {
        let c = 0, m = 0, y = 0, k = 0;
        r /= 255; g /= 255; b /= 255;
        k = 1 - Math.max(r, g, b);
        if (k < 1) {
            c = (1 - r - k) / (1 - k);
            m = (1 - g - k) / (1 - k);
            y = (1 - b - k) / (1 - k);
        }
        return {
            c: Math.round(c * 100),
            m: Math.round(m * 100),
            y: Math.round(y * 100),
            k: Math.round(k * 100)
        };
    };

    /* ---------- Clipboard ---------- */
    const copyToClipboard = async (text, label) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast('📋 Copied: ' + label);
        } catch (err) {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('📋 Copied: ' + label);
        }
    };

    /* ---------- Upload handling ---------- */
    const handleFile = async (file) => {
        if (!file) return;
        if (!file.type.match('image/(jpeg|png|webp)')) {
            alert('Unsupported format. Please use JPG, PNG, or WEBP.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File too large. Max 20MB.');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;

        uploadArea.classList.add('hidden');
        editorSection.classList.add('hidden');
        successAnimation.classList.add('hidden');
        processingAnimation.classList.remove('hidden');
        setProgress(0, 'Reading image...');
        busy = true;

        try {
            await new Promise(r => setTimeout(r, 200));
            setProgress(15, 'Reading image...');

            // Load image
            const dataUrl = await readFileAsDataURL(file);
            const img = await loadImage(dataUrl);
            originalImage = img;
            originalWidth = img.width;
            originalHeight = img.height;

            setProgress(40, 'Extracting colors...');

            // Set up canvas at full image resolution
            pickCanvas.width = originalWidth;
            pickCanvas.height = originalHeight;
            pickCtx.drawImage(img, 0, 0);

            // Fit canvas within container
            fitCanvasToContainer();

            setProgress(65, 'Building palette...');

            // Extract dominant colors
            dominantColors = extractDominantColors(pickCtx, originalWidth, originalHeight, 10);

            setProgress(85, 'Preparing preview...');

            // Update preview info
            previewThumb.src = dataUrl;
            previewName.textContent = file.name;
            previewSize.textContent = formatSize(file.size);
            previewDimensions.textContent = `${originalWidth} × ${originalHeight}`;
            previewType.textContent = file.type.split('/')[1].toUpperCase();

            // Render palette
            renderPalette();

            // Initialize selected color to first dominant
            if (dominantColors.length > 0) {
                const c = dominantColors[0];
                setSelectedColor(c.r, c.g, c.b, 255);
            }

            setProgress(100, 'Ready!');
            await new Promise(r => setTimeout(r, 300));

            processingAnimation.classList.add('hidden');
            editorSection.classList.remove('hidden');
            successAnimation.classList.remove('hidden');

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            processingAnimation.classList.add('hidden');
            editorSection.classList.add('hidden');
            uploadArea.classList.remove('hidden');
            busy = false;
            alert('Image failed to load. Please try another file.');
        }
    };

    const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    const fitCanvasToContainer = () => {
        const maxW = pickerWrap.clientWidth - 24;
        const maxH = 500;
        const ratio = Math.min(maxW / originalWidth, maxH / originalHeight, 1);
        displayWidth = Math.round(originalWidth * ratio);
        displayHeight = Math.round(originalHeight * ratio);

        pickCanvas.style.width = displayWidth + 'px';
        pickCanvas.style.height = displayHeight + 'px';

        scaleX = originalWidth / displayWidth;
        scaleY = originalHeight / displayHeight;
    };

    /* ---------- Dominant color extraction (median-cut-ish) ---------- */
    const extractDominantColors = (ctx, width, height, count) => {
        // Sample pixels on a grid for performance
        const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 8000)));
        const colorMap = new Map();

        const imgData = ctx.getImageData(0, 0, width, height).data;
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const idx = (y * width + x) * 4;
                const a = imgData[idx + 3];
                if (a < 128) continue; // Skip transparent

                const r = imgData[idx];
                const g = imgData[idx + 1];
                const b = imgData[idx + 2];

                // Quantize to reduce similar colors
                const qr = Math.round(r / 16) * 16;
                const qg = Math.round(g / 16) * 16;
                const qb = Math.round(b / 16) * 16;
                const key = `${qr},${qg},${qb}`;

                if (colorMap.has(key)) {
                    colorMap.get(key).count++;
                } else {
                    colorMap.set(key, { r: qr, g: qg, b: qb, count: 1 });
                }
            }
        }

        // Sort by count and take top N
        const sorted = [...colorMap.values()].sort((a, b) => b.count - a.count);

        // Ensure distinct colors (some distance apart)
        const result = [];
        const minDist = 40;

        for (const color of sorted) {
            if (result.length >= count) break;
            const isDistinct = result.every(c => {
                const dr = c.r - color.r;
                const dg = c.g - color.g;
                const db = c.b - color.b;
                return Math.sqrt(dr * dr + dg * dg + db * db) > minDist;
            });
            if (isDistinct) {
                result.push({
                    r: Math.max(0, Math.min(255, color.r)),
                    g: Math.max(0, Math.min(255, color.g)),
                    b: Math.max(0, Math.min(255, color.b))
                });
            }
        }

        // If we didn't get enough distinct, fill with remaining
        if (result.length < count) {
            for (const color of sorted) {
                if (result.length >= count) break;
                if (!result.some(c => c.r === color.r && c.g === color.g && c.b === color.b)) {
                    result.push({ r: color.r, g: color.g, b: color.b });
                }
            }
        }

        return result.slice(0, count);
    };

    /* ---------- Render palette ---------- */
    const renderPalette = () => {
        paletteGrid.innerHTML = '';
        dominantColors.forEach((c, i) => {
            const hex = rgbToHex(c.r, c.g, c.b);
            const rgbStr = `rgb(${c.r}, ${c.g}, ${c.b})`;

            const card = document.createElement('div');
            card.className = 'palette-card';
            card.innerHTML = `
                <div class="palette-swatch" style="background:${hex}"></div>
                <div class="palette-info">
                    <span class="palette-hex">${hex.toUpperCase()}</span>
                    <span class="palette-rgb">${rgbStr}</span>
                    <button class="palette-copy">Copy HEX</button>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('palette-copy')) {
                    copyToClipboard(hex.toUpperCase(), 'HEX ' + hex.toUpperCase());
                } else {
                    // Set as selected color
                    setSelectedColor(c.r, c.g, c.b, 255);
                }
            });

            paletteGrid.appendChild(card);
        });
    };

    /* ---------- Set selected color ---------- */
    const setSelectedColor = (r, g, b, a) => {
        currentColor = { r, g, b, a };

        const hex = rgbToHex(r, g, b);
        const rgbaStr = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
        const rgbStr = `rgb(${r}, ${g}, ${b})`;
        const hsl = rgbToHsl(r, g, b);
        const hsv = rgbToHsv(r, g, b);
        const cmyk = rgbToCmyk(r, g, b);

        selectedSwatch.style.background = hex;

        colorValues.innerHTML = `
            <div class="color-row">
                <span class="color-label">HEX</span>
                <span class="color-code">${hex.toUpperCase()}</span>
                <button class="color-copy-btn" data-copy="${hex.toUpperCase()}" title="Copy HEX"><i class="fas fa-copy"></i></button>
            </div>
            <div class="color-row">
                <span class="color-label">RGB</span>
                <span class="color-code">${rgbStr}</span>
                <button class="color-copy-btn" data-copy="${rgbStr}" title="Copy RGB"><i class="fas fa-copy"></i></button>
            </div>
            <div class="color-row">
                <span class="color-label">RGBA</span>
                <span class="color-code">${rgbaStr}</span>
                <button class="color-copy-btn" data-copy="${rgbaStr}" title="Copy RGBA"><i class="fas fa-copy"></i></button>
            </div>
            <div class="color-row">
                <span class="color-label">HSL</span>
                <span class="color-code">hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)</span>
                <button class="color-copy-btn" data-copy="hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)" title="Copy HSL"><i class="fas fa-copy"></i></button>
            </div>
            <div class="color-row">
                <span class="color-label">HSV</span>
                <span class="color-code">hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)</span>
                <button class="color-copy-btn" data-copy="hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)" title="Copy HSV"><i class="fas fa-copy"></i></button>
            </div>
            <div class="color-row">
                <span class="color-label">CMYK</span>
                <span class="color-code">cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)</span>
                <button class="color-copy-btn" data-copy="cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)" title="Copy CMYK"><i class="fas fa-copy"></i></button>
            </div>
        `;

        // Attach copy listeners
        colorValues.querySelectorAll('.color-copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(btn.dataset.copy, btn.dataset.copy);
            });
        });
    };

    /* ---------- Canvas picker ---------- */
    const getCanvasCoords = (e) => {
        const rect = pickCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) / rect.width;   // 0..1
        const y = (clientY - rect.top) / rect.height;   // 0..1
        return {
            xPct: Math.max(0, Math.min(1, x)),
            yPct: Math.max(0, Math.min(1, y)),
            clientX, clientY,
            rect
        };
    };

    const pickColorAt = (xPct, yPct) => {
        const x = Math.floor(xPct * originalWidth);
        const y = Math.floor(yPct * originalHeight);
        if (x < 0 || y < 0 || x >= originalWidth || y >= originalHeight) return;

        const px = pickCtx.getImageData(x, y, 1, 1).data;
        setSelectedColor(px[0], px[1], px[2], px[3]);
    };

    const updateMagnifier = (xPct, yPct, clientX, clientY) => {
        // Draw zoomed pixels into magnifier canvas
        const zoomSize = 30; // pixels of source to show (in original image coords)
        const half = zoomSize / 2;
        const srcX = Math.floor(xPct * originalWidth) - half;
        const srcY = Math.floor(yPct * originalHeight) - half;

        // Read pixels from the full-res canvas
        const sampleW = zoomSize;
        const sampleH = zoomSize;
        const sx = Math.max(0, Math.min(originalWidth - sampleW, srcX));
        const sy = Math.max(0, Math.min(originalHeight - sampleH, srcY));

        try {
            const sample = pickCtx.getImageData(sx, sy, sampleW, sampleH);
            magCtx.imageSmoothingEnabled = false;
            magCtx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);
            magCtx.putImageData(sample, 0, 0);

            // Scale up to fill magnifier
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sampleW;
            tempCanvas.height = sampleH;
            tempCanvas.getContext('2d').putImageData(sample, 0, 0);

            magCtx.imageSmoothingEnabled = false;
            magCtx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);
            magCtx.drawImage(tempCanvas, 0, 0, magnifierCanvas.width, magnifierCanvas.height);
        } catch (e) {
            // Ignore errors
        }

        // Position magnifier near cursor
        const wrapRect = pickerWrap.getBoundingClientRect();
        const magSize = 130;
        let left = clientX - wrapRect.left;
        let top = clientY - wrapRect.top - magSize - 10; // above cursor

        // If too close to top, show below
        if (top < 10) top = clientY - wrapRect.top + 20;

        magnifier.style.left = left + 'px';
        magnifier.style.top = top + 'px';
        magnifier.classList.add('active');
    };

    /* ---------- Picker events ---------- */
    const handlePickerMove = (e) => {
        if (!originalImage || busy) return;
        const { xPct, yPct, clientX, clientY } = getCanvasCoords(e);
        updateMagnifier(xPct, yPct, clientX, clientY);
    };

    const handlePickerClick = (e) => {
        if (!originalImage || busy) return;
        const { xPct, yPct } = getCanvasCoords(e);
        pickColorAt(xPct, yPct);
    };

    pickCanvas.addEventListener('mousemove', handlePickerMove);
    pickCanvas.addEventListener('mouseleave', () => {
        magnifier.classList.remove('active');
    });
    pickCanvas.addEventListener('click', handlePickerClick);
    pickCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length) {
            const { xPct, yPct, clientX, clientY } = getCanvasCoords(e);
            updateMagnifier(xPct, yPct, clientX, clientY);
        }
    }, { passive: true });
    pickCanvas.addEventListener('touchmove', (e) => {
        if (e.touches.length) {
            const { xPct, yPct, clientX, clientY } = getCanvasCoords(e);
            updateMagnifier(xPct, yPct, clientX, clientY);
        }
    }, { passive: true });
    pickCanvas.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        if (touch) {
            const rect = pickCanvas.getBoundingClientRect();
            const xPct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
            const yPct = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
            pickColorAt(xPct, yPct);
        }
        setTimeout(() => magnifier.classList.remove('active'), 600);
    });

    /* ---------- Upload events ---------- */
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4f46e5';
        uploadArea.style.background = '#eef2ff';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#c7d2fe';
        uploadArea.style.background = '#f8faff';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#c7d2fe';
        uploadArea.style.background = '#f8faff';
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

    replaceBtn.addEventListener('click', () => {
        // Show upload area and reset
        resetAll();
        setTimeout(() => fileInput.click(), 100);
    });
    removeBtn.addEventListener('click', resetAll);
    pickAnotherBtn.addEventListener('click', resetAll);

    const resetAll = () => {
        editorSection.classList.add('hidden');
        successAnimation.classList.add('hidden');
        processingAnimation.classList.add('hidden');
        uploadArea.classList.remove('hidden');
        currentFile = null;
        originalImage = null;
        dominantColors = [];
        busy = false;
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    /* ---------- Palette downloads ---------- */
    const triggerDownload = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    downloadJsonBtn.addEventListener('click', () => {
        if (dominantColors.length === 0) return;
        const data = dominantColors.map((c, i) => ({
            index: i + 1,
            hex: rgbToHex(c.r, c.g, c.b).toUpperCase(),
            rgb: { r: c.r, g: c.g, b: c.b },
            hsl: rgbToHsl(c.r, c.g, c.b)
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        triggerDownload(blob, 'palette_' + Date.now() + '.json');
        showToast('📥 JSON palette downloaded!');
    });

    downloadCssBtn.addEventListener('click', () => {
        if (dominantColors.length === 0) return;
        let css = ':root {\n';
        dominantColors.forEach((c, i) => {
            const hex = rgbToHex(c.r, c.g, c.b);
            css += `  --color-${i + 1}: ${hex};\n`;
        });
        css += '}\n';
        const blob = new Blob([css], { type: 'text/css' });
        triggerDownload(blob, 'palette_' + Date.now() + '.css');
        showToast('📥 CSS palette downloaded!');
    });

    downloadTxtBtn.addEventListener('click', () => {
        if (dominantColors.length === 0) return;
        let txt = 'CrafterTools · Color Palette\n';
        txt += '='.repeat(40) + '\n\n';
        dominantColors.forEach((c, i) => {
            const hex = rgbToHex(c.r, c.g, c.b).toUpperCase();
            const rgbStr = `rgb(${c.r}, ${c.g}, ${c.b})`;
            txt += `${(i + 1).toString().padStart(2)}. ${hex}  |  ${rgbStr}\n`;
        });
        const blob = new Blob([txt], { type: 'text/plain' });
        triggerDownload(blob, 'palette_' + Date.now() + '.txt');
        showToast('📥 TXT palette downloaded!');
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