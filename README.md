# VendorBridge

---

## Overview

VendorBridge is a modern Procurement & Vendor Management ERP designed to digitize and automate the complete procurement lifecycle.

The platform enables organizations to manage vendors, create RFQs, collect quotations, compare supplier responses, process approvals, generate purchase orders, and manage invoices through a centralized workflow-driven system.

### Key Benefits

* Centralized vendor database
* Faster procurement cycles
* Transparent approval workflows
* Automated PO & invoice generation
* Complete audit trail
* Procurement analytics and reporting

---

## Features

### Authentication & Authorization

* Secure login and authentication
* JWT-based session management
* Role-Based Access Control (RBAC)
* Password recovery

### Vendor Management

* Vendor onboarding
* GST information management
* Vendor categorization
* Status management
* Document uploads

### RFQ Management

* Create and publish RFQs
* Multiple line items
* Vendor assignment
* Attachment support
* RFQ lifecycle tracking

### Vendor Portal

* Assigned RFQ dashboard
* Quotation submission
* Quotation editing before deadline
* Submission status tracking

### Quotation Comparison

* Side-by-side quotation analysis
* Price comparison
* Delivery timeline comparison
* Vendor evaluation

### Approval Workflow

* Approval and rejection flow
* Approval history
* Audit tracking
* Notifications

### Purchase Orders & Invoices

* Purchase order generation
* Invoice generation
* PDF export
* GST calculations
* Email delivery

### Reports & Analytics

* Procurement spend analysis
* Vendor performance reports
* Procurement trends
* Exportable reports

---

## User Roles

| Role                | Access                                     |
| ------------------- | ------------------------------------------ |
| Admin               | Full system management                     |
| Procurement Officer | RFQ, Vendor & Procurement Operations       |
| Manager / Approver  | Approval workflows and monitoring          |
| Vendor              | RFQ participation and quotation submission |

---

## Tech Stack

### Frontend

* React 18
* TypeScript
* Vite
* Tailwind CSS
* React Hook Form

### Backend

* Node.js
* Express.js
* TypeScript
* MySQL

### Security

* JWT Authentication
* RBAC Authorization
* bcrypt Password Hashing
* HTTPS
* Rate Limiting

---

## Getting Started

### Prerequisites

* Node.js 20+
* npm or yarn
* MySQL

### Installation

Clone the repository:

```bash
git clone https://github.com/your-username/vendorbridge.git
cd vendorbridge
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api

DATABASE_URL=mysql://user:password@localhost:3306/vendorbridge

JWT_SECRET=your-secret-key

REDIS_URL=redis://localhost:6379
```

Start the development server:

```bash
npm run dev
```

Application will run at:

```text
http://localhost:5173
```

---

## Available Scripts

```bash
npm run dev
```

Starts the development server.

---

### Future Enhancements

* Multi-level approvals
* Vendor performance scoring
* Advanced analytics
* AI-powered quotation analysis
* ERP integrations
* Multi-tenant architecture

---
