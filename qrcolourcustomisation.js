const qrUpload = document.getElementById("qrUpload");

const qrColor = document.getElementById("qrColor");
const bgColor = document.getElementById("bgColor");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const applyBtn = document.getElementById("applyBtn");
const downloadBtn = document.getElementById("downloadBtn");


let originalImage = null;



// Upload QR Image

qrUpload.addEventListener("change",(e)=>{

    const file = e.target.files[0];

    if(!file) return;


    const img = new Image();

    img.onload = ()=>{

        originalImage = img;

        canvas.width = img.width;
        canvas.height = img.height;


        ctx.drawImage(
            img,
            0,
            0
        );

    };


    img.src = URL.createObjectURL(file);


});




// Apply QR Color Customization

applyBtn.addEventListener("click",()=>{


    if(!originalImage){

        alert("Please upload a QR code first.");

        return;

    }



    ctx.drawImage(
        originalImage,
        0,
        0
    );



    const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const pixels = imageData.data;



    const qrRGB = hexToRGB(qrColor.value);

    const bgRGB = hexToRGB(bgColor.value);



    for(let i=0;i<pixels.length;i+=4){


        const r = pixels[i];
        const g = pixels[i+1];
        const b = pixels[i+2];


        // Detect dark QR pixels

        if(r < 100 && g < 100 && b < 100){

            pixels[i] = qrRGB.r;
            pixels[i+1] = qrRGB.g;
            pixels[i+2] = qrRGB.b;

        }

        else{

            pixels[i] = bgRGB.r;
            pixels[i+1] = bgRGB.g;
            pixels[i+2] = bgRGB.b;

        }


    }



    ctx.putImageData(
        imageData,
        0,
        0
    );


    downloadBtn.style.display="inline-block";


});




// Convert HEX to RGB

function hexToRGB(hex){

    hex = hex.replace("#","");


    return {

        r:parseInt(hex.substring(0,2),16),

        g:parseInt(hex.substring(2,4),16),

        b:parseInt(hex.substring(4,6),16)

    };

}




// Download QR

downloadBtn.addEventListener("click",()=>{


    const link = document.createElement("a");


    link.download = "custom-qr.png";


    link.href = canvas.toDataURL("image/png");


    link.click();


});