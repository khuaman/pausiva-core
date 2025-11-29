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

### 2.4 `appointments`

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

### 2.5 `paraclinics`

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

### 2.6 `plans`

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

### 2.7 `followings`

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

### 2.8 `payments`

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

### 2.9 `patient_timeline_events`

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

## 3. Summary of Relationships

- `auth.users` 1 — 1 `users`
- `users` 1 — 1 `patients` (for users that are patients)
- `users` 1 — 1 `doctors` (for users that are doctors)
- `patients` 1 — N `appointments`
- `doctors` 1 — N `appointments`
- `appointments` 1 — N `paraclinics`
- `appointments` 1 — N `plans`
- `appointments` 1 — 1 `payments`
- `patients` 1 — N `followings` (optionally linked to an `appointment`)
- `patients` 1 — N `patient_timeline_events`

This spec is the **authoritative source** for creating Supabase migrations via the CLI. Use the column names, types, constraints, and enums exactly as defined here when writing the SQL in your migration files.


