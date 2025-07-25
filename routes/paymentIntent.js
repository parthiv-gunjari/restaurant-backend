const Order = require('../models/OrderModel'); // ✅ Corrected model import
const sendConfirmationEmail = require('../utils/sendConfirmationEmail'); // ✅ ADD THIS
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const MenuItem = require('../models/MenuItemModel'); // ✅ THIS LINE IS MISSING
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-payment-intent", async (req, res) => {
  const { items, customer } = req.body;

  try {
    const menuItems = await Promise.all(
      items.map(async (item) => {
        const menuItem = await MenuItem.findById(item.itemId);
        if (!menuItem) throw new Error(`Menu item not found: ${item.itemId}`);
        return {
          price: menuItem.price,
          quantity: item.quantity
        };
      })
    );

    const amount = menuItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100;

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

    // ✅ Transform items with itemId, name, price, quantity
    const transformedItems = await Promise.all(
      cartItems.map(async (item) => {
        const menuItem = await MenuItem.findById(item._id || item.itemId);
        if (!menuItem) throw new Error(`Menu item not found: ${item._id || item.itemId}`);
        return {
          itemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity || 1
        };
      })
    );

    const order = new Order({
      orderCode,
      name: form.name,
      email: form.email,
      notes: form.notes,
      items: transformedItems,
      initialItems: transformedItems, // ✅ store original items
      paymentIntentId,
      paymentStatus,
      cardBrand,
      last4,
      status: 'Pending',
      orderType: 'online'
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