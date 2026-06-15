const path = require('path');
const fs = require('fs/promises');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { PharmacyOrderStatus } = require('../../../shared/enums/pharmacyOrderStatus.enum');
const { PrescriptionUploadStatus } = require('../../../shared/enums/prescriptionUploadStatus.enum');
const { AuditAction } = require('../../../shared/enums/auditAction.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');
const config = require('../../../config');

class PharmacyService {
  constructor(
    medicineRepository,
    pharmacyInventoryRepository,
    pharmacyOrderRepository,
    prescriptionUploadRepository,
    patientProfileRepository,
    prescriptionRepository,
    consultationRepository,
    auditService,
  ) {
    this.medicineRepository = medicineRepository;
    this.pharmacyInventoryRepository = pharmacyInventoryRepository;
    this.pharmacyOrderRepository = pharmacyOrderRepository;
    this.prescriptionUploadRepository = prescriptionUploadRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.prescriptionRepository = prescriptionRepository;
    this.consultationRepository = consultationRepository;
    this.auditService = auditService;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _isPharmacyStaff(requestedBy) {
    return requestedBy && [UserRole.PHARMACY, UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _formatMedicine(m) {
    return m.toJSON ? m.toJSON() : m;
  }

  _formatInventory(row) {
    const json = row.toJSON ? row.toJSON() : row;
    const medicine = json.medicineId;
    return {
      ...json,
      medicineId: medicine?.id || medicine?._id?.toString() || json.medicineId?.toString(),
      medicine: medicine && typeof medicine === 'object' ? this._formatMedicine(medicine) : undefined,
      availableQuantity: Math.max(0, (json.quantity ?? 0) - (json.reservedQuantity ?? 0)),
      isLowStock: (json.quantity ?? 0) <= (json.reorderLevel ?? 0),
    };
  }

  _formatOrder(order) {
    const json = order.toJSON ? order.toJSON() : order;
    const patient = json.patientProfileId;
    return {
      ...json,
      patientProfileId:
        patient?.id || patient?._id?.toString() || json.patientProfileId?.toString(),
      prescriptionId:
        json.prescriptionId?.id || json.prescriptionId?._id?.toString() || json.prescriptionId?.toString() || null,
      prescriptionUploadId:
        json.prescriptionUploadId?.id ||
        json.prescriptionUploadId?._id?.toString() ||
        json.prescriptionUploadId?.toString() ||
        null,
      patient:
        patient && typeof patient === 'object'
          ? {
              id: patient.id || patient._id?.toString(),
              user: patient.userId,
            }
          : undefined,
    };
  }

  _formatUpload(upload) {
    const json = upload.toJSON ? upload.toJSON() : upload;
    const patient = json.patientProfileId;
    return {
      ...json,
      patientProfileId:
        patient?.id || patient?._id?.toString() || json.patientProfileId?.toString(),
      patient:
        patient && typeof patient === 'object'
          ? {
              id: patient.id || patient._id?.toString(),
              user: patient.userId,
            }
          : undefined,
    };
  }

  async _resolvePatientProfile(userId) {
    const profile = await this.patientProfileRepository.findByUserId(userId);
    if (!profile) throw new ForbiddenError('Patient profile required');
    return profile;
  }

  // --- Medicines ---

  async getMedicines(query, requestedBy) {
    const isActive = query.isActive !== undefined ? query.isActive === 'true' : true;
    const result = await this.medicineRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      category: query.category,
      requiresPrescription:
        query.requiresPrescription !== undefined ? query.requiresPrescription === 'true' : undefined,
      isActive: this._isPharmacyStaff(requestedBy) ? isActive : true,
      sortBy: query.sortBy || 'name',
      sortOrder: query.sortOrder || 'asc',
    });
    return {
      medicines: result.medicines.map((m) => this._formatMedicine(m)),
      pagination: result.pagination,
    };
  }

  async getMedicineById(id) {
    const medicine = await this.medicineRepository.findById(id);
    if (!medicine || !medicine.isActive) throw new NotFoundError('Medicine not found');
    return this._formatMedicine(medicine);
  }

  async createMedicine(data, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    if (data.sku) {
      const existing = await this.medicineRepository.findBySku(data.sku);
      if (existing) throw new ConflictError('SKU already exists');
    }
    const medicine = await this.medicineRepository.create(data);
    return this._formatMedicine(medicine);
  }

  async updateMedicine(id, data, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const medicine = await this.medicineRepository.findById(id);
    if (!medicine) throw new NotFoundError('Medicine not found');
    if (data.sku && data.sku !== medicine.sku) {
      const existing = await this.medicineRepository.findBySku(data.sku);
      if (existing) throw new ConflictError('SKU already exists');
    }
    const updated = await this.medicineRepository.updateById(id, data);
    return this._formatMedicine(updated);
  }

  async deleteMedicine(id, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Only admins can delete medicines');
    const medicine = await this.medicineRepository.findById(id);
    if (!medicine) throw new NotFoundError('Medicine not found');
    await this.medicineRepository.softDeleteById(id);
    return { message: 'Medicine deactivated successfully' };
  }

  // --- Inventory ---

  async getInventory(query, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const result = await this.pharmacyInventoryRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      lowStock: query.lowStock,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : true,
    });
    return {
      inventory: result.inventory.map((r) => this._formatInventory(r)),
      pagination: result.pagination,
    };
  }

  async upsertInventory(data, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const medicine = await this.medicineRepository.findById(data.medicineId);
    if (!medicine || !medicine.isActive) throw new NotFoundError('Medicine not found');

    const existing = await this.pharmacyInventoryRepository.findByMedicineId(data.medicineId);
    if (existing) {
      const updated = await this.pharmacyInventoryRepository.updateById(existing._id, data);
      return this._formatInventory(updated);
    }

    const created = await this.pharmacyInventoryRepository.create({
      ...data,
      sellingPrice: data.sellingPrice ?? medicine.sellingPrice,
    });
    return this._formatInventory(created);
  }

  async adjustInventory(id, { adjustment, reason }, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const row = await this.pharmacyInventoryRepository.findById(id);
    if (!row || !row.isActive) throw new NotFoundError('Inventory record not found');

    const delta = parseInt(adjustment, 10);
    if (Number.isNaN(delta) || delta === 0) throw new BadRequestError('Invalid adjustment value');

    const newQty = row.quantity + delta;
    if (newQty < 0) throw new BadRequestError('Insufficient stock for adjustment');

    const updated = await this.pharmacyInventoryRepository.updateById(id, {
      quantity: newQty,
    });
    return this._formatInventory(updated);
  }

  // --- Orders ---

  async getOrders(query, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const result = await this.pharmacyOrderRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      status: query.status,
      isActive: true,
    });
    return {
      orders: result.orders.map((o) => this._formatOrder(o)),
      pagination: result.pagination,
    };
  }

  async getMyOrders(requestedBy) {
    const profile = await this._resolvePatientProfile(requestedBy.id);
    const orders = await this.pharmacyOrderRepository.findByPatientProfileId(profile._id);
    return orders.map((o) => this._formatOrder(o));
  }

  async getOrderById(id, requestedBy) {
    const order = await this.pharmacyOrderRepository.findById(id);
    if (!order || !order.isActive) throw new NotFoundError('Order not found');

    if (this._isPharmacyStaff(requestedBy)) return this._formatOrder(order);

    const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
    const patientId = order.patientProfileId?._id?.toString() || order.patientProfileId?.toString();
    if (!profile || profile._id.toString() !== patientId) {
      throw new ForbiddenError('You cannot view this order');
    }
    return this._formatOrder(order);
  }

  async _buildOrderItems(items) {
    const built = [];
    let subtotal = 0;

    for (const item of items) {
      const medicine = await this.medicineRepository.findById(item.medicineId);
      if (!medicine || !medicine.isActive) {
        throw new NotFoundError(`Medicine not found: ${item.medicineId}`);
      }

      const inventory = await this.pharmacyInventoryRepository.findByMedicineId(item.medicineId);
      const available = inventory ? inventory.quantity - inventory.reservedQuantity : 0;
      if (!inventory || available < item.quantity) {
        throw new BadRequestError(`Insufficient stock for ${medicine.name}`);
      }

      const unitPrice = item.unitPrice ?? inventory.sellingPrice ?? medicine.sellingPrice ?? 0;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      built.push({
        medicineId: medicine._id,
        medicineName: medicine.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        dosage: item.dosage,
        instructions: item.instructions,
      });
    }

    return { items: built, subtotal };
  }

  async createOrder(data, requestedBy) {
    const profile = await this._resolvePatientProfile(requestedBy.id);

    if (data.prescriptionId) {
      const prescription = await this.prescriptionRepository.findById(data.prescriptionId);
      if (!prescription || !prescription.isActive) throw new NotFoundError('Prescription not found');
      const consultation = prescription.consultationId;
      const appointment = consultation?.appointmentId;
      const patientId =
        appointment?.patientProfileId?._id?.toString() || appointment?.patientProfileId?.toString();
      if (!patientId || patientId !== profile._id.toString()) {
        throw new ForbiddenError('Prescription does not belong to you');
      }
    }

    if (data.prescriptionUploadId) {
      const upload = await this.prescriptionUploadRepository.findById(data.prescriptionUploadId);
      if (!upload || upload.patientProfileId?._id?.toString() !== profile._id.toString()) {
        throw new ForbiddenError('Prescription upload does not belong to you');
      }
      if (upload.status !== PrescriptionUploadStatus.APPROVED) {
        throw new BadRequestError('Prescription upload must be approved before ordering');
      }
    }

    const { items, subtotal } = await this._buildOrderItems(data.items);
    const deliveryFee = data.deliveryType === 'DELIVERY' ? (data.deliveryFee ?? 150) : 0;
    const total = subtotal + deliveryFee;

    for (const item of items) {
      const reserved = await this.pharmacyInventoryRepository.reserveQuantity(
        item.medicineId,
        item.quantity,
      );
      if (!reserved) throw new BadRequestError(`Could not reserve stock for ${item.medicineName}`);
    }

    const order = await this.pharmacyOrderRepository.create({
      orderNumber: this.pharmacyOrderRepository.generateOrderNumber(),
      patientProfileId: profile._id,
      prescriptionId: data.prescriptionId || null,
      prescriptionUploadId: data.prescriptionUploadId || null,
      placedByUserId: requestedBy.id,
      status: PharmacyOrderStatus.PENDING,
      items,
      subtotal,
      deliveryFee,
      total,
      currency: data.currency || 'PKR',
      deliveryType: data.deliveryType || 'PICKUP',
      deliveryAddress: data.deliveryAddress,
      notes: data.notes,
    });

    return this._formatOrder(order);
  }

  async createOrderFromPrescription(prescriptionId, data, requestedBy) {
    const prescription = await this.prescriptionRepository.findById(prescriptionId);
    if (!prescription || !prescription.isActive) throw new NotFoundError('Prescription not found');

    const items = [];
    for (const med of prescription.medicines || []) {
      const matches = await this.medicineRepository.findAll({
        page: 1,
        limit: 1,
        search: med.name,
        isActive: true,
      });
      const catalogMed = matches.medicines[0];
      if (!catalogMed) {
        throw new BadRequestError(`Medicine "${med.name}" is not available in catalog`);
      }
      items.push({
        medicineId: catalogMed._id.toString(),
        quantity: 1,
        dosage: med.dosage,
        instructions: med.instructions,
      });
    }

    return this.createOrder(
      {
        ...data,
        prescriptionId,
        items,
      },
      requestedBy,
    );
  }

  async updateOrderStatus(id, { status, notes }, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const order = await this.pharmacyOrderRepository.findById(id);
    if (!order || !order.isActive) throw new NotFoundError('Order not found');

    const validTransitions = {
      [PharmacyOrderStatus.PENDING]: [PharmacyOrderStatus.CONFIRMED, PharmacyOrderStatus.CANCELLED],
      [PharmacyOrderStatus.CONFIRMED]: [PharmacyOrderStatus.PREPARING, PharmacyOrderStatus.CANCELLED],
      [PharmacyOrderStatus.PREPARING]: [PharmacyOrderStatus.READY, PharmacyOrderStatus.CANCELLED],
      [PharmacyOrderStatus.READY]: [PharmacyOrderStatus.DELIVERED],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestError(`Cannot transition from ${order.status} to ${status}`);
    }

    if (status === PharmacyOrderStatus.CONFIRMED) {
      for (const item of order.items) {
        await this.pharmacyInventoryRepository.commitReservation(item.medicineId, item.quantity);
      }
    }

    if (status === PharmacyOrderStatus.CANCELLED && order.status === PharmacyOrderStatus.PENDING) {
      for (const item of order.items) {
        await this.pharmacyInventoryRepository.releaseReservation(item.medicineId, item.quantity);
      }
    }

    const updated = await this.pharmacyOrderRepository.updateById(id, {
      status,
      notes: notes || order.notes,
      fulfilledByUserId:
        status === PharmacyOrderStatus.DELIVERED ? requestedBy.id : order.fulfilledByUserId,
      cancelledAt: status === PharmacyOrderStatus.CANCELLED ? new Date() : order.cancelledAt,
    });

    return this._formatOrder(updated);
  }

  async cancelOrder(id, { cancellationReason }, requestedBy) {
    const order = await this.pharmacyOrderRepository.findById(id);
    if (!order || !order.isActive) throw new NotFoundError('Order not found');

    if (this._isPharmacyStaff(requestedBy)) {
      return this.updateOrderStatus(id, { status: PharmacyOrderStatus.CANCELLED, notes: cancellationReason }, requestedBy);
    }

    const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
    const patientId = order.patientProfileId?._id?.toString() || order.patientProfileId?.toString();
    if (!profile || profile._id.toString() !== patientId) {
      throw new ForbiddenError('You cannot cancel this order');
    }

    if (order.status !== PharmacyOrderStatus.PENDING) {
      throw new BadRequestError('Only pending orders can be cancelled');
    }

    for (const item of order.items) {
      await this.pharmacyInventoryRepository.releaseReservation(item.medicineId, item.quantity);
    }

    const updated = await this.pharmacyOrderRepository.updateById(id, {
      status: PharmacyOrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason,
    });
    return this._formatOrder(updated);
  }

  // --- Prescription uploads ---

  _pharmacyUploadRoot() {
    return path.resolve(process.cwd(), config.storage.pharmacyUploadDir);
  }

  _fileMetaFromUpload(file, patientProfileId) {
    const storagePath = path.join(String(patientProfileId), file.filename).replace(/\\/g, '/');
    return {
      fileName: file.filename,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath,
    };
  }

  async uploadPrescription(file, body, requestedBy) {
    const profile = await this._resolvePatientProfile(requestedBy.id);
    if (!file) throw new BadRequestError('File is required');

    const destDir = path.join(this._pharmacyUploadRoot(), String(profile._id));
    await fs.mkdir(destDir, { recursive: true });
    const pendingPath = path.join(this._pharmacyUploadRoot(), 'pending', file.filename);
    const finalPath = path.join(destDir, file.filename);
    try {
      await fs.rename(pendingPath, finalPath);
    } catch {
      // file may already be in correct location
    }

    const meta = this._fileMetaFromUpload(file, profile._id);
    const upload = await this.prescriptionUploadRepository.create({
      patientProfileId: profile._id,
      title: body.title || 'Prescription Upload',
      ...meta,
      uploadedByUserId: requestedBy.id,
      status: PrescriptionUploadStatus.PENDING,
    });

    return this._formatUpload(upload);
  }

  async getMyPrescriptionUploads(requestedBy) {
    const profile = await this._resolvePatientProfile(requestedBy.id);
    const uploads = await this.prescriptionUploadRepository.findByPatientProfileId(profile._id);
    return uploads.map((u) => this._formatUpload(u));
  }

  async getPrescriptionUploads(query, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const result = await this.prescriptionUploadRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      status: query.status,
      isActive: true,
    });
    return {
      uploads: result.uploads.map((u) => this._formatUpload(u)),
      pagination: result.pagination,
    };
  }

  async getPrescriptionUploadById(id, requestedBy) {
    const upload = await this.prescriptionUploadRepository.findById(id);
    if (!upload || !upload.isActive) throw new NotFoundError('Prescription upload not found');

    if (this._isPharmacyStaff(requestedBy)) return this._formatUpload(upload);

    const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
    const patientId = upload.patientProfileId?._id?.toString() || upload.patientProfileId?.toString();
    if (!profile || profile._id.toString() !== patientId) {
      throw new ForbiddenError('You cannot view this upload');
    }
    return this._formatUpload(upload);
  }

  async reviewPrescriptionUpload(id, { status, reviewNotes, prescriptionId }, requestedBy) {
    if (!this._isPharmacyStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    if (![PrescriptionUploadStatus.APPROVED, PrescriptionUploadStatus.REJECTED].includes(status)) {
      throw new BadRequestError('Invalid review status');
    }

    const upload = await this.prescriptionUploadRepository.findById(id);
    if (!upload || !upload.isActive) throw new NotFoundError('Prescription upload not found');
    if (upload.status !== PrescriptionUploadStatus.PENDING) {
      throw new BadRequestError('Upload has already been reviewed');
    }

    const updated = await this.prescriptionUploadRepository.updateById(id, {
      status,
      reviewNotes,
      prescriptionId: prescriptionId || upload.prescriptionId,
      reviewedByUserId: requestedBy.id,
      reviewedAt: new Date(),
    });

    const isApproved = status === PrescriptionUploadStatus.APPROVED;
    await this.auditService.log({
      action: isApproved ? AuditAction.APPROVE : AuditAction.REJECT,
      module: 'pharmacy',
      entityType: 'prescription-upload',
      entityId: id,
      entityLabel: upload.originalFileName,
      description: `Prescription upload ${status.toLowerCase()}`,
      requestedBy,
      metadata: { status, reviewNotes, previousStatus: upload.status },
    });

    return this._formatUpload(updated);
  }

  async downloadPrescriptionUpload(id, requestedBy) {
    const upload = await this.prescriptionUploadRepository.findById(id);
    if (!upload || !upload.isActive) throw new NotFoundError('Prescription upload not found');

    if (!this._isPharmacyStaff(requestedBy)) {
      const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
      const patientId = upload.patientProfileId?._id?.toString() || upload.patientProfileId?.toString();
      if (!profile || profile._id.toString() !== patientId) {
        throw new ForbiddenError('You cannot download this file');
      }
    }

    const absolute = path.join(this._pharmacyUploadRoot(), upload.storagePath);
    const buffer = await fs.readFile(absolute);
    return {
      buffer,
      mimeType: upload.mimeType,
      fileName: upload.originalFileName,
    };
  }
}

module.exports = PharmacyService;
