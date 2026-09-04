import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryAffiliationType } from '../enums/delivery-affiliation-type.enum';
import { DeliveryMode } from '../enums/delivery-mode.enum';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';
import { RegisterDeliveryPersonUseCase } from './register-delivery-person.use-case';

describe('RegisterDeliveryPersonUseCase', () => {
  const repository = {
    findOne: jest.fn(),
    create: jest.fn((value: Partial<DeliveryPerson>) => value as DeliveryPerson),
    save: jest.fn(async (value: DeliveryPerson) => value),
  } as unknown as Repository<DeliveryPerson>;
  const useCase = new RegisterDeliveryPersonUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(repository.findOne).mockResolvedValue(null);
  });

  it('ativa o entregador autônomo sem criar vínculo artificial com unidade', async () => {
    const result = await useCase.execute({ vehicle: DeliveryMode.MOTORCYCLE }, { id: 7 } as User);

    expect(result).toMatchObject({
      user_id: 7,
      affiliation_type: DeliveryAffiliationType.AUTONOMOUS,
      status: DeliveryPersonStatus.ACTIVE,
    });
  });

  it('retorna o cadastro existente ao retomar um fluxo parcialmente concluído', async () => {
    const existing = { id: 12, user_id: 7 } as DeliveryPerson;
    jest.mocked(repository.findOne).mockResolvedValue(existing);

    const result = await useCase.execute({ vehicle: DeliveryMode.MOTORCYCLE }, { id: 7 } as User);

    expect(result).toBe(existing);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
