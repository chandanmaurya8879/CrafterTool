const pdfInput = document.getElementById("pdfInput");
const rotation = document.getElementById("rotation");
const rotateBtn = document.getElementById("rotateBtn");

let pdfFile = null;

// Store selected PDF
pdfInput.addEventListener("change", function () {
    pdfFile = this.files[0];
});

// Rotate PDF
rotateBtn.addEventListener("click", async function () {

    if (!pdfFile) {
        alert("Please select a PDF file.");
        return;
    }

    try {

        const bytes = await pdfFile.arrayBuffer();

        const pdfDoc = await PDFLib.PDFDocument.load(bytes);

        const pages = pdfDoc.getPages();

        const angle = parseInt(rotation.value);

        pages.forEach(page => {

            page.setRotation(
                PDFLib.degrees(angle)
            );

        });

        const pdfBytes = await pdfDoc.save();

        const blob = new Blob([pdfBytes], {
            type: "application/pdf"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "rotated-pdf.pdf";

        link.click();

        URL.revokeObjectURL(url);

    } catch (err) {

        console.error(err);
        alert("Failed to rotate PDF.");

    }

});
