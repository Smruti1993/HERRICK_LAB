import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- CONFIGURATION START ---
// FIXED: Hardcoded directly to your explicit, live production Supabase instance
const HARDCODED_URL = 'https://uehbrvyftfuuhfwkzxfx.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlaGJydnlmdGZ1dWhmd2t6eGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzgwMTcsImV4cCI6MjEwMTk1NDAxN30._MQu3-DkjEjdMQWzmN_poyRrAaqhLlQ08FjcqFeoCeM';
// --- CONFIGURATION END ---

const STORAGE_KEY_URL = 'medicore_sb_url';
const STORAGE_KEY_KEY = 'medicore_sb_key';

export const getStoredCredentials = () => {
  if (HARDCODED_URL && HARDCODED_KEY) {
    return { url: HARDCODED_URL, key: HARDCODED_KEY };
  }

  return {
    url: localStorage.getItem(STORAGE_KEY_URL) || '',
    key: localStorage.getItem(STORAGE_KEY_KEY) || ''
  };
};

const isValidUrl = (u: string) => {
    try { return !!new URL(u); } catch { return false; }
};

export const checkConfigured = () => {
    const { url, key } = getStoredCredentials();
    return !!(url && key && isValidUrl(url));
};

let client: SupabaseClient | null = null;

// Resolve backend URL dynamically from environment variables or fall back to localhost:5005
const resolvedEnvUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();
export const BACKEND_URL = resolvedEnvUrl 
    ? (resolvedEnvUrl.startsWith('http') ? resolvedEnvUrl : `https://${resolvedEnvUrl}`)
    : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5005'
        : 'https://his-web5-backend.onrender.com'); // ✅ FIXED: Points directly to your specific Render service web url

export const getAuthToken = async (): Promise<string> => {
    try {
        const localUser = localStorage.getItem('medicore_user');
        if (localUser) {
            const parsed = JSON.parse(localUser);
            return `demo-token:${parsed.username || 'admin'}:${parsed.role || 'Admin'}`;
        }
        return '';
    } catch (error) {
        console.error('Error fetching auth token:', error);
        return '';
    }
};

export const getSupabase = () => {
    if (client) return client;
    
    const { url, key } = getStoredCredentials();
    if (checkConfigured()) {
        client = createClient(url, key);
    } else {
        client = createClient('https://wbjtdhtvzlefzjvwhkui.supabase.co', HARDCODED_KEY);
    }
    return client;
};

export const resetSupabaseClient = () => {
    client = null;
};

export const saveCredentialsToStorage = (url: string, key: string) => {
  localStorage.setItem(STORAGE_KEY_URL, url);
  localStorage.setItem(STORAGE_KEY_KEY, key);
  resetSupabaseClient();
};

export const clearCredentialsFromStorage = () => {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    resetSupabaseClient();
};
