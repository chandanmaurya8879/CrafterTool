const imageInput = document.getElementById("imageInput");
const format = document.getElementById("format");
const convertBtn = document.getElementById("convertBtn");
const downloads = document.getElementById("downloads");

convertBtn.addEventListener("click", () => {

    const files = imageInput.files;

    if (files.length === 0) {
        alert("Please select one or more images.");
        return;
    }

    downloads.innerHTML = "";

    Array.from(files).forEach((file, index) => {

        const reader = new FileReader();

        reader.onload = function (e) {

            const img = new Image();

            img.onload = function () {

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);

                const mimeType = format.value;

                let extension = "png";

                if (mimeType === "image/jpeg") {
                    extension = "jpg";
                } else if (mimeType === "image/webp") {
                    extension = "webp";
                }

                const dataURL = canvas.toDataURL(mimeType, 0.95);

                const link = document.createElement("a");
                link.href = dataURL;
                link.download = `image-${index + 1}.${extension}`;
                link.textContent = `Download Image ${index + 1}`;

                link.className = "download-link";

                downloads.appendChild(link);

            };

            img.src = e.target.result;

        };

        reader.readAsDataURL(file);

    });

});
