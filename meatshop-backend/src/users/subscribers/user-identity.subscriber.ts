import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { User } from '../entities/user.entity';
import { applyIdentityIndexes } from '../services/user-identity-index';

@Injectable()
export class UserIdentitySubscriber implements EntitySubscriberInterface<User> {
  constructor(source: DataSource) {
    source.subscribers.push(this);
  }

  listenTo() {
    return User;
  }

  beforeInsert(event: InsertEvent<User>): void {
    if (event.entity) applyIdentityIndexes(event.entity as unknown as Record<string, unknown>);
  }

  beforeUpdate(event: UpdateEvent<User>): void {
    if (event.entity) applyIdentityIndexes(event.entity as Record<string, unknown>);
  }
}
