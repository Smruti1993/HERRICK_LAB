# Implementation Plan - Multi-UOM Conversion System

This implementation plan details the architecture, database schema enhancements, mathematical conversion rules, and user interface modifications required to implement a robust multi-Unit of Measurement (UOM) system. This system will handle purchasing (e.g., in **Boxes** or **Packs**) and dispensing/sales (e.g., in **Strips** or **individual Tablets**) with automatic conversion factors.

---

## 1. Architectural Blueprint: The Three-Tier UOM Model

To prevent rounding errors, valuation mismatches, and stock ledger anomalies, the system will operate on a **Three-Tier UOM architecture**:

```mermaid
flowchart TD
    subgraph Procurement [1. Purchase & Receiving Tier]
        PO[Purchase Order] -- "Quantity in Purchase UOM (e.g., Box)" --> GRN[Goods Receipt Note]
    end

    subgraph Inventory [2. Stock & Valuation Tier (Single Source of Truth)]
        Ledger[(Stock Ledger)] -- "Always stored in BASE UOM (e.g., Tablet / Each)" --> Valuation[Inventory Valuation]
    end

    subgraph Dispensing [3. Sales & Clinical Dispensing Tier]
        Sale[Direct Sale / Dispensing] -- "Sold in Sales UOM (e.g., Strip / Each)" --> Deduction[Base Qty Deduction]
    end

    GRN -- "Multiply Qty by Purchase Conversion Factor (PCF)" --> Ledger
    Deduction -- "Multiply Qty by Sales Conversion Factor (SCF)" --> Ledger
```

### Definitions:
1. **Base UOM (Stock Unit)**: The absolute smallest indivisible unit of measure in which the product is tracked in the inventory ledger (e.g., `TABLET`, `CAPSULE`, `VIAL`, `ML`, `EACH`). **All inventory quantities, stock ledger transactions, and item valuation cost rates are stored in this unit.**
2. **Purchase UOM (Ordering Unit)**: The packaging unit in which items are ordered and received from vendors (e.g., `BOX`, `PACK`, `CARTON`).
   - **Purchase Conversion Factor (PCF)**: The number of **Base UOM units** contained within one **Purchase UOM**. 
     *Example: If 1 Box contains 100 Tablets, then PCF = 100.0.*
3. **Sales UOM (Dispensing Unit)**: The unit of packaging in which items are billed and dispensed to patients (e.g., `STRIP`, `TABLET`, `EACH`).
   - **Sales Conversion Factor (SCF)**: The number of **Base UOM units** contained within one **Sales UOM**. 
     *Example: If 1 Strip contains 10 Tablets, then SCF = 10.0. If sold as a single tablet, SCF = 1.0.*

---

## 2. Proposed Changes

### Component A: Database Schema & Type Systems

To store the conversion factors directly on the item master, we will extend the `inventory_items` table. This approach integrates seamlessly with the existing database schema without requiring complex joins.

#### [MODIFY] [supabase_schema.sql](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/supabase_schema.sql)

We will modify the table definition for `inventory_items` to add two conversion factor columns with appropriate defaults:

```sql
-- In Section 22. Inventory Items
ALTER TABLE inventory_items 
  ADD COLUMN IF NOT EXISTS purchase_conversion_factor numeric(12, 4) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS sales_conversion_factor numeric(12, 4) DEFAULT 1.0;

-- Ensure constraints (conversion factors must always be positive numbers)
ALTER TABLE inventory_items 
  ADD CONSTRAINT chk_purchase_conv_factor CHECK (purchase_conversion_factor > 0),
  ADD CONSTRAINT chk_sales_conv_factor CHECK (sales_conversion_factor > 0);
```

#### [MODIFY] [types.ts](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/types.ts)

Update the TypeScript interfaces to reflect the new properties:

```typescript
export interface InventoryItem {
  // ... existing fields
  baseUom: string;
  trackUom: string;
  purchaseUom: string;
  salesUom: string;
  
  // NEW: UOM Conversion Factors
  purchaseConversionFactor: number; // Multiplier from Purchase UOM to Base UOM
  salesConversionFactor: number;    // Multiplier from Sales UOM to Base UOM
  
  // ... rest of interface
}
```

#### [MODIFY] [DataContext.tsx](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/context/DataContext.tsx)

Map the new SQL snake_case columns to TypeScript camelCase properties in the Supabase payload serializers:

```typescript
// During item retrieval conversion (database to frontend):
purchaseConversionFactor: Number(i.purchase_conversion_factor || 1),
salesConversionFactor: Number(i.sales_conversion_factor || 1),

// During item saving conversion (frontend to database):
purchase_conversion_factor: i.purchaseConversionFactor || 1,
sales_conversion_factor: i.salesConversionFactor || 1,
```

---

### Component B: Item Master Configuration UI

