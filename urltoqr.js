const urlInput = document.getElementById("urlInput");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const qrContainer = document.getElementById("qrcode");

let qrCode = null;


// Generate QR Code

generateBtn.addEventListener("click", () => {

    const url = urlInput.value.trim();

    if(url === ""){

        alert("Please enter a URL.");

        return;

    }

    // Basic URL validation
    try{
        new URL(url);
    }
    catch(err){

        alert("Please enter a valid URL.\nExample: https://example.com");

        return;

    }

    qrContainer.innerHTML = "";

    qrCode = new QRCode(qrContainer,{

        text:url,
        width:250,
        height:250,
        colorDark:"#000000",
        colorLight:"#ffffff",
        correctLevel:QRCode.CorrectLevel.H

    });

    setTimeout(()=>{

        downloadBtn.style.display="inline-block";

    },300);

});




// Download QR Code

downloadBtn.addEventListener("click",()=>{

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

        alert("Generate a QR code first.");

        return;

    }

    const link = document.createElement("a");

    link.href = source;

    link.download = "qr-code.png";

    link.click();

});