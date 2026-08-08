import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*");

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
        <p>Error: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <h1 className="mb-6 text-3xl font-bold">
        Personal Finance
      </h1>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">
          Transactions
        </h2>

        {transactions?.length === 0 && (
          <p className="text-gray-500">
            No transactions yet.
          </p>
        )}

        {transactions?.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between border-b py-4"
          >
            <div>
              <p className="font-medium">
                {transaction.description}
              </p>

              <p className="text-sm text-gray-500">
                {transaction.category}
              </p>
            </div>

            <p
              className={
                transaction.type === "income"
                  ? "font-semibold text-green-600"
                  : "font-semibold text-red-600"
              }
            >
              {transaction.type === "income" ? "+" : "-"}$
              {Number(transaction.amount).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}