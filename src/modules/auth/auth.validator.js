const { z } = require('zod');
const { phoneSchema } = require('../../shared/utils/zodSchemas');
const { PUBLIC_REGISTRATION_ROLES } = require('../../shared/enums/userRole.enum');

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: z.enum(PUBLIC_REGISTRATION_ROLES),
  phone: phoneSchema.optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8).max(128),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  changePasswordSchema,
};
