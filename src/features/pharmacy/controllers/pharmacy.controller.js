const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class PharmacyController {
  constructor(pharmacyService) {
    this.pharmacyService = pharmacyService;
  }

  getMedicines = asyncHandler(async (req, res) => {
    const result = await this.pharmacyService.getMedicines(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getMedicineById = asyncHandler(async (req, res) => {
    const medicine = await this.pharmacyService.getMedicineById(req.params.id);
    res.status(HttpStatus.OK).json({ success: true, data: { medicine } });
  });

  createMedicine = asyncHandler(async (req, res) => {
    const medicine = await this.pharmacyService.createMedicine(req.body, req.user);
    res.status(HttpStatus.CREATED).json({ success: true, message: 'Medicine created', data: { medicine } });
  });

  updateMedicine = asyncHandler(async (req, res) => {
    const medicine = await this.pharmacyService.updateMedicine(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Medicine updated', data: { medicine } });
  });

  deleteMedicine = asyncHandler(async (req, res) => {
    const result = await this.pharmacyService.deleteMedicine(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, ...result });
  });

  getInventory = asyncHandler(async (req, res) => {
    const result = await this.pharmacyService.getInventory(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  upsertInventory = asyncHandler(async (req, res) => {
    const inventory = await this.pharmacyService.upsertInventory(req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Inventory saved', data: { inventory } });
  });

  adjustInventory = asyncHandler(async (req, res) => {
    const inventory = await this.pharmacyService.adjustInventory(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Inventory adjusted', data: { inventory } });
  });

  getOrders = asyncHandler(async (req, res) => {
    const result = await this.pharmacyService.getOrders(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getMyOrders = asyncHandler(async (req, res) => {
    const orders = await this.pharmacyService.getMyOrders(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { orders } });
  });

  getOrderById = asyncHandler(async (req, res) => {
    const order = await this.pharmacyService.getOrderById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { order } });
  });

  createOrder = asyncHandler(async (req, res) => {
    const order = await this.pharmacyService.createOrder(req.body, req.user);
    res.status(HttpStatus.CREATED).json({ success: true, message: 'Order placed', data: { order } });
  });

  createOrderFromPrescription = asyncHandler(async (req, res) => {
    const order = await this.pharmacyService.createOrderFromPrescription(
      req.params.prescriptionId,
      req.body,
      req.user,
    );
    res.status(HttpStatus.CREATED).json({ success: true, message: 'Order placed from prescription', data: { order } });
  });

  updateOrderStatus = asyncHandler(async (req, res) => {
    const order = await this.pharmacyService.updateOrderStatus(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Order status updated', data: { order } });
  });

  cancelOrder = asyncHandler(async (req, res) => {
    const order = await this.pharmacyService.cancelOrder(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Order cancelled', data: { order } });
  });

  uploadPrescription = asyncHandler(async (req, res) => {
    const upload = await this.pharmacyService.uploadPrescription(req.file, req.body, req.user);
    res.status(HttpStatus.CREATED).json({ success: true, message: 'Prescription uploaded', data: { upload } });
  });

  getMyPrescriptionUploads = asyncHandler(async (req, res) => {
    const uploads = await this.pharmacyService.getMyPrescriptionUploads(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { uploads } });
  });

  getPrescriptionUploads = asyncHandler(async (req, res) => {
    const result = await this.pharmacyService.getPrescriptionUploads(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getPrescriptionUploadById = asyncHandler(async (req, res) => {
    const upload = await this.pharmacyService.getPrescriptionUploadById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { upload } });
  });

  reviewPrescriptionUpload = asyncHandler(async (req, res) => {
    const upload = await this.pharmacyService.reviewPrescriptionUpload(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Upload reviewed', data: { upload } });
  });

  downloadPrescriptionUpload = asyncHandler(async (req, res) => {
    const file = await this.pharmacyService.downloadPrescriptionUpload(req.params.id, req.user);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.buffer);
  });
}

module.exports = PharmacyController;
