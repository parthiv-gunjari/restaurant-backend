

const express = require('express');
const router = express.Router();
const Reservation = require('../models/ReservationModel');
const Table = require('../models/TableModel');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

// ➕ Create new reservation
router.post('/', authenticateUser, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const reservation = new Reservation(req.body);
    await reservation.save();
    res.status(201).json({ message: 'Reservation created', reservation });
  } catch (err) {
    console.error('Create reservation failed:', err);
    res.status(400).json({ error: 'Failed to create reservation' });
  }
});

// 📄 Get all reservations (with optional filters)
router.get('/', authenticateUser, authorizeRole('admin', 'manager','waiter'), async (req, res) => {
  try {
    const { status, date } = req.query;
    const query = {};

    if (status) query.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const reservations = await Reservation.find(query).sort({ date: 1 });
    res.json(reservations);
  } catch (err) {
    console.error('Fetch reservations failed:', err);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// 🔁 Update reservation status (seated, cancelled, completed)
router.patch('/:id', authenticateUser, authorizeRole('admin', 'manager','waiter'), async (req, res) => {
  try {
    const updated = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Reservation not found' });
    res.json({ message: 'Reservation updated', reservation: updated });
  } catch (err) {
    console.error('Update reservation failed:', err);
    res.status(400).json({ error: 'Failed to update reservation' });
  }
});

// ❌ Delete reservation
router.delete('/:id', authenticateUser, authorizeRole('admin', 'manager','waiter'), async (req, res) => {
  try {
    const deleted = await Reservation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Reservation not found' });
    res.json({ message: 'Reservation deleted' });
  } catch (err) {
    console.error('Delete reservation failed:', err);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

module.exports = router;