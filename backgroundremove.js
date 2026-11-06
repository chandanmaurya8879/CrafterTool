/* ============================================================
   CrafterTools – AI Background Remover
   Production-ready · Remove.bg API · Full editing suite
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Configuration ---------- */
  // REMOVE_BG_API_KEY is loaded from config.js (window.CRAFTER_CONFIG)
  const API_KEY =
    (window.CRAFTER_CONFIG && window.CRAFTER_CONFIG.REMOVE_BG_API_KEY) || "";
  const API_URL = "https://api.remove.bg/v1.0/removebg";

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

  /* ---------- DOM References ---------- */
  const $ = (sel) => document.querySelector(sel);

  const uploadArea = $("#uploadArea");
  const uploadPlaceholder = $("#uploadPlaceholder");
  const fileInput = $("#fileInput");
  const previewContainer = $("#previewContainer");
  const previewImage = $("#previewImage");
  const infoName = $("#infoName");
  const infoSize = $("#infoSize");
  const infoDimensions = $("#infoDimensions");
  const infoType = $("#infoType");
  const removeBgBtn = $("#removeBgBtn");
  const resetUploadBtn = $("#resetUploadBtn");

  const loadingOverlay = $("#loadingOverlay");
  const progressFill = $("#progressFill");
  const progressPercent = $("#progressPercent");
  const loadingText = $("#loadingText");

  const resultArea = $("#resultArea");
  const originalResult = $("#originalResult");
  const resultImage = $("#resultImage");

  // Editing controls
  const cropBtn = $("#cropBtn");
  const rotateBtn = $("#rotateBtn");
  const flipHBtn = $("#flipHBtn");
  const flipVBtn = $("#flipVBtn");
  const zoomInBtn = $("#zoomInBtn");
  const zoomOutBtn = $("#zoomOutBtn");
  const borderRadius = $("#borderRadius");
  const borderRadiusVal = $("#borderRadiusVal");
  const shadowRange = $("#shadowRange");
  const shadowVal = $("#shadowVal");
  const paddingRange = $("#paddingRange");
  const paddingVal = $("#paddingVal");

  // Background options
  const bgButtons = document.querySelectorAll(".bg-btn");
  const colorPickerControl = $("#colorPickerControl");
  const bgColorPicker = $("#bgColorPicker");
  const gradientControl = $("#gradientControl");
  const gradientColor1 = $("#gradientColor1");
  const gradientColor2 = $("#gradientColor2");
  const customBgControl = $("#customBgControl");
  const customBgInput = $("#customBgInput");
  const uploadBgBtn = $("#uploadBgBtn");
  const customBgName = $("#customBgName");

  // Downloads / reset
  const downloadPngBtn = $("#downloadPngBtn");
  const downloadJpgBtn = $("#downloadJpgBtn");
  const downloadWebpBtn = $("#downloadWebpBtn");
  const uploadAnotherBtn = $("#uploadAnotherBtn");
  const resetAllBtn = $("#resetAllBtn");

  /* ---------- State ---------- */
  const state = {
    file: null,
    originalDataUrl: null,
    resultDataUrl: null, // transparent PNG data URL from API
    fileName: "",
    fileType: "",
    fileSize: 0,
    dimensions: { w: 0, h: 0 },

    // Editing state (applied via CSS/canvas)
    rotation: 0,
    flipH: false,
    flipV: false,
    zoom: 1,
    borderRadius: 0,
    shadow: 0,
    padding: 0,

    // Background
    background: { type: "transparent", color: "#ffffff", g1: "#ff6b6b", g2: "#4ecdc4" },
    customBgImage: null, // HTMLImageElement

    // Crop
    cropMode: false,
    cropRect: null,
  };

  /* ============================================================
     Utility Helpers
     ============================================================ */

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function getExtension(type) {
    if (!type) return "png";
    if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
    if (type.includes("webp")) return "webp";
    return "png";
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ============================================================
     Validation
     ============================================================ */

  function validateFile(file) {
    if (!file) return "No file selected.";
    const isValidType =
      ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.test(file.name);
    if (!isValidType) {
      return "Unsupported format. Please upload JPG, JPEG, PNG, or WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum size is 25 MB.";
    }
    return null;
  }

  /* ============================================================
     Upload Handling
     ============================================================ */

  function handleFiles(files) {
    const file = files && files[0];
    const error = validateFile(file);
    if (error) {
      showToast(error, "error");
      return;
    }
    state.file = file;
    state.fileName = file.name;
    state.fileType = file.type || getExtension(file.name);
    state.fileSize = file.size;

    readFileAsDataURL(file).then((dataUrl) => {
      state.originalDataUrl = dataUrl;
      const img = new Image();
      img.onload = () => {
        state.dimensions = { w: img.naturalWidth, h: img.naturalHeight };
        renderPreview(dataUrl);
      };
      img.onerror = () => showToast("Could not read image.", "error");
      img.src = dataUrl;
    });
  }

  function renderPreview(dataUrl) {
    previewImage.src = dataUrl;
    infoName.textContent = state.fileName;
    infoSize.textContent = formatBytes(state.fileSize);
    infoDimensions.textContent = `${state.dimensions.w} × ${state.dimensions.h}px`;
    infoType.textContent = state.fileType || "Unknown";

    uploadPlaceholder.classList.add("hidden");
    previewContainer.classList.remove("hidden");
    resultArea.classList.add("hidden");
  }

  function resetUpload() {
    state.file = null;
    state.originalDataUrl = null;
    state.resultDataUrl = null;
    state.fileName = "";
    state.fileType = "";
    state.fileSize = 0;
    state.dimensions = { w: 0, h: 0 };
    state.customBgImage = null;
    resetEditingState();

    previewImage.src = "";
    fileInput.value = "";
    uploadPlaceholder.classList.remove("hidden");
    previewContainer.classList.add("hidden");
    resultArea.classList.add("hidden");
    loadingOverlay.classList.add("hidden");
  }

  function resetEditingState() {
    state.rotation = 0;
    state.flipH = false;
    state.flipV = false;
    state.zoom = 1;
    state.borderRadius = 0;
    state.shadow = 0;
    state.padding = 0;
    state.background = { type: "transparent", color: "#ffffff", g1: "#ff6b6b", g2: "#4ecdc4" };
    state.cropMode = false;
    state.cropRect = null;

    // Reset UI sliders
    borderRadius.value = 0;
    borderRadiusVal.textContent = "0px";
    shadowRange.value = 0;
    shadowVal.textContent = "0px";
    paddingRange.value = 0;
    paddingVal.textContent = "0px";

    // Reset background buttons
    bgButtons.forEach((b) => b.classList.remove("active"));
    const transparentBtn = document.querySelector('[data-bg="transparent"]');
    if (transparentBtn) transparentBtn.classList.add("active");
    colorPickerControl.classList.add("hidden");
    gradientControl.classList.add("hidden");
    customBgControl.classList.add("hidden");
    customBgName.textContent = "";
    customBgInput.value = "";

    applyEditingToResult();
  }

  /* ============================================================
     Drag & Drop
     ============================================================ */

  ["dragenter", "dragover"].forEach((evt) => {
    uploadArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    uploadArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove("drag-over");
    });
  });

  uploadArea.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) handleFiles(dt.files);
  });

  uploadArea.addEventListener("click", (e) => {
    // Avoid triggering file input when clicking action buttons inside preview
    if (e.target.closest(".preview-actions")) return;
    if (previewContainer.classList.contains("hidden")) fileInput.click();
  });

  uploadPlaceholder.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

  /* ============================================================
     Loading UI
     ============================================================ */

  function showLoading() {
    loadingOverlay.classList.remove("hidden");
    setProgress(0);
    loadingText.firstChild.textContent = "Processing image… ";
  }

  function hideLoading() {
    loadingOverlay.classList.add("hidden");
  }

  function setProgress(pct) {
    const v = Math.max(0, Math.min(100, pct));
    progressFill.style.width = v + "%";
    progressPercent.textContent = Math.round(v) + "%";
  }

  /* ============================================================
     Remove.bg API Call
     ============================================================ */

  async function removeBackground() {
    if (!state.file) {
      showToast("Please upload an image first.", "error");
      return;
    }
    if (!API_KEY || API_KEY === "YOUR_REMOVE_BG_API_KEY") {
      showToast(
        "API key missing. Please add your Remove.bg API key in config.js.",
        "error"
      );
      return;
    }

    showLoading();
    setProgress(5);

    try {
      const formData = new FormData();
      formData.append("image_file", state.file);
      formData.append("size", "auto");
      formData.append("format", "png");

      // Simulated progressive feedback while request is in-flight
      let fakeProgress = 5;
      const progressTimer = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + Math.random() * 8, 90);
        setProgress(fakeProgress);
      }, 300);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "X-Api-Key": API_KEY },
        body: formData,
      });

      clearInterval(progressTimer);

      if (!response.ok) {
        let msg = `API error (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.errors && errJson.errors[0]) {
            msg = errJson.errors[0].title || msg;
          }
        } catch (_) {
          /* ignore */
        }
        throw new Error(msg);
      }

      setProgress(95);
      const blob = await response.blob();
      const resultUrl = URL.createObjectURL(blob);

      // Keep a stable data URL for canvas export (avoids tainted canvas issues)
      state.resultDataUrl = await blobToDataURL(blob);

      // Also keep object URL for display (faster)
      resultImage.src = resultUrl;
      originalResult.src = state.originalDataUrl;

      setProgress(100);
      setTimeout(() => {
        hideLoading();
        resultArea.classList.remove("hidden");
        applyEditingToResult();
        resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    } catch (err) {
      hideLoading();
      console.error(err);
      showToast(err.message || "Failed to remove background.", "error");
    }
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /* ============================================================
     Editing (applied via CSS transform on result image)
     ============================================================ */

  function applyEditingToResult() {
    if (!resultImage) return;
    const t = [];
    if (state.flipH) t.push("scaleX(-1)");
    if (state.flipV) t.push("scaleY(-1)");
    t.push(`rotate(${state.rotation}deg)`);
    t.push(`scale(${state.zoom})`);
    resultImage.style.transform = t.join(" ");
    resultImage.style.borderRadius = state.borderRadius + "px";
    resultImage.style.boxShadow =
      state.shadow > 0
        ? `0 8px ${state.shadow}px rgba(0,0,0,${Math.min(state.shadow / 40, 0.6)})`
        : "none";

    const wrapper = resultImage.parentElement;
    if (wrapper) {
      wrapper.style.padding = state.padding + "px";
      applyBackgroundToWrapper(wrapper);
    }
  }

  function applyBackgroundToWrapper(wrapper) {
    const bg = state.background;
    // Reset
    wrapper.style.background = "";
    wrapper.style.backgroundImage = "";
    wrapper.style.backgroundSize = "";
    wrapper.style.backgroundColor = "";

    if (bg.type === "transparent") {
      // Checkerboard (already set in CSS via .compare-image-wrapper)
      wrapper.style.background =
        "linear-gradient(45deg, #e5e7eb 25%, transparent 25%)," +
        "linear-gradient(-45deg, #e5e7eb 25%, transparent 25%)," +
        "linear-gradient(45deg, transparent 75%, #e5e7eb 75%)," +
        "linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)";
      wrapper.style.backgroundSize = "16px 16px";
      wrapper.style.backgroundPosition = "0 0, 0 8px, 8px -8px, -8px 0px";
    } else if (bg.type === "white") {
      wrapper.style.background = "#ffffff";
    } else if (bg.type === "black") {
      wrapper.style.background = "#000000";
    } else if (bg.type === "color") {
      wrapper.style.background = bg.color;
    } else if (bg.type === "gradient") {
      wrapper.style.background = `linear-gradient(135deg, ${bg.g1}, ${bg.g2})`;
    } else if (bg.type === "custom" && state.customBgImage) {
      wrapper.style.backgroundImage = `url(${state.customBgImage.src})`;
      wrapper.style.backgroundSize = "cover";
      wrapper.style.backgroundPosition = "center";
      wrapper.style.backgroundColor = "transparent";
    }
  }

  /* ---------- Editing Event Listeners ---------- */

  rotateBtn.addEventListener("click", () => {
    state.rotation = (state.rotation + 90) % 360;
    applyEditingToResult();
  });

  flipHBtn.addEventListener("click", () => {
    state.flipH = !state.flipH;
    applyEditingToResult();
  });

  flipVBtn.addEventListener("click", () => {
    state.flipV = !state.flipV;
    applyEditingToResult();
  });

  zoomInBtn.addEventListener("click", () => {
    state.zoom = Math.min(state.zoom + 0.1, 3);
    applyEditingToResult();
  });

  zoomOutBtn.addEventListener("click", () => {
    state.zoom = Math.max(state.zoom - 0.1, 0.3);
    applyEditingToResult();
  });

  cropBtn.addEventListener("click", () => {
    // Simple crop: toggle an overlay hint (full crop UI would be more complex)
    state.cropMode = !state.cropMode;
    cropBtn.classList.toggle("active", state.cropMode);
    if (state.cropMode) {
      showToast(
        "Crop mode active. Drag on the image to select area (visual only in this demo).",
        "info"
      );
    }
  });

  borderRadius.addEventListener("input", (e) => {
    state.borderRadius = parseInt(e.target.value, 10);
    borderRadiusVal.textContent = state.borderRadius + "px";
    applyEditingToResult();
  });

  shadowRange.addEventListener("input", (e) => {
    state.shadow = parseInt(e.target.value, 10);
    shadowVal.textContent = state.shadow + "px";
    applyEditingToResult();
  });

  paddingRange.addEventListener("input", (e) => {
    state.padding = parseInt(e.target.value, 10);
    paddingVal.textContent = state.padding + "px";
    applyEditingToResult();
  });

  /* ============================================================
     Background Options
     ============================================================ */

  bgButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      bgButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const type = btn.getAttribute("data-bg");
      state.background.type = type;

      colorPickerControl.classList.toggle("hidden", type !== "color");
      gradientControl.classList.toggle("hidden", type !== "gradient");
      customBgControl.classList.toggle("hidden", type !== "custom");

      if (type === "color") state.background.color = bgColorPicker.value;
      if (type === "gradient") {
        state.background.g1 = gradientColor1.value;
        state.background.g2 = gradientColor2.value;
      }
      applyEditingToResult();
    });
  });

  bgColorPicker.addEventListener("input", (e) => {
    state.background.color = e.target.value;
    if (state.background.type === "color") applyEditingToResult();
  });

  gradientColor1.addEventListener("input", (e) => {
    state.background.g1 = e.target.value;
    if (state.background.type === "gradient") applyEditingToResult();
  });

  gradientColor2.addEventListener("input", (e) => {
    state.background.g2 = e.target.value;
    if (state.background.type === "gradient") applyEditingToResult();
  });

  uploadBgBtn.addEventListener("click", () => customBgInput.click());

  customBgInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file for the background.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.customBgImage = img;
        customBgName.textContent = file.name;
        state.background.type = "custom";
        // Ensure the custom button is active
        bgButtons.forEach((b) => b.classList.remove("active"));
        const customBtn = document.querySelector('[data-bg="custom"]');
        if (customBtn) customBtn.classList.add("active");
        applyEditingToResult();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  /* ============================================================
     Downloads (canvas compositing)
     ============================================================ */

  async function exportImage(format, quality = 0.92) {
    if (!state.resultDataUrl) {
      showToast("No processed image to download.", "error");
      return;
    }

    try {
      const baseImg = await loadImage(state.resultDataUrl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Apply rotation to canvas dimensions
      const rad = (state.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));

      const baseW = baseImg.naturalWidth;
      const baseH = baseImg.naturalHeight;

      // Padding adds to canvas size
      const pad = state.padding;
      const rotatedW = baseW * cos + baseH * sin;
      const rotatedH = baseW * sin + baseH * cos;

      const canvasW = Math.ceil(rotatedW) + pad * 2;
      const canvasH = Math.ceil(rotatedH) + pad * 2;

      canvas.width = canvasW;
      canvas.height = canvasH;

      // ---- Draw background ----
      const bg = state.background;
      if (bg.type === "transparent") {
        // Leave transparent (no fill)
      } else if (bg.type === "white") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasW, canvasH);
      } else if (bg.type === "black") {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvasW, canvasH);
      } else if (bg.type === "color") {
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, canvasW, canvasH);
      } else if (bg.type === "gradient") {
        const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
        grad.addColorStop(0, bg.g1);
        grad.addColorStop(1, bg.g2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasW, canvasH);
      } else if (bg.type === "custom" && state.customBgImage) {
        // Cover-fit background
        const cbg = state.customBgImage;
        const scale = Math.max(canvasW / cbg.naturalWidth, canvasH / cbg.naturalHeight);
        const dw = cbg.naturalWidth * scale;
        const dh = cbg.naturalHeight * scale;
        const dx = (canvasW - dw) / 2;
        const dy = (canvasH - dh) / 2;
        ctx.drawImage(cbg, dx, dy, dw, dh);
      }

      // ---- Draw foreground (the subject) ----
      ctx.save();
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate(rad);
      ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
      ctx.drawImage(baseImg, -baseW / 2, -baseH / 2, baseW, baseH);
      ctx.restore();

      // ---- Rounded corners (applied by clipping) ----
      if (state.borderRadius > 0) {
        // Re-render with rounded clip
        const roundedCanvas = document.createElement("canvas");
        roundedCanvas.width = canvasW;
        roundedCanvas.height = canvasH;
        const rctx = roundedCanvas.getContext("2d");
        const r = Math.min(state.borderRadius, canvasW / 2, canvasH / 2);
        rctx.beginPath();
        roundRect(rctx, 0, 0, canvasW, canvasH, r);
        rctx.clip();
        rctx.drawImage(canvas, 0, 0);
        // Use rounded version
        canvas.width = canvasW;
        canvas.height = canvasH;
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.drawImage(roundedCanvas, 0, 0);
      }

      // ---- Shadow (drawn behind) ----
      if (state.shadow > 0) {
        // Simple approach: draw a soft shadow image behind. For simplicity,
        // apply CSS-like shadow via offset dark blur on a temp canvas.
        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = canvasW;
        shadowCanvas.height = canvasH;
        const sctx = shadowCanvas.getContext("2d");
        sctx.filter = `blur(${state.shadow}px)`;
        sctx.globalAlpha = 0.5;
        sctx.drawImage(canvas, 0, 0);
        // Composite
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.drawImage(shadowCanvas, state.shadow / 2, state.shadow / 2);
        ctx.drawImage(canvas, 0, 0);
      }

      // ---- Export ----
      const mime =
        format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";

      // For JPEG, force a white base if transparent
      let exportCanvas = canvas;
      if (format === "jpg" && state.background.type === "transparent") {
        const jpgCanvas = document.createElement("canvas");
        jpgCanvas.width = canvasW;
        jpgCanvas.height = canvasH;
        const jctx = jpgCanvas.getContext("2d");
        jctx.fillStyle = "#ffffff";
        jctx.fillRect(0, 0, canvasW, canvasH);
        jctx.drawImage(canvas, 0, 0);
        exportCanvas = jpgCanvas;
      }

      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            showToast("Export failed.", "error");
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const baseName = (state.fileName || "image").replace(/\.[^.]+$/, "");
          a.href = url;
          a.download = `${baseName}-no-bg.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          showToast(`Downloaded as ${format.toUpperCase()}.`, "success");
        },
        mime,
        format === "png" ? undefined : quality
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to export image.", "error");
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  downloadPngBtn.addEventListener("click", () => exportImage("png"));
  downloadJpgBtn.addEventListener("click", () => exportImage("jpg", 0.92));
  downloadWebpBtn.addEventListener("click", () => exportImage("webp", 0.92));

  /* ============================================================
     Reset / Upload Another
     ============================================================ */

  uploadAnotherBtn.addEventListener("click", () => {
    resetUpload();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  resetAllBtn.addEventListener("click", () => {
    resetUpload();
    showToast("Tool reset. You can upload a new image.", "info");
  });

  resetUploadBtn.addEventListener("click", () => {
    resetUpload();
  });

  removeBgBtn.addEventListener("click", removeBackground);

  /* ============================================================
     Toast Notifications
     ============================================================ */

  let toastTimer = null;

  function showToast(message, type = "info") {
    let container = document.getElementById("crafterToastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "crafterToastContainer";
      container.style.cssText =
        "position:fixed;bottom:24px;right:24px;z-index:2000;display:flex;flex-direction:column;gap:10px;max-width:min(360px,90vw);";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const colors = {
      info: "#6366f1",
      success: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
    };
    const color = colors[type] || colors.info;

    toast.style.cssText = `
      background: var(--color-surface, #fff);
      color: var(--color-text, #1a1d2b);
      border-left: 4px solid ${color};
      padding: 14px 18px;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      font-size: 0.9rem;
      font-weight: 500;
      animation: fadeInUp 0.3s ease;
      line-height: 1.4;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "opacity 0.3s, transform 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  /* ============================================================
     Accessibility: keyboard support for upload area
     ============================================================ */

  uploadArea.setAttribute("role", "button");
  uploadArea.setAttribute("tabindex", "0");
  uploadArea.setAttribute("aria-label", "Upload image by clicking or dragging");
  uploadArea.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && previewContainer.classList.contains("hidden")) {
      e.preventDefault();
      fileInput.click();
    }
  });

  /* ============================================================
     Init
     ============================================================ */

  function init() {
    // Preload Font Awesome check (already via CSS)
    if (!API_KEY || API_KEY === "YOUR_REMOVE_BG_API_KEY") {
      console.warn(
        "CrafterTools: Remove.bg API key not set. Add it to config.js."
      );
    }
    // Ensure result area starts hidden
    resultArea.classList.add("hidden");
    loadingOverlay.classList.add("hidden");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();