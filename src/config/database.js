const mongoose = require('mongoose');
const config = require('./index');

const connectDatabase = async () => {
  await mongoose.connect(config.MONGODB_URI);
};

const disconnectDatabase = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDatabase, disconnectDatabase };
