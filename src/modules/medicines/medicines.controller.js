const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const medicinesService = require('./medicines.service');

const listPublic = asyncHandler(async (req, res) => {
  const data = await medicinesService.listPublicMedicines(req.query);
  successResponse(res, data, 'Medicines retrieved');
});

const getPublicDetail = asyncHandler(async (req, res) => {
  const data = await medicinesService.getPublicMedicineDetail(req.params.id);
  successResponse(res, data, 'Medicine retrieved');
});

const createPharmacy = asyncHandler(async (req, res) => {
  const data = await medicinesService.createPharmacy(req.body);
  successResponse(res, data, 'Pharmacy created', HttpStatus.CREATED);
});

const updatePharmacy = asyncHandler(async (req, res) => {
  const data = await medicinesService.updatePharmacy(req.params.id, req.body);
  successResponse(res, data, 'Pharmacy updated');
});

const deletePharmacy = asyncHandler(async (req, res) => {
  const data = await medicinesService.deletePharmacy(req.params.id);
  successResponse(res, data, 'Pharmacy deleted');
});

const createMedicine = asyncHandler(async (req, res) => {
  const data = await medicinesService.createMedicine(req.params.pharmacyId, req.body);
  successResponse(res, data, 'Medicine created', HttpStatus.CREATED);
});

const updateMedicine = asyncHandler(async (req, res) => {
  const data = await medicinesService.updateMedicine(
    req.params.pharmacyId,
    req.params.medicineId,
    req.body,
  );
  successResponse(res, data, 'Medicine updated');
});

const deleteMedicine = asyncHandler(async (req, res) => {
  const data = await medicinesService.deleteMedicine(
    req.params.pharmacyId,
    req.params.medicineId,
  );
  successResponse(res, data, 'Medicine deleted');
});

module.exports = {
  listPublic,
  getPublicDetail,
  createPharmacy,
  updatePharmacy,
  deletePharmacy,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
