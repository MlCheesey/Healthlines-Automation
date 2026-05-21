export const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT || "davita";

export type ClientInvoiceProfile = {
  client_id: string;
  display_name: string;

  consignee_name?: string;
  consignee_city?: string;

  buyer_name?: string;
  buyer_city?: string;
  buyer_building_no?: string;
  buyer_district?: string;
  buyer_postal_code?: string;
  buyer_region?: string;
  buyer_country?: string;
  buyer_vat_no?: string;
  place_of_supply?: string;
  buyer_secondary_no?: string;

  payment_terms?: string;
};

export const CLIENT_PROFILES: Record<string, ClientInvoiceProfile> = {
  davita: {
    client_id: "davita",
    display_name: "Davita Care KSA",

    consignee_name: "Davita Care KSA",
    buyer_name: "Davita Care KSA",

    // These should come from Tally/client master later.
    consignee_city: "",
    buyer_city: "",
    buyer_building_no: "",
    buyer_district: "",
    buyer_postal_code: "",
    buyer_region: "",
    buyer_country: "Saudi Arabia",
    buyer_vat_no: "",
    place_of_supply: "Saudi Arabia",
    buyer_secondary_no: "",

    payment_terms: "",
  },
};

export function normalizeClientId(client?: string) {
  return (
    String(client || DEFAULT_CLIENT_ID)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || DEFAULT_CLIENT_ID
  );
}

export function getClientProfile(client?: string) {
  const clientId = normalizeClientId(client);

  return (
    CLIENT_PROFILES[clientId] ||
    CLIENT_PROFILES[DEFAULT_CLIENT_ID] ||
    CLIENT_PROFILES.davita
  );
}