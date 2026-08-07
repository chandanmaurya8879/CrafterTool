const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");

let selectedFile = null;

fileInput.addEventListener("change", function(){

    selectedFile = this.files[0];

    if(!selectedFile) return;

    const reader = new FileReader();

    reader.onload = function(e){

        preview.src = e.target.result;
        preview.style.display = "block";

    };

    reader.readAsDataURL(selectedFile);

});

convertBtn.addEventListener("click", function(){

    if(!selectedFile){
        alert("Please select a JPG image.");
        return;
    }

    const img = new Image();

    img.onload = function(){

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img,0,0);

        canvas.toBlob(function(blob){

            downloadBtn.href = URL.createObjectURL(blob);

        },"image/png");

    };

    img.src = URL.createObjectURL(selectedFile);

});
