const { PDFDocument } = PDFLib;

const pdfFile = document.getElementById("pdfFile");
const pagesInput = document.getElementById("pages");
const removeBtn = document.getElementById("removeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const info = document.getElementById("info");

let pdfBytes = null;
let totalPages = 0;

pdfFile.addEventListener("change", async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    pdfBytes = await file.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes);

    totalPages = pdfDoc.getPageCount();

    info.innerHTML = "Total Pages: <strong>" + totalPages + "</strong>";

    downloadBtn.style.display = "none";

});

removeBtn.addEventListener("click", async () => {

    if (!pdfBytes) {
        alert("Please select a PDF file.");
        return;
    }

    const removePages = pagesInput.value
        .split(",")
        .map(p => parseInt(p.trim()))
        .filter(p => !isNaN(p) && p >= 1 && p <= totalPages);

    const originalPdf = await PDFDocument.load(pdfBytes);

    const newPdf = await PDFDocument.create();

    for (let i = 0; i < totalPages; i++) {

        if (!removePages.includes(i + 1)) {

            const [page] = await newPdf.copyPages(originalPdf, [i]);

            newPdf.addPage(page);
        }
    }

    if (newPdf.getPageCount() === 0) {
        alert("You cannot remove all pages.");
        return;
    }

    const newPdfBytes = await newPdf.save();

    const blob = new Blob([newPdfBytes], {
        type: "application/pdf"
    });

    const url = URL.createObjectURL(blob);

    downloadBtn.href = url;
    downloadBtn.style.display = "inline-block";

    alert("Pages removed successfully!");

});