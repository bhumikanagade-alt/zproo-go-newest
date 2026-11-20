import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@zproo/ui';
import { BadgeCheck, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@/features/auth/store';
import {
  ZPROO_PASSES,
  formatPassDate,
  isActive,
  useWalletStore,
} from '@/features/wallet/passes';

export function WalletMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const isSignedIn = status === 'authenticated' && user !== null;

  const purchases = useWalletStore((state) => state.purchases);

  const myActivePasses = isSignedIn
    ? purchases.filter(
        (purchase) =>
          purchase.userId === String(user.id) && isActive(purchase),
      )
    : [];

  const balance = myActivePasses.reduce(
    (sum, purchase) => sum + purchase.remaining,
    0,
  );

  /* Buying a pass opens the payment gateway page for that pass. */
  const handleBuy = (passId: (typeof ZPROO_PASSES)[number]['id']) => {
    setOpen(false);
    void navigate(`/wallet/pay/${passId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-primary-light"
          aria-label={`Wallet${isSignedIn ? `, balance ₹${balance}` : ''}`}
        >
          <Wallet aria-hidden className="size-5 text-foreground/80" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl p-3"
      >
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <div>
            <p className="text-base font-bold text-foreground">ZPROO Wallet</p>
            <p className="mt-0.5 text-xs text-muted">
              Buy a ZPROO Pass and get extra credit
            </p>
          </div>

          <div className="rounded-xl bg-primary-light px-3 py-1.5 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Balance
            </p>
            <p className="text-lg font-extrabold leading-tight text-primary">
              ₹{balance}
            </p>
          </div>
        </div>

        <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-0.5">
          {ZPROO_PASSES.map((pass) => (
            <div
              key={pass.id}
              className="rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">
                      {pass.name}
                    </p>
                    {pass.popular && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Pay ₹{pass.price} · Get{' '}
                    <span className="font-bold text-primary">
                      ₹{pass.credit}
                    </span>{' '}
                    credit
                  </p>
                </div>

                <Button
                  size="sm"
                  className="shrink-0 rounded-full px-4"
                  onClick={() => handleBuy(pass.id)}
                >
                  Buy ₹{pass.price}
                </Button>
              </div>

              <dl className="mt-2.5 space-y-1 text-xs">
                <div className="flex gap-1.5">
                  <dt className="font-semibold text-foreground/80">Valid for:</dt>
                  <dd className="text-muted">{pass.validityLabel}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <dt className="font-semibold text-foreground/80">Available for:</dt>
                  <dd className="flex flex-wrap gap-1">
                    {pass.services.map((service) => (
                      <span
                        key={service}
                        className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary"
                      >
                        {service}
                        {pass.services.length === 1 ? ' only' : ''}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {myActivePasses.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Your active passes
            </p>
            <div className="space-y-2">
              {myActivePasses.map((purchase) => {
                const pass = ZPROO_PASSES.find(
                  (item) => item.id === purchase.passId,
                );
                return (
                  <div
                    key={purchase.uid}
                    className="flex items-center gap-3 rounded-xl bg-primary-light/60 px-3 py-2"
                  >
                    <BadgeCheck aria-hidden className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {pass?.name}
                      </p>
                      <p className="text-[11px] text-muted">
                        Valid till {formatPassDate(purchase.expiresAt)}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-primary">
                      ₹{purchase.remaining}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isSignedIn && (
          <p className="mt-3 px-1 text-center text-xs text-muted">
            Login to buy a pass and add credit to your wallet.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
