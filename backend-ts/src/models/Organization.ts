/**
 * Organization Model - Enhanced with msp_id for Fabric integration
 */
export interface Organization {
  id: string;
  name: string;
  msp_id: string;
  domain: string;
  ca_url?: string;
  ca_name?: string;
  ca_cert?: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Organization creation input
 */
export interface CreateOrganizationInput {
  name: string;
  msp_id: string;
  domain: string;
  ca_url?: string;
  description?: string;
  is_active?: boolean;
}

/**
 * Organization update input
 */
export interface UpdateOrganizationInput {
  name?: string;
  domain?: string;
  ca_url?: string;
  description?: string;
  is_active?: boolean;
}
