import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserTransactions, TransactionType } from "@/lib/transactions";
import { redirect } from "next/navigation";

export default async function TransactionsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect("/login");
    }

    const transactions = await getUserTransactions(session.user.id, { limit: 100 });

    return (
        <div className="min-h-screen bg-black text-white pt-24 px-4 pb-12 font-mono selection:bg-white selection:text-black">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 flex flex-col sm:flex-row justify-between sm:items-end border-b border-zinc-900 pb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest mb-2">
                            Transaction History
                        </h1>
                        <p className="text-zinc-500 text-xs uppercase tracking-widest">
                            Latest 100 transactions
                        </p>
                    </div>
                </header>

                <div className="border border-zinc-900 bg-zinc-950/20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs uppercase tracking-widest">
                            <thead>
                                <tr className="border-b border-zinc-900 text-zinc-500 bg-zinc-900/50">
                                    <th className="px-6 py-4 font-normal">Date</th>
                                    <th className="px-6 py-4 font-normal">Type</th>
                                    <th className="px-6 py-4 font-normal">Description</th>
                                    <th className="px-6 py-4 font-normal text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {transactions.length > 0 ? (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                                                {new Date(tx.createdAt).toLocaleDateString()} <span className="text-zinc-600">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`
                                                    px-2 py-1 text-[10px] border rounded-sm
                                                    ${tx.type === TransactionType.DEPOSIT ? 'border-green-900 text-green-500 bg-green-950/20' : ''}
                                                    ${tx.type === TransactionType.WITHDRAWAL ? 'border-red-900 text-red-500 bg-red-950/20' : ''}
                                                    ${tx.type === TransactionType.BET ? 'border-zinc-800 text-zinc-400' : ''}
                                                    ${tx.type === TransactionType.WIN ? 'border-yellow-900 text-yellow-500 bg-yellow-950/20' : ''}
                                                `}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-300">
                                                {tx.description || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold">
                                                <span className={
                                                    tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.WIN
                                                        ? "text-green-500"
                                                        : "text-zinc-500"
                                                }>
                                                    {tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.WIN ? '+' : '-'}{tx.amount.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                            No transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-zinc-700 text-[10px] uppercase tracking-widest">
                        End of history
                    </p>
                </div>
            </div>
        </div>
    );
}
