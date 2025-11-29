## Supabase Database Schema (Authoritative Spec)

This file defines the **exact schema** for the menopause companion database in Supabase.  
Use it as the source of truth when writing Supabase CLI migrations (SQL is intentionally omitted).

Types are Postgres/Supabase types (e.g. `uuid`, `timestamptz`, `jsonb`).

---

## 1. Enums

Define the following Postgres enums in Supabase:

- **`appointment_type`**
  - Values: `pre_consulta`, `consulta`

- **`appointment_status`**
  - Values: `scheduled`, `completed`, `cancelled`, `no_show`, `rescheduled`

- **`paraclinic_type`**
  - Values: `image`, `lab`, `procedure`

- **`followings_type`**
  - Values: `emotional`, `symptoms`, `medications`, `business`, `other`

- **`followings_channel`**
  - Values: `whatsapp`

- **`payment_status`**
  - Values: `pending`, `paid`, `refunded`, `failed`

- **`timeline_event_type`**
  - Values: `appointment`, `paraclinic`, `plan`, `followup`, `payment`

- **`staff_role`**
  - Values: `admin`, `support`, `billing`, `operations`

- **`membership_status`**
  - Values: `active`, `paused`, `cancelled`, `expired`

- **`membership_tier`**
  - Values: `basic`, `standard`, `premium`

---

## 2. Tables

### 2.1 `users`

Application-level user profiles mapped 1:1 with `auth.users`.

| Column       | Type        | Nullable | Default              | Constraints / Notes                                                |
|-------------|-------------|----------|----------------------|--------------------------------------------------------------------|
| `id`        | `uuid`      | NO       | —                    | **PK**. **FK → `auth.users.id`**. 1:1 with Supabase Auth user.     |
| `created_at`| `timestamptz`| NO      | `now()`              | Creation timestamp.                                                |
| `updated_at`| `timestamptz`| NO      | `now()`              | Last update timestamp.                                             |
| `full_name` | `text`      | NO       | —                    | Full name.                                                         |
| `email`     | `text`      | NO       | —                    | Should mirror `auth.users.email`. Add **UNIQUE** index.            |
| `phone`     | `text`      | YES      | —                    | E.164 recommended (e.g. `+51...`).                                 |
| `birth_date`| `date`      | YES      | —                    | Used to compute age dynamically.                                   |
| `picture_url` | `text`    | YES      | —                    | Public URL to avatar/photo.                                        |

**Indexes / Constraints**
- PK: `id`
- UNIQUE: `email`
- FK: `id` → `auth.users.id` (on delete cascade)

---

### 2.2 `patients`

Clinical patient entity. One-to-one with `users` for patients.

| Column                 | Type    | Nullable | Default | Constraints / Notes                                     |
|------------------------|---------|----------|---------|---------------------------------------------------------|
| `id`                   | `uuid`  | NO       | —       | **PK**. **FK → `users.id`** (patient is a user).       |
| `dni`                  | `text`  | NO       | —       | Peruvian national ID. **UNIQUE**.                      |
| `clinical_profile_json`| `jsonb` | YES      | `null`  | Optional structured medical background/history.        |

**Indexes / Constraints**
- PK: `id`
- UNIQUE: `dni`
- FK: `id` → `users.id` (on delete cascade)

---

### 2.3 `doctors`

Doctor entity. One-to-one with `users` for doctors.

| Column    | Type   | Nullable | Default | Constraints / Notes                                  |
|-----------|--------|----------|---------|------------------------------------------------------|
| `id`      | `uuid` | NO       | —       | **PK**. **FK → `users.id`** (doctor is a user).     |
| `dni`     | `text` | YES      | —       | Optional Peruvian DNI. **UNIQUE** if present.       |
| `cmp`     | `text` | NO       | —       | Medical license (CMP). **UNIQUE**.                  |
| `specialty`| `text`| NO       | —       | E.g. `Ginecología`, `Nutrición`, `Psicología`.      |

**Indexes / Constraints**
- PK: `id`
- UNIQUE: `cmp`
- UNIQUE (optional): `dni`
- FK: `id` → `users.id` (on delete cascade)

