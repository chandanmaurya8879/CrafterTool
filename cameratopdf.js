const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const startCamera = document.getElementById("startCamera");
const capturePhoto = document.getElementById("capturePhoto");
const createPDF = document.getElementById("createPDF");

const preview = document.getElementById("preview");

const ctx = canvas.getContext("2d");

let stream = null;
let images = [];


// Open Camera

startCamera.addEventListener("click", async () => {

    try{

        stream = await navigator.mediaDevices.getUserMedia({

            video:{
                facingMode:"environment"
            }

        });

        video.srcObject = stream;

    }
    catch(err){

        alert("Unable to access camera.");

    }

});




// Capture Photo

capturePhoto.addEventListener("click",()=>{

    if(!stream){

        alert("Please open the camera first.");

        return;

    }


    canvas.width = video.videoWidth;

    canvas.height = video.videoHeight;


    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    const image = canvas.toDataURL("image/jpeg",1);

    images.push(image);

    showImages();

});




// Preview Images

function showImages(){

    preview.innerHTML = "";


    images.forEach((img,index)=>{

        const card = document.createElement("div");

        card.className = "image-card";


        card.innerHTML =

        `
        <img src="${img}">

        <button
        class="deleteBtn"
        onclick="deleteImage(${index})">
        Delete
        </button>
        `;


        preview.appendChild(card);

    });

}



// Delete Image

function deleteImage(index){

    images.splice(index,1);

    showImages();

}

// Create PDF

createPDF.addEventListener("click", () => {

    if(images.length === 0){

        alert("Please capture at least one photo.");

        return;

    }

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({

        orientation:"portrait",

        unit:"mm",

        format:"a4"

    });

    let loaded = 0;

    images.forEach((image,index)=>{

        const img = new Image();

        img.onload = function(){

            const pageWidth = 210;
            const pageHeight = 297;

            const imgWidth = img.width;
            const imgHeight = img.height;

            const ratio = Math.min(
                pageWidth / imgWidth,
                pageHeight / imgHeight
            );

            const width = imgWidth * ratio;
            const height = imgHeight * ratio;

            const x = (pageWidth - width) / 2;
            const y = (pageHeight - height) / 2;

            if(index !== 0){
                pdf.addPage();
            }

            pdf.addImage(
                image,
                "JPEG",
                x,
                y,
                width,
                height
            );

            loaded++;

            if(loaded === images.length){

                pdf.save("camera-to-pdf.pdf");

            }

        };

        img.src = image;

    });

});



// Stop Camera When Leaving Page

window.addEventListener("beforeunload", () => {

    if(stream){

        stream.getTracks().forEach(track => track.stop());

    }

});