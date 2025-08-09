const Order = require('../models/OrderModel'); 
const sendConfirmationEmail = require('../utils/sendConfirmationEmail'); 
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const MenuItem = require('../models/MenuItemModel'); 
const Table = require('../models/TableModel');
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-payment-intent", async (req, res) => {
  const { items, customer, amount, orderId } = req.body;

  try {
    let finalAmount = 0;

    if (amount) {
      finalAmount = amount;
    } else if (items?.length) {
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

      finalAmount = menuItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100;
    } else if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) throw new Error(`Order not found for ID: ${orderId}`);
      // Consider multiple "paid" representations to be already-paid
      const paidStatuses = new Set(['paid', 'succeeded', 'completed']);
      if (paidStatuses.has(String(order.paymentStatus || '').toLowerCase())) {
        return res.status(400).json({ error: 'Order is already paid.' });
      }
      finalAmount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100;
    } else {
      throw new Error('Either items or orderId must be provided to calculate amount.');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount),
      currency: "usd",
      metadata: {
        customer_name: customer?.name || '',
        customer_email: customer?.email || '',
        notes: customer?.notes || '',
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

// ✅ Mark existing Dine-In order as paid
router.patch('/mark-paid/:orderId', async (req, res) => {
  const { paymentIntentId, paymentStatus, cardBrand, last4 } = req.body;
  console.log('📦 Mark Paid Payload:', req.body);

  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Robust already-paid guard
    const paidStatuses = new Set(['paid', 'succeeded', 'completed']);
    if (paidStatuses.has(String(order.paymentStatus || '').toLowerCase())) {
      return res.status(400).json({ error: 'Order already paid.' });
    }

    // Normalize status to your schema enum and persist card details
    order.paymentIntentId = paymentIntentId || order.paymentIntentId;
    order.paymentMode = 'card';
    // Schema allows: ['succeeded','pending','failed','canceled','unpaid','paid']
    // Use 'paid' (lowercase) to indicate completion; optionally keep gateway status separately if your schema supports it.
    if (paymentStatus && typeof paymentStatus === 'string') {
      // keep gateway status only if your schema has a field; otherwise ignore
      order.gatewayStatus = paymentStatus; // harmless if schema has this, ignored otherwise
    }
    order.paymentStatus = 'paid';
    order.cardBrand = cardBrand || order.cardBrand;
    order.last4 = last4 || order.last4;
    order.completedAt = new Date();
    order.status = 'Completed';

    await order.save();

    // If this was a dine-in order, free the table
    if (order.orderType === 'dine-in' && order.tableId) {
      try {
        await Table.findByIdAndUpdate(
          order.tableId,
          { status: 'available', currentOrderId: null },
          { new: true }
        );
      } catch (tableErr) {
        console.warn('⚠️ Table free failed:', tableErr?.message || tableErr);
        // Do not fail the request if table update fails; payment already marked.
      }
    }

    res.status(200).json({ message: 'Dine-In order marked as paid and table released (if applicable).' });
  } catch (err) {
    console.error('❌ Failed to mark dine-in order as paid:', err);
    res.status(500).json({ error: err.message || 'Failed to update dine-in payment.' });
  }
});

module.exports = router;

// ✅ Mark existing Dine-In order as paid via cash
router.patch('/mark-cash-paid/:orderId', async (req, res) => {
  const { amountPaid, changeReturned } = req.body;

  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Robust already-paid guard
    const paidStatuses = new Set(['paid', 'succeeded', 'completed']);
    if (paidStatuses.has(String(order.paymentStatus || '').toLowerCase())) {
      return res.status(400).json({ error: 'Order already paid.' });
    }

    order.paymentMode = 'cash';
    order.paymentStatus = 'paid';
    order.status = 'Completed';
    order.completedAt = new Date();
    if (typeof amountPaid !== 'undefined') order.amountPaid = amountPaid;
    if (typeof changeReturned !== 'undefined') order.changeReturned = changeReturned;

    await order.save();

    // If this was a dine-in order, free the table
    if (order.orderType === 'dine-in' && order.tableId) {
      try {
        await Table.findByIdAndUpdate(
          order.tableId,
          { status: 'available', currentOrderId: null },
          { new: true }
        );
      } catch (tableErr) {
        console.warn('⚠️ Table free failed:', tableErr?.message || tableErr);
        // Do not fail the request if table update fails; payment already marked.
      }
    }

    res.status(200).json({ message: 'Cash payment recorded and table released (if applicable).' });
  } catch (err) {
    console.error('❌ Failed to mark dine-in order as cash paid:', err);
    res.status(500).json({ error: err.message || 'Failed to update dine-in cash payment.' });
  }
});