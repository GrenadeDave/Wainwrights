/* ==========================================================================
   Wainwright’s — service rates
   --------------------------------------------------------------------------
   Bryan's own figures, from the questionnaire he filled in (September 2026).
   He charges by the hour. Where he gave a range, the range is shown.

   Every price carries an asterisk, and the asterisk says "Prices negotiable" —
   his words. The written figure still comes from the free visit.
   ========================================================================== */
/* ⚠️ THE $1,000 LIMIT IS THE LAW, NOT A PREFERENCE.
   Bryan is not a licensed contractor. California Business & Professions Code
   §7027.2 lets him advertise only work whose TOTAL — labour, materials and
   everything else — comes to less than $1,000, and §7048 only exempts jobs
   that need no building permit. Hourly rates are fine; a job that would add up
   to $1,000 or more is not one he can take. Splitting a bigger job into
   smaller ones to stay under the line is illegal too.

   The tech services are not construction work, so the contractor rules do not
   apply to them.                                                            */
window.WAINWRIGHTS_RATES = {

  /* false = show "Free estimate" instead of any figure. */
  showPrices: true,

  currency: 'USD',
  symbol:   '$',

  /* Shown under every price on the public site, keyed to the asterisk. */
  disclaimer: '*Prices negotiable.',
  asterisk: '*',

  /* The smallest bill, whatever the job. */
  minimum: 30,

  /* Past this much driving, the time on the road is charged. */
  travel: { minutes: 25, perHour: 30 },

  /* from  = the rate, in whole dollars   to = top of the range, if he gave one
     unit  = how it is charged            note = optional line under the price  */
  services: {
    repairs: {
      label: 'Handyman Repairs',
      from:  30,
      to:    40,
      unit:  'per hour',
      note:  'Small jobs grouped into one visit work out cheaper than separate call-outs.'
    },
    painting: {
      label: 'Interior & Exterior Painting',
      from:  40,
      unit:  'per hour',
      note:  'Paint and materials are on top, and you see them in the written price.'
    },
    defensible: {
      label: 'Defensible Space & Fire Clearing',
      from:  35,
      to:    45,
      unit:  'per hour',
      note:  'Steeper, thicker or harder to reach sits at the top of the range.'
    },
    yardwaste: {
      label: 'Yard Waste Removal',
      from:  30,
      to:    40,
      unit:  'per hour',
      note:  'Depends on volume and how close the truck can get.'
    },
    junk: {
      /* Not offered until Bryan has a proper trailer. Shown as coming soon. */
      comingSoon: true,
      label: 'Junk & Debris Hauling',
      from:  35,
      to:    45,
      unit:  'per hour',
      /* Junk removal carries the extra because of the dump fees. Shown
         separately rather than buried in the rate. */
      surcharge: {
        amount: 20,
        label:  'Disposal fee',
        note:   'Covers the dump fees.'
      },
      note: 'Billed for the time it takes to load up and haul away.'
    },
    watch: {
      label: 'Property Watch & Upkeep',
      from:  30,
      unit:  'per hour',
      note:  'Set to suit the property. Monthly suits most second homes.'
    }
  },

  /* Side work: computers and software. Not construction, so none of the
     contractor limits above apply. */
  tech: {
    label: 'Tech Help',
    from:  50,
    unit:  'per hour'
  },

  /* "$35–45" or "$30". The dash is an en dash, as a range should be. */
  range: function (s) {
    var low = this.from(s.from);
    return s.to ? low + '\u2013' + Number(s.to).toLocaleString('en-US') : low;
  },

  /* "per hour" -> "/hr", for the tight spots like the home page tiles. */
  shortUnit: function (s) {
    return ({ 'per hour': '/hr', 'per job': '/job', 'per visit': '/visit', 'per load': '/load' })[s.unit] || '';
  },

  /* Format cents as money. The portal stores money as integer cents. */
  money: function (cents) {
    if (cents == null) return '—';
    return this.symbol + (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  },

  /* Format a "from" dollar figure. */
  from: function (dollars) {
    return this.symbol + Number(dollars).toLocaleString('en-US');
  }
};
