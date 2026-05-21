# HealthLines AI Operations Runbook

## Start local app

npm run dev

## Start automation worker

npm run worker

## Dashboard

http://localhost:3000/dashboard

## Workflow

1. Worker watches Gmail automatically.
2. AI classifies emails.
3. PO data is saved to location workbook and master workbook.
4. DN data will later come from Tally.
5. Delivery history drives invoice cycle.
6. MRN received/overdue syncs into Delivery_History.
7. Invoice cycle prepares packages every 14 days.
8. Missing rate blocks that DN group only.
9. Missing MRN does not block invoice; invoice shows MRN Pending.
10. Human approves package.
11. Gmail draft/send stage comes after OAuth.

## Dashboard purpose

Dashboard is ONLY for:
- monitoring
- approvals
- exception handling
- missing-rate correction
- backups
- review