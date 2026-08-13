
const fileInput = document.getElementById("fileinput");
const compressRange = document.getElementById("Compress");
const qualityValue = document.getElementById("qualityValue");

const compressBtn = document.getElementById("CompressBtn");
const downloadBtn = document.getElementById("DownloadBtn");

const originalSize = document.getElementById("originalSize");
const compressedSize = document.getElementById("compressedSize");

let compressedBlob = null;


// -----------------------------
// Format file size
// -----------------------------
function formatSize(bytes) {

    if (bytes < 1024) {
        return bytes + " Bytes";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// -----------------------------
// Compression slider
// -----------------------------
compressRange.addEventListener("input", function () {

    qualityValue.textContent = this.value + "%";

});


// -----------------------------
// Select PDF
// -----------------------------
fileInput.addEventListener("change", function () {

    const file = this.files[0];

    compressedBlob = null;

    compressedSize.textContent = "0 KB";

    downloadBtn.disabled = true;

    if (!file) {
        originalSize.textContent = "0 KB";
        return;
    }

    // Check PDF
    if (file.type !== "application/pdf") {

        alert("Please select a PDF file.");

        fileInput.value = "";

        originalSize.textContent = "0 KB";

        return;
    }

    // Show original size
    originalSize.textContent = formatSize(file.size);

});


// -----------------------------
// Compress PDF
// -----------------------------
compressBtn.addEventListener("click", async function () {

    const file = fileInput.files[0];

    if (!file) {

        alert("Please select a PDF file first.");

        return;
    }

    try {

        compressBtn.disabled = true;

        compressBtn.innerHTML = "<strong>Compressing...</strong>";

        const pdfBytes = await file.arrayBuffer();

        // Load PDF
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        /*
        --------------------------------
        Compression percentage
        --------------------------------

        100% = maximum compression setting
        0%   = minimum compression setting
        */

        const compressionLevel = Number(compressRange.value);

        // Save optimized PDF
        const newPdfBytes = await pdfDoc.save({

            useObjectStreams: true,

            addDefaultPage: false,

            objectsPerTick:
                Math.max(
                    10,
                    Math.round(100 - compressionLevel)
                )

        });

        // Create compressed PDF
        compressedBlob = new Blob(
            [newPdfBytes],
            {
                type: "application/pdf"
            }
        );

        // Show compressed size
        compressedSize.textContent =
            formatSize(compressedBlob.size);

        // Enable download button
        downloadBtn.disabled = false;

        compressBtn.innerHTML =
            "<strong>Compress PDF</strong>";

        compressBtn.disabled = false;

    } catch (error) {

        console.error(error);

        alert(
            "Unable to compress this PDF. Please try another PDF."
        );

        compressBtn.innerHTML =
            "<strong>Compress PDF</strong>";

        compressBtn.disabled = false;
    }

});


// -----------------------------
// Download PDF
// -----------------------------
downloadBtn.addEventListener("click", function () {

    if (!compressedBlob) {

        alert("Please compress the PDF first.");

        return;
    }

    const url = URL.createObjectURL(compressedBlob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "compressed.pdf";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

});
