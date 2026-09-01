pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


const pdf1 = document.getElementById("pdf1");
const pdf2 = document.getElementById("pdf2");

const compareBtn = document.getElementById("compareBtn");
const result = document.getElementById("result");



async function extractText(file){

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer
    }).promise;


    let text = "";


    for(let i = 1; i <= pdf.numPages; i++){

        const page = await pdf.getPage(i);

        const content = await page.getTextContent();


        content.items.forEach(item => {

            text += item.str + " ";

        });

    }


    return text.trim();

}



compareBtn.addEventListener("click", async()=>{


    if(!pdf1.files[0] || !pdf2.files[0]){

        alert("Please select both PDF files.");

        return;

    }


    result.innerHTML = "Comparing PDFs...";


    const text1 = await extractText(pdf1.files[0]);

    const text2 = await extractText(pdf2.files[0]);



    if(text1 === text2){

        result.innerHTML = `
        ✅ <b>PDFs are identical.</b><br>
        No text differences found.
        `;

    }
    else{

        let words1 = text1.split(" ");
        let words2 = text2.split(" ");


        let differences = [];


        let max = Math.max(words1.length, words2.length);


        for(let i=0; i<max; i++){

            if(words1[i] !== words2[i]){

                differences.push(
                    `Difference at word ${i+1}: 
                    "${words1[i] || ""}" 
                    → 
                    "${words2[i] || ""}"`
                );

            }

        }



        result.innerHTML = `
        ❌ <b>PDFs are different.</b>
        <br><br>
        ${differences.slice(0,20).join("<br>")}
        `;

    }


});