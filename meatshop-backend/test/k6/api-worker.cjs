require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const process = require('node:process');
const { performance } = require('node:perf_hooks');
const { setInterval, clearInterval } = require('node:timers');
const { ValidationPipe } = require('@nestjs/common');
const cookieParser = require('cookie-parser');
const { AppModule } = require('../../dist/app.module');
const { PostgresIoAdapter } = require('../../dist/common/adapters/postgres-io.adapter');
const { AllExceptionsFilter } = require('../../dist/common/filters/all-exceptions.filter');
const { SendNotificationUseCase } = require('../../dist/notifications/use-cases/send-notification.use-case');
const { SendOrderStatusNotificationUseCase } = require('../../dist/notifications/use-cases/send-order-status-notification.use-case');

async function start() {
  if (process.env.NODE_ENV !== 'test' || process.env.DB_HOST !== '127.0.0.1' ||
    !['meatshop_gaps_test_330','meatshop_spec_test_330'].includes(process.env.DB_DATABASE) || !process.send) {
    throw new Error('Refusing a nonisolated k6 API worker');
  }
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SendNotificationUseCase).useValue({ execute: async () => ({}) })
    .overrideProvider(SendOrderStatusNotificationUseCase).useValue({
      notifyUnitOfNewOrder: async () => {}, notifyCustomerOfDeliveryCode: async () => {},
      notifyCustomerOfStatusChange: async () => {}, notifyCustomerOfPayment: async () => {},
    }).compile();
  const app = module.createNestApplication({ logger: false });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(app.get(AllExceptionsFilter));
  const adapter = new PostgresIoAdapter(app);
  await adapter.initialize();
  app.useWebSocketAdapter(adapter);
  await app.listen(0, '127.0.0.1');
  process.send({ port: app.getHttpServer().address().port });
  const profile = startProfile();
  process.on('message', async (message) => {
    if (message !== 'stop') return;
    clearInterval(profile);
    await app.close();
    process.exit(0);
  });
}

function startProfile() {
  const timer = setInterval(() => process.send({ profile: {
    at: Date.now(), cpu: process.cpuUsage(), elu: performance.eventLoopUtilization(),
    rss: process.memoryUsage().rss,
  } }), 2000);
  timer.unref();
  return timer;
}

start().catch((error) => { process.stderr.write(`Isolated k6 API worker failed: ${error.message}\n`); process.exit(1); });
