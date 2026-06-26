const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('../../core/errors/AppError');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { slugify } = require('../../shared/utils/slugify');
const { generateOrderRef } = require('../../shared/utils/orderRef.util');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const pharmaciesRepository = require('./pharmacies.repository');
const medicineRepository = require('./medicine.repository');
const medicineOrdersRepository = require('./medicine-orders.repository');
const { STATUS_TRANSITIONS } = require('./medicine-orders.model');

const MEDICINE_SORT_FIELDS = ['name', 'price', 'createdAt'];
const PHARMACY_SORT_FIELDS = ['name', 'createdAt'];
const ORDER_SORT_FIELDS = ['createdAt', 'status', 'totalAmount'];

const toPharmacyResponse = (pharmacy) => ({
  id: pharmacy._id.toString(),
  name: pharmacy.name,
  slug: pharmacy.slug,
  city: pharmacy.city,
  citySlug: pharmacy.citySlug,
  address: pharmacy.address,
  isActive: pharmacy.isActive,
  createdAt: pharmacy.createdAt?.toISOString(),
  updatedAt: pharmacy.updatedAt?.toISOString(),
});

const toMedicineResponse = (medicine) => ({
  id: medicine._id.toString(),
  pharmacyId: medicine.pharmacyId?._id?.toString() || medicine.pharmacyId?.toString(),
  name: medicine.name,
  description: medicine.description,
  manufacturer: medicine.manufacturer,
  price: medicine.price,
  currency: medicine.currency,
  requiresPrescription: medicine.requiresPrescription,
  stock: medicine.stock,
  isActive: medicine.isActive,
  pharmacy: medicine.pharmacyId?.name
    ? {
        id: medicine.pharmacyId._id.toString(),
        name: medicine.pharmacyId.name,
        slug: medicine.pharmacyId.slug,
        city: medicine.pharmacyId.city,
        citySlug: medicine.pharmacyId.citySlug,
        address: medicine.pharmacyId.address,
      }
    : undefined,
  createdAt: medicine.createdAt?.toISOString(),
  updatedAt: medicine.updatedAt?.toISOString(),
});

const toOrderItemResponse = (item) => ({
  medicineId: item.medicineId?._id?.toString() || item.medicineId?.toString(),
  pharmacyId: item.pharmacyId?._id?.toString() || item.pharmacyId?.toString(),
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  medicine: item.medicineId?.name
    ? {
        id: item.medicineId._id.toString(),
        name: item.medicineId.name,
        manufacturer: item.medicineId.manufacturer,
        requiresPrescription: item.medicineId.requiresPrescription,
      }
    : undefined,
  pharmacy: item.pharmacyId?.name
    ? {
        id: item.pharmacyId._id.toString(),
        name: item.pharmacyId.name,
        slug: item.pharmacyId.slug,
        city: item.pharmacyId.city,
      }
    : undefined,
});

const toOrderResponse = (order) => ({
  id: order._id.toString(),
  orderRef: order.orderRef,
  userId: order.userId?._id?.toString() || order.userId?.toString() || null,
  items: order.items.map(toOrderItemResponse),
  deliveryType: order.deliveryType,
  address: order.address,
  paymentMethod: order.paymentMethod,
  couponCode: order.couponCode || '',
  prescriptionUrls: order.prescriptionUrls,
  status: order.status,
  totalAmount: order.totalAmount,
  currency: order.currency,
  createdAt: order.createdAt?.toISOString(),
  updatedAt: order.updatedAt?.toISOString(),
});

const resolveSlugs = ({ name, city, slug, citySlug }) => {
  const resolvedCitySlug = citySlug || slugify(city);
  const resolvedSlug = slug || slugify(name);

  if (!resolvedCitySlug) {
    throw new BadRequestError('City is required to generate citySlug');
  }

  if (!resolvedSlug) {
    throw new BadRequestError('Name is required to generate slug');
  }

  return { slug: resolvedSlug, citySlug: resolvedCitySlug };
};

const buildMedicineSearchFilter = (query) => {
  const filter = {};

  if (query.search?.trim()) {
    const term = query.search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { description: regex }, { manufacturer: regex }];
  }

  if (query.pharmacyId) {
    if (!medicineRepository.isValidObjectId(query.pharmacyId)) {
      throw new BadRequestError('Invalid pharmacyId');
    }
    filter.pharmacyId = query.pharmacyId;
  }

  if (query.requiresPrescription === 'true') {
    filter.requiresPrescription = true;
  } else if (query.requiresPrescription === 'false') {
    filter.requiresPrescription = false;
  }

  return filter;
};

const getPharmacyAdminOrThrow = async (id) => {
  if (!pharmaciesRepository.isValidObjectId(id)) {
    throw new NotFoundError('Pharmacy not found');
  }

  const pharmacy = await pharmaciesRepository.findByIdAdmin(id);
  if (!pharmacy) {
    throw new NotFoundError('Pharmacy not found');
  }

  return pharmacy;
};

