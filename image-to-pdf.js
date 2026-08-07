const { jsPDF } = window.jspdf;

const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");

let selectedImages = [];

// Upload Images
imageInput.addEventListener("change", function () {

    preview.innerHTML = "";
    selectedImages = [];

    const files = Array.from(this.files);

    files.forEach(file => {

        const reader = new FileReader();

        reader.onload = function (e) {

            const img = new Image();

            img.src = e.target.result;

            img.onload = function () {

                selectedImages.push(img);

                preview.appendChild(img);

            };

        };

        reader.readAsDataURL(file);

    });

});

// Convert Images to PDF
convertBtn.addEventListener("click", function () {

    if (selectedImages.length === 0) {
        alert("Please select one or more images.");
        return;
    }

    const pdf = new jsPDF("p", "mm", "a4");

    selectedImages.forEach((img, index) => {

        if (index > 0) {
            pdf.addPage();
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const ratio = Math.min(
            pageWidth / img.width,
            pageHeight / img.height
        );

        const imgWidth = img.width * ratio;
        const imgHeight = img.height * ratio;

        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        pdf.addImage(img, "JPEG", x, y, imgWidth, imgHeight);

    });

    pdf.save("PixelTools-Image-to-PDF.pdf");

});
