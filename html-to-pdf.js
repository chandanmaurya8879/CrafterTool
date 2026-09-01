const htmlCode = document.getElementById("htmlCode");

const previewBtn = document.getElementById("previewBtn");
const pdfBtn = document.getElementById("pdfBtn");

const previewBox = document.getElementById("previewBox");



// Show HTML Preview

previewBtn.addEventListener("click",()=>{


    previewBox.innerHTML = htmlCode.value;


});




// Convert HTML to PDF

pdfBtn.addEventListener("click",async()=>{


    if(previewBox.innerHTML.trim()===""){

        alert("Please preview HTML first.");

        return;

    }



    const canvas = await html2canvas(previewBox,{

        scale:2

    });



    const imgData = canvas.toDataURL("image/png");



    const { jsPDF } = window.jspdf;



    const pdf = new jsPDF({

        orientation:"portrait",

        unit:"mm",

        format:"a4"

    });



    const pdfWidth = pdf.internal.pageSize.getWidth();

    const pdfHeight =
    (canvas.height * pdfWidth) / canvas.width;



    pdf.addImage(

        imgData,

        "PNG",

        0,

        10,

        pdfWidth,

        pdfHeight

    );



    pdf.save("html-document.pdf");


});