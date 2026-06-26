const { Router } = require('express');
const doctorApplicationsController = require('./doctor-applications.controller');
const { createApplicationSchema } = require('./doctor-applications.validator');
const { validate } = require('../../shared/middleware/validate.middleware');

const router = Router();

router.post('/', validate(createApplicationSchema), doctorApplicationsController.create);

module.exports = router;
