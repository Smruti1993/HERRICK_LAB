import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { Layout } from './components/Layout';
import { RbacConfig } from './pages/RbacConfig';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { Patients } from './pages/Patients';
import { AbdmProfiles } from './pages/AbdmProfiles';
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
import { StockTransfer } from './components/inventory/StockTransfer';
import { OpeningStockPage } from './components/inventory/OpeningStock';
import { StockLedgerReport } from './components/inventory/reports/StockLedger';
import { InventoryDashboard } from './components/inventory/InventoryDashboard';
import { DrugGenericMaster } from './components/pharmacy/masters/DrugGenericMaster';
import { DrugMaster } from './components/pharmacy/masters/DrugMaster';
import ZoneMaster from './components/pharmacy/masters/ZoneMaster';
import RackMaster from './components/pharmacy/masters/RackMaster';
import BatchLocations from './components/pharmacy/masters/BatchLocations';
import { DirectSale } from './components/pharmacy/DirectSale';
import { OPPharmacy } from './pages/OPPharmacy';
import { DrugReturn } from './pages/DrugReturn';
import { DirectSaleHistory } from './components/pharmacy/DirectSaleHistory';
import { Loyalty } from './pages/Loyalty';
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
import { NewInvoice } from './pages/NewInvoice';

import LimsMasters from './pages/LimsMasters';
import LimsDashboard from './pages/LimsDashboard';
import LimsAmendments from './pages/LimsAmendments';
import LimsAnalytics from './pages/LimsAnalytics';
import LimsReagentsDashboard from './pages/LimsReagentsDashboard';
import LimsProfileReports from './pages/LimsProfileReports';
import LimsLayout from './components/LimsLayout';
import LimsCollectSample from './pages/LimsCollectSample';
import LimsAcceptSample from './pages/LimsAcceptSample';
import LimsPerformTest from './pages/LimsPerformTest';

import { FileText, ShieldAlert } from 'lucide-react';
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

const ScreenGuard = ({ screenCode, children }: { screenCode: string; children: React.ReactNode }) => {
    const { user } = useData();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const isAdmin = user.username.toLowerCase() === 'admin' || 
                    user.role?.toLowerCase() === 'administrator' || 
                    user.role?.toLowerCase() === 'admin';
                    
    if (isAdmin) {
        return <>{children}</>;
    }

    const privilege = user.privileges?.[screenCode];
    if (!privilege || !privilege.can_view) {
        // Dynamic redirect if user visits root page but doesn't have main dashboard access
        if (screenCode === 'DASHBOARD') {
            const hasLims = !!user.privileges?.['LIMS_DASHBOARD']?.can_view;
            if (hasLims) {
                return <Navigate to="/lims/dashboard" replace />;
            }
            const hasFin = !!user.privileges?.['FIN_BILLING']?.can_view;
            if (hasFin) {
                return <Navigate to="/finance/billing" replace />;
            }
        }
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto p-8 animate-in fade-in duration-300">
                <div className="bg-red-50 p-4 rounded-full mb-4 border border-red-100">
                    <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
                <p className="text-sm text-slate-500 max-w-md text-center">
                    You do not have the required permissions to view this screen ({screenCode}). Please contact your system administrator.
                </p>
            </div>
        );
    }

    return <>{children}</>;
};

