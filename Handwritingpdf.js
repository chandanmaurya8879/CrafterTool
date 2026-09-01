const pdfFile = document.getElementById("pdfFile");

const pdfCanvas = document.getElementById("pdfCanvas");
const drawCanvas = document.getElementById("drawCanvas");

const pdfCtx = pdfCanvas.getContext("2d");
const drawCtx = drawCanvas.getContext("2d");


const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");


let pdfBytes;
let drawing=false;



pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";



pdfFile.addEventListener("change",async(e)=>{


const file=e.target.files[0];

if(!file)return;


pdfBytes=await file.arrayBuffer();


const pdf=await pdfjsLib.getDocument({
data:pdfBytes
}).promise;



const page=await pdf.getPage(1);


const viewport=page.getViewport({
scale:1.5
});


pdfCanvas.width=viewport.width;
pdfCanvas.height=viewport.height;

drawCanvas.width=viewport.width;
drawCanvas.height=viewport.height;



await page.render({

canvasContext:pdfCtx,
viewport:viewport

}).promise;



});





drawCanvas.addEventListener("mousedown",()=>{

drawing=true;

});


drawCanvas.addEventListener("mouseup",()=>{

drawing=false;
drawCtx.beginPath();

});



drawCanvas.addEventListener("mousemove",(e)=>{


if(!drawing)return;


const rect=drawCanvas.getBoundingClientRect();


drawCtx.lineWidth=3;

drawCtx.lineCap="round";

drawCtx.strokeStyle="black";


drawCtx.lineTo(
e.clientX-rect.left,
e.clientY-rect.top
);


drawCtx.stroke();


drawCtx.beginPath();


drawCtx.moveTo(
e.clientX-rect.left,
e.clientY-rect.top
);


});





clearBtn.onclick=()=>{

drawCtx.clearRect(
0,
0,
drawCanvas.width,
drawCanvas.height
);

};





downloadBtn.onclick=async()=>{


if(!pdfBytes){

alert("Please upload PDF first");

return;

}


const pdfDoc=await PDFDocument.load(pdfBytes);


const page=pdfDoc.getPage(0);



const image=await pdfDoc.embedPng(
drawCanvas.toDataURL("image/png")
);



page.drawImage(image,{

x:0,
y:0,
width:page.getWidth(),
height:page.getHeight()

});



const finalPdf=await pdfDoc.save();


const blob=new Blob([finalPdf],{
type:"application/pdf"
});


const link=document.createElement("a");

link.href=URL.createObjectURL(blob);

link.download="handwritten.pdf";

link.click();


};