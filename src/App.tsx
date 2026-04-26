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
            <Route path="billing" element={<Billing />} />
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
              <Route path="op-pharmacy" element={<OPPharmacy />} />
              <Route path="drug-return" element={<DrugReturn />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
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