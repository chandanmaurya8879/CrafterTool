const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");

let selectedFile = null;


// Select PNG image

fileInput.addEventListener("change", function(){

    selectedFile = this.files[0];

    if(!selectedFile){
        return;
    }


    const reader = new FileReader();


    reader.onload = function(e){

        preview.src = e.target.result;
        preview.style.display = "block";

    };


    reader.readAsDataURL(selectedFile);


});



// Convert PNG to JPG

convertBtn.addEventListener("click", function(){


    if(!selectedFile){

        alert("Please select a PNG image first.");
        return;

    }


    const img = new Image();


    img.onload = function(){


        const canvas = document.createElement("canvas");

        const ctx = canvas.getContext("2d");


        canvas.width = img.width;
        canvas.height = img.height;


        // White background for transparent PNG

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0,0,canvas.width,canvas.height);


        ctx.drawImage(img,0,0);



        canvas.toBlob(function(blob){


            const url = URL.createObjectURL(blob);


            downloadBtn.href = url;


        }, "image/jpeg", 0.95);



    };


    img.src = URL.createObjectURL(selectedFile);


});
