# API Documentation — WFH Employee Attendance

Base URL (local): `http://localhost:3000`

This document describes the routes implemented in the supplied NestJS source code.

## 1. Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

Roles:
- `ADMIN`: HRD / administrator.
- `EMPLOYEE`: employee account.

### 1.1 Login

**POST** `/auth/login`  
Access: Public  
Content-Type: `application/json`

Request:

```json
{
  "email": "admin@absensiwfh.com",
  "password": "your_password"
}
```

Validation:
- `email` must be a valid email address.
- `password` must be a string with at least 8 characters.

Success response (`200 OK`):

```json
{
  "accessToken": "<jwt_access_token>",
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "email": "admin@absensiwfh.com",
    "role": "ADMIN"
  }
}
```

Errors:
- `401 Unauthorized` — email/password incorrect or account inactive.
- The API intentionally uses a generic invalid-credentials message for unknown email and wrong password.

### 1.2 Get Current Profile

**GET** `/auth/profile`  
Access: Authenticated user

Headers:

```http
Authorization: Bearer <access_token>
```

Success response (`200 OK`):

```json
{
  "userId": 1,
  "email": "admin@absensiwfh.com",
  "role": "ADMIN"
}
```

Errors:
- `401 Unauthorized` — token missing, invalid, or expired.

---

## 2. Employee Management

All employee management routes require `ADMIN`.

### 2.1 Create Employee

**POST** `/employees`  
Access: `ADMIN`  
Content-Type: `application/json`

Request:

```json
{
  "email": "employee@example.com",
  "password": "employeePass123",
  "employeeCode": "EMP001",
  "fullName": "Budi Santoso",
  "department": "Engineering",
  "position": "Software Engineer",
  "phone": "081234567890"
}
```

Required:
- `email`: valid email.
- `password`: string, minimum 8 characters.
- `employeeCode`: non-empty string.
- `fullName`: non-empty string.

Optional:
- `department`
- `position`
- `phone`

The API hashes the password with bcrypt and creates the `User` and `Employee` records through a nested Prisma create.

Success response (`201 Created`):

```json
{
  "id": 1,
  "employeeCode": "EMP001",
  "fullName": "Budi Santoso",
  "department": "Engineering",
  "position": "Software Engineer",
  "phone": "081234567890",
  "user": {
    "id": 2,
    "email": "employee@example.com",
    "role": "EMPLOYEE",
    "isActive": true
  }
}
```

Errors:
- `400 Bad Request` — DTO validation failed.
- `401 Unauthorized` — token missing/invalid/expired.
- `403 Forbidden` — caller is not ADMIN.
- `409 Conflict` — email or employee code already exists.

### 2.2 List Employees

**GET** `/employees`  
Access: `ADMIN`

Success response (`200 OK`):

```json
[
  {
    "id": 1,
    "employeeCode": "EMP001",
    "fullName": "Budi Santoso",
    "department": "Engineering",
    "position": "Software Engineer",
    "phone": "081234567890",
    "user": {
      "email": "employee@example.com",
      "isActive": true
    }
  }
]
```

Records are ordered by employee ID descending. Password hashes are not returned.

### 2.3 Get Employee Detail

**GET** `/employees/:id`  
Access: `ADMIN`

Example: `GET /employees/1`

Success response (`200 OK`):

```json
{
  "id": 1,
  "employeeCode": "EMP001",
  "fullName": "Budi Santoso",
  "department": "Engineering",
  "position": "Software Engineer",
  "phone": "081234567890",
  "user": {
    "email": "employee@example.com",
    "isActive": true
  }
}
```

Errors:
- `400 Bad Request` — `id` is not an integer.
- `404 Not Found` — employee does not exist.

### 2.4 Update Employee

**PATCH** `/employees/:id`  
Access: `ADMIN`  
Content-Type: `application/json`

Request (all fields optional; send at least one useful field):

```json
{
  "fullName": "Budi Santoso Updated",
  "department": "Product",
  "position": "Product Engineer",
  "phone": "081234567891"
}
```

Allowed fields:
- `fullName`: optional non-empty string when supplied.
- `department`: optional string.
- `position`: optional string.
- `phone`: optional string.

`email`, `password`, and `employeeCode` are not editable through this endpoint.

