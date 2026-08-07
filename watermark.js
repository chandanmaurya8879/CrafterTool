const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const watermarkText = document.getElementById("watermarkText");
const textColor = document.getElementById("textColor");
const fontSize = document.getElementById("fontSize");
const fontValue = document.getElementById("fontValue");

const applyBtn = document.getElementById("applyBtn");
const downloadBtn = document.getElementById("downloadBtn");

let img = new Image();

// Update font size text
fontSize.addEventListener("input", () => {
    fontValue.textContent = fontSize.value + "px";
});

// Upload image
fileInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        img.onload = function () {

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

        };

        img.src = e.target.result;

    };

    reader.readAsDataURL(file);

});

// Apply watermark
applyBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    // Draw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Watermark text
    ctx.font = `${fontSize.value}px Arial`;
    ctx.fillStyle = textColor.value;

    // Semi-transparent watermark
    ctx.globalAlpha = 0.6;

    const text = watermarkText.value || "PixelTools";

    ctx.fillText(
        text,
        canvas.width - ctx.measureText(text).width - 20,
        canvas.height - 20
    );

    // Reset opacity
    ctx.globalAlpha = 1;
});

// Download image
downloadBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    downloadBtn.href = canvas.toDataURL("image/png");

});
