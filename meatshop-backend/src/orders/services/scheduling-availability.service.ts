import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { businessDateKey, businessMidnight } from '../../finance/utils/month-range.util';
import { BusinessHours } from '../../units/entities/business-hours.entity';
import { Unit } from '../../units/entities/unit.entity';
import { Weekday } from '../../units/enums/weekday.enum';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';

type SchedulingConfiguration = {
  unit: Unit;
  hours: BusinessHours;
  slotMinutes: number;
  capacity: number;
};

export type AvailableScheduleSlot = {
  starts_at: string;
  time: string;
  remaining_capacity: number;
};

@Injectable()
export class SchedulingAvailabilityService {
  constructor(
    @InjectRepository(Unit)
    private readonly units: Repository<Unit>,
    @InjectRepository(BusinessHours)
    private readonly businessHours: Repository<BusinessHours>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
  ) {}

  async listAvailable(unitIds: number[], date: string): Promise<AvailableScheduleSlot[]> {
    const dayStart = this.parseBusinessDate(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
    const configurations = await Promise.all(
      unitIds.map((unitId) => this.configuration(unitId, dayStart)),
    );
    if (configurations.some((configuration) => configuration === null)) return [];

    const availability = await Promise.all(
      configurations.map(async (configuration) => {
        const validConfiguration = configuration!;
        const used = await this.countBySlot(validConfiguration.unit.id, dayStart, dayEnd);
        return new Map(
          this.slotStarts(validConfiguration, dayStart)
            .filter((startsAt) => startsAt > new Date())
            .map((startsAt) => {
              const remaining =
                validConfiguration.capacity - (used.get(startsAt.toISOString()) ?? 0);
              return [startsAt.toISOString(), remaining] as const;
            })
            .filter(([, remaining]) => remaining > 0),
        );
      }),
    );

    const [first, ...others] = availability;
    if (!first) return [];
    return [...first.entries()]
      .filter(([startsAt]) => others.every((slots) => slots.has(startsAt)))
      .map(([startsAt, remaining]) => ({
        starts_at: startsAt,
        time: this.localTime(new Date(startsAt)),
        remaining_capacity: Math.min(remaining, ...others.map((slots) => slots.get(startsAt)!)),
      }))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  async assertAvailable(
    unitId: number,
    startsAt: Date,
    manager?: EntityManager,
    excludeOrderId?: number,
  ): Promise<void> {
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Invalid scheduled_delivery_date');
    }
    if (startsAt.getUTCSeconds() !== 0 || startsAt.getUTCMilliseconds() !== 0) {
      throw new BadRequestException({
        code: 'INVALID_SCHEDULE_SLOT',
        message: 'The selected time is not a valid scheduling interval.',
      });
    }
    if (manager) {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `schedule:${unitId}:${startsAt.toISOString()}`,
      ]);
    }
    const configuration = await this.configuration(unitId, startsAt, manager);
    if (!configuration) {
      throw new BadRequestException({
        code: 'SCHEDULING_UNAVAILABLE',
        message: 'Scheduling is not configured for this unit and day.',
      });
    }
    const allowed = this.slotStarts(
      configuration,
      businessMidnight(new Date(`${businessDateKey(startsAt)}T00:00:00Z`)),
    ).some((slot) => slot.getTime() === startsAt.getTime());
    if (!allowed) {
      throw new BadRequestException({
        code: 'INVALID_SCHEDULE_SLOT',
        message: 'The selected time is outside the available scheduling intervals.',
      });
    }

    const repository = manager ? manager.getRepository(Order) : this.orders;
    const query = repository
      .createQueryBuilder('order')
      .where('order.unit_id = :unitId', { unitId })
      .andWhere('order.is_scheduled = true')
      .andWhere('order.scheduled_delivery_date = :startsAt', { startsAt })
      .andWhere('order.status <> :cancelled', { cancelled: OrderStatus.CANCELLED });
    if (excludeOrderId) query.andWhere('order.id <> :excludeOrderId', { excludeOrderId });
    const used = await query.getCount();
    if (used >= configuration.capacity) {
      throw new BadRequestException({
        code: 'SCHEDULE_SLOT_FULL',
        message: 'The selected scheduling interval is full.',
      });
    }
  }

  private async configuration(
    unitId: number,
    date: Date,
    manager?: EntityManager,
  ): Promise<SchedulingConfiguration | null> {
    const unitRepository = manager ? manager.getRepository(Unit) : this.units;
    const hoursRepository = manager ? manager.getRepository(BusinessHours) : this.businessHours;
    const unit = await unitRepository.findOne({ where: { id: unitId } });
    if (!unit?.scheduling_slot_minutes || !unit.scheduling_capacity) return null;
    const hours = await hoursRepository.findOne({
      where: { unit_id: unitId, weekday: this.weekday(date) },
    });
    if (!hours?.is_open || !hours.opening_time || !hours.closing_time) return null;
    return {
      unit,
      hours,
      slotMinutes: unit.scheduling_slot_minutes,
      capacity: unit.scheduling_capacity,
    };
  }

  private async countBySlot(unitId: number, start: Date, end: Date): Promise<Map<string, number>> {
    const rows = await this.orders
      .createQueryBuilder('order')
      .select('order.scheduled_delivery_date', 'starts_at')
      .addSelect('COUNT(order.id)', 'used')
      .where('order.unit_id = :unitId', { unitId })
      .andWhere('order.is_scheduled = true')
      .andWhere('order.status <> :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('order.scheduled_delivery_date >= :start', { start })
      .andWhere('order.scheduled_delivery_date < :end', { end })
      .groupBy('order.scheduled_delivery_date')
      .getRawMany<{ starts_at: Date | string; used: string }>();
    return new Map(rows.map((row) => [new Date(row.starts_at).toISOString(), Number(row.used)]));
  }

  private slotStarts(configuration: SchedulingConfiguration, dayStart: Date): Date[] {
    const opening = this.minutes(configuration.hours.opening_time!);
    const closing = this.minutes(configuration.hours.closing_time!);
    const slots: Date[] = [];
    for (
      let minute = opening;
      minute + configuration.slotMinutes <= closing;
      minute += configuration.slotMinutes
    ) {
      slots.push(new Date(dayStart.getTime() + minute * 60_000));
    }
    return slots;
  }

  private parseBusinessDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (
      !year ||
      !month ||
      !day ||
      candidate.getUTCFullYear() !== year ||
      candidate.getUTCMonth() !== month - 1 ||
      candidate.getUTCDate() !== day
    ) {
      throw new BadRequestException('Invalid date');
    }
    return businessMidnight(candidate);
  }

  private weekday(date: Date): Weekday {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
    })
      .format(date)
      .toUpperCase() as Weekday;
  }

  private localTime(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)!.value;
    return `${value('hour')}:${value('minute')}`;
  }

  private minutes(value: string): number {
    const [hour, minute] = value.slice(0, 5).split(':').map(Number);
    return hour * 60 + minute;
  }
}
