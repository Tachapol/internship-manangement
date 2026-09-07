import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env.DATABASE_URL;
    const finalUrl =
      url && !url.includes('connection_limit')
        ? `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`
        : url;
    super({
      datasources: finalUrl ? { db: { url: finalUrl } } : undefined,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
