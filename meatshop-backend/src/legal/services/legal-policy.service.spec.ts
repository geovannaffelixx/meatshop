import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { LegalPolicyService } from './legal-policy.service';
import type { LegalRepository } from '../repositories/legal.repository';
import type { LegalAcceptanceDto } from '../dto/legal-acceptance.dto';

function fixture(enforced = 'true') {
  const documents = ['PLATFORM_TERMS', 'PRIVACY_NOTICE', 'ESTABLISHMENT_TERMS'].map(
    (kind, index) => ({ id: index + 1, kind }),
  );
  const repository = {
    current: jest.fn(async () => documents),
    acceptedIds: jest.fn(async (_user: number, _unit: number | null) => [] as number[]),
    canRepresent: jest.fn(async () => true),
    unitAccepted: jest.fn(async () => false),
    record: jest.fn(async () => undefined),
    accessState: jest.fn<() => Promise<{ kind: string; accepted: boolean }[]>>(),
  };
  repository.accessState.mockImplementation(async () => {
    const accepted = await repository.acceptedIds(10, null);
    return (await repository.current())
      .filter((document) => document.kind !== 'ESTABLISHMENT_TERMS')
      .map((document) => ({ kind: document.kind, accepted: accepted.includes(document.id) }));
  });
  const policy = new LegalPolicyService(
    repository as unknown as LegalRepository,
    new ConfigService({ LEGAL_ACCEPTANCE_REQUIRED: enforced }),
  );
  const acceptance: LegalAcceptanceDto = {
    document_ids: [1, 2],
    channel: 'mobile',
    accepted: true,
  };
  return { policy, repository, acceptance, documents };
}

describe('LegalPolicyService', () => {
  it('requires explicit acceptance and exact current versions', async () => {
    const { policy, acceptance } = fixture();
    await expect(policy.validate(undefined, false)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      policy.validate({ ...acceptance, document_ids: [1, 99] }, false),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(policy.validate(acceptance, false)).resolves.toHaveLength(2);
  });

  it('requires the representation declaration and all establishment documents', async () => {
    const { policy, acceptance } = fixture();
    await expect(policy.validate(acceptance, true)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      policy.validate(
        { ...acceptance, authorized_representative: true, document_ids: [1, 2, 3] },
        true,
      ),
    ).resolves.toHaveLength(3);
  });

  it('keeps personal acceptance independent of establishment acceptance', async () => {
    const { policy, repository } = fixture();
    repository.acceptedIds.mockImplementation(async (_user, unit) => (unit ? [] : [1, 2]));
    await expect(policy.assertUser(10)).resolves.toBeUndefined();
    await expect(policy.assertUnit(20)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(policy.pending(10, 20)).resolves.toMatchObject({ documents: [{ id: 3 }] });
  });

  it('rejects acceptance on behalf of another unit', async () => {
    const { policy, repository } = fixture();
    repository.canRepresent.mockResolvedValue(false);
    await expect(policy.pending(10, 20)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed when a mandatory document is missing', async () => {
    const { policy, repository, documents } = fixture();
    repository.current.mockResolvedValue(documents.slice(0, 1));
    await expect(policy.catalog()).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows staged deployment only when explicitly configured', async () => {
    const { policy, repository } = fixture('false');
    await expect(policy.assertUser(10)).resolves.toBeUndefined();
    await expect(policy.assertUnit(20)).resolves.toBeUndefined();
    expect(repository.acceptedIds).not.toHaveBeenCalled();
  });
});
