export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const { image, location } = req.body;

        if (!image) {
            return res.status(400).json({
                error: "No image provided"
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Gemini API key is not configured"
            });
        }

        const prompt = `
You are an AI assistant helping citizens report
garbage and waste-management problems in India.

Analyze the uploaded image carefully.

Location:
${location || "Not provided"}

Identify the visible garbage problem.

Determine:

1. Category of waste problem
2. Severity: Low, Medium, or High
3. What is visible in the image
4. Recommended action
5. Priority

Keep the answer practical and useful for
a municipal cleaning or waste-management team.

Return ONLY valid JSON.

Use exactly this structure:

{
  "category": "type of garbage problem",
  "severity": "Low, Medium, or High",
  "observation": "what you can see in the image",
  "recommendedAction": "what should be done",
  "priority": "Low, Medium, or High"
}
`;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },

                body: JSON.stringify({
                    model: "gemini-3.8-flash",

                    input: [
                        {
                            type: "image",
                            mime_type: "image/jpeg",
                            data: image
                        },
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                })
            }
        );

        const responseText = await response.text();

        let data;

        try {
            data = JSON.parse(responseText);
        } catch {
            return res.status(500).json({
                error: responseText
            });
        }

        if (!response.ok) {
            return res.status(response.status).json({
                error:
                    data.error?.message ||
                    "Gemini API request failed"
            });
        }

        let aiText = data.output_text;

        if (!aiText && data.steps) {

            const modelOutput = data.steps.find(
                step => step.type === "model_output"
            );

            if (modelOutput?.content) {

                const textPart = modelOutput.content.find(
                    item => item.type === "text"
                );

                if (textPart) {
                    aiText = textPart.text;
                }
            }
        }

        if (!aiText) {
            return res.status(500).json({
                error: "No analysis was returned by Gemini."
            });
        }

        return res.status(200).json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: aiText
                            }
                        ]
                    }
                }
            ]
        });

    } catch (error) {

        return res.status(500).json({
            error: error.message
        });

    }
}
