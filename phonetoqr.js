const phoneInput = document.getElementById("phoneInput");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const qrContainer = document.getElementById("qrcode");


// Generate QR Code

generateBtn.addEventListener("click",()=>{

    const phone = phoneInput.value.trim();


    if(phone === ""){

        alert("Please enter phone number.");

        return;

    }


    // Clear old QR
    qrContainer.innerHTML = "";


    // Telephone QR format
    const qrText = "tel:" + phone;


    new QRCode(qrContainer,{

        text: qrText,

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


    let imageURL = null;


    if(img){

        imageURL = img.src;

    }


    if(canvas){

        imageURL = canvas.toDataURL("image/png");

    }


    if(!imageURL){

        alert("Generate QR code first.");

        return;

    }


    const link = document.createElement("a");


    link.href = imageURL;

    link.download = "phone-number-qr.png";


    link.click();


});