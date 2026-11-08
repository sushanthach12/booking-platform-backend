import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_RAW_CLIENT } from './opensearch-client.provider';

@Injectable()
export class OpenSearchKeepAliveService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OpenSearchKeepAliveService.name);
  private timer?: NodeJS.Timeout;
  private readonly INTERVAL_MS = 45_000;

  constructor(@Inject(OPENSEARCH_RAW_CLIENT) private readonly client: Client) {}

  onModuleInit() {
    void this.ping(); // warm up, intentionally not awaited
    this.timer = setInterval(() => void this.ping(), this.INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async ping() {
    try {
      await this.client.ping();
      this.logger.debug('Successfully connected to OpenSearch');
    } catch (error) {
      this.logger.error('Error occurred while pinging OpenSearch:', error);
    }
  }
}
