export const PRODUCT_CATEGORIES = [
  'Inverter Veichi',
  'Inverter Other',
  'Motor',
  'Pump',
  'Part',
  'MDB/DB',
  'Solar Roof',
  'Solar Pump',
  'Other'
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

