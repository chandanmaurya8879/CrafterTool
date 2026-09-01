const ssidInput = document.getElementById("ssid");
const passwordInput = document.getElementById("password");
const securityInput = document.getElementById("security");

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");

const qrContainer = document.getElementById("qrcode");



// Generate WiFi QR Code

generateBtn.addEventListener("click",()=>{


    const ssid = ssidInput.value.trim();
    const password = passwordInput.value.trim();
    const security = securityInput.value;



    if(ssid === ""){

        alert("Please enter WiFi name.");

        return;

    }



    qrContainer.innerHTML = "";



    // WiFi QR format

    const wifiText = 
    `WIFI:T:${security};S:${ssid};P:${password};;`;



    new QRCode(qrContainer,{

        text:wifiText,

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

    link.download = "wifi-qr-code.png";


    link.click();


});