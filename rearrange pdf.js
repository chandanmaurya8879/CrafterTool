const { PDFDocument } = PDFLib;

const pdfFile = document.getElementById("pdfFile");
const info = document.getElementById("info");
const orderInput = document.getElementById("order");
const rearrangeBtn = document.getElementById("rearrangeBtn");
const downloadBtn = document.getElementById("downloadBtn");

let pdfBytes;
let totalPages;

pdfFile.addEventListener("change", async (e)=>{

const file=e.target.files[0];

if(!file)return;

pdfBytes=await file.arrayBuffer();

const pdf=await PDFDocument.load(pdfBytes);

totalPages=pdf.getPageCount();

info.innerHTML="Total Pages: <strong>"+totalPages+"</strong>";

downloadBtn.style.display="none";

});

rearrangeBtn.addEventListener("click",async()=>{

if(!pdfBytes){
alert("Please select a PDF.");
return;
}

const order=orderInput.value
.split(",")
.map(n=>parseInt(n.trim()));

if(order.length!==totalPages){
alert("Please enter all page numbers.");
return;
}

const unique=new Set(order);

if(unique.size!==totalPages){
alert("Duplicate page numbers found.");
return;
}

for(let p of order){

if(p<1||p>totalPages){
alert("Invalid page number.");
return;
}

}

const original=await PDFDocument.load(pdfBytes);

const newPdf=await PDFDocument.create();

for(let p of order){

const [page]=await newPdf.copyPages(original,[p-1]);

newPdf.addPage(page);

}

const bytes=await newPdf.save();

const blob=new Blob([bytes],{
type:"application/pdf"
});

const url=URL.createObjectURL(blob);

downloadBtn.href=url;

downloadBtn.style.display="inline-block";

alert("PDF rearranged successfully.");

});