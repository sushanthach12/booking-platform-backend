import { SearchPropertiesDto } from '../../../properties/dto/property-crud.dto';
import { SearchOutcome } from '../../core/interfaces/searchable.interface';
import { HostPropertySearchParams } from './host-property-search.params';
import { PropertyDestination } from './property-destination.interface';
import { PropertyDocument } from './property-document.interface';

/**
 * Facade: the single surface controllers/listeners/processors talk to, so
 * they don't need to know there are separate services underneath for
 * public search, host search, and indexing.
 */
export interface IPropertySearchFacade {
  search(query: SearchPropertiesDto): Promise<SearchOutcome<PropertyDocument>>;
  searchForHost(
    params: HostPropertySearchParams,
  ): Promise<SearchOutcome<PropertyDocument>>;
  aggregateDestinations(limit: number): Promise<PropertyDestination[]>;
  indexById(propertyId: string): Promise<void>;
  indexMany(propertyIds: string[]): Promise<void>;
  remove(id: string): Promise<void>;
}
