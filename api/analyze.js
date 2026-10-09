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


        const apiKey =
            process.env.GEMINI_API_KEY;


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
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
            apiKey,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    contents: [

                        {

                            parts: [

                                {
                                    text: prompt
                                },

                                {

                                    inline_data: {

                                        mime_type: "image/jpeg",

                                        data: image

                                    }

                                }

                            ]

                        }

                    ]

                })

            }
        );


        const data = await response.json();


        if (!response.ok) {

            return res.status(response.status).json({

                error:
                    data.error?.message ||
                    "Gemini API request failed"

            });

        }


        return res.status(200).json(data);


    } catch (error) {

        return res.status(500).json({

            error: error.message

        });

    }

}
