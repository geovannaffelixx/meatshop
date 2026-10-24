import { BadRequestException } from '@nestjs/common';

export function assertSchedulingConfiguration(
  slotMinutes: number | null | undefined,
  capacity: number | null | undefined,
): void {
  const hasSlot = slotMinutes != null;
  const hasCapacity = capacity != null;
  if (hasSlot !== hasCapacity) {
    throw new BadRequestException(
      'scheduling_slot_minutes and scheduling_capacity must be configured together',
    );
  }
}