#### [MODIFY] [ItemMaster.tsx](file:///d:/New%20folder/GIT%20HUB/HIS-WEB5/src/components/inventory/ItemMaster.tsx)

We will redesign the "Accounts and Sales Info." tab in the Item Master form to provide an intuitive interface for defining conversion factors.

1. **Initial State Update**:
   Update `initialItem` to include:
   ```typescript
   purchaseConversionFactor: 1,
   salesConversionFactor: 1,
   ```

2. **UI Fields & Visual Explanations**:
   Provide helper labels that explain the mathematics of the conversion factors in real-time to prevent user error.

   ```tsx
   {/* In the Accounts and Sales Info tab */}
   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
     {/* Purchase UOM & Conversion Factor */}
     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 space-y-4">
       <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Purchasing Packaging</h4>
       <div>
         <label className="block text-xs font-bold text-slate-500 mb-2">Purchase UOM</label>
         <select 
           className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm"
           value={form.purchaseUom}
           onChange={e => setForm({ ...form, purchaseUom: e.target.value })}
         >
           <option value="BOX">BOX</option>
           <option value="PACK">PACK</option>
           <option value="STRIP">STRIP</option>
           <option value="EACH">EACH</option>
         </select>
       </div>
       <div>
         <label className="block text-xs font-bold text-slate-500 mb-2">Purchase Conversion Factor</label>
         <input 
           type="number"
           min="0.0001"
           step="any"
           className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm"
           value={form.purchaseConversionFactor}
           onChange={e => setForm({ ...form, purchaseConversionFactor: parseFloat(e.target.value) || 1 })}
         />
         <p className="text-[10px] text-slate-400 mt-1.5 italic">
           * 1 {form.purchaseUom || 'BOX'} = {form.purchaseConversionFactor} {form.baseUom || 'EACH'}(s)
         </p>
       </div>
     </div>

     {/* Sales UOM & Conversion Factor */}
     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 space-y-4">
       <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Dispensing / Sales Packaging</h4>
       <div>
         <label className="block text-xs font-bold text-slate-500 mb-2">Sales UOM</label>
         <select 
           className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm"
           value={form.salesUom}
           onChange={e => setForm({ ...form, salesUom: e.target.value })}
         >
           <option value="STRIP">STRIP</option>
           <option value="TABLET">TABLET</option>
           <option value="CAPSULE">CAPSULE</option>
           <option value="EACH">EACH</option>
         </select>
       </div>
       <div>
         <label className="block text-xs font-bold text-slate-500 mb-2">Sales Conversion Factor</label>
         <input 
           type="number"
           min="0.0001"
           step="any"
           className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm"
           value={form.salesConversionFactor}
           onChange={e => setForm({ ...form, salesConversionFactor: parseFloat(e.target.value) || 1 })}
         />
         <p className="text-[10px] text-slate-400 mt-1.5 italic">
           * 1 {form.salesUom || 'STRIP'} = {form.salesConversionFactor} {form.baseUom || 'EACH'}(s)
         </p>
       </div>
     </div>
   </div>
   ```

---

### Component C: Transactional Flows & Mathematical Conversions

#### 1. Procurement Pipeline (Purchase Order & Goods Receipt Note)
- **Purchase Order (PO)**: 
  - Stays denominated in **Purchase UOM** because the vendor prices and packs in bulk boxes/cases.
  - When adding an item in `PurchaseOrder.tsx`, the system will read the item's configured `purchaseUom` and automatically pre-fill `modalUnit` with it, rather than defaulting to generic "Box".
  - Mathematically, no stock ledger impact occurs at PO stage (only commitments).

- **Goods Receipt Note (GRN) Submission [CRITICAL EVENT]**:
  - Located in the backend or context logic where GRN entries commit stock to inventory ledgers.
  - When inserting rows into `inventory_stock_ledger`, the system **must** translate the packaging count to the smallest unit.
  - **The Formulas**:
    $$\text{Stock Ledger Qty (Base)} = \text{Received Quantity (Purchase)} \times \text{Purchase Conversion Factor}$$
    $$\text{Ledger Valuation Rate (Base)} = \frac{\text{Purchase Rate}}{\text{Purchase Conversion Factor}}$$
  - *Example:* 
    * Item: Paracetamol. Base UOM = `TABLET`. Purchase UOM = `BOX`. PCF = `100`.
    * We receive 10 Boxes at a purchase rate of 50.00 SAR per Box.
    * Stock Ledger Qty = $10 \times 100 = 1000$ tablets.
    * Cost Rate = $50.00 / 100 = 0.50$ SAR per tablet.
    * Total Stock Value = $1000 \times 0.50 = 500$ SAR (value is preserved perfectly).

#### 2. Billing & Pharmacy Dispensing Pipeline
When dispensing drugs to patients, prescriptions can be fulfilled in dynamic fractions (e.g., a patient only needs 3 tablets, or a patient buys a full strip of 10).

