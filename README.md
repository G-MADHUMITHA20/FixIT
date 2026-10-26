# FixIt – AI-Powered Campus Maintenance and Complaint Management System

FixIt is a full-stack campus maintenance and complaint management system designed to make college campuses safer, more efficient, and better maintained. It enables students to report maintenance issues, administrators to manage complaints, and technicians to track and resolve assigned tasks.

FixIt integrates **Gemma 4 AI** for semantic duplicate complaint detection and supports rule-based technician assignment, complaint tracking, SLA monitoring, and real-time notifications.

---

## Problem Statement

Campus maintenance issues, including damaged furniture, malfunctioning electrical equipment, water leakage, and classroom infrastructure problems, are often reported through informal or disconnected channels.

These challenges can result in:

- Duplicate complaints for the same maintenance issue.
- Delays in assigning appropriate technicians.
- Difficulty tracking complaint status and resolution progress.
- Limited visibility into technician workload and maintenance performance.
- Inefficient communication between students, technicians, and administrators.

A centralized maintenance management system can improve coordination, accountability, and campus infrastructure management.

## Our Solution

FixIt provides a centralized platform for reporting, assigning, monitoring, and resolving campus maintenance complaints. It combines AI-powered semantic duplicate detection, rule-based technician assignment, role-based dashboards, and real-time notifications to streamline the maintenance workflow and improve transparency.

## Key Features

### 1. Complaint Management

- Submit complaints with category, description, and location.
- Track complaints from submission to resolution.
- View existing campus issues to help reduce repetitive reports.
- Support existing complaints where applicable.

### 2. Gemma 4 AI-Powered Duplicate Detection

- Analyze complaint descriptions semantically.
- Identify potentially duplicate reports expressed in different words.
- Evaluate relevant existing complaints using candidate and location information.

### 3. Automatic Technician Assignment

- Match complaints with technicians based on skills and specialization.
- Consider technician availability and current workload.
- Allocate tasks using rule-based assignment logic.

**Note:** Gemma 4 handles semantic duplicate detection, while technician assignment is managed by rule-based logic.

### 4. Role-Based Dashboards

- **Student Dashboard:** Submit complaints and track progress.
- **Technician Dashboard:** View assigned tasks and update work status.
- **Admin Dashboard:** Monitor complaints, technician workload, SLA targets, and resolution statistics.

### 5. Complaint Tracking and Monitoring

- Track Pending, In Progress, and Resolved complaints.
- Monitor service-level agreement (SLA) deadlines.
- Review maintenance activity and resolution statistics.
- Support administrator verification before final resolution.

### 6. Real-Time Notifications

- Deliver supported updates using Server-Sent Events (SSE).
- Notify users of relevant complaint and status changes.

### 7. Security and Access Control

- JWT-based authentication.
- Password hashing using bcrypt.
- Role-based authorization.
- Protected application routes and operations.

---

## Technology Stack

| Component              | Technology                              |
| ---------------------- | --------------------------------------- |
| Frontend               | React.js, Vite, CSS                     |
| Routing                | React Router                            |
| HTTP Communication     | Axios                                   |
| Icons                  | Lucide                                  |
| Charts and Analytics   | Recharts                                |
| Backend                | Node.js, Express.js                     |
| Database               | MongoDB, Mongoose                       |
| AI Duplicate Detection | Gemma 4, Google Generative Language API |
| Authentication         | JSON Web Tokens (JWT)                   |
| Password Security      | bcrypt                                  |
| Real-Time Updates      | Server-Sent Events (SSE)                |

---

## System Architecture

FixIt follows a frontend-backend-database architecture.
```
        STUDENT / TECHNICIAN / ADMIN
                     |
                     v
          React.js + Vite Frontend
                     |
                Axios / HTTP
                     |
                     v
            Node.js + Express API
                     |
        +------------+-------------+
        |            |             |
        v            v             v
   Authentication  Complaint   Technician
      and RBAC     Management  Assignment
                       |
                       v
                 Gemma 4 AI API
              Duplicate Detection
                       |
                       v
                MongoDB Database
                       |
                       v
            Dashboards and Status Updates
                       |
                       v
             Real-Time SSE Notifications
```

### Architecture Components

- **Frontend:** Provides interfaces for complaint submission, task management, and maintenance monitoring.
- **Backend API:** Handles authentication, authorization, complaint processing, technician assignment, and status updates.
- **Gemma 4 AI Service:** Analyzes complaint descriptions to identify potential duplicates.
- **MongoDB:** Stores users, maintenance complaints, and issue updates.
- **Technician Assignment Logic:** Allocates tasks based on configured skills, availability, and workload.
- **SSE Notification Service:** Delivers supported updates to connected clients.

---

## How FixIt Works

