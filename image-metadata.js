const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");

const fileName = document.getElementById("fileName");
const fileType = document.getElementById("fileType");
const fileSize = document.getElementById("fileSize");
const width = document.getElementById("width");
const height = document.getElementById("height");
const modified = document.getElementById("modified");

imageInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    // File Information
    fileName.textContent = file.name;
    fileType.textContent = file.type || "Unknown";

    if (file.size < 1024 * 1024) {
        fileSize.textContent = (file.size / 1024).toFixed(2) + " KB";
    } else {
        fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    }

    modified.textContent = new Date(file.lastModified).toLocaleString();

    // Preview & Dimensions
    const reader = new FileReader();

    reader.onload = function (e) {

        preview.src = e.target.result;
        preview.style.display = "block";

        const img = new Image();

        img.onload = function () {
            width.textContent = img.width + " px";
            height.textContent = img.height + " px";
        };

        img.src = e.target.result;
    };

    reader.readAsDataURL(file);

});
