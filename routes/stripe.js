// server/routes/stripe.js
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-checkout-session", async (req, res) => {
  const { items, customer } = req.body;

  console.log("📦 Items received:", items);
  console.log("👤 Customer received:", customer);

  try {
    const line_items = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name },
        unit_amount: item.price * 100, // watch this
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      customer_email: customer.email,
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        customer_name: customer.name,
        notes: customer.notes || "",
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Fetch Payment Intent details by ID
router.get('/create-payment-intent/:id', async (req, res) => {
  try {
    const intent = await stripe.paymentIntents.retrieve(req.params.id);
    const card = intent.charges?.data?.[0]?.payment_method_details?.card;

    res.json({
      cardBrand: card?.brand,
      last4: card?.last4,
    });
  } catch (error) {
    console.error('❌ Error fetching payment intent:', error.message);
    res.status(404).json({ error: 'Payment intent not found' });
  }
});

module.exports = router;