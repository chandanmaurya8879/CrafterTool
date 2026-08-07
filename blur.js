const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const blurSlider = document.getElementById("blur");
const downloadBtn = document.getElementById("downloadBtn");

let img = new Image();

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

    ctx.filter = `blur(${blurSlider.value}px)`;

    ctx.drawImage(img, 0, 0);

    ctx.filter = "none";

}

// Live Blur
blurSlider.addEventListener("input", drawImage);

// Download
downloadBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    const link = document.createElement("a");

    link.download = "blur-image.png";
    link.href = canvas.toDataURL("image/png");

    link.click();

});
