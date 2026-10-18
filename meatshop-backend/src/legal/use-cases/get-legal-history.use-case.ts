import { Injectable } from '@nestjs/common';
import { LegalRepository } from '../repositories/legal.repository';

@Injectable()
export class GetLegalHistoryUseCase {
  constructor(private readonly repository: LegalRepository) {}

  execute(userId: number) {
    return this.repository.history(userId);
  }
}
