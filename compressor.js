const fileInput = document.getElementById("fileInput");
const previewImage = document.getElementById("previewImage");
const qualitySlider = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const compressBtn = document.getElementById("compressBtn");
const downloadBtn = document.getElementById("downloadBtn");
const originalSize = document.getElementById("originalSize");
const compressedSize = document.getElementById("compressedSize");

let selectedFile = null;
let compressedBlob = null;

// Update quality text
qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = qualitySlider.value + "%";
});

// Preview image
fileInput.addEventListener("change", (e) => {

    selectedFile = e.target.files[0];

    if (!selectedFile) return;

    originalSize.textContent =
        (selectedFile.size / 1024).toFixed(2) + " KB";

    const reader = new FileReader();

    reader.onload = function (event) {

        previewImage.src = event.target.result;
        previewImage.style.display = "block";

    };

    reader.readAsDataURL(selectedFile);

});
compressBtn.addEventListener("click", () => {

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

        const quality = qualitySlider.value / 100;

        canvas.toBlob(function(blob){

            compressedBlob = blob;

            compressedSize.textContent =
                (blob.size / 1024).toFixed(2) + " KB";

            downloadBtn.href =
                URL.createObjectURL(blob);

        }, "image/jpeg", quality);

    };

    img.src = URL.createObjectURL(selectedFile);

});
