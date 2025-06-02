const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  category: { type: String, default: 'Uncategorized' },
  image: { type: String, default: '' }, // This will store the image path like /uploads/image.jpg
  inStock: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: true },
  isVeg: { type: Boolean, required: true }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);