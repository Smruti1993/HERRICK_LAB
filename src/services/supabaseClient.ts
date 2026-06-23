import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- CONFIGURATION START ---
// Paste your Supabase credentials here if you want to hardcode them.
// If these are empty, the app will look for credentials in LocalStorage (set via the Connection page).
const HARDCODED_URL = 'https://wbjtdhtvzlefzjvwhkui.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';
// --- CONFIGURATION END ---

const STORAGE_KEY_URL = 'medicore_sb_url';
const STORAGE_KEY_KEY = 'medicore_sb_key';

export const getStoredCredentials = () => {
  // 1. Priority: Hardcoded credentials in this file
  if (HARDCODED_URL && HARDCODED_KEY) {
    return { url: HARDCODED_URL, key: HARDCODED_KEY };
  }

  // 2. Fallback: LocalStorage credentials (set via UI)
  return {
    url: localStorage.getItem(STORAGE_KEY_URL) || '',
    key: localStorage.getItem(STORAGE_KEY_KEY) || ''
  };
};

const isValidUrl = (u: string) => {
    try { return !!new URL(u); } catch { return false; }
};

// Helper to check config status
export const checkConfigured = () => {
    const { url, key } = getStoredCredentials();
    return !!(url && key && isValidUrl(url));
};

// Singleton instance
let client: SupabaseClient | null = null;

export const getSupabase = () => {
    if (client) return client;
    
    const { url, key } = getStoredCredentials();
    if (checkConfigured()) {
        client = createClient(url, key);
    } else {
        // Fallback client that allows the app to load but will fail requests
        // This prevents the app from crashing immediately on load
        client = createClient('https://setup-required.supabase.co', 'placeholder');
    }
    return client;
};

// Reset the client (used when credentials change)
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