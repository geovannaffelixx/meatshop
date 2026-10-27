import { BadRequestException } from '@nestjs/common';
import { assertSchedulingConfiguration } from './scheduling-configuration.util';

describe('assertSchedulingConfiguration', () => {
  it.each([
    [30, 5],
    [null, null],
    [undefined, undefined],
  ])('accepts a complete scheduling configuration (%s, %s)', (slot, capacity) => {
    expect(() => assertSchedulingConfiguration(slot, capacity)).not.toThrow();
  });

  it.each([
    [30, null],
    [null, 5],
  ])('rejects a partial scheduling configuration (%s, %s)', (slot, capacity) => {
    expect(() => assertSchedulingConfiguration(slot, capacity)).toThrow(BadRequestException);
  });
});
