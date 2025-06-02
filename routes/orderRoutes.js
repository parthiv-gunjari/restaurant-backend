// /server/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/OrderModel');
const sendOrderCompletionEmail = require('../utils/sendEmail');
const sendOrderConfirmationEmail = require('../utils/sendConfirmationEmail');
const authenticateAdmin = require('../middleware/authMiddleware');

// ==========================
// POST: Create a New Order (Public)
// ==========================
router.post('/', async (req, res) => {
  try {
    const { name, email, items, notes, itemsHtml } = req.body;

    if (!name || !email || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    const newOrder = new Order({ name, email, items, notes, status: 'Pending' });
    const savedOrder = await newOrder.save();

    await sendOrderConfirmationEmail(email, name, savedOrder._id, itemsHtml);
    res.status(201).json({ message: 'Order placed', order: savedOrder });
  } catch (err) {
    console.error("❌ Error placing order:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET: Pending Orders with Filters + Pagination (Admin Only)
// ============================================================
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 5, name, email, date } = req.query;
    const skip = (page - 1) * limit;
    const query = { status: 'Pending' };

    if (name) query.name = { $regex: name, $options: 'i' };
    if (email) query.email = { $regex: email, $options: 'i' };
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: dayStart, $lte: dayEnd };
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit));

    res.json({ orders, currentPage: parseInt(page), totalPages: Math.ceil(total / limit), totalOrders: total });
  } catch (err) {
    console.error("❌ Error fetching pending orders:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET: Completed Orders with Filters + Pagination (Admin Only)
// ============================================================
router.get('/completed', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 5, name, email, date } = req.query;
    const skip = (page - 1) * limit;
    const query = { status: 'Completed' };

    if (name) query.name = { $regex: name, $options: 'i' };
    if (email) query.email = { $regex: email, $options: 'i' };
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: dayStart, $lte: dayEnd };
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit));

    res.json({ orders, currentPage: parseInt(page), totalPages: Math.ceil(total / limit), totalOrders: total });
  } catch (err) {
    console.error("❌ Error fetching completed orders:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// PATCH: Mark Order as Completed + Send Email (Admin Only)
// ============================================================
router.patch('/:id/complete', authenticateAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'Completed' },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: 'Order not found' });

    console.log(`📦 Marking order ${order._id} as completed...`);
    await sendOrderCompletionEmail(order.email, order._id);

    setTimeout(() => {
      console.log(`✅ Order ${order._id} completed & email sent.`);
      res.json({ message: 'Order marked as completed & email sent', order });
    }, 300);
  } catch (err) {
    console.error("❌ Error completing order:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET: Order History by Email or Name (Public)
// ============================================================
router.get('/history', async (req, res) => {
  try {
    const { email, name } = req.query;
    if (!email && !name) return res.status(400).json({ error: 'Please provide email or name to fetch history.' });

    const query = {};
    if (email) query.email = email;
    if (name) query.name = name;

    const orders = await Order.find(query).sort({ timestamp: -1 });
    if (orders.length === 0) return res.status(404).json({ message: 'No orders found for the provided info.' });

    res.json(orders);
  } catch (err) {
    console.error("❌ Error fetching order history:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET: Admin Dashboard Analytics (?from=&to=) (Admin Only)
// ============================================================
router.get('/analytics', authenticateAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};

    if (from) dateFilter.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const filter = Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {};
    const [ordersToday, pending, completed, all] = await Promise.all([
      Order.countDocuments(filter),
      Order.countDocuments({ ...filter, status: 'Pending' }),
      Order.countDocuments({ ...filter, status: 'Completed' }),
      Order.find(filter)
    ]);

    const totalRevenue = all.reduce((sum, order) => {
      return sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0);
    }, 0);

    const itemMap = {};
    all.forEach(order => {
      order.items.forEach(item => {
        itemMap[item.name] = (itemMap[item.name] || 0) + item.quantity;
      });
    });

    const topItems = Object.entries(itemMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, quantity]) => ({ name, quantity }));

    res.json({
      totalOrdersToday: ordersToday,
      pendingCount: pending,
      completedCount: completed,
      totalRevenue,
      topItems
    });
  } catch (err) {
    console.error("❌ Error fetching analytics:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET: Revenue data for chart
router.get('/revenue-chart', authenticateAdmin, async (req, res) => {
  try {
    const { range } = req.query;
    const now = new Date();
    let fromDate;

    if (range === 'today') {
      fromDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (range === 'yesterday') {
      fromDate = new Date(now.setDate(now.getDate() - 1));
      fromDate.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      fromDate = new Date(now.setDate(now.getDate() - 6));
      fromDate.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      fromDate = new Date(now.setDate(now.getDate() - 29));
      fromDate.setHours(0, 0, 0, 0);
    }

    const matchStage = {
      ...(range && range !== 'custom' && { timestamp: { $gte: fromDate } }),
    };

    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
          },
          total: {
            $sum: {
              $sum: {
                $map: {
                  input: "$items",
                  as: "item",
                  in: { $multiply: ["$$item.price", "$$item.quantity"] }
                }
              }
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const labels = orders.map(o => o._id);
    const values = orders.map(o => o.total.toFixed(2));

    res.json({ labels, values });
  } catch (err) {
    console.error("❌ Error in revenue-chart:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
module.exports = router;