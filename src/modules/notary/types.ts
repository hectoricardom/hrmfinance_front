// Types for Notary Customer data structure

export interface PlaceOfBirth {
  city?: string;
  state?: string;
  country?: string;
}

export interface DateRange {
  month?: string;
  year?: string;
}

export interface Residence {
  country?: string;
  zipcode?: string;
  city?: string;
  state?: string;
  addressLineOne?: string;
  addressLineTwo?: string;
  fromDate?: DateRange;
  toDate?: DateRange;
  clientNotaryId?: string;
}

export interface School {
  country?: string;
  zipcode?: string;
  state?: string;
  city?: string;
  schoolName?: string;
  schoolType?: string;
  fromDate?: DateRange;
  toDate?: DateRange;
}

export interface Employer {
  country?: string;
  employerName?: string;
  occupation?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  fromDate?: DateRange;
  toDate?: DateRange;
  addressLineOne?: string;
}

export interface EntryRecord {
  lastLeftYourCountry?: number;
  dateOfEntry?: number;
  placeOfEntry?: string;
  status?: string;
  state?: string;
}

export interface PassportRecord {
  countryOfIssuance?: string;
  passportNumber?: string;
  expirationDate?: number;
  issueDate?: number;
  cid?: string;
  genre?: string;
  lastName?: string;
  firstName?: string;
  name1?: string;
  name2?: string;
  name3?: string;
  dob?: number;
  documentCode?: string;
  MRZ_1?: string;
  MRZ_2?: string;
  mrz?: string[];
  clientNotaryId?: string;
  passportImage?: string;
}

export interface DriverLicense {
  licenseNumber?: string;
  issueState?: string;
  issueDate?: number;
  expirationDate?: number;
  dlClass?: string;
  restrictions?: string;
  endorsements?: string;
  frontImage?: string;
  backImage?: string;
}

export interface Signature {
  timeStamp?: number;
  url?: string;
}

export interface CurrentLocation {
  country?: string;
  state?: string;
}

export interface NotaryCustomer {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  genre?: string;
  dateOfBirth?: number;
  placeOfBirth?: PlaceOfBirth;
  dob?: number;
  clientNotaryId?: string;
  ss?: string;
  residences?: Record<string, Residence>;
  schoolHistory?: Record<string, School>;
  employers?: Record<string, Employer>;
  race?: string;
  maritalStatus?: string;
  phoneNumber?: string;
  alienNumber?: string;
  entryRecord?: Record<string, EntryRecord>;
  passportExpire?: number;
  passportNumber?: string;
  father?: string;
  mother?: string;
  passportRecord?: Record<string, PassportRecord>;
  driverLicenses?: Record<string, DriverLicense>;
  siblings?: string[];
  childrens?: Record<string, number>;
  spouse?: string;
  marriage_state?: string;
  currentLocation?: CurrentLocation;
  ethnicity?: string;
  hairColor?: string;
  eyesColor?: string;
  countryOfCitizenship?: string;
  isInUSA?: boolean;
  dateOfAppI589?: number;
  marriage_country?: string;
  marriage_date?: number;
  marriage_city?: string;
  height?: string;
  weight?: string;
  email?: string;
  imageUrlBCT?: string;
  imageUrlMCT?: string;
  signatures?: Record<string, Signature>;
  isMarriage?: boolean;
  subjectId?: string;
  hasI94?: boolean;
  hasLPR?: boolean;
  greenCardFrontImage?: string;
  greenCardBackImage?: string;
  passportImage?: string;
  currentPassport?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}