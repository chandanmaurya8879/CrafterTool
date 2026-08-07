const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const sharpenSlider = document.getElementById("sharpen");
const downloadBtn = document.getElementById("downloadBtn");

const img = new Image();

// Upload Image
imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            drawImage();
        };

        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
});

// Draw Image
function drawImage() {

    if (!img.src) return;

    // Draw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    ctx.drawImage(img, 0, 0);

    const amount = parseInt(sharpenSlider.value);

    if (amount === 0) return;

    for (let i = 0; i < amount; i++) {
        sharpenCanvas();
    }
}

// Real sharpen filter
function sharpenCanvas() {

    const w = canvas.width;
    const h = canvas.height;

    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);

    const s = src.data;
    const d = dst.data;

    // Sharpen kernel
    const kernel = [
         0, -1,  0,
        -1,  5, -1,
         0, -1,  0
    ];

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {

            let r = 0, g = 0, b = 0;

            let k = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {

                    const index = ((y + ky) * w + (x + kx)) * 4;

                    r += s[index] * kernel[k];
                    g += s[index + 1] * kernel[k];
                    b += s[index + 2] * kernel[k];

                    k++;
                }
            }

            const i = (y * w + x) * 4;

            d[i] = Math.max(0, Math.min(255, r));
            d[i + 1] = Math.max(0, Math.min(255, g));
            d[i + 2] = Math.max(0,
Math.min(255, b));
            d[i + 3] = s[i + 3];
        }
    }

    ctx.putImageData(dst, 0, 0);
}

// Live update
sharpenSlider.addEventListener("input", drawImage);

// Download
downloadBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    const link = document.createElement("a");
    link.download = "sharpen-image.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

});

