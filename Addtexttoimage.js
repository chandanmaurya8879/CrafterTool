/* ============================================================
   CrafterTools · Add Text to Image
   Vanilla JS — Canvas API, fully offline
   Multiple text layers • drag to position • custom fonts/colors
   UNIQUE animation: typewriter reveal + glowing progress line
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- DOM ---------- */
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewLayers = document.getElementById('previewLayers');
    const resetBtn = document.getElementById('resetBtn');

    const editCanvas = document.getElementById('editCanvas');
    const canvasWrap = document.getElementById('canvasWrap');
    const textHandle = document.getElementById('textHandle');

    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const fontFamily = document.getElementById('fontFamily');
    const fontSize = document.getElementById('fontSize');
    const sizeReadout = document.getElementById('sizeReadout');
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');
    const textColor = document.getElementById('textColor');
    const colorValue = document.getElementById('colorValue');
    const bgToggle = document.getElementById('bgToggle');
    const bgColorWrap = document.getElementById('bgColorWrap');
    const bgColor = document.getElementById('bgColor');

    const addLayerBtn = document.getElementById('addLayerBtn');
    const updateLayerBtn = document.getElementById('updateLayerBtn');
    const deleteLayerBtn = document.getElementById('deleteLayerBtn');
    const layersList = document.getElementById('layersList');

    const applyBtn = document.getElementById('applyBtn');
    const renderAnimation = document.getElementById('renderAnimation');
    const glowLine = document.getElementById('glowLine');
    const typewriterImg = document.getElementById('typewriterImg');
    const renderStatus = document.getElementById('renderStatus');
    const renderCountValue = document.getElementById('renderCountValue');
    const renderProgressFill = document.getElementById('renderProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const resultImage = document.getElementById('resultImage');
    const detailFilename = document.getElementById('detailFilename');
    const detailResolution = document.getElementById('detailResolution');
    const detailLayers = document.getElementById('detailLayers');
    const detailSize = document.getElementById('detailSize');
    const processTime = document.getElementById('processTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const editAnotherBtn = document.getElementById('editAnotherBtn');

    const toast = document.getElementById('toast');

    const ctx = editCanvas.getContext('2d');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let outputFormat = 'image/png';
    let layers = [];          // Array of text layer objects
    let selectedLayerId = null;
    let layerIdCounter = 0;
    let busy = false;

    // Style state for the current "new text" being composed
    let styleState = {
        bold: false,
        italic: false,
        underline: false
    };

    // Drag state
    let isDragging = false;
    let dragStart = null;
    let dragLayerStart = null;
    let canvasScaleX = 1, canvasScaleY = 1;

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

        editorSection.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        renderAnimation.classList.add('hidden');
        applyBtn.disabled = true;

        // Reset layers
        layers = [];
        selectedLayerId = null;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                originalWidth = img.width;
                originalHeight = img.height;

                // Set canvas size to image resolution
                editCanvas.width = originalWidth;
                editCanvas.height = originalHeight;

                // Fit canvas within container
                fitCanvasToContainer();

                previewName.textContent = file.name;
                previewSize.textContent = formatSize(file.size);
                previewDimensions.textContent = `${img.width} × ${img.height}`;
                updateLayersUI();

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

        editCanvas.style.width = displayW + 'px';
        editCanvas.style.height = displayH + 'px';

        // Scale factor: canvas coord → CSS px
        canvasScaleX = displayW / originalWidth;
        canvasScaleY = displayH / originalHeight;

        // Update handle if selected
        updateHandle();
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

    /* ---------- Reset ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        renderAnimation.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        layers = [];
        selectedLayerId = null;
        busy = false;
        applyBtn.disabled = true;
        renderProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    editAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Style controls ---------- */
    boldBtn.addEventListener('click', () => {
        styleState.bold = !styleState.bold;
        boldBtn.classList.toggle('active', styleState.bold);
        if (selectedLayerId) applyStyleToSelected({ bold: styleState.bold });
    });
    italicBtn.addEventListener('click', () => {
        styleState.italic = !styleState.italic;
        italicBtn.classList.toggle('active', styleState.italic);
        if (selectedLayerId) applyStyleToSelected({ italic: styleState.italic });
    });
    underlineBtn.addEventListener('click', () => {
        styleState.underline = !styleState.underline;
        underlineBtn.classList.toggle('active', styleState.underline);
        if (selectedLayerId) applyStyleToSelected({ underline: styleState.underline });
    });

    fontSize.addEventListener('input', (e) => {
        sizeReadout.textContent = e.target.value + 'px';
        if (selectedLayerId) applyStyleToSelected({ size: parseInt(e.target.value, 10) });
    });

    fontFamily.addEventListener('change', (e) => {
        if (selectedLayerId) applyStyleToSelected({ family: e.target.value });
    });

    textColor.addEventListener('input', (e) => {
        const v = e.target.value.toUpperCase();
        colorValue.textContent = v;
        if (selectedLayerId) applyStyleToSelected({ color: v });
    });

    document.querySelectorAll('.quick-color').forEach(btn => {
        btn.addEventListener('click', () => {
            const c = btn.dataset.color;
            textColor.value = c;
            colorValue.textContent = c.toUpperCase();
            if (selectedLayerId) applyStyleToSelected({ color: c });
        });
    });

    bgToggle.addEventListener('change', (e) => {
        bgColorWrap.style.display = e.target.checked ? 'flex' : 'none';
        if (selectedLayerId) {
            applyStyleToSelected({
                bgEnabled: e.target.checked,
                bgColor: bgColor.value
            });
        }
    });

    bgColor.addEventListener('input', (e) => {
        if (selectedLayerId) applyStyleToSelected({ bgColor: e.target.value });
    });

    const applyStyleToSelected = (patch) => {
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) return;
        Object.assign(layer, patch);
        drawAll();
        updateHandle();
    };

    /* ---------- Text input ---------- */
    textInput.addEventListener('input', () => {
        charCount.textContent = textInput.value.length;
    });

    /* ---------- Add layer ---------- */
    addLayerBtn.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (!text) {
            showToast('⚠️ Please type some text first');
            textInput.focus();
            return;
        }

        const layer = {
            id: ++layerIdCounter,
            text: text,
            x: originalWidth / 2,
            y: originalHeight / 2,
            family: fontFamily.value,
            size: parseInt(fontSize.value, 10),
            color: textColor.value,
            bold: styleState.bold,
            italic: styleState.italic,
            underline: styleState.underline,
            bgEnabled: bgToggle.checked,
            bgColor: bgColor.value,
            align: 'center'
        };

        layers.push(layer);
        selectedLayerId = layer.id;
        textInput.value = '';
        charCount.textContent = '0';

        drawAll();
        updateLayersUI();
        selectLayer(layer.id);
    });

    /* ---------- Update selected layer ---------- */
    updateLayerBtn.addEventListener('click', () => {
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) return;

        const text = textInput.value.trim();
        if (text) layer.text = text;

        layer.family = fontFamily.value;
        layer.size = parseInt(fontSize.value, 10);
        layer.color = textColor.value;
        layer.bold = styleState.bold;
        layer.italic = styleState.italic;
        layer.underline = styleState.underline;
        layer.bgEnabled = bgToggle.checked;
        layer.bgColor = bgColor.value;

        drawAll();
        updateLayersUI();
        showToast('✅ Text updated');
    });

    /* ---------- Delete selected layer ---------- */
    deleteLayerBtn.addEventListener('click', () => {
        if (!selectedLayerId) return;
        layers = layers.filter(l => l.id !== selectedLayerId);
        selectedLayerId = null;
        textHandle.style.display = 'none';
        updateLayerBtn.disabled = true;
        deleteLayerBtn.disabled = true;
        drawAll();
        updateLayersUI();
    });

    /* ---------- Draw ---------- */
    const drawAll = () => {
        if (!originalImage) return;
        ctx.clearRect(0, 0, editCanvas.width, editCanvas.height);
        ctx.drawImage(originalImage, 0, 0);
        layers.forEach(layer => drawLayer(layer));
    };

    const drawLayer = (layer) => {
        const { text, x, y, family, size, color, bold, italic, underline, bgEnabled, bgColor } = layer;

        ctx.save();
        ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${family}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = text.split('\n');
        const lineHeight = size * 1.2;
        const totalHeight = lines.length * lineHeight;
        const startY = y - totalHeight / 2 + lineHeight / 2;

        // Measure widest line
        let maxWidth = 0;
        lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxWidth) maxWidth = w;
        });

        // Background box
        if (bgEnabled) {
            const pad = size * 0.3;
            ctx.fillStyle = bgColor;
            ctx.fillRect(
                x - maxWidth / 2 - pad,
                y - totalHeight / 2 - pad,
                maxWidth + pad * 2,
                totalHeight + pad * 2
            );
        }

        // Text
        ctx.fillStyle = color;
        lines.forEach((line, i) => {
            const lineY = startY + i * lineHeight;
            ctx.fillText(line, x, lineY);

            if (underline) {
                const w = ctx.measureText(line).width;
                const uY = lineY + size * 0.35;
                ctx.strokeStyle = color;
                ctx.lineWidth = Math.max(1, size * 0.06);
                ctx.beginPath();
                ctx.moveTo(x - w / 2, uY);
                ctx.lineTo(x + w / 2, uY);
                ctx.stroke();
            }
        });

        // Selection box
        if (layer.id === selectedLayerId) {
            const pad = size * 0.3 + 4;
            ctx.strokeStyle = '#8b5cf6';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 2;
            ctx.strokeRect(
                x - maxWidth / 2 - pad,
                y - totalHeight / 2 - pad,
                maxWidth + pad * 2,
                totalHeight + pad * 2
            );
            ctx.setLineDash([]);
        }

        ctx.restore();
    };

    /* ---------- Update handle position ---------- */
    const updateHandle = () => {
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) {
            textHandle.style.display = 'none';
            return;
        }

        ctx.save();
        ctx.font = `${layer.italic ? 'italic ' : ''}${layer.bold ? 'bold ' : ''}${layer.size}px ${layer.family}`;
        const lines = layer.text.split('\n');
        const lineHeight = layer.size * 1.2;
        const totalHeight = lines.length * lineHeight;
        let maxWidth = 0;
        lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxWidth) maxWidth = w;
        });
        ctx.restore();

        const pad = layer.size * 0.3 + 4;
        const x = (layer.x - maxWidth / 2 - pad) * canvasScaleX;
        const y = (layer.y - totalHeight / 2 - pad) * canvasScaleY;
        const w = (maxWidth + pad * 2) * canvasScaleX;
        const h = (totalHeight + pad * 2) * canvasScaleY;

        const canvasRect = editCanvas.getBoundingClientRect();
        const wrapRect = canvasWrap.getBoundingClientRect();

        textHandle.style.display = 'block';
        textHandle.style.left = (canvasRect.left - wrapRect.left + x) + 'px';
        textHandle.style.top = (canvasRect.top - wrapRect.top + y) + 'px';
        textHandle.style.width = w + 'px';
        textHandle.style.height = h + 'px';
    };

    /* ---------- Layers UI ---------- */
    const updateLayersUI = () => {
        previewLayers.textContent = `Text layers: ${layers.length}`;
        applyBtn.disabled = layers.length === 0;

        if (layers.length === 0) {
            layersList.innerHTML = '<p class="layers-empty">No text layers yet. Type something above and click "Add Text".</p>';
            return;
        }

        layersList.innerHTML = '';
        layers.forEach(layer => {
            const item = document.createElement('div');
            item.className = 'layer-item' + (layer.id === selectedLayerId ? ' selected' : '');
            item.dataset.id = layer.id;
            item.innerHTML = `
                <span class="layer-color-dot" style="background:${layer.color}"></span>
                <span class="layer-text">${escapeHtml(layer.text.split('\n')[0])}</span>
                <button class="layer-delete" title="Delete" data-id="${layer.id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            item.addEventListener('click', (e) => {
                if (e.target.closest('.layer-delete')) return;
                selectLayer(layer.id);
            });
            item.querySelector('.layer-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                layers = layers.filter(l => l.id !== layer.id);
                if (selectedLayerId === layer.id) {
                    selectedLayerId = null;
                    textHandle.style.display = 'none';
                }
                drawAll();
                updateLayersUI();
            });
            layersList.appendChild(item);
        });
    };

    const escapeHtml = (s) => {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    };

    const selectLayer = (id) => {
        selectedLayerId = id;
        const layer = layers.find(l => l.id === id);
        if (!layer) return;

        // Populate controls with layer's settings
        textInput.value = layer.text;
        charCount.textContent = layer.text.length;
        fontFamily.value = layer.family;
        fontSize.value = layer.size;
        sizeReadout.textContent = layer.size + 'px';
        textColor.value = layer.color;
        colorValue.textContent = layer.color.toUpperCase();
        bgToggle.checked = layer.bgEnabled;
        bgColorWrap.style.display = layer.bgEnabled ? 'flex' : 'none';
        bgColor.value = layer.bgColor;

        styleState.bold = layer.bold;
        styleState.italic = layer.italic;
        styleState.underline = layer.underline;
        boldBtn.classList.toggle('active', layer.bold);
        italicBtn.classList.toggle('active', layer.italic);
        underlineBtn.classList.toggle('active', layer.underline);

        updateLayerBtn.disabled = false;
        deleteLayerBtn.disabled = false;

        drawAll();
        updateLayersUI();
        updateHandle();
    };

    /* ---------- Canvas drag ---------- */
    const getCanvasPos = (e) => {
        const rect = editCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / canvasScaleX,
            y: (clientY - rect.top) / canvasScaleY
        };
    };

    const hitTestLayer = (pos) => {
        // Check from topmost (last) to bottom
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            ctx.save();
            ctx.font = `${layer.italic ? 'italic ' : ''}${layer.bold ? 'bold ' : ''}${layer.size}px ${layer.family}`;
            const lines = layer.text.split('\n');
            const lineHeight = layer.size * 1.2;
            const totalHeight = lines.length * lineHeight;
            let maxWidth = 0;
            lines.forEach(line => {
                const w = ctx.measureText(line).width;
                if (w > maxWidth) maxWidth = w;
            });
            ctx.restore();

            const pad = layer.size * 0.3;
            const left = layer.x - maxWidth / 2 - pad;
            const top = layer.y - totalHeight / 2 - pad;
            const right = layer.x + maxWidth / 2 + pad;
            const bottom = layer.y + totalHeight / 2 + pad;

            if (pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom) {
                return layer;
            }
        }
        return null;
    };

    const onPointerDown = (e) => {
        const pos = getCanvasPos(e);
        const layer = hitTestLayer(pos);

        if (layer) {
            selectedLayerId = layer.id;
            selectLayer(layer.id);
            isDragging = true;
            dragStart = pos;
            dragLayerStart = { x: layer.x, y: layer.y };
            editCanvas.classList.add('dragging');
            e.preventDefault();
        }
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;
        const pos = getCanvasPos(e);
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) return;

        layer.x = dragLayerStart.x + (pos.x - dragStart.x);
        layer.y = dragLayerStart.y + (pos.y - dragStart.y);

        // Clamp to canvas
        layer.x = Math.max(0, Math.min(layer.x, originalWidth));
        layer.y = Math.max(0, Math.min(layer.y, originalHeight));

        drawAll();
        updateHandle();
        e.preventDefault();
    };

    const onPointerUp = () => {
        isDragging = false;
        editCanvas.classList.remove('dragging');
    };

    editCanvas.addEventListener('mousedown', onPointerDown);
    editCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    /* ---------- Render & apply ---------- */
    const STAGES = [
        { until: 15, text: 'Preparing Canvas...' },
        { until: 38, text: 'Rendering Text Layers...' },
        { until: 62, text: 'Compositing Image...' },
        { until: 85, text: 'Encoding...' },
        { until: 100, text: 'Complete!' }
    ];

    const animateRender = (duration = 2400) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        glowLine.classList.add('active');

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            renderProgressFill.style.width = percent + '%';
            renderCountValue.textContent = percent;

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                renderStatus.style.opacity = '0';
                setTimeout(() => {
                    renderStatus.textContent = stage.text;
                    renderStatus.style.opacity = '1';
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

    const renderFinalImage = () => new Promise((resolve) => {
        // Use a fresh canvas at full resolution
        const out = document.createElement('canvas');
        out.width = originalWidth;
        out.height = originalHeight;
        const octx = out.getContext('2d');

        if (outputFormat === 'image/jpeg') {
            octx.fillStyle = '#ffffff';
            octx.fillRect(0, 0, out.width, out.height);
        }
        octx.drawImage(originalImage, 0, 0);

        layers.forEach(layer => {
            octx.save();
            octx.font = `${layer.italic ? 'italic ' : ''}${layer.bold ? 'bold ' : ''}${layer.size}px ${layer.family}`;
            octx.textAlign = 'center';
            octx.textBaseline = 'middle';

            const lines = layer.text.split('\n');
            const lineHeight = layer.size * 1.2;
            const totalHeight = lines.length * lineHeight;
            const startY = layer.y - totalHeight / 2 + lineHeight / 2;

            let maxWidth = 0;
            lines.forEach(line => {
                const w = octx.measureText(line).width;
                if (w > maxWidth) maxWidth = w;
            });

            if (layer.bgEnabled) {
                const pad = layer.size * 0.3;
                octx.fillStyle = layer.bgColor;
                octx.fillRect(
                    layer.x - maxWidth / 2 - pad,
                    layer.y - totalHeight / 2 - pad,
                    maxWidth + pad * 2,
                    totalHeight + pad * 2
                );
            }

            octx.fillStyle = layer.color;
            lines.forEach((line, i) => {
                const lineY = startY + i * lineHeight;
                octx.fillText(line, layer.x, lineY);

                if (layer.underline) {
                    const w = octx.measureText(line).width;
                    const uY = lineY + layer.size * 0.35;
                    octx.strokeStyle = layer.color;
                    octx.lineWidth = Math.max(1, layer.size * 0.06);
                    octx.beginPath();
                    octx.moveTo(layer.x - w / 2, uY);
                    octx.lineTo(layer.x + w / 2, uY);
                    octx.stroke();
                }
            });
            octx.restore();
        });

        const quality = outputFormat === 'image/jpeg' ? 0.92 : undefined;
        out.toBlob((blob) => {
            if (!blob) return resolve(null);
            resolve({ blob, dataUrl: out.toDataURL(outputFormat, quality) });
        }, outputFormat, quality);
    });

    applyBtn.addEventListener('click', async () => {
        if (!originalImage || layers.length === 0 || busy) return;
        busy = true;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rendering...';
        renderAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        typewriterImg.src = editCanvas.toDataURL('image/png');
        renderProgressFill.style.width = '0%';
        renderCountValue.textContent = '0';
        renderStatus.textContent = 'Preparing Canvas...';
        renderStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            const animationPromise = animateRender(2400);
            const renderPromise = renderFinalImage();
            const [, result] = await Promise.all([animationPromise, renderPromise]);

            if (!result) throw new Error('Render failed');

            renderAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                applyBtn.innerHTML = '<i class="fas fa-check"></i> Rendered!';
                applyBtn.disabled = false;

                populateResult(result, timeTaken);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            renderAnimation.classList.add('hidden');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-download"></i> Download Image';
            busy = false;
            alert('Render failed. Please try again.');
        }
    });

    const populateResult = (result, time) => {
        resultImage.src = result.dataUrl;

        detailFilename.textContent = currentFile.name.replace(/\.[^/.]+$/, '') +
            (outputFormat === 'image/png' ? '_text.png' : '_text.jpg');
        detailResolution.textContent = `${originalWidth} × ${originalHeight}`;
        detailLayers.textContent = layers.length;
        detailSize.textContent = formatSize(result.blob.size);
        processTime.textContent = time + 's';

        // Store blob for download
        resultCard._blob = result.blob;

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadBtn.disabled = false;
    };

    downloadBtn.addEventListener('click', () => {
        if (!resultCard._blob) return;
        const url = URL.createObjectURL(resultCard._blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
        a.download = currentFile.name.replace(/\.[^/.]+$/, '') + '_text.' + ext;
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
            drawAll();
            updateHandle();
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