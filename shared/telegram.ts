export const SELLER_TELEGRAM_HANDLE = "p6_fq";
export const SELLER_TELEGRAM_URL = `https://t.me/${SELLER_TELEGRAM_HANDLE}`;

export function buildSellerTelegramUrl(message: string) {
  return `${SELLER_TELEGRAM_URL}?text=${message}`;
}
