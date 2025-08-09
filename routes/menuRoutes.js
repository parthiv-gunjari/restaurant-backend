const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const MenuItem = require('../models/MenuItemModel');

// GET all menu items
router.get('/', async (req, res) => {
  try {
    // Use lean() so we can safely mutate the returned objects
    const items = await MenuItem.find().lean();

    // Add imageUrl key for frontend compatibility before sending
    items.forEach(item => {
      if (!item.imageUrl && item.image) {
        item.imageUrl = item.image;
      }
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// GET single menu item by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await MenuItem.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    const item = doc.toObject ? doc.toObject() : doc;
    if (!item.imageUrl && item.image) {
      item.imageUrl = item.image;
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch menu item' });
  }
});

// Middleware for file upload
const multer = require('multer');

// Ensure uploads directory exists (works locally; on some hosts it may be read-only)
const uploadDir = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (_) {
  // If the host is read-only, we'll still accept imageUrl from the client
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Controller functions for menu item creation and update with image upload
const createMenuItem = async (req, res) => {
  try {
    // Prefer client-provided imageUrl (e.g., Cloudinary) if present.
    const uploadedPath = req.file ? `/uploads/${req.file.filename}` : null;
    const bodyImageUrl = req.body.imageUrl || req.body.imageUrlFallback || null;

    // Build payload without overwriting image fields when none provided
    const payload = { ...req.body };

    if (bodyImageUrl) {
      payload.imageUrl = bodyImageUrl;
      // Also mirror to image for backward compatibility if your frontend reads `image`
      payload.image = payload.image || bodyImageUrl;
    } else if (uploadedPath) {
      payload.image = uploadedPath;
      payload.imageUrl = uploadedPath;
    }

    const newItem = new MenuItem(payload);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add new menu item' });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const uploadedPath = req.file ? `/uploads/${req.file.filename}` : null;
    const bodyImageUrl = req.body.imageUrl || req.body.imageUrlFallback || null;

    // Only update image fields if the client sent a new imageUrl or uploaded a file
    if (bodyImageUrl) {
      updateData.imageUrl = bodyImageUrl;
      updateData.image = updateData.image || bodyImageUrl;
    } else if (uploadedPath) {
      updateData.image = uploadedPath;
      updateData.imageUrl = uploadedPath;
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