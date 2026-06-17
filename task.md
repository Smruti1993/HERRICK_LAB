# Tasks: Unified Pagination & Dynamic Prescription Printout

- [x] **Pagination Integration**
  - [x] Implement standard pagination on Billing Invoice Lists (Invoice & Pending Lists)
  - [x] Integrate unified `<Pagination>` component (10 items per page) across all tables
  - [x] Verify list navigation and page counts

- [x] **Dynamic Prescription Printout**
  - [x] Extend `Patient` interface with optional fields: `arabicName`, `nationalId`, `sponsorName`, `policyNo`, `cardNo`
  - [x] Update Patient Registration form in `Patients.tsx` to collect these details
  - [x] Map new patient fields in database serializer/deserializer functions inside `DataContext.tsx`
  - [x] Append database alterations for `patients` table to `migration.sql`
  - [x] Remove hardcoded Arabic name, ID No, Department, and Sponsor from `PrescriptionPrintout.tsx` and render them dynamically
  - [x] Resolve SFDA Code dynamically using item ID from `inventoryItems` list in `PrescriptionPrintout.tsx`
  - [x] Calculate and display drug total amounts dynamically in printout medication table
  - [x] Run production build (`npm run build`) to verify clean compilation of all components
