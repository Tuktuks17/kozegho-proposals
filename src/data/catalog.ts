import type { ProductFamily, DatasheetLanguage } from '@/types/catalog'

const ALL: DatasheetLanguage[] = ['PT', 'GB', 'FR', 'ES', 'DE']
const VERIFY = 'Pricing to verify against master pricelist'

export const CATALOG: ProductFamily[] = [
  // ── POLYMER PREPARATION ──────────────────────────────────────────────────
  {
    id: 'CS', name: 'Powder Polymer Preparation Systems', series: 'CS Series',
    category: 'Polymer Preparation', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'CS_600',  name: 'CS 600',  price: 12590 },
      { id: 'CS_1100', name: 'CS 1100', price: 12940 },
      { id: 'CS_1500', name: 'CS 1500', price: 13750 },
      { id: 'CS_1900', name: 'CS 1900', price: 15480 },
      { id: 'CS_3000', name: 'CS 3000', price: 17680 },
      { id: 'CS_4200', name: 'CS 4200', price: 19760 },
      { id: 'CS_5600', name: 'CS 5600', price: 21260 },
      { id: 'CS_9000', name: 'CS 9000', price: 28880 }
    ],
    options: [
      { code: 'CS_POWER_400V',  label: 'Power supply 400VAC / 3ph',       price: 1000 },
      { code: 'CS_DRAIN',       label: 'Drainage and discharge pipe',     price: 410  },
      { code: 'CS_AGIT_3_S',    label: '3rd agitator Ø200/350/500 mm',    price: 1580 },
      { code: 'CS_AGIT_3_L',    label: '3rd agitator Ø550 mm',            price: 2490 },
      { code: 'CS_HOPPER_100',  label: 'Hopper 100 L',                    price: 810  },
      { code: 'CS_HOPPER_200',  label: 'Hopper 200 L',                    price: 1110 },
      { code: 'CS_PROFIBUS',    label: 'Profibus',                        price: 1630 }
    ]
  },
  {
    id: 'CL_D', name: 'Emulsion Polymer Preparation Systems', series: 'CL-D Series',
    category: 'Polymer Preparation', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'CL_D_600',  name: 'CL-D 600',  price: 11500 },
      { id: 'CL_D_1100', name: 'CL-D 1100', price: 12020 },
      { id: 'CL_D_1500', name: 'CL-D 1500', price: 13060 },
      { id: 'CL_D_1900', name: 'CL-D 1900', price: 14670 },
      { id: 'CL_D_3000', name: 'CL-D 3000', price: 17390 },
      { id: 'CL_D_4200', name: 'CL-D 4200', price: 23730 }
    ],
    options: [
      { code: 'CLD_POWER_400V', label: 'Power supply 400VAC / 3ph',   price: 1000 },
      { code: 'CLD_DRAIN',      label: 'Drainage and discharge pipe', price: 410  },
      { code: 'CLD_AGIT_2_S',   label: '2nd agitator Ø200/350/500 mm', price: 1580 },
      { code: 'CLD_AGIT_2_L',   label: '2nd agitator Ø550 mm',         price: 2490 },
      { code: 'CLD_PROFIBUS',   label: 'Profibus',                     price: 1630 }
    ]
  },
  {
    id: 'CSL', name: 'Powder / Emulsion Polymer Preparation Systems', series: 'CSL Series',
    category: 'Polymer Preparation', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'CSL_600',  name: 'CSL 600',  price: 15250 },
      { id: 'CSL_1100', name: 'CSL 1100', price: 15770 },
      { id: 'CSL_1500', name: 'CSL 1500', price: 16520 },
      { id: 'CSL_1900', name: 'CSL 1900', price: 18720 },
      { id: 'CSL_3000', name: 'CSL 3000', price: 21270 },
      { id: 'CSL_4200', name: 'CSL 4200', price: 23800 },
      { id: 'CSL_5600', name: 'CSL 5600', price: 24840 }
    ],
    options: [
      { code: 'CSL_POWER_400V', label: 'Power supply 400VAC / 3ph',       price: 1000 },
      { code: 'CSL_DRAIN',      label: 'Drainage and discharge pipe',     price: 410  },
      { code: 'CSL_AGIT_3_S',   label: '3rd agitator Ø200/350/500 mm',    price: 1580 },
      { code: 'CSL_AGIT_3_L',   label: '3rd agitator Ø550 mm',            price: 2490 },
      { code: 'CSL_HOPPER_100', label: 'Hopper 100 L',                    price: 810  },
      { code: 'CSL_HOPPER_200', label: 'Hopper 200 L',                    price: 1110 },
      { code: 'CSL_PROFIBUS',   label: 'Profibus',                        price: 1580 }
    ]
  },
  {
    id: 'PD', name: 'In Line Dilution Panels', series: 'PD Series',
    category: 'Polymer Preparation', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'PD_2000',  name: 'PD 2000',  price: 1910 },
      { id: 'PD_4000',  name: 'PD 4000',  price: 2030 },
      { id: 'PD_5000',  name: 'PD 5000',  price: 2030 },
      { id: 'PD_12000', name: 'PD 12000', price: 2080 }
    ],
    options: [{ code: 'PD_KIT_SOLENOID', label: 'Repair kit incl. solenoid coil', price: 180 }]
  },
  // ── DILUTION SYSTEMS ─────────────────────────────────────────────────────
  {
    id: 'BS', name: 'Powder Dilution Systems', series: 'BS Series',
    category: 'Dilution Systems', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'BS_300',  name: 'BS 300',  price: 7560 },
      { id: 'BS_600',  name: 'BS 600',  price: 7560 },
      { id: 'BS_1000', name: 'BS 1000', price: 7970 },
      { id: 'BS_1500', name: 'BS 1500', price: 8670 },
      { id: 'BS_2000', name: 'BS 2000', price: 9350 }
    ],
    options: [
      { code: 'BS_POWER_400V',  label: 'Power supply 400VAC / 3ph', price: 1000 },
      { code: 'BS_DOUBLE_DECK', label: 'Double deck',               price: 210  },
      { code: 'BS_POWDER_LVL',  label: 'Powder sensor level',       price: 410  },
      { code: 'BS_HEATING',     label: 'Heating element',           price: 1000 },
      { code: 'BS_HOPPER_100',  label: 'Hopper 100 L',              price: 810  },
      { code: 'BS_HOPPER_200',  label: 'Hopper 200 L',              price: 1110 }
    ]
  },
  {
    id: 'BL', name: 'Liquid Dilution Systems', series: 'BL Series',
    category: 'Dilution Systems', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'BL_300',  name: 'BL 300',  price: 6880 },
      { id: 'BL_600',  name: 'BL 600',  price: 7300 },
      { id: 'BL_1000', name: 'BL 1000', price: 7740 },
      { id: 'BL_1500', name: 'BL 1500', price: 8380 },
      { id: 'BL_2000', name: 'BL 2000', price: 8900 }
    ],
    options: [
      { code: 'BL_POWER_400V',  label: 'Power supply 400VAC / 3ph', price: 1000 },
      { code: 'BL_DOUBLE_DECK', label: 'Double deck',               price: 210  },
      { code: 'BL_PULSE_FLOW',  label: 'Pulse flowmeter',           price: 370  }
    ]
  },
  // ── MIXERS ───────────────────────────────────────────────────────────────
  {
    id: 'AMR_S', name: 'Fast Mixers (Single Phase)', series: 'AMR-S Series',
    category: 'Mixers', hasDatasheet: true, datasheetLanguages: ALL,
    note: 'Inox version available on request',
    variants: [
      { id: 'AMR_S_1260',  name: 'AMR-S 1260',  price: 620 },
      { id: 'AMR_S_1280',  name: 'AMR-S 1280',  price: 630 },
      { id: 'AMR_S_14100', name: 'AMR-S 14100', price: 810 },
      { id: 'AMR_S_14120', name: 'AMR-S 14120', price: 810 },
      { id: 'AMR_S_16120', name: 'AMR-S 16120', price: 830 },
      { id: 'AMR_S_16140', name: 'AMR-S 16140', price: 910 }
    ],
    options: []
  },
  {
    id: 'AMR_T', name: 'Fast Mixers (Three Phase)', series: 'AMR-T Series',
    category: 'Mixers', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'AMR_T_1260_PP',    name: 'AMR-T 1260',  price: 600,          priceNote: 'PP' },
      { id: 'AMR_T_1260_INOX',  name: 'AMR-T 1260',  price: 850,          priceNote: 'Inox' },
      { id: 'AMR_T_1280_PP',    name: 'AMR-T 1280',  price: 620,          priceNote: 'PP' },
      { id: 'AMR_T_1280_INOX',  name: 'AMR-T 1280',  price: 870,          priceNote: 'Inox' },
      { id: 'AMR_T_14100_PP',   name: 'AMR-T 14100', price: 770,          priceNote: 'PP' },
      { id: 'AMR_T_14100_INOX', name: 'AMR-T 14100', price: 970,          priceNote: 'Inox' },
      { id: 'AMR_T_14120_PP',   name: 'AMR-T 14120', price: 800,          priceNote: 'PP' },
      { id: 'AMR_T_14120_INOX', name: 'AMR-T 14120', price: 1010,         priceNote: 'Inox' },
      { id: 'AMR_T_16120_PP',   name: 'AMR-T 16120', price: 810,          priceNote: 'PP' },
      { id: 'AMR_T_16120_INOX', name: 'AMR-T 16120', price: 'on_request', priceNote: 'Inox' },
      { id: 'AMR_T_16140_PP',   name: 'AMR-T 16140', price: 910,          priceNote: 'PP' },
      { id: 'AMR_T_16140_INOX', name: 'AMR-T 16140', price: 'on_request', priceNote: 'Inox' }
    ],
    options: []
  },
  {
    id: 'APL', name: 'Slow Mixers', series: 'APL Series',
    category: 'Mixers', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'APL_200', name: 'APL 200', price: 1330 },
      { id: 'APL_350', name: 'APL 350', price: 1450 },
      { id: 'APL_500', name: 'APL 500', price: 1620 },
      { id: 'APL_550', name: 'APL 550', price: 2720 },
      { id: 'APL_700', name: 'APL 700', price: 3240 }
    ],
    options: []
  },
  {
    id: 'ATL', name: 'High Efficiency Mixers', series: 'ATL Series',
    category: 'Mixers', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'ATL_600',  name: 'ATL 600',  price: 2720 },
      { id: 'ATL_850',  name: 'ATL 850',  price: 2830 },
      { id: 'ATL_1000', name: 'ATL 1000', price: 6420 },
      { id: 'ATL_1200', name: 'ATL 1200', price: 7450 },
      { id: 'ATL_1400', name: 'ATL 1400', price: 8550 },
      { id: 'ATL_1800', name: 'ATL 1800', price: 9820 }
    ],
    options: []
  },
  {
    id: 'AFL', name: 'Flocculation Mixers', series: 'AFL Series',
    category: 'Mixers', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'AFL_500',  name: 'AFL 500',  price: 1970 },
      { id: 'AFL_600',  name: 'AFL 600',  price: 2830 },
      { id: 'AFL_800',  name: 'AFL 800',  price: 3070 },
      { id: 'AFL_1000', name: 'AFL 1000', price: 4160 },
      { id: 'AFL_1200', name: 'AFL 1200', price: 5720 },
      { id: 'AFL_1400', name: 'AFL 1400', price: 6240 },
      { id: 'AFL_1600', name: 'AFL 1600', price: 6990 },
      { id: 'AFL_2000', name: 'AFL 2000', price: 9010 }
    ],
    options: []
  },
  // ── CHLORINE DIOXIDE ─────────────────────────────────────────────────────
  {
    id: 'KDC', name: 'Chlorine Dioxide Generation Systems (DICLOX)', series: 'KDC Series',
    category: 'Chlorine Dioxide', hasDatasheet: true, datasheetLanguages: ALL,
    variants: [
      { id: 'KDC_80',  name: 'KDC 80',  price: 6620 },
      { id: 'KDC_160', name: 'KDC 160', price: 6620 },
      { id: 'KDC_360', name: 'KDC 360', price: 6620 },
      { id: 'KDC_480', name: 'KDC 480', price: 7630 },
      { id: 'KDC_680', name: 'KDC 680', price: 8090 }
    ],
    options: [
      { code: 'KDC_PH_MEAS',   label: 'pH measurement',   price: 690  },
      { code: 'KDC_CLO2_MEAS', label: 'ClO2 measurement', price: 1220 },
      { code: 'KDC_BOOSTER',   label: 'Booster pump',     price: 1280 },
      { code: 'KDC_PEDESTAL',  label: 'Pedestal',         price: 210  }
    ]
  },
  // ── CONTROLLERS ──────────────────────────────────────────────────────────
  {
    id: 'KSENSE', name: 'Water Quality Controllers', series: 'Ksense Series',
    category: 'Controllers', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'KSENSE_PH',       name: 'Ksense pH',              price: 1350 },
      { id: 'KSENSE_ORP',      name: 'Ksense ORP',             price: 1450 },
      { id: 'KSENSE_COND',     name: 'Ksense Conductivity',    price: 1600 },
      { id: 'KSENSE_CL_FREE',  name: 'Ksense Free Chlorine',   price: 1950 },
      { id: 'KSENSE_CL_TOTAL', name: 'Ksense Total Chlorine',  price: 2100 },
      { id: 'KSENSE_PH_ORP',   name: 'Ksense pH + ORP (dual)', price: 2250 },
      { id: 'KSENSE_MULTI',    name: 'Ksense Multi-Parameter', price: 2750 }
    ],
    options: []
  },
  // ── METERING PUMPS ───────────────────────────────────────────────────────
  {
    id: 'CNP', name: 'Solenoid Metering Pumps (Entry)', series: 'CNP Series',
    category: 'Metering Pumps', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'CNP_2_5',  name: 'CNP 2/5',  price: 410 },
      { id: 'CNP_5_5',  name: 'CNP 5/5',  price: 410 },
      { id: 'CNP_5_7',  name: 'CNP 5/7',  price: 410 },
      { id: 'CNP_10_5', name: 'CNP 10/5', price: 410 },
      { id: 'CNP_10_7', name: 'CNP 10/7', price: 410 },
      { id: 'CNP_15_4', name: 'CNP 15/4', price: 410 }
    ],
    options: []
  },
  {
    id: 'BETA_4', name: 'Beta 4 Solenoid Metering Pumps', series: 'Beta 4 Series',
    category: 'Metering Pumps', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'BETA_4_0220', name: 'Beta 4 0220', price: 920 },
      { id: 'BETA_4_0420', name: 'Beta 4 0420', price: 925 },
      { id: 'BETA_4_0708', name: 'Beta 4 0708', price: 935 },
      { id: 'BETA_4_1004', name: 'Beta 4 1004', price: 945 },
      { id: 'BETA_4_1602', name: 'Beta 4 1602', price: 950 },
      { id: 'BETA_4_0232', name: 'Beta 4 0232', price: 955 },
      { id: 'BETA_4_0440', name: 'Beta 4 0440', price: 960 }
    ],
    options: []
  },
  {
    id: 'BETA_5', name: 'Beta 5 Solenoid Metering Pumps', series: 'Beta 5 Series',
    category: 'Metering Pumps', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'BETA_5_0708', name: 'Beta 5 0708', price: 1280 },
      { id: 'BETA_5_1004', name: 'Beta 5 1004', price: 1380 },
      { id: 'BETA_5_1602', name: 'Beta 5 1602', price: 1470 },
      { id: 'BETA_5_0232', name: 'Beta 5 0232', price: 1570 }
    ],
    options: []
  },
  {
    id: 'GAMMA_X', name: 'Gamma X Solenoid Metering Pumps', series: 'Gamma X Series',
    category: 'Metering Pumps', hasDatasheet: false, datasheetLanguages: [], note: VERIFY,
    variants: [
      { id: 'GAMMA_X_0708', name: 'Gamma X 0708', price: 1180 },
      { id: 'GAMMA_X_1004', name: 'Gamma X 1004', price: 1260 },
      { id: 'GAMMA_X_1602', name: 'Gamma X 1602', price: 1340 },
      { id: 'GAMMA_X_0232', name: 'Gamma X 0232', price: 1420 },
      { id: 'GAMMA_X_0440', name: 'Gamma X 0440', price: 1500 },
      { id: 'GAMMA_X_0730', name: 'Gamma X 0730', price: 1600 },
      { id: 'GAMMA_X_1020', name: 'Gamma X 1020', price: 1700 },
      { id: 'GAMMA_X_1612', name: 'Gamma X 1612', price: 1800 },
      { id: 'GAMMA_X_2508', name: 'Gamma X 2508', price: 1880 }
    ],
    options: []
  },
  {
    id: 'VAM', name: 'VAM Motor-driven Metering Pumps', series: 'VAM Series',
    category: 'Metering Pumps', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'VAM_20_PP',   name: 'VAM 20', price: 1130, priceNote: 'PP'   },
      { id: 'VAM_20_PVC',  name: 'VAM 20', price: 1170, priceNote: 'PVC'  },
      { id: 'VAM_20_PVDF', name: 'VAM 20', price: 1230, priceNote: 'PVDF' },
      { id: 'VAM_50_PP',   name: 'VAM 50', price: 1220, priceNote: 'PP'   },
      { id: 'VAM_50_PVC',  name: 'VAM 50', price: 1270, priceNote: 'PVC'  },
      { id: 'VAM_50_PVDF', name: 'VAM 50', price: 1320, priceNote: 'PVDF' }
    ],
    options: []
  },
  {
    id: 'SIGMA', name: 'Sigma Diaphragm Metering Pumps', series: 'Sigma Series',
    category: 'Metering Pumps', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'S1_BA', name: 'S1Ba', price: 1810 },
      { id: 'S1_CB', name: 'S1Cb', price: 2250 },
      { id: 'S2_BA', name: 'S2Ba', price: 2950 },
      { id: 'S2_CB', name: 'S2Cb', price: 3650 },
      { id: 'S3_BA', name: 'S3Ba', price: 4650 },
      { id: 'S3_CB', name: 'S3Cb', price: 5680 }
    ],
    options: []
  },
  // ── TANKS ────────────────────────────────────────────────────────────────
  {
    id: 'TCP', name: 'Cylindrical Polyethylene Tanks', series: 'TCP Series',
    category: 'Tanks', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'TCP_100',   name: 'TCP 100',   price: 1100  },
      { id: 'TCP_250',   name: 'TCP 250',   price: 1400  },
      { id: 'TCP_500',   name: 'TCP 500',   price: 1800  },
      { id: 'TCP_750',   name: 'TCP 750',   price: 2300  },
      { id: 'TCP_1000',  name: 'TCP 1000',  price: 2900  },
      { id: 'TCP_1500',  name: 'TCP 1500',  price: 3700  },
      { id: 'TCP_2000',  name: 'TCP 2000',  price: 4600  },
      { id: 'TCP_3000',  name: 'TCP 3000',  price: 5800  },
      { id: 'TCP_5000',  name: 'TCP 5000',  price: 8800  },
      { id: 'TCP_10000', name: 'TCP 10000', price: 13000 },
      { id: 'TCP_15000', name: 'TCP 15000', price: 17400 },
      { id: 'TCP_25000', name: 'TCP 25000', price: 20510 }
    ],
    options: []
  },
  {
    id: 'TCI', name: 'Cylindrical Insulated Tanks', series: 'TCI Series',
    category: 'Tanks', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'TCI_250',   name: 'TCI 250',   price: 1390  },
      { id: 'TCI_500',   name: 'TCI 500',   price: 1900  },
      { id: 'TCI_1000',  name: 'TCI 1000',  price: 2800  },
      { id: 'TCI_2000',  name: 'TCI 2000',  price: 4900  },
      { id: 'TCI_5000',  name: 'TCI 5000',  price: 8100  },
      { id: 'TCI_10000', name: 'TCI 10000', price: 12000 },
      { id: 'TCI_15000', name: 'TCI 15000', price: 13460 }
    ],
    options: []
  },
  {
    id: 'TCC', name: 'Conical Bottom Tanks', series: 'TCC Series',
    category: 'Tanks', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'TCC_100',  name: 'TCC 100',  price: 1250 },
      { id: 'TCC_250',  name: 'TCC 250',  price: 1750 },
      { id: 'TCC_500',  name: 'TCC 500',  price: 2400 },
      { id: 'TCC_1000', name: 'TCC 1000', price: 3400 },
      { id: 'TCC_2000', name: 'TCC 2000', price: 4700 },
      { id: 'TCC_5000', name: 'TCC 5000', price: 6980 }
    ],
    options: []
  },
  {
    id: 'TPP', name: 'Parallelepiped Polyethylene Tanks', series: 'TPP Series',
    category: 'Tanks', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'TPP_50',   name: 'TPP 50',   price: 370  },
      { id: 'TPP_100',  name: 'TPP 100',  price: 540  },
      { id: 'TPP_200',  name: 'TPP 200',  price: 780  },
      { id: 'TPP_500',  name: 'TPP 500',  price: 1550 },
      { id: 'TPP_1000', name: 'TPP 1000', price: 3050 },
      { id: 'TPP_1500', name: 'TPP 1500', price: 4050 }
    ],
    options: []
  },
  {
    id: 'DEP', name: 'Retention / Drip Pans', series: 'DEP Series',
    category: 'Tanks', hasDatasheet: true, datasheetLanguages: ALL, note: VERIFY,
    variants: [
      { id: 'DEP_S',  name: 'DEP S',  price: 120 },
      { id: 'DEP_M',  name: 'DEP M',  price: 260 },
      { id: 'DEP_L',  name: 'DEP L',  price: 430 },
      { id: 'DEP_XL', name: 'DEP XL', price: 620 }
    ],
    options: []
  }
]

