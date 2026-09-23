export type Currency = 'EGP' | 'USD';

export type PricingOption = {
  currency: Currency;
  amount: number;
  amountCents: number;
  display: string;
  paymobCurrency: Currency;
};

export const PRICING: Record<Currency, PricingOption> = {
  EGP: {
    currency: 'EGP',
    amount: 99,
    amountCents: 9900,
    display: '99 EGP / month',
    paymobCurrency: 'EGP',
  },
  USD: {
    currency: 'USD',
    amount: 2,
    amountCents: 200,
    display: '$2.00 / month',
    paymobCurrency: 'USD',
  },
};

export function getStoredCurrency(): Currency {
  if (typeof window === 'undefined') return 'EGP';
  return window.localStorage.getItem('qoot-currency') === 'USD' ? 'USD' : 'EGP';
}

export function createPaymobCheckoutPayload(currency: Currency) {
  const option = PRICING[currency];
  return {
    amount_cents: option.amountCents,
    currency: option.paymobCurrency,
    billing_period: 'month' as const,
  };
}