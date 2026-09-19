/* ==========================================================================
   Wainwrights — service rates
   --------------------------------------------------------------------------
   The figures below are not confirmed yet, so `showPrices` is false and the
   site says "Free estimate" wherever a price would go. When Bryan confirms
   the numbers, put them in and set showPrices to true.

   These are "starting from" prices. The site says so everywhere it shows one,
   because a steep lot, poor access or thirty years of needle build-up can
   multiply the labour on a clearing job — and a published fixed price would
   commit Bryan to losing money on exactly those.
   ========================================================================== */
window.WAINWRIGHTS_RATES = {

  /* false = show "Free estimate" instead of any figure. */
  showPrices: false,

  currency: 'USD',
  symbol:   '$',

  /* Shown under every price on the public site. */
  disclaimer: 'Starting price. The real figure comes from the free on-site visit.',

  /* from  = the "starting from" figure, in whole dollars
     unit  = how it is charged, in Bryan's own words
     note  = optional line shown under the price                              */
  services: {
    repairs: {
      label: 'Handyman Repairs',
      from:  85,
      unit:  'per job',
      note:  'Small jobs grouped into one visit work out cheaper than separate call-outs.'
    },
    painting: {
      label: 'Interior & Exterior Painting',
      from:  250,
      unit:  'per job',
      note:  'Depends on area, prep needed and how many coats.'
    },
    defensible: {
      label: 'Defensible Space & Fire Clearing',
      from:  400,
      unit:  'per job',
      note:  'Priced by zone, so you can do all of it or start at the house and work out.'
    },
    yardwaste: {
      label: 'Yard Waste Removal',
      from:  150,
      unit:  'per job',
      note:  'Depends on volume and how close the truck can get.'
    },
    junk: {
      label: 'Junk & Debris Hauling',
      from:  175,
      unit:  'per load',
      /* Junk removal carries the extra because of what it involves — dump fees,
         weight, and items that need special handling. Shown separately rather
         than buried in the base price. */
      surcharge: {
        amount: 60,
        label:  'Disposal & handling fee',
        note:   'Covers the dump fees and the weight. Added per load.'
      },
      note: 'Single items cost less — ask.'
    },
    watch: {
      label: 'Property Watch & Upkeep',
      from:  120,
      unit:  'per visit',
      note:  'Set to suit the property. Monthly suits most second homes.'
    }
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
