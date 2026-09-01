const textInput = document.getElementById("textInput");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const qrContainer = document.getElementById("qrcode");

let qrCode = null;


// Generate QR Code

generateBtn.addEventListener("click", () => {

    const text = textInput.value.trim();

    if(text === ""){

        alert("Please enter some text.");

        return;

    }

    // Clear previous QR code
    qrContainer.innerHTML = "";

    qrCode = new QRCode(qrContainer,{

        text: text,
        width: 250,
        height: 250,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H

    });

    setTimeout(() => {

        downloadBtn.style.display = "inline-block";

    },300);

});




// Download QR Code

downloadBtn.addEventListener("click", () => {

    const img = qrContainer.querySelector("img");
    const canvas = qrContainer.querySelector("canvas");

    let source = null;

    if(img){
        source = img.src;
    }

    if(canvas){
        source = canvas.toDataURL("image/png");
    }

    if(!source){

        alert("Please generate a QR Code first.");

        return;

    }

    const link = document.createElement("a");

    link.href = source;
    link.download = "text-qr-code.png";

    link.click();

});