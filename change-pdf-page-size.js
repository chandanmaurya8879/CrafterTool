const pdfFile = document.getElementById("pdfFile");
const pageSize = document.getElementById("pageSize");

const changeBtn = document.getElementById("changeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const result = document.getElementById("result");


let pdfBytes = null;


// Upload PDF

pdfFile.addEventListener("change", async(e)=>{

    const file = e.target.files[0];

    if(!file) return;


    pdfBytes = await file.arrayBuffer();

    result.innerHTML = "PDF selected successfully.";

});




// Change PDF Page Size

changeBtn.addEventListener("click", async()=>{


    if(!pdfBytes){

        alert("Please select a PDF file.");

        return;

    }



    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);



    let width;
    let height;



    // Sizes in points

    switch(pageSize.value){


        case "A3":

            width = 841.89;
            height = 1190.55;

        break;



        case "Letter":

            width = 612;
            height = 792;

        break;



        case "Legal":

            width = 612;
            height = 1008;

        break;



        default: // A4

            width = 595.28;
            height = 841.89;

    }




    const pages = pdfDoc.getPages();



    pages.forEach(page=>{


        page.setSize(
            width,
            height
        );


    });




    const newPdf = await pdfDoc.save();



    const blob = new Blob(
        [newPdf],
        {
            type:"application/pdf"
        }
    );



    const url = URL.createObjectURL(blob);



    downloadBtn.href = url;

    downloadBtn.style.display="inline-block";



    result.innerHTML =
    "✅ PDF page size changed successfully!";


});