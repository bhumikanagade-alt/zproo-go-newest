import { Button } from '@zproo/ui';
import { ArrowUpRight, ReceiptText, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useAuthStore } from '@/features/auth/store';
import { formatPassDate, useWalletStore } from '@/features/wallet/passes';

const METHOD_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking' } as const;

/** The signed-in customer's wallet history: every ZPROO Pass order. */
export default function WalletOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const orders = useWalletStore((s) => s.orders ?? []);
  const debits = useWalletStore((s) => s.debits ?? []);
  const mine = user ? orders.filter((order) => order.userId === String(user.id)) : [];
  const myDebits = user ? debits.filter((d) => d.userId === String(user.id)) : [];
  type Entry = { kind: 'order'; at: string; order: (typeof mine)[number] } | { kind: 'debit'; at: string; debit: (typeof myDebits)[number] };
  const entries: Entry[] = [
    ...mine.map((order) => ({ kind: 'order' as const, at: order.paidAt, order })),
    ...myDebits.map((debit) => ({ kind: 'debit' as const, at: debit.createdAt, debit })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <Seo title="Wallet orders" noIndex />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Wallet orders</h1>
        <p className="mt-1 text-sm text-muted">Your ZPROO Pass purchases and wallet payments.</p>
      </div>

      {entries.length === 0 ? (
        <div role="status" className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Wallet aria-hidden className="mx-auto size-10 text-muted" />
          <p className="mt-3 text-lg font-extrabold">No wallet orders yet</p>
          <p className="mt-1 text-sm text-muted">Buy a ZPROO Pass from the wallet and your order will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Wallet orders">
          {entries.map((entry) => entry.kind === 'debit' ? (
            <li key={entry.debit.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-light text-primary"><ArrowUpRight aria-hidden className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{entry.debit.label}</p>
                  <p className="mt-0.5 text-xs text-muted">Paid from wallet · {entry.debit.service} · {formatPassDate(entry.debit.createdAt)}</p>
                </div>
                <p className="font-extrabold text-danger">−₹{entry.debit.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </li>
          ) : (
            <li key={entry.order.reference} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-light text-primary"><ReceiptText aria-hidden className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">{entry.order.passName}</p>
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-600">Paid</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">Order {entry.order.reference} · {formatPassDate(entry.order.paidAt)}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
                    <div><dt className="text-xs text-muted">Paid</dt><dd className="font-semibold">₹{entry.order.price}</dd></div>
                    <div><dt className="text-xs text-muted">Credit added</dt><dd className="font-semibold text-primary">₹{entry.order.credit}</dd></div>
                    <div><dt className="text-xs text-muted">Valid till</dt><dd className="font-semibold">{formatPassDate(entry.order.expiresAt)}</dd></div>
                    <div><dt className="text-xs text-muted">Method</dt><dd className="font-semibold">{METHOD_LABEL[entry.order.method]}</dd></div>
                  </dl>
                  <p className="mt-2 text-[11px] text-muted">Transaction ID {entry.order.transactionId}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
    </div>
  );
}
