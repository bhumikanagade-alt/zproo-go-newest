import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type PassService = 'Bus' | 'Train' | 'Cab' | 'Hotel' | 'Flight' | 'Parcel';

export interface ZprooPass {
  id: 'pass-79' | 'pass-99' | 'pass-999';
  name: string;
  /** Price the customer pays, in rupees. */
  price: number;
  /** Credit added to the wallet, in rupees. */
  credit: number;
  /** Validity in months. */
  validityMonths: number;
  validityLabel: string;
  services: PassService[];
  popular?: boolean;
}

export const ZPROO_PASSES: ZprooPass[] = [
  {
    id: 'pass-79',
    name: 'ZPROO Pass 79',
    price: 79,
    credit: 99,
    validityMonths: 1,
    validityLabel: '1 month',
    services: ['Cab'],
  },
  {
    id: 'pass-99',
    name: 'ZPROO Pass 99',
    price: 99,
    credit: 129,
    validityMonths: 3,
    validityLabel: '3 months',
    services: ['Train', 'Cab'],
    popular: true,
  },
  {
    id: 'pass-999',
    name: 'ZPROO Pass 999',
    price: 999,
    credit: 1299,
    validityMonths: 12,
    validityLabel: '1 year',
    services: ['Bus', 'Train', 'Cab', 'Hotel', 'Flight', 'Parcel'],
  },
];

export interface PurchasedPass {
  /** Unique id of this purchase. */
  uid: string;
  userId: string;
  passId: ZprooPass['id'];
  purchasedAt: string; // ISO
  expiresAt: string; // ISO
  credit: number;
  remaining: number;
}

export type WalletPayMethod = 'upi' | 'card' | 'netbanking';

/** One wallet order: a ZPROO Pass paid for through the payment gateway. */
export interface WalletOrder {
  reference: string;
  userId: string;
  passId: ZprooPass['id'];
  passName: string;
  price: number;
  credit: number;
  method: WalletPayMethod;
  transactionId: string;
  status: 'SUCCESS';
  paidAt: string; // ISO
  expiresAt: string; // ISO
}

/** One wallet payment: credit used from a ZPROO Pass for a booking. */
export interface WalletDebit {
  id: string;
  userId: string;
  service: PassService;
  label: string;
  amount: number;
  createdAt: string; // ISO
}

interface WalletState {
  purchases: PurchasedPass[];
  orders: WalletOrder[];
  debits: WalletDebit[];
  /**
   * Deducts `amount` rupees for a booking from this user's passes that cover the
   * service, using the pass that expires first. Returns false if the credit is short.
   */
  spend: (userId: string, service: PassService, amount: number, label: string) => boolean;
  /**
   * Called once the payment is confirmed: adds the pass credit to this user's
   * wallet and records the order in the wallet history.
   */
  completePurchase: (
    userId: string,
    pass: ZprooPass,
    payment: { method: WalletPayMethod; transactionId: string },
  ) => WalletOrder;
}

export function generateWalletReference(now: Date = new Date()): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return `ZPW-${now.getFullYear()}-${code}`;
}

const storage: StateStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable: the wallet still works in memory */
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      purchases: [],
      orders: [],
      debits: [],
      spend: (userId, service, amount, label) => {
        let ok = false;
        set((s) => {
          const now = Date.now();
          const usable = s.purchases
            .filter((p) => p.userId === userId && isActive(p, now) && coversService(p.passId, service))
            .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
          const available = round2(usable.reduce((sum, p) => sum + p.remaining, 0));
          if (amount <= 0 || available < amount) return s;
          ok = true;
          let left = amount;
          const taken = new Map<string, number>();
          for (const p of usable) {
            if (left <= 0) break;
            const use = Math.min(p.remaining, left);
            taken.set(p.uid, use);
            left = round2(left - use);
          }
          const debit: WalletDebit = {
            id: `debit-${now}-${Math.random().toString(36).slice(2, 8)}`,
            userId,
            service,
            label,
            amount: round2(amount),
            createdAt: new Date(now).toISOString(),
          };
          return {
            purchases: s.purchases.map((p) =>
              taken.has(p.uid) ? { ...p, remaining: round2(p.remaining - (taken.get(p.uid) ?? 0)) } : p,
            ),
            debits: [debit, ...(s.debits ?? [])],
          };
        });
        return ok;
      },
      completePurchase: (userId, pass, payment) => {
        const now = new Date();
        const expires = new Date(now);
        expires.setMonth(expires.getMonth() + pass.validityMonths);
        const order: WalletOrder = {
          reference: generateWalletReference(now),
          userId,
          passId: pass.id,
          passName: pass.name,
          price: pass.price,
          credit: pass.credit,
          method: payment.method,
          transactionId: payment.transactionId,
          status: 'SUCCESS',
          paidAt: now.toISOString(),
          expiresAt: expires.toISOString(),
        };
        const purchase: PurchasedPass = {
          uid: `${pass.id}-${now.getTime()}`,
          userId,
          passId: pass.id,
          purchasedAt: now.toISOString(),
          expiresAt: expires.toISOString(),
          credit: pass.credit,
          remaining: pass.credit,
        };
        set((s) => ({
          purchases: [purchase, ...s.purchases],
          orders: [order, ...(s.orders ?? [])],
        }));
        return order;
      },
    }),
    { name: 'zproo-pass-wallet', storage: createJSONStorage(() => storage) },
  ),
);

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export function coversService(passId: ZprooPass['id'], service: PassService): boolean {
  return ZPROO_PASSES.find((pass) => pass.id === passId)?.services.includes(service) ?? false;
}

export function isActive(purchase: PurchasedPass, now = Date.now()): boolean {
  return new Date(purchase.expiresAt).getTime() > now && purchase.remaining > 0;
}

export function formatPassDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
