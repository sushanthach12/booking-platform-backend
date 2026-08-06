import { HostPropertySearchDto } from '../dto/host-property-search.dto';

/**
 * hostId is appended by the controller from the authenticated user, never
 * accepted from the client — HostPropertySearchDto deliberately has no
 * hostId field so the ValidationPipe rejects any attempt to pass one.
 */
export type HostPropertySearchParams = HostPropertySearchDto & {
  hostId: string;
};
