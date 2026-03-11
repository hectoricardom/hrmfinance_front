import { jsPDF } from 'jspdf';
import { NotaryCustomer } from '../modules/notary/types';

interface PlaceholderMapping {
  [key: string]: (customer: NotaryCustomer) => string;
}

export class DOJDocumentGenerator {
  private static readonly placeholderMappings: PlaceholderMapping = {
    '{FULL_NAME}': (customer: NotaryCustomer) => 
      `${customer.firstName} ${customer.middleName || ''} ${customer.lastName}`.trim(),
    '{FIRST_NAME}': (customer: NotaryCustomer) => customer.firstName,
    '{MIDDLE_NAME}': (customer: NotaryCustomer) => customer.middleName || '',
    '{LAST_NAME}': (customer: NotaryCustomer) => customer.lastName,
    '{EMAIL}': (customer: NotaryCustomer) => customer.email,
    '{PHONE}': (customer: NotaryCustomer) => customer.phoneNumber,
    '{SSN}': (customer: NotaryCustomer) => customer.ss,
    '{ALIEN_NUMBER}': (customer: NotaryCustomer) => customer.alienNumber,
    '{DATE_OF_BIRTH}': (customer: NotaryCustomer) => 
      customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : '',
    '{GENDER}': (customer: NotaryCustomer) => customer.genre,
    '{RACE}': (customer: NotaryCustomer) => customer.race,
    '{ETHNICITY}': (customer: NotaryCustomer) => customer.ethnicity,
    '{MARITAL_STATUS}': (customer: NotaryCustomer) => customer.maritalStatus,
    '{HEIGHT}': (customer: NotaryCustomer) => customer.height,
    '{WEIGHT}': (customer: NotaryCustomer) => customer.weight,
    '{HAIR_COLOR}': (customer: NotaryCustomer) => customer.hairColor,
    '{EYE_COLOR}': (customer: NotaryCustomer) => customer.eyesColor,
    '{BIRTH_CITY}': (customer: NotaryCustomer) => customer.placeOfBirth?.city || '',
    '{BIRTH_STATE}': (customer: NotaryCustomer) => customer.placeOfBirth?.state || '',
    '{BIRTH_COUNTRY}': (customer: NotaryCustomer) => customer.placeOfBirth?.country || '',
    '{CURRENT_COUNTRY}': (customer: NotaryCustomer) => customer.currentLocation?.country || '',
    '{CURRENT_STATE}': (customer: NotaryCustomer) => customer.currentLocation?.state || '',
    '{FATHER_NAME}': (customer: NotaryCustomer) => customer.father,
    '{MOTHER_NAME}': (customer: NotaryCustomer) => customer.mother,
    '{SPOUSE_NAME}': (customer: NotaryCustomer) => customer.spouse,
    '{COUNTRY_OF_CITIZENSHIP}': (customer: NotaryCustomer) => customer.countryOfCitizenship,
    '{PASSPORT_NUMBER}': (customer: NotaryCustomer) => customer.passportNumber,
    '{PASSPORT_EXPIRY}': (customer: NotaryCustomer) => 
      customer.passportExpire ? new Date(customer.passportExpire).toLocaleDateString() : '',
    '{MARRIAGE_DATE}': (customer: NotaryCustomer) => 
      customer.marriage_date ? new Date(customer.marriage_date).toLocaleDateString() : '',
    '{MARRIAGE_CITY}': (customer: NotaryCustomer) => customer.marriage_city || '',
    '{MARRIAGE_STATE}': (customer: NotaryCustomer) => customer.marriage_state || '',
    '{MARRIAGE_COUNTRY}': (customer: NotaryCustomer) => customer.marriage_country || '',
    '{TODAY_DATE}': () => new Date().toLocaleDateString(),
    '{CURRENT_DATE}': () => new Date().toLocaleDateString(),
    '{CURRENT_YEAR}': () => new Date().getFullYear().toString(),
  };

