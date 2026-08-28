# molibso Internal — API documentation

Base URL (local): `http://localhost:3000/api/v1`

All successful responses:

```json
{ "success": true, "data": { }, "message": "optional" }
```

All errors:

```json
{ "success": false, "error": "Human-readable message" }
```

## Auth

Most endpoints require:

```http
Authorization: Bearer <token>
```

Get a token via login (below). Browser UI sessions (cookies) also work for the same routes.

---

### `GET /health`

No auth. Checks Supabase connectivity.

**Response**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "supabase-postgresql",
    "userCount": 6,
    "employeeCount": 6
  }
}
```

---

### `POST /auth/login`

**Request**

```json
{
  "email": "you@company.com",
  "password": "your-password"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": "8h",
    "user": {
      "id": "clx...",
      "email": "you@company.com",
      "role": "ADMIN",
      "employeeId": "clx...",
      "name": "Your Name"
    }
  }
}
```

---

### `POST /auth/bootstrap`

**No auth.** Creates the **first** admin when the database has zero users. Returns 403 once any user exists.

**Request**

```json
{
  "email": "admin@company.com",
  "password": "ChooseAStrongPassword1",
  "firstName": "Lars",
  "lastName": "Hollenbacher",
  "position": "Founder"
}
```

**Response**

```json
{
  "success": true,
  "message": "First admin account created.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": "8h",
    "user": {
      "id": "clx...",
      "email": "admin@company.com",
      "role": "ADMIN",
      "employeeId": "clx...",
      "name": "Lars Hollenbacher"
    }
  }
}
```

After bootstrap, create more people with `POST /employees` using the returned Bearer token.

---

### `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response**

```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "email": "employee@molibso.de",
    "role": "EMPLOYEE",
    "employeeId": "clx...",
    "employee": {
      "id": "clx...",
      "firstName": "Maya",
      "lastName": "Chen",
      "position": "Software Engineer",
      "status": "ACTIVE",
      "weeklyHours": 40,
      "vacationAllowance": 20
    }
  }
}
```

---

### `GET /dashboard`

Role-aware dashboard KPIs, clock status, leave, team availability (bosses).

**Response (excerpt)**

```json
{
  "success": true,
  "data": {
    "clockStatus": { "status": "OFFLINE", "clockIn": null, "onBreakSince": null },
    "hours": { "today": 0, "week": 1840, "month": 7200 },
    "vacation": { "allowance": 20, "used": 5, "remaining": 15 },
    "pendingApprovals": null
  }
}
```

---

## Time tracking

### `GET /time/status`

```json
{
  "success": true,
  "data": {
    "status": "WORKING",
    "clockIn": "2026-07-24T07:02:11.000Z",
    "entryId": "clx...",
    "onBreakSince": null
  }
}
```

`status` is one of: `WORKING` | `ON_BREAK` | `OFFLINE`

### `POST /time/clock-in`

No body.

```json
{
  "success": true,
  "message": "Clocked in.",
  "data": { "id": "clx...", "clockIn": "2026-07-24T07:02:11.000Z" }
}
```

### `POST /time/clock-out`

No body.

```json
{
  "success": true,
  "message": "Clocked out.",
  "data": { "id": "clx...", "clockOut": "2026-07-24T16:01:00.000Z" }
}
```

### `POST /time/break/start`

**Request (optional)**

```json
{ "reason": "Lunch" }
```

### `POST /time/break/end`

No body.

---

## Leave

### `GET /leave`

Own leave requests.

Bosses — pending queue:

```http
GET /api/v1/leave?scope=pending
```

### `POST /leave`

**Request**

```json
{
  "type": "VACATION",
  "startDate": "2026-08-10",
  "endDate": "2026-08-14",
  "reason": "Summer holiday"
}
```

`type`: `VACATION` | `SICK` | `PERSONAL` | `HALF_DAY` | `WORK_FROM_HOME`

### `PATCH /leave/:id`

Cancel own pending:

```json
{ "status": "CANCELLED" }
```

Boss approve/reject:

```json
{
  "status": "APPROVED",
  "reviewComment": "Enjoy your time off"
}
```

or

```json
{ "status": "REJECTED", "reviewComment": "Too many people out that week" }
```

---

## Attendance

### `GET /attendance`

Own attendance records for the current year (includes clock entries).

Bosses — pending corrections:

```http
GET /api/v1/attendance?scope=corrections
```

### `POST /attendance/corrections`

**Request**

```json
{
  "attendanceId": "clx...",
  "requestedClockIn": "09:00",
  "requestedClockOut": "17:30",
  "reason": "Forgot to clock out"
}
```

Times are `HH:MM` (24h).