const AppRoutes = () => {
    return (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/connection" element={<Connection />} />
          
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<ScreenGuard screenCode="DASHBOARD"><Dashboard /></ScreenGuard>} />
            <Route path="appointments" element={<ScreenGuard screenCode="APPOINTMENTS"><Appointments /></ScreenGuard>} />
            <Route path="patients" element={<ScreenGuard screenCode="PATIENTS"><Patients /></ScreenGuard>} />
            <Route path="abdm-profiles" element={<ScreenGuard screenCode="ABDM_PROFILES"><AbdmProfiles /></ScreenGuard>} />
            <Route path="doctor-workbench" element={<ScreenGuard screenCode="DOCTOR_WORKBENCH"><DoctorWorkbench /></ScreenGuard>} />
            <Route path="consultation/:appointmentId" element={<ScreenGuard screenCode="DOCTOR_WORKBENCH"><Consultation /></ScreenGuard>} />
            <Route path="reports" element={<ScreenGuard screenCode="REPORTS"><Reports /></ScreenGuard>} />
            <Route path="employees" element={<ScreenGuard screenCode="EMPLOYEES"><Employees /></ScreenGuard>} />
            <Route path="availability" element={<ScreenGuard screenCode="AVAILABILITY"><Availability /></ScreenGuard>} />
            <Route path="masters" element={<ScreenGuard screenCode="MASTERS"><Masters /></ScreenGuard>} />
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
              <Route path="stock-transfer" element={<StockTransfer />} />
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
              <Route path="masters/zones" element={<ZoneMaster />} />
              <Route path="masters/racks" element={<RackMaster />} />
              <Route path="masters/batch-locations" element={<BatchLocations />} />
              <Route path="direct-sale" element={<DirectSale />} />
              <Route path="direct-sale-history" element={<DirectSaleHistory />} />
              <Route path="op-pharmacy" element={<OPPharmacy />} />
              <Route path="drug-return" element={<DrugReturn />} />
              <Route path="loyalty" element={<Loyalty />} />
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
              <Route path="billing" element={<ScreenGuard screenCode="FIN_BILLING"><Billing /></ScreenGuard>} />
              <Route path="billing/new" element={<ScreenGuard screenCode="FIN_BILLING"><NewInvoice /></ScreenGuard>} />
              <Route path="billing/:id/edit" element={<ScreenGuard screenCode="FIN_BILLING"><NewInvoice /></ScreenGuard>} />
              <Route path="masters/organization" element={<ScreenGuard screenCode="FIN_ORG"><OrganizationMaster /></ScreenGuard>} />
              <Route path="masters/plan-definition" element={<ScreenGuard screenCode="FIN_PLAN"><PlanDefinition /></ScreenGuard>} />
              <Route path="masters/sponsor-tariff" element={<ScreenGuard screenCode="FIN_TARIFF"><SponsorTariff /></ScreenGuard>} />
              <Route path="masters/chart-of-accounts" element={<ScreenGuard screenCode="FIN_COA"><ChartOfAccounts /></ScreenGuard>} />
              <Route path="transactions/journal-vouchers" element={<ScreenGuard screenCode="FIN_JV"><JournalVouchers /></ScreenGuard>} />
              <Route path="transactions/refund" element={<ScreenGuard screenCode="FIN_REFUND"><Refund /></ScreenGuard>} />
            </Route>

            <Route path="rbac" element={<ScreenGuard screenCode="RBAC_CONFIG"><RbacConfig /></ScreenGuard>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* LIMS layout routes */}
          <Route path="/lims" element={<PrivateRoute><LimsLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ScreenGuard screenCode="LIMS_DASHBOARD"><LimsDashboard /></ScreenGuard>} />
            <Route path="masters" element={<ScreenGuard screenCode="LIMS_MASTERS"><LimsMasters /></ScreenGuard>} />
            <Route path="amendments" element={<ScreenGuard screenCode="LIMS_AMENDMENTS"><LimsAmendments /></ScreenGuard>} />
            <Route path="analytics" element={<ScreenGuard screenCode="LIMS_ANALYTICS"><LimsAnalytics /></ScreenGuard>} />
            <Route path="reagents-dashboard" element={<ScreenGuard screenCode="LIMS_ANALYTICS"><LimsReagentsDashboard /></ScreenGuard>} />
            <Route path="reports-profiles" element={<ScreenGuard screenCode="LIMS_ANALYTICS"><LimsProfileReports /></ScreenGuard>} />
            <Route path="collect" element={<ScreenGuard screenCode="LIMS_COLLECT"><LimsCollectSample /></ScreenGuard>} />
            <Route path="collect/:orderId" element={<ScreenGuard screenCode="LIMS_COLLECT"><LimsCollectSample /></ScreenGuard>} />
            <Route path="accept" element={<ScreenGuard screenCode="LIMS_ACCEPT"><LimsAcceptSample /></ScreenGuard>} />
            <Route path="accept/:orderId" element={<ScreenGuard screenCode="LIMS_ACCEPT"><LimsAcceptSample /></ScreenGuard>} />
            <Route path="perform" element={<ScreenGuard screenCode="LIMS_PERFORM"><LimsPerformTest /></ScreenGuard>} />
            <Route path="perform/:orderId" element={<ScreenGuard screenCode="LIMS_PERFORM"><LimsPerformTest /></ScreenGuard>} />
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