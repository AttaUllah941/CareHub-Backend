const { generateTokens, verifyAccessToken, verifyRefreshToken } = require('../token.utils');

describe('token utils', () => {
  it('embeds role and token version in both tokens', () => {
    const { accessToken, refreshToken } = generateTokens('user1', 'PATIENT', 3);

    expect(verifyAccessToken(accessToken)).toMatchObject({ sub: 'user1', role: 'PATIENT', tv: 3 });
    expect(verifyRefreshToken(refreshToken)).toMatchObject({ sub: 'user1', tv: 3 });
  });

  it('defaults the token version to 0', () => {
    const { refreshToken } = generateTokens('user1', 'PATIENT');
    expect(verifyRefreshToken(refreshToken).tv).toBe(0);
  });

  it('does not accept a refresh token as an access token', () => {
    const { refreshToken } = generateTokens('user1', 'PATIENT');
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});
