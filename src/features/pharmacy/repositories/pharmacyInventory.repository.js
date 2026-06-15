const PharmacyInventory = require('../models/pharmacyInventory.model');

const POPULATE = [{ path: 'medicineId' }];

class PharmacyInventoryRepository {
  async create(data) {
    const row = await PharmacyInventory.create(data);
    return row.populate(POPULATE);
  }

  async findById(id) {
    return PharmacyInventory.findById(id).populate(POPULATE);
  }

  async findByMedicineId(medicineId) {
    return PharmacyInventory.findOne({ medicineId, isActive: true }).populate(POPULATE);
  }

  async updateById(id, data) {
    return PharmacyInventory.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE,
    );
  }

  async findAll({ page = 1, limit = 10, lowStock, isActive }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;

    const rows = await PharmacyInventory.find(filter).populate(POPULATE).sort({ updatedAt: -1 });

    let filtered = rows;
    if (lowStock === true || lowStock === 'true') {
      filtered = rows.filter((r) => r.quantity <= r.reorderLevel);
    }

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const inventory = filtered.slice(skip, skip + limit);

    return {
      inventory,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async adjustQuantity(medicineId, delta) {
    return PharmacyInventory.findOneAndUpdate(
      { medicineId, isActive: true },
      { $inc: { quantity: delta } },
      { new: true, runValidators: true },
    ).populate(POPULATE);
  }

  async reserveQuantity(medicineId, quantity) {
    const row = await PharmacyInventory.findOne({ medicineId, isActive: true });
    if (!row || row.quantity - row.reservedQuantity < quantity) return null;
    row.reservedQuantity += quantity;
    await row.save();
    return row.populate(POPULATE);
  }

  async releaseReservation(medicineId, quantity) {
    return PharmacyInventory.findOneAndUpdate(
      { medicineId, isActive: true },
      { $inc: { reservedQuantity: -Math.abs(quantity) } },
      { new: true },
    ).populate(POPULATE);
  }

  async commitReservation(medicineId, quantity) {
    return PharmacyInventory.findOneAndUpdate(
      { medicineId, isActive: true },
      { $inc: { quantity: -quantity, reservedQuantity: -quantity } },
      { new: true, runValidators: true },
    ).populate(POPULATE);
  }
}

module.exports = PharmacyInventoryRepository;
