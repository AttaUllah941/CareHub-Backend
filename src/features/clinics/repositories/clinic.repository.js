const Clinic = require('../models/clinic.model');

const POPULATE_FIELDS = [
  { path: 'managerId', select: 'firstName lastName email phone isActive role' },
  {
    path: 'doctorProfileIds',
    select: 'title licenseNumber verificationStatus isActive userId specialtyIds',
    populate: [
      { path: 'userId', select: 'firstName lastName email phone' },
      { path: 'specialtyIds', select: 'name slug' },
    ],
  },
];

class ClinicRepository {
  async create(data) {
    const clinic = await Clinic.create(data);
    return clinic.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return Clinic.findById(id).populate(POPULATE_FIELDS);
  }

  async findBySlug(slug) {
    return Clinic.findOne({ slug: slug.toLowerCase() }).populate(POPULATE_FIELDS);
  }

  async findByManagerId(managerId) {
    return Clinic.findOne({ managerId }).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return Clinic.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async softDeleteById(id) {
    return Clinic.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findAll({ page = 1, limit = 10, search, city, country, isActive, sortBy = 'name', sortOrder = 'asc' }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (city) filter.city = new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (country) filter.country = new RegExp(country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { slug: regex }, { city: regex }, { address: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [clinics, total] = await Promise.all([
      Clinic.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Clinic.countDocuments(filter),
    ]);

    return {
      clinics,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findAllActive() {
    return Clinic.find({ isActive: true }).sort({ name: 1 }).populate(POPULATE_FIELDS);
  }
}

module.exports = ClinicRepository;
