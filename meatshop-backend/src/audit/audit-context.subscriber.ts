import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, BeforeQueryEvent } from 'typeorm';
import { auditRequestContext } from './audit-request-context';

@Injectable()
export class AuditContextSubscriber implements EntitySubscriberInterface {
  constructor(source: DataSource) {
    source.subscribers.push(this);
  }

  async beforeQuery(event: BeforeQueryEvent<unknown>): Promise<void> {
    if (event.connection.options.type !== 'postgres' || event.queryRunner.data.settingAuditContext)
      return;
    if (
      /^(?:START TRANSACTION|SET TRANSACTION|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE SAVEPOINT)\b/i.test(
        event.query.trim(),
      )
    ) {
      delete event.queryRunner.data.auditContextKey;
      return;
    }
    // The session settings are consumed only by DML audit triggers, not by SELECT policies.
    if (/^(?:SELECT|SHOW)\b/i.test(event.query.trim())) return;
    const request = auditRequestContext.getStore();
    const id = request?.user?.id;
    const actor = Number.isSafeInteger(id) ? String(id) : '';
    const correlation = request?.correlationId ?? '';
    const key = JSON.stringify([actor, correlation]);
    if (event.queryRunner.data.auditContextKey === key) return;
    event.queryRunner.data.settingAuditContext = true;
    try {
      await event.queryRunner.query(
        "SELECT set_config('meatshop.actor_id',$1,false),set_config('meatshop.request_id',$2,false)",
        [actor, correlation],
      );
      event.queryRunner.data.auditContextKey = key;
    } finally {
      event.queryRunner.data.settingAuditContext = false;
    }
  }
}
