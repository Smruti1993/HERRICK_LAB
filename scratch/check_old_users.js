import { createClient } from '@supabase/supabase-js';

const url = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(url, key);

async function main() {
  const { data: users, error } = await supabase.from('app_users').select('*');
  if (error) {
    console.error("Error reading old app_users:", error);
  } else {
    console.log("=== OLD DATABASE APP USERS ===");
    console.log(users);
  }
}

main().catch(console.error);
