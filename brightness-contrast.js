const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const brightness = document.getElementById("brightness");
const contrast = document.getElementById("contrast");
const saturation = document.getElementById("saturation");
const hue = document.getElementById("hue");
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.filter = `
        brightness(${brightness.value}%)
        contrast(${contrast.value}%)
        saturate(${saturation.value}%)
        hue-rotate(${hue.value}deg)
    `;

    ctx.drawImage(img, 0, 0);

    ctx.filter = "none";

}

// Live Preview
brightness.addEventListener("input", drawImage);
contrast.addEventListener("input", drawImage);
saturation.addEventListener("input", drawImage);
hue.addEventListener("input", drawImage);

// Download Image
downloadBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    const link = document.createElement("a");

    link.download = "edited-image.png";
    link.href = canvas.toDataURL("image/png");

    link.click();

});
