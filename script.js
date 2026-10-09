````javascript
const imageInput = document.getElementById("imageInput");
const uploadBox = document.querySelector(".upload-box");
const locationInput = document.getElementById("locationInput");
const resultContainer = document.getElementById("resultContainer");

const saveReportButton = document.getElementById("saveReportButton");
const viewReportsButton = document.getElementById("viewReportsButton");
const savedReportsContainer = document.getElementById("savedReportsContainer");
const savedReportsList = document.getElementById("savedReportsList");

let selectedImage = null;
let currentReport = null;

// Read saved reports from this browser
function getSavedReports() {
    try {
        return JSON.parse(localStorage.getItem("cleanIndiaReports") || "[]");
    } catch (error) {
        console.error("Could not read saved reports:", error);
        return [];
    }
}

// Upload image and show preview
imageInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image.");
        return;
    }

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

// Handle buttons
document.addEventListener("click", async function (event) {

    // AI analysis — original working flow preserved
    if (event.target.id === "analyzeButton") {
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

            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiText) {
                throw new Error("No analysis was returned by AI.");
            }

            const cleanText = aiText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            const result = JSON.parse(cleanText);

            currentReport = {
                id: Date.now().toString(),
                date: new Date().toLocaleString(),
                location: location,
                category: result.category || "Not identified",
                severity: result.severity || "Not identified",
                priority: result.priority || "Not identified",
                observation: result.observation || "No observation available.",
                recommendedAction:
                    result.recommendedAction || "No recommendation available."
            };

            document.getElementById("resultCategory").textContent =
                currentReport.category;
            document.getElementById("resultSeverity").textContent =
                currentReport.severity;
            document.getElementById("resultPriority").textContent =
                currentReport.priority;
            document.getElementById("resultObservation").textContent =
                currentReport.observation;
            document.getElementById("resultAction").textContent =
                currentReport.recommendedAction;

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

        return;
    }

    // Save report
    if (event.target.id === "saveReportButton") {
        if (!currentReport) {
            alert("Please analyze an image before saving a report.");
            return;
        }

        try {
            const reports = getSavedReports();

            if (reports.some(report => report.id === currentReport.id)) {
                alert("This report is already saved.");
                return;
            }

            reports.unshift(currentReport);

            localStorage.setItem(
                "cleanIndiaReports",
                JSON.stringify(reports)
            );

            alert("Report saved successfully!");
            renderSavedReports();

        } catch (error) {
            console.error(error);
            alert("Could not save the report. Browser storage may be unavailable.");
        }

        return;
    }

    // Show or hide saved reports
    if (event.target.id === "viewReportsButton") {
        const shouldShow =
            savedReportsContainer.style.display !== "block";

        savedReportsContainer.style.display = shouldShow ? "block" : "none";

        if (shouldShow) {
            renderSavedReports();
            savedReportsContainer.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }

        return;
    }

    // Delete a report
    if (event.target.classList.contains("delete-report-button")) {
        const reportId = event.target.dataset.id;

        if (!confirm("Delete this saved report?")) return;

        try {
            const reports = getSavedReports().filter(
                report => report.id !== reportId
            );

            localStorage.setItem(
                "cleanIndiaReports",
                JSON.stringify(reports)
            );

            renderSavedReports();
        } catch (error) {
            console.error(error);
            alert("Could not delete the report.");
        }
    }
});

// Display the saved report list
function renderSavedReports() {
    const reports = getSavedReports();
    savedReportsList.replaceChildren();

    if (reports.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No saved reports yet.";
        savedReportsList.appendChild(emptyMessage);
        return;
    }

    reports.forEach(report => {
        const card = document.createElement("div");
        card.className = "result-card saved-report-card";

        const heading = document.createElement("h3");
        heading.textContent = report.category;

        const details = [
            ["Date", report.date],
            ["Location", report.location],
            ["Severity", report.severity],
            ["Priority", report.priority],
            ["What AI Found", report.observation],
            ["Recommended Action", report.recommendedAction]
        ];

        card.appendChild(heading);

        details.forEach(([label, value]) => {
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");
            strong.textContent = label + ": ";
            paragraph.append(strong, document.createTextNode(value || "—"));
            card.appendChild(paragraph);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "upload-button delete-report-button";
        deleteButton.textContent = "Delete Report";
        deleteButton.dataset.id = report.id;

        card.appendChild(deleteButton);
        savedReportsList.appendChild(card);
    });
}

// Convert image to Base64 for the AI request
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
````
