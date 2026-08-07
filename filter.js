const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const brightness = document.getElementById("brightness");
const contrast = document.getElementById("contrast");
const grayscale = document.getElementById("grayscale");
const sepia = document.getElementById("sepia");
const invert = document.getElementById("invert");

const applyBtn = document.getElementById("applyBtn");
const downloadBtn = document.getElementById("downloadBtn");

let img = new Image();

// Upload image
fileInput.addEventListener("change", function () {

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

// Draw image with filters
function drawImage() {

    if (!img.src) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.filter = `
        brightness(${brightness.value}%)
        contrast(${contrast.value}%)
        grayscale(${grayscale.value}%)
        sepia(${sepia.value}%)
        invert(${invert.value}%)
    `;

    ctx.drawImage(img, 0, 0);

    // Reset filter
    ctx.filter = "none";
}

// Apply filters
applyBtn.addEventListener("click", drawImage);

// Live preview
brightness.addEventListener("input", drawImage);
contrast.addEventListener("input", drawImage);
grayscale.addEventListener("input", drawImage);
sepia.addEventListener("input", drawImage);
invert.addEventListener("input", drawImage);

// Download image
downloadBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    downloadBtn.href = canvas.toDataURL("image/png");

});
