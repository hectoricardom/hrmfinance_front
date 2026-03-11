export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  fax?: string;
}

// Updated Consignee interface to match actual API schema
export interface Consignee {
  id: string;
  consigneeId: string;
  ssg_consignee_key: string;
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  lastName2?: string;
  passport?: string;
  cid: string;
  nacionality: string;
  phoneNumber: string;
  altPhoneNumber?: string;
  ybstreet: string;
  ybstreetNo: string;
  ybbetwen1?: string;
  ybbetwen2?: string;
  ybreparto?: string;
  ybapt?: string;
  ybcity: string;
  ybestate: string;
  email?: string;
  comment?: string;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shipper {
  id: string;
  name: string;
  companyName?: string;
  address: Address;
  contact: ContactInfo;
  taxId?: string;
  licenseNumber?: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expirationDate: string;
  };
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  businessId: string;
}

export interface CreateConsigneeInput {
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  lastName2?: string;
  passport?: string;
  cid: string;
  nacionality: string;
  phoneNumber: string;
  altPhoneNumber?: string;
  ybstreet: string;
  ybstreetNo: string;
  ybbetwen1?: string;
  ybbetwen2?: string;
  ybreparto?: string;
  ybapt?: string;
  ybcity: string;
  ybestate: string;
  email?: string;
  comment?: string;
  businessId?: string;
}

export interface CreateShipperInput {
  name: string;
  companyName?: string;
  address: Address;
  contact: ContactInfo;
  taxId?: string;
  licenseNumber?: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expirationDate: string;
  };
  notes?: string;
  isActive?: boolean;
}

export interface UpdateConsigneeInput extends Partial<CreateConsigneeInput> {}
export interface UpdateShipperInput extends Partial<CreateShipperInput> {}

// Form validation errors
export interface ValidationErrors {
  [key: string]: string | ValidationErrors;
}