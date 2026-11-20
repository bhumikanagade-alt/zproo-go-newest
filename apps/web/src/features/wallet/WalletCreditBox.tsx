import { Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { round2, type PassService } from './passes';
import { useWalletCredit } from './useWalletCredit';

const rupee = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Shows how much ZPROO Wallet credit will be used for a booking of `total` rupees. */
export function WalletCreditBox({ service, total }: { service: PassService; total: number }) {
  const { balance, hasPass, buyPassId } = useWalletCredit(service);
  const used = Math.min(balance, total);
  const rest = round2(total - used);

  return (
    <div className="rounded-xl border border-primary/30 bg-primary-light/50 p-4 text-sm">
      <p className="flex items-center gap-2 font-bold text-foreground">
        <Wallet aria-hidden className="size-4 text-primary" /> ZPROO Wallet
      </p>

      {balance > 0 ? (
        <dl className="mt-3 space-y-1.5">
          <div className="flex justify-between gap-3"><dt className="text-muted">{service} credit available</dt><dd className="font-semibold">{rupee(balance)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Paid from wallet</dt><dd className="font-semibold text-primary">{rupee(used)}</dd></div>
          {rest > 0 && (
            <div className="flex justify-between gap-3"><dt className="text-muted">Remaining to pay</dt><dd className="font-semibold">{rupee(rest)}</dd></div>
          )}
          {rest > 0 && (
            <p className="pt-1 text-xs text-muted">Your wallet credit is less than the total, so the remaining {rupee(rest)} is paid through the payment gateway.</p>
          )}
        </dl>
      ) : hasPass ? (
        <p className="mt-2 text-muted">Your ZPROO Pass credit for {service} has been used up.</p>
      ) : (
        <p className="mt-2 text-muted">
          You don&apos;t have an active ZPROO Pass that covers {service}.{' '}
          {buyPassId && (
            <Link to={`/wallet/pay/${buyPassId}`} className="font-semibold text-primary hover:underline">
              Get a ZPROO Pass
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
