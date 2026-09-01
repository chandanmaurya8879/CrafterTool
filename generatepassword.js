const password = document.getElementById("password");

const length = document.getElementById("length");
const lengthValue = document.getElementById("lengthValue");

const uppercase = document.getElementById("uppercase");
const lowercase = document.getElementById("lowercase");
const numbers = document.getElementById("numbers");
const symbols = document.getElementById("symbols");

const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");

const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lowerChars = "abcdefghijklmnopqrstuvwxyz";
const numberChars = "0123456789";
const symbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";


// Update Length

length.addEventListener("input",()=>{

    lengthValue.textContent =
    length.value + " Characters";

});




// Generate Password

generateBtn.addEventListener("click",()=>{

    let chars = "";

    if(uppercase.checked){

        chars += upperChars;

    }

    if(lowercase.checked){

        chars += lowerChars;

    }

    if(numbers.checked){

        chars += numberChars;

    }

    if(symbols.checked){

        chars += symbolChars;

    }

    if(chars === ""){

        alert("Select at least one option.");

        return;

    }

    let generatedPassword = "";

    const randomValues = new Uint32Array(length.value);
    crypto.getRandomValues(randomValues);

    for(let i = 0; i < length.value; i++){

        generatedPassword +=
        chars[randomValues[i] % chars.length];

    }

    password.value = generatedPassword;

});




// Copy Password

copyBtn.addEventListener("click",async()=>{

    if(password.value === ""){

        alert("Generate a password first.");

        return;

    }

    try{

        await navigator.clipboard.writeText(password.value);

        alert("Password copied!");

    }

    catch{

        password.select();
        document.execCommand("copy");
        alert("Password copied!");
    }

});