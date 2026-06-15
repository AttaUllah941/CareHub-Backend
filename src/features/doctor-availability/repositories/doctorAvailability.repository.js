const DoctorAvailability = require('../models/doctorAvailability.model');

class DoctorAvailabilityRepository {
  async create(data) {
    return DoctorAvailability.create(data);
  }

  async findByDoctorProfileId(doctorProfileId) {
    return DoctorAvailability.findOne({ doctorProfileId });
  }

  async findById(id) {
    return DoctorAvailability.findById(id);
  }

  async upsertByDoctorProfileId(doctorProfileId, data) {
    return DoctorAvailability.findOneAndUpdate(
      { doctorProfileId },
      data,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  async updateByDoctorProfileId(doctorProfileId, data) {
    return DoctorAvailability.findOneAndUpdate(
      { doctorProfileId },
      data,
      { new: true, runValidators: true },
    );
  }
}

module.exports = DoctorAvailabilityRepository;
