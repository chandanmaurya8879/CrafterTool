const pdfInput = document.getElementById("pdfInput");
const convertBtn = document.getElementById("convertBtn");
const preview = document.getElementById("preview");

let pdfFile = null;

// Save selected PDF
pdfInput.addEventListener("change", function () {
    pdfFile = this.files[0];
});

// Convert PDF
convertBtn.addEventListener("click", async function () {

    if (!pdfFile) {
        alert("Please select a PDF file.");
        return;
    }

    preview.innerHTML = "";

    const fileReader = new FileReader();

    fileReader.onload = async function () {

        const typedArray = new Uint8Array(this.result);

        const pdf = await pdfjsLib.getDocument({
            data: typedArray
        }).promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {

            const page = await pdf.getPage(pageNum);

            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            const box = document.createElement("div");
            box.className = "page";

            const download = document.createElement("a");
            download.className = "downloadBtn";
            download.textContent = "Download Page " + 
pageNum;
            download.download = "page-" + pageNum + ".jpg";
            download.href = canvas.toDataURL("image/jpeg", 1.0);

            box.appendChild(canvas);
            box.appendChild(download);

            preview.appendChild(box);
        }

    };

    fileReader.readAsArrayBuffer(pdfFile);

});

