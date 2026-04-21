## Directory Structure

```
src/
├── main.ts                          # Bootstrap entry point
├── vercel.ts                        # Vercel serverless adapter
├── app.module.ts                    # Root module
├── app/                             # Health check controller/service
├── auth/
│   ├── controllers/auth.controller.ts
│   ├── dto/auth.dto.ts
│   ├── interfaces/auth.interface.ts
│   └── services/auth.service.ts
├── bookings/
│   ├── booking-jobs/                # BullMQ async processors
│   │   ├── processors/
│   │   │   ├── booking-payment-timeout.processor.ts
│   │   │   ├── create-booking-details.processor.ts
│   │   │   └── payment-status-sync.processor.ts
│   │   └── constants.ts
│   ├── controllers/booking.controller.ts
│   ├── dto/                         # checkout, create-booking, waitlist, price-alert, etc.
│   ├── entities/                    # booking, slot-reservation, waitlist, price-alert, snapshot, invitation
│   ├── enums/                       # booking-status, payment-status, payment-method, waitlist-state
│   ├── interfaces/                  # IBookingService, booking domain interfaces
│   ├── repositories/
│   │   ├── implementations/booking.repository.ts
│   │   └── interfaces/booking.repository.interface.ts
│   └── services/
│       ├── booking.service.ts
│       ├── availability-checker.service.ts
│       ├── booking-price-calculator.service.ts
│       └── booking-snapshot.service.ts
├── payments/
│   ├── controllers/                 # payment.controller.ts, payouts.controller.ts
│   ├── entities/                    # payment-transaction, payout
│   ├── factories/payment-gateway.factory.ts
│   ├── gateways/cashfree.gateway.ts
│   ├── interfaces/                  # payment.interface.ts, payout.interface.ts
│   ├── repositories/
│   │   ├── implementations/payment-transaction.repository.ts
│   │   └── payout.repository.ts
│   └── services/                    # payment.service.ts, payment-transaction.service.ts, payout.service.ts
├── properties/
│   ├── controllers/                 # property, property-image, property-amenity, property-calendar, host-onboarding
│   ├── dto/                         # availability, block-dates, create-property, host-onboarding, listing, etc.
│   ├── entities/                    # property + all related (location, pricing, details, images, amenities, calendar, etc.)
│   ├── enums/                       # property.enum.ts, rooms.enum.ts
│   ├── interfaces/property.interface.ts
│   ├── repositories/
│   │   ├── implementations/         # property, property-image, property-amenity, availability-calendar
│   │   └── interfaces/
│   ├── services/                    # property.service.ts, property-image.service.ts, property-amenity.service.ts
│   └── validations/schema/          # Zod schemas for create-property
├── users/
│   ├── controllers/                 # user.controller.ts, users-me.controller.ts
│   ├── dto/update-profile.dto.ts
│   ├── entities/                    # user.entity.ts, wishlist.entity.ts
│   ├── enums/user.enum.ts
│   ├── interfaces/                  # user.interface.ts, wishlist.interface.ts
│   ├── repositories/
│   │   └── implementations/         # user.repository.impl.ts, wishlist.repository.ts
│   └── services/                    # user.service.ts, wishlist.service.ts
├── storage/
│   ├── controllers/storage.controller.ts
│   ├── dto/presign.dto.ts
│   ├── providers/s3-client.provider.ts
│   └── services/storage.service.ts
├── queues/
│   └── queues.module.ts             # BullMQ queue registrations (shared across modules)
├── common/
│   ├── config/                      # env.config.ts, core.config.ts, config.utils.ts
│   ├── decorators/request-user.decorator.ts
│   ├── enums/                       # config.enum.ts, currency.enum.ts
│   ├── events/payment.events.ts
│   ├── filters/http-exception.filter.ts
│   ├── helpers/                     # slug.helper.ts, time.helper.ts
│   ├── interfaces/pagination.interface.ts
│   ├── redis/                       # redis.module.ts, redis.service.ts, redis.conn.service.ts
│   ├── types/users.types.ts
│   └── zod/                         # shared Zod utilities
└── database/
    ├── config/typeorm.config.ts
    ├── di/symbols.ts                # All DI Symbol tokens
    └── migrations/                  # TypeORM migration files
```
