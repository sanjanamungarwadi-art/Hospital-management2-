# 📚 Library Lending System

A lightweight, full-stack Library Lending Management system built with Node.js, Express, Mongoose (MongoDB Atlas), and React (Vite). This application tracks a physical library's catalog books, active lending statuses, real-time stock balances, and overdue loan alerts.

---

## 🛠️ Tech Stack & Constraints

- **Backend:** Node.js, Express, Mongoose (MongoDB Atlas)
- **Frontend:** React, Vite, Plain Vanilla CSS
- **Testing:** Postman Collection (v2.1) & Environment Configurations
- **Architecture Constraints:** - Strictly zero environment files (`.env`). All configurations are isolated directly inside the codebase.
  - No external UI/component libraries or utility CSS frameworks.
  - Strict pagination controls built natively across data structures.

---

## 📂 Project Structure

The project maintains an explicit, two-folder layout at its top level:

```text
├── backend
│   ├── index.js          # Core Express server, models, and API endpoints
│   └── package.json      # Express, CORS, and Mongoose dependencies
├── frontend
│   ├── src
│   │   ├── App.jsx       # Core React Single Page Application (SPA)
│   │   ├── App.css       # Custom structural & layout styling sheet
│   │   └── main.jsx      # Vite entry point script
│   └── package.json      # React + Vite scaffold configurations
└── postman
    ├── Library-Lending-API.postman_collection.json  # 11-step automated API tests
    └── Library-Lending.postman_environment.json     # Variable definitions configuration
