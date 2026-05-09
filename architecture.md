# HealthLines AI Operations App

# Core Principle

This is the REAL production app being built in non-interference mode until launch.

AI can:
- read emails
- parse attachments
- classify emails
- extract operational data
- propose actions
- create/update operational sheets
- draft emails/reports
- show dashboard outputs

AI cannot:
- silently change live workflow
- send emails automatically
- overwrite records automatically
- alert humans automatically
- execute risky/bulk actions without approval

---

# Launch Scope

Launch version includes:

- Gmail intake
- Excel/ZIP/TXT parsing
- AI classification
- AI extraction
- location-wise operational sheets
- delivery requirement tracking
- delivery instruction tracking
- delivery reminder tracking
- delivery date query handling
- MRN watcher
- 7-day MRN overdue invoice draft logic
- 14-day invoice cycle
- dashboard
- human approval layer
- audit logging

Inventory matching is NOT part of launch scope.

---

# Tech Stack

- Next.js
- React
- TailwindCSS
- Next.js API routes
- Gmail API
- Gemini API
- xlsx
- jszip
- Vercel

---

# Client Architecture

System must support multiple clients.

Current launch client:
- DaVita

Future clients:
- Diaverum
- hospitals
- clinics

All logic must remain client-scalable.

---

# Location Architecture

Each client can have multiple locations.

Each location has its own operational workbook/sheet.

Structure example:

clients/
  davita/
    location-a.xlsx
    location-b.xlsx

There is also a master aggregate/control workbook.

---

# Operational Sheets

Each location workbook contains:

- Active_Requirements
- Active_Delivery_Tasks
- Delivery_History
- MRN_Log
- Issues
- AI_Log

---

# AI Classification Types

- Quarterly PO
- Additional PO
- MRN
- Delivery Reminder
- Delivery Date Query
- Delivery Instruction
- Partial Stock Reminder
- Query / Discrepancy
- Invoice Issue
- Other

---

# AI Uncertainty Rule

If AI does not know:
- ask human

Examples:
- unclear location
- unclear date
- unclear item
- unclear quantity
- unclear delivery plan

Human approval required.

---

# Delivery Instruction Logic

Example:
"Deliver all PO for SF Dammam on 20 May."

AI should:
- classify as Delivery Instruction
- extract location/date/scope
- create/update Active_Delivery_Tasks
- alert human in dashboard

After delivery:
- move task to Delivery_History
- remove from active task list

---

# Delivery Date Query Logic

Example:
"Need exact delivery date."

If delivery date exists:
- AI drafts reply

If delivery date missing:
- ask human for date

Human approval required before send.

---

# Delivery Note Logic

After delivery note entry:

Update:
- Delivered Qty
- Balance Qty

Create:
- MRN Status = Pending
- MRN Due Date = DN Date + 7 days

---

# MRN Logic

If MRN arrives:
- match against DN/PO/item/qty

If matched:
- MRN Status = Received

If mismatch:
- create issue
- require human review

If MRN not received within 7 days:
- mark overdue
- prepare invoice draft
- add MRN pending remark
- require human approval

---

# Invoice Cycle

Every 14 days:

System should:
- group deliveries by client/location/PO/DN/MRN
- generate summary Excel workbook
- generate location-wise sheets
- generate missing MRN section
- draft invoice email
- require human approval before send

---

# Human Approval Rules

Always require approval for:
- external email send
- unclear extraction
- bulk changes
- risky operations
- invoice send
- MRN overdue invoice send

---

# Dashboard Requirements

Dashboard must show:
- incoming emails
- classifications
- extracted operational data
- location tasks
- delivery reminders
- MRN pending
- MRN overdue
- invoice cycle
- issues
- AI activity log
- pending human actions

---

# Coding Rules

Do NOT:
- redesign architecture
- remove working parsers
- add auto-send email
- add silent workflow modifications
- add unrelated dependencies

Build ONE module at a time.

Explain:
- files changed
- backend logic added
- assumptions made