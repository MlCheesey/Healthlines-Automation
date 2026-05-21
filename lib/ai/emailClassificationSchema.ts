export const EMAIL_TYPES = [
  "Quarterly PO",
  "Additional PO",
  "Delivery Instruction",
  "Delivery Date Query",
  "Delivery Reminder",
  "Partial Stock Reminder",
  "MRN",
  "Invoice Issue",
  "Query / Discrepancy",
  "Other",
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number];

export type ClassifiedEmail = {
  email_type: EmailType;
  confidence: number;
  client?: string;
  location?: string;
  po_number?: string;
  po_numbers?: string[];
  dn_numbers?: string[];
  mrn_numbers?: string[];
  delivery_dates?: string[];
  items?: {
    item_code?: string;
    item_name: string;
    quantity: number;
    unit?: string;
    delivery_date?: string;
  }[];
  locations?: {
    location: string;
    delivery_date?: string;
    items: {
      item_code?: string;
      item_name: string;
      quantity: number;
      unit?: string;
      delivery_date?: string;
    }[];
  }[];
  urgency?: "Low" | "Medium" | "High";
  human_required: boolean;
  recommended_action: string;
  notes?: string;
};

export function normalizeClassification(input: any): ClassifiedEmail {
  const emailType = EMAIL_TYPES.includes(input?.email_type)
    ? input.email_type
    : "Other";

  const confidence = Number(input?.confidence || 0);

  return {
    email_type: emailType,
    confidence: Math.max(0, Math.min(1, confidence)),
    client: input?.client || "",
    location: input?.location || "",
    po_number: input?.po_number || "",
    po_numbers: Array.isArray(input?.po_numbers) ? input.po_numbers : [],
    dn_numbers: Array.isArray(input?.dn_numbers) ? input.dn_numbers : [],
    mrn_numbers: Array.isArray(input?.mrn_numbers) ? input.mrn_numbers : [],
    delivery_dates: Array.isArray(input?.delivery_dates)
      ? input.delivery_dates
      : [],
    items: Array.isArray(input?.items) ? input.items : [],
    locations: Array.isArray(input?.locations) ? input.locations : [],
    urgency: ["Low", "Medium", "High"].includes(input?.urgency)
      ? input.urgency
      : "Medium",
    human_required:
      typeof input?.human_required === "boolean"
        ? input.human_required
        : confidence < 0.8,
    recommended_action:
      input?.recommended_action || "Review email manually",
    notes: input?.notes || "",
  };
}