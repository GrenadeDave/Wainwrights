/* ==========================================================================
   Wainwrights — customer portal connection
   --------------------------------------------------------------------------
   Fill these two in from your Supabase project:
       Dashboard → Project Settings → API

   Until they are filled in, the portal pages show a friendly "not set up yet"
   message instead of breaking, and the rest of the website is unaffected.

   See SETUP-PORTAL.md for the whole walkthrough.
   ========================================================================== */
window.WAINWRIGHTS_SUPABASE = {

  /* Looks like: https://abcdefghijklm.supabase.co */
  url: 'https://rctcibzmyusmkjbibdxa.supabase.co',

  /* The "anon" / "publishable" key — the long one starting sb_publishable_ or eyJ…

     This key is MEANT to be public; it ships in the page and anyone can read
     it. It is safe only because Row Level Security in supabase/schema.sql
     decides what it can actually reach.

     ⚠️ NEVER put the service_role / secret key here. That one bypasses every
     security policy, and in a web page it hands your whole database to anyone
     who opens View Source. It belongs only in the edge function's secrets. */
  anonKey: 'sb_publishable_E4JoMgqYFiquWZTEeD4Lyw_Htg1eLwq',

  /* Where the magic-link email should send people back to.
     Leave empty to use wherever the site is being served from, which is right
     almost always. Set it explicitly only if the emails need to point at a
     different domain than the one the visitor is on. */
  redirectTo: ''
};
