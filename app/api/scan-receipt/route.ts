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
                Analyze this receipt or financial document.

                Extract the transaction information.

                Return ONLY valid JSON using this exact structure:

                {
                "description": "merchant or payment source",
                "amount": 0,
                "currency": "AUD",
                "date": "YYYY-MM-DD",
                "type": "expense",
                "category": "Other",
                "confidence": 0
                }

                CURRENCY RULES:

                - currency must be either "AUD" or "IDR"
                - determine currency from symbols, formatting, merchant location,
                address, tax information, language, and other visible evidence
                - "$" on an Australian receipt should normally mean AUD
                - "A$", "AUD" or Australian merchant/address means AUD
                - "Rp", "IDR", "Rupiah" or an Indonesian merchant/address means IDR
                - Indonesian amounts commonly appear like:
                Rp 50.000
                Rp50,000
                50.000
                - Australian amounts commonly appear like:
                $25.50
                A$25.50
                AUD 25.50

                Do NOT assume AUD just because the currency symbol is "$".
                Use all visible context in the receipt.

                TRANSACTION RULES:

                - type must be either "income" or "expense"
                - amount must be zero or greater
                - confidence must be between 0 and 100

                category must be one of:
                - Groceries
                - Dining
                - Transport
                - Shopping
                - Bills
                - Subscriptions
                - Entertainment
                - Salary
                - Healthcare
                - Education
                - Travel
                - Other

                Normal purchases and receipts are expenses.

                Salary, wages, incoming transfers, refunds or clearly received money
                may be income.

                Use the merchant, company or payment source as description.

                If date cannot be determined, return "".

                Do not return markdown.
                Do not explain your reasoning.
                Return JSON only.
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