import { Router } from "express";
import { stripe } from "../stripe.js";
import { config } from "../config.js";

export const checkoutRouter = Router();

/**
 * Creates a Checkout Session for a one-time digital product purchase.
 *
 * Body: { priceId: string, quantity?: number, customerEmail?: string }
 *
 * `priceId` must reference a Stripe Price created for a digital product.
 * When creating that Product in the Dashboard/API, set its tax code to a
 * digital-goods code (e.g. txcd_10103000 for SaaS/downloads) so Stripe Tax
 * applies the right rate per customer location.
 */
checkoutRouter.post("/session", async (req, res) => {
  const { priceId, quantity = 1, customerEmail } = req.body ?? {};

  if (!priceId || typeof priceId !== "string") {
    return res.status(400).json({ error: "priceId is required" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity }],
      customer_email: customerEmail,
      // Stripe Tax: calculates and collects tax automatically based on the
      // customer's location. Requires tax registrations to be configured
      // in the Dashboard (Settings > Tax) for the jurisdictions you sell into.
      automatic_tax: { enabled: true },
      // Digital goods have no shipping; billing address is still required
      // so Stripe Tax can determine the customer's tax jurisdiction.
      billing_address_collection: "required",
      success_url: `${config.clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.clientUrl}/checkout/cancel`,
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: message });
  }
});
