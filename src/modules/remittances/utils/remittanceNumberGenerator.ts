/**
 * Generates a unique remittance number
 * Format: REM-YYYYMMDD-HHMMSS-XXXXX
 * Where XXXXX is a 5-character random alphanumeric code
 */
export const generateRemittanceNumber = (): string => {
  const now = new Date();
  
  // Format date as YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Format time as HHMMSS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}${minutes}${seconds}`;
  
  // Generate 5-character random code
  const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
  
  return `REM-${dateStr}-${timeStr}-${randomCode}`;
};

/**
 * Validates if a remittance number follows the expected format
 */
export const isValidRemittanceNumber = (remittanceNumber: string): boolean => {
  const pattern = /^REM-\d{8}-\d{6}-[A-Z0-9]{5}$/;
  return pattern.test(remittanceNumber);
};

/**
 * Extracts date from remittance number
 */
export const getDateFromRemittanceNumber = (remittanceNumber: string): Date | null => {
  if (!isValidRemittanceNumber(remittanceNumber)) {
    return null;
  }
  
  const parts = remittanceNumber.split('-');
  const dateStr = parts[1]; // YYYYMMDD
  const timeStr = parts[2]; // HHMMSS
  
  const year = parseInt(dateStr.substr(0, 4));
  const month = parseInt(dateStr.substr(4, 2)) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.substr(6, 2));
  
  const hours = parseInt(timeStr.substr(0, 2));
  const minutes = parseInt(timeStr.substr(2, 2));
  const seconds = parseInt(timeStr.substr(4, 2));
  
  return new Date(year, month, day, hours, minutes, seconds);
};