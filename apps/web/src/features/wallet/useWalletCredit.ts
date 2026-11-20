import { useAuthStore } from '@/features/auth/store';
import {
  ZPROO_PASSES,
  coversService,
  isActive,
  round2,
  useWalletStore,
  type PassService,
} from './passes';

/** The signed-in customer's ZPROO Wallet credit that can be used for one service. */
export function useWalletCredit(service: PassService) {
  const user = useAuthStore((s) => s.user);
  const purchases = useWalletStore((s) => s.purchases);
  const spendFromStore = useWalletStore((s) => s.spend);

  const mine = user ? purchases.filter((p) => p.userId === String(user.id)) : [];
  const now = Date.now();
  const balance = round2(
    mine
      .filter((p) => isActive(p, now) && coversService(p.passId, service))
      .reduce((sum, p) => sum + p.remaining, 0),
  );
  /** True when the customer owns an unexpired pass that covers this service (even if its credit is used up). */
  const hasPass = mine.some(
    (p) => new Date(p.expiresAt).getTime() > now && coversService(p.passId, service),
  );
  /** Cheapest pass that covers this service, to offer when the customer has none. */
  const buyPass = ZPROO_PASSES.find((pass) => pass.services.includes(service));

  return {
    balance,
    hasPass,
    buyPassId: buyPass?.id,
    spend: (amount: number, label: string) =>
      user ? spendFromStore(String(user.id), service, amount, label) : false,
  };
}