const isAdmin = (user) =>
  user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

// --- Public medicines ---

const listPublicMedicines = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, MEDICINE_SORT_FIELDS);
  const filter = buildMedicineSearchFilter(query);

  const [medicines, total] = await Promise.all([
    medicineRepository.findPublic(filter, { skip, limit, sort }),
    medicineRepository.countPublic(filter),
  ]);

  return {
    medicines: medicines.map(toMedicineResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getPublicMedicineDetail = async (id) => {
  if (!medicineRepository.isValidObjectId(id)) {
    throw new NotFoundError('Medicine not found');
  }

  const medicine = await medicineRepository.findById(id);
  if (!medicine) {
    throw new NotFoundError('Medicine not found');
  }

  return { medicine: toMedicineResponse(medicine) };
};

// --- Admin pharmacies ---

const createPharmacy = async (payload) => {
  const slugs = resolveSlugs(payload);

  try {
    const pharmacy = await pharmaciesRepository.create({
      name: payload.name,
      city: payload.city,
      address: payload.address,
      ...slugs,
      isActive: payload.isActive ?? true,
    });

    return { pharmacy: toPharmacyResponse(pharmacy) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A pharmacy with this slug already exists in the selected city');
    }
    throw error;
  }
};

const updatePharmacy = async (id, payload) => {
  const existing = await getPharmacyAdminOrThrow(id);
  const updateData = {};

  if (payload.name != null) updateData.name = payload.name;
  if (payload.city != null) updateData.city = payload.city;
  if (payload.address != null) updateData.address = payload.address;
  if (payload.isActive != null) updateData.isActive = payload.isActive;

  if (payload.name != null || payload.city != null || payload.slug != null || payload.citySlug != null) {
    Object.assign(
      updateData,
      resolveSlugs({
        name: payload.name ?? existing.name,
        city: payload.city ?? existing.city,
        slug: payload.slug,
        citySlug: payload.citySlug,
      }),
    );
  }

  try {
    const pharmacy = await pharmaciesRepository.updateById(id, updateData);
    return { pharmacy: toPharmacyResponse(pharmacy) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A pharmacy with this slug already exists in the selected city');
    }
    throw error;
  }
};

const deletePharmacy = async (id) => {
  await getPharmacyAdminOrThrow(id);
  const pharmacy = await pharmaciesRepository.softDeleteById(id);
  return { pharmacy: toPharmacyResponse(pharmacy) };
};

// --- Admin medicines ---

const createMedicine = async (pharmacyId, payload) => {
  await getPharmacyAdminOrThrow(pharmacyId);

  const medicine = await medicineRepository.create({
    pharmacyId,
    name: payload.name,
    description: payload.description ?? '',
    manufacturer: payload.manufacturer,
    price: payload.price,
    currency: payload.currency ?? 'PKR',
    requiresPrescription: payload.requiresPrescription ?? false,
    stock: payload.stock ?? 0,
    isActive: payload.isActive ?? true,
  });

  return { medicine: toMedicineResponse(medicine) };
};

const updateMedicine = async (pharmacyId, medicineId, payload) => {
  await getPharmacyAdminOrThrow(pharmacyId);

  if (!medicineRepository.isValidObjectId(medicineId)) {
    throw new NotFoundError('Medicine not found');
  }

  const existing = await medicineRepository.findByIdAndPharmacy(medicineId, pharmacyId, {
    includeInactive: true,
  });
  if (!existing) {
    throw new NotFoundError('Medicine not found');
  }

  const updateData = {};
  if (payload.name != null) updateData.name = payload.name;
  if (payload.description != null) updateData.description = payload.description;
  if (payload.manufacturer != null) updateData.manufacturer = payload.manufacturer;
  if (payload.price != null) updateData.price = payload.price;
  if (payload.currency != null) updateData.currency = payload.currency;
  if (payload.requiresPrescription != null) {
    updateData.requiresPrescription = payload.requiresPrescription;
  }
  if (payload.stock != null) updateData.stock = payload.stock;
  if (payload.isActive != null) updateData.isActive = payload.isActive;

  const medicine = await medicineRepository.updateById(medicineId, updateData);
  return { medicine: toMedicineResponse(medicine) };
};

const deleteMedicine = async (pharmacyId, medicineId) => {
  await getPharmacyAdminOrThrow(pharmacyId);

  if (!medicineRepository.isValidObjectId(medicineId)) {
    throw new NotFoundError('Medicine not found');
  }

  const existing = await medicineRepository.findByIdAndPharmacy(medicineId, pharmacyId, {
    includeInactive: true,
  });
  if (!existing) {
    throw new NotFoundError('Medicine not found');
  }

  const medicine = await medicineRepository.softDeleteById(medicineId);
  return { medicine: toMedicineResponse(medicine) };
};

// --- Orders ---

const buildOrderItems = async (itemsInput) => {
  if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
    throw new BadRequestError('At least one order item is required');
  }

  const medicineIds = itemsInput.map((item) => item.medicineId);
  const medicines = await medicineRepository.findActiveByIds(medicineIds);

  const medicineMap = new Map(medicines.map((medicine) => [medicine._id.toString(), medicine]));

  const orderItems = [];
  let requiresPrescription = false;
  let totalAmount = 0;
  let currency = 'PKR';

  for (const item of itemsInput) {
    const medicine = medicineMap.get(item.medicineId);
    if (!medicine) {
      throw new BadRequestError('One or more medicines are invalid or inactive');
    }

    if (medicine.pharmacyId.toString() !== item.pharmacyId) {
      throw new BadRequestError(
        `Medicine ${medicine.name} does not belong to the specified pharmacy`,
      );
    }

    if (item.quantity < 1) {
      throw new BadRequestError('Item quantity must be at least 1');
    }

    if (medicine.stock < item.quantity) {
      throw new BadRequestError(`Insufficient stock for ${medicine.name}`);
    }

    if (item.unitPrice !== medicine.price) {
      throw new BadRequestError(`Price mismatch for ${medicine.name}. Please refresh and try again`);
    }

    if (medicine.requiresPrescription) {
      requiresPrescription = true;
    }

    orderItems.push({
      medicineId: medicine._id,
      pharmacyId: medicine.pharmacyId,
      quantity: item.quantity,
      unitPrice: medicine.price,
    });

    totalAmount += medicine.price * item.quantity;
    currency = medicine.currency || currency;
  }

  return { orderItems, requiresPrescription, totalAmount, currency };
};

const createOrder = async (payload, user) => {
  const { orderItems, requiresPrescription, totalAmount, currency } = await buildOrderItems(
    payload.items,
  );

  const prescriptionUrls = payload.prescriptionUrls ?? [];

  if (requiresPrescription && prescriptionUrls.length === 0) {
    throw new BadRequestError(
      'At least one prescription URL is required for prescription medicines',
    );
  }

  if (!requiresPrescription && prescriptionUrls.length > 0) {
    // Allow extra prescriptions but not required
  }

  const userId = user?.role === UserRole.PATIENT ? user.id : null;
  const orderRef = generateOrderRef();

  const reservedItems = [];

  try {
    for (const item of orderItems) {
      const updated = await medicineRepository.decrementStock(item.medicineId, item.quantity);
      if (!updated) {
        throw new BadRequestError('Insufficient stock for one or more items');
      }
      reservedItems.push(item);
    }

    const order = await medicineOrdersRepository.create({
      orderRef,
      userId,
      items: orderItems,
      deliveryType: payload.deliveryType,
      address: payload.address,
      paymentMethod: payload.paymentMethod,
      couponCode: payload.couponCode ?? '',
      prescriptionUrls,
      status: 'placed',
      totalAmount,
      currency,
    });

    const populated = await medicineOrdersRepository.findById(order._id);
    return { order: toOrderResponse(populated) };
  } catch (error) {
    await Promise.all(
      reservedItems.map((item) =>
        medicineRepository.incrementStock(item.medicineId, item.quantity),
      ),
    );

    if (error.code === 11000) {
      throw new ConflictError('Order reference conflict. Please try again');
    }
    throw error;
  }
};

const listMyOrders = async (user, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, ORDER_SORT_FIELDS);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const [orders, total] = await Promise.all([
    medicineOrdersRepository.findByUser(user.id, filter, { skip, limit, sort }),
    medicineOrdersRepository.countByUser(user.id, filter),
  ]);

  return {
    orders: orders.map(toOrderResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getOrderById = async (id, user) => {
  if (!medicineOrdersRepository.isValidObjectId(id)) {
    throw new NotFoundError('Order not found');
  }

  const order = await medicineOrdersRepository.findById(id);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const ownerId = order.userId?._id?.toString() || order.userId?.toString();
  if (!isAdmin(user) && (!ownerId || ownerId !== user.id)) {
    throw new ForbiddenError('You do not have permission to view this order');
  }

  return { order: toOrderResponse(order) };
};

const updateOrderStatus = async (id, nextStatus) => {
  if (!medicineOrdersRepository.isValidObjectId(id)) {
    throw new NotFoundError('Order not found');
  }

  const order = await medicineOrdersRepository.findById(id);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const allowed = STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new BadRequestError(
      `Cannot transition order from "${order.status}" to "${nextStatus}"`,
    );
  }

  const updated = await medicineOrdersRepository.updateById(id, { status: nextStatus });
  return { order: toOrderResponse(updated) };
};

module.exports = {
  listPublicMedicines,
  getPublicMedicineDetail,
  createPharmacy,
  updatePharmacy,
  deletePharmacy,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  createOrder,
  listMyOrders,
  getOrderById,
  updateOrderStatus,
};
