# ParkFlow - Unified Visitor Parking Management

A complete system for apartment societies to manage visitor parking, featuring a Resident Portal for pass generation and an Admin/Security Portal for slot management.

## 🏗 Project Structure

- `main_BACKEND/`: **The core server**. A unified Node.js/SQLite backend for both Residents and Admin.
- `frontend/`: **Resident Portal**. React application for residents to create and manage passes.
- `ParkFlow-Admin/frontend/`: **Admin/Security Portal**. React application for security guards to manage entries and exits.

## 🚀 Quick Start (Running the System)

Run these commands in the **main project root**:

### 1. Install All Dependencies
```bash
npm run install:all
```

### 2. Run the Entire System
```bash
npm run dev
```
*This starts the Unified Backend (5005), Resident Portal (5176+), and Admin Portal (3001) simultaneously.*

---

## 🔐 Credentials

- **Admin/Security**: `admin` / `admin123`
- **Resident (Demo)**: `arun@parkflow.com` / `password123`

---
*Created with 💙 by ParkFlow Systems*