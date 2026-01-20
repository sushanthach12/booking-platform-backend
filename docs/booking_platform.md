# Booking Platform - Simplified Implementation Guide

> **Goal**: Build a production-ready backend for a property booking platform that solves the core problem: **preventing double bookings** while handling concurrent users, managing real-time availability, and processing secure payments.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Problems to Solve](#core-problems-to-solve)
3. [Standout Features](#standout-features)
4. [Tech Stack](#tech-stack)
5. [System Architecture](#system-architecture)
6. [Database Design](#database-design)
7. [API Design](#api-design)
8. [Implementation Details](#implementation-details)
9. [Testing Strategy](#testing-strategy)
10. [Deployment](#deployment)

---

## Project Overview

### What We're Building

A property booking platform where:
- **Guests** search and book properties
- **Hosts** list properties and manage availability
- **Core Problem**: Prevent double bookings when multiple users try to book the same property for the same dates simultaneously

### Key User Roles

1. **Guests**: Search properties, make bookings, view their reservations
2. **Hosts**: List properties, manage availability calendar, view bookings
3. **Admins**: Manage platform operations

---

## Core Problems to Solve

### Problem 1: Preventing Double Bookings (CRITICAL)

**The Problem**: 
When two users try to book the same property for overlapping dates at the same time, both might succeed, causing a double booking.

**Why It Happens**:
- User A checks availability → sees property is available
- User B checks availability → also sees property is available
- User A creates booking → succeeds
- User B creates booking → also succeeds (WRONG!)

**Solution**: Multi-layer concurrency control
1. **Distributed Lock** (Redis): Lock the property + date range before checking availability
2. **Database Transaction** with pessimistic locking: `SELECT ... FOR UPDATE` to lock rows
3. **Optimistic Locking**: Version field to detect concurrent modifications
4. **Idempotency Keys**: Prevent duplicate booking requests

**Implementation Flow**:
```
1. Check availability in Redis cache (fast path)
2. Acquire distributed lock: lock:property:{id}:{check_in}:{check_out}
3. Re-validate availability in database with pessimistic lock
4. Create booking in database transaction
5. Update availability calendar atomically
6. Release lock
7. Invalidate cache
```

---

### Problem 2: Real-Time Availability Management

**The Problem**: 
Maintaining accurate availability across thousands of properties with millions of date combinations, updated instantly as bookings are made.

**Solution**: Hybrid caching strategy
- **Redis Cache**: Hot data (next 90 days) for fast lookups
- **PostgreSQL**: Source of truth for all dates
- **Event-driven updates**: Invalidate cache when bookings change

**Data Structure**:
```
Redis: property:{id}:availability:{date} → {available: boolean, price: number}
PostgreSQL: availability_calendar table with date ranges
```

---

### Problem 3: Fast Location-Based Search

**The Problem**: 
Finding properties near a location quickly, even with thousands of properties.

**Solution**: 
- **PostGIS** for geospatial queries
- **Spatial indexes** (GIST) for fast location searches
- **Redis caching** for popular search queries

---

### Problem 4: Secure Payment Processing

**The Problem**: 
Processing payments reliably, handling failures, and preventing duplicate charges.

**Solution**:
- **Idempotent payment API**: Unique payment tokens
- **Payment state machine**: Clear states (pending → processing → succeeded/failed)
- **Webhook handling**: Async payment status updates
- **Retry logic**: Handle transient failures

---

## Standout Features

### Feature 1: Waitlist & Auto-Rebooking System

**The Problem**: 
When a property is fully booked, users miss out. If someone cancels, the slot often goes unfilled because interested users don't know it's available again.

**The Solution**: 
- Users can join a waitlist for fully booked properties
- When a cancellation happens, waitlisted users are automatically notified
- First-come-first-served booking opportunity (with time limit)
- Prevents empty slots and maximizes host revenue

**Why It Stands Out**:
- **Increases bookings by 15-20%** (fills cancelled slots automatically)
- **Better user experience** - Users don't have to keep checking availability
- **Host benefit** - Reduces lost revenue from cancellations
- **Competitive advantage** - Most platforms don't offer this

**Technical Implementation**:
```
1. User joins waitlist → Store in waitlist table with priority (timestamp)
2. Cancellation happens → Trigger event
3. Query waitlist for that property + date range
4. Send notifications to top N users (e.g., first 5)
5. First user to book within time window (e.g., 2 hours) gets the slot
6. If no one books, release to next batch or mark as available
```

**Database Schema**:
```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  user_id UUID NOT NULL REFERENCES users(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  priority BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000, -- Timestamp in milliseconds (lower = higher priority)
  state VARCHAR(30) DEFAULT 'waitlisted', -- waitlisted, invited, booking_in_progress, booking_confirmed, expired, cancelled
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
CREATE INDEX idx_waitlist_state ON waitlist(state, expires_at) WHERE state IN ('invited', 'booking_in_progress');

-- Slot reservations prevent double booking
CREATE TABLE slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  waitlist_entry_id UUID NOT NULL REFERENCES waitlist(id),
  reserved_until TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'reserved', -- reserved, booked, expired, released
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent overlapping reservations for same property/dates
  EXCLUDE USING GIST (
    property_id WITH =,
    daterange(check_in_date, check_out_date) WITH &&
  ) WHERE (status IN ('reserved', 'booked')),
  
  -- One active reservation per waitlist entry
  UNIQUE(waitlist_entry_id) WHERE (status = 'reserved')
);

CREATE INDEX idx_slot_reservations_active ON slot_reservations(property_id, check_in_date, check_out_date) 
  WHERE status = 'reserved';
CREATE INDEX idx_slot_reservations_expiry ON slot_reservations(reserved_until) 
  WHERE status = 'reserved';

-- Booking invitations track the invitation lifecycle
CREATE TABLE booking_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_entry_id UUID NOT NULL REFERENCES waitlist(id),
  slot_reservation_id UUID NOT NULL REFERENCES slot_reservations(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  user_id UUID NOT NULL REFERENCES users(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  booking_window_duration INTEGER NOT NULL, -- milliseconds
  status VARCHAR(20) DEFAULT 'active', -- active, accepted, expired, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP
);

CREATE INDEX idx_booking_invitations_active ON booking_invitations(status, expires_at) 
  WHERE status = 'active';
CREATE INDEX idx_booking_invitations_user ON booking_invitations(user_id, status);
```

**Implementation Flow**:
```typescript
// When cancellation happens
async handleCancellation(bookingId: string) {
  const booking = await this.getBooking(bookingId);
  
  // STEP 1: Identify affected inventory
  const affectedInventory = {
    propertyId: booking.propertyId,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    numberOfNights: this.calculateNights(booking.checkInDate, booking.checkOutDate),
    roomId: booking.roomId, // If multi-room property
    propertyType: booking.propertyType
  };
  
  // STEP 2: Query waitlist ordered by priority
  const waitlistEntries = await this.waitlistRepo.findByPropertyAndDates(
    affectedInventory.propertyId,
    affectedInventory.checkInDate,
    affectedInventory.checkOutDate,
    {
      state: WaitlistState.WAITLISTED,
      orderBy: 'priority ASC', // Lower priority number = higher priority (FCFS)
      limit: 100 // Get enough to filter
    }
  );
  
  if (waitlistEntries.length === 0) {
    // No waitlist - release inventory to general availability
    await this.releaseInventoryToGeneral(affectedInventory);
    return;
  }
  
  // STEP 3: Pick top N users (configurable, default: 1 for fairness, up to 3 for high demand)
  const topN = this.calculateTopN(waitlistEntries.length); // Returns 1-3 based on demand
  const selectedUsers = waitlistEntries.slice(0, topN);
  
  // STEP 4: Create booking invitations with expiry
  const bookingWindowDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  const expiresAt = new Date(Date.now() + bookingWindowDuration);
  
  const invitations = await Promise.all(
    selectedUsers.map(async (waitlistEntry) => {
      // Create slot reservation to prevent double booking
      const slotReservation = await this.createSlotReservation({
        propertyId: affectedInventory.propertyId,
        checkInDate: affectedInventory.checkInDate,
        checkOutDate: affectedInventory.checkOutDate,
        waitlistEntryId: waitlistEntry.id,
        reservedUntil: expiresAt
      });
      
      // Create booking invitation
      const invitation = await this.createBookingInvitation({
        waitlistEntryId: waitlistEntry.id,
        slotReservationId: slotReservation.id,
        propertyId: affectedInventory.propertyId,
        checkInDate: affectedInventory.checkInDate,
        checkOutDate: affectedInventory.checkOutDate,
        expiresAt,
        bookingWindowDuration
      });
      
      // Update waitlist entry state
      await this.waitlistRepo.update(waitlistEntry.id, {
        state: WaitlistState.INVITED,
        slotReservationId: slotReservation.id,
        notifiedAt: new Date(),
        expiresAt
      });
      
      return invitation;
    })
  );
  
  // STEP 5: Send notifications
  await Promise.all(
    invitations.map(invitation => 
      this.notificationService.sendWaitlistInvitation(invitation)
    )
  );
  
  // Schedule expiry checks for each invitation
  invitations.forEach(invitation => {
    this.scheduleInvitationExpiry(invitation.id, invitation.expiresAt);
  });
}

// Helper: Calculate top N based on demand
private calculateTopN(waitlistCount: number): number {
  if (waitlistCount === 0) return 0;
  if (waitlistCount <= 5) return 1;      // Low demand: sequential (fair)
  if (waitlistCount <= 20) return 2;     // Medium demand: notify 2
  return 3;                              // High demand: notify 3 (first to book wins)
}

// Type definitions
interface BookingInvitation {
  id: string;
  waitlistEntryId: string;
  slotReservationId: string;
  propertyId: string;
  userId: string;
  checkInDate: Date;
  checkOutDate: Date;
  expiresAt: Date;
  bookingWindowDuration: number; // milliseconds
  status: 'active' | 'accepted' | 'expired' | 'cancelled';
  createdAt: Date;
  acceptedAt?: Date;
}

interface AffectedInventory {
  propertyId: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  roomId?: string;
  propertyType: string;
}

  // Helper: Create slot reservation (prevents double booking)
  private async createSlotReservation(params: {
    propertyId: string;
    checkInDate: Date;
    checkOutDate: Date;
    waitlistEntryId: string;
    reservedUntil: Date;
  }): Promise<SlotReservation> {
  const lockKey = `lock:slot:${params.propertyId}:${params.checkInDate}`;
  const lock = await this.redis.acquireLock(lockKey, 5000);
  
  try {
    return await this.dataSource.transaction(async (manager) => {
      // Check for conflicts with pessimistic lock
      const conflicts = await manager
        .createQueryBuilder(SlotReservation, 'sr')
        .where('sr.property_id = :propertyId', { propertyId: params.propertyId })
        .andWhere('sr.check_in_date < :checkOut', { checkOut: params.checkOutDate })
        .andWhere('sr.check_out_date > :checkIn', { checkIn: params.checkInDate })
        .andWhere('sr.status = :status', { status: 'reserved' })
        .setLock('pessimistic_write')
        .getCount();
      
      if (conflicts > 0) {
        throw new ConflictException('Slot already reserved');
      }
      
      // Create reservation
      return await manager.save(SlotReservation, {
        propertyId: params.propertyId,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        waitlistEntryId: params.waitlistEntryId,
        reservedUntil: params.reservedUntil,
        status: 'reserved'
      });
    });
  } finally {
    await this.redis.releaseLock(lockKey, lock);
  }
}

// Helper: Create booking invitation
private async createBookingInvitation(params: {
  waitlistEntryId: string;
  slotReservationId: string;
  propertyId: string;
  checkInDate: Date;
  checkOutDate: Date;
  expiresAt: Date;
  bookingWindowDuration: number;
}): Promise<BookingInvitation> {
  const waitlistEntry = await this.waitlistRepo.findById(params.waitlistEntryId);
  
  return await this.bookingInvitationRepo.create({
    waitlistEntryId: params.waitlistEntryId,
    slotReservationId: params.slotReservationId,
    propertyId: params.propertyId,
    userId: waitlistEntry.userId,
    checkInDate: params.checkInDate,
    checkOutDate: params.checkOutDate,
    expiresAt: params.expiresAt,
    bookingWindowDuration: params.bookingWindowDuration,
    status: 'active'
  });
}

// Helper: Release inventory to general availability
private async releaseInventoryToGeneral(inventory: AffectedInventory): Promise<void> {
  await this.availabilityService.releaseDates({
    propertyId: inventory.propertyId,
    checkInDate: inventory.checkInDate,
    checkOutDate: inventory.checkOutDate,
    roomId: inventory.roomId
  });
}

// Helper: Schedule invitation expiry check
private scheduleInvitationExpiry(invitationId: string, expiresAt: Date): void {
  const delay = expiresAt.getTime() - Date.now();
  
  if (delay > 0) {
    this.expiryQueue.add(
      'check-invitation-expiry',
      { invitationId },
      { delay }
    );
  }
}
```

---

### Feature 2: Smart Price Drop Alerts

**The Problem**: 
Users are price-sensitive but don't want to constantly check if prices have dropped. Hosts want to fill empty slots but don't know who to notify.

**The Solution**:
- Users can set price alerts for properties they're interested in
- When price drops below their threshold, instant notification
- Automatic booking option (optional) - "Book automatically if price drops to X"
- Helps hosts fill last-minute slots with dynamic pricing

**Why It Stands Out**:
- **Increases conversions by 25-30%** (price-sensitive users get notified)
- **Reduces host vacancy** - Fills empty slots with price drops
- **User retention** - Keeps users engaged even if they don't book immediately
- **Data-driven pricing** - Hosts can see demand signals from alert subscriptions

**Technical Implementation**:
```
1. User sets price alert → Store alert with target price
2. Price changes (host updates or dynamic pricing) → Check alerts
3. If new price <= target price → Send notification
4. Optional: Auto-booking if user enabled it
5. Track conversion rate from alerts
```

**Database Schema**:
```sql
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  user_id UUID REFERENCES users(id),
  target_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2), -- Snapshot when alert was set
  auto_book BOOLEAN DEFAULT false, -- Auto-booking enabled?
  notified_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, triggered, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, user_id) -- One alert per user per property
);

CREATE INDEX idx_price_alerts_property ON price_alerts(property_id, status) WHERE status = 'active';
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id, status) WHERE status = 'active';
```

**Implementation Flow**:
```typescript
// When price changes (host update or dynamic pricing)
async onPriceChange(propertyId: string, newPrice: number) {
  // Find active alerts for this property
  const alerts = await this.priceAlertRepo.findActiveByProperty(propertyId);
  
  for (const alert of alerts) {
    if (newPrice <= alert.targetPrice) {
      // Price dropped to target!
      
      if (alert.autoBook) {
        // Auto-booking enabled - create booking automatically
        await this.autoBookFromAlert(alert, newPrice);
      } else {
        // Just notify user
        await this.notificationService.sendPriceDropAlert(alert, newPrice);
      }
      
      // Mark alert as triggered
      await this.priceAlertRepo.update(alert.id, {
        status: 'triggered',
        notifiedAt: new Date()
      });
    }
  }
}

// Auto-booking implementation
async autoBookFromAlert(alert: PriceAlert, price: number) {
  try {
    // Check availability first
    const property = await this.propertyRepo.findById(alert.propertyId);
    const isAvailable = await this.checkAvailability(
      alert.propertyId,
      // Use default dates or alert-specific dates
    );
    
    if (isAvailable) {
      // Create booking automatically
      const booking = await this.bookingService.createBooking({
        propertyId: alert.propertyId,
        guestId: alert.userId,
        // ... other booking details
        totalPrice: price,
      }, generateIdempotencyKey());
      
      // Notify user of auto-booking
      await this.notificationService.sendAutoBookingConfirmation(booking);
    }
  } catch (error) {
    // If auto-booking fails, just notify user of price drop
    await this.notificationService.sendPriceDropAlert(alert, price);
  }
}
```

**Business Value**:
- **For Guests**: Never miss a good deal, get notified when prices drop
- **For Hosts**: Fill empty slots by automatically notifying price-sensitive users
- **For Platform**: Higher conversion rates, better user engagement, more bookings

---

## Waitlist & Price Alert System - Critical Design Decisions

> **This section addresses all critical design questions to ensure production-ready, legally compliant, and user-trustworthy implementation.**

### 1. User Expectations & Trust

#### Clear State Differentiation

**Visual States & UI Indicators:**

```typescript
enum WaitlistState {
  WAITLISTED = 'waitlisted',           // User on waitlist, no slot available
  INVITED = 'invited',                 // Slot available, booking window active
  BOOKING_IN_PROGRESS = 'booking_in_progress', // User clicked "Book Now"
  BOOKING_CONFIRMED = 'booking_confirmed',     // Payment successful, confirmed
  EXPIRED = 'expired',                 // Booking window expired
  CANCELLED = 'cancelled'              // User removed from waitlist
}
```

**UI Design Requirements:**

1. **Waitlisted State** (No availability):
   - Badge: "On Waitlist" (gray, secondary)
   - Icon: Clock icon
   - Message: "You're on the waitlist. We'll notify you if a spot opens up."
   - **NO** property address shown
   - **NO** host contact shown
   - **NO** check-in instructions
   - Clear disclaimer: "Waitlist does not guarantee availability"

2. **Invited State** (Slot available):
   - Badge: "Booking Available" (green, prominent)
   - Icon: Bell with checkmark
   - Countdown timer: "Reserve within 2:00:00"
   - Message: "A spot opened up! Book now to secure your stay."
   - **Property address visible** (but booking not confirmed)
   - **Host contact visible** (but booking not confirmed)
   - **Check-in instructions visible** (but booking not confirmed)
   - Warning: "This spot is not reserved until payment is confirmed"

3. **Booking Confirmed State**:
   - Badge: "Confirmed" (blue, primary)
   - Icon: Checkmark in circle
   - Full access to all information
   - Travel planning allowed

**Exact Wording Standards:**

```typescript
const MESSAGES = {
  JOIN_WAITLIST: {
    title: "You're on the waitlist!",
    body: "We'll notify you immediately if a spot opens up for these dates. This does not guarantee availability.",
    disclaimer: "Waitlist does not guarantee booking. You'll receive a notification if availability opens."
  },
  
  INVITED: {
    title: "Booking Available - Act Fast!",
    body: "A spot opened up! You have exclusive access for the next 2 hours to book this property.",
    urgency: "This exclusive window expires in {time}. Other waitlisted users may be notified if you don't book.",
    cta: "Book Now"
  },
  
  EXPIRED: {
    title: "Booking Window Expired",
    body: "Your exclusive booking window has expired. The spot may have been offered to other waitlisted users.",
    action: "You can join the waitlist again if the property is still unavailable."
  }
};
```

**Travel Planning Rules:**
- ✅ **Allowed**: Only when `status === 'booking_confirmed'` AND `payment_status === 'paid'`
- ❌ **Not Allowed**: During `waitlisted` or `invited` states
- Clear UI: Disable "Plan Trip" button until confirmed

---

### 2. State Management & Guarantees

#### Complete State Machine

```typescript
interface WaitlistEntry {
  id: string;
  propertyId: string;
  userId: string;
  checkInDate: Date;
  checkOutDate: Date;
  state: WaitlistState;
  priority: number; // Timestamp-based, lower = earlier
  notifiedAt?: Date;
  expiresAt?: Date;
  bookingWindowDuration: number; // milliseconds (default: 2 hours)
  slotReservationId?: string; // Links to reserved slot
  createdAt: Date;
  updatedAt: Date;
}

// State transitions (strictly enforced)
const STATE_TRANSITIONS: Record<WaitlistState, WaitlistState[]> = {
  [WaitlistState.WAITLISTED]: [WaitlistState.INVITED, WaitlistState.CANCELLED],
  [WaitlistState.INVITED]: [
    WaitlistState.BOOKING_IN_PROGRESS,
    WaitlistState.EXPIRED,
    WaitlistState.CANCELLED
  ],
  [WaitlistState.BOOKING_IN_PROGRESS]: [
    WaitlistState.BOOKING_CONFIRMED,
    WaitlistState.INVITED, // If payment fails
    WaitlistState.EXPIRED
  ],
  [WaitlistState.BOOKING_CONFIRMED]: [], // Terminal state
  [WaitlistState.EXPIRED]: [WaitlistState.WAITLISTED], // Can rejoin
  [WaitlistState.CANCELLED]: [] // Terminal state
};
```

#### Information Access Rules

**Property Address, Host Contact, Check-in Instructions:**
- ✅ **Visible**: `invited`, `booking_in_progress`, `booking_confirmed`
- ❌ **Hidden**: `waitlisted`, `expired`, `cancelled`
- **Reason**: Only show when user has active booking opportunity

**Database-Level Enforcement:**
```sql
-- Add state column with check constraint
ALTER TABLE waitlist 
ADD COLUMN state VARCHAR(30) DEFAULT 'waitlisted' 
CHECK (state IN ('waitlisted', 'invited', 'booking_in_progress', 'booking_confirmed', 'expired', 'cancelled'));

-- Add slot reservation tracking
ALTER TABLE waitlist
ADD COLUMN slot_reservation_id UUID REFERENCES slot_reservations(id);
```

#### Booking Window Expiry Handling

```typescript
async handleBookingWindowExpiry(waitlistEntryId: string) {
  const entry = await this.waitlistRepo.findById(waitlistEntryId);
  
  if (entry.state !== WaitlistState.INVITED && 
      entry.state !== WaitlistState.BOOKING_IN_PROGRESS) {
    return; // Already handled
  }
  
  // Release slot reservation
  if (entry.slotReservationId) {
    await this.slotReservationService.release(entry.slotReservationId);
  }
  
  // Update state
  await this.waitlistRepo.update(entry.id, {
    state: WaitlistState.EXPIRED,
    expiresAt: new Date()
  });
  
  // Notify user
  await this.notificationService.sendExpiryNotification(entry);
  
  // Offer to next user in queue
  await this.offerSlotToNextUser(entry.propertyId, entry.checkInDate, entry.checkOutDate);
}
```

#### Double Booking Prevention

**Slot Reservation System:**
```typescript
interface SlotReservation {
  id: string;
  propertyId: string;
  checkInDate: Date;
  checkOutDate: Date;
  waitlistEntryId: string;
  reservedUntil: Date; // Expiry timestamp
  status: 'reserved' | 'booked' | 'expired' | 'released';
  createdAt: Date;
}

// When offering slot to user
async offerSlotToUser(waitlistEntry: WaitlistEntry): Promise<SlotReservation> {
  // Use distributed lock to prevent race conditions
  const lockKey = `lock:slot:${waitlistEntry.propertyId}:${waitlistEntry.checkInDate}`;
  const lock = await this.redis.acquireLock(lockKey, 5000);
  
  try {
    // Check if slot is already reserved
    const existingReservation = await this.slotReservationRepo.findActive(
      waitlistEntry.propertyId,
      waitlistEntry.checkInDate,
      waitlistEntry.checkOutDate
    );
    
    if (existingReservation) {
      throw new ConflictException('Slot already reserved by another user');
    }
    
    // Create reservation
    const reservation = await this.slotReservationRepo.create({
      propertyId: waitlistEntry.propertyId,
      checkInDate: waitlistEntry.checkInDate,
      checkOutDate: waitlistEntry.checkOutDate,
      waitlistEntryId: waitlistEntry.id,
      reservedUntil: addHours(new Date(), 2), // 2 hour window
      status: 'reserved'
    });
    
    // Update waitlist entry
    await this.waitlistRepo.update(waitlistEntry.id, {
      state: WaitlistState.INVITED,
      slotReservationId: reservation.id,
      notifiedAt: new Date(),
      expiresAt: reservation.reservedUntil
    });
    
    return reservation;
  } finally {
    await this.redis.releaseLock(lockKey, lock);
  }
}
```

**Database Constraints:**
```sql
-- Prevent overlapping slot reservations
CREATE TABLE slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  waitlist_entry_id UUID REFERENCES waitlist(id),
  reserved_until TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'reserved',
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent overlapping reservations for same property/dates
  EXCLUDE USING GIST (
    property_id WITH =,
    daterange(check_in_date, check_out_date) WITH &&
  ) WHERE (status = 'reserved' OR status = 'booked')
);

CREATE INDEX idx_slot_reservations_active 
ON slot_reservations(property_id, check_in_date, check_out_date) 
WHERE status IN ('reserved', 'booked');
```

---

### 3. Booking Window & Fairness

#### Optimal Booking Window Duration

**Recommendation: 2 hours**

**Reasoning:**
- **Too Short (< 1 hour)**: Users may miss notifications, creates pressure
- **Too Long (> 4 hours)**: Slots stay locked too long, reduces fill rate
- **2 Hours**: Balance between user convenience and slot fill speed
- **Configurable**: Allow hosts to set custom windows (1-4 hours)

**Implementation:**
```typescript
const BOOKING_WINDOW_DURATION = {
  DEFAULT: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  MIN: 1 * 60 * 60 * 1000,      // 1 hour minimum
  MAX: 4 * 60 * 60 * 1000,      // 4 hours maximum
  HOST_CONFIGURABLE: true
};
```

#### Notification Strategy

**Recommendation: Sequential (One at a Time)**

**Why Sequential:**
- Prevents race conditions
- Fair first-come-first-served
- Easier to track and debug
- Better user experience (no confusion)

**Implementation:**
```typescript
async handleCancellation(bookingId: string) {
  const booking = await this.getBooking(bookingId);
  
  // Find top priority waitlist entry
  const topEntry = await this.waitlistRepo.findTopPriority(
    booking.propertyId,
    booking.checkInDate,
    booking.checkOutDate,
    { state: WaitlistState.WAITLISTED }
  );
  
  if (!topEntry) {
    // No waitlist, release to general availability
    await this.releaseAvailability(booking);
    return;
  }
  
  // Reserve slot for this user
  const reservation = await this.offerSlotToUser(topEntry);
  
  // Send notification
  await this.notificationService.sendWaitlistInvitation(topEntry, reservation);
  
  // Schedule expiry check
  await this.scheduleExpiryCheck(reservation.id, reservation.reservedUntil);
}
```

**Alternative: Batch Notification (If High Demand)**

```typescript
// Only use if > 50 users on waitlist AND high cancellation rate
async handleCancellationWithBatch(bookingId: string) {
  const booking = await this.getBooking(bookingId);
  const waitlistCount = await this.waitlistRepo.count(
    booking.propertyId,
    booking.checkInDate,
    booking.checkOutDate
  );
  
  if (waitlistCount > 50) {
    // Notify top 3 users simultaneously
    const topEntries = await this.waitlistRepo.findTopN(3, {
      propertyId: booking.propertyId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      state: WaitlistState.WAITLISTED
    });
    
    // First to book wins (race condition handled by slot reservation)
    for (const entry of topEntries) {
      await this.offerSlotToUser(entry); // Each creates separate reservation
      // Only first successful reservation wins
    }
  } else {
    // Sequential for fairness
    await this.handleCancellation(bookingId);
  }
}
```

#### Priority Ordering

**Algorithm: First-Come-First-Served (FCFS) with Timestamp**

```typescript
// Priority = timestamp in milliseconds (lower = earlier = higher priority)
async joinWaitlist(dto: JoinWaitlistDto): Promise<WaitlistEntry> {
  const priority = Date.now(); // Current timestamp
  
  const entry = await this.waitlistRepo.create({
    ...dto,
    priority,
    state: WaitlistState.WAITLISTED,
    createdAt: new Date()
  });
  
  return entry;
}

// Query with priority ordering
async findTopPriority(
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<WaitlistEntry | null> {
  return await this.waitlistRepo
    .createQueryBuilder('waitlist')
    .where('waitlist.property_id = :propertyId', { propertyId })
    .andWhere('waitlist.check_in_date = :checkIn', { checkIn })
    .andWhere('waitlist.check_out_date = :checkOut', { checkOut })
    .andWhere('waitlist.state = :state', { state: WaitlistState.WAITLISTED })
    .orderBy('waitlist.priority', 'ASC') // Lower priority number = higher priority
    .limit(1)
    .getOne();
}
```

**Transparency:**
- Show user their position: "You're #5 on the waitlist"
- Update position in real-time
- Show estimated wait time (based on historical cancellation rates)

---

### 4. Failure & Edge Cases

#### Payment Failure During Booking Window

```typescript
async processWaitlistBooking(waitlistEntryId: string, paymentMethod: string) {
  const entry = await this.waitlistRepo.findById(waitlistEntryId);
  
  if (entry.state !== WaitlistState.INVITED) {
    throw new BadRequestException('Booking window expired or invalid state');
  }
  
  // Update state to prevent other operations
  await this.waitlistRepo.update(entry.id, {
    state: WaitlistState.BOOKING_IN_PROGRESS
  });
  
  try {
    // Attempt payment
    const payment = await this.paymentService.processPayment({
      bookingId: entry.slotReservationId, // Use reservation as booking
      amount: entry.totalPrice,
      method: paymentMethod
    });
    
    if (payment.status === 'succeeded') {
      // Create confirmed booking
      const booking = await this.bookingService.createConfirmedBooking({
        propertyId: entry.propertyId,
        guestId: entry.userId,
        checkInDate: entry.checkInDate,
        checkOutDate: entry.checkOutDate,
        totalPrice: entry.totalPrice
      });
      
      // Update waitlist entry
      await this.waitlistRepo.update(entry.id, {
        state: WaitlistState.BOOKING_CONFIRMED,
        bookingId: booking.id
      });
      
      // Mark slot reservation as booked
      await this.slotReservationRepo.update(entry.slotReservationId, {
        status: 'booked'
      });
      
      return booking;
    } else {
      // Payment failed - return to invited state
      await this.waitlistRepo.update(entry.id, {
        state: WaitlistState.INVITED
      });
      throw new PaymentFailedException('Payment processing failed');
    }
  } catch (error) {
    // On any error, return to invited state (if still within window)
    if (entry.expiresAt > new Date()) {
      await this.waitlistRepo.update(entry.id, {
        state: WaitlistState.INVITED
      });
    } else {
      await this.waitlistRepo.update(entry.id, {
        state: WaitlistState.EXPIRED
      });
    }
    throw error;
  }
}
```

#### App Crash / User Closes App

**Solution: State Persistence + Recovery**

```typescript
// Store booking attempt state
interface BookingAttempt {
  id: string;
  waitlistEntryId: string;
  state: 'initiated' | 'payment_processing' | 'completed' | 'failed';
  expiresAt: Date;
  createdAt: Date;
}

// On app return, check for active booking attempts
async resumeBooking(waitlistEntryId: string): Promise<BookingAttempt | null> {
  const attempt = await this.bookingAttemptRepo.findActive(waitlistEntryId);
  
  if (attempt && attempt.expiresAt > new Date()) {
    // Resume booking
    return attempt;
  }
  
  // Check if waitlist entry still valid
  const entry = await this.waitlistRepo.findById(waitlistEntryId);
  if (entry.state === WaitlistState.INVITED && entry.expiresAt > new Date()) {
    return null; // Can start fresh booking
  }
  
  return null; // Window expired
}
```

#### Race Condition Prevention

**Multi-Layer Protection:**

1. **Distributed Lock (Redis)**
2. **Database Transaction with Pessimistic Lock**
3. **Slot Reservation System**
4. **Idempotency Keys**

```typescript
async bookFromWaitlist(
  waitlistEntryId: string,
  idempotencyKey: string
): Promise<Booking> {
  // 1. Check idempotency
  const existing = await this.bookingRepo.findByToken(idempotencyKey);
  if (existing) return existing;
  
  const entry = await this.waitlistRepo.findById(waitlistEntryId);
  
  // 2. Acquire distributed lock
  const lockKey = `lock:waitlist-booking:${waitlistEntryId}`;
  const lock = await this.redis.acquireLock(lockKey, 30000);
  
  try {
    // 3. Re-validate state in database (pessimistic lock)
    const lockedEntry = await this.waitlistRepo.findOneWithLock(waitlistEntryId);
    
    if (lockedEntry.state !== WaitlistState.INVITED) {
      throw new ConflictException('Booking window expired or already booked');
    }
    
    if (lockedEntry.expiresAt <= new Date()) {
      throw new ConflictException('Booking window expired');
    }
    
    // 4. Check slot reservation still valid
    const reservation = await this.slotReservationRepo.findById(
      lockedEntry.slotReservationId
    );
    
    if (reservation.status !== 'reserved') {
      throw new ConflictException('Slot no longer available');
    }
    
    // 5. Create booking in transaction
    return await this.dataSource.transaction(async (manager) => {
      // Update waitlist entry
      await manager.update(WaitlistEntry, lockedEntry.id, {
        state: WaitlistState.BOOKING_IN_PROGRESS
      });
      
      // Create booking
      const booking = await manager.save(Booking, {
        propertyId: entry.propertyId,
        guestId: entry.userId,
        checkInDate: entry.checkInDate,
        checkOutDate: entry.checkOutDate,
        bookingToken: idempotencyKey,
        status: 'pending'
      });
      
      // Update slot reservation
      await manager.update(SlotReservation, reservation.id, {
        status: 'booked'
      });
      
      return booking;
    });
  } finally {
    await this.redis.releaseLock(lockKey, lock);
  }
}
```

---

### 5. Communication & UX Clarity

#### Message Templates

```typescript
const NOTIFICATION_TEMPLATES = {
  JOINED_WAITLIST: {
    subject: "You're on the waitlist!",
    body: `
      Hi {userName},
      
      You've joined the waitlist for {propertyName} from {checkIn} to {checkOut}.
      
      **What this means:**
      - You'll be notified immediately if a spot opens up
      - This does NOT guarantee availability
      - You're currently #{position} on the waitlist
      
      We'll send you an exclusive booking opportunity if a cancellation occurs.
      
      Best regards,
      The Booking Team
    `,
    disclaimer: "Waitlist does not guarantee booking. Availability is subject to cancellations."
  },
  
  SLOT_AVAILABLE: {
    subject: "🎉 Booking Available - Act Fast!",
    body: `
      Hi {userName},
      
      Great news! A spot opened up for {propertyName} from {checkIn} to {checkOut}.
      
      **You have exclusive access for the next 2 hours to book this property.**
      
      Price: ${price}
      Address: {address} (visible after booking confirmation)
      
      [Book Now] - Expires in {timeRemaining}
      
      **Important:**
      - This exclusive window expires in {expiresAt}
      - If you don't book within 2 hours, the spot may be offered to other waitlisted users
      - Your booking is NOT confirmed until payment is successful
      
      Don't miss out!
    `,
    urgency: "moderate", // moderate, high, critical
    cta: "Book Now"
  },
  
  WINDOW_EXPIRED: {
    subject: "Booking Window Expired",
    body: `
      Hi {userName},
      
      Your exclusive booking window for {propertyName} has expired.
      
      The spot may have been offered to other waitlisted users or released to general availability.
      
      You can:
      - Join the waitlist again if the property is still unavailable
      - Browse other available properties
      
      We'll notify you again if another spot opens up.
    `
  },
  
  BOOKING_CONFIRMED: {
    subject: "✅ Booking Confirmed!",
    body: `
      Hi {userName},
      
      Congratulations! Your booking for {propertyName} is confirmed.
      
      **Booking Details:**
      - Check-in: {checkIn}
      - Check-out: {checkOut}
      - Address: {fullAddress}
      - Host Contact: {hostContact}
      
      [View Booking Details] [Plan Your Trip]
      
      Your booking is now confirmed and you can proceed with travel planning.
    `
  }
};
```

#### Urgency Communication

**Guidelines:**
- ✅ **Moderate Urgency**: "You have 2 hours to book"
- ✅ **Clear Deadline**: Show countdown timer
- ❌ **Avoid**: "Last chance!", "Only 5 minutes left!" (creates panic)
- ✅ **Transparency**: "If you don't book, the spot may be offered to others"

**UI Countdown Timer:**
```typescript
<CountdownTimer
  expiresAt={waitlistEntry.expiresAt}
  onExpire={() => handleExpiry()}
  warningThreshold={15 * 60 * 1000} // 15 min warning
  criticalThreshold={5 * 60 * 1000}  // 5 min critical
/>
```

#### Priority Access vs Guarantee

**Clear Messaging:**
- ❌ **Never say**: "Guaranteed booking", "Reserved for you"
- ✅ **Always say**: "Exclusive booking opportunity", "Priority access", "First chance to book"
- ✅ **Disclaimers**: "Subject to availability", "Not confirmed until payment"

---

### 6. Host Experience & Transparency

#### Host Dashboard Features

```typescript
interface HostWaitlistDashboard {
  propertyId: string;
  waitlistStats: {
    totalWaitlisted: number;
    activeInvitations: number;
    convertedBookings: number;
    conversionRate: number;
  };
  waitlistByDateRange: Array<{
    checkIn: Date;
    checkOut: Date;
    waitlistCount: number;
    demandLevel: 'low' | 'medium' | 'high';
  }>;
  recentActivity: Array<{
    timestamp: Date;
    action: 'joined' | 'invited' | 'booked' | 'expired';
    userId: string;
  }>;
}
```

**Host Visibility:**
- ✅ Number of users on waitlist (aggregate, not individual names for privacy)
- ✅ Demand by date range
- ✅ Conversion metrics
- ✅ Recent waitlist activity
- ❌ Individual user details (privacy)

#### Host Protection

**Overbooking Prevention:**
```sql
-- Database constraint prevents overlapping bookings
ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING GIST (
  property_id WITH =,
  daterange(check_in_date, check_out_date) WITH &&
) WHERE (status = 'confirmed');
```

**Conflicting Bookings:**
- Slot reservation system prevents double-offers
- Database constraints prevent overlapping confirmed bookings
- Real-time availability updates

**Guest Misunderstandings:**
- Clear T&Cs: "Waitlist does not guarantee booking"
- Automated email disclaimers
- Support team training materials
- Dispute resolution process

#### Flexible Cancellation Policies

**Incentive System:**
```typescript
// Hosts with flexible cancellation get priority in waitlist notifications
interface HostCancellationPolicy {
  propertyId: string;
  policyType: 'flexible' | 'moderate' | 'strict';
  cancellationWindow: number; // days before check-in
}

// When calculating waitlist priority, boost properties with flexible policies
async calculateWaitlistPriority(entry: WaitlistEntry): Promise<number> {
  const property = await this.propertyRepo.findById(entry.propertyId);
  const basePriority = entry.priority; // Timestamp
  
  if (property.cancellationPolicy === 'flexible') {
    // Boost priority by 10% (lower number = higher priority)
    return basePriority * 0.9;
  }
  
  return basePriority;
}
```

---

### 7. Price Alerts & Auto-Booking Risks

#### Explicit Consent for Auto-Booking

**Multi-Step Consent Process:**

```typescript
interface PriceAlertConsent {
  step1: boolean; // "I understand price alerts"
  step2: boolean; // "I want to enable auto-booking"
  step3: boolean; // "I agree to automatic charges"
  priceCeiling: number; // Maximum price user agrees to
  paymentMethodId: string; // Pre-authorized payment method
  consentTimestamp: Date;
  ipAddress: string; // For legal compliance
}

async createPriceAlertWithAutoBook(dto: CreatePriceAlertDto): Promise<PriceAlert> {
  // Step 1: Validate consent
  if (!dto.consent?.step1 || !dto.consent?.step2 || !dto.consent?.step3) {
    throw new BadRequestException('Explicit consent required for auto-booking');
  }
  
  // Step 2: Validate price ceiling
  if (!dto.priceCeiling || dto.priceCeiling <= 0) {
    throw new BadRequestException('Price ceiling required for auto-booking');
  }
  
  // Step 3: Pre-authorize payment method
  const paymentMethod = await this.paymentService.validatePaymentMethod(
    dto.paymentMethodId,
    dto.userId
  );
  
  if (!paymentMethod.isValid) {
    throw new BadRequestException('Invalid or expired payment method');
  }
  
  // Step 4: Create alert with consent tracking
  const alert = await this.priceAlertRepo.create({
    ...dto,
    autoBook: true,
    priceCeiling: dto.priceCeiling,
    consent: dto.consent,
    status: 'active'
  });
  
  // Step 5: Send confirmation email with consent details
  await this.notificationService.sendAutoBookConsentConfirmation(alert);
  
  return alert;
}
```

**UI Consent Flow:**
```
1. [ ] I want to receive price drop alerts
2. [ ] I want to enable automatic booking when price drops
3. [ ] I understand that I will be charged automatically if:
   - Price drops to or below my target
   - Property is available
   - My payment method is valid
4. Set maximum price I'm willing to pay: $______
5. Select payment method: [Dropdown]
6. [Confirm] [Cancel]
```

#### Price Ceiling & Final Amount

```typescript
async triggerAutoBooking(alert: PriceAlert, newPrice: number): Promise<Booking | null> {
  // 1. Check price ceiling
  if (newPrice > alert.priceCeiling) {
    // Price dropped but still above ceiling - just notify
    await this.notificationService.sendPriceDropAlert(alert, newPrice);
    return null;
  }
  
  // 2. Calculate final amount (including fees, taxes)
  const finalAmount = await this.calculateTotalPrice({
    propertyId: alert.propertyId,
    basePrice: newPrice,
    checkIn: alert.checkInDate,
    checkOut: alert.checkOutDate
  });
  
  // 3. Check if final amount exceeds ceiling
  if (finalAmount > alert.priceCeiling) {
    // Final amount exceeds ceiling - notify user
    await this.notificationService.sendPriceExceededCeiling(alert, finalAmount);
    return null;
  }
  
  // 4. Show final amount in notification before auto-booking
  await this.notificationService.sendAutoBookWarning(alert, {
    basePrice: newPrice,
    fees: finalAmount - newPrice,
    total: finalAmount,
    willBookIn: '10 minutes' // Give user chance to cancel
  });
  
  // 5. Wait 10 minutes for user cancellation
  await this.delay(10 * 60 * 1000);
  
  // 6. Check if user cancelled
  const updatedAlert = await this.priceAlertRepo.findById(alert.id);
  if (updatedAlert.status === 'cancelled') {
    return null;
  }
  
  // 7. Proceed with auto-booking
  return await this.executeAutoBooking(alert, finalAmount);
}
```

#### Pre-Authorization

```typescript
async preAuthorizePaymentMethod(
  userId: string,
  paymentMethodId: string,
  amount: number
): Promise<PreAuthorization> {
  // Pre-authorize (not charge) to ensure payment method is valid
  const preAuth = await this.paymentService.preAuthorize({
    userId,
    paymentMethodId,
    amount,
    purpose: 'price_alert_auto_booking'
  });
  
  // Store pre-authorization
  await this.preAuthorizationRepo.create({
    userId,
    paymentMethodId,
    amount,
    preAuthToken: preAuth.token,
    expiresAt: addDays(new Date(), 30) // Valid for 30 days
  });
  
  return preAuth;
}

// Before auto-booking, verify pre-authorization still valid
async verifyPreAuthorization(alert: PriceAlert): Promise<boolean> {
  const preAuth = await this.preAuthorizationRepo.findActive(
    alert.userId,
    alert.paymentMethodId
  );
  
  if (!preAuth || preAuth.expiresAt < new Date()) {
    // Pre-auth expired - notify user to update payment method
    await this.notificationService.sendPreAuthExpired(alert);
    return false;
  }
  
  return true;
}
```

#### Price Drop + Availability Disappears

```typescript
async handlePriceChangeWithAvailability(
  propertyId: string,
  newPrice: number,
  availabilityStatus: 'available' | 'unavailable'
) {
  const alerts = await this.priceAlertRepo.findActiveByProperty(propertyId);
  
  for (const alert of alerts) {
    if (newPrice <= alert.targetPrice) {
      if (availabilityStatus === 'available') {
        // Price dropped AND available - proceed with auto-booking
        if (alert.autoBook) {
          await this.triggerAutoBooking(alert, newPrice);
        } else {
          await this.notificationService.sendPriceDropAlert(alert, newPrice);
        }
      } else {
        // Price dropped BUT unavailable - notify user
        await this.notificationService.sendPriceDropUnavailable(alert, newPrice);
        // Optionally: Convert to waitlist
        await this.offerWaitlistConversion(alert);
      }
    }
  }
}
```

---

### 8. Data Integrity & Technical Safeguards

#### Database Constraints

```sql
-- Prevent overlapping bookings
ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING GIST (
  property_id WITH =,
  daterange(check_in_date, check_out_date) WITH &&
) WHERE (status IN ('confirmed', 'pending'));

-- Prevent overlapping slot reservations
ALTER TABLE slot_reservations
ADD CONSTRAINT no_overlapping_reservations
EXCLUDE USING GIST (
  property_id WITH =,
  daterange(check_in_date, check_out_date) WITH &&
) WHERE (status IN ('reserved', 'booked'));

-- Ensure waitlist state transitions are valid
CREATE OR REPLACE FUNCTION validate_waitlist_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  IF OLD.state = 'waitlisted' AND NEW.state NOT IN ('invited', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid state transition from waitlisted';
  END IF;
  
  IF OLD.state = 'invited' AND NEW.state NOT IN ('booking_in_progress', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid state transition from invited';
  END IF;
  
  -- Add more transition validations...
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_state_transition_trigger
BEFORE UPDATE ON waitlist
FOR EACH ROW
EXECUTE FUNCTION validate_waitlist_state_transition();

-- Idempotency constraint
ALTER TABLE bookings
ADD CONSTRAINT unique_booking_token UNIQUE (booking_token);
```

#### Idempotent Booking Creation

```typescript
async createBooking(
  dto: CreateBookingDto,
  idempotencyKey: string
): Promise<Booking> {
  // Check idempotency first (fast path)
  const existing = await this.bookingRepo.findByToken(idempotencyKey);
  if (existing) {
    return existing; // Idempotent - return existing booking
  }
  
  // Proceed with booking creation...
  // Idempotency key stored in booking_token column
}
```

#### Locking Strategy

```typescript
// Multi-layer locking
async reserveSlot(propertyId: string, checkIn: Date, checkOut: Date): Promise<SlotReservation> {
  // Layer 1: Distributed lock (Redis)
  const redisLockKey = `lock:slot:${propertyId}:${checkIn}`;
  const redisLock = await this.redis.acquireLock(redisLockKey, 30000);
  
  try {
    // Layer 2: Database transaction with pessimistic lock
    return await this.dataSource.transaction(async (manager) => {
      // Check for conflicts with pessimistic lock
      const conflicts = await manager
        .createQueryBuilder(SlotReservation, 'sr')
        .where('sr.property_id = :propertyId', { propertyId })
        .andWhere('sr.check_in_date < :checkOut', { checkOut })
        .andWhere('sr.check_out_date > :checkIn', { checkIn })
        .andWhere('sr.status IN (:...statuses)', { statuses: ['reserved', 'booked'] })
        .setLock('pessimistic_write') // FOR UPDATE
        .getCount();
      
      if (conflicts > 0) {
        throw new ConflictException('Slot already reserved');
      }
      
      // Create reservation
      return await manager.save(SlotReservation, {
        propertyId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: 'reserved'
      });
    });
  } finally {
    await this.redis.releaseLock(redisLockKey, redisLock);
  }
}
```

#### Expiry Timer Enforcement

**Recommended: Event Queue (Bull) with Delayed Jobs**

```typescript
// When creating slot reservation
async createSlotReservation(reservation: SlotReservation): Promise<void> {
  await this.slotReservationRepo.save(reservation);
  
  // Schedule expiry check using Bull queue
  const delay = reservation.reservedUntil.getTime() - Date.now();
  
  await this.expiryQueue.add(
    'check-slot-expiry',
    { reservationId: reservation.id },
    {
      delay, // Execute at reservedUntil time
      attempts: 3, // Retry 3 times if job fails
      backoff: {
        type: 'exponential',
        delay: 60000 // 1 minute
      }
    }
  );
}

// Expiry job processor
@Processor('expiry-queue')
export class ExpiryProcessor {
  @Process('check-slot-expiry')
  async handleSlotExpiry(job: Job<{ reservationId: string }>) {
    const reservation = await this.slotReservationRepo.findById(job.data.reservationId);
    
    if (!reservation) {
      return; // Already handled
    }
    
    // Check if still reserved and expired
    if (reservation.status === 'reserved' && reservation.reservedUntil <= new Date()) {
      await this.handleBookingWindowExpiry(reservation.waitlistEntryId);
    }
  }
}
```

**Alternative: Cron Job (Less Precise)**

```typescript
// Run every 5 minutes
@Cron('*/5 * * * *')
async checkExpiredReservations() {
  const expired = await this.slotReservationRepo.findExpired();
  
  for (const reservation of expired) {
    await this.handleBookingWindowExpiry(reservation.waitlistEntryId);
  }
}
```

#### System Restart / Crash Recovery

```typescript
// On system startup, recover inconsistent states
async recoverInconsistentStates() {
  // 1. Find reservations that expired but weren't processed
  const expiredReservations = await this.slotReservationRepo.findExpiredUnprocessed();
  
  for (const reservation of expiredReservations) {
    await this.handleBookingWindowExpiry(reservation.waitlistEntryId);
  }
  
  // 2. Find bookings in progress that timed out
  const stuckBookings = await this.bookingRepo.findStuckInProgress();
  
  for (const booking of stuckBookings) {
    // Check if payment succeeded
    const payment = await this.paymentService.getPaymentStatus(booking.id);
    
    if (payment.status === 'succeeded') {
      // Payment succeeded but booking not confirmed - recover
      await this.confirmBooking(booking.id);
    } else {
      // Payment failed - release slot
      await this.releaseBookingSlot(booking);
    }
  }
  
  // 3. Find waitlist entries in invalid states
  const invalidEntries = await this.waitlistRepo.findInvalidStates();
  
  for (const entry of invalidEntries) {
    // Reset to valid state
    if (entry.expiresAt < new Date() && entry.state === 'invited') {
      await this.waitlistRepo.update(entry.id, { state: 'expired' });
    }
  }
}
```

---

### 9. Legal, Policy & Support Concerns

#### Terms & Conditions

**Required Disclaimers:**

```typescript
const TERMS_AND_CONDITIONS = {
  waitlist: `
    WAITLIST TERMS:
    
    1. Joining a waitlist does NOT guarantee availability or booking.
    2. Waitlist notifications provide priority access, not confirmed bookings.
    3. Booking is only confirmed upon successful payment.
    4. We reserve the right to offer slots to other users if your booking window expires.
    5. Property details (address, host contact) are only available after booking confirmation.
    6. We are not liable for travel plans made before booking confirmation.
  `,
  
  priceAlerts: `
    PRICE ALERT TERMS:
    
    1. Price alerts notify you of price changes but do not guarantee availability.
    2. Auto-booking requires explicit consent and pre-authorized payment method.
    3. Final booking amount may include fees and taxes beyond the base price.
    4. You can cancel auto-booking within 10 minutes of notification.
    5. Failed auto-booking attempts will result in notification-only alerts.
  `,
  
  autoBooking: `
    AUTO-BOOKING CONSENT:
    
    By enabling auto-booking, you agree to:
    1. Automatic charges when price drops to your target and property is available.
    2. Charges up to your specified price ceiling (including fees and taxes).
    3. Immediate booking creation upon successful payment.
    4. Standard cancellation policies apply to auto-booked reservations.
  `
};
```

**User Acceptance Tracking:**
```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type VARCHAR(50) NOT NULL, -- 'waitlist', 'price_alert', 'auto_booking'
  accepted_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  terms_version VARCHAR(20) NOT NULL, -- Track which version of T&Cs
  UNIQUE(user_id, consent_type, terms_version)
);
```

#### Support Team Handling

**Dispute Resolution Process:**

```typescript
interface WaitlistDispute {
  id: string;
  userId: string;
  waitlistEntryId: string;
  issue: 'missed_notification' | 'expired_window' | 'double_booking' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  resolution?: string;
  createdAt: Date;
}

// Support team tools
async investigateDispute(disputeId: string): Promise<DisputeInvestigation> {
  const dispute = await this.disputeRepo.findById(disputeId);
  const entry = await this.waitlistRepo.findById(dispute.waitlistEntryId);
  
  // Gather evidence
  const evidence = {
    waitlistEntry: entry,
    notifications: await this.notificationRepo.findByWaitlistEntry(entry.id),
    slotReservation: entry.slotReservationId 
      ? await this.slotReservationRepo.findById(entry.slotReservationId)
      : null,
    userActivity: await this.userActivityRepo.findByUser(dispute.userId),
    systemLogs: await this.systemLogRepo.findRelevant(entry.id)
  };
  
  return {
    dispute,
    evidence,
    recommendation: this.generateRecommendation(evidence)
  };
}
```

**Notification Timestamps & Logs:**

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  waitlist_entry_id UUID REFERENCES waitlist(id),
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  sent_at TIMESTAMP NOT NULL,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_notification_logs_user ON notification_logs(user_id, sent_at);
CREATE INDEX idx_notification_logs_waitlist ON notification_logs(waitlist_entry_id);
```

**Support Response Templates:**

```typescript
const SUPPORT_RESPONSES = {
  missed_notification: `
    We've investigated your concern about missing the waitlist notification.
    
    Our records show:
    - Notification sent: {sentAt}
    - Delivery status: {deliveryStatus}
    - Booking window: {expiresAt}
    
    {if delivered: "The notification was successfully delivered. We recommend checking your spam folder or notification settings."}
    {if failed: "We apologize - there was a delivery issue. We've added you back to the waitlist with priority."}
    
    Next steps: {resolution}
  `,
  
  expired_window: `
    We understand your booking window expired before you could complete your booking.
    
    Unfortunately, to ensure fairness to all waitlisted users, we cannot extend expired windows.
    However, we've:
    - Added you back to the waitlist with priority
    - Notified you of this resolution
    
    We recommend enabling push notifications to receive instant alerts.
  `
};
```

---

### 10. Metrics & Validation

#### Key Metrics

```typescript
interface WaitlistMetrics {
  // Conversion metrics
  totalWaitlistJoins: number;
  totalInvitationsSent: number;
  totalBookingsFromWaitlist: number;
  conversionRate: number; // bookings / invitations
  
  // Timing metrics
  averageTimeToInvite: number; // Time from join to invite
  averageTimeToBook: number; // Time from invite to book
  averageBookingWindowUtilization: number; // % of window used before booking
  
  // Fill rate
  cancelledSlotsFilled: number;
  cancelledSlotsTotal: number;
  fillRate: number; // filled / total
  
  // User satisfaction
  complaintsCount: number;
  refundsCount: number;
  dropOffRate: number; // Users who leave waitlist before invite
  
  // System health
  notificationDeliveryRate: number;
  averageNotificationLatency: number; // Time from cancellation to notification
  doubleBookingAttempts: number; // Should be 0
  raceConditionDetections: number; // Should be 0
}

async calculateWaitlistMetrics(
  startDate: Date,
  endDate: Date
): Promise<WaitlistMetrics> {
  // Aggregate metrics from database
  const joins = await this.waitlistRepo.count({ createdAt: Between(startDate, endDate) });
  const invitations = await this.waitlistRepo.count({ 
    notifiedAt: Between(startDate, endDate) 
  });
  const bookings = await this.waitlistRepo.count({ 
    state: 'booking_confirmed',
    updatedAt: Between(startDate, endDate)
  });
  
  return {
    totalWaitlistJoins: joins,
    totalInvitationsSent: invitations,
    totalBookingsFromWaitlist: bookings,
    conversionRate: invitations > 0 ? bookings / invitations : 0,
    // ... calculate other metrics
  };
}
```

#### Health Signals

**Working Well:**
- ✅ Conversion rate > 30%
- ✅ Fill rate > 60%
- ✅ Notification delivery rate > 95%
- ✅ Average time to invite < 5 minutes
- ✅ Complaints < 1% of waitlist joins
- ✅ Zero double bookings
- ✅ Zero race condition detections

**Creating Confusion:**
- ⚠️ Conversion rate < 20% (users don't understand)
- ⚠️ Complaints > 3% of waitlist joins
- ⚠️ High drop-off rate (> 40%)
- ⚠️ Many support tickets about "missed notifications"

**Hurting Trust:**
- 🚨 Complaints > 5% of waitlist joins
- 🚨 Refund rate > 2%
- 🚨 Any double bookings
- 🚨 Notification delivery rate < 90%
- 🚨 User churn increase after waitlist feature launch

#### Thresholds & Actions

```typescript
const METRIC_THRESHOLDS = {
  PAUSE_FEATURE: {
    complaints: 0.05, // 5% complaint rate
    doubleBookings: 1, // Any double booking
    notificationDelivery: 0.90 // < 90% delivery
  },
  
  TWEAK_FEATURE: {
    conversionRate: 0.20, // < 20% conversion
    fillRate: 0.50, // < 50% fill rate
    complaints: 0.03 // 3% complaint rate
  },
  
  ROLLBACK_FEATURE: {
    complaints: 0.10, // 10% complaint rate
    doubleBookings: 3, // 3+ double bookings
    systemErrors: 0.05 // 5% system error rate
  }
};

async monitorWaitlistHealth(): Promise<HealthCheckResult> {
  const metrics = await this.calculateWaitlistMetrics(
    subDays(new Date(), 7), // Last 7 days
    new Date()
  );
  
  if (metrics.complaintsCount / metrics.totalWaitlistJoins > METRIC_THRESHOLDS.PAUSE_FEATURE.complaints) {
    return {
      status: 'critical',
      action: 'PAUSE_FEATURE',
      message: 'Complaint rate exceeds threshold. Pausing waitlist feature.'
    };
  }
  
  if (metrics.doubleBookingAttempts > 0) {
    return {
      status: 'critical',
      action: 'PAUSE_FEATURE',
      message: 'Double booking detected. Pausing feature for investigation.'
    };
  }
  
  // ... other checks
  
  return { status: 'healthy', action: 'CONTINUE' };
}
```

---

### 11. Long-Term Strategy & Slot Locking

#### Data Integration

**Dynamic Pricing:**
```typescript
// Use waitlist data to inform pricing
async calculateDynamicPrice(propertyId: string, date: Date): Promise<number> {
  const basePrice = await this.getBasePrice(propertyId);
  const waitlistCount = await this.waitlistRepo.countByDate(propertyId, date);
  const demandLevel = this.calculateDemandLevel(waitlistCount);
  
  // Higher waitlist = higher demand = higher price
  const multiplier = {
    low: 1.0,      // 0-5 waitlisted
    medium: 1.1,   // 6-15 waitlisted
    high: 1.2,     // 16-30 waitlisted
    very_high: 1.3 // 31+ waitlisted
  }[demandLevel];
  
  return basePrice * multiplier;
}
```

**Demand Forecasting:**
```typescript
// Predict future demand based on waitlist patterns
async forecastDemand(propertyId: string, dateRange: DateRange): Promise<DemandForecast> {
  const historicalWaitlist = await this.waitlistRepo.findHistorical(propertyId, dateRange);
  const cancellationPatterns = await this.analyzeCancellationPatterns(propertyId);
  
  return {
    predictedWaitlistSize: this.predictWaitlistSize(historicalWaitlist),
    predictedCancellationRate: this.predictCancellationRate(cancellationPatterns),
    recommendedPrice: this.calculateOptimalPrice(historicalWaitlist, cancellationPatterns)
  };
}
```

**Host Recommendations:**
```typescript
// Recommend properties to hosts based on waitlist demand
async getHostRecommendations(hostId: string): Promise<HostRecommendation[]> {
  const properties = await this.propertyRepo.findByHost(hostId);
  
  return properties.map(property => ({
    propertyId: property.id,
    recommendation: this.generateRecommendation(property),
    waitlistInsights: {
      totalWaitlisted: await this.waitlistRepo.countByProperty(property.id),
      peakDates: await this.waitlistRepo.findPeakDates(property.id),
      suggestedActions: this.suggestActions(property)
    }
  }));
}
```

#### Premium Features

**Premium Host Tools:**
- Advanced waitlist analytics
- Custom booking window durations
- Priority notification settings
- Bulk waitlist management
- Integration with pricing tools

**Marketing Differentiators:**
- "Never miss a booking" - Fill cancelled slots automatically
- "Smart demand management" - Data-driven insights
- "Fair waitlist system" - Transparent, first-come-first-served

#### Competitive Advantage

**Why Hard to Replicate:**
1. **Complex State Management**: Multi-state system with strict transitions
2. **Race Condition Handling**: Multi-layer locking and reservation system
3. **Data Integration**: Deep integration with pricing and forecasting
4. **User Trust**: Years of reliable operation builds trust
5. **Network Effects**: More users = better waitlist fill rates

---

### 12. Multi-User Notification & Slot Locking (Critical)

#### The Problem: Multiple Users, One Slot

**Scenario:**
- 100 users on waitlist for same property/dates
- Cancellation occurs
- Who gets notified?
- How do we prevent double booking if multiple users try to book?

#### Solution: Exclusive Slot Reservation System

```typescript
interface SlotReservation {
  id: string;
  propertyId: string;
  checkInDate: Date;
  checkOutDate: Date;
  waitlistEntryId: string; // Only ONE entry can reserve
  reservedUntil: Date;
  status: 'reserved' | 'booked' | 'expired' | 'released';
  createdAt: Date;
}

// When cancellation occurs
async handleCancellation(bookingId: string) {
  const booking = await this.getBooking(bookingId);
  
  // STEP 1: Create availability slot (not yet reserved)
  const availabilitySlot = await this.availabilityService.createSlot({
    propertyId: booking.propertyId,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    status: 'available_for_waitlist'
  });
  
  // STEP 2: Find top priority waitlist entry
  const topEntry = await this.waitlistRepo.findTopPriority(
    booking.propertyId,
    booking.checkInDate,
    booking.checkOutDate,
    { state: WaitlistState.WAITLISTED }
  );
  
  if (!topEntry) {
    // No waitlist - release to general availability
    await this.availabilityService.releaseToGeneral(availabilitySlot.id);
    return;
  }
  
  // STEP 3: Atomically reserve slot for this user (prevents race conditions)
  const reservation = await this.reserveSlotExclusively(
    availabilitySlot.id,
    topEntry.id
  );
  
  if (!reservation) {
    // Reservation failed (shouldn't happen, but handle gracefully)
    await this.availabilityService.releaseToGeneral(availabilitySlot.id);
    return;
  }
  
  // STEP 4: Update waitlist entry state
  await this.waitlistRepo.update(topEntry.id, {
    state: WaitlistState.INVITED,
    slotReservationId: reservation.id,
    notifiedAt: new Date(),
    expiresAt: reservation.reservedUntil
  });
  
  // STEP 5: Send notification
  await this.notificationService.sendWaitlistInvitation(topEntry, reservation);
  
  // STEP 6: Schedule expiry check
  await this.scheduleExpiryCheck(reservation.id, reservation.reservedUntil);
}

// Atomic slot reservation (prevents double reservation)
async reserveSlotExclusively(
  availabilitySlotId: string,
  waitlistEntryId: string
): Promise<SlotReservation | null> {
  // Use distributed lock + database transaction
  const lockKey = `lock:slot-reservation:${availabilitySlotId}`;
  const lock = await this.redis.acquireLock(lockKey, 5000);
  
  try {
    return await this.dataSource.transaction(async (manager) => {
      // Check if slot already reserved (pessimistic lock)
      const existingReservation = await manager
        .createQueryBuilder(SlotReservation, 'sr')
        .where('sr.availability_slot_id = :slotId', { slotId: availabilitySlotId })
        .andWhere('sr.status = :status', { status: 'reserved' })
        .setLock('pessimistic_write')
        .getOne();
      
      if (existingReservation) {
        // Already reserved by another process/user
        return null;
      }
      
      // Create reservation
      const reservation = await manager.save(SlotReservation, {
        availabilitySlotId,
        waitlistEntryId,
        reservedUntil: addHours(new Date(), 2), // 2 hour window
        status: 'reserved'
      });
      
      // Mark availability slot as reserved
      await manager.update(AvailabilitySlot, availabilitySlotId, {
        status: 'reserved_for_waitlist',
        reservationId: reservation.id
      });
      
      return reservation;
    });
  } finally {
    await this.redis.releaseLock(lockKey, lock);
  }
}
```

#### Handling Multiple Properties/Rooms

**Scenario: User wants to book 2 properties or 2 rooms**

```typescript
// Each property/room combination is a separate slot
interface AvailabilitySlot {
  id: string;
  propertyId: string;
  roomId?: string; // Optional, for multi-room properties
  checkInDate: Date;
  checkOutDate: Date;
  status: 'available' | 'reserved_for_waitlist' | 'booked';
  reservationId?: string;
}

// When user tries to book from waitlist
async bookFromWaitlist(
  waitlistEntryId: string,
  additionalProperties?: string[] // User wants to book multiple
): Promise<Booking[]> {
  const entry = await this.waitlistRepo.findById(waitlistEntryId);
  
  if (entry.state !== WaitlistState.INVITED) {
    throw new BadRequestException('Invalid waitlist state');
  }
  
  // Book the reserved slot
  const primaryBooking = await this.bookReservedSlot(entry);
  
  // If user wants additional properties, check availability
  const additionalBookings: Booking[] = [];
  
  if (additionalProperties && additionalProperties.length > 0) {
    for (const propertyId of additionalProperties) {
      // Check if available (not reserved for other waitlist users)
      const isAvailable = await this.checkGeneralAvailability(
        propertyId,
        entry.checkInDate,
        entry.checkOutDate
      );
      
      if (isAvailable) {
        // Book additional property (standard booking flow)
        const booking = await this.bookingService.createBooking({
          propertyId,
          guestId: entry.userId,
          checkInDate: entry.checkInDate,
          checkOutDate: entry.checkOutDate
        }, generateIdempotencyKey());
        
        additionalBookings.push(booking);
      }
    }
  }
  
  return [primaryBooking, ...additionalBookings];
}

// Check if slot is available for general booking (not reserved)
async checkGeneralAvailability(
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  // Check for overlapping reservations
  const reservations = await this.slotReservationRepo.findOverlapping(
    propertyId,
    checkIn,
    checkOut
  );
  
  // Only available if no active reservations
  return reservations.filter(r => 
    r.status === 'reserved' && r.reservedUntil > new Date()
  ).length === 0;
}
```

#### Database Schema for Slot Reservations

```sql
-- Availability slots (created when cancellation occurs)
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  room_id UUID REFERENCES rooms(id), -- For multi-room properties
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'available_for_waitlist',
  reservation_id UUID REFERENCES slot_reservations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent overlapping slots for same property/room
  EXCLUDE USING GIST (
    property_id WITH =,
    COALESCE(room_id, '00000000-0000-0000-0000-000000000000'::UUID) WITH =,
    daterange(check_in_date, check_out_date) WITH &&
  ) WHERE (status IN ('available_for_waitlist', 'reserved_for_waitlist'))
);

-- Slot reservations (links waitlist entry to availability slot)
CREATE TABLE slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_slot_id UUID NOT NULL REFERENCES availability_slots(id),
  waitlist_entry_id UUID NOT NULL REFERENCES waitlist(id),
  reserved_until TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'reserved',
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- One reservation per slot
  UNIQUE(availability_slot_id) WHERE (status = 'reserved'),
  
  -- One active reservation per waitlist entry
  UNIQUE(waitlist_entry_id) WHERE (status = 'reserved')
);

CREATE INDEX idx_slot_reservations_active 
ON slot_reservations(availability_slot_id, status) 
WHERE status = 'reserved';

CREATE INDEX idx_slot_reservations_expiry 
ON slot_reservations(reserved_until) 
WHERE status = 'reserved';
```

#### Complete Flow Diagram

```
Cancellation Occurs
    ↓
Create Availability Slot (status: available_for_waitlist)
    ↓
Find Top Priority Waitlist Entry
    ↓
[ATOMIC OPERATION]
    ├─ Acquire Distributed Lock
    ├─ Check Slot Not Already Reserved (DB Lock)
    ├─ Create Slot Reservation
    ├─ Update Availability Slot → reserved_for_waitlist
    └─ Release Lock
    ↓
Update Waitlist Entry → INVITED
    ↓
Send Notification to User
    ↓
Schedule Expiry Check (2 hours)
    ↓
[User Books]
    ├─ Validate State = INVITED
    ├─ Validate Reservation Still Valid
    ├─ Process Payment
    ├─ Create Booking
    ├─ Update Reservation → booked
    └─ Update Waitlist Entry → booking_confirmed
    ↓
[OR Expiry]
    ├─ Update Reservation → expired
    ├─ Release Availability Slot
    ├─ Update Waitlist Entry → expired
    └─ Offer to Next User (repeat from top)
```

---

This comprehensive design addresses all critical questions with production-ready solutions, ensuring user trust, legal compliance, and system reliability.

---

## Tech Stack

### Core Framework
- **NestJS** (TypeScript) - Backend framework
- **TypeORM** - Database ORM
- **PostgreSQL** - Primary database
- **PostGIS** - Geospatial extension
- **Redis** - Caching and distributed locks
- **Bull** - Background job queue

### External Services
- **Payment Gateway**: Cashfree (or similar)
- **Email Service**: SendGrid (for booking confirmations)
- **Storage**: Azure Blob Storage (for property images)

### Infrastructure
- **Docker** - Containerization
- **Azure** - Cloud hosting (or AWS/GCP)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────┐
│         API Layer (NestJS)          │
│  ┌──────────┐  ┌──────────┐        │
│  │ Booking  │  │  Search  │        │
│  │ Service  │  │  Service │        │
│  └──────────┘  └──────────┘        │
└──────────────────┬──────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼───┐    ┌────▼────┐   ┌────▼────┐
│Postgres│    │  Redis  │   │  Bull   │
│        │    │ (Cache) │   │ (Queue) │
└────────┘    └─────────┘   └─────────┘
```

### Booking Flow (Critical Path)

```
1. Guest requests booking
   ↓
2. Check availability (Redis cache)
   ↓
3. Acquire distributed lock (Redis)
   ↓
4. Re-validate in database (pessimistic lock)
   ↓
5. Create booking record (database transaction)
   ↓
6. Process payment
   ↓
7. Update availability calendar
   ↓
8. Release lock & invalidate cache
   ↓
9. Queue notification job (async)
   ↓
10. Return booking confirmation
```

---

## Database Design

### Core Tables

#### Properties
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location GEOGRAPHY(POINT, 4326), -- PostGIS for geospatial
  address TEXT,
  city VARCHAR(100),
  base_price DECIMAL(10,2) NOT NULL,
  max_guests INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_properties_location ON properties USING GIST(location);
CREATE INDEX idx_properties_city ON properties(city) WHERE status = 'active';
```

#### Bookings
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  guest_id UUID NOT NULL REFERENCES users(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_guests INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, refunded
  booking_token VARCHAR(255) UNIQUE, -- idempotency key
  version INTEGER DEFAULT 1, -- optimistic locking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (check_out_date > check_in_date)
);

CREATE INDEX idx_bookings_property_dates ON bookings(property_id, check_in_date, check_out_date) 
  WHERE status = 'confirmed';
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
```

#### Availability Calendar
```sql
CREATE TABLE availability_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  date DATE NOT NULL,
  available BOOLEAN DEFAULT true,
  price DECIMAL(10,2), -- nullable, overrides base price if set
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, date)
);

CREATE INDEX idx_availability_property_date ON availability_calendar(property_id, date);
```

#### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'guest', -- guest, host, admin
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Waitlist (Standout Feature)
```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  user_id UUID NOT NULL REFERENCES users(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  priority INTEGER DEFAULT 0, -- Lower = higher priority (timestamp-based)
  notified_at TIMESTAMP,
  expires_at TIMESTAMP, -- Booking window expiry
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, user_id, check_in_date, check_out_date)
);

CREATE INDEX idx_waitlist_property_dates ON waitlist(property_id, check_in_date, check_out_date, priority);
CREATE INDEX idx_waitlist_user ON waitlist(user_id);
```

#### Price Alerts (Standout Feature)
```sql
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  user_id UUID NOT NULL REFERENCES users(id),
  target_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2), -- Snapshot when alert was set
  auto_book BOOLEAN DEFAULT false,
  notified_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, triggered, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, user_id) -- One alert per user per property
);

CREATE INDEX idx_price_alerts_property ON price_alerts(property_id, status) WHERE status = 'active';
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id, status) WHERE status = 'active';
```

---

## API Design

### Core Endpoints

#### Search & Discovery
```
GET /api/v1/properties/search
  Query params: location, check_in, check_out, guests, price_min, price_max, radius
  Returns: List of available properties

GET /api/v1/properties/:id
  Returns: Property details

GET /api/v1/properties/:id/availability
  Query params: start_date, end_date
  Returns: Availability for date range
```

#### Booking
```
POST /api/v1/bookings
  Headers: X-Idempotency-Key (required)
  Body: { property_id, check_in_date, check_out_date, number_of_guests }
  Returns: Booking with payment intent

GET /api/v1/bookings/:id
  Returns: Booking details

PATCH /api/v1/bookings/:id/cancel
  Returns: Cancelled booking
```

#### Payment
```
POST /api/v1/payments
  Body: { booking_id, amount, payment_method }
  Returns: Payment result

POST /api/v1/webhooks/payment
  Payment gateway webhook handler
```

#### Waitlist (Standout Feature)
```
POST /api/v1/waitlist
  Body: { property_id, check_in_date, check_out_date }
  Returns: Waitlist entry

GET /api/v1/waitlist
  Returns: User's waitlist entries

DELETE /api/v1/waitlist/:id
  Removes user from waitlist

POST /api/v1/waitlist/:id/book
  Books from waitlist notification (within time window)
```

#### Price Alerts (Standout Feature)
```
POST /api/v1/price-alerts
  Body: { property_id, target_price, auto_book (optional) }
  Returns: Price alert

GET /api/v1/price-alerts
  Returns: User's active price alerts

PATCH /api/v1/price-alerts/:id
  Body: { target_price, auto_book }
  Updates price alert

DELETE /api/v1/price-alerts/:id
  Cancels price alert
```

---

## Implementation Details

### 1. Booking Service with Concurrency Control

```typescript
@Injectable()
export class BookingService {
  constructor(
    private bookingRepo: BookingRepository,
    private availabilityRepo: AvailabilityRepository,
    private redis: RedisService,
    private paymentService: PaymentService,
  ) {}

  async createBooking(dto: CreateBookingDto, idempotencyKey: string): Promise<Booking> {
    // 1. Check idempotency
    const existing = await this.bookingRepo.findByToken(idempotencyKey);
    if (existing) return existing;

    // 2. Fast availability check (Redis)
    const isAvailable = await this.checkAvailabilityFast(
      dto.propertyId,
      dto.checkInDate,
      dto.checkOutDate
    );
    if (!isAvailable) {
      throw new ConflictException('Property not available for selected dates');
    }

    // 3. Acquire distributed lock
    const lockKey = `lock:booking:${dto.propertyId}:${dto.checkInDate}:${dto.checkOutDate}`;
    const lock = await this.redis.acquireLock(lockKey, 30000); // 30s timeout
    
    try {
      // 4. Re-validate with database lock
      const isReallyAvailable = await this.availabilityRepo.checkAvailabilityWithLock(
        dto.propertyId,
        dto.checkInDate,
        dto.checkOutDate
      );
      
      if (!isReallyAvailable) {
        throw new ConflictException('Property not available');
      }

      // 5. Create booking in transaction
      const booking = await this.dataSource.transaction(async (manager) => {
        // Create booking
        const newBooking = await manager.save(Booking, {
          ...dto,
          bookingToken: idempotencyKey,
          status: 'pending',
        });

        // Update availability calendar
        await this.blockAvailability(
          manager,
          dto.propertyId,
          dto.checkInDate,
          dto.checkOutDate
        );

        return newBooking;
      });

      // 6. Process payment (async, non-blocking)
      await this.paymentService.processPayment(booking.id);

      // 7. Invalidate cache
      await this.invalidateAvailabilityCache(dto.propertyId, dto.checkInDate, dto.checkOutDate);

      return booking;
    } finally {
      // 8. Release lock
      await this.redis.releaseLock(lockKey, lock);
    }
  }

  private async checkAvailabilityFast(
    propertyId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<boolean> {
    // Check Redis cache for quick availability
    const dates = this.getDateRange(checkIn, checkOut);
    for (const date of dates) {
      const key = `availability:${propertyId}:${date.toISOString()}`;
      const cached = await this.redis.get(key);
      if (cached && cached.available === false) {
        return false;
      }
    }
    return true;
  }

  private async blockAvailability(
    manager: EntityManager,
    propertyId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<void> {
    const dates = this.getDateRange(checkIn, checkOut);
    for (const date of dates) {
      await manager.upsert(
        AvailabilityCalendar,
        {
          propertyId,
          date,
          available: false,
        },
        ['propertyId', 'date']
      );
    }
  }
}
```

### 2. Availability Repository with Pessimistic Locking

```typescript
@Injectable()
export class AvailabilityRepository {
  async checkAvailabilityWithLock(
    propertyId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<boolean> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('availability_calendar')
      .from(AvailabilityCalendar, 'availability_calendar')
      .where('availability_calendar.property_id = :propertyId', { propertyId })
      .andWhere('availability_calendar.date >= :checkIn', { checkIn })
      .andWhere('availability_calendar.date < :checkOut', { checkOut })
      .andWhere('availability_calendar.available = false')
      .setLock('pessimistic_write') // FOR UPDATE lock
      .getCount();

    return result === 0; // No conflicts found
  }
}
```

### 3. Redis Distributed Lock Service

```typescript
@Injectable()
export class RedisService {
  async acquireLock(key: string, ttl: number): Promise<string> {
    const lockValue = uuidv4();
    const acquired = await this.redis.set(
      key,
      lockValue,
      'PX', // milliseconds
      ttl,
      'NX' // only set if not exists
    );
    
    if (!acquired) {
      throw new ConflictException('Could not acquire lock');
    }
    
    return lockValue;
  }

  async releaseLock(key: string, lockValue: string): Promise<void> {
    // Lua script to ensure we only delete our own lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, key, lockValue);
  }
}
```

### 4. Search Service with PostGIS

```typescript
@Injectable()
export class SearchService {
  async searchProperties(criteria: SearchCriteria): Promise<Property[]> {
    // 1. Geocode location if needed
    const coordinates = await this.geocodeLocation(criteria.location);

    // 2. Build PostGIS query
    const query = this.propertyRepo
      .createQueryBuilder('property')
      .where('property.status = :status', { status: 'active' });

    // Geospatial filter
    if (coordinates && criteria.radius) {
      query.andWhere(
        `ST_DWithin(
          property.location,
          ST_MakePoint(:lng, :lat)::geography,
          :radius
        )`,
        {
          lng: coordinates.lng,
          lat: coordinates.lat,
          radius: criteria.radius * 1000, // km to meters
        }
      );
    }

    // Price filter
    if (criteria.priceMin) {
      query.andWhere('property.base_price >= :priceMin', { priceMin: criteria.priceMin });
    }
    if (criteria.priceMax) {
      query.andWhere('property.base_price <= :priceMax', { priceMax: criteria.priceMax });
    }

    // Availability filter
    if (criteria.checkIn && criteria.checkOut) {
      query.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM availability_calendar ac
          WHERE ac.property_id = property.id
          AND ac.date >= :checkIn
          AND ac.date < :checkOut
          AND ac.available = false
        )`,
        { checkIn: criteria.checkIn, checkOut: criteria.checkOut }
      );
    }

    return query.getMany();
  }
}
```

---

## Testing Strategy

### Critical Test Scenarios

#### 1. Concurrency Test (Most Important)
```typescript
describe('Booking Concurrency', () => {
  it('should prevent double booking when two users book simultaneously', async () => {
    const propertyId = 'test-property-id';
    const checkIn = new Date('2024-06-01');
    const checkOut = new Date('2024-06-05');

    // Simulate two concurrent booking attempts
    const [booking1, booking2] = await Promise.allSettled([
      bookingService.createBooking({ propertyId, checkIn, checkOut }, 'key1'),
      bookingService.createBooking({ propertyId, checkIn, checkOut }, 'key2'),
    ]);

    // One should succeed, one should fail
    const results = [booking1, booking2];
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toBeInstanceOf(ConflictException);
  });
});
```

#### 2. Availability Test
```typescript
it('should update availability immediately after booking', async () => {
  // Create booking
  await bookingService.createBooking({ ... }, 'key1');
  
  // Check availability - should be false
  const availability = await availabilityService.checkAvailability(
    propertyId,
    checkIn,
    checkOut
  );
  
  expect(availability).toBe(false);
});
```

---

## Deployment

### Minimal Production Setup

1. **Database**: PostgreSQL with PostGIS extension
2. **Cache**: Redis instance
3. **Application**: NestJS app in Docker container
4. **Queue**: Bull queue workers for background jobs
5. **Storage**: Azure Blob Storage for images

### Environment Variables
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PAYMENT_GATEWAY_API_KEY=...
EMAIL_SERVICE_API_KEY=...
```

---

## Success Criteria

### Must Have (MVP)
- ✅ Zero double bookings (tested with concurrent requests)
- ✅ Real-time availability updates
- ✅ Basic location-based search
- ✅ Secure payment processing
- ✅ Booking confirmation emails

### Standout Features (Competitive Advantage)
- ⭐ **Waitlist & Auto-Rebooking** - Fill cancelled slots automatically
- ⭐ **Smart Price Drop Alerts** - Never miss a deal, auto-booking option

### Nice to Have (Future)
- Advanced search filters
- Review system
- Host dashboard
- Analytics

---

## Development Timeline

### MVP (Minimum Viable Product) - 6-8 weeks

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Setup** | 1 week | Project setup, database schema, auth |
| **Property Management** | 1 week | CRUD for properties, image upload |
| **Search** | 1 week | Basic location-based search |
| **Booking System** | 2-3 weeks | Booking flow, concurrency control, availability |
| **Payment** | 1 week | Payment gateway integration |
| **Testing** | 1 week | Concurrency tests, integration tests |
| **Deployment** | 1 week | Docker, deployment, monitoring |

**Total: 6-8 weeks** (with 1-2 developers)

---

## Key Takeaways

1. **Concurrency is the #1 problem** - Use distributed locks + database transactions
2. **Cache for speed, database for truth** - Redis for fast checks, PostgreSQL for validation
3. **Idempotency prevents duplicates** - Always use idempotency keys for payments/bookings
4. **Test concurrency early** - Don't wait until production to test race conditions
5. **Keep it simple** - Start with MVP, add features later

---

This simplified guide focuses on solving the core problems: preventing double bookings and managing real-time availability. Once these are solved, you can add more features incrementally.

---

## Complete API Routes Reference

> **Note**: All routes are prefixed with `/api/v1` unless otherwise specified. All authenticated routes require `Authorization: Bearer <token>` header.

### Authentication & User Management

#### Authentication
```
POST   /auth/register
  Body: { email, password, name, role? }
  Returns: { user, accessToken, refreshToken }

POST   /auth/login
  Body: { email, password }
  Returns: { user, accessToken, refreshToken }

POST   /auth/refresh
  Body: { refreshToken }
  Returns: { accessToken, refreshToken }

POST   /auth/logout
  Headers: Authorization
  Returns: { message: "Logged out successfully" }

POST   /auth/forgot-password
  Body: { email }
  Returns: { message: "Password reset email sent" }

POST   /auth/reset-password
  Body: { token, newPassword }
  Returns: { message: "Password reset successful" }

POST   /auth/verify-email
  Body: { token }
  Returns: { message: "Email verified" }

POST   /auth/resend-verification
  Body: { email }
  Returns: { message: "Verification email sent" }
```

#### User Profile
```
GET    /users/me
  Returns: Current user profile

PATCH  /users/me
  Body: { name?, email?, phone?, avatar?, preferences? }
  Returns: Updated user profile

GET    /users/:id
  Returns: Public user profile (limited fields)

POST   /users/me/avatar
  Content-Type: multipart/form-data
  Body: { file }
  Returns: { avatarUrl }

DELETE /users/me
  Returns: { message: "Account deleted" }

GET    /users/me/preferences
  Returns: User preferences

PATCH  /users/me/preferences
  Body: { notifications?, language?, currency?, timezone? }
  Returns: Updated preferences
```

### Properties

#### Property Discovery & Search
```
GET    /properties/search
  Query: {
    location?: string,
    latitude?: number,
    longitude?: number,
    radius?: number,        // in km
    check_in?: string,       // ISO date
    check_out?: string,      // ISO date
    guests?: number,
    price_min?: number,
    price_max?: number,
    property_type?: string,
    amenities?: string[],    // comma-separated
    sort_by?: string,        // price_asc, price_desc, rating, distance
    page?: number,
    limit?: number
  }
  Returns: {
    properties: Property[],
    pagination: { total, page, limit, totalPages }
  }

GET    /properties/:id
  Returns: Property details with full information

GET    /properties/:id/availability
  Query: { start_date, end_date }
  Returns: {
    dates: Array<{ date, available, price }>
  }

GET    /properties/:id/reviews
  Query: { page?, limit? }
  Returns: {
    reviews: Review[],
    pagination: { total, page, limit },
    averageRating: number,
    totalReviews: number
  }

GET    /properties/:id/photos
  Returns: Array<{ id, url, caption, order }>

GET    /properties/featured
  Returns: Array<Property> (featured properties)

GET    /properties/trending
  Query: { limit? }
  Returns: Array<Property> (trending properties)

GET    /properties/nearby/:id
  Query: { radius?, limit? }
  Returns: Array<Property> (nearby properties)
```

#### Property Management (Host)
```
POST   /properties
  Body: {
    title, description, address, city, state, country,
    latitude, longitude, base_price, max_guests,
    property_type, bedrooms, bathrooms, amenities,
    house_rules, cancellation_policy
  }
  Returns: Created property

GET    /properties/my-properties
  Query: { status?, page?, limit? }
  Returns: {
    properties: Property[],
    pagination: { total, page, limit }
  }

GET    /properties/my-properties/:id
  Returns: Property details (host view with analytics)

PATCH  /properties/my-properties/:id
  Body: { title?, description?, base_price?, status?, ... }
  Returns: Updated property

DELETE /properties/my-properties/:id
  Returns: { message: "Property deleted" }

POST   /properties/my-properties/:id/photos
  Content-Type: multipart/form-data
  Body: { files[] }
  Returns: { photos: Array<{ id, url }> }

DELETE /properties/my-properties/:id/photos/:photoId
  Returns: { message: "Photo deleted" }

PATCH  /properties/my-properties/:id/photos/reorder
  Body: { photoIds: string[] }
  Returns: { message: "Photos reordered" }
```

#### Property Availability Management (Host)
```
GET    /properties/my-properties/:id/availability
  Query: { start_date?, end_date? }
  Returns: {
    dates: Array<{ date, available, price, blocked_reason? }>
  }

POST   /properties/my-properties/:id/availability/bulk
  Body: {
    dates: Array<{ date, available, price? }>
  }
  Returns: { message: "Availability updated", updated: number }

PATCH  /properties/my-properties/:id/availability/:date
  Body: { available, price? }
  Returns: Updated availability

POST   /properties/my-properties/:id/availability/block
  Body: { start_date, end_date, reason? }
  Returns: { message: "Dates blocked" }

POST   /properties/my-properties/:id/availability/unblock
  Body: { start_date, end_date }
  Returns: { message: "Dates unblocked" }

GET    /properties/my-properties/:id/calendar
  Query: { start_date, end_date }
  Returns: {
    calendar: Array<{
      date, available, price, booking_id?,
      booking_status?, guest_name?
    }>
  }
```

### Bookings

#### Booking Management (Guest)
```
POST   /bookings
  Headers: { X-Idempotency-Key: string (required) }
  Body: {
    property_id, check_in_date, check_out_date,
    number_of_guests, special_requests?
  }
  Returns: {
    booking: Booking,
    payment_intent: PaymentIntent,
    total_price: number,
    breakdown: { base_price, fees, taxes }
  }

GET    /bookings
  Query: { status?, page?, limit?, sort_by? }
  Returns: {
    bookings: Booking[],
    pagination: { total, page, limit }
  }

GET    /bookings/:id
  Returns: Booking details with property info

PATCH  /bookings/:id/cancel
  Body: { cancellation_reason? }
  Returns: Cancelled booking with refund details

GET    /bookings/:id/receipt
  Returns: Booking receipt/invoice (PDF or JSON)

POST   /bookings/:id/modify
  Body: { new_check_in?, new_check_out?, new_guests? }
  Returns: Modified booking with price difference

GET    /bookings/upcoming
  Returns: Array<Booking> (upcoming bookings)

GET    /bookings/past
  Returns: Array<Booking> (past bookings)
```

#### Booking Management (Host)
```
GET    /bookings/my-properties
  Query: {
    property_id?, status?, check_in_from?, check_in_to?,
    page?, limit?
  }
  Returns: {
    bookings: Booking[],
    pagination: { total, page, limit }
  }

GET    /bookings/my-properties/:propertyId
  Returns: All bookings for specific property

PATCH  /bookings/:id/status
  Body: { status, message? }
  Returns: Updated booking

GET    /bookings/my-properties/calendar
  Query: { property_id?, start_date, end_date }
  Returns: Calendar view with all bookings
```

### Payments

```
POST   /payments
  Headers: { X-Idempotency-Key: string }
  Body: {
    booking_id, amount, payment_method_id,
    return_url?
  }
  Returns: {
    payment: Payment,
    payment_intent: PaymentIntent,
    client_secret? // for Stripe-like flows
  }

GET    /payments/:id
  Returns: Payment details

GET    /payments/booking/:bookingId
  Returns: Payment details for booking

POST   /payments/:id/confirm
  Body: { payment_method_id?, payment_token? }
  Returns: Confirmed payment

POST   /payments/:id/refund
  Body: { amount?, reason? }
  Returns: Refund details

GET    /payments/methods
  Returns: User's saved payment methods

POST   /payments/methods
  Body: { type, token, is_default? }
  Returns: Saved payment method

DELETE /payments/methods/:id
  Returns: { message: "Payment method deleted" }

POST   /webhooks/payment
  Payment gateway webhook handler (no auth required)
```

### Waitlist

```
POST   /waitlist
  Body: {
    property_id, check_in_date, check_out_date,
    number_of_guests?
  }
  Returns: Waitlist entry with position

GET    /waitlist
  Query: { status?, page?, limit? }
  Returns: {
    entries: WaitlistEntry[],
    pagination: { total, page, limit }
  }

GET    /waitlist/:id
  Returns: Waitlist entry details

DELETE /waitlist/:id
  Returns: { message: "Removed from waitlist" }

POST   /waitlist/:id/book
  Headers: { X-Idempotency-Key: string }
  Body: { payment_method_id }
  Returns: Booking created from waitlist

GET    /waitlist/:id/status
  Returns: {
    state, position?, expires_at?, booking_window_duration?
  }

GET    /waitlist/property/:propertyId
  Query: { check_in?, check_out? }
  Returns: Waitlist entries for property (host view)
```

### Price Alerts

```
POST   /price-alerts
  Body: {
    property_id, target_price, auto_book?,
    price_ceiling?, payment_method_id?,
    check_in_date?, check_out_date?
  }
  Returns: Price alert

GET    /price-alerts
  Query: { status?, page?, limit? }
  Returns: {
    alerts: PriceAlert[],
    pagination: { total, page, limit }
  }

GET    /price-alerts/:id
  Returns: Price alert details

PATCH  /price-alerts/:id
  Body: { target_price?, auto_book?, price_ceiling? }
  Returns: Updated price alert

DELETE /price-alerts/:id
  Returns: { message: "Price alert cancelled" }

POST   /price-alerts/:id/cancel-auto-book
  Body: { reason? }
  Returns: { message: "Auto-booking cancelled" }
```

### Reviews & Ratings

```
POST   /reviews
  Body: {
    booking_id, property_id, rating,
    cleanliness?, accuracy?, communication?,
    location?, check_in?, value?,
    comment, photos?
  }
  Returns: Created review

GET    /reviews
  Query: {
    property_id?, user_id?, booking_id?,
    page?, limit?, sort_by?
  }
  Returns: {
    reviews: Review[],
    pagination: { total, page, limit }
  }

GET    /reviews/:id
  Returns: Review details

PATCH  /reviews/:id
  Body: { rating?, comment?, photos? }
  Returns: Updated review

DELETE /reviews/:id
  Returns: { message: "Review deleted" }

GET    /reviews/property/:propertyId/stats
  Returns: {
    averageRating: number,
    totalReviews: number,
    breakdown: { 5: number, 4: number, ... }
  }

POST   /reviews/:id/helpful
  Returns: { helpful_count: number }

POST   /reviews/:id/report
  Body: { reason, description }
  Returns: { message: "Review reported" }
```

### Notifications

```
GET    /notifications
  Query: { unread_only?, type?, page?, limit? }
  Returns: {
    notifications: Notification[],
    unread_count: number,
    pagination: { total, page, limit }
  }

GET    /notifications/:id
  Returns: Notification details

PATCH  /notifications/:id/read
  Returns: { message: "Notification marked as read" }

PATCH  /notifications/read-all
  Returns: { message: "All notifications marked as read" }

DELETE /notifications/:id
  Returns: { message: "Notification deleted" }

GET    /notifications/preferences
  Returns: Notification preferences

PATCH  /notifications/preferences
  Body: {
    email_enabled?, push_enabled?, sms_enabled?,
    booking_updates?, price_alerts?, waitlist_updates?,
    marketing_emails?
  }
  Returns: Updated preferences
```

### Search & Filters

```
GET    /search/suggestions
  Query: { q: string }
  Returns: {
    locations: Array<{ id, name, type, coordinates }>,
    properties: Array<{ id, title, type }>
  }

GET    /search/autocomplete
  Query: { q: string, type? }
  Returns: Array<{ text, type, id? }>

GET    /filters/property-types
  Returns: Array<{ id, name, icon? }>

GET    /filters/amenities
  Returns: Array<{ id, name, category, icon? }>

GET    /filters/price-ranges
  Query: { location?, property_type? }
  Returns: {
    min: number,
    max: number,
    suggested_ranges: Array<{ min, max, label }>
  }
```

### Host Dashboard & Analytics

```
GET    /host/dashboard
  Query: { period?, property_id? }
  Returns: {
    overview: {
      total_bookings, revenue, occupancy_rate,
      average_rating, upcoming_check_ins
    },
    revenue_chart: Array<{ date, revenue }>,
    bookings_chart: Array<{ date, count }>
  }

GET    /host/analytics/revenue
  Query: { start_date, end_date, property_id?, group_by? }
  Returns: Revenue analytics

GET    /host/analytics/bookings
  Query: { start_date, end_date, property_id? }
  Returns: Booking analytics

GET    /host/analytics/occupancy
  Query: { start_date, end_date, property_id? }
  Returns: Occupancy analytics

GET    /host/analytics/reviews
  Query: { property_id? }
  Returns: Review analytics

GET    /host/insights
  Returns: {
    recommendations: Array<{ type, message, action? }>,
    trends: Array<{ metric, change, period }>
  }
```

### Guest Dashboard

```
GET    /guest/dashboard
  Returns: {
    upcoming_trips: Booking[],
    past_trips: Booking[],
    saved_properties: Property[],
    active_waitlists: WaitlistEntry[],
    active_price_alerts: PriceAlert[]
  }

GET    /guest/trips
  Query: { status?, page?, limit? }
  Returns: {
    trips: Booking[],
    pagination: { total, page, limit }
  }

GET    /guest/saved-properties
  Returns: Array<Property>

POST   /guest/saved-properties/:propertyId
  Returns: { message: "Property saved" }

DELETE /guest/saved-properties/:propertyId
  Returns: { message: "Property unsaved" }
```

### File Uploads

```
POST   /upload/image
  Content-Type: multipart/form-data
  Body: { file, type?, property_id? }
  Returns: {
    url: string,
    id: string,
    size: number,
    mime_type: string
  }

POST   /upload/images
  Content-Type: multipart/form-data
  Body: { files[] }
  Returns: Array<{ url, id, size, mime_type }>

DELETE /upload/:id
  Returns: { message: "File deleted" }
```

### Admin APIs

```
GET    /admin/users
  Query: { role?, status?, page?, limit?, search? }
  Returns: {
    users: User[],
    pagination: { total, page, limit }
  }

PATCH  /admin/users/:id/status
  Body: { status, reason? }
  Returns: Updated user

GET    /admin/properties
  Query: { status?, host_id?, page?, limit? }
  Returns: {
    properties: Property[],
    pagination: { total, page, limit }
  }

PATCH  /admin/properties/:id/status
  Body: { status, reason? }
  Returns: Updated property

GET    /admin/bookings
  Query: { status?, page?, limit?, date_from?, date_to? }
  Returns: {
    bookings: Booking[],
    pagination: { total, page, limit }
  }

GET    /admin/analytics
  Query: { period?, start_date?, end_date? }
  Returns: Platform-wide analytics

GET    /admin/reports/disputes
  Returns: Array<Dispute>

PATCH  /admin/reports/disputes/:id/resolve
  Body: { resolution, action? }
  Returns: Resolved dispute
```

### Health & System

```
GET    /health
  Returns: { status: "ok", timestamp, version }

GET    /health/detailed
  Returns: {
    status: "ok",
    database: "connected",
    redis: "connected",
    queue: "running",
    storage: "accessible"
  }

GET    /version
  Returns: { version: string, build: string, environment: string }
```

### WebSocket Events (Real-time)

```
Connection: ws://api.example.com/ws
Auth: Query param ?token=<access_token>

Events:
  - booking:created
  - booking:updated
  - booking:cancelled
  - waitlist:invited
  - waitlist:expired
  - price:dropped
  - notification:new
  - availability:updated
```

---

## API Response Standards

### Success Response Format
```typescript
{
  success: true,
  data: T,
  meta?: {
    pagination?: { total, page, limit, totalPages },
    filters?: Record<string, any>
  }
}
```

### Error Response Format
```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any,
    timestamp: string
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., double booking attempt)
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable

### Pagination
All list endpoints support pagination:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- Response includes `pagination` object with metadata

### Rate Limiting
- Public endpoints: 100 requests/minute
- Authenticated endpoints: 1000 requests/minute
- Payment endpoints: 10 requests/minute
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### CORS
- Allowed origins configured per environment
- Credentials: true for authenticated requests
- Preflight: 24 hours cache

---

## Frontend Integration Notes

### Authentication Flow
1. User registers/logs in → Receive `accessToken` and `refreshToken`
2. Store tokens securely (httpOnly cookies recommended)
3. Include `Authorization: Bearer <accessToken>` in all authenticated requests
4. On 401, use refresh token to get new access token
5. On refresh failure, redirect to login

### Idempotency Keys
- Generate UUID v4 for all POST requests that create resources
- Include in `X-Idempotency-Key` header
- Retry failed requests with same key (prevents duplicates)

### Real-time Updates
- Use WebSocket connection for live updates
- Subscribe to relevant events based on user role
- Fallback to polling if WebSocket unavailable

### Image Uploads
- Use multipart/form-data for file uploads
- Maximum file size: 10MB per image
- Supported formats: JPEG, PNG, WebP
- Compress images client-side before upload

### Search Optimization
- Debounce search input (300ms)
- Cache search results client-side
- Use pagination for large result sets
- Implement infinite scroll or "Load More"

### Booking Flow
1. Search properties → Select property → Check availability
2. Create booking (with idempotency key) → Receive payment intent
3. Process payment → Confirm booking
4. Show confirmation with booking details

### Error Handling
- Display user-friendly error messages
- Log errors for debugging
- Retry transient failures (network errors)
- Show loading states during async operations

---

This comprehensive API reference covers all frontend requirements for building a complete booking platform interface.
