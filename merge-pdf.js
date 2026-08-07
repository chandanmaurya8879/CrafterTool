const pdfFiles = document.getElementById("pdfFiles");
const fileList = document.getElementById("fileList");
const mergeBtn = document.getElementById("mergeBtn");

let files = [];

// Show selected files
pdfFiles.addEventListener("change", function () {

    files = Array.from(this.files);

    fileList.innerHTML = "";

    files.forEach((file, index) => {

        const li = document.createElement("li");
        li.textContent = (index + 1) + ". " + file.name;

        fileList.appendChild(li);

    });

});

// Merge PDFs
mergeBtn.addEventListener("click", async function () {

    if (files.length < 2) {
        alert("Please select at least 2 PDF files.");
        return;
    }

    const mergedPdf = await PDFLib.PDFDocument.create();

    for (const file of files) {

        const bytes = await file.arrayBuffer();

        const pdf = await PDFLib.PDFDocument.load(bytes);

        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        pages.forEach(page => mergedPdf.addPage(page));

    }

    const mergedBytes = await mergedPdf.save();

    const blob = new Blob([mergedBytes], {
        type: "application/pdf"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "PixelTools-Merged.pdf";

    a.click();

    URL.revokeObjectURL(url);

});
