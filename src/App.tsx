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
import { Inventory } from './pages/Inventory';
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
            <Route path="inventory" element={<Inventory />} />
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