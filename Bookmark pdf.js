const pdfFile = document.getElementById("pdfFile");

const bookmarkTitle = document.getElementById("bookmarkTitle");
const pageNumber = document.getElementById("pageNumber");

const addBookmark = document.getElementById("addBookmark");
const bookmarkList = document.getElementById("bookmarkList");

const createPDF = document.getElementById("createPDF");

const downloadBtn = document.getElementById("downloadBtn");
const result = document.getElementById("result");


let pdfBytes = null;
let bookmarks = [];



// Upload PDF

pdfFile.addEventListener("change", async(e)=>{

    const file = e.target.files[0];

    if(!file) return;


    pdfBytes = await file.arrayBuffer();

    result.innerHTML = "PDF selected successfully.";

});




// Add bookmark

addBookmark.addEventListener("click",()=>{


    let title = bookmarkTitle.value.trim();

    let page = pageNumber.value;



    if(!title || !page){

        alert("Enter bookmark title and page number.");

        return;

    }



    bookmarks.push({

        title:title,
        page:page

    });



    displayBookmarks();


    bookmarkTitle.value="";
    pageNumber.value="";


});




// Show bookmarks

function displayBookmarks(){


    bookmarkList.innerHTML="";


    bookmarks.forEach((item,index)=>{


        let li=document.createElement("li");


        li.innerHTML =
        `
        🔖 ${item.title} - Page ${item.page}
        <button onclick="removeBookmark(${index})">
        Remove
        </button>
        `;


        bookmarkList.appendChild(li);


    });


}




// Remove bookmark

function removeBookmark(index){

    bookmarks.splice(index,1);

    displayBookmarks();

}




// Create PDF

createPDF.addEventListener("click",async()=>{


    if(!pdfBytes){

        alert("Please upload PDF.");

        return;

    }



    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);



    const page = pdfDoc.insertPage(0);



    page.drawText(
        "BOOKMARKS",
        {
            x:50,
            y:750,
            size:24
        }
    );



    let y = 700;



    bookmarks.forEach((item)=>{


        page.drawText(
            `${item.title} ........ Page ${item.page}`,
            {
                x:50,
                y:y,
                size:14
            }
        );


        y -= 30;


    });



    const newPdf = await pdfDoc.save();



    const blob = new Blob(
        [newPdf],
        {
            type:"application/pdf"
        }
    );



    const url = URL.createObjectURL(blob);



    downloadBtn.href = url;

    downloadBtn.style.display="inline-block";


    result.innerHTML =
    "✅ Bookmark page added successfully!";


});