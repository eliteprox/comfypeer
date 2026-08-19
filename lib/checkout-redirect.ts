/** Only follow Stripe Checkout hosts. */
export function redirectToCheckout(url: string): void {
  const parsed = new URL(url);
  const ok =
    parsed.protocol === "https:" &&
    (parsed.hostname === "checkout.stripe.com" ||
      parsed.hostname.endsWith(".stripe.com"));
  if (!ok) throw new Error("Checkout URL host is not allowed.");
  window.location.assign(parsed.toString());
}
