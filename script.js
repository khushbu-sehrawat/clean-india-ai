const imageInput = document.getElementById("imageInput");

const uploadBox = document.querySelector(".upload-box");

const locationInput = document.getElementById("locationInput");

const resultContainer = document.getElementById("resultContainer");


let selectedImage = null;


/* =========================
   IMAGE UPLOAD
========================= */

imageInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) {
        return;
    }

    selectedImage = file;

    const imageURL = URL.createObjectURL(file);

    uploadBox.innerHTML = `

        <img
            src="${imageURL}"
            alt="Uploaded garbage image"
            class="uploaded-image"
        >

        <h3>
            Image ready for analysis
        </h3>

        <p>
            Your image has been uploaded successfully.
        </p>

        <button
            class="analyze-button"
            id="analyzeButton"
        >
            Analyze with AI →
        </button>

    `;

});


/* =========================
   AI ANALYSIS
========================= */

document.addEventListener("click", async function (event) {

    if (event.target.id !== "analyzeButton") {
        return;
    }


    /* Check image */

    if (!selectedImage) {

        alert("Please upload an image first.");

        return;
    }


    /* Check location */

    const location = locationInput.value.trim();

    if (!location) {

        alert("Please enter the location of the garbage problem.");

        return;
    }


    const button = event.target;


    button.disabled = true;

    button.textContent = "Analyzing...";


    try {

        /*
         Convert image into Base64
         so it can be sent to the backend.
        */

        const base64Image = await convertToBase64(selectedImage);


        /*
         Send image + location
         to our backend.
        */

        const response = await fetch("/api/analyze", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                image: base64Image,

                location: location

            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "AI analysis failed."
            );

        }


        /*
         Gemini returns its generated
         response inside this structure.
        */

        const aiText =
            data.candidates?.[0]?.content?.parts?.[0]?.text;


        if (!aiText) {

            throw new Error(
                "No analysis was returned by AI."
            );

        }


        /*
         Convert Gemini's JSON text
         into a JavaScript object.
        */

        const cleanText = aiText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();


        const result = JSON.parse(cleanText);


        /*
         Display the AI report.
        */

        document.getElementById("resultCategory").textContent =
            result.category || "Not identified";


        document.getElementById("resultSeverity").textContent =
            result.severity || "Not identified";


        document.getElementById("resultPriority").textContent =
            result.priority || "Not identified";


        document.getElementById("resultObservation").textContent =
            result.observation || "No observation available.";


        document.getElementById("resultAction").textContent =
            result.recommendedAction || "No recommendation available.";


        /*
         Show result section.
        */

        resultContainer.style.display = "block";


        /*
         Scroll smoothly to result.
        */

        resultContainer.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    } catch (error) {

        console.error(error);

        alert(
            "Something went wrong while analyzing the image.\n\n" +
            error.message
        );

    }


    button.disabled = false;

    button.textContent = "Analyze with AI →";

});


/* =========================
   IMAGE → BASE64
========================= */

function convertToBase64(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();


        reader.onload = function () {

            /*
             Remove the beginning:
             data:image/jpeg;base64,
             
             because Gemini only needs
             the actual Base64 data.
            */

            const base64 =
                reader.result.split(",")[1];

            resolve(base64);

        };


        reader.onerror = function (error) {

            reject(error);

        };


        reader.readAsDataURL(file);

    });

}