jest.mock('../../users/users.repository');
jest.mock('../../doctor-applications/doctor-applications.repository');
jest.mock('../auth.repository');
jest.mock('../../../shared/services/eventNotifications.service', () => ({
  sendRegistrationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock('../../../jobs/processors/email.processor', () => ({ isSmtpConfigured: () => false }));
jest.mock('../../../core/middleware/auth.middleware', () => ({ invalidateAuthCache: jest.fn() }));

const usersRepository = require('../../users/users.repository');
const { generateTokens } = require('../../../core/utils/token.utils');
const authService = require('../auth.service');

const user = (tokenVersion = 0, extra = {}) => ({
  _id: { toString: () => 'u1' },
  firstName: 'A',
  lastName: 'B',
  email: 'a@b.c',
  role: 'PATIENT',
  isActive: true,
  tokenVersion,
  ...extra,
});

describe('session revocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refreshes with a current token and carries the version forward', async () => {
    usersRepository.findById.mockResolvedValue(user(2));
    const { refreshToken } = generateTokens('u1', 'PATIENT', 2);

    const result = await authService.refreshSession(refreshToken);
    expect(result.accessToken).toBeTruthy();
  });

  it('rejects a refresh token issued before logout', async () => {
    usersRepository.findById.mockResolvedValue(user(3));
    const { refreshToken } = generateTokens('u1', 'PATIENT', 2);

    await expect(authService.refreshSession(refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('accepts legacy tokens without a version while the user is at version 0', async () => {
    usersRepository.findById.mockResolvedValue(user(0, { tokenVersion: undefined }));
    const { refreshToken } = generateTokens('u1', 'PATIENT');

    await expect(authService.refreshSession(refreshToken)).resolves.toBeTruthy();
  });

  it('logout bumps the token version', async () => {
    await authService.logout('u1');
    expect(usersRepository.updateById).toHaveBeenCalledWith('u1', { $inc: { tokenVersion: 1 } });
  });

  it('blocks public doctor registration', async () => {
    await expect(
      authService.register({
        firstName: 'A', lastName: 'B', email: 'd@x.com', password: 'password1', role: 'DOCTOR',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
