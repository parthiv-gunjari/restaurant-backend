const express = require('express');
const router = express.Router();
const Table = require('../models/TableModel');
const { authenticateUser, authorizeRole, authenticateAdmin } = require('../middleware/authMiddleware');
const Order = require('../models/OrderModel');
const User = require('../models/UserModel');

// 🔄 GET all tables (waiter/manager/admin)
router.get('/', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 }).lean();

    const tablesWithWaiterName = await Promise.all(
      tables.map(async (table) => {
        if (table.currentOrderId) {
          const order = await Order.findById(table.currentOrderId).populate('waiterId', 'fullName username');
          if (order && order.waiterId) {
            table.waiterName = order.waiterId.fullName || order.waiterId.username;
          } else {
            table.waiterName = 'N/A';
          }
        } else {
          table.waiterName = 'N/A';
        }
        return table;
      })
    );

    res.json(tablesWithWaiterName);
  } catch (err) {
    console.error('Failed to fetch tables:', err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// ➕ Create a new table (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { tableNumber, position } = req.body;
    const newTable = new Table({ tableNumber, position });
    await newTable.save();
    res.status(201).json({ message: 'Table added', table: newTable });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create table' });
  }
});

// 🛠 Update table status or position (waiter/manager/admin)
router.patch('/:id', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  try {
    // Find the old table before update
    const oldTable = await Table.findById(req.params.id);
    if (!oldTable) return res.status(404).json({ error: 'Table not found' });

    const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
    // Log old and new values for auditing
    console.log('[AUDIT] Table update:', {
      id: req.params.id,
      oldValues: oldTable,
      newValues: table,
      updatedBy: req.user ? req.user._id : undefined
    });
    res.json({ message: 'Table updated', table });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update table' });
  }
});

// ✅ GET table by ID (admin/manager/waiter)
router.get('/:id', authenticateUser, authorizeRole('admin', 'manager', 'waiter'), async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// ❌ Delete a table (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const deleted = await Table.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Table not found' });
    res.json({ message: 'Table deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

module.exports = router;