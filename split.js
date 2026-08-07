const pdfInput = document.getElementById("pdfInput");
const pageNumbers = document.getElementById("pageNumbers");
const splitBtn = document.getElementById("splitBtn");

let pdfFile = null;

// Store selected PDF
pdfInput.addEventListener("change", function () {
    pdfFile = this.files[0];
});

// Split PDF
splitBtn.addEventListener("click", async function () {

    if (!pdfFile) {
        alert("Please select a PDF file.");
        return;
    }

    if (pageNumbers.value.trim() === "") {
        alert("Please enter page numbers.");
        return;
    }

    try {

        const bytes = await pdfFile.arrayBuffer();

        const sourcePdf = await PDFLib.PDFDocument.load(bytes);

        const newPdf = await PDFLib.PDFDocument.create();

        const pages = pageNumbers.value
            .split(",")
            .map(num => parseInt(num.trim()) - 1);

        for (const pageIndex of pages) {

            if (
                pageIndex >= 0 &&
                pageIndex < sourcePdf.getPageCount()
            ) {

                const [page] = await newPdf.copyPages(
                    sourcePdf,
                    [pageIndex]
                );

                newPdf.addPage(page);

            }

        }

        if (newPdf.getPageCount() === 0) {
            alert("No valid pages selected.");
            return;
        }

        const pdfBytes = await newPdf.save();

        const blob = new Blob([pdfBytes], {
            type: "application/pdf"
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");

     a.href = url;
        a.download = "Split-PDF.pdf";

        a.click();

        URL.revokeObjectURL(url);

    } catch (error) {

        console.error(error);
        alert("Failed to split PDF.");

    }

});  
