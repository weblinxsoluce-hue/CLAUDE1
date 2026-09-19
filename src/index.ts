import express from "express";
import { config } from "./config.js";
import { checkoutRouter } from "./routes/checkout.js";
import { invoicesRouter } from "./routes/invoices.js";
import { webhooksRouter } from "./routes/webhooks.js";

const app = express();

// Webhook route needs the raw body for Stripe signature verification, so it
// must be mounted before express.json() touches the request.
app.use("/webhooks", express.raw({ type: "application/json" }), webhooksRouter);

app.use(express.json());

app.use("/api/checkout", checkoutRouter);
app.use("/api/invoices", invoicesRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`weblinx.io Stripe integration listening on port ${config.port}`);
});