- **Prescription / Sale Item Handling**:
  - The dispensing user chooses the transaction unit: `Sales UOM` (e.g., Strip) or `Base UOM` (e.g., Tablet).
  - The UI will dynamically show two conversion options.
  - **The Formulas**:
    $$\text{Stock Ledger Qty to Deduct} = \text{Dispensed Quantity} \times \text{Conversion Factor of Selected Unit}$$
    *If Strip is selected:* $\text{Deduction Qty} = \text{Qty} \times \text{salesConversionFactor}$
    *If Tablet (Base UOM) is selected:* $\text{Deduction Qty} = \text{Qty} \times 1.0$
  - **Price Calculation**:
    $$\text{Unit Price Charged} = \text{Base Price} \times \text{Conversion Factor of Selected Unit}$$
    *This ensures a strip of 10 costs exactly 10x the price of a single tablet (or fits a designated package price structure).*

---

## 3. Detailed Example Walkthrough: The Paracetamol Lifecycle

Let's look at a concrete database state to visualize the data flow:

### 1. Item Configuration in Item Master
- **Item Code**: `PMOL500`
- **Item Name**: `Paracetamol 500mg Tablets`
- **Base UOM**: `TABLET` (Smallest unit)
- **Purchase UOM**: `BOX` (Pack size bought from supplier)
- **Purchase Conversion Factor (PCF)**: `100` (1 Box contains 100 Tablets)
- **Sales UOM**: `STRIP` (Intermediate unit sold to patients)
- **Sales Conversion Factor (SCF)**: `10` (1 Strip contains 10 Tablets)

### 2. Purchase Order & Receiving
- We order **5 BOXES** of Paracetamol from the supplier at **$40.00 SAR** per Box.
- Upon GRN submission:
  - Received Qty in Purchase UOM = 5 Boxes.
  - Multiplier applied: $5 \times 100 = 500$ Tablets.
  - Unit Cost Rate recalculation: $40.00 \text{ SAR} / 100 = 0.40$ SAR per Tablet.
  - Database Action: Inserts record into `inventory_stock_ledger` with `stock_in_quantity = 500`, `closing_stock_rate = 0.40`, and `closing_stock_value = 200.00` SAR.

### 3. Patient Dispensing Scenario
A patient presents a prescription. The pharmacist has two selling options:
- **Scenario A: Dispense 2 STRIPS (Sales UOM)**:
  - Dispensed Qty = 2. Unit = `STRIP`.
  - Conversion lookup: Sales Conversion Factor = 10.
  - Deduction Qty: $2 \times 10 = 20$ Tablets.
  - Financial Cost of Goods Sold (COGS) is evaluated as: $20 \text{ Tablets} \times 0.40 \text{ SAR} = 8.00$ SAR.
  - Stock is cleanly decremented by **20** tablets in the ledger.
  
- **Scenario B: Dispense 5 individual TABLETS (Base UOM)**:
  - Dispensed Qty = 5. Unit = `TABLET` (matches Base UOM).
  - Conversion lookup: Factor = 1.
  - Deduction Qty: $5 \times 1 = 5$ Tablets.
  - Financial COGS: $5 \times 0.40 \text{ SAR} = 2.00$ SAR.
  - Stock is cleanly decremented by **5** tablets in the ledger.

---

## 4. Verification Plan

### Automated Database / Backend Rules
- Validate that the schema change succeeds on local/staging environments.
- Verify through unit testing that any inventory transaction validation (e.g., checking if stock is sufficient) converts the requested sales quantity into Base UOM *before* executing the stock comparison. E.g.:
  $$\text{Is Available?} \quad \Rightarrow \quad \text{Current Stock (in Tablets)} \geq (\text{Dispensed Quantity} \times \text{Sales Conversion Factor})$$

### Manual UI Verification
1. **Item Master Validation**:
   - Create a new medical inventory item with `Base UOM = TABLET`, `Purchase UOM = BOX`, and `Purchase Conversion Factor = 100`.
   - Save the item and verify it reflects correctly in the dashboard.
2. **Receiving Verification**:
   - Create a PO and matching GRN for 2 BOXES of the item.
   - Submit the GRN.
   - Go to the **Stock Ledger Report** (`src/components/inventory/reports/StockLedger.tsx`) and verify that the ledger records **200 TABLETS** (instead of 2 boxes) at the appropriate divided rate.
3. **Dispensing Verification**:
   - Create a pharmacy direct sale. Select the item.
   - Choose `STRIP` as the selling unit with quantity = 2. Verify that the price calculates as $20 \times \text{tablet price}$.
   - Complete the sale, and confirm that the item's ledger records a decrement of **20 TABLETS** and the remaining stock shows 180 Tablets.
