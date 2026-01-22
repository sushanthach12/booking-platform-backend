```
backend/
├── src/
│   ├── main.ts                          # Application entry point
│   ├── app.module.ts                    # Root module
│   │
│   ├── common/                          # Shared infrastructure (DRY)
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts       # @Roles() decorator
│   │   │   ├── public.decorator.ts      # @Public() decorator
│   │   │   ├── current-user.decorator.ts
│   │   │   └── idempotency-key.decorator.ts
│   │   │
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   ├── validation.filter.ts
│   │   │   └── all-exceptions.filter.ts
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── idempotency.guard.ts
│   │   │
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   └── cache.interceptor.ts
│   │   │
│   │   ├── pipes/
│   │   │   ├── validation.pipe.ts
│   │   │   └── parse-uuid.pipe.ts
│   │   │
│   │   ├── interfaces/
│   │   │   ├── pagination.interface.ts
│   │   │   ├── response.interface.ts
│   │   │   └── cache.interface.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── date.util.ts
│   │   │   ├── uuid.util.ts
│   │   │   ├── geocoding.util.ts
│   │   │   └── idempotency.util.ts
│   │   │
│   │   ├── constants/
│   │   │   ├── error-codes.constant.ts
│   │   │   └── app.constant.ts
│   │   │
│   │   └── types/
│   │       ├── pagination.type.ts
│   │       └── query.type.ts
│   │
│   ├── config/                          # Configuration (Single Responsibility)
│   │   ├── config.module.ts
│   │   ├── config.service.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   ├── payment.config.ts
│   │   └── storage.config.ts
│   │
│   ├── database/                        # Database layer (Dependency Inversion)
│   │   ├── database.module.ts
│   │   ├── entities/                   # TypeORM entities
│   │   │   ├── base.entity.ts          # Base entity with common fields
│   │   │   ├── user.entity.ts
│   │   │   ├── property.entity.ts
│   │   │   ├── booking.entity.ts
│   │   │   ├── availability-calendar.entity.ts
│   │   │   ├── waitlist.entity.ts
│   │   │   ├── slot-reservation.entity.ts
│   │   │   ├── booking-invitation.entity.ts
│   │   │   ├── price-alert.entity.ts
│   │   │   ├── payment.entity.ts
│   │   │   ├── review.entity.ts
│   │   │   └── notification.entity.ts
│   │   │
│   │   ├── repositories/               # Repository pattern (Interface Segregation)
│   │   │   ├── interfaces/
│   │   │   │   ├── user.repository.interface.ts
│   │   │   │   ├── property.repository.interface.ts
│   │   │   │   ├── booking.repository.interface.ts
│   │   │   │   ├── availability.repository.interface.ts
│   │   │   │   ├── waitlist.repository.interface.ts
│   │   │   │   └── price-alert.repository.interface.ts
│   │   │   │
│   │   │   └── implementations/
│   │   │       ├── user.repository.ts
│   │   │       ├── property.repository.ts
│   │   │       ├── booking.repository.ts
│   │   │       ├── availability.repository.ts
│   │   │       ├── waitlist.repository.ts
│   │   │       └── price-alert.repository.ts
│   │   │
│   │   └── migrations/                  # TypeORM migrations
│   │       └── ...
│   │
│   ├── cache/                           # Caching layer (Single Responsibility)
│   │   ├── cache.module.ts
│   │   ├── cache.service.ts
│   │   ├── interfaces/
│   │   │   └── cache.service.interface.ts
│   │   └── strategies/
│   │       ├── redis-cache.strategy.ts
│   │       └── memory-cache.strategy.ts
│   │
│   ├── queue/                           # Background jobs (Single Responsibility)
│   │   ├── queue.module.ts
│   │   ├── processors/
│   │   │   ├── notification.processor.ts
│   │   │   ├── expiry.processor.ts
│   │   │   ├── price-alert.processor.ts
│   │   │   └── email.processor.ts
│   │   └── jobs/
│   │       ├── notification.job.ts
│   │       └── expiry.job.ts
│   │
│   ├── lock/                            # Distributed locking (Single Responsibility)
│   │   ├── lock.module.ts
│   │   ├── lock.service.ts
│   │   ├── interfaces/
│   │   │   └── lock.service.interface.ts
│   │   └── strategies/
│   │       └── redis-lock.strategy.ts
│   │
│   ├── auth/                            # Authentication module (Single Responsibility)
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
|   |   ├── services/
│   │   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   ├── refresh-token.dto.ts
│   │   │   └── forgot-password.dto.ts
│   │   └── interfaces/
│   │       └── jwt-payload.interface.ts
│   │
│   ├── users/                           # User management (Single Responsibility)
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   └── user-profile.dto.ts
│   │   └── interfaces/
│   │       └── user.service.interface.ts
│   │
│   ├── properties/                      # Property management (Single Responsibility)
│   │   ├── properties.module.ts
│   │   ├── properties.controller.ts
│   │   ├── properties.service.ts
│   │   ├── dto/
│   │   │   ├── create-property.dto.ts
│   │   │   ├── update-property.dto.ts
│   │   │   ├── search-properties.dto.ts
│   │   │   └── property-response.dto.ts
│   │   ├── interfaces/
│   │   │   └── property.service.interface.ts
│   │   └── validators/
│   │       └── date-range.validator.ts
│   │
│   ├── availability/                   # Availability management (Single Responsibility)
│   │   ├── availability.module.ts
│   │   ├── availability.controller.ts
│   │   ├── availability.service.ts
│   │   ├── dto/
│   │   │   ├── check-availability.dto.ts
│   │   │   └── update-availability.dto.ts
│   │   ├── interfaces/
│   │   │   └── availability.service.interface.ts
│   │   └── strategies/
│   │       ├── availability-check.strategy.ts
│   │       └── cache-availability.strategy.ts
│   │
│   ├── bookings/                        # Booking management (Single Responsibility)
│   │   ├── bookings.module.ts
│   │   ├── bookings.controller.ts
│   │   ├── bookings.service.ts
│   │   ├── dto/
│   │   │   ├── create-booking.dto.ts
│   │   │   ├── cancel-booking.dto.ts
│   │   │   └── booking-response.dto.ts
│   │   ├── interfaces/
│   │   │   └── booking.service.interface.ts
│   │   ├── strategies/
│   │   │   ├── concurrency-control.strategy.ts
│   │   │   └── booking-validation.strategy.ts
│   │   └── processors/
│   │       └── booking-event.processor.ts
│   │
│   ├── payments/                         # Payment processing (Single Responsibility)
│   │   ├── payments.module.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── dto/
│   │   │   ├── create-payment.dto.ts
│   │   │   └── payment-response.dto.ts
│   │   ├── interfaces/
│   │   │   └── payment.service.interface.ts
│   │   ├── strategies/
│   │   │   ├── cashfree.strategy.ts
│   │   │   └── payment-gateway.interface.ts
│   │   └── webhooks/
│   │       └── payment-webhook.handler.ts
│   │
│   ├── waitlist/                        # Waitlist feature (Single Responsibility)
│   │   ├── waitlist.module.ts
│   │   ├── waitlist.controller.ts
│   │   ├── waitlist.service.ts
│   │   ├── dto/
│   │   │   ├── join-waitlist.dto.ts
│   │   │   ├── book-from-waitlist.dto.ts
│   │   │   └── waitlist-response.dto.ts
│   │   ├── interfaces/
│   │   │   └── waitlist.service.interface.ts
│   │   ├── strategies/
│   │   │   ├── slot-reservation.strategy.ts
│   │   │   └── notification.strategy.ts
│   │   └── enums/
│   │       └── waitlist-state.enum.ts
│   │
│   ├── price-alerts/                    # Price alerts feature (Single Responsibility)
│   │   ├── price-alerts.module.ts
│   │   ├── price-alerts.controller.ts
│   │   ├── price-alerts.service.ts
│   │   ├── dto/
│   │   │   ├── create-price-alert.dto.ts
│   │   │   └── price-alert-response.dto.ts
│   │   ├── interfaces/
│   │   │   └── price-alert.service.interface.ts
│   │   └── strategies/
│   │       ├── auto-booking.strategy.ts
│   │       └── price-monitoring.strategy.ts
│   │
│   ├── reviews/                         # Reviews & ratings (Single Responsibility)
│   │   ├── reviews.module.ts
│   │   ├── reviews.controller.ts
│   │   ├── reviews.service.ts
│   │   ├── dto/
│   │   │   ├── create-review.dto.ts
│   │   │   └── review-response.dto.ts
│   │   └── interfaces/
│   │       └── review.service.interface.ts
│   │
│   ├── notifications/                  # Notification system (Single Responsibility)
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── dto/
│   │   │   └── notification-response.dto.ts
│   │   ├── interfaces/
│   │   │   └── notification.service.interface.ts
│   │   ├── channels/
│   │   │   ├── email.channel.ts
│   │   │   ├── sms.channel.ts
│   │   │   ├── push.channel.ts
│   │   │   └── notification-channel.interface.ts
│   │   └── templates/
│   │       ├── waitlist-invitation.template.ts
│   │       └── price-drop.template.ts
│   │
│   ├── search/                          # Search functionality (Single Responsibility)
│   │   ├── search.module.ts
│   │   ├── search.controller.ts
│   │   ├── search.service.ts
│   │   ├── dto/
│   │   │   └── search-query.dto.ts
│   │   ├── interfaces/
│   │   │   └── search.service.interface.ts
│   │   └── strategies/
│   │       ├── geospatial-search.strategy.ts
│   │       └── text-search.strategy.ts
│   │
│   ├── analytics/                       # Analytics & reporting (Single Responsibility)
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   ├── dto/
│   │   │   └── analytics-query.dto.ts
│   │   └── strategies/
│   │       ├── revenue-analytics.strategy.ts
│   │       └── occupancy-analytics.strategy.ts
│   │
│   ├── upload/                          # File upload (Single Responsibility)
│   │   ├── upload.module.ts
│   │   ├── upload.controller.ts
│   │   ├── upload.service.ts
│   │   ├── dto/
│   │   │   └── upload-response.dto.ts
│   │   ├── interfaces/
│   │   │   └── upload.service.interface.ts
│   │   └── strategies/
│   │       └── azure-blob.strategy.ts
│   │
│   ├── admin/                           # Admin operations (Single Responsibility)
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── dto/
│   │       └── admin-query.dto.ts
│   │
│   └── health/                          # Health checks (Single Responsibility)
│       ├── health.module.ts
│       ├── health.controller.ts
│       └── health.service.ts
│
├── test/                                # Test files
│   ├── unit/
│   │   ├── services/
│   │   ├── controllers/
│   │   └── repositories/
│   ├── integration/
│   │   └── ...
│   ├── e2e/
│   │   ├── bookings.e2e-spec.ts
│   │   └── waitlist.e2e-spec.ts
│   └── fixtures/
│       └── ...
│
├── docs/                                # Documentation
│   └── booking_platform.md
│
├── scripts/                             # Utility scripts
│   ├── seed.ts
│   └── migrate.ts
│
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```
