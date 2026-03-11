import { Component } from 'solid-js';
import InvoiceDashboard from './InvoiceDashboard';

const InvoiceDashboardExample: Component = () => {
  // Example data - multiple invoices
  const invoicesList = [
    {
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
    },
    {
      "type": "SALES",
      "invoice": "20255FK6S4B43TTT",
      "description": "",
      "store": "YY_8803",
      "ssg_inventory_key": "JqdrRwGBpdBfRCin",
      "ssg_sorder_key": "JqdrRwGBpdBfRCin",
      "createDate": 1736032690425,
      "shipper_consignee": {
        "name": "Maria Rodriguez Santos",
        "phoneNumberS": "5024567890",
        "dob": "1990-03-15",
        "firstName": "MARIA",
        "lastName": "RODRIGUEZ",
        "lastName2": "SANTOS",
        "middleName": "ELENA",
        "email": "maria@email.com",
        "phoneNumber": "52987654",
        "altPhoneNumber": "",
        "cid": "90031507890",
        "ybstreetNo": "15",
        "ybstreet": "23",
        "ybbetwen1": "MARTI",
        "ybbetwen2": "CESPEDES",
        "ybapt": "2A",
        "ybreparto": "CENTRO",
        "consigneeId": "26145",
        "ssg_consignee_key": "26145",
        "passport": "A1234567",
        "nacionality": "CUB",
        "ybcity": "HAVANA",
        "ybestate": "HAVANA",
        "comment": ""
      },
      "packagesOrder": true,
      "businessId": "YB100423253156428",
      "userId": "108694446087560534801",
      "reservas": [
        {
          "type": "ELECTRONICOS",
          "qty": "5",
          "arancel": "15",
          "price": "12",
          "key": "2GB16SD81"
        },
        {
          "type": "ROPA Y CALZADO",
          "qty": "8",
          "arancel": "8",
          "price": "7",
          "key": "0DS6K14Y3"
        }
      ],
      "products": [
        {
          "product": {
            "id": "XmrhMfVjLR9HxT6Q",
            "label": "TELEVISOR LED 32 PULGADAS",
            "code": "TV32LED01"
          },
          "qty": -1,
          "price": 150.50,
          "salePrice": "220"
        },
        {
          "product": {
            "id": "Yv56aPYGbXIq4XGz",
            "label": "Zapatos Deportivos Nike",
            "code": "ZAP001"
          },
          "qty": -1,
          "price": 45.99,
          "salePrice": "75"
        }
      ],
      "isCompleted": false
    },
    {
      "type": "SALES",
      "invoice": "20255FK6S4B43UUU",
      "description": "",
      "store": "YY_8816",
      "ssg_inventory_key": "JqdrRwGBpdBfRCio",
      "ssg_sorder_key": "JqdrRwGBpdBfRCio",
      "createDate": 1735932690425,
      "shipper_consignee": {
        "name": "Carlos Mendez Perez",
        "phoneNumberS": "5025678901",
        "dob": "1975-12-08",
        "firstName": "CARLOS",
        "lastName": "MENDEZ",
        "lastName2": "PEREZ",
        "middleName": "ANTONIO",
        "email": "",
        "phoneNumber": "52876543",
        "altPhoneNumber": "",
        "cid": "75120878901",
        "ybstreetNo": "7",
        "ybstreet": "45",
        "ybbetwen1": "LINEA",
        "ybbetwen2": "PASEO",
        "ybapt": "",
        "ybreparto": "VEDADO",
        "consigneeId": "26146",
        "ssg_consignee_key": "26146",
        "passport": "NA",
        "nacionality": "CUB",
        "ybcity": "HAVANA",
        "ybestate": "HAVANA",
        "comment": ""
      },
      "packagesOrder": true,
      "businessId": "YB100423253156428",
      "userId": "108694446087560534802",
      "reservas": [
        {
          "type": "ALIMENTOS",
          "qty": "25",
          "arancel": "5",
          "price": "3",
          "key": "3GB16SD82"
        }
      ],
      "products": [
        {
          "product": {
            "id": "ZmrhMfVjLR9HxT6R",
            "label": "ARROZ ESPECIAL 5LB",
            "code": "ARZ005"
          },
          "qty": -5,
          "price": 2.50,
          "salePrice": "4"
        },
        {
          "product": {
            "id": "Av56aPYGbXIq4XG1",
            "label": "ACEITE DE COCINA 1L",
            "code": "ACE001"
          },
          "qty": -3,
          "price": 3.75,
          "salePrice": "6"
        }
      ],
      "isCompleted": true
    },
    {
      "type": "SALES",
      "invoice": "20255FK6S4B43VVV",
      "description": "",
      "store": "YY_8802",
      "ssg_inventory_key": "JqdrRwGBpdBfRCip",
      "ssg_sorder_key": "JqdrRwGBpdBfRCip",
      "createDate": 1735832690425,
      "shipper_consignee": {
        "name": "Ana Lucia Fernandez",
        "phoneNumberS": "5026789012",
        "dob": "1988-06-20",
        "firstName": "ANA",
        "lastName": "FERNANDEZ",
        "lastName2": "LOPEZ",
        "middleName": "LUCIA",
        "email": "ana.lucia@email.com",
        "phoneNumber": "52765432",
        "altPhoneNumber": "52111222",
        "cid": "88062076789",
        "ybstreetNo": "12",
        "ybstreet": "18",
        "ybbetwen1": "CALZADA",
        "ybbetwen2": "SAN LAZARO",
        "ybapt": "3B",
        "ybreparto": "CENTRO HABANA",
        "consigneeId": "26147",
        "ssg_consignee_key": "26147",
        "passport": "B9876543",
        "nacionality": "CUB",
        "ybcity": "HAVANA",
        "ybestate": "HAVANA",
        "comment": "Entrega en horario de oficina"
      },
      "packagesOrder": true,
      "businessId": "YB100423253156428",
      "userId": "108694446087560534803",
      "reservas": [
        {
          "type": "MEDICINA Y SALUD",
          "qty": "10",
          "arancel": "12",
          "price": "8",
          "key": "4GB16SD83"
        },
        {
          "type": "UTILES DEL HOGAR",
          "qty": "6",
          "arancel": "6",
          "price": "4",
          "key": "5GB16SD84"
        }
      ],
      "products": [
        {
          "product": {
            "id": "BmrhMfVjLR9HxT6S",
            "label": "VITAMINAS MULTIPLES 60 CAP",
            "code": "VIT001"
          },
          "qty": -2,
          "price": 12.50,
          "salePrice": "18"
        }
      ],
      "isCompleted": true
    }
  ];

  return <InvoiceDashboard invoices={invoicesList} />;
};

export default InvoiceDashboardExample;