const { Router } = require('express');
const { successResponse } = require('../core/utils/apiResponse');

const router = Router();

/**
 * API root — confirms the service is reachable under /api/v1.
 * Module routers will be mounted here as they are implemented.
 */
router.get('/', (_req, res) => {
  successResponse(res, {
    name: 'CareHub API',
    version: '1.0.0',
    status: 'ready',
    modules: {
      implemented: [],
      planned: [
        'auth',
        'users',
        'specialties',
        'languages',
        'doctors',
        'appointments',
        'hospitals',
        'labs',
        'surgeries',
        'medicines',
        'reviews',
        'admin',
        'uploads',
      ],
    },
  }, 'CareHub API is ready');
});

// Mount module routes below as they are built, e.g.:
// const authRoutes = require('../modules/auth/auth.routes');
// router.use('/auth', authRoutes);

module.exports = router;
