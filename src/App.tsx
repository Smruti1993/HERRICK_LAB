import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { Patients } from './pages/Patients';
import { Employees } from './pages/Employees';
import { Availability } from './pages/Availability';
import { Masters } from './pages/Masters';
import { Connection } from './pages/Connection';
import { Billing } from './pages/Billing';
import { DoctorWorkbench } from './pages/DoctorWorkbench';
import { Consultation } from './pages/Consultation';
import { Reports } from './pages/Reports';
import { ItemMaster } from './components/inventory/ItemMaster';
import { StoreMaster } from './components/inventory/StoreMaster';
import { ItemStoreMapping } from './components/inventory/ItemStoreMapping';
import { OpeningStockPage } from './components/inventory/OpeningStock';
import { StockLedgerReport } from './components/inventory/reports/StockLedger';
import { InventoryDashboard } from './components/inventory/InventoryDashboard';
import { DrugGenericMaster } from './components/pharmacy/masters/DrugGenericMaster';
import { DrugMaster } from './components/pharmacy/masters/DrugMaster';
import { DirectSale } from './components/pharmacy/DirectSale';
import { OPPharmacy } from './pages/OPPharmacy';
import { DrugReturn } from './pages/DrugReturn';
import { DirectSaleHistory } from './components/pharmacy/DirectSaleHistory';
import { OrganizationMaster } from './pages/OrganizationMaster';
import { PlanDefinition } from './pages/PlanDefinition';
import { SponsorTariff } from './pages/SponsorTariff';
import { Tax } from './pages/Tax';
import { VendorMaster } from './pages/VendorMaster';
import { PurchaseOrderPage } from './pages/PurchaseOrder';
import { GRNPage } from './pages/GRN';
import { PurchaseReceiptPage } from './pages/PurchaseReceipt';
import { PurchaseReturnPage } from './pages/PurchaseReturn';
import { ExpiryItemReturnPage } from './pages/ExpiryItemReturn';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { JournalVouchers } from './pages/JournalVouchers';
import { VendorCompliance } from './pages/VendorCompliance';
import { Refund } from './pages/Refund';

import LimsMasters from './pages/LimsMasters';
import LimsDashboard from './pages/LimsDashboard';
import LimsAmendments from './pages/LimsAmendments';
import LimsAnalytics from './pages/LimsAnalytics';
import LimsLayout from './components/LimsLayout';
import LimsCollectSample from './pages/LimsCollectSample';
import LimsAcceptSample from './pages/LimsAcceptSample';
import LimsPerformTest from './pages/LimsPerformTest';

import { FileText } from 'lucide-react';
import { Login } from './pages/Login';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { user } = useData();
    const location = useLocation();

    // Allow access to Connection page even if not logged in, but strictly enforce login for others
    if (location.pathname === '/connection') {
        return <>{children}</>;
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <>{children}</>;
};

const AppRoutes = () => {
    return (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/connection" element={<Connection />} />
          
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="patients" element={<Patients />} />
            <Route path="doctor-workbench" element={<DoctorWorkbench />} />
            <Route path="consultation/:appointmentId" element={<Consultation />} />
            <Route path="reports" element={<Reports />} />
            <Route path="employees" element={<Employees />} />
            <Route path="availability" element={<Availability />} />
            <Route path="masters" element={<Masters />} />
            <Route path="inventory">
              <Route index element={<Navigate to="item-master" replace />} />
              <Route path="dashboard" element={<InventoryDashboard />} />
              <Route path="reports" element={
                <div className="flex flex-col items-center justify-center h-[80vh] text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                        <FileText className="w-12 h-12 text-slate-300" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Reports</h2>
                    <p className="text-sm text-slate-500">Select a report from the module sidebar to begin.</p>
                </div>
              } />
              <Route path="reports/stock-ledger" element={<StockLedgerReport />} />
              <Route path="opening-stock" element={<OpeningStockPage />} />
              <Route path="masters" element={<Navigate to="/inventory/item-master" replace />} />
              <Route path="item-master" element={<ItemMaster />} />
              <Route path="store-master" element={<StoreMaster />} />
              <Route path="item-store-map" element={<ItemStoreMapping />} />
            </Route>
            <Route path="pharmacy">
              <Route index element={<Navigate to="masters/drug-generic" replace />} />
              <Route path="masters" element={<Navigate to="/pharmacy/masters/drug-generic" replace />} />
              <Route path="masters/drug-generic" element={<DrugGenericMaster />} />
              <Route path="masters/drug-master" element={<DrugMaster />} />
              <Route path="direct-sale" element={<DirectSale />} />
              <Route path="direct-sale-history" element={<DirectSaleHistory />} />
              <Route path="op-pharmacy" element={<OPPharmacy />} />
              <Route path="drug-return" element={<DrugReturn />} />
            </Route>
            <Route path="procurement">
              <Route index element={<Navigate to="vendor-master" replace />} />
              <Route path="vendor-master" element={<VendorMaster />} />
              <Route path="vendor-compliance" element={<VendorCompliance />} />
              <Route path="tax" element={<Tax />} />
              <Route path="purchase-order" element={<PurchaseOrderPage />} />
              <Route path="grn" element={<GRNPage />} />
              <Route path="purchase-receipt" element={<PurchaseReceiptPage />} />
              <Route path="purchase-return" element={<PurchaseReturnPage />} />
              <Route path="expiry-return" element={<ExpiryItemReturnPage />} />
            </Route>
            <Route path="finance">
              <Route index element={<Navigate to="masters/organization" replace />} />
              <Route path="billing" element={<Billing />} />
              <Route path="masters/organization" element={<OrganizationMaster />} />
              <Route path="masters/plan-definition" element={<PlanDefinition />} />
              <Route path="masters/sponsor-tariff" element={<SponsorTariff />} />
              <Route path="masters/chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="transactions/journal-vouchers" element={<JournalVouchers />} />
              <Route path="transactions/refund" element={<Refund />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* LIMS layout routes */}
          <Route path="/lims" element={<PrivateRoute><LimsLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<LimsDashboard />} />
            <Route path="masters" element={<LimsMasters />} />
            <Route path="amendments" element={<LimsAmendments />} />
            <Route path="analytics" element={<LimsAnalytics />} />
            <Route path="collect" element={<LimsCollectSample />} />
            <Route path="collect/:orderId" element={<LimsCollectSample />} />
            <Route path="accept" element={<LimsAcceptSample />} />
            <Route path="accept/:orderId" element={<LimsAcceptSample />} />
            <Route path="perform" element={<LimsPerformTest />} />
            <Route path="perform/:orderId" element={<LimsPerformTest />} />
          </Route>
        </Routes>
    );
}

const App = () => {
  return (
    <DataProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </DataProvider>
  );
};

export default App;