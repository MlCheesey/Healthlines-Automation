# HealthLines AI Local Testing

## Start app

npm run dev

## Main dashboard

http://localhost:3000/dashboard

## Test invoice PDF

http://localhost:3000/api/test-invoice

Generated PDFs:

data/invoices/

## Start local scheduler

http://localhost:3000/api/start-local-scheduler

## Check health

http://localhost:3000/api/health-check/full

## Check logs

http://localhost:3000/api/system-logs

## Check backups

http://localhost:3000/api/backup-status

## Main workflow

1. Email/PO is analyzed
2. PO goes to location workbook and master workbook
3. DN creates delivery history and MRN pending
4. Invoice PDF generated per DN
5. 14-day package creates Excel + invoice PDFs
6. Human approves before sending