1. **Complaint Submission:** A user submits a complaint with its category, description, and location.
2. **Candidate Identification:** The backend retrieves relevant existing complaints.
3. **AI Duplicate Detection:** Gemma 4 analyzes the new complaint against eligible candidates.
4. **Duplicate Handling:** The system handles potential duplicates or creates a new complaint when appropriate.
5. **Technician Assignment:** Rule-based logic assigns a suitable technician based on skills, availability, and workload.
6. **Work Progress:** The technician updates the complaint as work progresses.
7. **Resolution and Verification:** Completed work proceeds through the configured verification workflow.
8. **Monitoring and Notifications:** Dashboards display complaint progress and statistics, while SSE delivers supported real-time updates.

---

## Gemma 4 AI Integration

FixIt uses **Gemma 4 for semantic duplicate complaint detection**. Unlike exact text matching, semantic analysis helps identify complaints that may describe the same issue using different words.



### Detection Outcomes

| Outcome       | Meaning                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| Duplicate     | The complaint appears to describe an existing issue.                      |
| Not Duplicate | The complaint appears to describe a different issue.                      |
| Uncertain     | The available information is insufficient for a confident classification. |



### Benefits of Gemma 4

- Identifies potentially similar complaints with different wording.
- Reduces dependence on exact keyword matching.
- Helps prevent unnecessary duplicate tickets.
- Supports a more intelligent maintenance reporting workflow.

---

## Sample Data and Test Cases

### Sample Maintenance Complaints

| ID      | Category   | Location            | Description                                    | Expected Handling                                   |
| ------- | ---------- | ------------------- | ---------------------------------------------- | --------------------------------------------------- |
| CMP-001 | Electrical | Block A, Room 12    | Ceiling fan is not working.                    | Create complaint and assign a technician.           |
| CMP-002 | Electrical | Block A, Room 12    | The fan in this classroom has stopped running. | Check for a potential duplicate of CMP-001.         |
| CMP-003 | Plumbing   | Block B, Washroom 1 | Water is leaking from the washbasin pipe.      | Create a separate complaint if no duplicate exists. |
| CMP-004 | Furniture  | Block C, Room 5     | One classroom chair is broken.                 | Create a separate complaint if no duplicate exists. |



### Test Cases

| Test ID | Test Scenario                                             | Expected Result                                                |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| TC-01   | Register a valid user.                                    | User account is created.                                       |
| TC-02   | Log in with valid credentials.                            | Authentication succeeds.                                       |
| TC-03   | Submit a valid complaint.                                 | Complaint is stored in the database.                           |
| TC-04   | Submit a differently worded complaint for the same issue. | Gemma 4 checks for a semantic duplicate.                       |
| TC-05   | Submit a complaint about a different issue.               | A separate complaint can be created.                           |
| TC-06   | Assign a complaint to a technician.                       | Rule-based logic considers skills, availability, and workload. |
| TC-07   | Update a complaint's status.                              | The status change is saved and displayed to authorized users.  |
| TC-08   | Mark maintenance work as completed.                       | The complaint follows the configured completion workflow.      |
| TC-09   | Attempt an unauthorized operation.                        | Access is denied by authorization checks.                      |
| TC-10   | Change a complaint's status while a client is connected.  | Supported updates are delivered through SSE.                   |

---

## Project Structure
```
FixIt/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── services/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── services/
│   ├── package.json
│   └── .env.example
├── screenshots/
├── .gitignore
└── README.md
```

---

## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) and npm
- [MongoDB](https://www.mongodb.com/) or MongoDB Atlas
- Google API key with access to the configured Gemma model
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```
git clone https://github.com/YOUR-USERNAME/FixIt.git
cd FixIt
```

### 2. Install Backend Dependencies
```
cd backend
npm install
```



### 3. Install Frontend Dependencies

Open a separate terminal from the project root.
```
cd frontend
npm install
```


### 4. Configure MongoDB

Start your local MongoDB service or configure your MongoDB Atlas connection. Ensure the backend can connect to the database.

### 5. Configure Gemma 4

Configure the Google API key and the supported model identifier required by the backend's Gemma 4 integration.

---

## Environment Variables

Configure the following values in the appropriate environment files, using the variable names expected by the application.

### Backend `.env`
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
GOOGLE_API_KEY=your_google_api_key
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000
```





## Running the Application

Run the backend and frontend in separate terminals.

### Backend
```
cd backend
npm run dev
```



### Frontend
```
cd frontend
npm run dev
```

Open the local URL displayed by Vite, commonly `http://localhost:5173`.

Ensure MongoDB is running and the backend and frontend configurations are correct.

---

## Security

- **JWT Authentication:** Supports authenticated access to protected operations.
- **Password Hashing:** Uses bcrypt for password storage.
- **Role-Based Access Control:** Restricts operations according to user roles.
- **Backend Validation:** Validates requests and checks AI-selected complaint candidates.
- **Environment-Based Secrets:** Keeps credentials and API keys outside source code.
- **Reporter Privacy:** Complaint views can exclude reporter identity where configured.

   




## 📜 Open-Source Licenses

- **FixIt Application**: Licensed under the [MIT License](LICENSE) / ISC License.
- **Gemma 4 Model Family**: Provided by Google under the [Gemma Terms of Use](https://ai.google.dev/gemma/terms) and open-weights licensing, permitting open research, commercial deployment, and modification.
