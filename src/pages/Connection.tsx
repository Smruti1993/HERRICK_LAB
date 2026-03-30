import React, { useState, useEffect } from 'react';
import { Database, Save, AlertCircle, CheckCircle, LogOut, Loader2, Lock, Play, FileCode, Copy, Check } from 'lucide-react';
import { getStoredCredentials } from '../services/supabaseClient';
import { useData } from '../context/DataContext';

export const Connection = () => {
  const { isDbConnected, updateDbConnection, disconnectDb, isLoading, showToast } = useData();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isHardcoded, setIsHardcoded] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [showSchema, setShowSchema] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const creds = getStoredCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    
    const isUsingLocalStorage = localStorage.getItem('medicore_sb_url');
    if (!isUsingLocalStorage && creds.url) {
        setIsHardcoded(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(url && key && !isHardcoded) {
        updateDbConnection(url.trim(), key.trim());
    }
  };

  const handleDisconnect = () => {
      if (isHardcoded) return;
      disconnectDb();
      setUrl('');
      setKey('');
      setTestStatus('idle');
  };

  const handleTestConnection = async () => {
      if (!url || !key) {
          showToast('error', 'Please enter URL and Key first');
          return;
      }
      
      setTestStatus('testing');
      setTestMessage('Pinging Supabase...');
      
      try {
          // We can't use getSupabase() here easily because it might use old creds if not updated yet
          // But we can try to use the current input values if we wanted to test BEFORE saving.
          // For now, let's assume user saved or we use current stored if available.
          
          // Actually, let's use a temporary client to test the INPUT values
          const { createClient } = await import('@supabase/supabase-js');
          const tempClient = createClient(url, key);
          
          // Try to fetch something simple. If tables don't exist, this might fail with specific error.
          // 'app_users' should exist if setup. If not, we catch that.
          const { error } = await tempClient.from('app_users').select('count', { count: 'exact', head: true });
          
          if (error) {
              if (error.code === 'PGRST301' || error.message.includes('does not exist')) {
                   setTestStatus('error');
                   setTestMessage('Connection successful, but tables are missing. Please run the SQL Schema below.');
                   setShowSchema(true);
              } else {
                   throw error;
              }
          } else {
              setTestStatus('success');
              setTestMessage('Connection successful! Database is ready.');
          }
      } catch (e: any) {
          console.error(e);
          setTestStatus('error');
          setTestMessage(`Connection failed: ${e.message || 'Unknown error'}`);
      }
  };

  const schemaSql = `-- Run this in Supabase SQL Editor to create tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Departments
create table if not exists departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null,
  status text default 'Active'
);

-- 2. Employees (Doctors & Staff)
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  role text not null, -- 'Doctor', 'Nurse', 'Admin', 'Receptionist'
  department_id uuid references departments(id),
  specialization text,
  status text default 'Active'
);

-- 3. App Users (for Login)
create table if not exists app_users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password text not null, -- Plain text for demo simplicity
  role text not null,
  full_name text,
  employee_id uuid references employees(id)
);

-- Seed Initial Admin User
insert into app_users (username, password, role, full_name)
values ('admin', 'admin123', 'Administrator', 'System Admin')
on conflict (username) do nothing;

-- (Copy full schema from src/db/schema.sql for complete setup)
`;

  const handleCopySchema = () => {
      // In a real app, we'd fetch the full content of schema.sql or embed it all.
      // For this snippet, I'll put a simplified version or the user can open the file.
      // Let's just put a message to check the file.
      navigator.clipboard.writeText(schemaSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('success', 'SQL copied to clipboard');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            {/* Header ... */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Database className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Database Connection</h2>
                    <p className="text-sm text-slate-500">Configure your Supabase credentials</p>
                </div>
            </div>

            {/* Status Banner */}
            <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${isDbConnected ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                {isDbConnected ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                <div className="text-sm">
                    {isDbConnected 
                        ? "Connected to Supabase. Your application is attempting to sync data."
                        : "Not Connected. Please provide your Supabase Project URL and Anon Key to start."
                    }
                </div>
            </div>

            {/* Hardcoded Warning */}
            {isHardcoded && (
                <div className="p-4 rounded-lg mb-6 bg-blue-50 text-blue-800 flex items-center gap-3 border border-blue-100">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-medium">Using credentials hardcoded in <code>supabaseClient.ts</code>. Editing here is disabled.</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="form-label">Project URL</label>
                        <input 
                            required 
                            disabled={isHardcoded}
                            type="url" 
                            className={`form-input font-mono text-sm ${isHardcoded ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                            placeholder="https://your-project.supabase.co"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                        />
                    </div>
                    
                    <div className="col-span-2">
                        <label className="form-label">Anon Key (Public)</label>
                        <input 
                            required 
                            disabled={isHardcoded}
                            type="password" 
                            className={`form-input font-mono text-sm ${isHardcoded ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                            placeholder="eyJh..."
                            value={key}
                            onChange={e => setKey(e.target.value)}
                        />
                        {!isHardcoded && <p className="text-xs text-slate-400 mt-1">Found in Project Settings &gt; API</p>}
                    </div>
                </div>

                {/* Test Result */}
                {testStatus !== 'idle' && (
                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                        testStatus === 'testing' ? 'bg-blue-50 text-blue-700' :
                        testStatus === 'success' ? 'bg-green-50 text-green-700' :
                        'bg-red-50 text-red-700'
                    }`}>
                        {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {testStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                        {testStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                        {testMessage}
                    </div>
                )}

                <div className="pt-4 flex flex-wrap gap-3">
                    {!isHardcoded && (
                        <>
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm shadow-blue-200 disabled:bg-blue-400"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isDbConnected ? 'Update Connection' : 'Connect Database'}
                            </button>

                            <button 
                                type="button" 
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || !url || !key}
                                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all"
                            >
                                <Play className="w-4 h-4" />
                                Test Connection
                            </button>
                            
                            {isDbConnected && (
                                <button 
                                    type="button" 
                                    onClick={handleDisconnect}
                                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ml-auto"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Disconnect
                                </button>
                            )}
                        </>
                    )}
                </div>
            </form>
        </div>

        {/* Schema Helper */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
             <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Database Setup</h3>
                        <p className="text-sm text-slate-500">Run this SQL in Supabase to create tables</p>
                    </div>
                 </div>
                 <button 
                    onClick={() => setShowSchema(!showSchema)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                 >
                     {showSchema ? 'Hide Schema' : 'Show Schema'}
                 </button>
             </div>
             
             {showSchema && (
                 <div className="relative">
                     <div className="absolute top-2 right-2">
                         <button 
                            onClick={handleCopySchema}
                            className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
                            title="Copy to clipboard"
                         >
                             {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                         </button>
                     </div>
                     <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
                         {schemaSql}
                     </pre>
                     <p className="mt-4 text-sm text-slate-500">
                         Note: This is a simplified schema. For the full schema, check <code>src/db/schema.sql</code> in the codebase.
                     </p>
                 </div>
             )}
        </div>
    </div>
  );
};