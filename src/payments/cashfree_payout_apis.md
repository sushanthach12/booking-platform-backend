# Cashfree Payouts V2 — Complete API Reference & Integration Guide

> **API Version:** `2024-01-01`  
> **Base URL (Production):** `https://api.cashfree.com/payout`  
> **Base URL (Sandbox/Test):** `https://sandbox.cashfree.com/payout`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Payout Flow — End-to-End](#3-payout-flow--end-to-end)
4. [Beneficiary Management APIs](#4-beneficiary-management-apis)
   - [Create Beneficiary](#41-create-beneficiary)
   - [Get Beneficiary](#42-get-beneficiary)
   - [Remove Beneficiary](#43-remove-beneficiary)
5. [Transfer APIs](#5-transfer-apis)
   - [Standard Transfer](#51-standard-transfer)
   - [Get Transfer Status](#52-get-transfer-status)
   - [Batch Transfer](#53-batch-transfer)
   - [Get Batch Transfer Status](#54-get-batch-transfer-status)
6. [Verify and Pay (UPI Flow)](#6-verify-and-pay-upi-flow)
   - [Validate Payout](#61-validate-payout)
   - [Process Validated Payout](#62-process-validated-payout)
7. [Transfer Statuses & Status Codes](#7-transfer-statuses--status-codes)
8. [Webhooks V2](#8-webhooks-v2)
   - [Setup & Configuration](#81-setup--configuration)
   - [Signature Verification](#82-signature-verification)
   - [Webhook Events](#83-webhook-events)
   - [Sample Payloads](#84-sample-payloads)
   - [Retry Policy & IPs to Whitelist](#85-retry-policy--ips-to-whitelist)
9. [Error Handling Best Practices](#9-error-handling-best-practices)

---

## 1. Overview

Payouts V2 is the next-generation API suite from Cashfree Payments for automating disbursements to bank accounts, UPI handles, wallets, and cards. Key improvements over V1:

- **Enhanced versioning** — seamless incorporation of future breaking and non-breaking changes on existing endpoints.
- **Standardised API request/response** — consistent parameter naming across all endpoints.
- **Standardised error codes** — uniform error codes with clear resolution steps.
- **Platform-wide standardisation** — consistent standards across all Cashfree Payments services.
- **Consolidated transfer APIs** — a single transfer endpoint replaces the fragmented V1 structure.

---

## 2. Authentication

All API requests require the following headers:

| Header                           | Description                                           |
| -------------------------------- | ----------------------------------------------------- |
| `x-client-id`                    | Your app's Client ID from the Merchant Dashboard      |
| `x-client-secret`                | Your app's Client Secret from the Merchant Dashboard  |
| `x-api-version`                  | API version — always use `2024-01-01`                 |
| `x-request-id` _(optional)_      | A unique request ID for debugging and support queries |
| `x-cf-signature` _(conditional)_ | Required if your IP is not whitelisted                |

**Example headers:**

```http
x-client-id: YOUR_CLIENT_ID
x-client-secret: YOUR_CLIENT_SECRET
x-api-version: 2024-01-01
Content-Type: application/json
```

---

## 3. Payout Flow — End-to-End

The following is the recommended integration flow for initiating and processing a payout:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       PAYOUT FLOW (V2)                              │
│                                                                     │
│  Step 1: Authenticate                                               │
│  ─────────────────────                                              │
│  Set x-client-id + x-client-secret in all request headers          │
│                          │                                          │
│                          ▼                                          │
│  Step 2: Create / Verify Beneficiary                                │
│  ───────────────────────────────────                                │
│  POST /payout/beneficiary                                           │
│  → Provide bank account + IFSC (or UPI VPA)                        │
│  → Receive beneficiary_id with status: VERIFIED                    │
│                          │                                          │
│                          ▼                                          │
│  Step 3: Initiate Transfer                                          │
│  ─────────────────────────                                          │
│  POST /payout/transfers                                             │
│  → Provide transfer_id, transfer_amount, beneficiary_id            │
│  → Immediate response: status = RECEIVED                           │
│                          │                                          │
│                          ▼                                          │
│  Step 4: Track Transfer Status (Async)                              │
│  ──────────────────────────────────                                 │
│  Option A: Poll  → GET /payout/transfers/{transfer_id}             │
│  Option B: Wait  → Receive Webhook notification                    │
│                          │                                          │
│                          ▼                                          │
│  Step 5: Handle Terminal Status                                     │
│  ─────────────────────────────                                      │
│  SUCCESS → COMPLETED    (funds credited to beneficiary)            │
│  FAILED  → Inspect status_code → retry if eligible                 │
│  REVERSED → Beneficiary bank returned funds                        │
│  REJECTED → Cashfree rejected transfer before bank submission      │
└─────────────────────────────────────────────────────────────────────┘
```

### For UPI (Verify and Pay Flow):

```
  POST /payout/validate
  → Validate VPA / phone number
  → Receive transfer_token (valid 1 hour)
        │
        ▼
  POST /payout/transfers (with transfer_token)
  → Process the validated payout
```

### For Batch Payouts:

```
  POST /payout/batch-transfers
  → Provide array of transfer objects
  → Receive batch_transfer_id
        │
        ▼
  GET /payout/batch-transfers/{batch_transfer_id}
  → Check overall and per-transfer status
```

---

## 4. Beneficiary Management APIs

A **beneficiary** is a recipient to whom funds are disbursed. You must create a beneficiary before initiating any transfer.

---

### 4.1 Create Beneficiary

**Endpoint:** `POST /payout/beneficiary`

Creates a new beneficiary in your Cashfree account.

**Request Headers:**

```http
POST https://api.cashfree.com/payout/beneficiary
x-client-id: YOUR_CLIENT_ID
x-client-secret: YOUR_CLIENT_SECRET
x-api-version: 2024-01-01
Content-Type: application/json
```

**Request Body:**

| Field                                                  | Type   | Required    | Description                                                             |
| ------------------------------------------------------ | ------ | ----------- | ----------------------------------------------------------------------- | --------------- |
| `beneficiary_id`                                       | string | ✅          | Unique identifier you assign. Max 50 chars. Alphanumeric, `_`, `        | `, `.` allowed. |
| `beneficiary_name`                                     | string | ✅          | Full name of the beneficiary. Max 100 chars. Alphabets and spaces only. |
| `beneficiary_instrument_details`                       | object | ✅\*        | Payment instrument details (bank or UPI).                               |
| `beneficiary_instrument_details.bank_account_number`   | string | Conditional | Bank account number (4–25 alphanumeric chars). Required with IFSC.      |
| `beneficiary_instrument_details.bank_ifsc`             | string | Conditional | Bank IFSC code. Required with account number.                           |
| `beneficiary_instrument_details.vpa`                   | string | Conditional | UPI Virtual Payment Address (e.g., `user@upi`).                         |
| `beneficiary_contact_details`                          | object | ❌          | Optional contact information.                                           |
| `beneficiary_contact_details.beneficiary_email`        | string | ❌          | Email address.                                                          |
| `beneficiary_contact_details.beneficiary_phone`        | string | ❌          | Phone number (10 digits).                                               |
| `beneficiary_contact_details.beneficiary_country_code` | string | ❌          | Country code (e.g., `+91`).                                             |
| `beneficiary_contact_details.beneficiary_address`      | string | ❌          | Street address.                                                         |
| `beneficiary_contact_details.beneficiary_city`         | string | ❌          | City.                                                                   |
| `beneficiary_contact_details.beneficiary_state`        | string | ❌          | State.                                                                  |
| `beneficiary_contact_details.beneficiary_postal_code`  | string | ❌          | Postal / ZIP code.                                                      |

**Example Request:**

```json
{
  "beneficiary_id": "JOHN18011343",
  "beneficiary_name": "John Doe",
  "beneficiary_instrument_details": {
    "bank_account_number": "1223334444",
    "bank_ifsc": "HDFC0000001",
    "vpa": "john@upi"
  },
  "beneficiary_contact_details": {
    "beneficiary_email": "john@example.com",
    "beneficiary_phone": "9876543210",
    "beneficiary_country_code": "+91",
    "beneficiary_city": "Bengaluru",
    "beneficiary_state": "Karnataka",
    "beneficiary_postal_code": "560011"
  }
}
```

**Example Response (201 Created):**

```json
{
  "beneficiary_id": "JOHN18011343",
  "beneficiary_name": "John Doe",
  "beneficiary_instrument_details": {
    "bank_account_number": "1223334444",
    "bank_ifsc": "HDFC0000001",
    "vpa": "john@upi"
  },
  "beneficiary_contact_details": {
    "beneficiary_email": "john@example.com",
    "beneficiary_phone": "9876543210",
    "beneficiary_country_code": "+91",
    "beneficiary_city": "Bengaluru",
    "beneficiary_state": "Karnataka",
    "beneficiary_postal_code": "560011"
  },
  "beneficiary_status": "VERIFIED",
  "added_on": "2023-12-04T15:50:00Z"
}
```

**Beneficiary Status Values:**

| Status      | Description                     |
| ----------- | ------------------------------- |
| `VERIFIED`  | Verified and ready for payouts  |
| `INITIATED` | Verification in progress        |
| `INVALID`   | Beneficiary details are invalid |
| `CANCELLED` | Verification was cancelled      |
| `FAILED`    | Verification failed             |
| `DELETED`   | Beneficiary has been removed    |

**Key Error Codes:**

| HTTP Code | Error Code                           | Meaning                                           |
| --------- | ------------------------------------ | ------------------------------------------------- |
| 400       | `beneficiary_id_invalid`             | Invalid characters in `beneficiary_id`            |
| 400       | `bank_ifsc_invalid`                  | Invalid IFSC format                               |
| 400       | `bank_account_number_invalid`        | Non-alphanumeric account number                   |
| 409       | `beneficiary_id_already_exists`      | `beneficiary_id` already in use                   |
| 409       | `beneficiary_already_exists`         | Same bank account + IFSC already registered       |
| 422       | `bank_account_number_same_as_source` | Cannot use your own source account as beneficiary |

> ⚠️ Paytm UPI handles are no longer supported as beneficiary instruments.

---

### 4.2 Get Beneficiary

**Endpoint:** `GET /payout/beneficiary/{beneficiary_id}`

Retrieves details of an existing beneficiary.

**Example Request:**

```http
GET https://api.cashfree.com/payout/beneficiary/JOHN18011343
x-client-id: YOUR_CLIENT_ID
x-client-secret: YOUR_CLIENT_SECRET
x-api-version: 2024-01-01
```

**Example Response (200 OK):**

```json
{
  "beneficiary_id": "JOHN18011343",
  "beneficiary_name": "John Doe",
  "beneficiary_instrument_details": {
    "bank_account_number": "1223334444",
    "bank_ifsc": "HDFC0000001"
  },
  "beneficiary_status": "VERIFIED",
  "added_on": "2023-12-04T15:50:00Z"
}
```

---

### 4.3 Remove Beneficiary

**Endpoint:** `DELETE /payout/beneficiary/{beneficiary_id}`

Removes a beneficiary from your account. Once removed, no new transfers can be initiated to that beneficiary.

**Example Request:**

```http
DELETE https://api.cashfree.com/payout/beneficiary/JOHN18011343
x-client-id: YOUR_CLIENT_ID
x-client-secret: YOUR_CLIENT_SECRET
x-api-version: 2024-01-01
```

**Example Response (200 OK):**

```json
{
  "beneficiary_id": "JOHN18011343",
  "beneficiary_status": "DELETED"
}
```

---

## 5. Transfer APIs

---

### 5.1 Standard Transfer

**Endpoint:** `POST /payout/transfers`

Initiates a money transfer to a single beneficiary. This is an **asynchronous** operation by default — the API immediately returns a `RECEIVED` status and processes the transfer in the background.

**Request Body:**

| Field                                | Type   | Required | Description                                                                                                                              |
| ------------------------------------ | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `transfer_id`                        | string | ✅       | Your unique transfer identifier. Max 40 chars. Alphanumeric and `_` allowed.                                                             |
| `transfer_amount`                    | number | ✅       | Amount in INR. Must be ≥ 1.00. Decimals allowed.                                                                                         |
| `beneficiary_details`                | object | ✅       | Beneficiary information.                                                                                                                 |
| `beneficiary_details.beneficiary_id` | string | ✅       | ID of an already-created beneficiary.                                                                                                    |
| `transfer_currency`                  | string | ❌       | Currency code. Default: `INR`.                                                                                                           |
| `transfer_mode`                      | enum   | ❌       | Transfer rail. Default: `banktransfer`. Options: `banktransfer`, `imps`, `neft`, `rtgs`, `upi`, `paytm`, `amazonpay`, `card`, `cardupi`. |
| `transfer_remarks`                   | string | ❌       | Notes for the transfer. Max 70 chars. Alphanumeric and spaces only.                                                                      |
| `fundsource_id`                      | string | ❌       | Fund source to debit. Defaults to your primary fund source.                                                                              |

**Example Request:**

```json
{
  "transfer_id": "TXN_2024_001",
  "transfer_amount": 1500.0,
  "transfer_mode": "imps",
  "transfer_remarks": "Vendor payment January",
  "beneficiary_details": {
    "beneficiary_id": "JOHN18011343"
  }
}
```

**Example Response (200 OK — status: RECEIVED):**

```json
{
  "transfer_id": "TXN_2024_001",
  "cf_transfer_id": "987654",
  "status": "RECEIVED",
  "status_code": "RECEIVED",
  "status_description": "The transfer has been received by Cashfree successfully for further processing. You should use Check Status API response or Webhooks to know the terminal state of the transfer request.",
  "beneficiary_details": {
    "beneficiary_id": "JOHN18011343"
  },
  "transfer_amount": 1500.0,
  "transfer_mode": "IMPS",
  "fundsource_id": "CASHFREE_1",
  "added_on": "2024-01-15T10:30:00Z",
  "updated_on": "2024-01-15T10:30:05Z"
}
```

> ⚠️ **Important:** If you receive a `5XX` response, do **not** initiate a new transfer. First call `GET /payout/transfers/{transfer_id}` to check if the original transfer was processed.

---

### 5.2 Get Transfer Status

**Endpoint:** `GET /payout/transfers/{transfer_id}`

Polls the current status of a previously initiated transfer.

**Example Request:**

```http
GET https://api.cashfree.com/payout/transfers/TXN_2024_001
x-client-id: YOUR_CLIENT_ID
x-client-secret: YOUR_CLIENT_SECRET
x-api-version: 2024-01-01
```

**Response Fields:**

| Field                     | Description                                                       |
| ------------------------- | ----------------------------------------------------------------- |
| `transfer_id`             | Your unique transfer ID                                           |
| `cf_transfer_id`          | Cashfree's internal reference ID                                  |
| `status`                  | High-level status (see Section 7)                                 |
| `status_code`             | Detailed status code                                              |
| `status_description`      | Human-readable description                                        |
| `transfer_utr`            | Unique Transaction Reference from the bank (available on success) |
| `transfer_service_charge` | Service fee charged                                               |
| `transfer_service_tax`    | Tax on service fee                                                |

---

### 5.3 Batch Transfer

**Endpoint:** `POST /payout/batch-transfers`

Initiates transfers to multiple beneficiaries in a single API call.

**Request Body:**

| Field               | Type   | Required | Description                                                                            |
| ------------------- | ------ | -------- | -------------------------------------------------------------------------------------- |
| `batch_transfer_id` | string | ✅       | Unique ID for the batch. Max 50 chars.                                                 |
| `batch`             | array  | ✅       | Array of individual transfer objects (each following the Standard Transfer structure). |

**Example Request:**

```json
{
  "batch_transfer_id": "BATCH_JAN_2024",
  "batch": [
    {
      "transfer_id": "TXN_001",
      "transfer_amount": 500.0,
      "beneficiary_details": {
        "beneficiary_id": "VENDOR_A"
      }
    },
    {
      "transfer_id": "TXN_002",
      "transfer_amount": 1200.0,
      "transfer_mode": "neft",
      "beneficiary_details": {
        "beneficiary_id": "VENDOR_B"
      }
    }
  ]
}
```

**Example Response (200 OK):**

```json
{
  "batch_transfer_id": "BATCH_JAN_2024",
  "cf_batch_transfer_id": "CF_BATCH_456",
  "status": "RECEIVED",
  "added_on": "2024-01-15T10:30:00Z"
}
```

---

### 5.4 Get Batch Transfer Status

**Endpoint:** `GET /payout/batch-transfers/{batch_transfer_id}`

Retrieves the overall and per-transfer status of a batch transfer.

**Example Request:**

```http
GET https://api.cashfree.com/payout/batch-transfers/BATCH_JAN_2024
x-client-id: YOUR_CLIENT_ID
x-client-secret: YOUR_CLIENT_SECRET
x-api-version: 2024-01-01
```

> ⚠️ The Get Transfer Status V2 API (for individual transfers) does **not** return batch transfer statuses. Always use `GET /payout/batch-transfers/{batch_transfer_id}` for batches.

---

## 6. Verify and Pay (UPI Flow)

This flow is designed for **UPI payouts** where you want to validate a VPA or phone number before disbursing funds. It provides an extra layer of verification before money is sent.

---

### 6.1 Validate Payout

**Endpoint:** `POST /payout/validate`

Validates a UPI VPA or phone number and returns a **single-use transfer token** valid for **1 hour**.

**Request Body:**

| Field   | Type   | Required    | Description                                                                           |
| ------- | ------ | ----------- | ------------------------------------------------------------------------------------- |
| `vpa`   | string | Conditional | UPI Virtual Payment Address (e.g., `user@oksbi`). Provide `vpa` OR `phone`, not both. |
| `phone` | string | Conditional | 10-digit phone number linked to a UPI VPA.                                            |

**Example Request:**

```json
{
  "vpa": "john@oksbi"
}
```

**Example Response (200 OK):**

```json
{
  "transfer_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vpa": "john@oksbi",
  "vpa_name": "John Doe",
  "vpa_valid": true
}
```

> ⚠️ Pass only one of `vpa` or `phone`, never both.

---

### 6.2 Process Validated Payout

**Endpoint:** `POST /payout/transfers` _(with `transfer_token`)_

Uses the token from the Validate step to initiate the actual payout.

**Example Request:**

```json
{
  "transfer_id": "UPI_TXN_2024_001",
  "transfer_amount": 250.0,
  "transfer_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "beneficiary_details": {
    "beneficiary_id": "JOHN_UPI_001"
  }
}
```

The response and subsequent status tracking follow the same flow as the Standard Transfer (Section 5.1).

---

## 7. Transfer Statuses & Status Codes

Understanding transfer status is critical for handling edge cases. Every transfer goes through one of the following top-level statuses:

| Status               | Meaning                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `RECEIVED`           | Cashfree has accepted the transfer request and is processing it.                            |
| `QUEUED`             | Transfer is queued; waiting for processing.                                                 |
| `PENDING`            | Awaiting final confirmation from the partner bank.                                          |
| `VALIDATION_PENDING` | Beneficiary verification is pending before transfer can proceed.                            |
| `APPROVAL_PENDING`   | Transfer breached velocity/limit rules; requires manual approval on the Merchant Dashboard. |
| `SUCCESS`            | Transfer was successfully processed and credited to the beneficiary.                        |
| `FAILED`             | Transfer failed (see `status_code` for specifics).                                          |
| `REJECTED`           | Cashfree rejected the transfer before sending it to the bank.                               |
| `REVERSED`           | Beneficiary bank returned/reversed the transfer.                                            |
| `MANUALLY_REJECTED`  | Merchant manually rejected the transfer from the dashboard.                                 |

> ✅ A transfer is considered **fully successful** only when `status = SUCCESS` AND `status_code = COMPLETED`.

### Common Status Codes & Actions

| status_code                     | Typical status    | Action                                                   |
| ------------------------------- | ----------------- | -------------------------------------------------------- |
| `COMPLETED`                     | SUCCESS           | No action needed. Funds credited.                        |
| `SENT_TO_BENEFICIARY`           | SUCCESS           | In transit; bank is crediting the beneficiary.           |
| `INSUFFICIENT_BALANCE`          | FAILED / REJECTED | Recharge your Cashfree wallet/account and retry.         |
| `INVALID_BENE_ACCOUNT_OR_IFSC`  | FAILED            | Correct the account/IFSC and retry.                      |
| `INVALID_BENE_VPA`              | FAILED            | Correct the UPI VPA and retry.                           |
| `BENE_BANK_DECLINED`            | FAILED / REVERSED | Retry via Cashfree; bank will reroute.                   |
| `VELOCITY_CHECK_FAILED`         | APPROVAL_PENDING  | Approve on Merchant Dashboard → Transfers → Approve.     |
| `TRANSFER_LIMIT_BREACH`         | APPROVAL_PENDING  | Approve on Merchant Dashboard → Transfers → Approve.     |
| `BENE_NOT_EXIST`                | REJECTED          | Create the correct beneficiary first.                    |
| `RETURNED_FROM_BENEFICIARY`     | REVERSED          | Beneficiary bank couldn't credit the account. Retry.     |
| `NPCI_UNAVAILABLE`              | FAILED            | NPCI network issue. Retry after some time.               |
| `DEST_LIMIT_REACHED`            | FAILED / REVERSED | Beneficiary account at receiving limit. Retry after 24h. |
| `SOURCE_LIMIT_REACHED`          | FAILED            | Source bank at transfer limit. Retry later.              |
| `SENT_TO_BANK`                  | PENDING           | Manually sent to bank. Rely on webhook/check status.     |
| `IN_PROCESS`                    | PENDING           | Bank processing. Poll status or wait for webhook.        |
| `SCHEDULED_FOR_NEXT_WORKINGDAY` | PENDING           | NEFT/RTGS cut-off missed. Will process next working day. |
| `NRE_ACCOUNT_FAIL`              | FAILED / REVERSED | NRE accounts not supported. Get a regular account.       |
| `BENE_BLACKLISTED`              | REJECTED          | Beneficiary flagged by risk. Contact Cashfree support.   |

---

## 8. Webhooks V2

Webhooks deliver **real-time event notifications** to your server whenever a payout status changes. This eliminates the need for constant polling.

---

### 8.1 Setup & Configuration

1. Log in to the [Merchant Dashboard](https://merchant.cashfree.com/merchants/landing).
2. Go to **Payouts → Developers → Webhooks**.
3. Click **Add Webhook URL**.
4. Enter:
   - **Webhook URL**: Your server endpoint (must be publicly reachable).
   - **Version**: Select **V2** from the dropdown.
5. Click **Test & Add Webhook**.

> ⚠️ You must explicitly select **V2** to receive V2-format webhook payloads. V1 and V2 webhooks can coexist independently.

---

### 8.2 Signature Verification

Every incoming webhook carries a signature in the request headers. **Always verify this signature** before processing the payload to protect against spoofed requests.

**Verification Logic (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(signature, rawBody, timestamp, clientSecret) {
  const signatureString = timestamp + rawBody;
  const generatedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(signatureString)
    .digest('base64');

  return generatedSignature === signature;
}

// Usage in Express:
app.post('/webhook/cashfree', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = JSON.stringify(req.body);

  if (
    !verifyWebhookSignature(
      signature,
      rawBody,
      timestamp,
      process.env.CF_CLIENT_SECRET,
    )
  ) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;
  // Process event...
  res.status(200).send('OK');
});
```

**Verification Logic (Go):**

```go
func PayoutVerifyWebhookSignature(signature, rawBody, timestamp, clientSecret string) bool {
    signatureString := timestamp + rawBody
    mac := hmac.New(sha256.New, []byte(clientSecret))
    mac.Write([]byte(signatureString))
    generatedSignature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
    return generatedSignature == signature
}
```

**Headers to read from incoming webhook:**

| Header                | Description                                 |
| --------------------- | ------------------------------------------- |
| `x-webhook-signature` | HMAC-SHA256 signature in Base64             |
| `x-webhook-timestamp` | Unix timestamp of when the webhook was sent |

> ⚠️ Use the **oldest active client secret** to generate the webhook signature. Using a newer secret will cause a mismatch.

---

### 8.3 Webhook Events

| Event Type               | Trigger                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `TRANSFER_ACKNOWLEDGED`  | Transfer is successful; amount debited from your account and credited to the beneficiary. |
| `TRANSFER_SUCCESS`       | Transfer amount has been deposited in the beneficiary's bank account.                     |
| `TRANSFER_FAILED`        | The transfer attempt failed.                                                              |
| `TRANSFER_REVERSED`      | Beneficiary's bank reversed the transfer.                                                 |
| `TRANSFER_REJECTED`      | Cashfree rejected the transfer request (before sending to bank).                          |
| `BULK_TRANSFER_REJECTED` | One or more transfers in a batch request were rejected.                                   |
| `BENEFICIARY_INCIDENT`   | Service disruption or incident affecting a specific beneficiary bank or payment mode.     |
| `CREDIT_CONFIRMATION`    | Funds were credited to your Cashfree account balance.                                     |
| `LOW_BALANCE_ALERT`      | Your account balance fell below a predefined threshold.                                   |

---

### 8.4 Sample Payloads

#### TRANSFER_ACKNOWLEDGED

```json
{
  "data": {
    "transfer_id": "TXN_2024_001",
    "cf_transfer_id": "987654",
    "status": "SUCCESS",
    "status_code": "COMPLETED",
    "status_description": "The transfer has been initiated via the partner bank successfully, hence your account is debited and the request is successfully processed by the beneficiary bank and has been credited to the end beneficiary.",
    "beneficiary_details": {
      "beneficiary_id": "JOHN18011343",
      "beneficiary_instrument_details": {
        "bank_account_number": "1223334444",
        "bank_ifsc": "HDFC0000001"
      }
    },
    "transfer_amount": 1500.0,
    "transfer_service_charge": 2.5,
    "transfer_service_tax": 0.45,
    "transfer_mode": "IMPS",
    "transfer_utr": "HDFC202401150010001",
    "fundsource_id": "CASHFREE_1",
    "added_on": "2024-01-15T10:30:00Z",
    "updated_on": "2024-01-15T10:30:45Z"
  },
  "event_time": "2024-01-15T10:30:47",
  "type": "TRANSFER_ACKNOWLEDGED"
}
```

#### TRANSFER_SUCCESS

```json
{
  "data": {
    "transfer_id": "TXN_2024_001",
    "cf_transfer_id": "987654",
    "status": "SUCCESS",
    "status_code": "COMPLETED",
    "status_description": "Funds credited to the beneficiary.",
    "beneficiary_details": {
      "beneficiary_id": "JOHN18011343",
      "beneficiary_instrument_details": {
        "bank_account_number": "1223334444",
        "bank_ifsc": "HDFC0000001"
      }
    },
    "transfer_amount": 1500.0,
    "transfer_service_charge": 2.5,
    "transfer_service_tax": 0.45,
    "transfer_mode": "IMPS",
    "transfer_utr": "HDFC202401150010001",
    "fundsource_id": "CASHFREE_1",
    "added_on": "2024-01-15T10:30:00Z",
    "updated_on": "2024-01-15T10:30:45Z"
  },
  "event_time": "2024-01-15T10:30:47",
  "type": "TRANSFER_SUCCESS"
}
```

#### TRANSFER_FAILED

```json
{
  "data": {
    "transfer_id": "TXN_2024_002",
    "cf_transfer_id": "987655",
    "status": "FAILED",
    "status_code": "INSUFFICIENT_BALANCE",
    "status_description": "The transfer has failed because of low balance in your Cashfree Wallet/Bank Account.",
    "beneficiary_details": {
      "beneficiary_id": "VENDOR_B"
    },
    "transfer_amount": 5000.0,
    "transfer_mode": "BANK",
    "fundsource_id": "CASHFREE_1",
    "added_on": "2024-01-15T10:35:00Z",
    "updated_on": "2024-01-15T10:35:12Z"
  },
  "event_time": "2024-01-15T10:35:14",
  "type": "TRANSFER_FAILED"
}
```

#### TRANSFER_REVERSED

```json
{
  "data": {
    "transfer_id": "TXN_2024_003",
    "cf_transfer_id": "987656",
    "status": "REVERSED",
    "status_code": "BENE_BANK_DECLINED",
    "status_description": "The transfer has been declined by the beneficiary bank and they were unable to credit the end beneficiary's bank account.",
    "beneficiary_details": {
      "beneficiary_id": "JOHN18011343",
      "beneficiary_instrument_details": {
        "bank_account_number": "1223334444",
        "bank_ifsc": "HDFC0000001"
      }
    },
    "transfer_amount": 1000.0,
    "transfer_mode": "IMPS",
    "fundsource_id": "CASHFREE_1",
    "added_on": "2024-01-15T11:00:00Z",
    "updated_on": "2024-01-15T11:15:00Z"
  },
  "event_time": "2024-01-15T11:15:02",
  "type": "TRANSFER_REVERSED"
}
```

#### TRANSFER_REJECTED

```json
{
  "data": {
    "transfer_id": "TXN_2024_004",
    "cf_transfer_id": "987657",
    "status": "REJECTED",
    "status_code": "BENE_NOT_EXIST",
    "status_description": "The transfer has been rejected because the beneficiary does not exist.",
    "beneficiary_details": {
      "beneficiary_id": "INVALID_BENE"
    },
    "transfer_amount": 200.0,
    "transfer_mode": "BANK",
    "fundsource_id": "CASHFREE_1",
    "added_on": "2024-01-15T11:20:00Z",
    "updated_on": "2024-01-15T11:20:01Z"
  },
  "event_time": "2024-01-15T11:20:02",
  "type": "TRANSFER_REJECTED"
}
```

#### BULK_TRANSFER_REJECTED

```json
{
  "data": {
    "batch_transfer_id": "BATCH_JAN_2024",
    "cf_batch_transfer_id": "CF_BATCH_456",
    "status": "REJECTED"
  },
  "event_time": "2024-01-15T12:00:00",
  "type": "BULK_TRANSFER_REJECTED"
}
```

#### LOW_BALANCE_ALERT

```json
{
  "data": {
    "current_balance": 450.0,
    "threshold_balance": 1000.0,
    "fundsource_id": "CASHFREE_1"
  },
  "event_time": "2024-01-15T13:00:00",
  "type": "LOW_BALANCE_ALERT"
}
```

#### CREDIT_CONFIRMATION

```json
{
  "data": {
    "credited_amount": 50000.0,
    "current_balance": 50450.0,
    "fundsource_id": "CASHFREE_1",
    "credit_utr": "NEFT20240115XXX"
  },
  "event_time": "2024-01-15T14:00:00",
  "type": "CREDIT_CONFIRMATION"
}
```

#### BENEFICIARY_INCIDENT

```json
{
  "data": {
    "incident_description": "IMPS transfers to SBI are currently experiencing delays due to a scheduled maintenance window.",
    "affected_bank": "SBI",
    "affected_mode": "IMPS",
    "incident_start_time": "2024-01-15T02:00:00Z",
    "expected_resolution": "2024-01-15T06:00:00Z"
  },
  "event_time": "2024-01-15T02:05:00",
  "type": "BENEFICIARY_INCIDENT"
}
```

---

### Webhook Payload Parameters Reference

| Parameter                        | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `transfer_id`                    | Your unique ID for the transfer                |
| `cf_transfer_id`                 | Cashfree's internal reference ID               |
| `status`                         | High-level status of the transfer              |
| `status_code`                    | Detailed status code                           |
| `status_description`             | Human-readable description of status           |
| `beneficiary_details`            | Object containing beneficiary information      |
| `beneficiary_id`                 | Your unique ID for the beneficiary             |
| `beneficiary_instrument_details` | Bank account / UPI details of beneficiary      |
| `bank_account_number`            | Beneficiary bank account number                |
| `bank_ifsc`                      | Beneficiary bank IFSC code                     |
| `transfer_amount`                | Amount transferred (INR)                       |
| `transfer_service_charge`        | Service fee for the transfer                   |
| `transfer_service_tax`           | GST on the service fee                         |
| `transfer_mode`                  | Mode used: BANK, IMPS, NEFT, RTGS, UPI, etc.   |
| `transfer_utr`                   | Bank-generated Unique Transaction Reference    |
| `fundsource_id`                  | Fund source ID debited for this transfer       |
| `added_on`                       | Timestamp when transfer was created (UTC)      |
| `updated_on`                     | Timestamp of last status update (UTC)          |
| `event_time`                     | Timestamp when the webhook event was triggered |
| `type`                           | Webhook event type                             |

---

### 8.5 Retry Policy & IPs to Whitelist

**Retry Policy:**

- Your server must respond with HTTP `200` to acknowledge receipt.
- Any response outside `200` (including `3xx`) is treated as a failed delivery.
- Cashfree will retry at gradually decreasing intervals.
- If the webhook fails more than **5 times**, the webhook service is disabled for that endpoint.
- Contact Cashfree support via the [Support Form](https://merchant.cashfree.com/merchants/landing?env=prod&raise_issue=1) if deliveries stop unexpectedly.

**IPs to Whitelist:**

_Sandbox (UAT):_

| IP Address      |
| --------------- |
| `52.66.25.127`  |
| `15.206.45.168` |

_Production:_

| IP Address      |
| --------------- |
| `52.66.101.190` |
| `3.109.102.144` |
| `18.60.134.245` |
| `18.60.183.142` |

_Port:_ `443` (HTTPS only)

---

## 9. Error Handling Best Practices

### DO:

- **Always check for `5XX` errors** before initiating a new transfer. Use `GET /payout/transfers/{transfer_id}` to verify if a transfer was already created.
- **Always verify webhook signatures** using HMAC-SHA256 before processing events.
- **Use idempotent `transfer_id` values** — the same `transfer_id` will not be processed twice.
- **Rely on webhooks as the primary notification mechanism** and use polling as a fallback.
- **Return HTTP 200 promptly** from your webhook handler before doing any heavy processing.
- **Handle `APPROVAL_PENDING` status** by reviewing and approving on the Merchant Dashboard.

### DON'T:

- **Never retry a transfer** on `5XX` without first checking the transfer status.
- **Never duplicate `transfer_id`** values — reuse of a `transfer_id` will return the original transfer's status.
- **Don't treat `SENT_TO_BENEFICIARY`** as fully complete — wait for `COMPLETED` status code.
- **Don't use a newer client secret** for webhook signature verification — use the oldest active secret.

### Transfer Retry Decision Tree:

```
Transfer Failed?
  ├── status_code = INSUFFICIENT_BALANCE  →  Recharge wallet → Retry
  ├── status_code = INVALID_BENE_*        →  Fix beneficiary → Retry with same transfer_id? NO — use new transfer_id
  ├── status_code = NPCI_UNAVAILABLE      →  Wait 15–30 min → Retry via Cashfree
  ├── status_code = DEST_LIMIT_REACHED   →  Wait 24h → Retry
  ├── status_code = BENE_BLACKLISTED     →  Contact Cashfree support → Do NOT retry automatically
  └── status_code = PAYOUT_INTERNAL_ERROR → Retry via Cashfree (they will reroute via different bank)

Transfer in APPROVAL_PENDING?
  └── Log in to Merchant Dashboard → Transfers → Approve → Transfer proceeds automatically
```

---

## Quick Reference — API Endpoints

| Method   | Endpoint                                      | Purpose                                 |
| -------- | --------------------------------------------- | --------------------------------------- |
| `POST`   | `/payout/beneficiary`                         | Create a beneficiary                    |
| `GET`    | `/payout/beneficiary/{beneficiary_id}`        | Fetch beneficiary details               |
| `DELETE` | `/payout/beneficiary/{beneficiary_id}`        | Remove a beneficiary                    |
| `POST`   | `/payout/transfers`                           | Initiate a standard transfer            |
| `GET`    | `/payout/transfers/{transfer_id}`             | Get transfer status                     |
| `POST`   | `/payout/batch-transfers`                     | Initiate a batch transfer               |
| `GET`    | `/payout/batch-transfers/{batch_transfer_id}` | Get batch transfer status               |
| `POST`   | `/payout/validate`                            | Validate UPI VPA / phone (Verify & Pay) |
| `POST`   | `/payout/transfers` _(with token)_            | Process a validated UPI payout          |

---

_Last updated based on Cashfree Payouts API V2 documentation — `x-api-version: 2024-01-01`_  
_Official Docs: https://www.cashfree.com/docs/api-reference/payouts/v2/payouts-api-v2-new_
