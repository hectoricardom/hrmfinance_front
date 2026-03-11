import { Component } from 'solid-js';
import { Layout } from '../../ui';
import InvoiceDisplay from './InvoiceDisplay';
import { devLog } from '../../../services/utils';

const InvoiceExample: Component = () => {
  // Example invoice data from server
  const invoiceData = {
    "type": "SALES",
    "invoice": "20255FK6S4B43SSS",
    "description": "",
    "store": "YY_8816",
    "ssg_inventory_key": "JqdrRwGBpdBfRCim",
    "ssg_sorder_key": "JqdrRwGBpdBfRCim",
    "createDate": 1736132690425,
    "shipper_consignee": {
      "name": "Yudith Perez Medero",
      "phoneNumberS": "5022408378",
      "dob": "1982-07-23",
      "firstName": "RAUL",
      "lastName": "BATISTA",
      "lastName2": "ESPOSITO",
      "middleName": "",
      "email": "",
      "phoneNumber": "52393232",
      "altPhoneNumber": "",
      "cid": "48121007305",
      "ybstreetNo": "9",
      "ybstreet": "10",
      "ybbetwen1": "CARRALERO",
      "ybbetwen2": "3RA",
      "ybapt": "",
      "ybreparto": "PUEBLO NUEVO",
      "consigneeId": "26144",
      "ssg_consignee_key": "26144",
      "passport": "NA",
      "nacionality": "CUB",
      "ybcity": "HOLGUIN",
      "ybestate": "HOLGUIN",
      "comment": ""
    },
    "packagesOrder": true,
    "businessId": "YB100423253156428",
    "userId": "108694446087560534800",
    "reservas": [
      {
        "type": "UTILES DEL HOGAR",
        "qty": "15",
        "arancel": "10",
        "price": "5",
        "key": "1GB16SD80"
      },
      {
        "type": "MISCELANEAS",
        "qty": "19",
        "arancel": "",
        "price": "4",
        "key": "0DS6K14Y2"
      }
    ],
    "products": [
      {
        "product": {
          "id": "CmrhMfVjLR9HxT6P",
          "label": "FOGONES ELECTRICO DOBLE RESISTENCIA DE ALAMBRE",
          "code": "978Y82K94"
        },
        "qty": -1,
        "price": 23.696296296296296,
        "salePrice": "34"
      },
      {
        "product": {
          "id": "ov56aPYGbXIq4XGy",
          "label": "Caramelos",
          "code": "C852CSKB5"
        },
        "qty": -2,
        "price": 5.990000000000001,
        "salePrice": "10"
      }
    ],
    "isCompleted": true
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implement PDF export logic here
    // You can use libraries like jsPDF or html2pdf
    devLog('Exporting to PDF...');
  };

  return (
    <Layout title="Invoice">
      <InvoiceDisplay 
        invoice={invoiceData}
        onPrint={handlePrint}
        onExport={handleExport}
      />
    </Layout>
  );
};

export default InvoiceExample;