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



\## Manual Testing (Back-End)



\### Auth endpoints (dj-rest-auth)



| Test ID | Feature | Endpoint | Method | Steps | Expected | Result |

|---|---|---|---|---|---|---|

| AUTH-01 | Register user | `/api/auth/registration/` | POST | Register new user | Token returned | PASS |

| AUTH-02 | Duplicate user prevented | `/api/auth/registration/` | POST | Register existing username | Validation error | PASS |

| AUTH-03 | Login user | `/api/auth/login/` | POST | Login with username/password | Token returned | PASS |



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

