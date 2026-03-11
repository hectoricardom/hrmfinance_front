import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import ChecklistItemRow from './ChecklistItemRow';
import VehicleSection from './VehicleSection';
import { ChecklistItem, BusinessExpensesChecklist, BusinessVehicleEntry, HomeOfficeDetails, BusinessInfo } from '../../../types/taxStrategyTypes';

// Common NAICS codes for self-employed and small businesses
const NAICS_CODES = [
  // Transportation & Delivery
  { code: '484110', name: 'General Freight Trucking, Local', category: 'Transportation' },
  { code: '484121', name: 'General Freight Trucking, Long-Distance (Truckload)', category: 'Transportation' },
  { code: '484122', name: 'General Freight Trucking, Long-Distance (Less Than Truckload)', category: 'Transportation' },
  { code: '485310', name: 'Taxi & Ridesharing Services (Uber, Lyft)', category: 'Transportation' },
  { code: '485320', name: 'Limousine Service', category: 'Transportation' },
  { code: '492110', name: 'Couriers & Express Delivery (DoorDash, Amazon Flex)', category: 'Transportation' },
  { code: '488410', name: 'Motor Vehicle Towing', category: 'Transportation' },

  // Construction & Trades
  { code: '236115', name: 'New Single-Family Housing Construction', category: 'Construction' },
  { code: '236118', name: 'Residential Remodelers', category: 'Construction' },
  { code: '238110', name: 'Poured Concrete Foundation & Structure', category: 'Construction' },
  { code: '238140', name: 'Masonry Contractors', category: 'Construction' },
  { code: '238160', name: 'Roofing Contractors', category: 'Construction' },
  { code: '238210', name: 'Electrical Contractors', category: 'Construction' },
  { code: '238220', name: 'Plumbing, Heating & AC Contractors (HVAC)', category: 'Construction' },
  { code: '238310', name: 'Drywall & Insulation Contractors', category: 'Construction' },
  { code: '238320', name: 'Painting & Wall Covering Contractors', category: 'Construction' },
  { code: '238330', name: 'Flooring Contractors', category: 'Construction' },
  { code: '238340', name: 'Tile & Terrazzo Contractors', category: 'Construction' },
  { code: '238350', name: 'Finish Carpentry Contractors', category: 'Construction' },
  { code: '238390', name: 'Other Building Finishing Contractors', category: 'Construction' },
  { code: '238910', name: 'Site Preparation Contractors', category: 'Construction' },
  { code: '238990', name: 'All Other Specialty Trade Contractors', category: 'Construction' },

  // Professional Services
  { code: '541110', name: 'Offices of Lawyers', category: 'Professional Services' },
  { code: '541211', name: 'Offices of CPAs', category: 'Professional Services' },
  { code: '541213', name: 'Tax Preparation Services', category: 'Professional Services' },
  { code: '541214', name: 'Payroll Services', category: 'Professional Services' },
  { code: '541219', name: 'Other Accounting Services', category: 'Professional Services' },
  { code: '541310', name: 'Architectural Services', category: 'Professional Services' },
  { code: '541320', name: 'Landscape Architectural Services', category: 'Professional Services' },
  { code: '541330', name: 'Engineering Services', category: 'Professional Services' },
  { code: '541410', name: 'Interior Design Services', category: 'Professional Services' },
  { code: '541430', name: 'Graphic Design Services', category: 'Professional Services' },
  { code: '541511', name: 'Custom Computer Programming', category: 'Professional Services' },
  { code: '541512', name: 'Computer Systems Design Services', category: 'Professional Services' },
  { code: '541519', name: 'Other Computer Related Services', category: 'Professional Services' },
  { code: '541611', name: 'Management Consulting Services', category: 'Professional Services' },
  { code: '541612', name: 'Human Resources Consulting', category: 'Professional Services' },
  { code: '541613', name: 'Marketing Consulting Services', category: 'Professional Services' },
  { code: '541618', name: 'Other Management Consulting', category: 'Professional Services' },
  { code: '541690', name: 'Other Scientific & Technical Consulting', category: 'Professional Services' },
  { code: '541810', name: 'Advertising Agencies', category: 'Professional Services' },
  { code: '541820', name: 'Public Relations Agencies', category: 'Professional Services' },
  { code: '541840', name: 'Media Representatives', category: 'Professional Services' },
  { code: '541850', name: 'Outdoor Advertising', category: 'Professional Services' },
  { code: '541860', name: 'Direct Mail Advertising', category: 'Professional Services' },
  { code: '541890', name: 'Other Services Related to Advertising', category: 'Professional Services' },
  { code: '541910', name: 'Marketing Research & Public Opinion Polling', category: 'Professional Services' },
  { code: '541921', name: 'Photography Studios, Portrait', category: 'Professional Services' },
  { code: '541922', name: 'Commercial Photography', category: 'Professional Services' },
  { code: '541930', name: 'Translation & Interpretation Services', category: 'Professional Services' },
  { code: '541940', name: 'Veterinary Services', category: 'Professional Services' },
  { code: '541990', name: 'All Other Professional Services', category: 'Professional Services' },

  // Healthcare
  { code: '621111', name: 'Offices of Physicians', category: 'Healthcare' },
  { code: '621112', name: 'Offices of Mental Health Physicians', category: 'Healthcare' },
  { code: '621210', name: 'Offices of Dentists', category: 'Healthcare' },
  { code: '621310', name: 'Offices of Chiropractors', category: 'Healthcare' },
  { code: '621320', name: 'Offices of Optometrists', category: 'Healthcare' },
  { code: '621330', name: 'Offices of Mental Health Practitioners', category: 'Healthcare' },
  { code: '621340', name: 'Offices of Physical & Occupational Therapists', category: 'Healthcare' },
  { code: '621391', name: 'Offices of Podiatrists', category: 'Healthcare' },
  { code: '621399', name: 'Offices of Other Health Practitioners', category: 'Healthcare' },
  { code: '621410', name: 'Family Planning Centers', category: 'Healthcare' },
  { code: '621610', name: 'Home Health Care Services', category: 'Healthcare' },
  { code: '621991', name: 'Blood & Organ Banks', category: 'Healthcare' },
  { code: '621999', name: 'All Other Miscellaneous Ambulatory Services', category: 'Healthcare' },
  { code: '624120', name: 'Services for the Elderly & Disabled', category: 'Healthcare' },

  // Personal Services
  { code: '812111', name: 'Barber Shops', category: 'Personal Services' },
  { code: '812112', name: 'Beauty Salons', category: 'Personal Services' },
  { code: '812113', name: 'Nail Salons', category: 'Personal Services' },
  { code: '812191', name: 'Diet & Weight Reducing Centers', category: 'Personal Services' },
  { code: '812199', name: 'Other Personal Care Services (Spa, Massage)', category: 'Personal Services' },
  { code: '812210', name: 'Funeral Homes & Funeral Services', category: 'Personal Services' },
  { code: '812310', name: 'Coin-Operated Laundries & Drycleaners', category: 'Personal Services' },
  { code: '812320', name: 'Drycleaning & Laundry Services', category: 'Personal Services' },
  { code: '812331', name: 'Linen Supply', category: 'Personal Services' },
  { code: '812910', name: 'Pet Care Services (Grooming, Boarding)', category: 'Personal Services' },
  { code: '812921', name: 'Photofinishing Laboratories', category: 'Personal Services' },
  { code: '812922', name: 'One-Hour Photofinishing', category: 'Personal Services' },
  { code: '812930', name: 'Parking Lots & Garages', category: 'Personal Services' },
  { code: '812990', name: 'All Other Personal Services', category: 'Personal Services' },

  // Real Estate
  { code: '531110', name: 'Lessors of Residential Buildings', category: 'Real Estate' },
  { code: '531120', name: 'Lessors of Nonresidential Buildings', category: 'Real Estate' },
  { code: '531130', name: 'Lessors of Miniwarehouses & Self-Storage', category: 'Real Estate' },
  { code: '531190', name: 'Lessors of Other Real Estate Property', category: 'Real Estate' },
  { code: '531210', name: 'Offices of Real Estate Agents & Brokers', category: 'Real Estate' },
  { code: '531311', name: 'Residential Property Managers', category: 'Real Estate' },
  { code: '531312', name: 'Nonresidential Property Managers', category: 'Real Estate' },
  { code: '531320', name: 'Offices of Real Estate Appraisers', category: 'Real Estate' },
  { code: '531390', name: 'Other Real Estate Activities', category: 'Real Estate' },

  // Retail
  { code: '441110', name: 'New Car Dealers', category: 'Retail' },
  { code: '441120', name: 'Used Car Dealers', category: 'Retail' },
  { code: '442110', name: 'Furniture Stores', category: 'Retail' },
  { code: '443141', name: 'Electronics Stores', category: 'Retail' },
  { code: '443142', name: 'Electronics & Appliance Stores', category: 'Retail' },
  { code: '444110', name: 'Home Centers', category: 'Retail' },
  { code: '444120', name: 'Paint & Wallpaper Stores', category: 'Retail' },
  { code: '444130', name: 'Hardware Stores', category: 'Retail' },
  { code: '444190', name: 'Other Building Material Dealers', category: 'Retail' },
  { code: '445110', name: 'Supermarkets & Grocery Stores', category: 'Retail' },
  { code: '445120', name: 'Convenience Stores', category: 'Retail' },
  { code: '445230', name: 'Fruit & Vegetable Markets', category: 'Retail' },
  { code: '445291', name: 'Baked Goods Stores', category: 'Retail' },
  { code: '445299', name: 'All Other Specialty Food Stores', category: 'Retail' },
  { code: '446110', name: 'Pharmacies & Drug Stores', category: 'Retail' },
  { code: '446120', name: 'Cosmetics & Beauty Supplies', category: 'Retail' },
  { code: '448110', name: 'Men\'s Clothing Stores', category: 'Retail' },
  { code: '448120', name: 'Women\'s Clothing Stores', category: 'Retail' },
  { code: '448140', name: 'Family Clothing Stores', category: 'Retail' },
  { code: '448150', name: 'Clothing Accessories Stores', category: 'Retail' },
  { code: '451110', name: 'Sporting Goods Stores', category: 'Retail' },
  { code: '451211', name: 'Book Stores', category: 'Retail' },
  { code: '453110', name: 'Florists', category: 'Retail' },
  { code: '453220', name: 'Gift, Novelty & Souvenir Stores', category: 'Retail' },
  { code: '453310', name: 'Used Merchandise Stores', category: 'Retail' },
  { code: '454110', name: 'Electronic Shopping & Mail-Order (E-commerce)', category: 'Retail' },
  { code: '454390', name: 'Other Direct Selling (MLM, Door-to-Door)', category: 'Retail' },

  // Food Services
  { code: '722310', name: 'Food Service Contractors', category: 'Food Services' },
  { code: '722320', name: 'Caterers', category: 'Food Services' },
  { code: '722330', name: 'Mobile Food Services (Food Trucks)', category: 'Food Services' },
  { code: '722410', name: 'Drinking Places (Bars)', category: 'Food Services' },
  { code: '722511', name: 'Full-Service Restaurants', category: 'Food Services' },
  { code: '722513', name: 'Limited-Service Restaurants (Fast Food)', category: 'Food Services' },
  { code: '722514', name: 'Cafeterias & Buffets', category: 'Food Services' },
  { code: '722515', name: 'Snack & Beverage Bars (Coffee Shops)', category: 'Food Services' },

  // Education & Training
  { code: '611110', name: 'Elementary & Secondary Schools', category: 'Education' },
  { code: '611210', name: 'Junior Colleges', category: 'Education' },
  { code: '611310', name: 'Colleges & Universities', category: 'Education' },
  { code: '611410', name: 'Business Schools & Training', category: 'Education' },
  { code: '611420', name: 'Computer Training', category: 'Education' },
  { code: '611430', name: 'Professional Development Training', category: 'Education' },
  { code: '611512', name: 'Flight Training', category: 'Education' },
  { code: '611519', name: 'Other Technical & Trade Schools', category: 'Education' },
  { code: '611610', name: 'Fine Arts Schools', category: 'Education' },
  { code: '611620', name: 'Sports & Recreation Instruction', category: 'Education' },
  { code: '611630', name: 'Language Schools', category: 'Education' },
  { code: '611691', name: 'Exam Preparation & Tutoring', category: 'Education' },
  { code: '611699', name: 'All Other Miscellaneous Schools', category: 'Education' },
  { code: '611710', name: 'Educational Support Services', category: 'Education' },

  // Repair & Maintenance
  { code: '811111', name: 'General Automotive Repair', category: 'Repair Services' },
  { code: '811112', name: 'Automotive Exhaust System Repair', category: 'Repair Services' },
  { code: '811113', name: 'Automotive Transmission Repair', category: 'Repair Services' },
  { code: '811118', name: 'Other Automotive Mechanical Repair', category: 'Repair Services' },
  { code: '811121', name: 'Automotive Body & Paint Repair', category: 'Repair Services' },
  { code: '811122', name: 'Automotive Glass Replacement', category: 'Repair Services' },
  { code: '811191', name: 'Automotive Oil Change & Lubrication', category: 'Repair Services' },
  { code: '811192', name: 'Car Washes', category: 'Repair Services' },
  { code: '811198', name: 'All Other Automotive Repair', category: 'Repair Services' },
  { code: '811211', name: 'Consumer Electronics Repair', category: 'Repair Services' },
  { code: '811212', name: 'Computer & Office Machine Repair', category: 'Repair Services' },
  { code: '811213', name: 'Communication Equipment Repair', category: 'Repair Services' },
  { code: '811219', name: 'Other Electronic Equipment Repair', category: 'Repair Services' },
  { code: '811310', name: 'Commercial Equipment Repair & Maintenance', category: 'Repair Services' },
  { code: '811411', name: 'Home & Garden Equipment Repair', category: 'Repair Services' },
  { code: '811412', name: 'Appliance Repair & Maintenance', category: 'Repair Services' },
  { code: '811420', name: 'Reupholstery & Furniture Repair', category: 'Repair Services' },
  { code: '811430', name: 'Footwear & Leather Goods Repair', category: 'Repair Services' },
  { code: '811490', name: 'Other Personal & Household Repair', category: 'Repair Services' },

  // Cleaning Services
  { code: '561710', name: 'Exterminating & Pest Control Services', category: 'Cleaning Services' },
  { code: '561720', name: 'Janitorial Services', category: 'Cleaning Services' },
  { code: '561730', name: 'Landscaping Services', category: 'Cleaning Services' },
  { code: '561740', name: 'Carpet & Upholstery Cleaning Services', category: 'Cleaning Services' },
  { code: '561790', name: 'Other Services to Buildings & Dwellings', category: 'Cleaning Services' },

  // Entertainment & Arts
  { code: '711110', name: 'Theater Companies & Dinner Theaters', category: 'Entertainment' },
  { code: '711120', name: 'Dance Companies', category: 'Entertainment' },
  { code: '711130', name: 'Musical Groups & Artists', category: 'Entertainment' },
  { code: '711190', name: 'Other Performing Arts Companies', category: 'Entertainment' },
  { code: '711211', name: 'Sports Teams & Clubs', category: 'Entertainment' },
  { code: '711212', name: 'Racetracks', category: 'Entertainment' },
  { code: '711219', name: 'Other Spectator Sports', category: 'Entertainment' },
  { code: '711310', name: 'Promoters with Facilities', category: 'Entertainment' },
  { code: '711320', name: 'Promoters without Facilities', category: 'Entertainment' },
  { code: '711410', name: 'Agents & Managers for Artists & Athletes', category: 'Entertainment' },
  { code: '711510', name: 'Independent Artists, Writers & Performers', category: 'Entertainment' },
  { code: '512110', name: 'Motion Picture & Video Production', category: 'Entertainment' },
  { code: '512191', name: 'Teleproduction & Postproduction Services', category: 'Entertainment' },
  { code: '512240', name: 'Sound Recording Studios', category: 'Entertainment' },

  // Fitness & Recreation
  { code: '713940', name: 'Fitness & Recreational Sports Centers (Gyms)', category: 'Fitness' },
  { code: '713910', name: 'Golf Courses & Country Clubs', category: 'Fitness' },
  { code: '713920', name: 'Skiing Facilities', category: 'Fitness' },
  { code: '713930', name: 'Marinas', category: 'Fitness' },
  { code: '713950', name: 'Bowling Centers', category: 'Fitness' },
  { code: '713990', name: 'All Other Amusement & Recreation', category: 'Fitness' },

  // Child Care
  { code: '624410', name: 'Child Day Care Services', category: 'Child Care' },

  // Financial Services
  { code: '522310', name: 'Mortgage & Nonmortgage Loan Brokers', category: 'Financial Services' },
  { code: '523930', name: 'Investment Advice', category: 'Financial Services' },
  { code: '524210', name: 'Insurance Agencies & Brokerages', category: 'Financial Services' },

  // Information Technology
  { code: '518210', name: 'Data Processing & Hosting Services', category: 'Information Technology' },
  { code: '519130', name: 'Internet Publishing & Web Search Portals', category: 'Information Technology' },
  { code: '519190', name: 'All Other Information Services', category: 'Information Technology' },

  // Agriculture
  { code: '111000', name: 'Crop Production', category: 'Agriculture' },
  { code: '112000', name: 'Animal Production & Aquaculture', category: 'Agriculture' },
  { code: '115110', name: 'Support Activities for Crop Production', category: 'Agriculture' },
  { code: '115210', name: 'Support Activities for Animal Production', category: 'Agriculture' },

  // Manufacturing (Small Scale)
  { code: '311811', name: 'Retail Bakeries', category: 'Manufacturing' },
  { code: '315990', name: 'Apparel Accessories Manufacturing', category: 'Manufacturing' },
  { code: '316990', name: 'Other Leather Product Manufacturing', category: 'Manufacturing' },
  { code: '321999', name: 'All Other Miscellaneous Wood Product', category: 'Manufacturing' },
  { code: '332710', name: 'Machine Shops', category: 'Manufacturing' },
  { code: '339910', name: 'Jewelry & Silverware Manufacturing', category: 'Manufacturing' },
  { code: '339930', name: 'Doll, Toy & Game Manufacturing', category: 'Manufacturing' },
  { code: '339990', name: 'All Other Miscellaneous Manufacturing', category: 'Manufacturing' },

  // Wholesale
  { code: '423990', name: 'Other Miscellaneous Durable Goods Merchant Wholesalers', category: 'Wholesale' },
  { code: '424990', name: 'Other Miscellaneous Nondurable Goods Merchant Wholesalers', category: 'Wholesale' },
  { code: '425120', name: 'Wholesale Trade Agents & Brokers', category: 'Wholesale' },
];

