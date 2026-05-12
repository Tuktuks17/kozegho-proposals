export type ProposalLanguage = 'PT' | 'ES' | 'FR' | 'EN'
export type DatasheetLanguage = 'PT' | 'GB' | 'FR' | 'ES' | 'DE'
export type ProductCategory =
  | 'Polymer Preparation' | 'Dilution Systems' | 'Mixers'
  | 'Chlorine Dioxide' | 'Controllers' | 'Metering Pumps' | 'Tanks'

export type VariantPrice = number | 'on_request'

export type ProductVariant = {
  id: string
  name: string
  price: VariantPrice
  priceNote?: string
}

export type ProductOption = {
  code: string
  label: string
  price: VariantPrice
}

export type ProductFamily = {
  id: string
  name: string
  series: string
  category: ProductCategory
  variants: ProductVariant[]
  options: ProductOption[]
  hasDatasheet: boolean
  datasheetLanguages: DatasheetLanguage[]
  note?: string
}
