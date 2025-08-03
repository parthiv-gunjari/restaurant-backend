

// /server/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/OrderModel');
const MenuItem = require('../models/MenuItemModel'); 
const AuditLog = require('../models/AuditLogModel');
const { authenticateUser, authorizeRole, authenticateAdmin } = require('../middleware/authMiddleware');
const Table = require('../models/TableModel');
const sendOrderCompletionEmail = require('../utils/sendEmail');
const sendOrderConfirmationEmail = require('../utils/sendConfirmationEmail');

// ==========================
// POST: Create a New Order (Public)
// ==========================
router.post('/', async (req, res) => {
  try {
    console.log("🛒 Incoming order payload:", req.body);
    const { name, email, phone, orderType, paymentStatus, paymentMode, discount, tax, splitPayment, items, notes, itemsHtml } = req.body;

    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    const orderCode = 'ORD' + Math.floor(100000 + Math.random() * 900000); // Simple unique code
    const transformedItems = await Promise.all(items.map(async item => {
      const menuItem = await MenuItem.findById(item._id || item.itemId);
      if (!menuItem) throw new Error(`Menu item not found: ${item.itemId || item._id}`);
      return {
        itemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity || 1
      };
    }));
    const newOrder = new Order({
      orderCode,
      name,
      email,
      phone,
      items: transformedItems,
      initialItems: transformedItems, // ✅ Store original items
      notes,
      orderType: orderType || 'online',
      paymentStatus: paymentStatus || 'Pending',
      paymentMode,
      discount,
      tax,
      splitPayment,
      status: 'Pending'
    });
    const savedOrder = await newOrder.save();
    console.log("✅ Order saved:", savedOrder);

    await sendOrderConfirmationEmail({
      email,
      name,
      orderId: savedOrder.orderCode,
      items: savedOrder.items,
      transactionId: req.body.transactionId,
      timestamp: savedOrder.timestamp
    });
    console.log("📧 Confirmation email sent to:", email);
    res.status(201).json({ message: 'Order placed', order: savedOrder });
  } catch (err) {
    console.error("❌ Error placing order:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET: Pending Orders with Filters + Pagination (Admin Only)
// ============================================================
router.get('/', authenticateUser, authorizeRole('admin', 'manager','waiter'), async (req, res) => {
  try {
    const { limit = 100, name, email, date } = req.query;
    const query = { status: 'Pending' };

    if (name) query.name = { $regex: name, $options: 'i' };
    if (email) query.email = { $regex: email, $options: 'i' };
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: dayStart, $lte: dayEnd };
    }
    if (req.query.orderType) {
      query.orderType = req.query.orderType;
    }

    const orders = await Order.find(query)
      .select('+initialItems')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ orders });
  } catch (err) {
    console.error("❌ Error fetching pending orders:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET: Completed Orders with Filters + Pagination (Admin Only)
// ============================================================
router.get('/completed', authenticateUser, authorizeRole('admin', 'manager','waiter'), async (req, res) => {
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
router.patch('/:id/complete', authenticateUser, authorizeRole('admin', 'manager','waiter'), async (req, res) => {
  try {
    console.log("🔧 Completing order ID:", req.params.id);
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.warn("❌ Order not found with ID:", req.params.id);
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'Completed';
    order.completedAt = new Date();
    await order.save();
    console.log("✅ Order marked completed:", order.orderCode);

    // Reset table if dine-in
    if (order.orderType === 'dine-in' && order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table) {
        table.status = 'available';
        table.currentOrderId = null;
        table.startedAt = null; // ✅ Reset timer
        await table.save();
        console.log("🪑 Table status reset:", table.tableNumber);
      }
    }

   const populatedItems = await Promise.all(order.items.map(async item => {
    try {
      const id = item.itemId?._id?.toString?.() || item.itemId?.toString?.();
      if (!item.name || !item.price) {
        const menuItem = await MenuItem.findById(id);
        if (!menuItem) throw new Error(`Menu item not found for ID: ${id}`);
        const base = typeof item.toObject === 'function' ? item.toObject() : item;
        return { ...base, name: menuItem.name, price: menuItem.price };
      }
      return item;
    } catch (err) {
      console.error("❌ Error processing item in completion:", err);
      throw err;
    }
  }));

    console.log("📦 Finalized item list:", populatedItems);

    await sendOrderCompletionEmail(order.email, {
      ...order.toObject(),
      items: populatedItems
    });
    console.log("📧 Email sent to:", order.email);

    res.json({ message: 'Order marked as completed & email sent', order });
  } catch (err) {
    console.error("❌ Error in /:id/complete route:", err.message, err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});
// ============================================================
// GET: Order History by Email or Name (Public)
// ============================================================
router.get('/history', async (req, res) => {
  try {
    const { email, name, limit = 50 } = req.query;
    if (!email && !name) {
      return res.status(400).json({ error: 'Please provide email or name to fetch history.' });
    }

    const query = {};
    if (email) query.email = email;
    if (name) query.name = name;

    const orders = await Order.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'No orders found for the provided email or name.' });
    }

    res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Error fetching order history:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET: Admin Dashboard Analytics (?from=&to=) (Admin Only)
// ============================================================
router.get('/analytics', authenticateUser, authorizeRole('admin'), async (req, res) => {
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
      if (!order.items || order.items.length === 0) return sum;
      return (
        sum +
        order.items.reduce((subtotal, item) => {
          const price = item.price || 0;
          const quantity = item.quantity || 0;
          return subtotal + price * quantity;
        }, 0)
      );
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
router.get('/revenue-chart', authenticateUser, authorizeRole('admin'), async (req, res) => {
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
// ✅ POST: Create Dine-In Order (Waiter, Manager, Admin)
router.post(
  '/dinein',
  authenticateUser,
  authorizeRole('waiter', 'manager', 'admin'),
  async (req, res) => {
    console.log('[DEBUG] Dine-in order placed by:', req.user);
    console.log('✅ /dinein route hit');
    console.log('🧾 Authenticated User:', req.user);
    console.log('📦 Request Body:', req.body);

    try {
      const { items, notes, tableId } = req.body;

      // Basic input validation
      if (!tableId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order data' });
      }

      // Validate table
      const table = await Table.findById(tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      if (table.status === 'occupied') {
        return res.status(409).json({ error: 'Table is already occupied' });
      }

      // Validate authenticated user info
      const user = req.user;
      if (!user || !user.userId || !user.username || !user.role) {
        return res.status(403).json({ error: 'Unauthorized user data' });
      }

      // Order Code
      const orderCode = 'ORD' + Math.floor(100000 + Math.random() * 900000);

      // Resolve menu item details from DB
      const transformedItems = await Promise.all(
        items.map(async item => {
          const menuItem = await MenuItem.findById(item._id || item.itemId);
          if (!menuItem)
            throw new Error(`Menu item not found: ${item.itemId || item._id}`);
          return {
            itemId: menuItem._id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: item.quantity || 1
          };
        })
      );

      // Create new Order
      const newOrder = new Order({
        orderCode,
        name: `Dine-In Table ${table.tableNumber}`,
        email: 'parthivskitchen7@gmail.com', // Default or system email
        items: transformedItems,
        initialItems: transformedItems,
        notes,
        status: 'Pending',
        tableId,
        waiterId: user.userId,
        waiterName: user.username,
        orderType: 'dine-in',
        startedAt: new Date()
      });

      console.log('🚀 Dine-in order to be saved:', newOrder);
      const savedOrder = await newOrder.save();
      console.log('✅ Dine-in order saved:', savedOrder);

      // Update table status
      table.status = 'occupied';
      table.currentOrderId = savedOrder._id;
      table.startedAt = new Date();
      table.updatedBy = user.userId;
      await table.save();

      res.status(201).json({ message: 'Dine-in order placed', order: savedOrder });
    } catch (err) {
      console.error('❌ Dine-in order error:', err.stack || err);
      res.status(500).json({ error: 'Failed to place dine-in order' });
    }
  }
);
// 🔧 PATCH: Admin or Manager modifies order (item qty, cancel, etc.)
const mongoose = require('mongoose');
router.patch('/:id/modify', authenticateUser, authorizeRole('admin', 'manager','waiter'), async (req, res) => {
  try {
    console.log("📨 Incoming PATCH /modify body:", req.body);
    const { updatedItems, reason } = req.body;



    if (!Array.isArray(updatedItems) || updatedItems.some(i => !i.itemId || typeof i.itemId !== 'string')) {
      return res.status(400).json({ error: 'Invalid updatedItems format: itemId missing or not a string' });
    }

    const order = await Order.findById(req.params.id);
    console.log("🧾 Modifying order ID:", req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'Completed') return res.status(400).json({ error: 'Cannot modify completed orders' });

    const before = order.items.map(item => ({ ...item.toObject?.() || item }));

    console.log("🔧 Updating items:", updatedItems);
    const transformedItems = await Promise.all(updatedItems.map(async item => {
      const id = item.itemId || item._id;
      if (!id) {
        throw new Error(`Missing itemId or _id for item: ${JSON.stringify(item)}`);
      }
      const menuItem = await MenuItem.findById(id.toString());
      if (!menuItem) throw new Error(`Menu item not found: ${id}`);
      return {
        itemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity
      };
    }));

    order.items = transformedItems;
    await order.save();
    console.log("✅ Order successfully updated:", order._id);
    const modificationSessionId = new mongoose.Types.ObjectId();
    // Log the modification in AuditLog withtableId included and modificationSessionId

   await AuditLog.create({
    action: 'Modify Order',
    performedBy: req.user.userId,
    performedByName: req.user.username || 'System.',
    orderId: order._id,
    tableId: order.tableId,
    before:order.initialItems,
    after:transformedItems,
    reason:req.body.reason || 'Edited via admin UI',
    modificationSessionId: modificationSessionId
  })
    res.json({ message: 'Order updated & logged', order });
  } catch (err) {
    console.error('❌ Order modification failed:', err);
    res.status(500).json({ error: 'Modification error' });
  }
});
// ✅ PATCH: Update order items only (used by Edit button in modal)
router.patch('/:id/edit', authenticateUser, authorizeRole('admin', 'manager','waiter'), async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items provided' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const transformedItems = await Promise.all(items.map(async item => {
      const menuItem = await MenuItem.findById(item.itemId);
      if (!menuItem) throw new Error(`Menu item not found: ${item.itemId}`);
      return {
        itemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity
      };
    }));

    order.items = transformedItems;
    await order.save();

    res.status(200).json({ message: 'Order updated', order });
  } catch (err) {
    console.error("❌ Error updating order items:", err.stack || err);
    res.status(500).json({ error: 'Failed to update order items', details: err.message });
  }
});
// ✅ GET: Get all modifications (global) for all orders (Admin Only)
router.get('/modifications',  authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'fullName email')
      .populate('tableId', 'tableNumber position name')
      .populate('orderId', 'orderCode')
      .sort({ createdAt: -1 });

    const response = logs.map(log => ({
      ...log.toObject(),
      orderCode: log.orderId?.orderCode,
      table: log.tableId || null,
      performedBy: log.performedBy || {},
    }));

    res.json(response);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ✅ GET: Get all pending dine-in orders (for KDS etc.)
router.get('/dinein/pending', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find({ orderType: 'dine-in', status: 'Pending' })
      .populate('items.itemId')
      .sort({ startedAt: -1 });

    const safeOrders = orders.map(order => ({
      ...order.toObject(),
      items: Array.isArray(order.items) ? order.items : []
    }));

    res.json({ orders: safeOrders });
  } catch (err) {
    console.error("❌ Error fetching dine-in orders:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ✅ GET: Get single order by ID (used for dine-in fetch)
router.get('/:id', authenticateUser, authorizeRole('admin', 'waiter', 'manager'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Convert items to include itemId explicitly
    const formattedOrder = {
      ...order.toObject(),
      items: Array.isArray(order.items)
        ? order.items.map(item => ({
            itemId: item.itemId || item._id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        : []
    };

    res.status(200).json({ order: formattedOrder });
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ GET: Get all modifications for a given order (Admin/Manager Only)
router.get('/:id/modifications', authenticateUser, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const logs = await AuditLog.find({ orderId: req.params.id })
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (err) {
    console.error("❌ Failed to fetch audit logs:", err);
    res.status(500).json({ error: 'Failed to fetch modifications', details: err.message });
  }
});
// ✅ PATCH: Start cooking (sets startedCookingAt timestamp)
router.patch('/:id/start-cooking', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.startedCookingAt = new Date();
    await order.save();

    res.json({ message: 'Cooking started', startedCookingAt: order.startedCookingAt });
  } catch (err) {
    console.error("❌ Error starting cooking:", err);
    res.status(500).json({ error: 'Failed to start cooking' });
  }
});
// ✅ POST: Create In-Store Order (Admin or Manager)
router.post('/instore', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  try {
    const { name, email, phone, orderType, paymentStatus, paymentMode, discount, tax, splitPayment, items, notes } = req.body;

    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderCode = 'ORD' + Math.floor(100000 + Math.random() * 900000); // Unique code

    const transformedItems = await Promise.all(items.map(async item => {
      const id = item.itemId || item._id;
      if (!id) {
        console.error("⚠️ Missing itemId or _id in item:", item);
        throw new Error('Missing itemId in request item');
      }
      const menuItem = await MenuItem.findById(id);
      if (!menuItem) throw new Error(`Menu item not found: ${id}`);
      return {
        itemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity || 1
      };
    }));

    const newOrder = new Order({
      orderCode,
      name,
      email,
      phone,
      items: transformedItems,
      initialItems: transformedItems,
      notes,
      orderType: orderType || 'walkin',
      paymentStatus: paymentStatus || 'Pending',
      paymentMode,
      discount,
      tax,
      splitPayment,
      status: 'Pending'
    });

    const savedOrder = await newOrder.save();
    console.log("✅ In-store order placed:", savedOrder);

    res.status(201).json({ message: 'In-store order placed successfully', order: savedOrder });
  } catch (err) {
    console.error("❌ Error placing in-store order:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ POST: Create Walk-In Order (Admin or Manager)
router.post('/walkin', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  try {
    const { name, email, phone, paymentStatus, paymentMode, discount, tax, splitPayment, items, notes } = req.body;

    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderCode = 'ORD' + Math.floor(100000 + Math.random() * 900000);

    const transformedItems = await Promise.all(items.map(async item => {
      const id = item.itemId || item._id;
      if (!id) {
        console.error("⚠️ Missing itemId or _id in item:", item);
        throw new Error('Missing itemId in request item');
      }
      const menuItem = await MenuItem.findById(id);
      if (!menuItem) throw new Error(`Menu item not found: ${id}`);
      return {
        itemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity || 1
      };
    }));

    const newOrder = new Order({
      orderCode,
      name,
      email,
      phone,
      items: transformedItems,
      initialItems: transformedItems,
      notes,
      orderType: 'walkin',
      paymentStatus: paymentStatus || 'Pending',
      paymentMode,
      discount,
      tax,
      splitPayment,
      status: 'Pending'
    });

    const savedOrder = await newOrder.save();
    console.log("✅ Walk-in order placed:", savedOrder);

    res.status(201).json({ message: 'Walk-in order placed successfully', order: savedOrder });
  } catch (err) {
    console.error("❌ Error placing walk-in order:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ POST: Create To-Go Order (Admin or Manager)
router.post('/togo', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  try {
    const { name, email, phone, paymentStatus, paymentMode, discount, tax, splitPayment, items, notes } = req.body;

    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderCode = 'ORD' + Math.floor(100000 + Math.random() * 900000);

    const transformedItems = await Promise.all(items.map(async item => {
      const id = item.itemId || item._id;
      if (!id) {
        console.error("⚠️ Missing itemId or _id in item:", item);
        throw new Error('Missing itemId in request item');
      }
      const menuItem = await MenuItem.findById(id);
      if (!menuItem) throw new Error(`Menu item not found: ${id}`);
      return {
        itemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity || 1
      };
    }));

    const newOrder = new Order({
      orderCode,
      name,
      email,
      phone,
      items: transformedItems,
      initialItems: transformedItems,
      notes,
      orderType: 'togo',
      paymentStatus: paymentStatus || 'Pending',
      paymentMode,
      discount,
      tax,
      splitPayment,
      status: 'Pending'
    });

    const savedOrder = await newOrder.save();
    console.log("✅ To-go order placed:", savedOrder);

    res.status(201).json({ message: 'To-go order placed successfully', order: savedOrder });
  } catch (err) {
    console.error("❌ Error placing to-go order:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ POST: Create Call-In Order (Admin or Manager)
router.post('/callin', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  try {
    const { name, email, phone, paymentStatus, paymentMode, discount, tax, splitPayment, items, notes } = req.body;

    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderCode = 'ORD' + Math.floor(100000 + Math.random() * 900000);

    const transformedItems = await Promise.all(items.map(async item => {
      const id = item.itemId || item._id;
      if (!id) {
        console.error("⚠️ Missing itemId or _id in item:", item);
        throw new Error('Missing itemId in request item');
      }
      const menuItem = await MenuItem.findById(id);
      if (!menuItem) throw new Error(`Menu item not found: ${id}`);
      return {
        itemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity || 1
      };
    }));

    const newOrder = new Order({
      orderCode,
      name,
      email,
      phone,
      items: transformedItems,
      initialItems: transformedItems,
      notes,
      orderType: 'callin',
      paymentStatus: paymentStatus || 'Pending',
      paymentMode,
      discount,
      tax,
      splitPayment,
      status: 'Pending'
    });

    const savedOrder = await newOrder.save();
    console.log("✅ Call-in order placed:", savedOrder);

    res.status(201).json({ message: 'Call-in order placed successfully', order: savedOrder });
  } catch (err) {
    console.error("❌ Error placing call-in order:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ PATCH: Update item-level cooking status (for Kitchen Display System)
router.patch('/:orderId/item/:itemId/status', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    if (!['pending', 'in-progress', 'ready'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value. Must be one of: pending, in-progress, ready.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const itemToUpdate = order.items.find(item => item.itemId.toString() === itemId.toString());
    if (!itemToUpdate) return res.status(404).json({ error: 'Item not found in order' });

    itemToUpdate.status = status;
    await order.save();

    res.json({ message: 'Item status updated', item: itemToUpdate });
  } catch (err) {
    console.error("❌ Error updating item status:", err);
    res.status(500).json({ error: 'Failed to update item status' });
  }
});

// ✅ PATCH: Record POS Payment (card/cash) & update order
router.patch('/:id/pay', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  try {
    const {
      paymentMode,
      amountPaid,
      changeReturned,
      cardBrand,
      last4,
      paymentIntentId
    } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.paymentStatus = 'paid';
    order.paymentMode = paymentMode || 'cash';
    order.amountPaid = amountPaid || 0;
    order.changeReturned = changeReturned || 0;
    order.cardBrand = cardBrand || '';
    order.last4 = last4 || '';
    order.paymentIntentId = paymentIntentId || '';
    order.completedAt = new Date();

    await order.save();

    // If dine-in, reset the table status
    if (order.orderType === 'dine-in' && order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table) {
        table.status = 'available';
        table.currentOrderId = null;
        table.startedAt = null;
        await table.save();
        console.log("🪑 Table reset after payment:", table.tableNumber);
      }
    }

    res.status(200).json({ message: 'Payment recorded successfully.', order });
  } catch (err) {
    console.error("❌ Error recording POS payment:", err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});
// Get active order by tableId
router.get('/by-table/:tableId', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  const { tableId } = req.params;

  try {
    const table = await Table.findById(tableId);
    if (!table || !table.currentOrderId) {
      return res.status(404).json({ message: 'No active order for this table' });
    }

    const order = await Order.findById(table.currentOrderId).populate('items.itemId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (err) {
    console.error('Error fetching order by tableId:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;