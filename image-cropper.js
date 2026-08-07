const imageInput = document.getElementById("imageInput");
const image = document.getElementById("image");
const cropBtn = document.getElementById("cropBtn");
const downloadBtn = document.getElementById("downloadBtn");

let cropper;


// Upload image

imageInput.addEventListener("change", function(e){

    const file = e.target.files[0];

    if(!file) return;


    const reader = new FileReader();


    reader.onload = function(event){

        image.src = event.target.result;
        image.style.display = "block";


        if(cropper){
            cropper.destroy();
        }


        cropper = new Cropper(image, {

            aspectRatio: NaN,

            viewMode: 1,

            autoCropArea: 1,

            responsive: true

        });


    };


    reader.readAsDataURL(file);

});



// Crop Image

cropBtn.addEventListener("click", function(){


    if(!cropper){

        alert("Please select an image first.");

        return;

    }


    const canvas = cropper.getCroppedCanvas({

        width:800,
        height:800

    });



    canvas.toBlob(function(blob){


        const url = URL.createObjectURL(blob);


        downloadBtn.href = url;


    }, "image/png");


});