Success response (`200 OK`):

```json
{
  "id": 1,
  "employeeCode": "EMP001",
  "fullName": "Budi Santoso Updated",
  "department": "Product",
  "position": "Product Engineer",
  "phone": "081234567891"
}
```

Errors:
- `400 Bad Request` — validation failed or unknown property supplied.
- `404 Not Found` — employee does not exist.

### 2.5 Deactivate Employee

**PATCH** `/employees/:id/deactivate`  
Access: `ADMIN`

Example: `PATCH /employees/1/deactivate`

No request body required.

Success response (`200 OK`):

```json
{
  "id": 2,
  "email": "employee@example.com",
  "isActive": false
}
```

The employee and attendance records are retained. Login is blocked while the account is inactive.

### 2.6 Activate Employee

**PATCH** `/employees/:id/activate`  
Access: `ADMIN`

Example: `PATCH /employees/1/activate`

No request body required.

Success response (`200 OK`):

```json
{
  "id": 2,
  "email": "employee@example.com",
  "isActive": true
}
```

Errors for activate/deactivate:
- `404 Not Found` — employee does not exist.

---

## 3. Attendance

### 3.1 Submit Attendance

**POST** `/attendance`  
Access: `EMPLOYEE`  
Content-Type: `multipart/form-data`

Form-data:

| Key | Type | Required | Description |
|---|---|---:|---|
| `photo` | File | Yes | JPG, JPEG, or PNG image, maximum 5 MB |

Do not send `employeeId`, `attendanceDate`, or `attendanceTime`. The API derives employee identity from JWT and generates date/time on the server.

Example Postman setup:
1. Select `POST /attendance`.
2. Open **Body → form-data**.
3. Add key `photo`.
4. Change the key type from Text to File.
5. Select a JPG/JPEG/PNG image.
6. Add Employee Bearer token.

Success response (`201 Created`):

```json
{
  "message": "Attendance submitted successfully",
  "data": {
    "id": 1,
    "employeeId": 1,
    "attendanceDate": "2026-11-02T00:00:00.000Z",
    "attendanceTime": "2026-11-02T07:30:00.000Z",
    "photoPath": "uploads/attendance/<generated-file-name>.jpg",
    "createdAt": "2026-11-02T07:30:00.000Z",
    "employee": {
      "employeeCode": "EMP001",
      "fullName": "Budi Santoso"
    }
  }
}
```

The timestamp values above are illustrative. Actual values are generated by the server and serialized as ISO timestamps. `attendanceDate` represents the Jakarta calendar date; `attendanceTime` is the server-generated instant.

Errors:
- `400 Bad Request` — photo missing or file type/extension not accepted.
- `401 Unauthorized` — missing/invalid/expired token.
- `403 Forbidden` — caller is not EMPLOYEE or account is inactive at submission time.
- `409 Conflict` — employee has already submitted attendance for the same Jakarta calendar date.
- `413 Payload Too Large` — upload exceeds 5 MB.

### 3.2 Get My Attendance History

**GET** `/attendance/me`  
Access: `EMPLOYEE`

Headers:

```http
Authorization: Bearer <employee_access_token>
```

Success response (`200 OK`):

```json
{
  "message": "Attendance history retrieved successfully",
  "total": 1,
  "data": [
    {
      "id": 1,
      "attendanceDate": "2026-11-02",
      "attendanceTime": "2026-11-02T07:30:00.000Z",
      "photoPath": "uploads/attendance/<generated-file-name>.jpg",
      "createdAt": "2026-11-02T07:30:00.000Z"
    }
  ]
}
```

The response contains only attendance records belonging to the authenticated employee. The `attendanceDate` field is formatted as `YYYY-MM-DD`.

### 3.3 Admin Attendance Monitoring

**GET** `/attendance`  
Access: `ADMIN`

Optional query parameters:

| Parameter | Type | Default | Description |
|---|---|---:|---|
| `date` | ISO date string | — | Filter exact attendance date, e.g. `2026-11-02` |
| `employeeId` | Integer | — | Filter by Employee table ID |
| `search` | String | — | Search employee full name or employee code |
| `page` | Integer | `1` | Page number, minimum 1 |
| `limit` | Integer | `10` | Page size, minimum 1, maximum 100 |

