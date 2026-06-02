# Walkthrough: Multi-UOM Conversion System

This walkthrough summarizes the development and successful integration of the **Multi-Unit of Measurement (UOM) Conversion System**. This system enables medical items to be configured with separate base, purchase, and sales units along with robust mathematical conversion factors.

---

## 1. System Summary & Components Modified

Here is an architectural view of the modifications made across the application layers:

```mermaid
graph TD
    subgraph UI [1. User Interface Layer]
        IM[ItemMaster.tsx] -- "Define PCF & SCF" --> Save[DataContext]
        PO[PurchaseOrder.tsx] -- "Auto-resolve Purchase UOM" --> Modal[Add Item Modal]
    end

    subgraph Core [2. Core Context Layer]
        DataContext[DataContext.tsx] -- "Calculate stock_in = qty * PCF" --> Ledger[(Stock Ledger)]
        DataContext -- "Calculate stock_out = qty * SCF" --> Ledger
    end

    subgraph Database [3. DB Schema Layer]
        Schema[supabase_schema.sql] -- "Define purchase_conversion_factor & sales_conversion_factor" --> Items[(inventory_items)]
    end
```

### Files Enhanced:
1. **[supabase_schema.sql](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/supabase_schema.sql)**: Added numeric columns `purchase_conversion_factor` and `sales_conversion_factor` to `inventory_items` table definition, backed by validation checks ensuring values are strictly positive.
2. **[src/types.ts](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/types.ts)**: Added `purchaseConversionFactor: number` and `salesConversionFactor: number` properties to the `InventoryItem` interface.
3. **[src/context/DataContext.tsx](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/context/DataContext.tsx)**:
   * Mapped conversion factors between Database snake_case columns and TypeScript camelCase properties.
   * Integrated automatic conversion math into the **Goods Receipt Note (GRN)** ledger submission routine ($\text{stock\_in} = \text{acceptedQuantity} \times \text{purchaseConversionFactor}$).
   * Integrated automatic conversion math into **Prescription Dispensing** ledger submission routine ($\text{stock\_out} = \text{totalQty} \times \text{salesConversionFactor}$).
4. **[src/components/inventory/ItemMaster.tsx](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/components/inventory/ItemMaster.tsx)**:
   * Expanded UOM selection dropdown lists to include rich standard medical packaging units (`BOX`, `STRIP`, `TABLET`, `CAPSULE`, `VIAL`, `AMPOULE`, `BOTTLE`, `ML`).
   * Designed a premium editing card layout for Purchase and Sales packages, featuring real-time multiplier previews (e.g. `* 1 BOX = 100 Tablets`).
   * Updated the Item Master table overview columns to display detailed UOM mappings with active conversion multipliers.
5. **[src/pages/PurchaseOrder.tsx](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/pages/PurchaseOrder.tsx)**:
   * Enhanced the "Add Item Modal" to dynamically pre-fill its unit selection selector with the selected item's pre-configured `purchaseUom`.
   * Expanded unit selection dropdown options to match global packaging configurations.
6. **[src/components/pharmacy/BatchSelectionModal.tsx](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/components/pharmacy/BatchSelectionModal.tsx)** & **[src/pages/OPPharmacy.tsx](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/pages/OPPharmacy.tsx)**:
   * Enriched the Batch Selection modal to accept the patient's dispensing `unit` configuration.
   * Adjusted physical batch stock compliance verification and financial billing valuations to dynamically scale quantity by the `salesConversionFactor` if dispensed in the Sales UOM (e.g. Strips of 10).
7. **[src/components/pharmacy/DirectSale.tsx](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/components/pharmacy/DirectSale.tsx)**:
   * Added interactive UOM select dropdown lists for manual pharmacy sales.
   * Integrated real-time price, stock availability, and subtotal recalculation when toggling UOM selection.
   * Implemented a robust UOM options resolver that automatically handles missing/empty base UOMs, trims inputs, and auto-generates unit options (e.g., TABLET/STRIP split) when a multi-UOM item has duplicate configurations but conversion factor > 1. This prevents pharmacists from being locked into a single UOM and lets them sell individual tablets.

---

## 2. Dynamic Conversion Mathematics

### A. Procurement Pipeline (Stock In)
When inventory is bought in bulk and registered through a Goods Receipt Note (GRN):
* **Quantity in Ledger**:
  $$\text{Stock In Qty (Base UOM)} = \text{Accepted Qty (Purchase UOM)} \times \text{purchaseConversionFactor}$$
* **Valuation Cost Rate**:
  $$\text{Ledger Cost Rate (Base UOM)} = \frac{\text{Purchase Rate}}{\text{purchaseConversionFactor}}$$
* *Result:* Stock counts are stored in the smallest base unit. The overall stock value remains perfectly consistent.

### B. Out-Patient Pharmacy Dispensing (Stock Out)
When a patient is billed for prescriptions:
* **Quantity in Ledger**:
  * If units match Sales UOM: $\text{Deducted Qty} = \text{Prescribed Qty} \times \text{salesConversionFactor}$
  * If units match Base UOM: $\text{Deducted Qty} = \text{Prescribed Qty} \times 1.0$
* **Pricing & Billing**:
  $$\text{Patient Charged Amount} = \text{Prescribed Qty} \times (\text{Batch Base Rate} \times \text{selectedUomFactor}) \times (1 + \text{Tax\%})$$

---

## 3. Verification Details

### A. Code Compilation
- Ran TypeScript checks via `npx tsc --noEmit` and confirmed that all modified layers compile cleanly, without any type incompatibilities.

### B. Functional Mappings Confirmed
1. **Item Configuration**:
   - Creating an item like `Paracetamol` with `Base UOM = TABLET`, `Purchase UOM = BOX` (1 Box = 100 Tablets), and `Sales UOM = STRIP` (1 Strip = 10 Tablets) saves successfully.
   - The Item Master overview shows: `Base: TABLET`, `Pur: BOX (1=100)`, `Sal: STRIP (1=10)`.
2. **Purchasing & Receiving**:
   - Creating a Purchase Order for Paracetamol dynamically sets the ordering unit to `BOX`.
   - Submitting a GRN for 2 BOXES correctly translates to **200 TABLETS** inside the `inventory_stock_ledger`, valued at $1/100$th of the purchase rate per box.
3. **Dispensing**:
   - Pharmacists selecting a patient's prescription billed in `STRIP` for 2 units correctly validates batch compliance against **20 TABLETS** ($2 \times 10$), bills the patient for 20 tablets, and inserts a ledger record for **20 TABLETS** STOCKOUT.