---

### 2.4 `staff`

Staff entity. One-to-one with `users` for staff members who can manage users, view payments, and handle memberships.

| Column       | Type         | Nullable | Default    | Constraints / Notes                                  |
|--------------|--------------|----------|------------|------------------------------------------------------|
| `id`         | `uuid`       | NO       | —          | **PK**. **FK → `users.id`** (staff is a user).      |
| `dni`        | `text`       | YES      | —          | Optional Peruvian DNI. **UNIQUE** if present.       |
| `employee_id`| `text`       | NO       | —          | Internal employee identifier. **UNIQUE**.           |
| `role`       | `staff_role` | NO       | `support`  | `admin`, `support`, `billing`, or `operations`.     |
| `department` | `text`       | YES      | —          | Department or area (e.g. "Customer Support").       |
| `created_at` | `timestamptz`| NO       | `now()`    | Creation timestamp.                                 |
| `updated_at` | `timestamptz`| NO       | `now()`    | Last update timestamp.                              |

**Indexes / Constraints**
- PK: `id`
- UNIQUE: `employee_id`
- UNIQUE (optional): `dni`
- FK: `id` → `users.id` (on delete cascade)
- Indexes:
  - `role`
  - `department`

---

### 2.5 `appointments`

Medical appointments (`pre-consulta` / `consulta`) linking patients and doctors.

| Column        | Type               | Nullable | Default    | Constraints / Notes                                                 |
|--------------|--------------------|----------|------------|---------------------------------------------------------------------|
| `id`         | `uuid`             | NO       | random uuid| **PK**.                                                              |
| `patient_id` | `uuid`             | NO       | —          | **FK → `patients.id`**.                                             |
| `doctor_id`  | `uuid`             | NO       | —          | **FK → `doctors.id`**.                                              |
| `type`       | `appointment_type` | NO       | —          | `pre_consulta` or `consulta`.                                      |
| `status`     | `appointment_status`| NO      | `scheduled`| Lifecycle: `scheduled`, `completed`, `cancelled`, `no_show`, etc.  |
| `scheduled_at`| `timestamptz`     | NO       | —          | Date/time of the appointment.                                      |
| `notes`      | `text`             | YES      | —          | Doctor notes from the appointment.                                 |
| `created_at` | `timestamptz`      | NO       | `now()`    | Creation timestamp.                                                |
| `updated_at` | `timestamptz`      | NO       | `now()`    | Last update timestamp.                                             |

**Indexes / Constraints**
- PK: `id`
- FK: `patient_id` → `patients.id` (on delete cascade)
- FK: `doctor_id` → `doctors.id` (on delete restrict or cascade; choose per policy)
- Indexes:
  - `patient_id`
  - `doctor_id`
  - `scheduled_at`

---

### 2.6 `paraclinics`

Paraclinical exams/results (labs, imaging, procedures) associated with an appointment.

| Column        | Type             | Nullable | Default    | Constraints / Notes                         |
|--------------|------------------|----------|------------|---------------------------------------------|
| `id`         | `uuid`           | NO       | random uuid| **PK**.                                      |
| `appointment_id` | `uuid`       | NO       | —          | **FK → `appointments.id`**.                 |
| `type`       | `paraclinic_type`| NO       | —          | `image`, `lab`, or `procedure`.            |
| `file_format`| `text`           | YES      | —          | e.g. `pdf`, `jpg`, `png`, `dcm`.           |
| `result_date`| `date`           | YES      | —          | When the result became available.          |
| `file_url`   | `text`           | NO       | —          | URL to result file (Supabase storage, etc).|
| `description`| `text`           | YES      | —          | Short label (e.g. "Perfil hormonal").      |

**Indexes / Constraints**
- PK: `id`
- FK: `appointment_id` → `appointments.id` (on delete cascade)
- Indexes:
  - `appointment_id`

---

### 2.7 `plans`

Proposed plan of the doctor (e.g. treatment, prescription) linked to an appointment.  
The `plan` is intentionally flexible to support different input formats.

