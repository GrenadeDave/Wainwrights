/* ==========================================================================
   Wainwrights — site configuration
   --------------------------------------------------------------------------
   This is the only file you need to edit to change how leads are delivered.
   Everything else on the site reads from here.
   ========================================================================== */
window.WAINWRIGHTS_CONFIG = {

  /* Business contact details — used for click-to-call and the email route. */
  phone:     '(209) 456-1846',
  phoneHref: 'tel:+12094561846',
  email:     'Bwain94Work@gmail.com',

  /* Business hours. Kept in step with workingDays and the slot times in
     assets/js/schedule.js — change one, check the other. */
  hours:     'Mon–Fri · 8:00am – 5:00pm',
  hoursNote: 'Closed weekends. Leave a message and Bryan will call back.',

  /* ------------------------------------------------------------------------
     HOW LEADS REACH BRYAN

     By default the estimate form opens the visitor's email app with the
     details filled in, and appends a small CSV block that MyDiD can import.
     That works anywhere, with no server and no running costs.

     MyDiD note: MyDiD has no server, no account and nothing on the internet —
     that is deliberate, not an omission. The website cannot POST leads into
     it, and should not try. The bridge is the CSV block in the email.
     See LINKING-TO-MYDID.md.
     ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------
     The customer portal's quote endpoint.

     Once the Supabase project is set up (see SETUP-PORTAL.md), paste the
     request-quote function URL here. The estimate form then creates a real
     job on Bryan's job board and texts + emails him, and the customer can
     sign in to follow it.

     Leave it empty and the form falls back to opening the visitor's email
     app, which works with no server at all.

     Example:
       leadEndpoint: 'https://abcdefghijklm.supabase.co/functions/v1/request-quote',
     ------------------------------------------------------------------------ */
  leadEndpoint: 'https://rctcibzmyusmkjbibdxa.supabase.co/functions/v1/request-quote',
  leadApiKey:   '',

  /* Where "Check on your job" in the footer points. */
  portalUrl: 'portal/login.html'
};
