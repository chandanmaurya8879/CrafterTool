const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const textInput = document.getElementById("textInput");
const textColor = document.getElementById("textColor");
const fontSize = document.getElementById("fontSize");
const fontValue = document.getElementById("fontValue");
const fontFamily = document.getElementById("fontFamily");

const addTextBtn = document.getElementById("addTextBtn");
const downloadBtn = document.getElementById("downloadBtn");

let img = new Image();

// Update font size label
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

            drawCanvas();

        };

        img.src = e.target.result;

    };

    reader.readAsDataURL(file);

});

// Draw image and text
function drawCanvas() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0);

    if (textInput.value.trim() !== "") {

        ctx.font = `${fontSize.value}px ${fontFamily.value}`;
        ctx.fillStyle = textColor.value;
        ctx.textAlign = "center";

        // Text appears in the center of the image
        ctx.fillText(
            textInput.value,
            canvas.width / 2,
            canvas.height / 2
        );
   
}
}

// Add text
addTextBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    drawCanvas();

});

// Update preview automatically
textInput.addEventListener("input", drawCanvas);
textColor.addEventListener("input", drawCanvas);
fontSize.addEventListener("input", drawCanvas);
fontFamily.addEventListener("change", drawCanvas);

// Download
downloadBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    downloadBtn.href = canvas.toDataURL("image/png");

});

