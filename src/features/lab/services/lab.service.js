const path = require('path');
const fs = require('fs/promises');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { LabBookingStatus } = require('../../../shared/enums/labBookingStatus.enum');
const { LabCollectionType } = require('../../../shared/enums/labCollectionType.enum');
const { LabReportStatus } = require('../../../shared/enums/labReportStatus.enum');
const { AuditAction } = require('../../../shared/enums/auditAction.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');
const config = require('../../../config');

class LabService {
  constructor(
    labRepository,
    labTestRepository,
    labBookingRepository,
    labReportRepository,
    patientProfileRepository,
    auditService,
  ) {
    this.labRepository = labRepository;
    this.labTestRepository = labTestRepository;
    this.labBookingRepository = labBookingRepository;
    this.labReportRepository = labReportRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.auditService = auditService;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _isLabStaff(requestedBy) {
    return requestedBy && [UserRole.LAB, UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _formatLab(lab) {
    return lab.toJSON ? lab.toJSON() : lab;
  }

  _formatTest(test) {
    const json = test.toJSON ? test.toJSON() : test;
    const lab = json.labId;
    return {
      ...json,
      labId: lab?.id || lab?._id?.toString() || json.labId?.toString(),
      lab: lab && typeof lab === 'object' ? this._formatLab(lab) : undefined,
    };
  }

  _formatBooking(booking) {
    const json = booking.toJSON ? booking.toJSON() : booking;
    const patient = json.patientProfileId;
    const lab = json.labId;
    return {
      ...json,
      patientProfileId:
        patient?.id || patient?._id?.toString() || json.patientProfileId?.toString(),
      labId: lab?.id || lab?._id?.toString() || json.labId?.toString(),
      patient:
        patient && typeof patient === 'object'
          ? { id: patient.id || patient._id?.toString(), user: patient.userId }
          : undefined,
      lab: lab && typeof lab === 'object' ? this._formatLab(lab) : undefined,
    };
  }

  _formatReport(report) {
    const json = report.toJSON ? report.toJSON() : report;
    const patient = json.patientProfileId;
    return {
      ...json,
      patientProfileId:
        patient?.id || patient?._id?.toString() || json.patientProfileId?.toString(),
      labId: json.labId?.id || json.labId?._id?.toString() || json.labId?.toString(),
      labBookingId:
        json.labBookingId?.id || json.labBookingId?._id?.toString() || json.labBookingId?.toString() || null,
      patient:
        patient && typeof patient === 'object'
          ? { id: patient.id || patient._id?.toString(), user: patient.userId }
          : undefined,
    };
  }

  async _resolvePatientProfile(userId) {
    const profile = await this.patientProfileRepository.findByUserId(userId);
    if (!profile) throw new ForbiddenError('Patient profile required');
    return profile;
  }

  // --- Labs ---

  async getLabs(query, requestedBy) {
    const isActive = query.isActive !== undefined ? query.isActive === 'true' : true;
    const result = await this.labRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      city: query.city,
      homeCollectionAvailable:
        query.homeCollectionAvailable !== undefined
          ? query.homeCollectionAvailable === 'true'
          : undefined,
      isActive: this._isLabStaff(requestedBy) ? isActive : true,
      sortBy: query.sortBy || 'name',
      sortOrder: query.sortOrder || 'asc',
    });
    return {
      labs: result.labs.map((l) => this._formatLab(l)),
      pagination: result.pagination,
    };
  }

  async getLabById(id) {
    const lab = await this.labRepository.findById(id);
    if (!lab || !lab.isActive) throw new NotFoundError('Lab not found');
    return this._formatLab(lab);
  }

  async createLab(data, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const lab = await this.labRepository.create(data);
    return this._formatLab(lab);
  }

  async updateLab(id, data, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const lab = await this.labRepository.findById(id);
    if (!lab) throw new NotFoundError('Lab not found');
    const updated = await this.labRepository.updateById(id, data);
    return this._formatLab(updated);
  }

  async deleteLab(id, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Only admins can delete labs');
    const lab = await this.labRepository.findById(id);
    if (!lab) throw new NotFoundError('Lab not found');
    await this.labRepository.softDeleteById(id);
    return { message: 'Lab deactivated successfully' };
  }

  // --- Lab Tests ---

  async getTests(query, requestedBy) {
    const isActive = query.isActive !== undefined ? query.isActive === 'true' : true;
    const result = await this.labTestRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      labId: query.labId,
      category: query.category,
      homeCollectionAvailable:
        query.homeCollectionAvailable !== undefined
          ? query.homeCollectionAvailable === 'true'
          : undefined,
      isActive: this._isLabStaff(requestedBy) ? isActive : true,
      sortBy: query.sortBy || 'name',
      sortOrder: query.sortOrder || 'asc',
    });
    return {
      tests: result.tests.map((t) => this._formatTest(t)),
      pagination: result.pagination,
    };
  }

  async getTestById(id) {
    const test = await this.labTestRepository.findById(id);
    if (!test || !test.isActive) throw new NotFoundError('Lab test not found');
    return this._formatTest(test);
  }

  async createTest(data, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const lab = await this.labRepository.findById(data.labId);
    if (!lab || !lab.isActive) throw new NotFoundError('Lab not found');
    const test = await this.labTestRepository.create(data);
    return this._formatTest(test);
  }

  async updateTest(id, data, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const test = await this.labTestRepository.findById(id);
    if (!test) throw new NotFoundError('Lab test not found');
    const updated = await this.labTestRepository.updateById(id, data);
    return this._formatTest(updated);
  }

  async deleteTest(id, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const test = await this.labTestRepository.findById(id);
    if (!test) throw new NotFoundError('Lab test not found');
    await this.labTestRepository.softDeleteById(id);
    return { message: 'Lab test deactivated successfully' };
  }

  // --- Bookings (incl. home collection) ---

  async getBookings(query, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const result = await this.labBookingRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      status: query.status,
      labId: query.labId,
      collectionType: query.collectionType,
      isActive: true,
    });
    return {
      bookings: result.bookings.map((b) => this._formatBooking(b)),
      pagination: result.pagination,
    };
  }

  async getMyBookings(requestedBy) {
    const profile = await this._resolvePatientProfile(requestedBy.id);
    const bookings = await this.labBookingRepository.findByPatientProfileId(profile._id);
    return bookings.map((b) => this._formatBooking(b));
  }

  async getBookingById(id, requestedBy) {
    const booking = await this.labBookingRepository.findById(id);
    if (!booking || !booking.isActive) throw new NotFoundError('Booking not found');

    if (this._isLabStaff(requestedBy)) return this._formatBooking(booking);

    const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
    const patientId = booking.patientProfileId?._id?.toString() || booking.patientProfileId?.toString();
    if (!profile || profile._id.toString() !== patientId) {
      throw new ForbiddenError('You cannot view this booking');
    }
    return this._formatBooking(booking);
  }

  async _buildBookingItems(testIds) {
    const tests = await this.labTestRepository.findByIds(testIds);
    if (tests.length !== testIds.length) throw new NotFoundError('One or more tests not found');

    const labIds = [...new Set(tests.map((t) => t.labId?._id?.toString() || t.labId?.toString()))];
    if (labIds.length !== 1) {
      throw new BadRequestError('All tests must belong to the same lab');
    }

    let subtotal = 0;
    const items = tests.map((test) => {
      const price = test.price;
      const lineTotal = price;
      subtotal += lineTotal;
      return {
        labTestId: test._id,
        testName: test.name,
        testCode: test.code,
        price,
        quantity: 1,
        lineTotal,
      };
    });

    return { items, subtotal, labId: labIds[0], tests };
  }

  async createBooking(data, requestedBy) {
    const profile = await this._resolvePatientProfile(requestedBy.id);
    const testIds = (data.items || []).map((i) => (typeof i === 'string' ? i : i.labTestId));
    if (!testIds.length) throw new BadRequestError('At least one test is required');

    const { items, subtotal, labId, tests } = await this._buildBookingItems(testIds);
    const lab = await this.labRepository.findById(labId);
    if (!lab || !lab.isActive) throw new NotFoundError('Lab not found');

    const collectionType = data.collectionType || LabCollectionType.LAB_VISIT;
    if (collectionType === LabCollectionType.HOME_COLLECTION) {
      if (!lab.homeCollectionAvailable) {
        throw new BadRequestError('This lab does not offer home collection');
      }
      const unavailable = tests.find((t) => !t.homeCollectionAvailable);
      if (unavailable) {
        throw new BadRequestError(`Test "${unavailable.name}" is not available for home collection`);
      }
      if (!data.homeAddress?.trim()) {
        throw new BadRequestError('Home address is required for home collection');
      }
    }

    const collectionFee =
      collectionType === LabCollectionType.HOME_COLLECTION ? (lab.homeCollectionFee || 0) : 0;
    const total = subtotal + collectionFee;

    const booking = await this.labBookingRepository.create({
      bookingNumber: this.labBookingRepository.generateBookingNumber(),
      patientProfileId: profile._id,
      labId,
      placedByUserId: requestedBy.id,
      status: LabBookingStatus.PENDING,
      collectionType,
      items,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      scheduledTimeSlot: data.scheduledTimeSlot,
      homeAddress: data.homeAddress,
      homeCity: data.homeCity,
      homePhone: data.homePhone,
      collectionNotes: data.collectionNotes,
      subtotal,
      collectionFee,
      total,
      currency: data.currency || 'PKR',
      notes: data.notes,
    });

    return this._formatBooking(booking);
  }

  async updateBookingStatus(id, { status, notes }, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const booking = await this.labBookingRepository.findById(id);
    if (!booking || !booking.isActive) throw new NotFoundError('Booking not found');

    const validTransitions = {
      [LabBookingStatus.PENDING]: [LabBookingStatus.CONFIRMED, LabBookingStatus.CANCELLED],
      [LabBookingStatus.CONFIRMED]: [
        LabBookingStatus.SAMPLE_COLLECTED,
        LabBookingStatus.CANCELLED,
      ],
      [LabBookingStatus.SAMPLE_COLLECTED]: [LabBookingStatus.PROCESSING],
      [LabBookingStatus.PROCESSING]: [LabBookingStatus.COMPLETED],
    };

    const allowed = validTransitions[booking.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestError(`Cannot transition from ${booking.status} to ${status}`);
    }

    const updated = await this.labBookingRepository.updateById(id, {
      status,
      notes: notes || booking.notes,
      fulfilledByUserId:
        status === LabBookingStatus.COMPLETED ? requestedBy.id : booking.fulfilledByUserId,
      cancelledAt: status === LabBookingStatus.CANCELLED ? new Date() : booking.cancelledAt,
    });

    const approvalStatuses = [LabBookingStatus.CONFIRMED, LabBookingStatus.COMPLETED];
    const action = approvalStatuses.includes(status)
      ? AuditAction.APPROVE
      : status === LabBookingStatus.CANCELLED
        ? AuditAction.REJECT
        : AuditAction.UPDATE;

    await this.auditService.log({
      action,
      module: 'lab',
      entityType: 'booking',
      entityId: id,
      entityLabel: booking.bookingNumber || id,
      description: `Lab booking status changed to ${status}`,
      requestedBy,
      metadata: { previousStatus: booking.status, newStatus: status, notes },
    });

    return this._formatBooking(updated);
  }

  async cancelBooking(id, { cancellationReason }, requestedBy) {
    const booking = await this.labBookingRepository.findById(id);
    if (!booking || !booking.isActive) throw new NotFoundError('Booking not found');

    if (this._isLabStaff(requestedBy)) {
      return this.updateBookingStatus(
        id,
        { status: LabBookingStatus.CANCELLED, notes: cancellationReason },
        requestedBy,
      );
    }

    const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
    const patientId = booking.patientProfileId?._id?.toString() || booking.patientProfileId?.toString();
    if (!profile || profile._id.toString() !== patientId) {
      throw new ForbiddenError('You cannot cancel this booking');
    }

    if (![LabBookingStatus.PENDING, LabBookingStatus.CONFIRMED].includes(booking.status)) {
      throw new BadRequestError('This booking can no longer be cancelled');
    }

    const updated = await this.labBookingRepository.updateById(id, {
      status: LabBookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason,
    });
    return this._formatBooking(updated);
  }

  // --- Reports ---

  _labReportUploadRoot() {
    return path.resolve(process.cwd(), config.storage.labReportUploadDir);
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

  async uploadReport(file, body, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Only lab staff can upload reports');
    if (!file) throw new BadRequestError('File is required');
    if (!body.patientProfileId || !body.labId) {
      throw new BadRequestError('patientProfileId and labId are required');
    }

    const destDir = path.join(this._labReportUploadRoot(), String(body.patientProfileId));
    await fs.mkdir(destDir, { recursive: true });
    const pendingPath = path.join(this._labReportUploadRoot(), 'pending', file.filename);
    const finalPath = path.join(destDir, file.filename);
    try {
      await fs.rename(pendingPath, finalPath);
    } catch {
      // file may already be in place
    }

    const meta = this._fileMetaFromUpload(file, body.patientProfileId);
    const report = await this.labReportRepository.create({
      patientProfileId: body.patientProfileId,
      labId: body.labId,
      labBookingId: body.labBookingId || null,
      title: body.title || 'Lab Report',
      ...meta,
      notes: body.notes,
      uploadedByUserId: requestedBy.id,
      status: LabReportStatus.AVAILABLE,
    });

    if (body.labBookingId) {
      const booking = await this.labBookingRepository.findById(body.labBookingId);
      if (booking && booking.status === LabBookingStatus.PROCESSING) {
        await this.labBookingRepository.updateById(body.labBookingId, {
          status: LabBookingStatus.COMPLETED,
          fulfilledByUserId: requestedBy.id,
        });
      }
    }

    return this._formatReport(report);
  }

  async getMyReports(requestedBy) {
    const profile = await this._resolvePatientProfile(requestedBy.id);
    const reports = await this.labReportRepository.findByPatientProfileId(profile._id);
    return reports.map((r) => this._formatReport(r));
  }

  async getReports(query, requestedBy) {
    if (!this._isLabStaff(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const result = await this.labReportRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      status: query.status,
      labId: query.labId,
      isActive: true,
    });
    return {
      reports: result.reports.map((r) => this._formatReport(r)),
      pagination: result.pagination,
    };
  }

  async getReportById(id, requestedBy) {
    const report = await this.labReportRepository.findById(id);
    if (!report || !report.isActive) throw new NotFoundError('Report not found');

    if (this._isLabStaff(requestedBy)) return this._formatReport(report);

    const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
    const patientId = report.patientProfileId?._id?.toString() || report.patientProfileId?.toString();
    if (!profile || profile._id.toString() !== patientId) {
      throw new ForbiddenError('You cannot view this report');
    }
    return this._formatReport(report);
  }

  async downloadReport(id, requestedBy) {
    const report = await this.labReportRepository.findById(id);
    if (!report || !report.isActive) throw new NotFoundError('Report not found');

    if (!this._isLabStaff(requestedBy)) {
      const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
      const patientId = report.patientProfileId?._id?.toString() || report.patientProfileId?.toString();
      if (!profile || profile._id.toString() !== patientId) {
        throw new ForbiddenError('You cannot download this report');
      }
    }

    const absolute = path.join(this._labReportUploadRoot(), report.storagePath);
    const buffer = await fs.readFile(absolute);
    return {
      buffer,
      mimeType: report.mimeType,
      fileName: report.originalFileName,
    };
  }
}

module.exports = LabService;
