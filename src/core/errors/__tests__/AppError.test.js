const { ValidationError } = require('../AppError');

describe('ValidationError', () => {
  it('should create error with status code 422', () => {
    const error = new ValidationError('Test validation failed', [
      { field: 'email', message: 'Invalid email' },
    ]);

    expect(error.message).toBe('Test validation failed');
    expect(error.statusCode).toBe(422);
    expect(error.errors).toHaveLength(1);
    expect(error.isOperational).toBe(true);
  });
});
