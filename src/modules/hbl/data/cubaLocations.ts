/**
 * Cuban Provinces and Cities Data
 * Used for location filters in HBL search and manifest generation
 */

export interface City {
  id: number;
  label: string;
}

export interface Province {
  id: number;
  label: string;
  cities: City[];
}

export const cubaProvinces: Province[] = [
  {
    "id": 1,
    "label": "PINAR DEL RIO",
    "cities": [
      { "id": 2, "label": "PINAR DEL RIO" },
      { "id": 3, "label": "CONSOLACION DEL SUR" },
      { "id": 4, "label": "SAN JUAN Y MARTINEZ" },
      { "id": 5, "label": "LOS PALACIOS" },
      { "id": 6, "label": "SANDINO" },
      { "id": 7, "label": "GUANE" },
      { "id": 8, "label": "LA PALMA" },
      { "id": 9, "label": "SAN LUIS" },
      { "id": 10, "label": "MINAS DE MATAHAMBRE" },
      { "id": 11, "label": "VINALES" },
      { "id": 12, "label": "MANTUA" }
    ]
  },
  {
    "id": 2,
    "label": "ARTEMISA",
    "cities": [
      { "id": 13, "label": "MARIEL" },
      { "id": 14, "label": "GUANAJAY" },
      { "id": 15, "label": "CAIMITO" },
      { "id": 16, "label": "BAUTA" },
      { "id": 17, "label": "SAN ANTONIO DE LOS BANOS" },
      { "id": 18, "label": "GUIRA DE MELENA" },
      { "id": 19, "label": "ALQUIZAR" },
      { "id": 20, "label": "ARTEMISA" },
      { "id": 21, "label": "BAHIA HONDA" },
      { "id": 22, "label": "CANDELARIA" },
      { "id": 23, "label": "SAN CRISTOBAL" }
    ]
  },
  {
    "id": 3,
    "label": "MAYABEQUE",
    "cities": [
      { "id": 38, "label": "BEJUCAL" },
      { "id": 39, "label": "SAN JOSE DE LAS LAJAS" },
      { "id": 40, "label": "JARUCO" },
      { "id": 41, "label": "SANTA CRUZ DEL NORTE" },
      { "id": 42, "label": "MADRUGA" },
      { "id": 43, "label": "NUEVA PAZ" },
      { "id": 44, "label": "SAN NICOLAS DE BARI" },
      { "id": 45, "label": "GUINES" },
      { "id": 46, "label": "MELENA DEL SUR" },
      { "id": 47, "label": "BATABANO" },
      { "id": 48, "label": "QUIVICAN" }
    ]
  },
  {
    "id": 4,
    "label": "LA HABANA",
    "cities": [
      { "id": 1, "label": "GUANABACOA" },
      { "id": 24, "label": "ARROYO NARANJO" },
      { "id": 25, "label": "BOYEROS" },
      { "id": 26, "label": "CENTRO HABANA" },
      { "id": 27, "label": "CERRO" },
      { "id": 28, "label": "COTORRO" },
      { "id": 29, "label": "DIEZ DE OCTUBRE" },
      { "id": 30, "label": "HABANA DEL ESTE" },
      { "id": 31, "label": "LA HABANA VIEJA" },
      { "id": 32, "label": "LA LISA" },
      { "id": 33, "label": "MARIANAO" },
      { "id": 34, "label": "PLAYA" },
      { "id": 35, "label": "PLAZA DE LA REVOLUCION" },
      { "id": 36, "label": "REGLA" },
      { "id": 37, "label": "SAN MIGUEL DEL PADRON" }
    ]
  },
  {
    "id": 5,
    "label": "MATANZAS",
    "cities": [
      { "id": 49, "label": "CALIMETE" },
      { "id": 50, "label": "CARDENAS" },
      { "id": 51, "label": "CIENAGA DE ZAPATA" },
      { "id": 52, "label": "COLON" },
      { "id": 53, "label": "JAGUEY GRANDE" },
      { "id": 54, "label": "JOVELLANOS" },
      { "id": 55, "label": "LIMONAR" },
      { "id": 56, "label": "LOS ARABOS" },
      { "id": 57, "label": "MARTI" },
      { "id": 58, "label": "MATANZAS" },
      { "id": 59, "label": "PEDRO BETANCOURT" },
      { "id": 60, "label": "PERICO" },
      { "id": 61, "label": "UNION DE REYES" }
    ]
  },
  {
    "id": 6,
    "label": "VILLA CLARA",
    "cities": [
      { "id": 70, "label": "CAIBARIEN" },
      { "id": 71, "label": "CAMAJUANI" },
      { "id": 72, "label": "CIFUENTES" },
      { "id": 73, "label": "CORRALILLO" },
      { "id": 74, "label": "ENCRUCIJADA" },
      { "id": 75, "label": "MANICARAGUA" },
      { "id": 76, "label": "PLACETAS" },
      { "id": 77, "label": "QUEMADO DE GUINES" },
      { "id": 78, "label": "RANCHUELO" },
      { "id": 79, "label": "REMEDIOS" },
      { "id": 80, "label": "SAGUA LA GRANDE" },
      { "id": 81, "label": "SANTA CLARA" },
      { "id": 82, "label": "SANTO DOMINGO" }
    ]
  },
  {
    "id": 7,
    "label": "CIENFUEGOS",
    "cities": [
      { "id": 62, "label": "ABREUS" },
      { "id": 63, "label": "AGUADA DE PASAJEROS" },
      { "id": 64, "label": "CIENFUEGOS" },
      { "id": 65, "label": "CRUCES" },
      { "id": 66, "label": "CUMANAYAGUA" },
      { "id": 67, "label": "LAJAS" },
      { "id": 68, "label": "PALMIRA" },
      { "id": 69, "label": "RODAS" }
    ]
  },
  {
    "id": 8,
    "label": "SANCTI SPIRITUS",
    "cities": [
      { "id": 83, "label": "SANCTI SPIRITUS" },
      { "id": 84, "label": "TRINIDAD" },
      { "id": 85, "label": "CABAIGUAN" },
      { "id": 86, "label": "YAGUAJAY" },
      { "id": 87, "label": "JATIBONICO" },
      { "id": 88, "label": "TAGUASCO" },
      { "id": 89, "label": "FOMENTO" },
      { "id": 90, "label": "LA SIERPE" }
    ]
  },
  {
    "id": 9,
    "label": "CIEGO DE AVILA",
    "cities": [
      { "id": 91, "label": "CIEGO DE AVILA" },
      { "id": 92, "label": "MORON" },
      { "id": 93, "label": "CHAMBAS" },
      { "id": 94, "label": "CIRO REDONDO" },
      { "id": 95, "label": "MAJAGUA" },
      { "id": 96, "label": "FLORENCIA" },
      { "id": 98, "label": "BARAGUA" },
      { "id": 99, "label": "PRIMERO DE ENERO" },
      { "id": 100, "label": "BOLIVIA" },
      { "id": 175, "label": "VENEZUELA" }
    ]
  },
  {
    "id": 10,
    "label": "CAMAGUEY",
    "cities": [
      { "id": 97, "label": "CAMAGUEY" },
      { "id": 101, "label": "GUAIMARO" },
      { "id": 102, "label": "NUEVITAS" },
      { "id": 103, "label": "CESPEDES" },
      { "id": 104, "label": "JIMAGUAYU" },
      { "id": 105, "label": "SIBANICU" },
      { "id": 106, "label": "ESMERALDA" },
      { "id": 107, "label": "MINAS" },
      { "id": 108, "label": "SIERRA DE CUBITAS" },
      { "id": 109, "label": "FLORIDA" },
      { "id": 110, "label": "NAJASA" },
      { "id": 111, "label": "VERTIENTES" },
      { "id": 112, "label": "SANTA CRUZ DEL SUR" }
    ]
  },
  {
    "id": 11,
    "label": "LAS TUNAS",
    "cities": [
      { "id": 113, "label": "AMANCIO" },
      { "id": 114, "label": "COLOMBIA" },
      { "id": 115, "label": "JESUS MENENDEZ" },
      { "id": 116, "label": "JOBABO" },
      { "id": 117, "label": "MAJIBACOA" },
      { "id": 118, "label": "MANATI" },
      { "id": 120, "label": "LAS TUNAS" },
      { "id": 167, "label": "PUERTO PADRE" }
    ]
  },
  {
    "id": 12,
    "label": "HOLGUIN",
    "cities": [
      { "id": 121, "label": "ANTILLA" },
      { "id": 122, "label": "BAGUANOS" },
      { "id": 123, "label": "BANES" },
      { "id": 124, "label": "CACOCUM" },
      { "id": 125, "label": "CALIXTO GARCIA" },
      { "id": 126, "label": "CUETO" },
      { "id": 127, "label": "FRANK PAIS" },
      { "id": 128, "label": "GIBARA" },
      { "id": 129, "label": "HOLGUIN" },
      { "id": 130, "label": "MAYARI" },
      { "id": 131, "label": "MOA" },
      { "id": 132, "label": "RAFAEL FREYRE" },
      { "id": 133, "label": "SAGUA DE TANAMO" },
      { "id": 134, "label": "URBANO NORIS" }
    ]
  },
  {
    "id": 13,
    "label": "GRANMA",
    "cities": [
      { "id": 135, "label": "BARTOLOME MASO" },
      { "id": 136, "label": "BAYAMO" },
      { "id": 137, "label": "BUEY ARRIBA" },
      { "id": 138, "label": "CAMPECHUELA" },
      { "id": 139, "label": "CAUTO CRISTO" },
      { "id": 140, "label": "GUISA" },
      { "id": 141, "label": "JIGUANI" },
      { "id": 142, "label": "MANZANILLO" },
      { "id": 143, "label": "MEDIA LUNA" },
      { "id": 144, "label": "NIQUERO" },
      { "id": 145, "label": "PILON" },
      { "id": 146, "label": "RIO CAUTO" },
      { "id": 147, "label": "YARA" }
    ]
  },
  {
    "id": 14,
    "label": "SANTIAGO DE CUBA",
    "cities": [
      { "id": 148, "label": "CONTRAMAESTRE" },
      { "id": 149, "label": "GUAMA" },
      { "id": 150, "label": "MELLA" },
      { "id": 151, "label": "PALMA SORIANO" },
      { "id": 152, "label": "SAN LUIS" },
      { "id": 153, "label": "SANTIAGO DE CUBA" },
      { "id": 154, "label": "SEGUNDO FRENTE" },
      { "id": 155, "label": "SONGO-LA MAYA" },
      { "id": 156, "label": "TERCER FRENTE" }
    ]
  },
  {
    "id": 15,
    "label": "GUANTANAMO",
    "cities": [
      { "id": 157, "label": "BARACOA" },
      { "id": 158, "label": "CAIMANERA" },
      { "id": 159, "label": "EL SALVADOR" },
      { "id": 160, "label": "GUANTANAMO" },
      { "id": 161, "label": "IMIAS" },
      { "id": 162, "label": "MAISI" },
      { "id": 163, "label": "MANUEL TAMES" },
      { "id": 164, "label": "NICETO PEREZ" },
      { "id": 165, "label": "SAN ANTONIO DEL SUR" },
      { "id": 166, "label": "YATERAS" }
    ]
  },
  {
    "id": 16,
    "label": "ISLA DE LA JUVENTUD",
    "cities": [
      { "id": 171, "label": "ISLA DE LA JUVENTUD" },
      { "id": 172, "label": "GERONA" },
      { "id": 174, "label": "LA FE" }
    ]
  }
];

/**
 * Get cities for a specific province
 */
export function getCitiesForProvince(provinceName: string): City[] {
  const province = cubaProvinces.find(
    p => p.label.toUpperCase() === provinceName.toUpperCase()
  );
  return province?.cities || [];
}

/**
 * Get all province names
 */
export function getAllProvinceNames(): string[] {
  return cubaProvinces.map(p => p.label).sort();
}

/**
 * Get all city names (optionally for a specific province)
 */
export function getAllCityNames(provinceName?: string): string[] {
  if (provinceName) {
    const cities = getCitiesForProvince(provinceName);
    return cities.map(c => c.label).sort();
  }

  // Return all cities from all provinces
  const allCities = cubaProvinces.flatMap(p => p.cities.map(c => c.label));
  return [...new Set(allCities)].sort();
}
