const mongoose = require('mongoose');
const { MedicineOrder } = require('./medicine-orders.model');

const POPULATE_DEFAULT = [
  {
    path: 'items.medicineId',
    select: 'name manufacturer price currency requiresPrescription',
  },
  {
    path: 'items.pharmacyId',
    select:
      'name slug city citySlug address description phone email website images rating timings isHomeDelivery deliveryFee deliveryTime',
  },
  { path: 'userId', select: 'firstName lastName email phone' },
];

const findById = (id) => MedicineOrder.findById(id).populate(POPULATE_DEFAULT);

const findByUser = (userId, filter, { skip, limit, sort }) =>
  MedicineOrder.find({ userId, ...filter })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_DEFAULT);

const countByUser = (userId, filter) => MedicineOrder.countDocuments({ userId, ...filter });

const pharmacyFilter = (pharmacyId, filter = {}) => ({
  'items.pharmacyId': pharmacyId,
  ...filter,
});

const findByPharmacy = (pharmacyId, filter, { skip, limit, sort }) =>
  MedicineOrder.find(pharmacyFilter(pharmacyId, filter))
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_DEFAULT);

const countByPharmacy = (pharmacyId, filter) =>
  MedicineOrder.countDocuments(pharmacyFilter(pharmacyId, filter));

const create = (data) => MedicineOrder.create(data);

const updateById = (id, data) =>
  MedicineOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
    POPULATE_DEFAULT,
  );

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByUser,
  countByUser,
  findByPharmacy,
  countByPharmacy,
  create,
  updateById,
  isValidObjectId,
};