Examples:

```http
GET /attendance
GET /attendance?date=2026-11-02
GET /attendance?employeeId=1
GET /attendance?search=Budi
GET /attendance?page=1&limit=5
GET /attendance?date=2026-11-02&search=EMP001&page=1&limit=10
```

Success response (`200 OK`):

```json
{
  "message": "Attendance records retrieved successfully",
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "data": [
    {
      "id": 1,
      "employeeId": 1,
      "attendanceDate": "2026-11-02",
      "attendanceTime": "2026-11-02T07:30:00.000Z",
      "photoPath": "uploads/attendance/<generated-file-name>.jpg",
      "createdAt": "2026-11-02T07:30:00.000Z",
      "employee": {
        "id": 1,
        "employeeCode": "EMP001",
        "fullName": "Budi Santoso",
        "department": "Engineering",
        "position": "Software Engineer"
      }
    }
  ]
}
```

Results are ordered by attendance date descending, then attendance time descending. This endpoint is read-only.

Validation errors:
- `400 Bad Request` — invalid date, non-integer/less-than-one `employeeId`, invalid `page`, or `limit` outside 1–100.
- `401 Unauthorized` — missing/invalid/expired token.
- `403 Forbidden` — caller is not ADMIN.

### 3.4 View Attendance Photo

**GET** `/attendance/:id/photo`  
Access: `ADMIN` or the `EMPLOYEE` who owns the attendance record.

Example:

```http
GET /attendance/1/photo
Authorization: Bearer <access_token>
```

Success:
- `200 OK`
- Response body is the image stream (`image/jpeg` or `image/png`) rather than JSON.
- The response is configured for inline display.

Authorization:
- Admin can view any existing attendance photo.
- Employee can view only a photo whose attendance record belongs to that employee.

Errors:
- `401 Unauthorized` — missing/invalid/expired token.
- `403 Forbidden` — Employee attempts to access another employee's photo.
- `404 Not Found` — attendance record or photo file does not exist.

---

## 4. Common HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Successful request |
| `201` | Resource created |
| `400` | Bad request / DTO or upload validation error |
| `401` | Authentication required or invalid credentials/token |
| `403` | Role or ownership restriction |
| `404` | Resource not found |
| `409` | Unique constraint conflict |
| `413` | Request upload exceeds configured file-size limit |
| `500` | Unexpected server error |

NestJS's default error response commonly has this structure:

```json
{
  "statusCode": 404,
  "message": "Attendance record not found",
  "error": "Not Found"
}
```

Exact messages vary by endpoint and validation failure.

## 5. Postman Test Checklist

- [ ] Login with Admin credentials.
- [ ] Access `/auth/profile` with Admin token.
- [ ] Create an employee with Admin token.
- [ ] Confirm Employee token cannot create/list/update employees.
- [ ] Login as Employee.
- [ ] Submit attendance with a valid image.
- [ ] Confirm missing photo is rejected.
- [ ] Confirm invalid extension/MIME type is rejected.
- [ ] Confirm file larger than 5 MB is rejected.
- [ ] Submit a second attendance on the same Jakarta date and confirm conflict.
- [ ] Retrieve `/attendance/me` using Employee token.
- [ ] Confirm Employee cannot access `/attendance` monitoring endpoint.
- [ ] Retrieve `/attendance` using Admin token.
- [ ] Test `date`, `employeeId`, `search`, `page`, and `limit`.
- [ ] Open `/attendance/:id/photo` with Admin token.
- [ ] Open own photo with owning Employee token.
- [ ] Attempt to open another Employee's photo and confirm `403`.
- [ ] Test a non-existing attendance ID and confirm `404`.

## 6. Implementation Notes

- Local upload directory: `uploads/attendance/`.
- The database stores the relative photo path, not the image binary.
- The attendance date is computed using `Asia/Jakarta`.
- The database unique key `(employeeId, attendanceDate)` is the final protection against duplicate daily attendance.
- The JWT expiry is configured to one day in `AuthModule`.
- Current file validation checks extension and declared MIME type. It does not yet inspect file signatures/magic bytes.
- The current JWT strategy checks token signature and expiration but does not reload account status for every protected request.
