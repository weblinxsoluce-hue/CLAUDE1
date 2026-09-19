import Stripe from "stripe";
import { config } from "./config.js";

// Pin the API version so Stripe dashboard/account upgrades never silently
// change response shapes under this integration.
export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: "2026-08-26.dahlia",
  appInfo: {
    name: "weblinx.io Stripe integration",
    version: "1.0.0",
  },
});
