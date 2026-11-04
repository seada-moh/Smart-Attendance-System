# Smart Attendance System

**Face-recognition attendance for workplaces. Walk up to the camera, get checked in.**

A full-stack MERN web app that identifies employees by their face and records check-ins and check-outs automatically. It replaces paper sign-in sheets and roll calls with a camera kiosk, an admin dashboard, and detailed attendance reports.

![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Status](https://img.shields.io/badge/status-demo-blue)


## Features

- **Face scanner kiosk:** employees check in and out with their face. No login, cards, or signatures.
- **Smart daily flow:** morning check-in, automatic lunch checkout, after-lunch check-in, and end-of-day checkout.
- **Automatic status:** each day is marked Present, Late, or Absent from the shift rules and a grace period.
- **Admin dashboard:** register employees with their face, manage employees, and configure shift settings.
- **Employee portal:** employees log in to see their own status, history, and attendance rate. They cannot see anyone else's data.
- **Reports with CSV export:** weekly, monthly, yearly, a daily log, and per-employee analytics.
- **Security:** JWT authentication, hashed passwords, role-based access, and duplicate-face prevention.

## How It Works

### Face recognition

1. **Register:** the admin captures an employee's face from the webcam. [face-api.js](https://github.com/justadudewhohacks/face-api.js) extracts a 128-dimension descriptor, which is stored in MongoDB with the profile.
2. **Scan:** at the kiosk, face-api.js detects the face in the browser and sends a new descriptor to the server.
3. **Match:** the server finds the closest stored descriptor by Euclidean distance. A distance of `0.6` or less is a match.

Extra checks:
- Registration rejects faces that are too similar to an existing employee (stricter threshold of `0.5`).
- Inactive accounts are blocked even if the face matches.
- The match confidence is saved on every attendance record.

### Daily attendance flow

| Session | What happens |
|---|---|
| **Morning** | The employee scans their face. Check-in is recorded as Present or Late, based on the shift start and grace period. |
| **Lunch** | At the configured lunch start, a scheduled job checks everyone out automatically. |
| **Afternoon** | After lunch ends, the employee scans again. A final scan at the end of the day records the checkout. |

A session-aware state machine decides what each scan means, and a unique index on `userId + date` keeps one record per employee per day.

### Reports

Every report tab has one-click CSV export.

| Report | Contents |
|---|---|
| Weekly | Daily bar chart, KPI cards, employee analytics table |
| Monthly | Trend line, department chart, Warning and At-Risk counts |
| Yearly | Monthly trends, annual totals, per-employee summary |
| Daily Log | Filterable records with session times, late minutes, and match confidence |
| Analytics | Present, late, and absent days, attendance %, total late time, and a health flag per employee |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | MongoDB |
| Face recognition | face-api.js |
| Auth and security | JWT, bcrypt |
| Scheduling | node-cron |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- MongoDB running locally, or a MongoDB Atlas connection string
- A webcam

### Installation

```bash
git clone https://github.com/seada-moh/Smart-Attendance-System.git
cd Smart-Attendance-System
```

**Backend**

```bash
cd backEnd
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

Open `.env` and set a long random `JWT_SECRET`. To generate one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then start the server:

```bash
npm run dev
```

**Frontend** (in a second terminal)

```bash
cd frontEnd
npm install
npm run dev
```

### Environment variables

| Variable | Description | Default / example |
|---|---|---|
| `PORT` | API port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/smart_attendance` |
| `JWT_SECRET` | Secret for signing tokens (required, keep private) | your own random value |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `NODE_ENV` | Environment | `development` |
| `CLIENT_URL` | Allowed frontend origin | `http://localhost:5174` |

## Project Structure

```
Smart-Attendance-System/
├── backEnd/
│   ├── config/         # Database connection
│   ├── controllers/    # Business logic
│   ├── jobs/           # Scheduled jobs (auto lunch checkout)
│   ├── middleware/     # Auth and role checks
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API routes
│   ├── utils/          # Helpers
│   └── server.js       # Entry point
└── frontEnd/           # React + Vite app
```

## Known Limitations

- Recognition accuracy depends on lighting, camera quality, and face position, and has not been formally measured.
- No liveness detection yet, so a photo could fool the scanner.
- Web only, with no mobile app.
- This is a demo. It needs more security, privacy, and performance work before real-world use.

## Roadmap

- [ ] Anti-spoofing (liveness detection)
- [ ] Measure and improve accuracy across lighting and cameras
- [ ] Stronger protection for stored face data
- [ ] PDF export for reports
- [ ] Mobile version
- [ ] Performance testing with many users

## Contributors

Built as a team project by four developers. See the [contributors page](../../graphs/contributors) for details.

## Privacy

This app processes biometric data. If you run it with real people, get their informed consent, store the data securely, and follow the privacy laws that apply to you.