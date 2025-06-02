const express = require('express');
const path = require('path');
const router = express.Router();
const MenuItem = require('../models/MenuItemModel');

// GET all menu items
router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find();
    res.json(items);
    // Add imageUrl key for frontend compatibility
    items.forEach(item => {
      if (item.image && !item.imageUrl) {
        item.imageUrl = item.image;
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Middleware for file upload
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Controller functions for menu item creation and update with image upload
const createMenuItem = async (req, res) => {
  try {
    const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
    const newItem = new MenuItem({ ...req.body, image: imagePath, imageUrl: imagePath });
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add new menu item' });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const updateData = req.body;
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
      updateData.imageUrl = updateData.image;
    }
    const updatedItem = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedItem);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update item' });
  }
};

// Updated POST and PUT routes for menu items with image upload
router.post('/', upload.single('image'), createMenuItem);
router.put('/:id', upload.single('image'), updateMenuItem);

// DELETE menu item by ID
router.delete('/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete item' });
  }
});
module.exports = router;