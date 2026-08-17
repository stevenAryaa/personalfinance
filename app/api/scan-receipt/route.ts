import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { image } = body;

    if (!image) {
      return Response.json(
        { error: "No image provided." },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.6-27b",

      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Analyze this financial document or receipt.

Extract the transaction details.

Return ONLY valid JSON in this exact format:

{
  "description": "merchant or payment source",
  "amount": 0,
  "date": "YYYY-MM-DD",
  "type": "expense",
  "category": "Groceries",
  "confidence": 0
}

Rules:

- type must be either "income" or "expense"
- amount must be a positive number
- confidence must be from 0 to 100
- category must be one of:
  Groceries
  Dining
  Transport
  Shopping
  Bills
  Subscriptions
  Entertainment
  Salary
  Healthcare
  Education
  Travel
  Other

If this is a normal receipt or purchase, classify it as expense.

If it is clearly salary, payment received, income, or money coming into the user, classify it as income.

Use the merchant/business/person as description.

If the date cannot be determined, return an empty string.

Do not include markdown.
Do not include explanations.
Only return JSON.
              `,
            },

            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],

      temperature: 0.1,
      response_format: {
        type: "json_object",
      },
    });

    const result =
      completion.choices[0]?.message?.content;

    if (!result) {
      return Response.json(
        { error: "AI returned no result." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(result);

    return Response.json(parsed);
  } catch (error) {
    console.error("Receipt analysis error:", error);

    return Response.json(
      {
        error: "Failed to analyze receipt.",
      },
      {
        status: 500,
      }
    );
  }
}