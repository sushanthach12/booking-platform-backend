# DI Token Reference

Source: `src/database/di/symbols.ts`

| Token | Interface | Implemented by | Provided in |
|---|---|---|---|
| `USER_REPOSITORY` | `IUserRepository` | `UserRepository` | `UserModule` |
| `PROPERTY_REPOSITORY` | `IPropertyRepository` | `PropertyRepository` | `PropertyModule` |
| `PROPERTY_IMAGE_REPOSITORY` | `IPropertyImageRepository` | `PropertyImageRepository` | `PropertyModule` |
| `PROPERTY_AMENITY_REPOSITORY` | `IPropertyAmenityRepository` | `PropertyAmenityRepository` | `PropertyModule` |
| `AVAILABILITY_CALENDAR_REPOSITORY` | `IAvailabilityCalendarRepository` | implementation in `properties/repositories/` | `PropertyModule` |
| `BOOKING_REPOSITORY` | `IBookingRepository` | `BookingRepository` | `BookingModule` |
| `BOOKING_SERVICE` | `IBookingService` | `BookingService` | `BookingModule` |
| `BOOKING_PRICE_CALCULATOR` | `IBookingPriceCalculator` | `DefaultBookingPriceCalculator` | `BookingModule` |
| `AVAILABILITY_CHECKER` | `IAvailabilityChecker` | `AvailabilityCheckerService` | `BookingModule` |
| `PAYMENT_TRANSACTION_REPOSITORY` | `IPaymentTransactionRepository` | `PaymentTransactionRepository` | `PaymentModule` |

Source: `src/search/core/search.tokens.ts`

| Token | Interface | Implemented by | Provided in |
|---|---|---|---|
| `SEARCH_PROVIDER` | `ISearchProvider` | `OpenSearchAdapter` | `SearchCoreModule` (global) |
| `PROPERTY_SEARCH_FACADE` | `IPropertySearchFacade` | `PropertySearchFacade` | `PropertySearchModule` |
| `PROPERTY_PUBLIC_QUERY_FILTERS` | `QueryFilterStrategy<SearchPropertiesDto>[]` | factory-assembled | `PropertySearchModule` |
| `PROPERTY_HOST_QUERY_FILTERS` | `QueryFilterStrategy<HostPropertySearchParams>[]` | factory-assembled | `PropertySearchModule` |
| `PROPERTY_SORT_STRATEGIES` | `SortStrategy<SearchPropertiesDto>[]` | factory-assembled | `PropertySearchModule` |
| `PROPERTY_HOST_SORT_STRATEGIES` | `SortStrategy<HostPropertySearchParams>[]` | factory-assembled | `PropertySearchModule` |

String tokens (not Symbols):

| Token string | Interface | Provided in |
|---|---|---|
| `'IPaymentService'` | `IPaymentService` | `PaymentModule` |
| `'IRedisService'` | `IRedisService` | `RedisModule` (global) |

## Adding a New Token

1. Add `export const MY_TOKEN = Symbol('IMyService');` to `src/database/di/symbols.ts`
2. Create the interface in the feature's `interfaces/` folder
3. Register in the module: `{ provide: MY_TOKEN, useClass: MyService }`
4. Inject with: `@Inject(MY_TOKEN) private readonly myService: IMyService`
5. Export the token from the module if other modules need it
