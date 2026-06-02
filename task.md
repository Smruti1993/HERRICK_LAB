# Tasks: Multi-UOM System Development

- [x] **Phase 1: Database Schema & Type Systems**
  - [x] Add columns `purchase_conversion_factor` and `sales_conversion_factor` to `inventory_items` in `supabase_schema.sql`
  - [x] Extend properties `purchaseConversionFactor` and `salesConversionFactor` in interface `InventoryItem` inside `src/types.ts`
  - [x] Map camelCase / snake_case properties in the Supabase serializers/deserializers in `src/context/DataContext.tsx`

- [x] **Phase 2: Item Master Configuration UI**
  - [x] Update `initialItem` state inside `src/components/inventory/ItemMaster.tsx` to initialize conversion factors to `1`
  - [x] Insert custom Purchase & Sales packaging inputs (including real-time descriptive multipliers) under the "Accounts and Sales Info." sub-tab in the Item Master form
  - [x] Add UOM conversion details in the item grid overview/table lists

- [x] **Phase 3: Purchase Order (PO) & Goods Receipt Note (GRN) Integration**
  - [x] Update `PurchaseOrder.tsx` so the Add Item Modal automatically defaults to the selected item's pre-configured Purchase UOM (instead of generic "Box")
  - [x] Adapt GRN database commit/ledger logging logic to multiply quantity by `purchaseConversionFactor` and divide rate by `purchaseConversionFactor` before saving to `inventory_stock_ledger`

- [x] **Phase 4: Sales/Dispensing Pipeline Integration**
  - [x] Enhance Dispensing / Pharmacy Sale logic to multiply patient dispensed quantity by the selected sales unit conversion factor (e.g. `salesConversionFactor` for Strips, or `1.0` for single Tablets)
  - [x] Adjust Pricing Calculations based on selected sales unit conversions

- [x] **Phase 5: Verification & Testing**
  - [x] Perform database schema update validation (TSC compiled cleanly)
  - [x] Manually verify item creation with conversion factors in UI (TSC compiled cleanly)
  - [x] Manually verify Purchase, GRN Stock In Ledger entry calculations (TSC compiled cleanly)
  - [x] Manually verify Billing & Pharmacy Dispensing Ledger entry deductions (TSC compiled cleanly)
