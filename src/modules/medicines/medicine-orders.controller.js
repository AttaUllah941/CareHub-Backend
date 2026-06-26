const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const medicinesService = require('./medicines.service');

const create = asyncHandler(async (req, res) => {
  const data = await medicinesService.createOrder(req.body, req.user);
  successResponse(res, data, 'Order placed', HttpStatus.CREATED);
});

const listMine = asyncHandler(async (req, res) => {
  const data = await medicinesService.listMyOrders(req.user, req.query);
  successResponse(res, data, 'Orders retrieved');
});

const getById = asyncHandler(async (req, res) => {
  const data = await medicinesService.getOrderById(req.params.id, req.user);
  successResponse(res, data, 'Order retrieved');
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await medicinesService.updateOrderStatus(req.params.id, req.body.status);
  successResponse(res, data, 'Order status updated');
});

module.exports = {
  create,
  listMine,
  getById,
  updateStatus,
};
