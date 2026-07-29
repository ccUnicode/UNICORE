/* eslint-disable @typescript-eslint/unbound-method */
import { AreaRole } from '../common/enums/area-role.enum';
import { Member } from '../members/member.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginRateLimitService } from './login-rate-limit.service';

describe('AuthController', () => {
  const authService = {
    login: jest.fn(),
  } as unknown as AuthService;
  const release = jest.fn();
  const loginRateLimit = {
    beginAttempt: jest.fn(() => ({ release })),
  } as unknown as LoginRateLimitService;
  const controller = new AuthController(authService, loginRateLimit);
  const loginDto = {
    studentCode: '20260001',
    password: 'a-secure-password',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rate limits login by client IP and account', async () => {
    const response = {
      accessToken: 'signed-token',
      tokenType: 'Bearer' as const,
      member: { id: 1, role: AreaRole.PRESIDENCIA } as Member,
    };
    jest.mocked(authService.login).mockResolvedValue(response);

    await expect(controller.login('10.0.0.1', loginDto)).resolves.toBe(
      response,
    );
    expect(loginRateLimit.beginAttempt).toHaveBeenCalledWith(
      '10.0.0.1',
      '20260001',
    );
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases concurrency capacity after a failed login', async () => {
    jest.mocked(authService.login).mockRejectedValue(new Error('invalid'));

    await expect(controller.login('10.0.0.1', loginDto)).rejects.toThrow(
      'invalid',
    );
    expect(release).toHaveBeenCalledTimes(1);
  });
});
