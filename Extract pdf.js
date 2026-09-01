pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const fileInput = document.getElementById("pdfFile");
const output = document.getElementById("output");

fileInput.addEventListener("change", async (e) => {

    output.innerHTML = "";

    const file = e.target.files[0];

    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer
    }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {

        const page = await pdf.getPage(i);

        const viewport = page.getViewport({
            scale: 2
        });

        const canvas = document.createElement("canvas");

        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const imageURL = canvas.toDataURL("image/png");

        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.src = imageURL;

        const download = document.createElement("a");
        download.href = imageURL;
        download.download = `page-${i}.png`;
        download.innerText = "Download Image";

        card.appendChild(img);
        card.appendChild(download);

        output.appendChild(card);
    }

});