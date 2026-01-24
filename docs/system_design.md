# Booking Platform - System Design Document

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Functional Requirements](#functional-requirements)
3. [Non-Functional Requirements](#non-functional-requirements)
4. [Back of the Envelope Calculations](#back-of-the-envelope-calculations)
5. [High Level Design (HLD)](#high-level-design-hld)
6. [Low Level Design (LLD)](#low-level-design-lld)

---

## Problem Statement

### Core Problem

Build a scalable property booking platform that enables guests to search and book properties while hosts manage their listings. The primary challenge is **preventing double bookings** when multiple users attempt to book the same property for overlapping dates simultaneously, especially under high concurrency.

### Key Challenges

1. **Concurrency Control**: Multiple users booking the same property simultaneously can lead to double bookings
2. **Real-Time Availability**: Maintaining accurate availability across thousands of properties with millions of date combinations
3. **Scalability**: Handling millions of users, properties, and bookings with sub-100ms response times
4. **Data Consistency**: Ensuring booking data consistency across distributed systems
5. **Payment Reliability**: Processing payments securely and handling failures gracefully
6. **Search Performance**: Fast location-based property searches across large datasets

### Business Context

- **Market**: Property rental/booking platform (similar to Airbnb, Booking.com)
- **Users**: Guests (bookers), Hosts (property owners), Admins (platform operators)
- **Scale**: Target 1M+ properties, 10M+ users, 100M+ bookings annually
- **Revenue Model**: Commission-based (percentage of booking value)

---

## Functional Requirements

### FR1: User Management
- **FR1.1**: Users can register and authenticate (email/password, OAuth)
- **FR1.2**: Users can manage profiles (personal info, preferences, payment methods)
- **FR1.3**: Role-based access control (Guest, Host, Admin)
- **FR1.4**: Password reset and account recovery

### FR2: Property Management
- **FR2.1**: Hosts can create, update, and delete property listings
- **FR2.2**: Properties include: title, description, location, amenities, pricing, images
- **FR2.3**: Hosts can set availability calendar (block/unblock dates)
- **FR2.4**: Dynamic pricing based on dates, demand, seasonality
- **FR2.5**: Property search with filters (location, dates, price, amenities, ratings)

### FR3: Booking Management
- **FR3.1**: Guests can search properties by location, dates, and filters
- **FR3.2**: Guests can view property details and availability
- **FR3.3**: Guests can create bookings (with payment)
- **FR3.4**: Guests can cancel bookings (with refund policy)
- **FR3.5**: Hosts can view and manage bookings for their properties
- **FR3.6**: **CRITICAL**: Prevent double bookings (same property, overlapping dates)

### FR4: Availability Management
- **FR4.1**: Real-time availability checking
- **FR4.2**: Availability calendar updates when bookings are created/cancelled
- **FR4.3**: Bulk availability updates for hosts
- **FR4.4**: Availability cache for fast lookups

### FR5: Waitlist System
- **FR5.1**: Guests can join waitlist for fully booked properties
- **FR5.2**: Automatic notification when cancellation creates availability
- **FR5.3**: Time-bound booking opportunity for waitlisted users
- **FR5.4**: First-come-first-served priority system

### FR6: Payment Processing
- **FR6.1**: Secure payment processing (credit cards, digital wallets)
- **FR6.2**: Payment gateway integration (Cashfree, Stripe, etc.)
- **FR6.3**: Payment webhook handling for status updates
- **FR6.4**: Refund processing for cancellations
- **FR6.5**: Idempotent payment requests

### FR7: Price Alerts
- **FR7.1**: Guests can set price alerts for properties
- **FR7.2**: Automatic notifications when price drops below threshold
- **FR7.3**: Optional auto-booking when price alert triggers

### FR8: Reviews & Ratings
- **FR8.1**: Guests can leave reviews and ratings after stay
- **FR8.2**: Hosts can respond to reviews
- **FR8.3**: Aggregate ratings displayed on property listings

### FR9: Notifications
- **FR9.1**: Email notifications (booking confirmations, cancellations, reminders)
- **FR9.2**: SMS notifications for critical events
- **FR9.3**: Push notifications for mobile apps
- **FR9.4**: In-app notification center

### FR10: Admin Features
- **FR10.1**: Admin dashboard for platform management
- **FR10.2**: User management (suspend, verify, etc.)
- **FR10.3**: Property moderation and approval
- **FR10.4**: Analytics and reporting
- **FR10.5**: System health monitoring

---

## Non-Functional Requirements

### NFR1: Performance
- **NFR1.1**: API response time < 100ms (p95) for read operations
- **NFR1.2**: API response time < 500ms (p95) for write operations
- **NFR1.3**: Property search results in < 200ms (p95)
- **NFR1.4**: Support 10,000+ requests per second (RPS)
- **NFR1.5**: Database query optimization with proper indexing

### NFR2: Scalability
- **NFR2.1**: Horizontal scaling capability (stateless services)
- **NFR2.2**: Support 1M+ properties, 10M+ users, 100M+ bookings
- **NFR2.3**: Database sharding/partitioning strategy
- **NFR2.4**: Caching layer for hot data (Redis)
- **NFR2.5**: CDN for static assets (images, videos)

### NFR3: Availability & Reliability
- **NFR3.1**: System uptime 99.9% (8.76 hours downtime/year)
- **NFR3.2**: Zero data loss (durable storage, backups)
- **NFR3.3**: Graceful degradation during partial failures
- **NFR3.4**: Database replication (primary-replica setup)
- **NFR3.5**: Health checks and auto-recovery

### NFR4: Security
- **NFR4.1**: Authentication via JWT tokens
- **NFR4.2**: HTTPS for all API communications
- **NFR4.3**: Rate limiting to prevent abuse (DDoS protection)
- **NFR4.4**: Input validation and SQL injection prevention
- **NFR4.5**: PCI-DSS compliance for payment data
- **NFR4.6**: Data encryption at rest and in transit
- **NFR4.7**: Role-based access control (RBAC)

### NFR5: Consistency
- **NFR5.1**: Strong consistency for booking operations (ACID transactions)
- **NFR5.2**: Eventual consistency acceptable for search indexes
- **NFR5.3**: Idempotent operations for critical actions
- **NFR5.4**: Distributed locking for concurrency control

### NFR6: Maintainability
- **NFR6.1**: Modular architecture (microservices-ready)
- **NFR6.2**: Comprehensive logging and monitoring
- **NFR6.3**: API versioning support
- **NFR6.4**: Automated testing (unit, integration, e2e)
- **NFR6.5**: Code documentation and clear structure

### NFR7: Cost Optimization
- **NFR7.1**: Efficient resource utilization
- **NFR7.2**: Caching to reduce database load
- **NFR7.3**: CDN for static content delivery
- **NFR7.4**: Auto-scaling based on demand

---

## Back of the Envelope Calculations

### Scale Assumptions

- **Users**: 10 million registered users
- **Properties**: 1 million active properties
- **Bookings**: 100 million bookings per year
- **Daily Active Users (DAU)**: 1 million (10% of total users)
- **Peak Traffic**: 3x average (special events, holidays)

### Traffic Estimates

#### Read Operations
- **Property searches**: 50% of DAU = 500K searches/day = **5.8 searches/second** (average)
- **Peak searches**: 3x = **17.4 searches/second**
- **Property detail views**: 2x searches = **34.8 views/second** (peak)
- **Availability checks**: 10x searches = **174 checks/second** (peak)

#### Write Operations
- **Bookings**: 100M/year = 274K/day = **3.2 bookings/second** (average)
- **Peak bookings**: 3x = **9.6 bookings/second**
- **User registrations**: 10K/day = **0.12 registrations/second**
- **Property updates**: 50K/day = **0.58 updates/second**

#### Total API Load
- **Average RPS**: ~20 requests/second
- **Peak RPS**: ~250 requests/second
- **With 10x safety margin**: Design for **2,500 RPS** (10,000 RPS target per NFR)

### Storage Estimates

#### Database Storage

**Users Table**
- 10M users × 2KB per user = **20 GB**

**Properties Table**
- 1M properties × 5KB per property = **5 GB**

**Bookings Table**
- 100M bookings/year × 1KB per booking = **100 GB/year**
- 5 years retention = **500 GB**

**Availability Calendar**
- 1M properties × 365 days × 100 bytes = **36.5 GB/year**
- 3 years retention = **110 GB**

**Waitlist Table**
- 5M waitlist entries × 500 bytes = **2.5 GB**

**Reviews Table**
- 50M reviews × 2KB = **100 GB**

**Total Database**: ~750 GB (5 years)

#### Cache Storage (Redis)

**Property Availability Cache**
- 1M properties × 90 days × 100 bytes = **9 GB**

**Search Result Cache**
- 10K popular queries × 50KB = **500 MB**

**Session Cache**
- 1M active sessions × 1KB = **1 GB**

**Total Cache**: ~12 GB

#### File Storage (Images/Videos)

- 1M properties × 20 images × 500KB = **10 TB**
- With CDN compression: **~5 TB**

### Bandwidth Estimates

#### API Bandwidth
- Average request: 2KB, response: 10KB
- Peak: 2,500 RPS × 12KB = **30 MB/second = 2.6 TB/day**

#### Image Bandwidth
- 1M DAU × 50 images/day × 200KB = **10 TB/day**
- With CDN: **~2 TB/day** (80% cache hit rate)

### Compute Resources

#### Application Servers
- **CPU**: 2,500 RPS × 50ms avg = 125 concurrent requests
- **Per server**: 4 CPU cores, 8 GB RAM, handle 500 RPS
- **Servers needed**: 2,500 / 500 = **5 servers** (with 2x redundancy = **10 servers**)

#### Database
- **Read replicas**: 3 (for read-heavy workload)
- **Write primary**: 1
- **Total**: 4 database instances

#### Cache (Redis)
- **Memory**: 12 GB + 50% overhead = **18 GB**
- **Instances**: 2 (primary + replica) = **36 GB total**

### Cost Estimates (Monthly)

#### Compute (AWS/GCP)
- **Application servers**: 10 × $100/month = **$1,000**
- **Database**: 4 × $500/month = **$2,000**
- **Redis**: 2 × $200/month = **$400**
- **Load balancer**: **$50**

#### Storage
- **Database storage**: 750 GB × $0.10/GB = **$75**
- **File storage**: 5 TB × $0.023/GB = **$115**
- **CDN**: 2 TB/day × $0.085/GB = **$5,100**

#### Total Infrastructure: **~$8,740/month**

---

## High Level Design (HLD)

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Web App  │  │ Mobile   │  │ Admin    │  │  API     │      │
│  │ (React)  │  │ App      │  │ Dashboard│  │ Clients  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                │
│                    (Rate Limiting, SSL Termination)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer (NestJS)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Auth       │  │   Booking    │  │   Search     │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Property   │  │   Payment    │  │  Waitlist   │         │
│  │   Service    │  │   Service    │  │   Service   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │     Redis    │      │  Message     │
│  (Primary +  │      │   (Cache +   │      │   Queue      │
│   Replicas)  │      │    Lock)     │      │  (BullMQ)    │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌──────────────┐
                    │   External   │
                    │   Services   │
                    │  (Payment,   │
                    │   Email, SMS)│
                    └──────────────┘
```

### Component Breakdown

#### 1. Client Layer
- **Web Application**: React-based frontend
- **Mobile Apps**: iOS and Android native apps
- **Admin Dashboard**: Internal management interface
- **API Clients**: Third-party integrations

#### 2. API Gateway / Load Balancer
- **Functions**:
  - Request routing and load balancing
  - SSL/TLS termination
  - Rate limiting (per user, per IP)
  - Request/response transformation
  - API versioning
- **Technology**: AWS ALB, Nginx, or Kong

#### 3. Application Services (NestJS Microservices)

**Auth Service**
- User registration, login, JWT token management
- OAuth integration
- Password reset

**Property Service**
- Property CRUD operations
- Property search and filtering
- Geospatial search (PostGIS)

**Booking Service**
- Booking creation with concurrency control
- Booking cancellation
- Booking history

**Availability Service**
- Real-time availability checking
- Availability calendar management
- Cache invalidation

**Payment Service**
- Payment processing
- Payment gateway integration
- Webhook handling
- Refund processing

**Waitlist Service**
- Waitlist management
- Notification triggering
- Slot reservation

**Search Service**
- Property search with filters
- Search result caching
- Search analytics

**Notification Service**
- Email, SMS, push notifications
- Notification templates
- Delivery tracking

#### 4. Data Layer

**PostgreSQL (Primary Database)**
- **Primary**: Write operations, transactions
- **Replicas**: Read operations (3 replicas)
- **Features**: PostGIS for geospatial, full-text search
- **Sharding Strategy**: By property_id or user_id (future)

**Redis (Cache & Distributed Lock)**
- **Cache**: Property availability, search results, sessions
- **Distributed Lock**: Prevent double bookings
- **Pub/Sub**: Real-time updates
- **Rate Limiting**: Token bucket, sliding window

**Message Queue (BullMQ/Redis)**
- **Background Jobs**: Email sending, notifications, analytics
- **Async Processing**: Payment webhooks, image processing

#### 5. External Services
- **Payment Gateway**: Cashfree, Stripe
- **Email Service**: SendGrid, AWS SES
- **SMS Service**: Twilio, AWS SNS
- **File Storage**: AWS S3, Azure Blob Storage
- **CDN**: CloudFront, Cloudflare

### Data Flow: Booking Creation

```
1. Client → API Gateway
   ├─ Rate limiting check
   ├─ Authentication (JWT validation)
   └─ Request routing

2. API Gateway → Booking Service
   ├─ Validate request (DTO validation)
   └─ Check user permissions

3. Booking Service → Availability Service
   ├─ Check availability (Redis cache first)
   └─ If cache miss → PostgreSQL query

4. Booking Service → Lock Service (Redis)
   ├─ Acquire distributed lock: lock:property:{id}:{dates}
   └─ Lock timeout: 30 seconds

5. Booking Service → Database (PostgreSQL)
   ├─ BEGIN TRANSACTION
   ├─ SELECT ... FOR UPDATE (pessimistic lock)
   ├─ Re-validate availability
   ├─ INSERT booking
   ├─ UPDATE availability_calendar
   └─ COMMIT TRANSACTION

6. Booking Service → Payment Service
   ├─ Create payment intent
   └─ Process payment (async)

7. Booking Service → Notification Service (via Queue)
   ├─ Send confirmation email
   └─ Send SMS notification

8. Booking Service → Cache (Redis)
   ├─ Invalidate availability cache
   └─ Update search cache if needed

9. Booking Service → Lock Service
   └─ Release distributed lock

10. Booking Service → Client
    └─ Return booking confirmation
```

### Concurrency Control Strategy

**Multi-Layer Approach**:

1. **Layer 1: Distributed Lock (Redis)**
   - Key: `lock:property:{propertyId}:{checkIn}:{checkOut}`
   - TTL: 30 seconds
   - Prevents concurrent booking attempts

2. **Layer 2: Database Pessimistic Lock**
   - `SELECT ... FOR UPDATE` on availability rows
   - Locks rows during transaction
   - Prevents race conditions

3. **Layer 3: Optimistic Locking**
   - Version field on booking entity
   - Detects concurrent modifications
   - Retry mechanism on conflict

4. **Layer 4: Idempotency**
   - Idempotency key per booking request
   - Prevents duplicate bookings from retries

5. **Layer 5: Database Constraints**
   - Unique constraint on (property_id, check_in, check_out)
   - Exclusion constraint for date overlaps (PostgreSQL)

---

## Low Level Design (LLD)

### Database Schema Design

#### Core Tables

**users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'guest', -- guest, host, admin
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 0 -- Optimistic locking
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**properties**
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326), -- PostGIS
  price_per_night DECIMAL(10, 2) NOT NULL,
  max_guests INTEGER DEFAULT 1,
  bedrooms INTEGER DEFAULT 0,
  bathrooms DECIMAL(3, 1) DEFAULT 0,
  amenities TEXT[], -- Array of amenities
  images TEXT[], -- Array of image URLs
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 0
);

CREATE INDEX idx_properties_host ON properties(host_id);
CREATE INDEX idx_properties_location ON properties USING GIST(location); -- Geospatial index
CREATE INDEX idx_properties_city ON properties(city, country);
CREATE INDEX idx_properties_status ON properties(status) WHERE status = 'active';
```

**availability_calendar**
```sql
CREATE TABLE availability_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  price DECIMAL(10, 2), -- Override property price
  min_stay_nights INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, date)
);

CREATE INDEX idx_availability_property_date ON availability_calendar(property_id, date);
CREATE INDEX idx_availability_date_available ON availability_calendar(date, available) WHERE available = TRUE;

-- Exclusion constraint to prevent overlapping bookings
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE availability_calendar 
ADD CONSTRAINT no_overlap_booking 
EXCLUDE USING GIST (property_id WITH =, daterange(date, date, '[]') WITH &&) 
WHERE (available = FALSE);
```

**bookings**
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  guest_id UUID NOT NULL REFERENCES users(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guests_count INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, succeeded, failed, refunded
  payment_id UUID REFERENCES payments(id),
  idempotency_key VARCHAR(255) UNIQUE,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 0,
  CONSTRAINT valid_date_range CHECK (check_out_date > check_in_date)
);

CREATE INDEX idx_bookings_property ON bookings(property_id, check_in_date, check_out_date);
CREATE INDEX idx_bookings_guest ON bookings(guest_id, status);
CREATE INDEX idx_bookings_dates ON bookings USING GIST (
  property_id WITH =,
  daterange(check_in_date, check_out_date, '[]') WITH &&
);
CREATE INDEX idx_bookings_idempotency ON bookings(idempotency_key);
CREATE INDEX idx_bookings_status ON bookings(status) WHERE status IN ('pending', 'confirmed');
```

**payments**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50), -- credit_card, debit_card, wallet
  gateway VARCHAR(50), -- cashfree, stripe
  gateway_transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, succeeded, failed, refunded
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_gateway_txn ON payments(gateway_transaction_id);
CREATE INDEX idx_payments_status ON payments(status) WHERE status IN ('pending', 'processing');
```

**waitlist**
```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  user_id UUID NOT NULL REFERENCES users(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  priority BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000, -- Lower = higher priority
  state VARCHAR(30) DEFAULT 'waitlisted', -- waitlisted, invited, booking_in_progress, confirmed, expired, cancelled
  slot_reservation_id UUID REFERENCES slot_reservations(id),
  notified_at TIMESTAMP,
  expires_at TIMESTAMP, -- Booking window expiry
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, user_id, check_in_date, check_out_date)
);

CREATE INDEX idx_waitlist_property_dates ON waitlist(property_id, check_in_date, check_out_date, priority) 
  WHERE state = 'waitlisted';
CREATE INDEX idx_waitlist_user ON waitlist(user_id, state);
CREATE INDEX idx_waitlist_state ON waitlist(state, expires_at) 
  WHERE state IN ('invited', 'booking_in_progress');
```

**slot_reservations**
```sql
CREATE TABLE slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  reserved_by UUID REFERENCES users(id), -- waitlist user or booking user
  reservation_type VARCHAR(20), -- waitlist_invitation, booking_hold
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, check_in_date, check_out_date)
);

CREATE INDEX idx_slot_reservations_expires ON slot_reservations(expires_at) 
  WHERE expires_at > NOW();
```

### API Design

#### RESTful Endpoints

**Authentication**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

**Properties**
```
GET    /api/v1/properties                    # Search properties
GET    /api/v1/properties/:id                # Get property details
POST   /api/v1/properties                    # Create property (host)
PUT    /api/v1/properties/:id                # Update property (host)
DELETE /api/v1/properties/:id                # Delete property (host)
GET    /api/v1/properties/:id/availability    # Check availability
```

**Bookings**
```
GET    /api/v1/bookings                      # List user bookings
GET    /api/v1/bookings/:id                  # Get booking details
POST   /api/v1/bookings                      # Create booking
POST   /api/v1/bookings/:id/cancel           # Cancel booking
```

**Payments**
```
POST   /api/v1/payments                      # Create payment
GET    /api/v1/payments/:id                  # Get payment status
POST   /api/v1/payments/webhook              # Payment webhook
```

**Waitlist**
```
POST   /api/v1/waitlist                      # Join waitlist
GET    /api/v1/waitlist                      # Get user waitlist
DELETE /api/v1/waitlist/:id                  # Leave waitlist
POST   /api/v1/waitlist/:id/book             # Book from waitlist
```

#### Request/Response Examples

**Create Booking Request**
```json
POST /api/v1/bookings
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Idempotency-Key": "unique-key-12345"
}
Body: {
  "property_id": "uuid",
  "check_in_date": "2026-02-01",
  "check_out_date": "2026-02-05",
  "guests_count": 2,
  "payment_method_id": "pm_123"
}
```

**Create Booking Response**
```json
{
  "id": "booking-uuid",
  "property_id": "uuid",
  "check_in_date": "2026-02-01",
  "check_out_date": "2026-02-05",
  "total_price": 400.00,
  "status": "confirmed",
  "payment_status": "succeeded",
  "created_at": "2026-01-24T10:00:00Z"
}
```

### Service Implementation Details

#### Booking Service: Create Booking Flow

```typescript
async createBooking(dto: CreateBookingDto, userId: string): Promise<Booking> {
  const lockKey = `lock:property:${dto.property_id}:${dto.check_in_date}:${dto.check_out_date}`;
  
  // 1. Acquire distributed lock
  const lock = await this.lockService.acquire(lockKey, 30000); // 30s TTL
  
  try {
    // 2. Check idempotency
    if (dto.idempotency_key) {
      const existing = await this.findByIdempotencyKey(dto.idempotency_key);
      if (existing) return existing;
    }
    
    // 3. Validate property exists and is active
    const property = await this.propertyService.findById(dto.property_id);
    if (!property || property.status !== 'active') {
      throw new NotFoundException('Property not found or inactive');
    }
    
    // 4. Check availability with pessimistic lock
    const isAvailable = await this.availabilityService.checkAvailability(
      dto.property_id,
      dto.check_in_date,
      dto.check_out_date,
      true // use pessimistic lock
    );
    
    if (!isAvailable) {
      throw new ConflictException('Property not available for selected dates');
    }
    
    // 5. Calculate total price
    const totalPrice = await this.calculatePrice(
      dto.property_id,
      dto.check_in_date,
      dto.check_out_date,
      dto.guests_count
    );
    
    // 6. Create booking in transaction
    return await this.dataSource.transaction(async (manager) => {
      // 6a. Create booking
      const booking = manager.create(Booking, {
        property_id: dto.property_id,
        guest_id: userId,
        check_in_date: dto.check_in_date,
        check_out_date: dto.check_out_date,
        guests_count: dto.guests_count,
        total_price: totalPrice,
        idempotency_key: dto.idempotency_key,
        status: 'pending',
        payment_status: 'pending'
      });
      
      const savedBooking = await manager.save(booking);
      
      // 6b. Block availability dates
      await this.availabilityService.blockDates(
        dto.property_id,
        dto.check_in_date,
        dto.check_out_date,
        manager
      );
      
      // 6c. Process payment (async)
      await this.paymentService.processPayment({
        booking_id: savedBooking.id,
        amount: totalPrice,
        payment_method_id: dto.payment_method_id
      });
      
      // 6d. Invalidate cache
      await this.cacheService.invalidate(
        `property:${dto.property_id}:availability`
      );
      
      // 6e. Send notification (async via queue)
      await this.notificationQueue.add('booking-confirmation', {
        booking_id: savedBooking.id,
        user_id: userId
      });
      
      return savedBooking;
    });
    
  } finally {
    // 7. Release lock
    await this.lockService.release(lockKey);
  }
}
```

#### Availability Service: Check Availability

```typescript
async checkAvailability(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
  usePessimisticLock: boolean = false
): Promise<boolean> {
  // 1. Check cache first
  const cacheKey = `property:${propertyId}:availability:${checkIn}:${checkOut}`;
  const cached = await this.cacheService.get(cacheKey);
  if (cached !== null) {
    return cached === 'true';
  }
  
  // 2. Query database
  const query = this.availabilityRepo
    .createQueryBuilder('avail')
    .where('avail.property_id = :propertyId', { propertyId })
    .andWhere('avail.date >= :checkIn', { checkIn })
    .andWhere('avail.date < :checkOut', { checkOut })
    .andWhere('avail.available = :available', { available: true });
  
  if (usePessimisticLock) {
    query.setLock('pessimistic_write');
  }
  
  const unavailableDates = await query.getCount();
  const totalDates = this.getDateRange(checkIn, checkOut).length;
  
  const isAvailable = unavailableDates === 0 && totalDates > 0;
  
  // 3. Cache result (5 minutes TTL)
  await this.cacheService.set(cacheKey, isAvailable ? 'true' : 'false', 300);
  
  return isAvailable;
}
```

#### Waitlist Service: Handle Cancellation

```typescript
async handleCancellation(bookingId: string): Promise<void> {
  const booking = await this.bookingService.findById(bookingId);
  
  if (!booking || booking.status !== 'cancelled') {
    return;
  }
  
  // 1. Find waitlisted users for this property and date range
  const waitlistEntries = await this.waitlistRepo.find({
    where: {
      property_id: booking.property_id,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      state: 'waitlisted'
    },
    order: { priority: 'ASC' },
    take: 5 // Notify top 5 users
  });
  
  if (waitlistEntries.length === 0) {
    return;
  }
  
  // 2. Create slot reservation (2 hour window)
  const reservation = await this.slotReservationService.create({
    property_id: booking.property_id,
    check_in_date: booking.check_in_date,
    check_out_date: booking.check_out_date,
    reservation_type: 'waitlist_invitation',
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
  });
  
  // 3. Update waitlist entries and send notifications
  for (const entry of waitlistEntries) {
    entry.state = 'invited';
    entry.slot_reservation_id = reservation.id;
    entry.notified_at = new Date();
    entry.expires_at = reservation.expires_at;
    await this.waitlistRepo.save(entry);
    
    // Send notification
    await this.notificationService.send({
      user_id: entry.user_id,
      type: 'waitlist_invitation',
      data: {
        property_id: booking.property_id,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        expires_at: reservation.expires_at
      }
    });
  }
}
```

### Caching Strategy

#### Cache Keys

```
# Property availability
property:{id}:availability:{checkIn}:{checkOut} → boolean (TTL: 5 min)

# Property details
property:{id}:details → JSON (TTL: 1 hour)

# Search results
search:properties:{hash(query)} → JSON array (TTL: 10 min)

# User session
session:{token} → JSON (TTL: 24 hours)

# Rate limiting
rate_limit:{user_id}:{endpoint} → counter (TTL: 1 min)
```

#### Cache Invalidation

- **Booking created/cancelled**: Invalidate `property:{id}:availability:*`
- **Property updated**: Invalidate `property:{id}:details` and search cache
- **User updated**: Invalidate `session:{token}`

### Security Implementation

#### Authentication Flow
1. User logs in with email/password
2. Server validates credentials
3. Server generates JWT (access token + refresh token)
4. Client stores tokens (httpOnly cookie or secure storage)
5. Client includes access token in Authorization header
6. Server validates token on each request
7. On token expiry, client uses refresh token to get new access token

#### Rate Limiting
- **Sliding Window**: Redis-based, per user/IP
- **Limits**:
  - General API: 100 requests/minute
  - Booking creation: 10 requests/minute
  - Search: 200 requests/minute
  - Authentication: 5 requests/minute

### Monitoring & Observability

#### Metrics
- **API Metrics**: Request rate, latency (p50, p95, p99), error rate
- **Business Metrics**: Bookings/day, revenue, conversion rate
- **System Metrics**: CPU, memory, database connections, cache hit rate

#### Logging
- **Structured Logging**: JSON format
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Key Events**: Booking created, payment processed, errors

#### Alerts
- **High Error Rate**: > 5% errors for 5 minutes
- **High Latency**: p95 > 500ms for 5 minutes
- **Database Issues**: Connection pool exhaustion
- **Payment Failures**: > 10% failure rate

---

## Summary

This system design provides a comprehensive blueprint for building a scalable, reliable property booking platform. Key highlights:

1. **Multi-layer concurrency control** prevents double bookings
2. **Caching strategy** ensures fast response times
3. **Microservices architecture** enables horizontal scaling
4. **Comprehensive database design** with proper indexing
5. **Waitlist system** increases booking fill rates
6. **Robust payment processing** with idempotency
7. **Geospatial search** for location-based queries

The system is designed to handle 10,000+ RPS, 1M+ properties, and 10M+ users while maintaining 99.9% uptime and sub-100ms response times for read operations.
