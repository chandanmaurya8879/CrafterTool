/*const fileInput = document.getElementById("fileInput");
const image = document.getElementById("image");

const rotateLeftBtn = document.getElementById("rotateLeft");
const rotateRightBtn = document.getElementById("rotateRight");
const flipHorizontalBtn = document.getElementById("flipHorizontal");
const flipVerticalBtn = document.getElementById("flipVertical");

const downloadBtn = document.getElementById("downloadBtn");


let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");

let img = new Image();

let rotation = 0;
let flipX = 1;
let flipY = 1;


// Upload image

fileInput.addEventListener("change", function(){

    const file = this.files[0];

    if(!file) return;


    const reader = new FileReader();


    reader.onload = function(e){

        img.onload = function(){

            image.src = e.target.result;
            image.style.display = "block";

            rotation = 0;
            flipX = 1;
            flipY = 1;

        };


        img.src = e.target.result;

    };


    reader.readAsDataURL(file);

});


// Draw image

function drawImage()
{

    canvas.width = img.width;
    canvas.height = img.height;


    ctx.clearRect(0,0,canvas.width,canvas.height);


    ctx.save();


    ctx.translate(canvas.width/2, canvas.height/2);


    ctx.rotate(rotation * Math.PI / 180);


    ctx.scale(flipX, flipY);



    ctx.drawImage(
        img,
        -img.width/2,
        -img.height/2
    );


    ctx.restore();

}


// Rotate left

rotateLeftBtn.addEventListener("click",function(){

    rotation -= 90;

    drawImage();

});


// Rotate right

rotateRightBtn.addEventListener("click",function(){

    rotation += 90;

    drawImage();

});


// Flip horizontal

flipHorizontalBtn.addEventListener("click",function(){

    flipX *= -1;

    drawImage();

});


// Flip vertical

flipVerticalBtn.addEventListener("click",function(){

    flipY *= -1;

    drawImage();

});


// Download

downloadBtn.addEventListener("click",function(){

    if(!img.src){
        alert("Please select an image first.");
        return;
    }


    drawImage();


    downloadBtn.href = canvas.toDataURL("image/png");

    downloadBtn.download = "rotated-image.png";

});*/
const fileInput = document.getElementById("fileInput");
const image = document.getElementById("image");

const rotateLeftBtn = document.getElementById("rotateLeft");
const rotateRightBtn = document.getElementById("rotateRight");
const flipHorizontalBtn = document.getElementById("flipHorizontal");
const flipVerticalBtn = document.getElementById("flipVertical");
const downloadBtn = document.getElementById("downloadBtn");

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

const img = new Image();

let rotation = 0;
let flipX = 1;
let flipY = 1;

// Upload Image
fileInput.addEventListener("change", function () {

    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        img.onload = function () {

            rotation = 0;
            flipX = 1;
            flipY = 1;

            drawImage();

        };

        img.src = e.target.result;

    };

    reader.readAsDataURL(file);

});

// Draw Image
function drawImage() {

    if (!img.src) return;

    const angle = rotation % 360;

    if (angle === 90 || angle === -270 || angle === 270 || angle === -90) {
        canvas.width = img.height;
        canvas.height = img.width;
    } else {
        canvas.width = img.width;
        canvas.height = img.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);

    ctx.rotate(rotation * Math.PI / 180);

    ctx.scale(flipX, flipY);

    ctx.drawImage(
        img,
        -img.width / 2,
        -img.height / 2
    );

    ctx.restore();

    // Update Preview
    image.src = canvas.toDataURL("image/png");
}

// Rotate Left
rotateLeftBtn.addEventListener("click", function () {
    rotation -= 90;
    drawImage();
});

// Rotate Right
rotateRightBtn.addEventListener("click", function () {
    rotation += 90;
    drawImage();
});

// Flip Horizontal
flipHorizontalBtn.addEventListener("click", function () {
    flipX *= -1;
    drawImage();
});

// Flip Vertical
flipVerticalBtn.addEventListener("click", function () {
    flipY *= -1;
    drawImage();
});

// Download Image
downloadBtn.addEventListener("click", function () {

    if (!img.src) {
        alert("Please upload an image first.");
        return;
    }

    drawImage();

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "edited-image.png";
    link.click();

});
