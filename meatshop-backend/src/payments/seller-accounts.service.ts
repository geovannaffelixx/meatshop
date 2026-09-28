import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { MercadoPagoService } from './providers/mercadopago.service';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SellerAccountsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly units: UnitAuthorizationService,
  ) {}

  get enabled(): boolean {
    return (
      this.config.get('PAYMENTS_ENABLED') === 'true' &&
      [
        'MP_CLIENT_ID',
        'MP_CLIENT_SECRET',
        'MP_OAUTH_REDIRECT_URI',
        'MP_CREDENTIAL_ENCRYPTION_KEY',
        'MP_WEBHOOK_SECRET',
      ].every((k) => !!this.config.get<string>(k)?.trim())
    );
  }

  private encrypt(value: string): string {
    const key = createHash('sha256')
      .update(this.config.getOrThrow<string>('MP_CREDENTIAL_ENCRYPTION_KEY'))
      .digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
  }

  private decrypt(value: string): string {
    const [iv, tag, data] = value.split('.').map((x) => Buffer.from(x, 'base64url'));
    const key = createHash('sha256')
      .update(this.config.getOrThrow<string>('MP_CREDENTIAL_ENCRYPTION_KEY'))
      .digest();
    const cipher = createDecipheriv('aes-256-gcm', key, iv);
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
  }

  async status(unitId: number, user: User) {
    await this.units.assertHasPermission(user, unitId, UnitPermission.MANAGE_FINANCE);
    const [account] = await this.db.query(
      'SELECT collector_id, enabled, expires_at FROM payment_sellers WHERE unit_id=$1',
      [unitId],
    );
    return {
      available: this.enabled,
      connected: !!account?.enabled,
      collector_id: account?.collector_id ?? null,
    };
  }

  async connect(unitId: number, user: User) {
    await this.units.assertHasPermission(user, unitId, UnitPermission.MANAGE_FINANCE);
    if (!this.enabled)
      throw new ServiceUnavailableException('Mercado Pago OAuth is not configured');
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    await this.db.query('DELETE FROM payment_oauth_states WHERE expires_at<now()');
    await this.db.query(
      `INSERT INTO payment_oauth_states(state_hash,unit_id,user_id,verifier,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')`,
      [createHash('sha256').update(state).digest('hex'), unitId, user.id, this.encrypt(verifier)],
    );
    const url = new URL('https://auth.mercadopago.com.br/authorization');
    for (const [key, value] of Object.entries({
      client_id: this.config.getOrThrow<string>('MP_CLIENT_ID'),
      response_type: 'code',
      platform_id: 'mp',
      state,
      redirect_uri: this.config.getOrThrow<string>('MP_OAUTH_REDIRECT_URI'),
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }))
      url.searchParams.set(key, value);
    return { url: url.toString() };
  }

  async callback(code: string, state: string) {
    if (!this.enabled || !code || !state) throw new BadRequestException('Invalid OAuth callback');
    return this.db.transaction(async (manager) => {
      const hash = createHash('sha256').update(state).digest('hex');
      const [pending] = await manager.query(
        'SELECT * FROM payment_oauth_states WHERE state_hash=$1 AND expires_at>now() FOR UPDATE',
        [hash],
      );
      if (!pending) throw new BadRequestException('OAuth request expired or already used');
      const user = await manager.findOneByOrFail(User, { id: pending.user_id });
      if (!user.is_active) throw new BadRequestException('Account inactive');
      await this.units.assertHasPermission(user, pending.unit_id, UnitPermission.MANAGE_FINANCE);
      const token = await this.token({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.getOrThrow<string>('MP_OAUTH_REDIRECT_URI'),
        code_verifier: this.decrypt(pending.verifier),
      });
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `seller:${pending.unit_id}`,
      ]);
      const [old] = await manager.query(
        'SELECT collector_id FROM payment_sellers WHERE unit_id=$1 FOR UPDATE',
        [pending.unit_id],
      );
      if (old && String(old.collector_id) !== String(token.user_id))
        throw new BadRequestException(
          'Reconnect the same seller account to preserve access to existing payments',
        );
      await manager.query(
        `INSERT INTO payment_sellers(unit_id,collector_id,access_token,refresh_token,expires_at,enabled) VALUES($1,$2,$3,$4,$5,true)
        ON CONFLICT(unit_id) DO UPDATE SET access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,expires_at=EXCLUDED.expires_at,enabled=true`,
        [
          pending.unit_id,
          String(token.user_id),
          this.encrypt(token.access_token),
          this.encrypt(token.refresh_token),
          new Date(Date.now() + token.expires_in * 1000),
        ],
      );
      await manager.query('DELETE FROM payment_oauth_states WHERE state_hash=$1', [hash]);
      return { connected: true };
    });
  }

  private async token(
    body: Record<string, string>,
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number; user_id: number }> {
    const response = await globalThis.fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        client_id: this.config.get('MP_CLIENT_ID'),
        client_secret: this.config.get('MP_CLIENT_SECRET'),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Mercado Pago account authorization failed; reconnect the account',
      );
    const result = await response.json();
    if (
      !result.access_token ||
      !result.refresh_token ||
      !Number.isFinite(result.expires_in) ||
      result.expires_in <= 0 ||
      !result.user_id
    )
      throw new ServiceUnavailableException('Invalid OAuth response');
    return result;
  }

  async forUnit(unitId: number, forNewPayment = false): Promise<MercadoPagoService> {
    if (!this.enabled) throw new ServiceUnavailableException('Online payments are unavailable');
    const access = await this.db.transaction(async (manager) => {
      const [account] = await manager.query(
        'SELECT * FROM payment_sellers WHERE unit_id=$1 FOR UPDATE',
        [unitId],
      );
      if (!account || (forNewPayment && !account.enabled))
        throw new BadRequestException({
          code: 'SELLER_NOT_CONNECTED',
          message: 'This butcher has not connected its Mercado Pago account',
        });
      if (new Date(account.expires_at).getTime() < Date.now() + 60_000) {
        const token = await this.token({
          grant_type: 'refresh_token',
          refresh_token: this.decrypt(account.refresh_token),
        });
        if (String(token.user_id) !== String(account.collector_id))
          throw new ServiceUnavailableException('Seller account mismatch');
        await manager.query(
          'UPDATE payment_sellers SET access_token=$2,refresh_token=$3,expires_at=$4 WHERE unit_id=$1',
          [
            unitId,
            this.encrypt(token.access_token),
            this.encrypt(token.refresh_token),
            new Date(Date.now() + token.expires_in * 1000),
          ],
        );
        return { token: token.access_token, collector: account.collector_id };
      }
      return { token: this.decrypt(account.access_token), collector: account.collector_id };
    });
    const config = new ConfigService({
      ...Object.fromEntries(
        [
          'MP_ENV',
          'MP_WEBHOOK_SECRET',
          'FRONTEND_URL',
          'BACKEND_PUBLIC_URL',
          'BACKEND_WEBHOOK_PATH',
        ].map((k) => [k, this.config.get(k)]),
      ),
      PAYMENTS_ENABLED: 'true',
      MP_ACCESS_TOKEN: access.token,
      MP_SELLER_UNIT_ID: String(unitId),
      MP_COLLECTOR_ID: String(access.collector),
    });
    return new MercadoPagoService(config);
  }
}