export function findFamily(id: string) {
  return CATALOG.find((f) => f.id === id)
}

export function findVariant(familyId: string, variantId: string) {
  const family = findFamily(familyId)
  if (!family) return undefined
  const variant = family.variants.find((v) => v.id === variantId)
  if (!variant) return undefined
  return { family, variant }
}

export function searchCatalog(query: string): ProductFamily[] {
  const q = query.trim().toLowerCase()
  if (!q) return CATALOG
  return CATALOG.map((family) => {
    const nameHit = family.name.toLowerCase().includes(q) || family.series.toLowerCase().includes(q)
    const variants = family.variants.filter((v) => v.name.toLowerCase().includes(q) || v.id.toLowerCase().includes(q))
    if (nameHit) return family
    if (variants.length > 0) return { ...family, variants }
    return null
  }).filter((x): x is ProductFamily => x !== null)
}

export const CATEGORY_ORDER: Array<ProductFamily['category']> = [
  'Polymer Preparation', 'Dilution Systems', 'Mixers',
  'Chlorine Dioxide', 'Controllers', 'Metering Pumps', 'Tanks'
]

export function groupByCategory(families = CATALOG) {
  const grouped = {} as Record<ProductFamily['category'], ProductFamily[]>
  for (const cat of CATEGORY_ORDER) grouped[cat] = []
  for (const f of families) grouped[f.category].push(f)
  return grouped
}
