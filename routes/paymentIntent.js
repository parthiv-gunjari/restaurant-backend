const Order = require('../models/OrderModel'); // ✅ Corrected model import
const sendConfirmationEmail = require('../utils/sendConfirmationEmail'); // ✅ ADD THIS
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-payment-intent", async (req, res) => {
  const { items, customer } = req.body;

  try {
    const amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: "usd",
      metadata: {
        customer_name: customer.name,
        customer_email: customer.email,
        notes: customer.notes || '',
      }
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("❌ Stripe PaymentIntent error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/save-order', async (req, res) => {
  const { form, cartItems, paymentIntentId, paymentStatus, cardBrand, last4 } = req.body;

  if (!form?.name || !form?.email || cartItems.length === 0) {
    return res.status(400).json({ error: 'Missing customer info or empty cart.' });
  }

  try {
    const orderCode = 'ORD' + Math.floor(100000 + Math.random() * 900000);

    const order = new Order({
      orderCode,
      name: form.name,
      email: form.email,
      notes: form.notes,
      items: cartItems.map(item => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      paymentIntentId,
      paymentStatus,
      status: 'Pending'
    });

    await order.save();

    console.log('✅ Order saved:', order);
    console.log('📧 Sending confirmation email to:', form.email);

    await sendConfirmationEmail({
      email: form.email,
      name: form.name,
      orderCode: order.orderCode,
      items: order.items,
      transactionId: order.paymentIntentId,
      timestamp: order.timestamp,
      cardBrand,
      last4
    });

    res.status(201).json({ message: 'Order saved successfully.' });
  } catch (err) {
    console.error('❌ Failed to save order:', err.message);
    res.status(500).json({ error: 'Failed to save order.' });
  }
});

module.exports = router;