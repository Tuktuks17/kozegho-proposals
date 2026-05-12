import type { ProposalLanguage } from '@/types/catalog'

export type DocumentLabels = {
  commercialProposal: string
  reference: string
  date: string
  validUntil: string
  client: string
  clientContact: string
  company: string
  country: string
  email: string
  subject: string
  introduction: string
  description: string
  quantity: string
  qtyShort: string
  unitPrice: string
  discount: string
  total: string
  subtotal: string
  lineTotal: string
  options: string
  termsAndConditions: string
  deliveryTime: string
  weeks: string
  packaging: string
  packagingStandard: string
  packagingOcean: string
  deliveryTerms: string
  paymentTerms: string
  warranty: string
  additionalNotes: string
  vatNote: string
  preparedBy: string
  defaultDeliveryTerms: string
  defaultPaymentTerms: string
  defaultWarranty: string
  fallbackIntroduction: string
}

export const PROPOSAL_LABELS: Record<ProposalLanguage, DocumentLabels> = {
  PT: {
    commercialProposal: 'Proposta Comercial',
    reference: 'Referência',
    date: 'Data',
    validUntil: 'Válida até',
    client: 'Cliente',
    clientContact: 'Contacto',
    company: 'Empresa',
    country: 'País',
    email: 'Email',
    subject: 'Assunto',
    introduction: 'Introdução',
    description: 'Descrição',
    quantity: 'Quantidade',
    qtyShort: 'Qtd.',
    unitPrice: 'Preço Unitário',
    discount: 'Desconto',
    total: 'Total',
    subtotal: 'Subtotal',
    lineTotal: 'Total da Linha',
    options: 'Opções',
    termsAndConditions: 'Termos e Condições',
    deliveryTime: 'Prazo de Entrega',
    weeks: 'semanas',
    packaging: 'Embalagem',
    packagingStandard: 'Embalagem Padrão',
    packagingOcean: 'Embalagem Marítima',
    deliveryTerms: 'Condições de Entrega',
    paymentTerms: 'Condições de Pagamento',
    warranty: 'Garantia',
    additionalNotes: 'Notas Adicionais',
    vatNote: 'Preços indicados sem IVA.',
    preparedBy: 'Elaborado por',
    defaultDeliveryTerms: 'DAP — Destino acordado com o cliente',
    defaultPaymentTerms: '30 dias após entrega',
    defaultWarranty: '24 meses',
    fallbackIntroduction: 'Na sequência do interesse manifestado, temos o prazer de vos apresentar a nossa proposta comercial para os produtos Kozegho indicados. A Kozegho é especialista em sistemas de preparação e doseamento para tratamento de águas e processos industriais, oferecendo equipamentos de elevada qualidade e fiabilidade. Ficamos ao vosso dispor para qualquer esclarecimento adicional.'
  },
  ES: {
    commercialProposal: 'Propuesta Comercial',
    reference: 'Referencia',
    date: 'Fecha',
    validUntil: 'Válida hasta',
    client: 'Cliente',
    clientContact: 'Contacto',
    company: 'Empresa',
    country: 'País',
    email: 'Email',
    subject: 'Asunto',
    introduction: 'Introducción',
    description: 'Descripción',
    quantity: 'Cantidad',
    qtyShort: 'Cant.',
    unitPrice: 'Precio Unitario',
    discount: 'Descuento',
    total: 'Total',
    subtotal: 'Subtotal',
    lineTotal: 'Total de Línea',
    options: 'Opciones',
    termsAndConditions: 'Términos y Condiciones',
    deliveryTime: 'Plazo de Entrega',
    weeks: 'semanas',
    packaging: 'Embalaje',
    packagingStandard: 'Embalaje Estándar',
    packagingOcean: 'Embalaje Marítimo',
    deliveryTerms: 'Condiciones de Entrega',
    paymentTerms: 'Condiciones de Pago',
    warranty: 'Garantía',
    additionalNotes: 'Notas Adicionales',
    vatNote: 'Precios indicados sin IVA.',
    preparedBy: 'Elaborado por',
    defaultDeliveryTerms: 'DAP — destino acordado con el cliente',
    defaultPaymentTerms: '30 días tras entrega',
    defaultWarranty: '24 meses',
    fallbackIntroduction: 'En respuesta a su interés, tenemos el placer de presentarles nuestra propuesta comercial para los productos Kozegho indicados. Kozegho es especialista en sistemas de preparación y dosificación para tratamiento de aguas y procesos industriales. Quedamos a su disposición para cualquier aclaración adicional.'
  },
  FR: {
    commercialProposal: 'Proposition Commerciale',
    reference: 'Référence',
    date: 'Date',
    validUntil: "Valable jusqu'au",
    client: 'Client',
    clientContact: 'Contact',
    company: 'Société',
    country: 'Pays',
    email: 'Email',
    subject: 'Objet',
    introduction: 'Introduction',
    description: 'Description',
    quantity: 'Quantité',
    qtyShort: 'Qté.',
    unitPrice: 'Prix Unitaire',
    discount: 'Remise',
    total: 'Total',
    subtotal: 'Sous-total',
    lineTotal: 'Total Ligne',
    options: 'Options',
    termsAndConditions: 'Termes et Conditions',
    deliveryTime: 'Délai de Livraison',
    weeks: 'semaines',
    packaging: 'Emballage',
    packagingStandard: 'Emballage Standard',
    packagingOcean: 'Emballage Maritime',
    deliveryTerms: 'Conditions de Livraison',
    paymentTerms: 'Conditions de Paiement',
    warranty: 'Garantie',
    additionalNotes: 'Notes Complémentaires',
    vatNote: 'Prix indiqués hors TVA.',
    preparedBy: 'Établi par',
    defaultDeliveryTerms: 'DAP — destination convenue avec le client',
    defaultPaymentTerms: '30 jours après livraison',
    defaultWarranty: '24 mois',
    fallbackIntroduction: "Suite à votre intérêt, nous avons le plaisir de vous soumettre notre proposition commerciale pour les produits Kozegho indiqués. Kozegho est spécialiste des systèmes de préparation et de dosage pour le traitement de l'eau et les procédés industriels. Nous restons à votre disposition pour tout renseignement complémentaire."
  },
  EN: {
    commercialProposal: 'Commercial Proposal',
    reference: 'Reference',
    date: 'Date',
    validUntil: 'Valid Until',
    client: 'Client',
    clientContact: 'Contact',
    company: 'Company',
    country: 'Country',
    email: 'Email',
    subject: 'Subject',
    introduction: 'Introduction',
    description: 'Description',
    quantity: 'Quantity',
    qtyShort: 'Qty.',
    unitPrice: 'Unit Price',
    discount: 'Discount',
    total: 'Total',
    subtotal: 'Subtotal',
    lineTotal: 'Line Total',
    options: 'Options',
    termsAndConditions: 'Terms and Conditions',
    deliveryTime: 'Delivery Time',
    weeks: 'weeks',
    packaging: 'Packaging',
    packagingStandard: 'Standard Packaging',
    packagingOcean: 'Ocean Freight Packaging',
    deliveryTerms: 'Delivery Terms',
    paymentTerms: 'Payment Terms',
    warranty: 'Warranty',
    additionalNotes: 'Additional Notes',
    vatNote: 'All prices are exclusive of VAT.',
    preparedBy: 'Prepared by',
    defaultDeliveryTerms: 'DAP — agreed destination with client',
    defaultPaymentTerms: '30 days after delivery',
    defaultWarranty: '24 months',
    fallbackIntroduction: 'Following your interest in our products, we are pleased to present our commercial proposal for the Kozegho products indicated herein. Kozegho specialises in preparation and dosing systems for water treatment and industrial processes, offering high-quality and reliable equipment. We remain at your disposal for any further information.'
  }
}