// Get unique categories for filtering
const NAICS_CATEGORIES = [...new Set(NAICS_CODES.map(c => c.category))].sort();

interface BusinessExpensesPanelProps {
  data: BusinessExpensesChecklist;
  onChange: (updated: BusinessExpensesChecklist) => void;
}

interface GroupConfig {
  key: keyof BusinessExpensesChecklist;
  label: string;
  items: { field: string; label: string }[];
}

const GROUPS: GroupConfig[] = [
  {
    key: 'labor',
    label: 'Labor',
    items: [
      { field: 'wages', label: 'Wages' },
      { field: 'contractors', label: 'Contractors' },
      { field: 'payrollTaxes', label: 'Payroll taxes' },
    ],
  },
  {
    key: 'facility',
    label: 'Facility Expenses',
    items: [
      { field: 'rent', label: 'Rent' },
      { field: 'utilities', label: 'Utilities' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    items: [
      { field: 'ads', label: 'Advertising' },
      { field: 'website', label: 'Website' },
      { field: 'socialMedia', label: 'Social media' },
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance',
    items: [
      { field: 'liability', label: 'Liability insurance' },
      { field: 'professional', label: 'Professional insurance' },
      { field: 'property', label: 'Property insurance' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    items: [
      { field: 'advertising', label: 'Advertising' },
      { field: 'insurance', label: 'Insurance' },
      { field: 'legalFees', label: 'Legal fees' },
      { field: 'accountingFees', label: 'Accounting fees' },
      { field: 'licenses', label: 'Licenses & permits' },
      { field: 'bankFees', label: 'Bank fees' },
      { field: 'contractLabor', label: 'Contract labor' },
    ],
  },
  {
    key: 'office',
    label: 'Office Expenses',
    items: [
      { field: 'officeSupplies', label: 'Office supplies' },
      { field: 'postage', label: 'Postage & shipping' },
      { field: 'telephone', label: 'Telephone' },
      { field: 'internet', label: 'Internet service' },
      { field: 'software', label: 'Software subscriptions' },
      { field: 'computerEquipment', label: 'Computer equipment' },
    ],
  },
  {
    key: 'travel',
    label: 'Travel',
    items: [
      { field: 'airfare', label: 'Airfare' },
      { field: 'lodging', label: 'Lodging' },
      { field: 'carRental', label: 'Car rental' },
      { field: 'transportationFees', label: 'Transportation fees' },
    ],
  },
  {
    key: 'meals',
    label: 'Meals',
    items: [
      { field: 'businessMeals', label: 'Business meals (50%)' },
      { field: 'entertainmentExpenses', label: 'Entertainment expenses' },
    ],
  },
  {
    key: 'equipment',
    label: 'Equipment',
    items: [
      { field: 'machinery', label: 'Machinery' },
      { field: 'furniture', label: 'Furniture' },
      { field: 'tools', label: 'Tools' },
      { field: 'section179Deduction', label: 'Section 179 deduction' },
    ],
  },
  {
    key: 'education',
    label: 'Education',
    items: [
      { field: 'coursesAndSeminars', label: 'Courses & seminars' },
      { field: 'books', label: 'Books & materials' },
      { field: 'certifications', label: 'Certifications' },
      { field: 'professionalDues', label: 'Professional dues' },
    ],
  },
  {
    key: 'other',
    label: 'Other',
    items: [
      { field: 'commissions', label: 'Commissions paid' },
      { field: 'subcontractors', label: 'Subcontractors' },
      { field: 'uniforms', label: 'Uniforms & work clothes' },
      { field: 'otherExpenses', label: 'Other expenses' },
    ],
  },
];

const HOME_OFFICE_ITEMS = [
  { field: 'squareFootage', label: 'Square footage (dedicated)' },
  { field: 'totalHomeSquareFootage', label: 'Total home square footage' },
  { field: 'rent', label: 'Rent/mortgage portion' },
  { field: 'utilities', label: 'Utilities portion' },
  { field: 'insurance', label: 'Insurance portion' },
  { field: 'repairs', label: 'Repairs' },
  { field: 'depreciation', label: 'Depreciation' },
  { field: 'exclusiveUse', label: 'Exclusive use' },
  { field: 'regularUse', label: 'Regular use' },
];

const groupContainerStyle: Record<string, string> = {
  'margin-bottom': '1rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  overflow: 'hidden',
};

const groupHeaderStyle: Record<string, string> = {
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  width: '100%',
  padding: '0.75rem 1rem',
  border: 'none',
  background: 'var(--surface-alt, #f9fafb)',
  cursor: 'pointer',
  'font-size': '0.875rem',
  'font-weight': '600',
  color: 'var(--text-primary)',
  'text-align': 'left',
};

const groupBodyStyle: Record<string, string> = {
  padding: '0.25rem 0.5rem',
};

const countBadgeStyle: Record<string, string> = {
  'font-size': '0.75rem',
  'font-weight': '400',
  color: 'var(--text-primary)',
  opacity: '0.7',
  'margin-right': '0.5rem',
};

const businessInfoSectionStyle: Record<string, string> = {
  'margin-bottom': '1.5rem',
  padding: '1rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  background: 'var(--surface-alt, #f9fafb)',
};

const businessInfoGridStyle: Record<string, string> = {
  display: 'grid',
  'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
};

const formFieldStyle: Record<string, string> = {
  display: 'flex',
  'flex-direction': 'column',
  gap: '0.25rem',
};

const labelStyle: Record<string, string> = {
  'font-size': '0.75rem',
  'font-weight': '500',
  color: 'var(--text-secondary)',
};

const inputStyle: Record<string, string> = {
  padding: '0.5rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-sm)',
  'font-size': '0.875rem',
};

const selectStyle: Record<string, string> = {
  ...inputStyle,
  background: 'white',
};

const checkboxContainerStyle: Record<string, string> = {
  display: 'flex',
  'align-items': 'center',
  gap: '0.5rem',
  'margin-top': '0.5rem',
};

const sectionTitleStyle: Record<string, string> = {
  'font-size': '1rem',
  'font-weight': '600',
  'margin-bottom': '1rem',
  color: 'var(--text-primary)',
};

const preparerNotesStyle: Record<string, string> = {
  'margin-top': '1.5rem',
  padding: '1rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
};

const textareaStyle: Record<string, string> = {
  width: '100%',
  'min-height': '100px',
  padding: '0.75rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-sm)',
  'font-size': '0.875rem',
  'font-family': 'inherit',
  resize: 'vertical',
};

const BusinessExpensesPanel: Component<BusinessExpensesPanelProps> = (props) => {
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>({});
  const [naicsSearch, setNaicsSearch] = createSignal('');
  const [showNaicsDropdown, setShowNaicsDropdown] = createSignal(false);
  const [selectedNaicsCategory, setSelectedNaicsCategory] = createSignal<string>('');

  // Filter NAICS codes based on search and category
  const filteredNaicsCodes = createMemo(() => {
    let codes = NAICS_CODES;

    // Filter by category first
    if (selectedNaicsCategory()) {
      codes = codes.filter(c => c.category === selectedNaicsCategory());
    }

    // Then filter by search term
    const search = naicsSearch().toLowerCase();
    if (search) {
      codes = codes.filter(c =>
        c.code.includes(search) ||
        c.name.toLowerCase().includes(search) ||
        c.category.toLowerCase().includes(search)
      );
    }

    return codes.slice(0, 50); // Limit to 50 results for performance
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getGroupData = (key: keyof BusinessExpensesChecklist) => {
    return props.data[key] as Record<string, ChecklistItem>;
  };

  const getCheckedCount = (key: keyof BusinessExpensesChecklist, items: { field: string }[]) => {
    const groupData = getGroupData(key);
    if (!groupData) return 0;
    return items.filter((item) => groupData[item.field]?.checked).length;
  };

  const handleItemChange = (groupKey: keyof BusinessExpensesChecklist, field: string, updated: ChecklistItem) => {
    const newData: BusinessExpensesChecklist = {
      ...props.data,
      [groupKey]: {
        ...(props.data[groupKey] as Record<string, ChecklistItem>),
        [field]: updated,
      },
    };
    props.onChange(newData);
  };

  const handleBusinessInfoChange = (field: keyof BusinessInfo, value: string | boolean) => {
    const newData: BusinessExpensesChecklist = {
      ...props.data,
      businessInfo: {
        ...props.data.businessInfo,
        [field]: value,
      } as BusinessInfo,
    };
    props.onChange(newData);
  };

  const handleVehiclesChange = (vehicles: BusinessVehicleEntry[]) => {
    const newData: BusinessExpensesChecklist = {
      ...props.data,
      vehicles,
    };
    props.onChange(newData);
  };

  const handleHomeOfficeChange = (field: string, updated: ChecklistItem) => {
    const newData: BusinessExpensesChecklist = {
      ...props.data,
      homeOffice: {
        ...(props.data.homeOffice as HomeOfficeDetails),
        [field]: updated,
      },
    };
    props.onChange(newData);
  };

  const handlePreparerNotesChange = (notes: string) => {
    const newData: BusinessExpensesChecklist = {
      ...props.data,
      preparerNotes: notes,
    };
    props.onChange(newData);
  };

  const getHomeOfficeCheckedCount = () => {
    const homeOffice = props.data.homeOffice as HomeOfficeDetails | undefined;
    if (!homeOffice) return 0;
    return HOME_OFFICE_ITEMS.filter((item) => (homeOffice as Record<string, ChecklistItem>)[item.field]?.checked).length;
  };

  return (
    <div>
      {/* Business Info Section */}
      <div style={businessInfoSectionStyle}>
        <div style={sectionTitleStyle}>Business Information</div>
        <div style={businessInfoGridStyle}>
          <div style={formFieldStyle}>
            <label style={labelStyle}>Business Name</label>
            <input
              type="text"
              style={inputStyle}
              value={props.data.businessInfo?.businessName || ''}
              onInput={(e) => handleBusinessInfoChange('businessName', e.currentTarget.value)}
            />
          </div>
          <div style={formFieldStyle}>
            <label style={labelStyle}>Business Type</label>
            <select
              style={selectStyle}
              value={props.data.businessInfo?.businessType || ''}
              onChange={(e) => handleBusinessInfoChange('businessType', e.currentTarget.value)}
            >
              <option value="">Select type...</option>
              <option value="soleProprietorship">Sole Proprietorship</option>
              <option value="llc">LLC</option>
              <option value="sCorp">S Corporation</option>
              <option value="cCorp">C Corporation</option>
              <option value="partnership">Partnership</option>
            </select>
          </div>
          <div style={formFieldStyle}>
            <label style={labelStyle}>EIN</label>
            <input
              type="text"
              style={inputStyle}
              value={props.data.businessInfo?.ein || ''}
              onInput={(e) => handleBusinessInfoChange('ein', e.currentTarget.value)}
              placeholder="XX-XXXXXXX"
            />
          </div>
          <div style={{ ...formFieldStyle, 'grid-column': 'span 2', position: 'relative' }}>
            <label style={labelStyle}>Business Code (NAICS) - Click to search</label>
            <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
              <input
                type="text"
                style={{ ...inputStyle, flex: '1' }}
                value={props.data.businessInfo?.businessCode || ''}
                onFocus={() => setShowNaicsDropdown(true)}
                onInput={(e) => {
                  handleBusinessInfoChange('businessCode', e.currentTarget.value);
                  setNaicsSearch(e.currentTarget.value);
                  setShowNaicsDropdown(true);
                }}
                placeholder="Search by code, name, or category..."
              />
              <Show when={props.data.businessInfo?.businessCode}>
                <button
                  type="button"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ef4444',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'white',
                    color: '#ef4444',
                    cursor: 'pointer',
                    'font-size': '0.75rem'
                  }}
                  onClick={() => {
                    handleBusinessInfoChange('businessCode', '');
                    handleBusinessInfoChange('principalBusinessActivity', '');
                    setNaicsSearch('');
                  }}
                >
                  Clear
                </button>
              </Show>
            </div>

            {/* NAICS Dropdown */}
            <Show when={showNaicsDropdown()}>
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  right: '0',
                  'max-height': '400px',
                  overflow: 'auto',
                  background: 'white',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-md)',
                  'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
                  'z-index': '100',
                  'margin-top': '0.25rem'
                }}
              >
                {/* Category Filter */}
                <div style={{
                  padding: '0.75rem',
                  'border-bottom': '1px solid var(--border-color)',
                  background: '#f9fafb',
                  position: 'sticky',
                  top: '0',
                  'z-index': '1'
                }}>
                  <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.25rem', 'margin-bottom': '0.5rem' }}>
                    <button
                      type="button"
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: selectedNaicsCategory() === '' ? '2px solid #0891b2' : '1px solid #ddd',
                        'border-radius': '9999px',
                        background: selectedNaicsCategory() === '' ? '#0891b2' : 'white',
                        color: selectedNaicsCategory() === '' ? 'white' : '#666',
                        cursor: 'pointer',
                        'font-size': '0.7rem',
                        'font-weight': '500'
                      }}
                      onClick={() => setSelectedNaicsCategory('')}
                    >
                      All
                    </button>
                    <For each={NAICS_CATEGORIES}>
                      {(category) => (
                        <button
                          type="button"
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: selectedNaicsCategory() === category ? '2px solid #0891b2' : '1px solid #ddd',
                            'border-radius': '9999px',
                            background: selectedNaicsCategory() === category ? '#0891b2' : 'white',
                            color: selectedNaicsCategory() === category ? 'white' : '#666',
                            cursor: 'pointer',
                            'font-size': '0.7rem',
                            'font-weight': '500'
                          }}
                          onClick={() => setSelectedNaicsCategory(category)}
                        >
                          {category}
                        </button>
                      )}
                    </For>
                  </div>
                  <div style={{ 'font-size': '0.7rem', color: '#666' }}>
                    {filteredNaicsCodes().length} results
                    <button
                      type="button"
                      style={{
                        'margin-left': '1rem',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #ddd',
                        'border-radius': 'var(--border-radius-sm)',
                        background: 'white',
                        cursor: 'pointer',
                        'font-size': '0.7rem'
                      }}
                      onClick={() => setShowNaicsDropdown(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Results List */}
                <div style={{ padding: '0.5rem' }}>
                  <For each={filteredNaicsCodes()}>
                    {(naics) => (
                      <button
                        type="button"
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.75rem',
                          border: 'none',
                          background: props.data.businessInfo?.businessCode === naics.code ? '#e0f2fe' : 'transparent',
                          cursor: 'pointer',
                          'text-align': 'left',
                          'border-radius': 'var(--border-radius-sm)',
                          'margin-bottom': '0.25rem'
                        }}
                        onClick={() => {
                          handleBusinessInfoChange('businessCode', naics.code);
                          handleBusinessInfoChange('principalBusinessActivity', naics.name);
                          setShowNaicsDropdown(false);
                          setNaicsSearch('');
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = props.data.businessInfo?.businessCode === naics.code ? '#e0f2fe' : 'transparent'}
                      >
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                          <span style={{
                            'font-weight': '700',
                            color: '#0891b2',
                            'font-size': '0.875rem',
                            'min-width': '60px'
                          }}>
                            {naics.code}
                          </span>
                          <div style={{ flex: '1' }}>
                            <div style={{ 'font-size': '0.875rem', 'font-weight': '500', color: '#1a1a1a' }}>
                              {naics.name}
                            </div>
                            <div style={{ 'font-size': '0.7rem', color: '#666' }}>
                              {naics.category}
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </For>

                  <Show when={filteredNaicsCodes().length === 0}>
                    <div style={{ padding: '1rem', 'text-align': 'center', color: '#666', 'font-size': '0.875rem' }}>
                      No codes found. Try a different search term or category.
                    </div>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
          <div style={formFieldStyle}>
            <label style={labelStyle}>Principal Business Activity</label>
            <input
              type="text"
              style={inputStyle}
              value={props.data.businessInfo?.principalBusinessActivity || ''}
              onInput={(e) => handleBusinessInfoChange('principalBusinessActivity', e.currentTarget.value)}
              placeholder="Auto-filled from NAICS selection"
            />
          </div>
          <div style={formFieldStyle}>
            <label style={labelStyle}>Accounting Method</label>
            <select
              style={selectStyle}
              value={props.data.businessInfo?.accountingMethod || ''}
              onChange={(e) => handleBusinessInfoChange('accountingMethod', e.currentTarget.value)}
            >
              <option value="">Select method...</option>
              <option value="cash">Cash</option>
              <option value="accrual">Accrual</option>
            </select>
          </div>
          <div style={formFieldStyle}>
            <label style={labelStyle}>Date Business Started</label>
            <input
              type="date"
              style={inputStyle}
              value={props.data.businessInfo?.dateBusinessStarted || ''}
              onInput={(e) => handleBusinessInfoChange('dateBusinessStarted', e.currentTarget.value)}
            />
          </div>
          <div style={formFieldStyle}>
            <div style={checkboxContainerStyle}>
              <input
                type="checkbox"
                id="materialParticipation"
                checked={props.data.businessInfo?.materialParticipation || false}
                onChange={(e) => handleBusinessInfoChange('materialParticipation', e.currentTarget.checked)}
              />
              <label for="materialParticipation" style={{ ...labelStyle, 'margin-bottom': '0' }}>
                Material Participation
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Section */}
      <Show when={props.data.vehicles !== undefined}>
        <VehicleSection
          vehicles={props.data.vehicles || []}
          onChange={handleVehiclesChange}
        />
      </Show>

      {/* Home Office Section */}
      <div style={groupContainerStyle}>
        <button
          type="button"
          style={groupHeaderStyle}
          onClick={() => toggleGroup('homeOffice')}
        >
          <span>Home Office</span>
          <span style={{ display: 'flex', 'align-items': 'center' }}>
            <span style={countBadgeStyle}>
              {getHomeOfficeCheckedCount()} / {HOME_OFFICE_ITEMS.length}
            </span>
            <span
              style={{
                transform: openGroups()['homeOffice'] ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                'font-size': '0.75rem',
              }}
            >
              &#9660;
            </span>
          </span>
        </button>
        <Show when={openGroups()['homeOffice']}>
          <div style={groupBodyStyle}>
            <For each={HOME_OFFICE_ITEMS}>
              {(item) => (
                <ChecklistItemRow
                  label={item.label}
                  item={(props.data.homeOffice as Record<string, ChecklistItem>)?.[item.field]}
                  onChange={(updated) => handleHomeOfficeChange(item.field, updated)}
                />
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Expense Groups */}
      <For each={GROUPS}>
        {(group) => (
          <Show when={props.data[group.key]}>
            <div style={groupContainerStyle}>
              <button
                type="button"
                style={groupHeaderStyle}
                onClick={() => toggleGroup(group.key)}
              >
                <span>{group.label}</span>
                <span style={{ display: 'flex', 'align-items': 'center' }}>
                  <span style={countBadgeStyle}>
                    {getCheckedCount(group.key, group.items)} / {group.items.length}
                  </span>
                  <span
                    style={{
                      transform: openGroups()[group.key] ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      'font-size': '0.75rem',
                    }}
                  >
                    &#9660;
                  </span>
                </span>
              </button>
              <Show when={openGroups()[group.key]}>
                <div style={groupBodyStyle}>
                  <For each={group.items}>
                    {(item) => (
                      <ChecklistItemRow
                        label={item.label}
                        item={getGroupData(group.key)[item.field]}
                        onChange={(updated) => handleItemChange(group.key, item.field, updated)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Show>
        )}
      </For>

      {/* Preparer Notes */}
      <div style={preparerNotesStyle}>
        <div style={sectionTitleStyle}>Preparer Notes</div>
        <textarea
          style={textareaStyle}
          value={props.data.preparerNotes || ''}
          onInput={(e) => handlePreparerNotesChange(e.currentTarget.value)}
          placeholder="Enter any additional notes for the preparer..."
        />
      </div>
    </div>
  );
};

export default BusinessExpensesPanel;