| Column        | Type     | Nullable | Default    | Constraints / Notes                                  |
|--------------|----------|----------|------------|------------------------------------------------------|
| `id`         | `uuid`   | NO       | random uuid| **PK**.                                              |
| `appointment_id` | `uuid`| NO      | —          | **FK → `appointments.id`**.                          |
| `start_date` | `date`   | YES      | —          | When plan starts (can be same as appointment date).  |
| `end_date`   | `date`   | YES      | —          | When plan ends (nullable if ongoing).                |
| `plan`       | `jsonb`  | YES      | `null`     | Arbitrary JSON/string payload from doctor.           |
| `created_at` | `timestamptz`| NO   | `now()`    | Creation timestamp.                                  |
| `updated_at` | `timestamptz`| NO   | `now()`    | Last update timestamp.                               |

**Indexes / Constraints**
- PK: `id`
- FK: `appointment_id` → `appointments.id` (on delete cascade)
- Indexes:
  - `appointment_id`

---

### 2.8 `followings`

AI-initiated or automated follow-ups (e.g. WhatsApp interactions) with patients.

| Column         | Type               | Nullable | Default      | Constraints / Notes                                                                 |
|----------------|--------------------|----------|--------------|-------------------------------------------------------------------------------------|
| `id`           | `uuid`             | NO       | random uuid  | **PK**.                                                                             |
| `patient_id`   | `uuid`             | NO       | —            | **FK → `patients.id`**.                                                             |
| `appointment_id`| `uuid`            | YES      | —            | **FK → `appointments.id`**, nullable (not all follow-ups tied to a specific visit).|
| `type`         | `followings_type`  | NO       | —            | `emotional`, `symptoms`, `medications`, `business`, or `other`.                    |
| `channel`      | `followings_channel`| NO      | `whatsapp`   | Currently only WhatsApp, extensible later.                                         |
| `contacted_at` | `timestamptz`      | NO       | —            | Timestamp of the interaction/conversation.                                         |
| `message_count`| `integer`          | NO       | `0`          | Number of messages exchanged in this follow-up.                                    |
| `transcript_url`| `text`            | YES      | —            | URL where the full transcript is stored.                                           |
| `summary`      | `text`             | YES      | —            | Short human-readable summary.                                                      |
| `severity_score`| `integer`         | YES      | —            | 0–10 severity/intensity score (derived).                                           |
| `is_urgent`    | `boolean`          | NO       | `false`      | Flag used for urgent alerts on the dashboard.                                      |
| `created_at`   | `timestamptz`      | NO       | `now()`      | Creation timestamp.                                                                 |

**Indexes / Constraints**
- PK: `id`
- FK: `patient_id` → `patients.id` (on delete cascade)
- FK: `appointment_id` → `appointments.id` (on delete set null or cascade, per policy)
- Indexes:
  - `patient_id`
  - `appointment_id`
  - `is_urgent`
  - `(patient_id, contacted_at)`

---

### 2.9 `payments`

Payments linked 1:1 to appointments (one payment per appointment).

| Column         | Type           | Nullable | Default      | Constraints / Notes                                                       |
|----------------|----------------|----------|--------------|---------------------------------------------------------------------------|
| `id`           | `uuid`         | NO       | random uuid  | **PK**.                                                                   |
| `appointment_id`| `uuid`        | NO       | —            | **FK → `appointments.id`**. **UNIQUE** (enforces 1:1 with appointments). |
| `transaction_id`| `text`        | NO       | —            | External payment provider transaction ID. **UNIQUE**.                    |
| `amount`       | `numeric(10,2)`| NO       | —            | Payment amount.                                                           |
| `currency`     | `char(3)`      | NO       | `'PEN'`      | ISO 4217 currency code (e.g. `PEN`).                                     |
| `status`       | `payment_status`| NO      | `pending`    | `pending`, `paid`, `refunded`, `failed`.                                 |
| `paid_at`      | `timestamptz`  | YES      | —            | When payment was successfully completed (null if not paid).              |
| `created_at`   | `timestamptz`  | NO       | `now()`      | Creation timestamp.                                                       |

