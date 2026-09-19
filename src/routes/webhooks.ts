import { Router } from "express";
import type Stripe from "stripe";
import { stripe } from "../stripe.js";
import { config } from "../config.js";

export const webhooksRouter = Router();

// Mounted with express.raw() in index.ts — Stripe's signature check needs
// the exact raw request body, not the JSON-parsed object.
webhooksRouter.post("/stripe", async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, config.stripeWebhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // TODO: fulfill the digital product order — grant access / send
      // download link, keyed on session.customer_email or session.id.
      console.log(`Checkout completed: ${session.id}`);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      // TODO: mark the service invoice as paid in your records.
      console.log(`Invoice paid: ${invoice.id}`);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      // TODO: notify the customer / follow up on failed payment.
      console.log(`Invoice payment failed: ${invoice.id}`);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment failed: ${intent.id}`);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});
