const mongoose = require('mongoose');
const Table = require('../models/TableModel.js');

mongoose.connect('mongodb+srv://parthivkumar07:Mongodb123@cluster0.hbufw5w.mongodb.net/restaurantDB?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const generateTableIds = () => {
  const tables = [];
  const sections = ['A', 'B', 'C', 'D'];
  for (let section of sections) {
    for (let i = 1; i <= 4; i++) {
      tables.push({
        tableNumber: `${section}${i}`,
        status: 'available',
        startedAt: null,
        waiterId: null
      });
    }
  }
  return tables;
};

const seedTables = async () => {
  try {
    await Table.deleteMany(); // optional: clears existing tables
    const tables = generateTableIds();
    await Table.insertMany(tables);
    console.log('✅ Tables A1–F5 inserted!');
    process.exit();
  } catch (err) {
    console.error('❌ Error inserting tables', err);
    process.exit(1);
  }
};

seedTables();