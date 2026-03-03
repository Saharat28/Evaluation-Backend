# Personnel Evaluation System - API Documentation

This documentation provides details about the available endpoints for the Personnel Evaluation System backend.

**Base URL:** `http://localhost:5000/api`

---

## 🔐 Authentication (`/auth`)

### Register User
`POST /auth/register`
- **Description:** Registers a new user.
- **Security Note:** Public registration of `ADMIN` is prohibited. If there are existing users, any attempt to register as `ADMIN` will result in an error or be forced to `EVALUATEE`.
- **Request Body:**
  ```json
  {
    "name": "Full Name",
    "email": "user@example.com",
    "password": "password",
    "role": "EVALUATOR", 
    "departmentId": 1
  }
  ```
  *Allowed Roles: `EVALUATOR`, `EVALUATEE`*

### Login
`POST /auth/login`
- **Description:** Authenticates a user and returns a JWT token.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password"
  }
  ```
- **Response:**
  ```json
  {
    "token": "JWT_TOKEN_HERE",
    "user": {
      "id": 1,
      "name": "Full Name",
      "role": "EVALUATEE"
    }
  }
  ```

### Get Current User
`GET /auth/me`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Description:** Returns the information of the currently authenticated user.

---

## 👨‍💼 Admin Actions (`/admin`)
*All endpoints require `Authorization` header and `ADMIN` role.*

### Evaluations management
- `GET /admin/evaluations`: Lists all evaluations (including topics and indicators).
- `POST /admin/evaluations`: Creates a new evaluation.
  - Body: `{ "name": "...", "startAt": "YYYY-MM-DD", "endAt": "YYYY-MM-DD" }`
- `PUT /admin/evaluations/:id`: Updates evaluation metadata.
- `PUT /admin/evaluations/:id/status`: Toggles status (`OPEN`, `CLOSED`, `DRAFT`).
  - Body: `{ "status": "OPEN" }`
- `DELETE /admin/evaluations/:id`: Deletes evaluation and all related data.

### Structure (Topics & Indicators)
- `POST /admin/evaluations/:id/topics`: Adds a topic to an evaluation.
- `DELETE /admin/topics/:id`: Deletes a topic.
- `POST /admin/topics/:id/indicators`: Adds an indicator to a topic.
  - Body: `{ "name": "...", "type": "SCALE_1_4" | "YES_NO", "weight": 20, "requireEvidence": true }`
- `PUT /admin/indicators/:id`: Updates an indicator.
- `DELETE /admin/indicators/:id`: Deletes an indicator.

### Assignments
- `GET /admin/users`: Lists all Evaluators and Evaluatees.
- `POST /admin/assignments`: Assigns an evaluator to assess an evaluatee.
  - Body: `{ "evaluationId": 1, "evaluatorId": 2, "evaluateeId": 3 }`
- `DELETE /admin/assignments/:id`: Removes an assignment.

---

## 👤 Evaluatee Actions (`/me`)
*Requires `Authorization` header and `EVALUATEE` role.*

### View My Evaluations
`GET /me/evaluations`
- **Description:** Returns a list of evaluations assigned to the current user, including indicators and status.

### Upload Evidence
`POST /me/evaluations/:evaluationId/evidence`
- **Type:** `multipart/form-data`
- **Body:**
  - `file`: (File object) - Supports PDF, JPG, PNG, DOCX.
  - `indicatorId`: (Integer)

---

## ⚖️ Evaluator Actions (`/evaluator`)
*Requires `Authorization` header and `EVALUATOR` or `ADMIN` role.*

### List Assignments
- `GET /evaluator/evaluations`: Lists evaluations where user is an evaluator.
- `GET /evaluator/evaluations/:evaluationId`: Lists evaluatees assigned for that evaluation.

### Scoring
- `GET /evaluator/assignments/:id`: Gets details of an assignment, including files uploaded by the evaluatee.
- `POST /evaluator/assignments/:id/score`: Saves a score for an indicator.
  - Body: `{ "indicatorId": 1, "score": 4 }`
  - *Note: If `requireEvidence` is true, the evaluatee must upload a file first.*

---

## 📊 Reports (`/reports`)

### Get Evaluation Result
`GET /reports/evaluation/:evaluationId/result`
- **Description:** Calculates and returns the evaluation results.
- **Access Control:**
  - `ADMIN`: Sees all results.
  - `EVALUATEE`: Sees only their own result.
  - `EVALUATOR`: Sees results for evaluatees they were assigned to.
- **Response Shape:**
  ```json
  [
    {
      "assignmentId": 1,
      "evaluatee": "Name",
      "evaluator": "Name",
      "totalScore": "85.50",
      "details": [...]
    }
  ]
  ```
