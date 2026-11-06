jest.mock('../../../modules/users/users.model', () => ({
  User: { findById: jest.fn() },
}));

const { User } = require('../../../modules/users/users.model');
const { generateTokens } = require('../../utils/token.utils');
const { authenticate, authorize, invalidateAuthCache } = require('../auth.middleware');

const mockActive = (isActive) =>
  User.findById.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(isActive === null ? null : { isActive }) }),
  });

const run = async (headers) => {
  const req = { headers };
  const next = jest.fn();
  await authenticate(req, {}, next);
  return { req, next };
};

describe('authenticate', () => {
  const userId = 'user-1';
  const bearer = () => ({ authorization: `Bearer ${generateTokens(userId, 'PATIENT').accessToken}` });

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateAuthCache(userId);
  });

  it('rejects a missing token', async () => {
    const { next } = await run({});
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const { next } = await run({ authorization: 'Bearer nope' });
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('accepts an active account and sets req.user', async () => {
    mockActive(true);
    const { req, next } = await run(bearer());
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: userId, role: 'PATIENT' });
  });

  it('rejects a deactivated or deleted account', async () => {
    mockActive(false);
    expect((await run(bearer())).next.mock.calls[0][0].statusCode).toBe(401);

    invalidateAuthCache(userId);
    mockActive(null);
    expect((await run(bearer())).next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('locks a user out immediately once the cache is invalidated', async () => {
    mockActive(true);
    await run(bearer());
    mockActive(false);
    invalidateAuthCache(userId);
    expect((await run(bearer())).next.mock.calls[0][0].statusCode).toBe(401);
  });
});

describe('authorize', () => {
  it('forbids roles that are not allowed', () => {
    const next = jest.fn();
    authorize('ADMIN')({ user: { role: 'PATIENT' } }, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