**Indexes / Constraints**
- PK: `id`
- UNIQUE: `appointment_id`
- UNIQUE: `transaction_id`
- FK: `appointment_id` → `appointments.id` (on delete cascade or restrict; choose per policy)
- Indexes:
  - `status`
  - `(status, created_at)`

---

### 2.10 `patient_timeline_events`

Unified timeline of events for each patient (appointments, plans, exams, follow-ups, payments).

This can be implemented either as a **real table** (populated by app code or triggers) or as a **view** that `UNION ALL`s the underlying tables. The definition below assumes a **real table**.

| Column        | Type                | Nullable | Default      | Constraints / Notes                                                                                       |
|--------------|---------------------|----------|--------------|-----------------------------------------------------------------------------------------------------------|
| `id`         | `uuid`              | NO       | random uuid  | **PK**.                                                                                                   |
| `patient_id` | `uuid`              | NO       | —            | **FK → `patients.id`**.                                                                                   |
| `occurred_at`| `timestamptz`       | NO       | —            | When the event occurred (appointment time, result time, follow-up time, etc.).                            |
| `event_type` | `timeline_event_type`| NO      | —            | `appointment`, `paraclinic`, `plan`, `followup`, or `payment`.                                           |
| `source_table`| `text`             | NO       | —            | Name of the underlying table (`appointments`, `paraclinics`, `plans`, `followings`, `payments`).         |
| `source_id`  | `uuid`              | NO       | —            | ID of the row in the `source_table`. (Logical FK; cannot use dynamic FK in Postgres).                    |
| `summary`    | `text`              | YES      | —            | Short text used for quick display in the timeline.                                                        |
| `payload`    | `jsonb`             | YES      | `null`       | Optional extra data for richer UI / AI reasoning.                                                         |

**Indexes / Constraints**
- PK: `id`
- FK: `patient_id` → `patients.id` (on delete cascade)
- Indexes:
  - `(patient_id, occurred_at)` **(critical for fast timeline queries)**
  - `event_type`

---

### 2.11 `memberships`

Patient membership/subscription management. Tracks active, paused, cancelled, and expired memberships.

| Column               | Type                | Nullable | Default      | Constraints / Notes                                                       |
|---------------------|---------------------|----------|--------------|---------------------------------------------------------------------------|
| `id`                | `uuid`              | NO       | random uuid  | **PK**.                                                                   |
| `patient_id`        | `uuid`              | NO       | —            | **FK → `patients.id`**.                                                   |
| `tier`              | `membership_tier`   | NO       | `basic`      | `basic`, `standard`, or `premium`.                                       |
| `status`            | `membership_status` | NO       | `active`     | `active`, `paused`, `cancelled`, or `expired`.                           |
| `start_date`        | `timestamptz`       | NO       | `now()`      | When membership starts.                                                   |
| `end_date`          | `timestamptz`       | YES      | —            | When membership ends (null if ongoing/subscription).                     |
| `renewal_date`      | `timestamptz`       | YES      | —            | Next renewal date (for active subscriptions).                            |
| `price`             | `numeric(10,2)`     | NO       | —            | Membership price.                                                         |
| `currency`          | `char(3)`           | NO       | `'PEN'`      | ISO 4217 currency code.                                                   |
| `auto_renew`        | `boolean`           | NO       | `true`       | Whether membership auto-renews.                                          |
| `cancelled_at`      | `timestamptz`       | YES      | —            | When membership was cancelled.                                           |
| `cancelled_by`      | `uuid`              | YES      | —            | **FK → `users.id`** (staff or user who cancelled).                       |
| `cancellation_reason`| `text`            | YES      | —            | Reason for cancellation.                                                 |
| `metadata`          | `jsonb`             | YES      | `null`       | Additional flexible data (benefits, features, etc).                      |
| `created_at`        | `timestamptz`       | NO       | `now()`      | Creation timestamp.                                                       |
| `updated_at`        | `timestamptz`       | NO       | `now()`      | Last update timestamp.                                                    |

**Indexes / Constraints**
- PK: `id`
- FK: `patient_id` → `patients.id` (on delete cascade)
- FK: `cancelled_by` → `users.id` (on delete set null)
- CHECK: `price >= 0`
- CHECK: `end_date is null or end_date > start_date`
- Indexes:
  - `patient_id`
  - `status`
  - `tier`
  - `renewal_date`
  - `(status, renewal_date)`