### `PATCH /attendance/corrections/:id`

Boss only:

```json
{ "status": "APPROVED", "reviewComment": "Looks good" }
```

---

## Employees (boss only for create/update/delete)

### `GET /employees`

List whole team (boss) or self (employee).

### `POST /employees`

Creates **both** a login `User` (email + hashed password + role) and an `Employee` team profile linked to that user.

**Headers:** `Authorization: Bearer <admin-token>`

**Request**

```json
{
  "firstName": "Alex",
  "lastName": "Müller",
  "email": "alex.mueller@company.com",
  "password": "ChooseAStrongPassword1",
  "position": "Support Engineer",
  "role": "EMPLOYEE",
  "employmentType": "FULL_TIME",
  "hireDate": "2026-07-01",
  "weeklyHours": 40,
  "vacationAllowance": 20,
  "status": "ACTIVE"
}
```

`password` is **required** (min 8 characters). Use `"role": "ADMIN"` for bosses.

**Response**

```json
{
  "success": true,
  "message": "Alex was added to the team and can sign in with alex.mueller@company.com.",
  "data": {
    "id": "clx...",
    "employeeId": "clx...",
    "userId": "clx...",
    "email": "alex.mueller@company.com",
    "role": "EMPLOYEE"
  }
}
```

### `GET /employees/:id`

### `PATCH /employees/:id`

Partial update (same fields as create). Use `"role": "ADMIN"` for bosses.

### `DELETE /employees/:id`

Soft-deactivates (status `TERMINATED`, user `isActive: false`).

---

## Notifications

### `GET /notifications`

### `PATCH /notifications`

Mark one or all as read:

```json
{ "id": "clx..." }
```

Empty body marks all unread as read.

---

## Settings (boss only)

### `GET /settings`

```json
{
  "success": true,
  "data": {
    "settings": {
      "id": "global",
      "companyName": "molibso GmbH",
      "timezone": "UTC",
      "workDayStartTime": "09:00",
      "workDayEndTime": "17:00",
      "standardWeeklyHours": 40
    },
    "holidays": []
  }
}
```

### `PATCH /settings`

**Request**

```json
{
  "companyName": "molibso GmbH",
  "timezone": "Europe/Berlin",
  "workDayStartTime": "09:00",
  "workDayEndTime": "17:00",
  "standardWeeklyHours": 40,
  "breakDurationMinutes": 30,
  "maxBreaksPerDay": 2,
  "overtimeThresholdDaily": 8,
  "overtimeMultiplier": 1.5,
  "defaultVacationDays": 20,
  "notifyClockInReminder": true,
  "notifyClockOutReminder": true,
  "notifyBreakReminder": true,
  "notifyLeaveUpdates": true
}
```

---

## Quick curl / Postman flow

```bash
# 1. Health
curl http://localhost:3000/api/v1/health

# 2. First admin (only works on an empty database)
curl -X POST http://localhost:3000/api/v1/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"ChooseAStrongPassword1","firstName":"Lars","lastName":"Hollenbacher","position":"Founder"}'

# 3. Login (or reuse the token from bootstrap)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"ChooseAStrongPassword1"}' \
  | jq -r .data.token)

# 4. Create an employee
curl -X POST http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Alex","lastName":"Müller","email":"alex@company.com","password":"EmployeePass1","position":"Engineer","role":"EMPLOYEE","employmentType":"FULL_TIME","hireDate":"2026-07-01","weeklyHours":40,"vacationAllowance":20,"status":"ACTIVE"}'
```

On Windows PowerShell:

```powershell
# Bootstrap first admin
Invoke-RestMethod -Method POST http://localhost:3000/api/v1/auth/bootstrap `
  -ContentType "application/json" `
  -Body '{"email":"admin@company.com","password":"ChooseAStrongPassword1","firstName":"Lars","lastName":"Hollenbacher","position":"Founder"}'

# Login
$login = Invoke-RestMethod -Method POST http://localhost:3000/api/v1/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"admin@company.com","password":"ChooseAStrongPassword1"}'
$token = $login.data.token

# Create employee
Invoke-RestMethod -Method POST http://localhost:3000/api/v1/employees `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"firstName":"Alex","lastName":"Müller","email":"alex@company.com","password":"EmployeePass1","position":"Engineer","role":"EMPLOYEE","employmentType":"FULL_TIME","hireDate":"2026-07-01","weeklyHours":40,"vacationAllowance":20,"status":"ACTIVE"}'
```

---

## Roles (flat team)

| Role | Access |
|------|--------|
| `EMPLOYEE` | Own time, leave, attendance, profile |
| `ADMIN` (Boss) | Everything + approve all + team + settings + analytics |
