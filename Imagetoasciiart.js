/* ============================================================
   CrafterTools · Image to ASCII Art
   Vanilla JS — Canvas API, 100% browser-based, no server
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- Charset definitions (dark → light) ---------- */
    const CHARSETS = {
        standard: '@%#*+=-:. ',
        detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
        blocks: '▓▒░ ',
        symbols: '◆◉●○◍◎◇▪▫▬ ',
        numbers: '9876543210 '
    };

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const previewImage = document.getElementById('previewImage');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewType = document.getElementById('previewType');
    const replaceBtn = document.getElementById('replaceBtn');
    const removeBtn = document.getElementById('removeBtn');

    const charsetSelect = document.getElementById('charsetSelect');
    const customCharsGroup = document.getElementById('customCharsGroup');
    const customChars = document.getElementById('customChars');
    const widthSlider = document.getElementById('widthSlider');
    const widthReadout = document.getElementById('widthReadout');
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessReadout = document.getElementById('brightnessReadout');
    const contrastSlider = document.getElementById('contrastSlider');
    const contrastReadout = document.getElementById('contrastReadout');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeReadout = document.getElementById('fontSizeReadout');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const bgColor = document.getElementById('bgColor');
    const bgColorValue = document.getElementById('bgColorValue');
    const invertToggle = document.getElementById('invertToggle');
    const colorToggle = document.getElementById('colorToggle');
    const aspectToggle = document.getElementById('aspectToggle');

    const generateBtn = document.getElementById('generateBtn');
    const processingAnimation = document.getElementById('processingAnimation');
    const processingRing = document.getElementById('processingRing');
    const processingPercent = document.getElementById('processingPercent');
    const processingStatus = document.getElementById('processingStatus');
    const processingBarFill = document.getElementById('processingBarFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const asciiOutput = document.getElementById('asciiOutput');
    const asciiPreviewWrap = document.getElementById('asciiPreviewWrap');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const zoomLevel = document.getElementById('zoomLevel');
    const detailChars = document.getElementById('detailChars');
    const detailResolution = document.getElementById('detailResolution');
    const detailTime = document.getElementById('detailTime');
    const detailFontSize = document.getElementById('detailFontSize');
    const copyBtn = document.getElementById('copyBtn');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');
    const downloadPngBtn = document.getElementById('downloadPngBtn');
    const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
    const generateAnotherBtn = document.getElementById('generateAnotherBtn');

    const toast = document.getElementById('toast');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let asciiText = '';
    let asciiHTML = '';
    let currentZoom = 1;
    let processingTime = 0;
    let outputCols = 0, outputRows = 0;
    let busy = false;

    const RING_CIRCUMFERENCE = 2 * Math.PI * 34; // ≈ 213.6

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
            alert('Unsupported image format. Please use JPG, PNG or WEBP.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File too large. Max 20MB.');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;

        editorSection.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        processingAnimation.classList.add('hidden');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate ASCII Art';

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

                generateBtn.disabled = false;
            };
            img.onerror = () => alert('Could not load image. Please try another file.');
            img.src = e.target.result;
        };
        reader.onerror = () => alert('Could not read file.');
        reader.readAsDataURL(file);
    };

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

    replaceBtn.addEventListener('click', () => fileInput.click());
    removeBtn.addEventListener('click', () => resetAll());

    /* ---------- Settings ---------- */
    charsetSelect.addEventListener('change', (e) => {
        customCharsGroup.style.display = e.target.value === 'custom' ? 'flex' : 'none';
    });
    widthSlider.addEventListener('input', (e) => {
        widthReadout.textContent = e.target.value;
    });
    brightnessSlider.addEventListener('input', (e) => {
        brightnessReadout.textContent = e.target.value;
    });
    contrastSlider.addEventListener('input', (e) => {
        contrastReadout.textContent = e.target.value;
    });
    fontSizeSlider.addEventListener('input', (e) => {
        fontSizeReadout.textContent = e.target.value + 'px';
        if (asciiOutput) {
            asciiOutput.style.fontSize = e.target.value + 'px';
        }
    });
    bgColor.addEventListener('input', (e) => {
        bgColorValue.textContent = e.target.value.toUpperCase();
    });

    /* ---------- Reset ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        processingAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        asciiText = '';
        asciiHTML = '';
        currentZoom = 1;
        busy = false;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate ASCII Art';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    generateAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Processing messages ---------- */
    const PROCESSING_MESSAGES = [
        'Reading image...',
        'Optimizing pixels...',
        'Generating ASCII...',
        'Rendering output...',
        'Finalizing...'
    ];

    let messageIndex = 0;
    let messageInterval = null;

    const startMessageRotation = () => {
        messageIndex = 0;
        processingStatus.textContent = PROCESSING_MESSAGES[0];
        messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % PROCESSING_MESSAGES.length;
            processingStatus.style.opacity = '0';
            setTimeout(() => {
                processingStatus.textContent = PROCESSING_MESSAGES[messageIndex];
                processingStatus.style.opacity = '1';
            }, 150);
        }, 400);
    };

    const stopMessageRotation = () => {
        if (messageInterval) {
            clearInterval(messageInterval);
            messageInterval = null;
        }
    };

    /* ---------- Core ASCII conversion ---------- */
    const generateAscii = () => {
        // Determine character set
        let charset;
        if (charsetSelect.value === 'custom') {
            charset = customChars.value || '@%#*+=-:. ';
        } else {
            charset = CHARSETS[charsetSelect.value];
        }

        // Read settings
        const targetWidth = parseInt(widthSlider.value, 10);
        const brightness = parseInt(brightnessSlider.value, 10);
        const contrast = parseInt(contrastSlider.value, 10);
        const invert = invertToggle.checked;
        const colored = colorToggle.checked;
        const preserveAspect = aspectToggle.checked;
        const bgHex = bgColor.value;

        // Create canvas at target width
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate height based on aspect ratio
        let targetHeight;
        if (preserveAspect) {
            // Character aspect ratio correction (characters are taller than wide)
            const charAspect = 0.5;
            targetHeight = Math.round(targetWidth * (originalHeight / originalWidth) * charAspect);
        } else {
            targetHeight = targetWidth;
        }
        targetHeight = Math.max(1, targetHeight);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw image scaled to target size
        ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);

        // Get pixel data
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const pixels = imgData.data;

        outputCols = targetWidth;
        outputRows = targetHeight;

        // Build ASCII
        let ascii = '';
        let htmlParts = [];

        const charsetLength = charset.length;
        const brightnessOffset = brightness / 100;
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const idx = (y * targetWidth + x) * 4;
                let r = pixels[idx];
                let g = pixels[idx + 1];
                let b = pixels[idx + 2];

                // Apply brightness
                r = Math.max(0, Math.min(255, r + brightnessOffset * 255));
                g = Math.max(0, Math.min(255, g + brightnessOffset * 255));
                b = Math.max(0, Math.min(255, b + brightnessOffset * 255));

                // Apply contrast
                r = Math.max(0, Math.min(255, contrastFactor * (r - 128) + 128));
                g = Math.max(0, Math.min(255, contrastFactor * (g - 128) + 128));
                b = Math.max(0, Math.min(255, contrastFactor * (b - 128) + 128));

                // Calculate luminance
                let luminance = 0.299 * r + 0.587 * g + 0.114 * b;

                if (invert) luminance = 255 - luminance;

                // Map to character
                const charIdx = Math.min(
                    charsetLength - 1,
                    Math.floor((luminance / 255) * (charsetLength - 1))
                );
                const ch = charset[charIdx];

                ascii += ch;

                if (colored) {
                    const rr = Math.round(r);
                    const gg = Math.round(g);
                    const bb = Math.round(b);
                    // Escape for HTML
                    const escCh = ch === ' ' ? '&nbsp;' :
                                  ch === '<' ? '&lt;' :
                                  ch === '>' ? '&gt;' :
                                  ch === '&' ? '&amp;' : ch;
                    htmlParts.push(`<span style="color:rgb(${rr},${gg},${bb})">${escCh}</span>`);
                }
            }
            ascii += '\n';
            if (colored) htmlParts.push('\n');
        }

        return {
            text: ascii,
            html: colored ? htmlParts.join('') : null,
            cols: targetWidth,
            rows: targetHeight,
            bgHex: bgHex,
            fontSize: parseInt(fontSizeSlider.value, 10),
            fontFamily: fontFamilySelect.value
        };
    };

    /* ---------- Generate button ---------- */
    generateBtn.addEventListener('click', async () => {
        if (!originalImage) {
            alert('Please upload an image first.');
            return;
        }
        if (busy) return;
        busy = true;

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        processingAnimation.classList.remove('hidden');
        processingBarFill.style.width = '0%';
        processingRing.style.strokeDashoffset = RING_CIRCUMFERENCE;
        processingPercent.textContent = '0%';
        startMessageRotation();

        const t0 = performance.now();

        try {
            // Simulate progress
            const totalSteps = 20;
            for (let i = 1; i <= totalSteps; i++) {
                await new Promise(r => setTimeout(r, 30));
                const percent = Math.round((i / totalSteps) * 100);
                processingBarFill.style.width = percent + '%';
                processingRing.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - percent / 100);
                processingPercent.textContent = percent + '%';
            }

            // Actually generate (synchronous but fast)
            const result = generateAscii();
            asciiText = result.text;
            asciiHTML = result.html;
            processingTime = ((performance.now() - t0) / 1000).toFixed(2);

            stopMessageRotation();
            processingAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                populateResult(result);
                busy = false;
                generateBtn.innerHTML = '<i class="fas fa-check"></i> Generated!';
                generateBtn.disabled = false;
            }, 700);

        } catch (err) {
            console.error(err);
            stopMessageRotation();
            processingAnimation.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate ASCII Art';
            busy = false;
            alert('Processing failed. Please try again.');
        }
    });

    /* ---------- Populate result ---------- */
    const populateResult = (result) => {
        currentZoom = 1;
        zoomLevel.textContent = '100%';

        if (result.html) {
            asciiOutput.innerHTML = result.html;
        } else {
            asciiOutput.textContent = result.text;
        }
        asciiOutput.style.fontSize = result.fontSize + 'px';
        asciiOutput.style.fontFamily = result.fontFamily;
        asciiOutput.style.background = result.bgHex;
        asciiOutput.style.transform = 'scale(1)';
        asciiPreviewWrap.style.background = '#0f172a';

        detailChars.textContent = result.text.length.toLocaleString();
        detailResolution.textContent = `${result.cols} × ${result.rows}`;
        detailTime.textContent = processingTime + 's';
        detailFontSize.textContent = result.fontSize + 'px';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    /* ---------- Zoom controls ---------- */
    const updateZoom = () => {
        asciiOutput.style.transform = `scale(${currentZoom})`;
        zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
    };
    zoomInBtn.addEventListener('click', () => {
        currentZoom = Math.min(currentZoom + 0.2, 3);
        updateZoom();
    });
    zoomOutBtn.addEventListener('click', () => {
        currentZoom = Math.max(currentZoom - 0.2, 0.3);
        updateZoom();
    });
    resetZoomBtn.addEventListener('click', () => {
        currentZoom = 1;
        updateZoom();
    });

    /* ---------- Copy ---------- */
    copyBtn.addEventListener('click', async () => {
        if (!asciiText) return;
        try {
            await navigator.clipboard.writeText(asciiText);
            showToast('📋 ASCII art copied!');
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy ASCII';
            }, 2000);
        } catch (err) {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = asciiText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('📋 ASCII art copied!');
        }
    });

    /* ---------- Download TXT ---------- */
    downloadTxtBtn.addEventListener('click', () => {
        if (!asciiText) return;
        const blob = new Blob([asciiText], { type: 'text/plain' });
        triggerDownload(blob, 'ascii_art_' + Date.now() + '.txt');
        showToast('📥 Download started!');
    });

    /* ---------- Download PNG ---------- */
    downloadPngBtn.addEventListener('click', () => {
        if (!asciiText) return;

        // Render ASCII to canvas
        const fontSize = parseInt(fontSizeSlider.value, 10);
        const fontFamily = fontFamilySelect.value;
        const bgHex = bgColor.value;
        const isColored = colorToggle.checked;

        // Create a temporary canvas to measure
        const measureCanvas = document.createElement('canvas');
        const mctx = measureCanvas.getContext('2d');
        mctx.font = `${fontSize}px ${fontFamily}`;
        const charWidth = mctx.measureText('M').width;
        const lineHeight = fontSize * 1.1;

        const lines = asciiText.split('\n');
        const maxCols = Math.max(...lines.map(l => l.length));
        const numRows = lines.length;

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(maxCols * charWidth) + 20;
        canvas.height = Math.ceil(numRows * lineHeight) + 20;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Text
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'top';

        // For colored mode we need pixel data — re-generate with color
        if (isColored) {
            // Re-render using the same logic to get per-pixel colors
            renderColoredAsciiToCanvas(ctx, canvas, fontSize, fontFamily, lineHeight, charWidth);
        } else {
            ctx.fillStyle = invertToggle.checked ? '#ffffff' : '#1e1b4b';
            lines.forEach((line, i) => {
                ctx.fillText(line, 10, 10 + i * lineHeight);
            });
        }

        canvas.toBlob((blob) => {
            triggerDownload(blob, 'ascii_art_' + Date.now() + '.png');
            showToast('📥 PNG download started!');
        }, 'image/png');
    });

    /* ---------- Render colored ASCII to canvas for PNG export ---------- */
    const renderColoredAsciiToCanvas = (ctx, canvas, fontSize, fontFamily, lineHeight, charWidth) => {
        // Recreate canvas data for colored rendering
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const targetWidth = outputCols;
        const targetHeight = outputRows;
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        tempCtx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);
        const data = tempCtx.getImageData(0, 0, targetWidth, targetHeight).data;

        const brightness = parseInt(brightnessSlider.value, 10);
        const contrast = parseInt(contrastSlider.value, 10);
        const invert = invertToggle.checked;
        const brightnessOffset = brightness / 100;
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        let charset;
        if (charsetSelect.value === 'custom') charset = customChars.value || '@%#*+=-:. ';
        else charset = CHARSETS[charsetSelect.value];
        const charsetLength = charset.length;

        ctx.textBaseline = 'top';
        ctx.font = `${fontSize}px ${fontFamily}`;

        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const idx = (y * targetWidth + x) * 4;
                let r = data[idx], g = data[idx + 1], b = data[idx + 2];

                r = Math.max(0, Math.min(255, r + brightnessOffset * 255));
                g = Math.max(0, Math.min(255, g + brightnessOffset * 255));
                b = Math.max(0, Math.min(255, b + brightnessOffset * 255));
                r = Math.max(0, Math.min(255, contrastFactor * (r - 128) + 128));
                g = Math.max(0, Math.min(255, contrastFactor * (g - 128) + 128));
                b = Math.max(0, Math.min(255, contrastFactor * (b - 128) + 128));

                let lum = 0.299 * r + 0.587 * g + 0.114 * b;
                if (invert) lum = 255 - lum;

                const charIdx = Math.min(charsetLength - 1, Math.floor((lum / 255) * (charsetLength - 1)));
                const ch = charset[charIdx];

                ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
                ctx.fillText(ch, 10 + x * charWidth, 10 + y * lineHeight);
            }
        }
    };

    /* ---------- Download HTML ---------- */
    downloadHtmlBtn.addEventListener('click', () => {
        if (!asciiText) return;

        const fontSize = parseInt(fontSizeSlider.value, 10);
        const fontFamily = fontFamilySelect.value;
        const bgHex = bgColor.value;
        const isColored = colorToggle.checked;

        let contentHtml;
        if (isColored && asciiHTML) {
            contentHtml = asciiHTML;
        } else {
            // Escape
            const esc = asciiText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            contentHtml = esc;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ASCII Art - CrafterTools</title>
<style>
    body {
        margin: 0;
        padding: 20px;
        background: #f9fafc;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        min-height: 100vh;
        font-family: system-ui, sans-serif;
    }
    pre {
        background: ${bgHex};
        color: #1e1b4b;
        padding: 20px;
        border-radius: 12px;
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        line-height: 1.1;
        white-space: pre;
        overflow: auto;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
        margin: 0;
    }
</style>
</head>
<body>
<pre>${contentHtml}</pre>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        triggerDownload(blob, 'ascii_art_' + Date.now() + '.html');
        showToast('📥 HTML download started!');
    });

    /* ---------- Download helper ---------- */
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