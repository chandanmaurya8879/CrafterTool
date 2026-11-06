/* ============================================================
   CrafterTools · Image Metadata Viewer
   Vanilla JS — reads metadata entirely client-side
   Includes a lightweight inline EXIF parser (no dependencies)
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
    const glowFrame = document.getElementById('glowFrame');
    const formatBadge = document.getElementById('formatBadge');
    const scanOverlay = document.getElementById('scanOverlay');

    const scanBtn = document.getElementById('scanBtn');
    const scanAnimation = document.getElementById('scanAnimation');
    const scanStageImg = document.getElementById('scanStageImg');
    const scanStatus = document.getElementById('scanStatus');
    const scanCountValue = document.getElementById('scanCountValue');
    const scanProgressFill = document.getElementById('scanProgressFill');
    const successAnimation = document.getElementById('successAnimation');

    const resultCard = document.getElementById('resultCard');
    const fileInfoTable = document.getElementById('fileInfoTable');
    const exifTable = document.getElementById('exifTable');
    const exifSection = document.getElementById('exifSection');
    const scanTime = document.getElementById('scanTime');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    const chooseAnotherBtn = document.getElementById('chooseAnotherBtn');

    const toast = document.getElementById('toast');

    /* ---------- State ---------- */
    let currentFile = null;
    let originalImage = null;
    let originalWidth = 0, originalHeight = 0, originalFileSize = 0;
    let exifData = {};
    let fileInfo = {};
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

    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const aspectRatio = (w, h) => {
        const g = gcd(w, h);
        return `${Math.round(w / g)}:${Math.round(h / g)}`;
    };

    const formatDate = (ts) => {
        if (!ts) return 'Not Available';
        const d = new Date(ts);
        return d.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const na = 'Not Available';

    /* ============================================================
     * EXIF PARSER (minimal, no external library)
     * Reads JPEG APP1 EXIF segments only.
     * ============================================================ */
    const EXIF_TAGS = {
        0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation',
        0x0131: 'Software', 0x0132: 'DateTime',
        0x829A: 'ExposureTime', 0x829D: 'FNumber',
        0x8827: 'ISOSpeedRatings', 0x9003: 'DateTimeOriginal',
        0x920A: 'FocalLength', 0x9209: 'Flash',
        0xA002: 'PixelXDimension', 0xA003: 'PixelYDimension',
        0xA434: 'LensModel'
    };

    const FLASH_MAP = {
        0x0: 'No Flash', 0x1: 'Fired', 0x5: 'Fired, Return not detected',
        0x7: 'Fired, Return detected', 0x9: 'On, Did not fire',
        0xD: 'On, Return not detected', 0xF: 'On, Return detected',
        0x10: 'Off, Did not fire', 0x18: 'Off, Did not fire, Return not detected',
        0x19: 'On, Did not fire', 0x1D: 'On, Return not detected',
        0x1F: 'On, Return detected', 0x20: 'No flash function'
    };

    const ORIENTATION_MAP = {
        1: 'Normal', 2: 'Flipped horizontal', 3: 'Rotated 180°',
        4: 'Flipped vertical', 5: 'Rotated 90° CW, flipped',
        6: 'Rotated 90° CW', 7: 'Rotated 90° CCW, flipped',
        8: 'Rotated 90° CCW'
    };

    const readUint = (view, offset, size, le) => {
        if (size === 2) return le ? view.getUint16(offset, true) : view.getUint16(offset, false);
        if (size === 4) return le ? view.getUint32(offset, true) : view.getUint32(offset, false);
        return null;
    };

    const readAscii = (view, offset, length) => {
        let s = '';
        for (let i = 0; i < length; i++) {
            const c = view.getUint8(offset + i);
            if (c === 0) break;
            s += String.fromCharCode(c);
        }
        return s.trim();
    };

    const readRational = (view, offset, le) => {
        const num = le ? view.getUint32(offset, true) : view.getUint32(offset, false);
        const den = le ? view.getUint32(offset + 4, true) : view.getUint32(offset + 4, false);
        if (den === 0) return 0;
        return num / den;
    };

    const readSignedRational = (view, offset, le) => {
        const num = le ? view.getInt32(offset, true) : view.getInt32(offset, false);
        const den = le ? view.getInt32(offset + 4, true) : view.getInt32(offset + 4, false);
        if (den === 0) return 0;
        return num / den;
    };

    const parseExif = (buffer) => {
        const result = {};
        try {
            const view = new DataView(buffer);
            if (view.byteLength < 4) return result;
            // Check JPEG SOI
            if (view.getUint16(0) !== 0xFFD8) return result;

            let offset = 2;
            // Find APP1 EXIF marker
            while (offset < view.byteLength - 4) {
                const marker = view.getUint16(offset);
                if (marker === 0xFFE1) {
                    // Check "Exif\0\0"
                    const exifStart = offset + 4;
                    if (exifStart + 6 > view.byteLength) break;
                    if (view.getUint8(exifStart) === 0x45 &&
                        view.getUint8(exifStart + 1) === 0x78 &&
                        view.getUint8(exifStart + 2) === 0x69 &&
                        view.getUint8(exifStart + 3) === 0x66) {
                        // TIFF header at exifStart + 6
                        const tiff = exifStart + 6;
                        const le = view.getUint16(tiff) === 0x4949;
                        const ifd0 = tiff + readUint(view, tiff + 4, 4, le);
                        parseIfd(view, tiff, ifd0, le, result, true);
                        break;
                    }
                }
                const segLen = view.getUint16(offset + 2);
                offset += 2 + segLen;
            }
        } catch (e) {
            console.warn('EXIF parse error', e);
        }
        return result;
    };

    const parseIfd = (view, tiffStart, ifdOffset, le, out, isMain) => {
        try {
            const count = readUint(view, ifdOffset, 2, le);
            for (let i = 0; i < count; i++) {
                const entry = ifdOffset + 2 + i * 12;
                const tag = readUint(view, entry, 2, le);
                const type = readUint(view, entry + 2, 2, le);
                const numValues = readUint(view, entry + 4, 4, le);
                const valueOffset = entry + 8;
                let value = null;

                const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[type] || 1;
                const totalSize = typeSize * numValues;

                let absOffset = valueOffset;
                if (totalSize > 4) {
                    absOffset = tiffStart + readUint(view, valueOffset, 4, le);
                }

                if (type === 2) {
                    // ASCII
                    if (tag === 0x010F && !out.Make) value = readAscii(view, absOffset, numValues);
                    else if (tag === 0x0110 && !out.Model) value = readAscii(view, absOffset, numValues);
                    else if (tag === 0x0131) value = readAscii(view, absOffset, numValues);
                    else if (tag === 0x0132) value = readAscii(view, absOffset, numValues);
                    else if (tag === 0x9003) value = readAscii(view, absOffset, numValues);
                    else if (tag === 0xA434) value = readAscii(view, absOffset, numValues);
                } else if (type === 3) {
                    // SHORT
                    if (tag === 0x8827) value = readUint(view, absOffset, 2, le);
                    else if (tag === 0x0112) value = ORIENTATION_MAP[readUint(view, absOffset, 2, le)] || null;
                } else if (type === 4) {
                    // LONG
                    if (tag === 0xA002) value = readUint(view, absOffset, 4, le);
                    else if (tag === 0xA003) value = readUint(view, absOffset, 4, le);
                } else if (type === 5) {
                    // RATIONAL
                    if (tag === 0x829A) {
                        const t = readRational(view, absOffset, le);
                        value = t ? `1/${Math.round(1 / t)} s` : null;
                    } else if (tag === 0x829D) {
                        const f = readRational(view, absOffset, le);
                        value = f ? `f/${f.toFixed(1)}` : null;
                    } else if (tag === 0x920A) {
                        const fl = readRational(view, absOffset, le);
                        value = fl ? `${fl.toFixed(1)} mm` : null;
                    }
                } else if (type === 9) {
                    // SLONG
                    if (tag === 0x9209) value = FLASH_MAP[readUint(view, absOffset, 4, le)] || null;
                }

                if (value !== null && value !== undefined && value !== '') {
                    out[EXIF_TAGS[tag] || ('Tag' + tag.toString(16))] = value;
                }

                // Follow EXIF IFD pointer for additional info
                if (tag === 0x8769 && isMain) {
                    const exifIfd = tiffStart + readUint(view, valueOffset, 4, le);
                    parseIfd(view, tiffStart, exifIfd, le, out, false);
                }
            }
        } catch (e) {
            console.warn('IFD parse error', e);
        }
    };

    /* ============================================================
     * FILE HANDLING
     * ============================================================ */
    const handleFile = async (file) => {
        if (!file) return;
        if (!file.type.match('image/(jpeg|png|webp|gif|bmp)')) {
            alert('Please select a JPG, PNG, WEBP, GIF or BMP image.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File too large. Max 20MB.');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;
        exifData = {};
        fileInfo = {};

        editorSection.classList.remove('hidden');
        previewSkeleton.classList.remove('hidden');
        previewContent.classList.add('hidden');
        scanBtn.disabled = true;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        scanAnimation.classList.add('hidden');
        scanOverlay.classList.add('hidden');
        scanBtn.innerHTML = '<i class="fas fa-search"></i> View Metadata';

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
                previewType.textContent = file.type || na;
                formatBadge.textContent = (file.type.split('/')[1] || 'IMG').toUpperCase();

                previewSkeleton.classList.add('hidden');
                previewContent.classList.remove('hidden');
                scanBtn.disabled = false;
            };
            img.onerror = () => {
                previewSkeleton.classList.add('hidden');
                alert('Could not load image.');
            };
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

    /* ---------- Reset ---------- */
    const resetAll = () => {
        editorSection.classList.add('hidden');
        previewSkeleton.classList.add('hidden');
        previewContent.classList.remove('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        scanAnimation.classList.add('hidden');
        scanOverlay.classList.add('hidden');
        currentFile = null;
        originalImage = null;
        exifData = {};
        fileInfo = {};
        busy = false;
        scanBtn.disabled = true;
        scanBtn.innerHTML = '<i class="fas fa-search"></i> View Metadata';
        glowFrame.classList.remove('active');
        scanProgressFill.style.width = '0%';
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    resetBtn.addEventListener('click', resetAll);
    chooseAnotherBtn.addEventListener('click', resetAll);

    /* ---------- Scan progress animation ---------- */
    const STAGES = [
        { until: 12, text: 'Loading Image...' },
        { until: 28, text: 'Scanning File...' },
        { until: 48, text: 'Reading Metadata...' },
        { until: 68, text: 'Extracting EXIF Data...' },
        { until: 85, text: 'Analyzing Properties...' },
        { until: 97, text: 'Generating Report...' },
        { until: 100, text: 'Scan Complete!' }
    ];

    const animateScan = (duration = 2600) => new Promise((resolve) => {
        let start = null;
        let lastStageText = '';

        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const percent = Math.floor(p * 100);

            scanProgressFill.style.width = percent + '%';
            scanCountValue.textContent = percent;

            const stage = STAGES.find(s => percent <= s.until) || STAGES[STAGES.length - 1];
            if (stage.text !== lastStageText) {
                lastStageText = stage.text;
                scanStatus.style.opacity = '0';
                setTimeout(() => {
                    scanStatus.textContent = stage.text;
                    scanStatus.style.opacity = '1';
                }, 100);
            }

            if (p < 1) requestAnimationFrame(step);
            else resolve();
        };
        requestAnimationFrame(step);
    });

    /* ---------- Main scan handler ---------- */
    scanBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || busy) return;
        busy = true;

        scanBtn.disabled = true;
        scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        scanAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');
        glowFrame.classList.add('active');
        scanOverlay.classList.remove('hidden');

        scanStageImg.src = originalImage.src;
        scanProgressFill.style.width = '0%';
        scanCountValue.textContent = '0';
        scanStatus.textContent = 'Loading Image...';
        scanStatus.style.opacity = '1';

        const t0 = performance.now();

        try {
            // Read file as ArrayBuffer for EXIF parsing
            const buffer = await currentFile.arrayBuffer();
            const animationPromise = animateScan(2600);

            // Parse EXIF while animation runs
            if (currentFile.type === 'image/jpeg' || currentFile.type === 'image/jpg') {
                try { exifData = parseExif(buffer); } catch (e) { exifData = {}; }
            }

            // Build file info object
            const mime = currentFile.type || na;
            const fmt = (currentFile.type.split('/')[1] || 'unknown').toUpperCase();
            fileInfo = {
                'File Name': currentFile.name,
                'File Size': formatSize(currentFile.size),
                'Image Format': fmt,
                'Width': originalWidth + ' px',
                'Height': originalHeight + ' px',
                'Resolution': `${originalWidth} × ${originalHeight}`,
                'Aspect Ratio': aspectRatio(originalWidth, originalHeight),
                'Color Mode': guessColorMode(originalImage),
                'Color Depth': guessColorDepth(currentFile.type),
                'DPI': 'Not Available',
                'MIME Type': mime,
                'Last Modified': formatDate(currentFile.lastModified)
            };

            await animationPromise;
            const timeTaken = ((performance.now() - t0) / 1000).toFixed(2);

            scanAnimation.classList.add('hidden');
            scanOverlay.classList.add('hidden');
            glowFrame.classList.remove('active');
            successAnimation.classList.remove('hidden');

            setTimeout(() => {
                successAnimation.classList.add('hidden');
                scanBtn.innerHTML = '<i class="fas fa-check"></i> Scanned!';
                scanBtn.disabled = true;

                renderMetadata(timeTaken);
                busy = false;
            }, 800);

        } catch (err) {
            console.error(err);
            scanAnimation.classList.add('hidden');
            scanOverlay.classList.add('hidden');
            glowFrame.classList.remove('active');
            scanBtn.disabled = false;
            scanBtn.innerHTML = '<i class="fas fa-search"></i> View Metadata';
            busy = false;
            alert('Scan failed. Please try again.');
        }
    });

    /* ---------- Helpers ---------- */
    const guessColorMode = (img) => {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        // Just a heuristic — most browsers render RGBA internally
        return (d[3] < 255) ? 'RGBA' : 'RGB';
    };

    const guessColorDepth = (mime) => {
        if (!mime) return na;
        if (mime.includes('png')) return '32-bit (RGBA)';
        if (mime.includes('jpeg') || mime.includes('jpg')) return '24-bit (RGB)';
        if (mime.includes('webp')) return '24-bit (RGB)';
        if (mime.includes('gif')) return '8-bit (indexed)';
        if (mime.includes('bmp')) return '24-bit (RGB)';
        return na;
    };

    /* ---------- Render metadata tables ---------- */
    const renderMetadata = (time) => {
        // File info rows
        fileInfoTable.innerHTML = '';
        const fileIcons = {
            'File Name': 'fa-file-signature',
            'File Size': 'fa-weight-hanging',
            'Image Format': 'fa-file-image',
            'Width': 'fa-arrows-alt-h',
            'Height': 'fa-arrows-alt-v',
            'Resolution': 'fa-expand',
            'Aspect Ratio': 'fa-crop-alt',
            'Color Mode': 'fa-palette',
            'Color Depth': 'fa-layer-group',
            'DPI': 'fa-print',
            'MIME Type': 'fa-code',
            'Last Modified': 'fa-calendar-alt'
        };
        Object.entries(fileInfo).forEach(([k, v]) => {
            fileInfoTable.appendChild(createRow(k, v, fileIcons[k] || 'fa-info-circle'));
        });

        // EXIF rows
        exifTable.innerHTML = '';
        const exifKeys = [
            ['Camera Model', 'Model', 'fa-camera'],
            ['Camera Brand', 'Make', 'fa-industry'],
            ['Lens', 'LensModel', 'fa-circle'],
            ['Date Taken', 'DateTimeOriginal', 'fa-clock'],
            ['ISO', 'ISOSpeedRatings', 'fa-sun'],
            ['Exposure Time', 'ExposureTime', 'fa-hourglass-half'],
            ['F Number', 'FNumber', 'fa-adjust'],
            ['Focal Length', 'FocalLength', 'fa-ruler'],
            ['Flash', 'Flash', 'fa-bolt'],
            ['Orientation', 'Orientation', 'fa-compass'],
            ['Software', 'Software', 'fa-code']
        ];

        let hasAnyExif = false;
        exifKeys.forEach(([label, key, icon]) => {
            const val = exifData[key];
            if (val !== undefined && val !== null && val !== '') {
                hasAnyExif = true;
                exifTable.appendChild(createRow(label, String(val), icon));
            } else {
                exifTable.appendChild(createRow(label, na, icon, true));
            }
        });
        // GPS (simple: not parsed from GPS IFD but check for presence of common tags)
        exifTable.appendChild(createRow('GPS Location', na, 'fa-map-marker-alt', true));

        // Show EXIF section always, but note if none
        if (!hasAnyExif) {
            const note = document.createElement('p');
            note.style.cssText = 'margin-top:12px;font-size:0.88rem;color:#64748b;font-style:italic;';
            note.textContent = 'ℹ No EXIF data found in this image. This is common for PNG, WEBP, GIF, BMP or for JPGs that have been stripped of metadata.';
            exifTable.appendChild(note);
        }

        scanTime.textContent = time + 's';

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const createRow = (key, value, icon, isNA = false) => {
        const row = document.createElement('div');
        row.className = 'metadata-row';
        const k = document.createElement('div');
        k.className = 'metadata-key';
        k.innerHTML = `<i class="fas ${icon}"></i> <span>${key}</span>`;
        const v = document.createElement('div');
        v.className = 'metadata-value' + (isNA || value === na ? ' na' : '');
        v.textContent = value;
        row.appendChild(k);
        row.appendChild(v);
        return row;
    };

    /* ---------- Download report ---------- */
    downloadReportBtn.addEventListener('click', () => {
        if (!currentFile) return;

        const lines = [];
        const dateStr = new Date().toLocaleString();
        lines.push('═══════════════════════════════════════════');
        lines.push('       CRAFTERTOOLS · IMAGE METADATA REPORT');
        lines.push('═══════════════════════════════════════════');
        lines.push(`Generated: ${dateStr}`);
        lines.push('');

        lines.push('─── FILE & IMAGE INFORMATION ───');
        Object.entries(fileInfo).forEach(([k, v]) => {
            lines.push(`${k.padEnd(20)}: ${v}`);
        });
        lines.push('');

        lines.push('─── EXIF DATA ───');
        const exifKeys = [
            ['Camera Model', 'Model'],
            ['Camera Brand', 'Make'],
            ['Lens', 'LensModel'],
            ['Date Taken', 'DateTimeOriginal'],
            ['ISO', 'ISOSpeedRatings'],
            ['Exposure Time', 'ExposureTime'],
            ['F Number', 'FNumber'],
            ['Focal Length', 'FocalLength'],
            ['Flash', 'Flash'],
            ['Orientation', 'Orientation'],
            ['Software', 'Software'],
            ['GPS Location', null]
        ];
        exifKeys.forEach(([label, key]) => {
            const val = key ? exifData[key] : null;
            lines.push(`${label.padEnd(20)}: ${val !== undefined && val !== null && val !== '' ? val : 'Not Available'}`);
        });
        lines.push('');
        lines.push('═══════════════════════════════════════════');
        lines.push('    Generated by CrafterTools · craftertools');
        lines.push('═══════════════════════════════════════════');

        const text = lines.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metadata_${currentFile.name.replace(/\.[^/.]+$/, '')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📥 Metadata report downloaded!');
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