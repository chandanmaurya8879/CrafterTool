const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");

let selectedFile = null;

// Update quality text
quality.addEventListener("input", () => {
    qualityValue.textContent = quality.value + "%";
});

// Select image
fileInput.addEventListener("change", function () {

    selectedFile = this.files[0];

    if (!selectedFile) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = "block";
    };

    reader.readAsDataURL(selectedFile);

});

// Convert to WebP
convertBtn.addEventListener("click", function () {

    if (!selectedFile) {
        alert("Please select an image first.");
        return;
    }

    const img = new Image();

    img.onload = function () {

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const q = quality.value / 100;

        canvas.toBlob(function (blob) {

            const url = URL.createObjectURL(blob);

            downloadBtn.href = url;

        }, "image/webp", q);

    };

    img.src = URL.createObjectURL(selectedFile);

});
