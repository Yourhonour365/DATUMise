\# DATUMise



DATUMise is a content-sharing web application for structured site observations. Users can register, log in, create observations, and interact with content.



\## Repositories / Structure



\- `datumise-api/` - Django REST Framework API

\- `datumise-react/` - React front-end (to be added)



\## Live Links



\- API: (to be added)

\- Front-end: (to be added)



\## Project Goals



\- Provide an API for users to create and manage structured observations

\- Enable authentication and secure access control

\- Support interaction features (likes, comments, follow) (in progress)



## Manual Testing (Back-End)

### Authentication (dj-rest-auth)

| Test ID | Feature | Endpoint | Method | Steps | Expected Result | Actual Result |
|----------|----------|-----------|--------|--------|------------------|----------------|
| AUTH-01 | Register user | `/api/auth/registration/` | POST | Submit valid username, email and matching passwords | Token returned | PASS |
| AUTH-02 | Prevent duplicate user | `/api/auth/registration/` | POST | Register same username twice | Validation error returned | PASS |
| AUTH-03 | Login user | `/api/auth/login/` | POST | Submit valid username and password | Token returned | PASS |

---

### Observation API

| Test ID | Feature | Endpoint | Method | Steps | Expected Result | Actual Result |
|----------|----------|-----------|--------|--------|------------------|----------------|
| OBS-01 | Create Observation (authenticated) | `/api/observations/` | POST | Include `Authorization: Token <key>` header | Observation created with owner and timestamps | PASS |
| OBS-02 | List Observations (public) | `/api/observations/` | GET | Access endpoint without authentication | 200 OK + list returned | PASS |
| OBS-03 | Prevent non-owner update | `/api/observations/1/` | PATCH | Login as different user and attempt update | 403 Forbidden | PASS |
| OBS-04 | Prevent non-owner delete | `/api/observations/1/` | DELETE | Login as different user and attempt delete | 403 Forbidden | PASS |

---

### Example Test Commands (Windows PowerShell)

#### Register

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/auth/registration/" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"testuser2","email":"testuser2@example.com","password1":"TestPass123!","password2":"TestPass123!"}'
```

#### Login

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/auth/login/" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"testuser2","password":"TestPass123!"}'
```

#### Create Observation (Token Auth)

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/observations/" `
  -Method Post `
  -Headers @{ Authorization = "Token <PASTE_TOKEN_HERE>" } `
  -ContentType "application/json" `
  -Body '{"title":"Test observation","description":"Created via manual API test using token auth."}'
```

#### Attempt Unauthorized Update

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/observations/1/" `
  -Method Patch `
  -Headers @{ Authorization = "Token <OTHER_USER_TOKEN>" } `
  -ContentType "application/json" `
  -Body '{"title":"Hacked title attempt"}'
```

#### Attempt Unauthorized Delete

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/observations/1/" `
  -Method Delete `
  -Headers @{ Authorization = "Token <OTHER_USER_TOKEN>" }
```


\### Observation endpoints



| Test ID | Feature | Endpoint | Method | Steps | Expected | Result |

|---|---|---|---|---|---|---|

| OBS-01 | Create Observation (auth) | `/api/observations/` | POST | POST with Token header | Observation created | PASS |

| OBS-02 | List Observations (public) | `/api/observations/` | GET | Open endpoint | 200 + list | PASS |



\### Commands used (Windows PowerShell)



\*\*Register\*\*

```powershell

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/auth/registration/" `

&nbsp; -Method Post `

&nbsp; -ContentType "application/json" `

&nbsp; -Body '{"username":"testuser2","email":"testuser2@example.com","password1":"TestPass123!","password2":"TestPass123!"}'




## API Endpoint Summary

### Authentication Endpoints

| Endpoint | Method | Authentication Required | Description |
|-----------|--------|--------------------------|-------------|
| `/api/auth/registration/` | POST | No | Register a new user account |
| `/api/auth/login/` | POST | No | Log in existing user and return token |
| `/api/auth/logout/` | POST | Yes | Log out authenticated user (invalidate token) |

---

### Observation Endpoints

| Endpoint | Method | Authentication Required | Description |
|-----------|--------|--------------------------|-------------|
| `/api/observations/` | GET | No | Retrieve list of all observations |
| `/api/observations/` | POST | Yes | Create a new observation (owner automatically assigned) |
| `/api/observations/<id>/` | GET | No | Retrieve a single observation |
| `/api/observations/<id>/` | PATCH | Yes (Owner only) | Update an observation |
| `/api/observations/<id>/` | DELETE | Yes (Owner only) | Delete an observation |

---

### Authentication Mechanism

This API uses:

- **Token Authentication**
- Header format:

```http
Authorization: Token <user_token>
```

Token is obtained via the `/api/auth/login/` or `/api/auth/registration/` endpoint.

---

### Permission Model

- Unauthenticated users:
  - Can view observations (read-only)
  - Cannot create, update or delete

- Authenticated users:
  - Can create observations
  - Can edit or delete **only their own** observations

- Non-owners:
  - Receive `403 Forbidden` when attempting to modify another user’s content


## Comment API

### Comment Endpoints

| Endpoint | Method | Authentication Required | Description |
|-----------|--------|--------------------------|-------------|
| `/api/comments/` | GET | No | Retrieve all comments |
| `/api/comments/?observation=<id>` | GET | No | Retrieve comments filtered by observation |
| `/api/comments/` | POST | Yes | Create a new comment (owner automatically assigned) |
| `/api/comments/<id>/` | GET | No | Retrieve a single comment |
| `/api/comments/<id>/` | PATCH | Yes (Owner only) | Update a comment |
| `/api/comments/<id>/` | DELETE | Yes (Owner only) | Delete a comment |

---

### Comment Manual Testing

| Test ID | Feature | Endpoint | Method | Steps | Expected Result | Actual Result |
|----------|----------|-----------|--------|--------|------------------|----------------|
| COM-01 | Create Comment (authenticated) | `/api/comments/` | POST | Send request with `Authorization: Token <key>` header | Comment created with owner auto-assigned | PASS |
| COM-02 | List Comments (public) | `/api/comments/` | GET | Access endpoint without authentication | 200 OK + list returned | PASS |
| COM-03 | Filter Comments by Observation | `/api/comments/?observation=1` | GET | Include observation query parameter | Only matching comments returned | PASS |
| COM-04 | Prevent Non-Owner Update | `/api/comments/1/` | PATCH | Login as different user and attempt update | 403 Forbidden | PASS |
| COM-05 | Prevent Non-Owner Delete | `/api/comments/1/` | DELETE | Login as different user and attempt delete | 403 Forbidden | PASS |

---

### Updated Permission Model

- Unauthenticated users:
  - Can view observations and comments (read-only)
  - Cannot create, update, or delete content

- Authenticated users:
  - Can create observations and comments
  - Can edit or delete only their own content

- Non-owners:
  - Receive `403 Forbidden` when attempting to modify another user's content