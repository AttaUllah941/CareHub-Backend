const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

/**
 * User Controller — HTTP layer for user management CRUD endpoints.
 */
class UserController {
  /**
   * @param {import('../services/user.service')} userService
   */
  constructor(userService) {
    this.userService = userService;
  }

  getUsers = asyncHandler(async (req, res) => {
    const result = await this.userService.getUsers(req.query, req.user);

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  });

  getUserById = asyncHandler(async (req, res) => {
    const user = await this.userService.getUserById(req.params.id, req.user);

    res.status(HttpStatus.OK).json({
      success: true,
      data: { user },
    });
  });

  createUser = asyncHandler(async (req, res) => {
    const user = await this.userService.createUser(req.body, req.user);

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'User created successfully',
      data: { user },
    });
  });

  updateUser = asyncHandler(async (req, res) => {
    const user = await this.userService.updateUser(req.params.id, req.body, req.user);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  });

  deleteUser = asyncHandler(async (req, res) => {
    const result = await this.userService.deleteUser(req.params.id, req.user);

    res.status(HttpStatus.OK).json({
      success: true,
      message: result.message,
    });
  });
}

module.exports = UserController;
