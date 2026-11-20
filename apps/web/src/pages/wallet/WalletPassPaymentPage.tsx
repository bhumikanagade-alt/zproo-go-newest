import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zproo/ui';
import { CheckCircle2, CreditCard, Landmark, Loader2, Lock, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import zprooUpiQr from '../../../assets-src/images/zproo-upi-qr.png';
import { Seo } from '@/components/seo/Seo';
import { useAuthStore } from '@/features/auth/store';
import { detectCardBrand, sanitizeCardNumber, sanitizeCvv, sanitizeExpiry, validateCard } from '@/features/cabs/validation';
import { verifyPayment } from '@/features/hotels/booking';
import { BANKS, validatePayment, type PaymentInput, type PaymentMethod } from '@/features/hotels/validation';
import {
  ZPROO_PASSES,
  formatPassDate,
  useWalletStore,
  type WalletOrder,
} from '@/features/wallet/passes';

const MERCHANT_UPI_ID: string = import.meta.env.VITE_UPI_ID || 'zproobus@upi';

const METHODS = [
  ['upi', 'UPI', Smartphone],
  ['card', 'Card', CreditCard],
  ['netbanking', 'Net banking', Landmark],
] as const;

/** Payment gateway for buying a ZPROO Pass. Confirms the order once the payment succeeds. */
export default function WalletPassPaymentPage() {
  const { passId } = useParams();
  const pass = ZPROO_PASSES.find((item) => item.id === passId);
  const user = useAuthStore((s) => s.user);

  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [bank, setBank] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'verifying'>('idle');
  const [order, setOrder] = useState<WalletOrder | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!pass) return <Navigate to="/" replace />;

  if (order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <Seo title="Payment confirmed" noIndex />
        <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2 aria-hidden className="size-8" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">Payment confirmed</h1>
          <p className="mt-1 text-sm text-muted">
            ₹{order.credit} credit has been added to your ZPROO Wallet.
          </p>

          <dl className="mt-6 space-y-2 rounded-xl bg-primary-light/50 p-4 text-left text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Order ID</dt><dd className="font-bold">{order.reference}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Pass</dt><dd className="font-bold">{order.passName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Amount paid</dt><dd className="font-bold">₹{order.price}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Credit added</dt><dd className="font-bold text-primary">₹{order.credit}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Valid till</dt><dd className="font-bold">{formatPassDate(order.expiresAt)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Transaction ID</dt><dd className="font-bold">{order.transactionId}</dd></div>
          </dl>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild><Link to="/wallet/orders">View orders</Link></Button>
            <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  // Card errors show under each field once the customer has tried to pay, then update as they type.
  const cardErrors = submitted && method === 'card' ? validateCard(card) : {};

  const pay = (e: FormEvent) => {
    e.preventDefault();
    if (phase === 'verifying' || !user) return;
    setError('');
    setSubmitted(true);
    const input: PaymentInput = { method, upi, card, bank };
    const problem = validatePayment(input);
    if (problem) return setError(method === 'card' ? 'Please correct the highlighted card details.' : problem);
    setPhase('verifying');
    // Simulated gateway round-trip, then verification of the result.
    timer.current = window.setTimeout(() => {
      const outcome = verifyPayment(input, pass.price * 100);
      if (outcome.status === 'FAILED') {
        setPhase('idle');
        setError(outcome.message);
        return;
      }
      const created = useWalletStore
        .getState()
        .completePurchase(String(user.id), pass, { method, transactionId: outcome.transactionId });
      setOrder(created);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Seo title="Wallet payment" noIndex />
      <form onSubmit={pay} noValidate className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <main className="space-y-5">
          <div><h1 className="text-3xl font-extrabold">Secure payment</h1><p className="mt-1 text-sm text-muted">Payment is simulated in this development environment. No real charge is made.</p></div>
          <Card><CardHeader><CardTitle className="text-base">Payment method</CardTitle></CardHeader><CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {METHODS.map(([id, label, Icon]) => (
                <button type="button" key={id} onClick={() => { setMethod(id); setError(''); }} aria-pressed={method === id} className={`rounded-xl border p-4 text-left ${method === id ? 'border-primary bg-primary-light' : 'border-border'}`}>
                  <Icon aria-hidden className="size-5 text-primary" /><span className="mt-2 block text-sm font-bold">{label}</span>
                </button>
              ))}
            </div>
            {method === 'upi' && (
              <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center">
                <p className="text-sm font-semibold">Scan to pay with UPI</p>
                <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
                  <img src={zprooUpiQr} alt="ZPROO UPI QR code" width={220} height={220} className="block rounded-xl" />
                </div>
                <p className="text-lg font-bold">Pay ₹{pass.price}</p>
                <p className="text-xs text-muted">UPI ID: {MERCHANT_UPI_ID}</p>
                <p className="max-w-sm text-xs leading-5 text-muted">Open your UPI app, scan the QR code and complete the payment. Or enter your UPI ID below.</p>
              </div>
            )}
            {method === 'upi' && <div className="mt-5"><Label htmlFor="upi">UPI ID</Label><Input id="upi" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" className="mt-1" autoComplete="off" /></div>}
            {method === 'card' && (
              <div className="mt-5 grid gap-3">
                <div><Label htmlFor="card-number">Card number</Label><Input id="card-number" inputMode="numeric" autoComplete="off" value={card.number} maxLength={23} onChange={(e) => setCard({ ...card, number: sanitizeCardNumber(e.target.value), cvv: sanitizeCvv(card.cvv, e.target.value) })} placeholder="1234 5678 9012 3456" className="mt-1" aria-invalid={!!cardErrors.number} />{detectCardBrand(card.number) && <p className="mt-1 text-xs text-muted">{detectCardBrand(card.number)?.name}</p>}{cardErrors.number && <p role="alert" className="mt-1 text-xs text-danger">{cardErrors.number}</p>}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="expiry">Expiry</Label><Input id="expiry" value={card.expiry} inputMode="numeric" maxLength={5} onChange={(e) => setCard({ ...card, expiry: sanitizeExpiry(e.target.value) })} placeholder="MM/YY" className="mt-1" autoComplete="off" aria-invalid={!!cardErrors.expiry} />{cardErrors.expiry && <p role="alert" className="mt-1 text-xs text-danger">{cardErrors.expiry}</p>}</div>
                  <div><Label htmlFor="cvv">CVV</Label><Input id="cvv" type="password" inputMode="numeric" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: sanitizeCvv(e.target.value, card.number) })} placeholder="123" className="mt-1" autoComplete="off" aria-invalid={!!cardErrors.cvv} />{cardErrors.cvv && <p role="alert" className="mt-1 text-xs text-danger">{cardErrors.cvv}</p>}</div>
                </div>
              </div>
            )}
            {method === 'netbanking' && (
              <div className="mt-5"><Label htmlFor="bank">Select your bank</Label>
                <select id="bank" value={bank} onChange={(e) => setBank(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"><option value="">Choose bank</option>{BANKS.map((b) => <option key={b} value={b}>{b}</option>)}</select>
                <p className="mt-2 text-xs text-muted">You will be redirected to your bank in a production payment gateway.</p></div>
            )}
          </CardContent></Card>
          {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
          {phase === 'verifying' && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-primary"><Loader2 aria-hidden className="size-4 animate-spin" /> Verifying your payment. Please do not close this page.</p>}
          <p className="flex items-center gap-2 text-xs text-muted"><Lock aria-hidden className="size-3.5" /> Card details are validated here and never stored by this demo flow. Test tip: a card ending 0002 or UPI starting fail@ is declined.</p>
        </main>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <div><p className="text-sm text-muted">ZPROO Wallet</p><p className="mt-1 font-bold">{pass.name}</p></div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Pass price</dt><dd className="font-semibold">₹{pass.price}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Wallet credit</dt><dd className="font-semibold text-primary">₹{pass.credit}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Valid for</dt><dd className="font-semibold">{pass.validityLabel}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Available for</dt><dd className="text-right font-semibold">{pass.services.join(', ')}{pass.services.length === 1 ? ' only' : ''}</dd></div>
          </dl>
          <Button type="submit" size="lg" className="w-full" disabled={phase === 'verifying'}>
            {phase === 'verifying' ? 'Processing…' : `Pay ₹${pass.price}`} <CheckCircle2 aria-hidden />
          </Button>
        </aside>
      </form>
    </div>
  );
}
