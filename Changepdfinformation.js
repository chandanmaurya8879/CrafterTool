const pdfFile = document.getElementById("pdfFile");

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const subjectInput = document.getElementById("subject");
const keywordsInput = document.getElementById("keywords");
const creatorInput = document.getElementById("creator");

const changeBtn = document.getElementById("changeBtn");
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



changeBtn.addEventListener("click", async()=>{


    if(!pdfBytes){

        alert("Please select a PDF file.");

        return;

    }



    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);



    // Change PDF information

    if(titleInput.value){
        pdfDoc.setTitle(titleInput.value);
    }


    if(authorInput.value){
        pdfDoc.setAuthor(authorInput.value);
    }


    if(subjectInput.value){
        pdfDoc.setSubject(subjectInput.value);
    }


    if(keywordsInput.value){

        const keywords = keywordsInput.value
        .split(",")
        .map(item => item.trim());

        pdfDoc.setKeywords(keywords);

    }


    if(creatorInput.value){
        pdfDoc.setCreator(creatorInput.value);
    }



    const newPdfBytes = await pdfDoc.save();



    const blob = new Blob(
        [newPdfBytes],
        {type:"application/pdf"}
    );


    const url = URL.createObjectURL(blob);



    downloadBtn.href = url;

    downloadBtn.style.display="inline-block";


    result.innerHTML =
    "✅ PDF information updated successfully!";


});