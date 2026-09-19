import { Router } from "express";
import { stripe } from "../stripe.js";

export const invoicesRouter = Router();

interface InvoiceLineItem {
  description: string;
  amount: number; // in the currency's smallest unit, e.g. cents
  currency?: string;
}

/**
 * Creates and sends an invoice for a service engagement.
 *
 * Body: {
 *   customerEmail: string,
 *   customerName?: string,
 *   items: { description: string, amount: number, currency?: string }[],
 *   daysUntilDue?: number
 * }
 *
 * Finds or creates the Customer, attaches one InvoiceItem per line item,
 * then finalizes and emails the invoice. Stripe Tax calculates tax on the
 * invoice automatically based on the customer's address, so make sure the
 * customer record has one (collect it up front, or invite the customer to
 * add it via a Customer Portal session).
 */
invoicesRouter.post("/create", async (req, res) => {
  const {
    customerEmail,
    customerName,
    items,
    daysUntilDue = 14,
  }: {
    customerEmail?: string;
    customerName?: string;
    items?: InvoiceLineItem[];
    daysUntilDue?: number;
  } = req.body ?? {};

  if (!customerEmail) {
    return res.status(400).json({ error: "customerEmail is required" });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "at least one line item is required" });
  }

  try {
    const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
    const customer =
      existing.data[0] ??
      (await stripe.customers.create({ email: customerEmail, name: customerName }));

    for (const item of items) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        amount: item.amount,
        currency: item.currency ?? "usd",
        description: item.description,
      });
    }

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: daysUntilDue,
      // Stripe Tax: same automatic calculation as Checkout, applied to
      // invoiced services based on the customer's tax jurisdiction.
      automatic_tax: { enabled: true },
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id!);
    await stripe.invoices.sendInvoice(finalized.id!);

    res.json({
      id: finalized.id,
      hostedInvoiceUrl: finalized.hosted_invoice_url,
      status: finalized.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: message });
  }
});
