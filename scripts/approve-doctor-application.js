require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/modules/users/users.model');
const { DoctorApplication } = require('../src/modules/doctor-applications/doctor-applications.model');
const doctorApplicationsService = require('../src/modules/doctor-applications/doctor-applications.service');

const EMAIL = process.argv[2] || 'attatestingcarehub@yopmail.com';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const application = await DoctorApplication.findOne({ email: EMAIL.toLowerCase() });
  if (!application) {
    console.log(`No application found for ${EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  if (application.status === 'approved') {
    console.log(`Application already approved for ${EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  const admin = await User.findOne({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } });
  if (!admin) {
    console.log('No admin user found');
    await mongoose.disconnect();
    return;
  }

  await doctorApplicationsService.approveApplication(application._id.toString(), {
    id: admin._id.toString(),
  });

  console.log(`Approved doctor application for ${EMAIL}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
