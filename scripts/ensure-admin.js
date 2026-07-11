require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../src/modules/users/users.model');
const { UserRole } = require('../src/shared/enums/userRole.enum');
const config = require('../src/config');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@carehub.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password123!';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, config.bcrypt.saltRounds);

  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL.toLowerCase() },
    {
      firstName: 'CareHub',
      lastName: 'Admin',
      email: ADMIN_EMAIL.toLowerCase(),
      phone: '+923001000001',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      isEmailVerified: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Admin ready: ${admin.email} / ${ADMIN_PASSWORD}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