  private static fillTemplate(template: string, customer: NotaryCustomer): string {
    let filledTemplate = template;
    
    Object.entries(this.placeholderMappings).forEach(([placeholder, getValue]) => {
      const value = getValue(customer);
      filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return filledTemplate;
  }

  private static getLatestAddress(customer: NotaryCustomer): string {
    if (!customer.residences || Object.keys(customer.residences).length === 0) {
      return '';
    }
    
    const latestResidenceKey = Object.keys(customer.residences)
      .sort((a, b) => parseInt(b) - parseInt(a))[0];
    const residence = customer.residences[latestResidenceKey];
    
    const parts = [
      residence.addressLineOne,
      residence.addressLineTwo,
      residence.city,
      residence.state,
      residence.zipcode,
      residence.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  private static wrapText(text: string, maxWidth: number, doc: jsPDF): string[] {
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines;
  }

  public static async generatePDF(
    customer: NotaryCustomer,
    templateContent: string
  ): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    
    const filledContent = this.fillTemplate(templateContent, customer);
    
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    
    const lines = filledContent.split('\n');
    let currentY = margin;
    
    for (const line of lines) {
      if (currentY + 10 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      
      const wrappedLines = this.wrapText(line, contentWidth, doc);
      for (const wrappedLine of wrappedLines) {
        doc.text(wrappedLine, margin, currentY);
        currentY += 5;
      }
    }
    
    if (customer.residences && Object.keys(customer.residences).length > 0) {
      if (currentY + 20 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      
      currentY += 10;
      doc.setFont('times', 'bold');
      doc.text('CURRENT ADDRESS:', margin, currentY);
      doc.setFont('times', 'normal');
      currentY += 5;
      
      const address = this.getLatestAddress(customer);
      const addressLines = this.wrapText(address, contentWidth, doc);
      for (const addressLine of addressLines) {
        doc.text(addressLine, margin, currentY);
        currentY += 5;
      }
    }
    
    return doc.output('blob');
  }

  public static async generateFromHtml(
    customer: NotaryCustomer,
    htmlTemplate: string
  ): Promise<Blob> {
    const filledHtml = this.fillTemplate(htmlTemplate, customer);
    
    const container = document.createElement('div');
    container.innerHTML = filledHtml;
    container.style.width = '210mm';
    container.style.padding = '20mm';
    container.style.fontFamily = 'Times New Roman, serif';
    container.style.fontSize = '12pt';
    container.style.lineHeight = '1.5';
    container.style.color = '#000';
    container.style.backgroundColor = '#fff';
    
    document.body.appendChild(container);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });
    
    await doc.html(container, {
      callback: function() {},
      margin: [10, 10, 10, 10],
      autoPaging: true,
      html2canvas: {
        scale: 0.5,
        logging: false,
        useCORS: true
      }
    });
    
    document.body.removeChild(container);
    
    return doc.output('blob');
  }
}

export const dojDocumentTemplates = {
  basicTemplate: `UNITED STATES DEPARTMENT OF JUSTICE

Date: {TODAY_DATE}

RE: {FULL_NAME}
DOB: {DATE_OF_BIRTH}
Country of Citizenship: {COUNTRY_OF_CITIZENSHIP}
A#: {ALIEN_NUMBER}

Dear Sir/Madam,

This document certifies that the above-named individual has provided the following information:

Full Name: {FULL_NAME}
Date of Birth: {DATE_OF_BIRTH}
Place of Birth: {BIRTH_CITY}, {BIRTH_STATE}, {BIRTH_COUNTRY}
Gender: {GENDER}
Current Status: {MARITAL_STATUS}

Contact Information:
Email: {EMAIL}
Phone: {PHONE}

Physical Description:
Height: {HEIGHT}
Weight: {WEIGHT}
Hair Color: {HAIR_COLOR}
Eye Color: {EYE_COLOR}

Family Information:
Father: {FATHER_NAME}
Mother: {MOTHER_NAME}
Spouse: {SPOUSE_NAME}

Immigration Information:
Passport Number: {PASSPORT_NUMBER}
Passport Expiry: {PASSPORT_EXPIRY}
Social Security Number: {SSN}

This document is generated based on the information provided by the applicant.

Sincerely,

_____________________________
Authorized Signature

_____________________________
Date: {CURRENT_DATE}`,

  detailedTemplate: `UNITED STATES DEPARTMENT OF JUSTICE
Immigration and Naturalization Service

BIOGRAPHICAL INFORMATION

File No: {ALIEN_NUMBER}
Date: {TODAY_DATE}

1. NAME: {LAST_NAME}, {FIRST_NAME} {MIDDLE_NAME}
2. DATE OF BIRTH: {DATE_OF_BIRTH}
3. PLACE OF BIRTH: {BIRTH_CITY}, {BIRTH_STATE}, {BIRTH_COUNTRY}
4. GENDER: {GENDER}
5. RACE: {RACE}
6. ETHNICITY: {ETHNICITY}
7. HEIGHT: {HEIGHT}
8. WEIGHT: {WEIGHT}
9. HAIR COLOR: {HAIR_COLOR}
10. EYE COLOR: {EYE_COLOR}
11. MARITAL STATUS: {MARITAL_STATUS}

CONTACT INFORMATION:
Email: {EMAIL}
Phone: {PHONE}

CITIZENSHIP INFORMATION:
Country of Citizenship: {COUNTRY_OF_CITIZENSHIP}
Passport Number: {PASSPORT_NUMBER}
Passport Expiration: {PASSPORT_EXPIRY}

FAMILY INFORMATION:
Father's Name: {FATHER_NAME}
Mother's Name: {MOTHER_NAME}
Spouse's Name: {SPOUSE_NAME}

MARRIAGE INFORMATION:
Date of Marriage: {MARRIAGE_DATE}
Place of Marriage: {MARRIAGE_CITY}, {MARRIAGE_STATE}, {MARRIAGE_COUNTRY}

IDENTIFICATION NUMBERS:
Social Security Number: {SSN}
Alien Registration Number: {ALIEN_NUMBER}

CURRENT LOCATION:
Country: {CURRENT_COUNTRY}
State: {CURRENT_STATE}

I certify that the information provided above is true and correct to the best of my knowledge.

_____________________________
Signature of Applicant

_____________________________
Date: {CURRENT_DATE}`
};