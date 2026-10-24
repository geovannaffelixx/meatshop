import type { Server as HttpServer } from 'node:http';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import { createAdapter } from '@socket.io/postgres-adapter';
import type { PoolConfig } from 'pg';
import { Pool } from 'pg';
import type { Server, ServerOptions } from 'socket.io';
import { DataSource } from 'typeorm';

export class PostgresIoAdapter extends IoAdapter {
  private readonly pool: Pool;
  constructor(app: INestApplicationContext, server?: HttpServer) {
    super(server ?? app);
    const options = app.get(DataSource).options;
    if (options.type !== 'postgres') throw new Error('Shared realtime requires PostgreSQL');
    this.pool = new Pool({
      host: options.host,
      port: options.port,
      user: options.username,
      password: options.password as string,
      database: options.database as string,
      ssl: options.ssl as PoolConfig['ssl'],
      max: 5,
    });
    this.pool.on('error', () =>
      process.stderr.write('Shared realtime database connection failed\n'),
    );
  }

  async initialize(): Promise<void> {
    await this.pool.query('SELECT 1 FROM socket_io_attachments LIMIT 0');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(createAdapter(this.pool));
    return server;
  }

  async dispose(): Promise<void> {
    await super.dispose();
    await this.pool.end();
  }
}
