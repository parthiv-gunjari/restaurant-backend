const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/OrderModel');
const MenuItem = require('../models/MenuItemModel');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order
router.post('/create-order', async (req, res) => {
  const { items, orderId } = req.body;
  try {
    let amount = 0;

    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) throw new Error('Order not found.');
      amount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    } else {
      const menuItems = await Promise.all(
        items.map(async (item) => {
          const menuItem = await MenuItem.findById(item.itemId);
          if (!menuItem) throw new Error(`Item not found: ${item.itemId}`);
          return { price: menuItem.price, quantity: item.quantity };
        })
      );
      amount = menuItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: 'rcpt_' + Math.random().toString().slice(2, 10),
    };

    const razorOrder = await razorpay.orders.create(options);
    res.json({ razorOrderId: razorOrder.id, amount: razorOrder.amount, currency: razorOrder.currency });
  } catch (err) {
    console.error('❌ Razorpay Order Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify Razorpay Payment
router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generatedSignature === razorpay_signature) {
    res.json({ success: true, message: 'Payment verified successfully' });
  } else {
    res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
});

module.exports = router;