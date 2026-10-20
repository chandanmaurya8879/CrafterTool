/**
 * PixelPress Image Compressor — Complete Script (continued)
 * All features implemented: preview, compression, animation, stats, download, toast.
 * Vanilla JS only.
 */

// The script above ends mid-`DOMContentLoaded`. Below is the full, self-contained
// version replacing the previous partial snippet. Everything is inside one listener.

document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // 1. DOM REFERENCES
    // ============================================================
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewSection = document.getElementById('previewSection');
    const previewContent = document.getElementById('previewContent');
    const previewSkeleton = document.getElementById('previewSkeleton');
    const previewImage = document.getElementById('previewImage');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewType = document.getElementById('previewType');
    const resetBtn = document.getElementById('resetBtn');
    const compressBtn = document.getElementById('compressBtn');
    const loadingAnimation = document.getElementById('loadingAnimation');
    const successAnimation = document.getElementById('successAnimation');
    const percentText = document.getElementById('percentText');
    const ringFill = document.querySelector('.ring-fill');

    // Result elements
    const resultCard = document.getElementById('resultCard');
    const resultOriginalImg = document.getElementById('resultOriginalImg');
    const resultCompressedImg = document.getElementById('resultCompressedImg');
    const origDim = document.getElementById('origDim');
    const compDim = document.getElementById('compDim');
    const origSize = document.getElementById('origSize');
    const compSize = document.getElementById('compSize');
    const statOrigSize = document.getElementById('statOrigSize');
    const statCompSize = document.getElementById('statCompSize');
    const statSaved = document.getElementById('statSaved');
    const statReduction = document.getElementById('statReduction');
    const compTime = document.getElementById('compTime');
    const downloadBtn = document.getElementById('downloadBtn');
    const newImageBtn = document.getElementById('newImageBtn');
    const toast = document.getElementById('toast');

    // ============================================================
    // 2. STATE
    // ============================================================
    let currentFile = null;          // original File object
    let originalImage = null;        // original Image element (for dimensions)
    let compressedBlob = null;       // compressed blob
    let compressedDataUrl = null;    // for preview
    let compressedWidth = 0;
    let compressedHeight = 0;
    let originalWidth = 0;
    let originalHeight = 0;
    let originalFileSize = 0;
    let startTime = 0;
    let compressionInProgress = false;

    // ============================================================
    // 3. UTILITY FUNCTIONS
    // ============================================================
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const showToast = (msg) => {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // Animate a number from 0 → target with easing
    const animateNumber = (el, target, duration = 900, suffix = '', decimals = 0) => {
        const start = 0;
        const startTime = performance.now();
        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = start + (target - start) * eased;
            el.textContent = value.toFixed(decimals) + suffix;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target.toFixed(decimals) + suffix;
            }
        };
        requestAnimationFrame(step);
    };

    // ============================================================
    // 4. FILE HANDLING
    // ============================================================
    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.match('image/jpeg|image/png|image/webp')) {
            alert('Please select a JPG, PNG or WEBP image.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('File too large. Max 10MB.');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;

        // Show skeleton briefly for smooth UX
        previewSection.classList.remove('hidden');
        previewSkeleton.classList.remove('hidden');
        previewContent.classList.add('hidden');
        compressBtn.disabled = true;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        loadingAnimation.classList.add('hidden');
        compressBtn.innerHTML = '<i class="fas fa-bolt"></i> Compress Image';

        // Reset result data
        compressedBlob = null;
        compressedDataUrl = null;

        // Read image
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                originalWidth = img.width;
                originalHeight = img.height;

                // Update preview
                previewImage.src = e.target.result;
                previewName.textContent = file.name;
                previewSize.textContent = formatSize(file.size);
                previewDimensions.textContent = `${img.width} × ${img.height}`;
                previewType.textContent = file.type.split('/')[1].toUpperCase();

                // Hide skeleton, show preview
                previewSkeleton.classList.add('hidden');
                previewContent.classList.remove('hidden');
                compressBtn.disabled = false;
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

    // ============================================================
    // 5. DRAG & DROP + FILE INPUT
    // ============================================================
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
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
        fileInput.value = ''; // reset so same file can be selected again
    });

    // ============================================================
    // 6. RESET BUTTON
    // ============================================================
    resetBtn.addEventListener('click', () => {
        previewSection.classList.add('hidden');
        previewContent.classList.remove('hidden');
        previewSkeleton.classList.add('hidden');
        compressBtn.disabled = true;
        compressBtn.innerHTML = '<i class="fas fa-bolt"></i> Compress Image';
        currentFile = null;
        originalImage = null;
        compressedBlob = null;
        compressedDataUrl = null;
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        loadingAnimation.classList.add('hidden');
        // Reset ring
        if (ringFill) ringFill.style.strokeDashoffset = 213.6;
        if (percentText) percentText.textContent = '0%';
    });

    // ============================================================
    // 7. COMPRESSION ENGINE
    // ============================================================
    const compressImage = (file, quality = 0.6, maxWidth = 1200) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Calculate target dimensions (maintain aspect ratio)
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Compression failed'));
                                return;
                            }
                            compressedWidth = width;
                            compressedHeight = height;
                            compressedBlob = blob;
                            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                            resolve(blob);
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // ============================================================
    // 8. PROGRESS RING ANIMATION
    // ============================================================
    const animateCompression = (duration = 2200) => {
        return new Promise((resolve) => {
            let start = null;
            const step = (timestamp) => {
                if (!start) start = timestamp;
                const progress = Math.min((timestamp - start) / duration, 1);
                const percent = Math.floor(progress * 100);
                percentText.textContent = percent + '%';
                // circumference = 2 * PI * 34 ≈ 213.6
                const offset = 213.6 * (1 - progress);
                ringFill.style.strokeDashoffset = offset;
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    };

    // ============================================================
    // 9. MAIN COMPRESS HANDLER
    // ============================================================
    compressBtn.addEventListener('click', async () => {
        if (!currentFile || !originalImage || compressionInProgress) return;

        compressionInProgress = true;
        // disable UI
        compressBtn.disabled = true;
        compressBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing...';
        loadingAnimation.classList.remove('hidden');
        successAnimation.classList.add('hidden');
        resultCard.classList.add('hidden');

        // reset ring
        ringFill.style.strokeDashoffset = 213.6;
        percentText.textContent = '0%';
        startTime = performance.now();

        try {
            // start animation and compression in parallel
            const animationPromise = animateCompression(2200); // 2.2s for smoothness
            const compressionPromise = compressImage(currentFile, 0.6, 1200);

            // wait for both
            await Promise.all([animationPromise, compressionPromise]);

            const endTime = performance.now();
            const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

            // hide loading, show success
            loadingAnimation.classList.add('hidden');
            successAnimation.classList.remove('hidden');

            // after success, show result card
            setTimeout(() => {
                successAnimation.classList.add('hidden');
                compressBtn.innerHTML = '<i class="fas fa-check"></i> Compressed!';
                compressBtn.disabled = true;

                // Fill result card images
                resultOriginalImg.src = originalImage.src;
                resultCompressedImg.src = compressedDataUrl;

                // Dimensions & sizes
                origDim.textContent = `${originalWidth} × ${originalHeight}`;
                compDim.textContent = `${compressedWidth} × ${compressedHeight}`;
                origSize.textContent = formatSize(originalFileSize);
                compSize.textContent = formatSize(compressedBlob.size);

                // Stats
                const savedBytes = originalFileSize - compressedBlob.size;
                const reductionPercent = ((savedBytes / originalFileSize) * 100).toFixed(1);

                // Animated counters
                statOrigSize.textContent = '0 MB';
                statCompSize.textContent = '0 MB';
                statSaved.textContent = '0 MB';
                statReduction.textContent = '0%';

                // Convert to MB values for animation
                const origMB = originalFileSize / (1024 * 1024);
                const compMB = compressedBlob.size / (1024 * 1024);
                const savedMB = savedBytes / (1024 * 1024);

                animateNumber(statOrigSize, origMB, 900, ' MB', 2);
                animateNumber(statCompSize, compMB, 900, ' MB', 2);
                animateNumber(statSaved, savedMB, 900, ' MB', 2);
                animateNumber(statReduction, parseFloat(reductionPercent), 900, '%', 1);

                compTime.textContent = timeTaken + 's';

                // show card
                resultCard.classList.remove('hidden');
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // enable download button
                downloadBtn.disabled = false;
                compressionInProgress = false;
            }, 800); // let success animation show

        } catch (err) {
            console.error(err);
            loadingAnimation.classList.add('hidden');
            compressBtn.disabled = false;
            compressBtn.innerHTML = '<i class="fas fa-bolt"></i> Compress Image';
            compressionInProgress = false;
            alert('Compression failed. Please try again.');
        }
    });

    // ============================================================
    // 10. DOWNLOAD
    // ============================================================
    downloadBtn.addEventListener('click', () => {
        if (!compressedBlob) return;
        const url = URL.createObjectURL(compressedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed_${currentFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📥 Download started!');
    });

    // ============================================================
    // 11. COMPRESS ANOTHER
    // ============================================================
    newImageBtn.addEventListener('click', () => {
        // Reset everything
        previewSection.classList.add('hidden');
        previewContent.classList.remove('hidden');
        previewSkeleton.classList.add('hidden');
        resultCard.classList.add('hidden');
        successAnimation.classList.add('hidden');
        loadingAnimation.classList.add('hidden');
        compressBtn.disabled = true;
        compressBtn.innerHTML = '<i class="fas fa-bolt"></i> Compress Image';
        currentFile = null;
        originalImage = null;
        compressedBlob = null;
        compressedDataUrl = null;
        compressionInProgress = false;
        // Reset ring
        ringFill.style.strokeDashoffset = 213.6;
        percentText.textContent = '0%';
        // Scroll to upload
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // ============================================================
    // 12. RIPPLE EFFECT ON PRIMARY BUTTONS
    // ============================================================
    document.querySelectorAll('.btn-primary').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.width = '10px';
            ripple.style.height = '10px';
            ripple.style.background = 'rgba(255,255,255,0.5)';
            ripple.style.borderRadius = '50%';
            ripple.style.transform = 'translate(-50%, -50%) scale(0)';
            ripple.style.animation = 'ripple 0.6s ease-out';
            ripple.style.pointerEvents = 'none';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 700);
        });
    });

    // ============================================================
    // 13. KEYBOARD ACCESSIBILITY (bonus)
    // ============================================================
    // Allow pressing Enter/Space on upload area
    uploadArea.setAttribute('tabindex', '0');
    uploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });
});