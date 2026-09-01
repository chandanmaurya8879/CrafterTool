pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const pdfFile = document.getElementById("pdfFile");
const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");
const pageInfo = document.getElementById("pageInfo");

let pdfDoc = null;
let currentPage = 1;
let scale = 1.5;
let rendering = false;



// Upload PDF

pdfFile.addEventListener("change", function(e){

    const file = e.target.files[0];

    if(!file) return;

    const reader = new FileReader();

    reader.onload = function(){

        const typedArray = new Uint8Array(reader.result);

        pdfjsLib.getDocument(typedArray).promise.then(function(pdf){

            pdfDoc = pdf;

            currentPage = 1;

            renderPage(currentPage);

        });

    };

    reader.readAsArrayBuffer(file);

});




// Render Page

function renderPage(num){

    rendering = true;

    pdfDoc.getPage(num).then(function(page){

        const viewport = page.getViewport({
            scale: scale
        });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {

            canvasContext: ctx,

            viewport: viewport

        };

        page.render(renderContext).promise.then(function(){

            rendering = false;

        });

        pageInfo.textContent =
        "Page " + currentPage + " / " + pdfDoc.numPages;

    });

}



// Previous Page

prevPage.addEventListener("click", function(){

    if(!pdfDoc) return;

    if(currentPage <= 1) return;

    currentPage--;

    renderPage(currentPage);

});




// Next Page

nextPage.addEventListener("click", function(){

    if(!pdfDoc) return;

    if(currentPage >= pdfDoc.numPages) return;

    currentPage++;

    renderPage(currentPage);

});




// Zoom In

zoomIn.addEventListener("click", function(){

    if(!pdfDoc) return;

    scale += 0.2;

    renderPage(currentPage);

});




// Zoom Out

zoomOut.addEventListener("click", function(){

    if(!pdfDoc) return;

    if(scale <= 0.6) return;

    scale -= 0.2;

    renderPage(currentPage);

});