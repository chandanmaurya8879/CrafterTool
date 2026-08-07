const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const resizeBtn = document.getElementById("resizeBtn");
const downloadBtn = document.getElementById("downloadBtn");

let selectedFile = null;

// Show preview
fileInput.addEventListener("change", function () {
    selectedFile = this.files[0];

    if (!selectedFile) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = "block";

        const img = new Image();

        img.onload = function () {
            widthInput.value = img.width;
            heightInput.value = img.height;
        };

        img.src = e.target.result;
    };

    reader.readAsDataURL(selectedFile);
});

// Resize image
resizeBtn.addEventListener("click", function () {

    if (!selectedFile) {
        alert("Please select an image first.");
        return;
    }

    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);

    if (!width || !height) {
        alert("Please enter valid width and height.");
        return;
    }

    const img = new Image();

    img.onload = function () {

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(function(blob) {

            downloadBtn.href = URL.createObjectURL(blob);

        }, "image/jpeg", 0.95);

    };

    img.src = URL.createObjectURL(selectedFile);

});
