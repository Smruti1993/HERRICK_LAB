
import { useData } from '../context/DataContext';
import { Users, Activity, Calendar, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
  </div>
);

export const Dashboard = () => {
  const { patients, employees, appointments, departments } = useData();

  const doctorsCount = employees.filter(e => e.role === 'Doctor').length;
  const today = new Date().toISOString().split('T')[0];
  const appointmentsToday = appointments.filter(a => a.date === today).length;

  const chartData = departments.map(dept => {
    return {
      name: dept.name,
      appointments: appointments.filter(a => a.departmentId === dept.id).length
    };
  }).sort((a, b) => b.appointments - a.appointments);

  // Colors for bars
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Patients" value={patients.length} icon={Users} color="bg-blue-500" />
        <StatCard title="Active Doctors" value={doctorsCount} icon={Activity} color="bg-teal-500" />
        <StatCard title="Appointments Today" value={appointmentsToday} icon={Calendar} color="bg-indigo-500" />
        <StatCard title="Pending Actions" value="12" icon={Clock} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Appointments by Department</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="appointments" radius={[6, 6, 0, 0]} barSize={50}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Appointments</h3>
          <div className="space-y-4">
            {appointments.slice(-5).reverse().map((apt, idx) => {
              const doctor = employees.find(e => e.id === apt.doctorId);
              const patient = patients.find(p => p.id === apt.patientId);
              return (
                <div key={idx} className="flex items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 cursor-default group">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {patient?.firstName[0]}{patient?.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {patient?.firstName} {patient?.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {doctor?.role} {doctor?.lastName} • {apt.time}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    apt.status === 'Completed' ? 'bg-green-50 text-green-700' :
                    apt.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              );
            })}
            {appointments.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <Calendar className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">No appointments yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};