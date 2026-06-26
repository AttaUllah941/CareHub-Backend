const { z } = require('zod');
const { objectIdSchema } = require('../../shared/utils/zodSchemas');

const appointmentIdParamsSchema = z.object({
  id: objectIdSchema('appointment id'),
});

module.exports = {
  appointmentIdParamsSchema,
};
