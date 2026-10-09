const imageInput = document.getElementById("imageInput");
const uploadBox = document.querySelector(".upload-box");
const locationInput = document.getElementById("locationInput");
const resultContainer = document.getElementById("resultContainer");

let selectedImage = null;

imageInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    selectedImage = file;

    const imageURL = URL.createObjectURL(file);

    uploadBox.innerHTML = `
        <img src="${imageURL}" alt="Uploaded garbage image" class="uploaded-image">
        <h3>Image ready for analysis</h3>
        <p>Your image has been uploaded successfully.</p>
        <button class="analyze-button" id="analyzeButton" type="button">
            Analyze with AI →
        </button>
    `;
});

document.addEventListener("click", async function (event) {
    if (event.target.id !== "analyzeButton") return;

    if (!selectedImage) {
        alert("Please upload an image first.");
        return;
    }

    const location = locationInput.value.trim();

    if (!location) {
        alert("Please enter the location of the garbage problem.");
        return;
    }

    const button = event.target;
    button.disabled = true;
    button.textContent = "Analyzing...";

    try {
        const base64Image = await convertToBase64(selectedImage);

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

        const responseText = await response.text();
        let data;

        try {
            data = JSON.parse(responseText);
        } catch {
            throw new Error(responseText);
        }

        if (!response.ok) {
            throw new Error(data.error || "AI analysis failed.");
        }

        const aiText =
            data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) {
            throw new Error("No analysis was returned by AI.");
        }

        const cleanText = aiText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const result = JSON.parse(cleanText);

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

        resultContainer.style.display = "block";

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
    } finally {
        button.disabled = false;
        button.textContent = "Analyze with AI →";
    }
});

function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function () {
            resolve(reader.result.split(",")[1]);
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
