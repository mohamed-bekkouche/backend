import stripe from "stripe";
import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";
import Patient from "../models/Patient.js";
import dotenv from "dotenv";
dotenv.config();

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// Webhook handler
export const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const eventData = event.data.object;

    switch (event.type) {
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(eventData);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(eventData);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(eventData);
        break;

      default:
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).send(`Webhook Processing Error: ${err.message}`);
  }
};

// Handle invoice.payment_succeeded event
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    // Try to get customer metadata for patient ID

    if (invoice.customer) {
      const customer = await stripeClient.customers.retrieve(invoice.customer);
      // console.log("customer.metadata", customer.metadata);
      // console.log("customer", customer);
    }

    // Try to find existing payment by multiple methods
    const payment = await findAndUpdatePayment(
      invoice.payment_intent,
      invoice.id,
      invoice.subscription,
      {
        status: "succeeded",
        paidAt: new Date(),
        invoiceID: invoice.id,
        paymentID: invoice.payment_intent,
        amount: invoice.total / 100,
        stripeSubscriptionId: invoice.subscription,
      }
    );

    let patientId = payment.patientID;

    // If no payment found, create new one
    if (!payment) {
      const newPayment = new Payment({
        paymentID: invoice.payment_intent,
        invoiceID: invoice.id,
        patientID: patientId,
        amount: invoice.total / 100,
        paymentDate: new Date(),
        paymentMethod: "card",
        status: "succeeded",
        stripeSubscriptionId: invoice.subscription,
      });
      await newPayment.save();
      patientId = newPayment.patientID;
    }

    // Handle subscription creation/update
    await handleSubscription(invoice.subscription, patientId);
  } catch (err) {
    console.error("Error processing invoice payment:", err);
  }
}

// Handle payment_intent.succeeded as fallback
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    await findAndUpdatePayment(paymentIntent.id, null, null, {
      status: "succeeded",
      paidAt: new Date(),
      paymentID: paymentIntent.id,
      amount: paymentIntent.amount / 100,
    });
  } catch (err) {
    console.error("Error processing payment intent:", err);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  try {
    // Update payment status based on subscription status
    if (subscription.status === "active") {
      await Payment.updateOne(
        { stripeSubscriptionId: subscription.id },
        { status: "succeeded" }
      );
    }
  } catch (err) {
    console.error("Error updating subscription:", err);
  }
}

// Helper function to find and update payment record
async function findAndUpdatePayment(
  paymentIntentId,
  invoiceId,
  subscriptionId,
  updateFields
) {
  const query = {
    $or: [
      { paymentID: paymentIntentId },
      { invoiceID: invoiceId },
      { stripeSubscriptionId: subscriptionId },
    ].filter(Boolean), // Remove null/undefined conditions
  };

  const payment = await Payment.findOneAndUpdate(query, updateFields, {
    new: true,
    upsert: false,
  });

  return payment;
}

// Handle subscription creation/update
async function handleSubscription(subscriptionId, patientId) {
  if (!subscriptionId) return;

  try {
    const existingSub = await Subscription.findOne({ subID: subscriptionId });

    if (!existingSub) {
      const stripeSub = await stripeClient.subscriptions.retrieve(
        subscriptionId
      );
      const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

      const newSubscription = new Subscription({
        subID: subscriptionId,
        patientID: patientId,
        startDate: new Date(),
        expDate: currentPeriodEnd,
        status: stripeSub.status,
      });

      await newSubscription.save();
    }
  } catch (err) {
    console.error("Error handling subscription:", err);
  }
}

// Create subscription method (updated with better error handling)
export const createSubscription = async (req, res) => {
  try {
    const { patientId, paymentMethodId, priceId } = req.body;

    // Get patient details
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Create customer in Stripe
    const customer = await stripeClient.customers.create({
      email: patient.email,
      name: patient.name,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
      metadata: {
        patientId: patient._id.toString(),
      },
    });

    // Create subscription in Stripe
    const subscription = await stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        patientId: patient._id.toString(),
      },
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;

    // Create payment record
    const payment = new Payment({
      paymentID: paymentIntent.id,
      invoiceID: subscription.latest_invoice.id,
      paymentIntentClientSecret: paymentIntent.client_secret,
      patientID: patient._id,
      amount: subscription.latest_invoice.amount_due / 100,
      paymentDate: new Date(),
      paymentMethod: "card",
      status: "pending",
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.id,
    });

    await payment.save();

    res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      payment: payment,
    });
  } catch (err) {
    console.error("Subscription error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: "Subscription ID is required" });
    }

    const canceledSubscription = await stripeClient.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    const subscription = await Subscription.findOneAndUpdate(
      { subID: subscriptionId },
      {
        status: "canceled",
        expDate: new Date(canceledSubscription.current_period_end * 1000),
        cancelReason: "user_requested",
      },
      { new: true }
    );

    if (!subscription) {
      console.warn(`No local subscription found for ${subscriptionId}`);
    }

    await Payment.updateMany(
      { stripeSubscriptionId: subscriptionId },
      {
        status: "canceled",
        cancelDate: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: "Subscription scheduled for cancellation",
      stripeSubscription: canceledSubscription,
      localSubscription: subscription,
      willCancelAt: new Date(canceledSubscription.current_period_end * 1000),
    });
  } catch (err) {
    console.error("Cancel subscription error:", err);

    if (err.type === "StripeInvalidRequestError") {
      if (err.code === "resource_missing") {
        return res
          .status(404)
          .json({ error: "Subscription not found in Stripe" });
      }
    }

    res.status(500).json({
      error: err.message,
      details: err.type || "Unknown error",
    });
  }
};

// Get subscription details
export const getSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({ error: "Subscription ID is required" });
    }

    const stripeSubscription = await stripeClient.subscriptions.retrieve(
      subscriptionId,
      {
        expand: [
          "customer",
          "latest_invoice",
          "latest_invoice.payment_intent",
          "plan.product",
        ],
      }
    );

    const localSubscription = await Subscription.findOne({
      subID: subscriptionId,
    }).populate("patientID");

    const payments = await Payment.find({
      stripeSubscriptionId: subscriptionId,
    }).sort({ paymentDate: -1 });

    const response = {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      plan: {
        id: stripeSubscription.plan.id,
        product: stripeSubscription.plan.product.name,
        amount: stripeSubscription.plan.amount / 100,
        interval: stripeSubscription.plan.interval,
      },
      customer: {
        id: stripeSubscription.customer.id,
        email: stripeSubscription.customer.email,
        name: stripeSubscription.customer.name,
      },
      latestPayment: {
        id: stripeSubscription.latest_invoice.payment_intent?.id,
        status: stripeSubscription.latest_invoice.payment_intent?.status,
        amount: stripeSubscription.latest_invoice.amount_due / 100,
        created: new Date(stripeSubscription.latest_invoice.created * 1000),
      },
      localData: {
        subscription: localSubscription,
        paymentHistory: payments,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Get subscription error:", err);
    if (err.type === "StripeInvalidRequestError") {
      if (err.code === "resource_missing") {
        return res.status(404).json({ error: "Subscription not found" });
      }
    }

    res.status(500).json({
      error: "Failed to retrieve subscription",
      details: err.message,
    });
  }
};
