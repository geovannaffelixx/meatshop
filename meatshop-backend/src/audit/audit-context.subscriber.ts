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
    )
      return;
    const request = auditRequestContext.getStore();
    const id = request?.user?.id;
    event.queryRunner.data.settingAuditContext = true;
    try {
      await event.queryRunner.query(
        "SELECT set_config('meatshop.actor_id',$1,false),set_config('meatshop.request_id',$2,false)",
        [Number.isSafeInteger(id) ? String(id) : '', request?.correlationId ?? ''],
      );
    } finally {
      event.queryRunner.data.settingAuditContext = false;
    }
  }
}
