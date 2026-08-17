import { Injectable } from '@nestjs/common';

/**
 * Unit não possui colunas de horário de funcionamento cadastradas hoje
 * (BusinessHours está fora de escopo desta fase). No-op documentado até
 * que essa informação exista no domínio de Unit.
 */
@Injectable()
export class BusinessHoursValidator {
  assertWithinBusinessHours(_unitId: number, _date: Date): void {
    // no-op — sem dados de horário de funcionamento por unit ainda
  }
}
