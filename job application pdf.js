const createBtn = document.getElementById("createBtn");


createBtn.addEventListener("click",()=>{


    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const education = document.getElementById("education").value;
    const experience = document.getElementById("experience").value;
    const skills = document.getElementById("skills").value;
    const message = document.getElementById("message").value;



    if(!name || !email){

        alert("Please enter name and email.");

        return;

    }



    const { jsPDF } = window.jspdf;


    const pdf = new jsPDF();



    pdf.setFontSize(20);
    pdf.text("JOB APPLICATION",20,25);



    pdf.setFontSize(12);


    let y = 45;



    pdf.text(`Name: ${name}`,20,y);
    y += 10;


    pdf.text(`Email: ${email}`,20,y);
    y += 10;


    pdf.text(`Phone: ${phone}`,20,y);
    y += 10;


    pdf.text(`Education: ${education}`,20,y);
    y += 10;


    pdf.text(`Experience: ${experience}`,20,y);
    y += 10;


    pdf.text(`Skills: ${skills}`,20,y);
    y += 20;



    pdf.text("Cover Letter:",20,y);

    y += 10;



    const lines = pdf.splitTextToSize(
        message,
        170
    );


    pdf.text(
        lines,
        20,
        y
    );



    pdf.save("Job-Application.pdf");


});