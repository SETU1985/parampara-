/* Cloud backup settings — fill these two after creating your Supabase project (SETUP-CLOUD.md).
   Both values are PUBLIC by design (the database rules protect your data). NEVER put the
   "service_role" key here. Leave empty to keep cloud backup off. */
window.CLOUD_CONFIG = {
  url: '',      // e.g. 'https://abcdefghijkl.supabase.co'
  anonKey: ''   // the "anon public" key (starts with eyJ...)
};
