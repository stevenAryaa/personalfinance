export async function GET() {
  try {
    const response = await fetch(
      "https://api.frankfurter.dev/v2/rate/AUD/IDR",
      {
        next: {
          revalidate: 3600,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rate");
    }

    const data = await response.json();

    return Response.json({
      rate: data.rate,
      date: data.date,
      base: data.base,
      quote: data.quote,
    });
  } catch (error) {
    console.error("Exchange rate error:", error);

    return Response.json(
      {
        error: "Could not fetch exchange rate",
      },
      {
        status: 500,
      }
    );
  }
}