---

### 2.12 `membership_payments`

Payment history for memberships (separate from appointment payments).

| Column          | Type            | Nullable | Default      | Constraints / Notes                                            |
|----------------|-----------------|----------|--------------|----------------------------------------------------------------|
| `id`           | `uuid`          | NO       | random uuid  | **PK**.                                                        |
| `membership_id`| `uuid`          | NO       | —            | **FK → `memberships.id`**.                                     |
| `transaction_id`| `text`         | NO       | —            | External payment provider transaction ID. **UNIQUE**.         |
| `amount`       | `numeric(10,2)` | NO       | —            | Payment amount.                                                |
| `currency`     | `char(3)`       | NO       | `'PEN'`      | ISO 4217 currency code.                                        |
| `status`       | `payment_status`| NO       | `pending`    | `pending`, `paid`, `refunded`, `failed`.                      |
| `payment_method`| `text`         | YES      | —            | Payment method used (e.g. "card", "transfer", "cash").        |
| `paid_at`      | `timestamptz`   | YES      | —            | When payment was successfully completed.                       |
| `processed_by` | `uuid`          | YES      | —            | **FK → `staff.id`** (staff who processed, if manual).         |
| `created_at`   | `timestamptz`   | NO       | `now()`      | Creation timestamp.                                            |

**Indexes / Constraints**
- PK: `id`
- UNIQUE: `transaction_id`
- FK: `membership_id` → `memberships.id` (on delete cascade)
- FK: `processed_by` → `staff.id` (on delete set null)
- CHECK: `amount > 0`
- Indexes:
  - `membership_id`
  - `status`
  - `paid_at`
  - `processed_by`

---

### 2.13 `staff_activity_log`

Audit log tracking staff actions for compliance and monitoring. Logs user management, payment views, and membership operations.

| Column        | Type         | Nullable | Default      | Constraints / Notes                                                    |
|--------------|--------------|----------|--------------|------------------------------------------------------------------------|
| `id`         | `uuid`       | NO       | random uuid  | **PK**.                                                                |
| `staff_id`   | `uuid`       | NO       | —            | **FK → `staff.id`**.                                                   |
| `action_type`| `text`       | NO       | —            | Action performed (e.g. "view_payment", "update_user", "cancel_membership"). |
| `target_table`| `text`      | YES      | —            | Table affected by the action (e.g. "users", "payments", "memberships").|
| `target_id`  | `uuid`       | YES      | —            | ID of the affected record. (Logical FK; cannot use dynamic FK).       |
| `description`| `text`       | NO       | —            | Human-readable description of the action.                             |
| `metadata`   | `jsonb`      | YES      | `null`       | Additional context (IP address, changed fields, etc).                 |
| `created_at` | `timestamptz`| NO       | `now()`      | When the action occurred.                                              |

**Indexes / Constraints**
- PK: `id`
- FK: `staff_id` → `staff.id` (on delete cascade)
- Indexes:
  - `staff_id`
  - `action_type`
  - `created_at`
  - `(target_table, target_id)`

---

## 3. Summary of Relationships

- `auth.users` 1 — 1 `users`
- `users` 1 — 1 `patients` (for users that are patients)
- `users` 1 — 1 `doctors` (for users that are doctors)
- `users` 1 — 1 `staff` (for users that are staff members)
- `patients` 1 — N `appointments`
- `doctors` 1 — N `appointments`
- `appointments` 1 — N `paraclinics`
- `appointments` 1 — N `plans`
- `appointments` 1 — 1 `payments`
- `patients` 1 — N `followings` (optionally linked to an `appointment`)
- `patients` 1 — N `patient_timeline_events`
- `patients` 1 — N `memberships`
- `memberships` 1 — N `membership_payments`
- `staff` 1 — N `staff_activity_log`
- `staff` 1 — N `membership_payments` (as processor)

This spec is the **authoritative source** for creating Supabase migrations via the CLI. Use the column names, types, constraints, and enums exactly as defined here when writing the SQL in your migration files.


