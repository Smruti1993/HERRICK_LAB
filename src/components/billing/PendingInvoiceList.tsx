import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Pagination } from '../Pagination';
import { Search, ChevronDown, AlertCircle, Receipt } from 'lucide-react';

interface Props {
  onBillOrder: (orderIds: string[], patientId: string, appointmentId?: string) => void;
}

export const PendingInvoiceList: React.FC<Props> = ({ onBillOrder }) => {
  const { serviceOrders, patients, appointments, employees, departments, formatCurrency } = useData();
  const [filters, setFilters] = useState({
    mrNo: '', fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    visitType: '', consultant: '', department: '',
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const ITEMS = 10;

  const pending = useMemo(() => serviceOrders.filter(order => {
    if (order.billingStatus !== 'Pending' || order.status === 'Cancelled') return false;
    const apt = appointments.find(a => a.id === order.appointmentId);
    const patient = patients.find(p => p.id === apt?.patientId);
    const doctor = employees.find(e => e.id === order.orderingDoctorId);
    const dept = departments.find(d => d.id === (doctor?.departmentId || apt?.departmentId));

    if (filters.mrNo && !patient?.id.includes(filters.mrNo)) return false;
    if (filters.consultant && !doctor?.lastName?.toLowerCase().includes(filters.consultant.toLowerCase())) return false;
    if (filters.department && !dept?.name?.toLowerCase().includes(filters.department.toLowerCase())) return false;
    if (filters.visitType && apt?.visitType !== filters.visitType) return false;

    const oDate = order.orderDate?.split('T')[0] || '';
    if (oDate < filters.fromDate || oDate > filters.toDate) return false;
    return true;
  }), [serviceOrders, patients, appointments, employees, departments, filters]);

  const paginated = pending.slice((page - 1) * ITEMS, page * ITEMS);

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleBillSelected = () => {
    if (selected.length === 0) return;
    const firstOrder = serviceOrders.find(o => o.id === selected[0]);
    const apt = appointments.find(a => a.id === firstOrder?.appointmentId);
    onBillOrder(selected, apt?.patientId || '', firstOrder?.appointmentId);
    setSelected([]);
  };

  const setFilter = (k: string, v: string) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(1);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pending Invoice List</h2>
          <p className="text-slate-500 text-sm">Service orders awaiting billing — {pending.length} pending</p>
        </div>
        {selected.length > 0 && (
          <button
            id="btn-bill-selected"
            onClick={handleBillSelected}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-sm transition-all"
          >
            <Receipt className="w-4 h-4" />
            Bill {selected.length} Selected
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-600">
            {[
              { label: 'MR No', key: 'mrNo', type: 'text', placeholder: 'Search…' },
              { label: 'From', key: 'fromDate', type: 'date' },
              { label: 'To', key: 'toDate', type: 'date' },
              { label: 'Consultant', key: 'consultant', type: 'text', placeholder: 'Doctor name…' },
              { label: 'Department', key: 'department', type: 'text', placeholder: 'Department…' },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-1.5">
                <span className="text-slate-500">{f.label}:</span>
                {f.key === 'visitType' ? (
                  <select
                    className="border border-slate-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-400 text-slate-700"
                    value={filters.visitType}
                    onChange={e => setFilter('visitType', e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="New Visit">New Visit</option>
                    <option value="Follow-up">Follow-up</option>
                  </select>
                ) : (
                  <input
                    type={f.type}
                    placeholder={(f as any).placeholder || ''}
                    className="border border-slate-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 w-28"
                    value={(filters as any)[f.key]}
                    onChange={e => setFilter(f.key, e.target.value)}
                  />
                )}
              </label>
            ))}
            <label className="flex items-center gap-1.5">
              <span className="text-slate-500">Visit Type:</span>
              <select
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-400 text-slate-700"
                value={filters.visitType}
                onChange={e => setFilter('visitType', e.target.value)}
              >
                <option value="">All</option>
                <option value="New Visit">New Visit</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.length === paginated.length && paginated.length > 0}
                    onChange={() =>
                      selected.length === paginated.length
                        ? setSelected([])
                        : setSelected(paginated.map(o => o.id))
                    }
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Order Date</th>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">MR No</th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Doctor</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">No pending orders</p>
                    <p className="text-slate-300 text-xs mt-1">All service orders have been billed</p>
                  </td>
                </tr>
              ) : paginated.map(order => {
                const apt = appointments.find(a => a.id === order.appointmentId);
                const patient = patients.find(p => p.id === apt?.patientId);
                const doctor = employees.find(e => e.id === order.orderingDoctorId);
                const dept = departments.find(d => d.id === (doctor?.departmentId || apt?.departmentId));
                const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Walk-in';
                const mrNo = patient?.id?.slice(-8).toUpperCase() || '—';
                return (
                  <tr key={order.id} className={`hover:bg-blue-50/30 transition-colors ${selected.includes(order.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(order.orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{patientName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{mrNo}</td>
                    <td className="px-4 py-3 text-slate-700">{order.serviceName}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{dept?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatCurrency(order.totalPrice || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        id={`btn-bill-order-${order.id}`}
                        onClick={() => {
                          onBillOrder([order.id], apt?.patientId || '', order.appointmentId);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        Bill
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(pending.length / ITEMS)}
          totalItems={pending.length}
          itemsPerPage={ITEMS}
          onPageChange={setPage}
          colorTheme="blue"
        />
      </div>
    </div>
  );
};
