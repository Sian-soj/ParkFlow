# ParkFlow Admin & Security Portal

This is a standalone admin/security management system for the ParkFlow Visitor Parking system.

## Features
- **Login**: Hardcoded admin credentials (`admin` / `admin123`).
- **Dashboard**: Real-time slot information, scan visitor pass (simulation), and currently parked vehicles management.
- **Passes**: Filterable history of all visitor passes.
- **Settings**: Configure max duration and parking slots.
- **Auto-Expiry**: Automatic status updates for expired passes on dashboard load.

## Tech Stack
- **Frontend**: Vite, React, Tailwind CSS, Lucide React, Axios.
- **Backend**: Node.js, Express, SQLite3.

---

## Setup Instructions

### 1. Prerequisite
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Install All Dependencies
Run this in the `ParkFlow-Admin` root:
```bash
npm run install:all
```

### 3. Run the Application
Run this in the `ParkFlow-Admin` root:
```bash
npm run dev
```
*This will automatically start both the Backend (on port 5001) and the Frontend (on port 3001).*

---

## Credentials
- **ID**: `admin`
- **Password**: `admin123`

## Database Schema
- **Residents**: Seeded with 5 residents (Arun, Meera, Rahul, Sneha, Vikram).
- **ParkingSlots**: Initialized with 3 AVAILABLE slots.
- **AppConfig**: Max duration set to 4 hours, active slots set to 3.

---

## Workflow Preview
1. **Resident App** (Existing) generates a Pass.
2. **Admin App** (This one):
   - Enter the Pass ID in the "Verify Visitor Pass" section.
   - Click **Validate**.
   - If valid, click **Allow Entry**.
   - The vehicle will appear in the "Currently Parked Vehicles" section and a slot will be occupied.
   - When the vehicle leaves, click **Mark Exit** to free the slot.
