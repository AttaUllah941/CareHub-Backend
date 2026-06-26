const { NotFoundError } = require('../../core/errors/AppError');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const usersRepository = require('../users/users.repository');
const adminRepository = require('./admin.repository');

const USER_SORT_FIELDS = ['createdAt', 'firstName', 'lastName', 'email', 'role'];

const startOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const toUserResponse = (user) => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt?.toISOString(),
  updatedAt: user.updatedAt?.toISOString(),
});

const getDashboardStats = async () => {
  const [
    totalUsers,
    doctorsByVerificationStatus,
    appointmentsThisWeek,
    ordersToday,
    labBookingsPending,
  ] = await Promise.all([
    adminRepository.countUsers(),
    adminRepository.countDoctorsByVerificationStatus(),
    adminRepository.countAppointmentsByStatusSince(startOfWeek()),
    adminRepository.countOrdersByStatusSince(startOfToday()),
    adminRepository.countPendingLabBookings(),
  ]);

  return {
    totalUsers,
    doctorsByVerificationStatus,
    appointmentsThisWeek,
    ordersToday,
    labBookingsPending,
  };
};

const buildUserFilter = (query) => {
  const filter = {};

  if (query.role) {
    filter.role = query.role;
  }

  if (query.isActive === 'true') {
    filter.isActive = true;
  } else if (query.isActive === 'false') {
    filter.isActive = false;
  }

  if (query.search?.trim()) {
    const term = query.search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }];
  }

  return filter;
};

const listUsers = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, USER_SORT_FIELDS);
  const filter = buildUserFilter(query);

  const [users, total] = await Promise.all([
    usersRepository.findAll(filter, { skip, limit, sort }),
    usersRepository.count(filter),
  ]);

  return {
    users: users.map(toUserResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const updateUserStatus = async (id, isActive) => {
  if (!usersRepository.isValidObjectId(id)) {
    throw new NotFoundError('User not found');
  }

  const user = await usersRepository.updateById(id, { isActive });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return { user: toUserResponse(user) };
};

module.exports = {
  getDashboardStats,
  listUsers,
  updateUserStatus,
};
