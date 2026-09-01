const pdfFile = document.getElementById("pdfFile");
const position = document.getElementById("position");

const addBtn = document.getElementById("addBtn");
const downloadBtn = document.getElementById("downloadBtn");
const result = document.getElementById("result");

let pdfBytes = null;


// Upload PDF

pdfFile.addEventListener("change", async(e)=>{

    const file = e.target.files[0];

    if(!file) return;

    pdfBytes = await file.arrayBuffer();

    result.innerHTML = "PDF selected successfully.";

    downloadBtn.style.display = "none";

});



// Add Page Numbers

addBtn.addEventListener("click", async()=>{

    if(!pdfBytes){

        alert("Please select a PDF.");

        return;

    }


    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();



    pages.forEach((page,index)=>{

        const { width, height } = page.getSize();

        let x = 0;
        let y = 0;

        const text = `${index + 1} / ${pages.length}`;

        switch(position.value){

            case "bottom-center":

                x = width / 2 - 15;
                y = 20;

            break;


            case "bottom-right":

                x = width - 60;
                y = 20;

            break;


            case "top-center":

                x = width / 2 - 15;
                y = height - 30;

            break;


            case "top-right":

                x = width - 60;
                y = height - 30;

            break;

        }



        page.drawText(text,{

            x:x,
            y:y,
            size:12,
            color:PDFLib.rgb(0,0,0)

        });


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

    downloadBtn.style.display = "inline-block";



    result.innerHTML =
    "✅ Page numbers added successfully!";

});