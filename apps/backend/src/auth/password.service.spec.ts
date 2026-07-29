import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes passwords with a random salt and verifies the result', async () => {
    const firstHash = await service.hash('a-secure-password');
    const secondHash = await service.hash('a-secure-password');

    expect(firstHash).not.toBe(secondHash);
    await expect(service.verify('a-secure-password', firstHash)).resolves.toBe(
      true,
    );
    await expect(service.verify('wrong-password', firstHash)).resolves.toBe(
      false,
    );
  });

  it('rejects malformed stored hashes', async () => {
    await expect(service.verify('password', 'not-a-hash')).resolves.toBe(false);
  });
});
