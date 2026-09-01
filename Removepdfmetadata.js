const pdfFile = document.getElementById("pdfFile");
const removeBtn = document.getElementById("removeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const result = document.getElementById("result");


let pdfBytes = null;



pdfFile.addEventListener("change", async (e)=>{

    const file = e.target.files[0];

    if(!file){
        return;
    }

    pdfBytes = await file.arrayBuffer();

    result.innerHTML = "PDF selected successfully.";

    downloadBtn.style.display="none";

});



removeBtn.addEventListener("click", async()=>{


    if(!pdfBytes){

        alert("Please select a PDF file.");

        return;

    }



    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);



    // Remove PDF metadata

    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator("");
    pdfDoc.setProducer("");



    const newPdfBytes = await pdfDoc.save();



    const blob = new Blob(
        [newPdfBytes],
        {type:"application/pdf"}
    );



    const url = URL.createObjectURL(blob);



    downloadBtn.href = url;

    downloadBtn.style.display="inline-block";



    result.innerHTML = 
    "✅ Metadata removed successfully!";


});