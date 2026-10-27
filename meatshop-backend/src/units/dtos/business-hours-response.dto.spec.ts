import { BusinessHoursResponseDto } from './business-hours-response.dto';
import type { BusinessHours } from '../entities/business-hours.entity';

describe('business hours response contract', () => {
  it('returns HH:mm values that can be submitted unchanged by the settings form', () => {
    const result = BusinessHoursResponseDto.fromEntity({
      opening_time: '08:00:00',
      closing_time: '18:30:00',
    } as BusinessHours);
    expect(result.opening_time).toBe('08:00');
    expect(result.closing_time).toBe('18:30');
  });

  it('preserves closed-day null values', () => {
    const result = BusinessHoursResponseDto.fromEntity({
      opening_time: null,
      closing_time: null,
    } as BusinessHours);
    expect(result.opening_time).toBeNull();
    expect(result.closing_time).toBeNull();
  });
});
