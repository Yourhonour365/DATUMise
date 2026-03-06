# DATUMise

DATUMise is a content-sharing web application for structured site observations.

Users can register, log in, create observations, and interact with content through comments.

This project is developed as part of **Code Institute Portfolio Project 5 – Advanced Front-End Applications**.

---

## Project Structure

DATUMise consists of two parts:

- **datumise-api/** – Django REST Framework API  
- **datumise-react/** – React front-end application  

---

## Live Links

API: (to be added)  
Front-End: (to be added)

---

## Project Goals

The goal of DATUMise is to provide a platform where users can:

- Create and share structured observations
- View observations created by other users
- Comment on observations
- Edit and delete their own content
- Interact with the application through a REST API and React front-end

---

## Technologies Used

### Front-End

- React.js
- JavaScript (ES6)
- HTML5
- CSS3
- Bootstrap

### Back-End

- Python
- Django
- Django REST Framework
- dj-rest-auth
- Token Authentication

---

## Features

### Authentication

Users can:

- Register a new account
- Log in and receive an authentication token
- Log out securely

### Observations

Users can:

- Create observations
- View observations created by other users
- Edit their own observations
- Delete their own observations

### Comments

Users can:

- Comment on observations
- View comments from other users
- Edit or delete their own comments

---

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Auth Required | Description |
|---------|--------|--------------|-------------|
| `/api/auth/registration/` | POST | No | Register new user |
| `/api/auth/login/` | POST | No | Login user |
| `/api/auth/logout/` | POST | Yes | Logout authenticated user |

---

### Observation Endpoints

| Endpoint | Method | Auth Required | Description |
|---------|--------|--------------|-------------|
| `/api/observations/` | GET | No | Retrieve observations |
| `/api/observations/` | POST | Yes | Create observation |
| `/api/observations/<id>/` | GET | No | Retrieve single observation |
| `/api/observations/<id>/` | PATCH | Yes (Owner) | Update observation |
| `/api/observations/<id>/` | DELETE | Yes (Owner) | Delete observation |

---

### Comment Endpoints

| Endpoint | Method | Auth Required | Description |
|---------|--------|--------------|-------------|
| `/api/comments/` | GET | No | Retrieve comments |
| `/api/comments/?observation=<id>` | GET | No | Filter comments |
| `/api/comments/` | POST | Yes | Create comment |
| `/api/comments/<id>/` | GET | No | Retrieve comment |
| `/api/comments/<id>/` | PATCH | Yes (Owner) | Update comment |
| `/api/comments/<id>/` | DELETE | Yes (Owner) | Delete comment |

---

## Authentication

This API uses **Token Authentication**.

Header example:

`Authorization: Token <user_token>`

Tokens are obtained via:

- `/api/auth/login/`
- `/api/auth/registration/`

---

## Permission Model

### Unauthenticated Users

- Can view observations
- Can view comments
- Cannot create or modify content

### Authenticated Users

- Can create observations
- Can create comments
- Can edit or delete their own content

### Non-Owners

- Receive **403 Forbidden** when attempting to modify another user's content

---

## Manual Testing (Back-End)

### Authentication

| Test ID | Feature | Endpoint | Result |
|--------|--------|----------|-------|
| AUTH-01 | Register user | `/api/auth/registration/` | PASS |
| AUTH-02 | Prevent duplicate user | `/api/auth/registration/` | PASS |
| AUTH-03 | Login user | `/api/auth/login/` | PASS |

---

### Observation API

| Test ID | Feature | Endpoint | Result |
|--------|--------|----------|-------|
| OBS-01 | Create observation | `/api/observations/` | PASS |
| OBS-02 | List observations | `/api/observations/` | PASS |
| OBS-03 | Prevent non-owner update | `/api/observations/1/` | PASS |
| OBS-04 | Prevent non-owner delete | `/api/observations/1/` | PASS |

---

### Comment API

| Test ID | Feature | Endpoint | Result |
|--------|--------|----------|-------|
| COM-01 | Create comment | `/api/comments/` | PASS |
| COM-02 | List comments | `/api/comments/` | PASS |
| COM-03 | Filter comments | `/api/comments/?observation=1` | PASS |
| COM-04 | Prevent non-owner update | `/api/comments/1/` | PASS |
| COM-05 | Prevent non-owner delete | `/api/comments/1/` | PASS |

---

## Future Improvements

Possible enhancements include:

- Image uploads for observations
- Survey grouping and approval workflows
- Hazard classification (Red / Amber / Green)
- Search and filtering
- Follow and like functionality

---

## Deployment

Deployment instructions will be added once both the API and React front-end are deployed.