import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import {
  EPropertyAmenityCategory,
  EPropertyCancellationPolicy,
  EPropertyChargeFeeTypes,
  EPropertyChargeTypes,
  EPropertyRuleType,
  EPropertyType,
} from '../properties/enums/property.enum';
import { ICreatePropertyRequestParams } from '../properties/interfaces/property.interface';
import { PropertyService } from '../properties/services/property.service';
import { StorageService } from '../storage/services/storage.service';
import { EUserRole } from '../users/enums/user.enum';
import { UserService } from '../users/services/user.service';

const SEED_HOSTS = [
  {
    email: 'priya.sharma@stayly.dev',
    password: 'SeedPass123!',
    name: 'Priya Sharma',
  },
  {
    email: 'arjun.mehta@stayly.dev',
    password: 'SeedPass123!',
    name: 'Arjun Mehta',
  },
  {
    email: 'kavya.nair@stayly.dev',
    password: 'SeedPass123!',
    name: 'Kavya Nair',
  },
  {
    email: 'rohit.desai@stayly.dev',
    password: 'SeedPass123!',
    name: 'Rohit Desai',
  },
  {
    email: 'ananya.iyer@stayly.dev',
    password: 'SeedPass123!',
    name: 'Ananya Iyer',
  },
];

const A = {
  wifi: {
    name: 'WiFi',
    description: 'High-speed internet',
    icon: 'wifi',
    category: EPropertyAmenityCategory.ESSENTIALS,
  },
  kitchen: {
    name: 'Full Kitchen',
    description: 'Fully equipped kitchen',
    icon: 'kitchen',
    category: EPropertyAmenityCategory.ESSENTIALS,
  },
  ac: {
    name: 'Air Conditioning',
    description: 'Central air conditioning',
    icon: 'ac_unit',
    category: EPropertyAmenityCategory.ESSENTIALS,
  },
  washer: {
    name: 'Washer & Dryer',
    description: 'In-unit laundry',
    icon: 'local_laundry_service',
    category: EPropertyAmenityCategory.ESSENTIALS,
  },
  tv: {
    name: 'Smart TV',
    description: '55" Smart TV with streaming',
    icon: 'tv',
    category: EPropertyAmenityCategory.FEATURES,
  },
  pool: {
    name: 'Swimming Pool',
    description: 'Private outdoor pool',
    icon: 'pool',
    category: EPropertyAmenityCategory.FEATURES,
  },
  gym: {
    name: 'Fitness Center',
    description: 'On-site gym access',
    icon: 'fitness_center',
    category: EPropertyAmenityCategory.FEATURES,
  },
  parking: {
    name: 'Free Parking',
    description: 'Dedicated parking space',
    icon: 'local_parking',
    category: EPropertyAmenityCategory.FEATURES,
  },
  hotTub: {
    name: 'Hot Tub',
    description: 'Private jacuzzi',
    icon: 'hot_tub',
    category: EPropertyAmenityCategory.FEATURES,
  },
  balcony: {
    name: 'Private Balcony',
    description: 'Private furnished balcony',
    icon: 'balcony',
    category: EPropertyAmenityCategory.FEATURES,
  },
  garden: {
    name: 'Private Garden',
    description: 'Landscaped private garden',
    icon: 'yard',
    category: EPropertyAmenityCategory.FEATURES,
  },
  bbq: {
    name: 'BBQ Grill',
    description: 'Outdoor BBQ grill',
    icon: 'outdoor_grill',
    category: EPropertyAmenityCategory.FEATURES,
  },
  concierge: {
    name: 'Concierge Service',
    description: '24/7 concierge service',
    icon: 'room_service',
    category: EPropertyAmenityCategory.FEATURES,
  },
  beachAccess: {
    name: 'Beach Access',
    description: 'Direct private beach access',
    icon: 'beach_access',
    category: EPropertyAmenityCategory.LOCATION,
  },
  cityView: {
    name: 'City View',
    description: 'Panoramic city views',
    icon: 'location_city',
    category: EPropertyAmenityCategory.LOCATION,
  },
  oceanView: {
    name: 'Sea View',
    description: 'Stunning sea views',
    icon: 'water',
    category: EPropertyAmenityCategory.LOCATION,
  },
  mountainView: {
    name: 'Mountain View',
    description: 'Scenic mountain views',
    icon: 'terrain',
    category: EPropertyAmenityCategory.LOCATION,
  },
  smokeDetector: {
    name: 'Smoke Detector',
    description: 'Smoke & CO detector',
    icon: 'detector_smoke',
    category: EPropertyAmenityCategory.SAFETY,
  },
  firstAid: {
    name: 'First Aid Kit',
    description: 'Fully stocked first aid kit',
    icon: 'medical_services',
    category: EPropertyAmenityCategory.SAFETY,
  },
  fireExtinguisher: {
    name: 'Fire Extinguisher',
    description: 'Fire extinguisher on premises',
    icon: 'fire_extinguisher',
    category: EPropertyAmenityCategory.SAFETY,
  },
};

const R = {
  noPets: {
    ruleType: EPropertyRuleType.PETS,
    allowed: false,
    description: 'No pets allowed',
  },
  petsOk: {
    ruleType: EPropertyRuleType.PETS,
    allowed: true,
    description: 'Pets welcome with prior notice',
  },
  noSmoke: {
    ruleType: EPropertyRuleType.SMOKING,
    allowed: false,
    description: 'No smoking indoors',
  },
  noParty: {
    ruleType: EPropertyRuleType.PARTIES,
    allowed: false,
    description: 'No parties or events',
  },
  quiet: {
    ruleType: EPropertyRuleType.QUIET_HOURS,
    allowed: true,
    description: 'Quiet hours 10pm–8am',
  },
};

type PropertySeed = {
  hostIndex: number;
  payload: ICreatePropertyRequestParams['payload'];
};

const SEED_PROPERTIES: PropertySeed[] = [
  // ── Priya Sharma — Mumbai & Rajasthan ───────────────────────────────────────
  {
    hostIndex: 0,
    payload: {
      details: {
        title: 'Sea-View Penthouse in Bandra West',
        description:
          "Wake up to the Arabian Sea from this stunning 3-bedroom penthouse on Carter Road, Bandra West — Mumbai's most sought-after address. Wraparound terrace, designer interiors, and sweeping sunset views over the sea make this a truly rare Mumbai experience.",
        propertyType: EPropertyType.CONDO,
      },
      address: {
        addressLine1: '14 Carter Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400050',
        latitude: 19.0596,
        longitude: 72.8295,
      },
      pricing: {
        basePrice: 220,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 40 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 30,
        maxGuests: 6,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: true,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.washer,
        A.tv,
        A.balcony,
        A.oceanView,
        A.gym,
        A.parking,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: [
        'bandra-penthouse-1',
        'bandra-penthouse-2',
        'bandra-penthouse-3',
        'bandra-penthouse-4',
      ],
    },
  },
  {
    hostIndex: 0,
    payload: {
      details: {
        title: 'Heritage Haveli in Jaipur Old City',
        description:
          'A lovingly restored 19th-century haveli in the heart of the Pink City, steps from Hawa Mahal and the City Palace. Ornate jharokha windows, hand-painted frescoes, a central courtyard, and a rooftop terrace with views of the Nahargarh Fort make this an unforgettable Rajasthan stay.',
        propertyType: EPropertyType.VILLA,
      },
      address: {
        addressLine1: 'Gangori Bazaar Lane 3',
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        postalCode: '302002',
        latitude: 26.9239,
        longitude: 75.8267,
      },
      pricing: {
        basePrice: 185,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 35 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 21,
        maxGuests: 8,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.garden,
        A.cityView,
        A.parking,
        A.smokeDetector,
        A.firstAid,
        A.concierge,
      ],
      imageUrls: [
        'jaipur-haveli-1',
        'jaipur-haveli-2',
        'jaipur-haveli-3',
        'jaipur-haveli-4',
      ],
    },
  },
  {
    hostIndex: 0,
    payload: {
      details: {
        title: 'Lake Pichola View Villa in Udaipur',
        description:
          'A private villa perched above Lake Pichola with unobstructed views of the iconic Lake Palace and the City Palace complex. A private pool, traditional Mewari architecture, and a rooftop dining area position this as the finest stay in Udaipur — the City of Lakes.',
        propertyType: EPropertyType.VILLA,
      },
      address: {
        addressLine1: 'Lal Ghat Road',
        city: 'Udaipur',
        state: 'Rajasthan',
        country: 'India',
        postalCode: '313001',
        latitude: 24.5854,
        longitude: 73.6832,
      },
      pricing: {
        basePrice: 260,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 55 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 15,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 21,
        maxGuests: 6,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: true,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.pool,
        A.tv,
        A.balcony,
        A.cityView,
        A.parking,
        A.smokeDetector,
        A.firstAid,
        A.concierge,
      ],
      imageUrls: [
        'udaipur-villa-1',
        'udaipur-villa-2',
        'udaipur-villa-3',
        'udaipur-villa-4',
      ],
    },
  },
  {
    hostIndex: 0,
    payload: {
      details: {
        title: 'French Colonial Villa in Pondicherry',
        description:
          'A beautifully restored French colonial bungalow in White Town, Pondicherry, with wide verandahs, high ceilings, and a private courtyard garden. Steps from Promenade Beach and the best cafes on Rue Suffren — this is the most romantic address on the Coromandel Coast.',
        propertyType: EPropertyType.VILLA,
      },
      address: {
        addressLine1: '18 Rue Suffren',
        city: 'Pondicherry',
        state: 'Puducherry',
        country: 'India',
        postalCode: '605001',
        latitude: 11.934,
        longitude: 79.8297,
      },
      pricing: {
        basePrice: 145,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 30 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 30,
        maxGuests: 4,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.garden,
        A.balcony,
        A.beachAccess,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: ['pondy-villa-1', 'pondy-villa-2', 'pondy-villa-3'],
    },
  },
  // ── Arjun Mehta — Mumbai, Delhi & Goa ───────────────────────────────────────
  {
    hostIndex: 1,
    payload: {
      details: {
        title: 'Art Deco Studio in Colaba',
        description:
          "A meticulously restored Art Deco studio apartment in Mumbai's iconic Colaba neighborhood, within walking distance of the Gateway of India, the Taj Mahal Palace Hotel, and Sassoon Docks. Original mosaic floors and curved windows give this compact gem unmatched character.",
        propertyType: EPropertyType.STUDIO,
      },
      address: {
        addressLine1: '7 Wodehouse Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400005',
        latitude: 18.922,
        longitude: 72.8347,
      },
      pricing: {
        basePrice: 95,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 20 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 1,
        maxNights: 14,
        maxGuests: 2,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.cityView,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: ['colaba-studio-1', 'colaba-studio-2', 'colaba-studio-3'],
    },
  },
  {
    hostIndex: 1,
    payload: {
      details: {
        title: 'Hauz Khas Village Apartment',
        description:
          "Stylish 2-bedroom apartment in the heart of Hauz Khas Village, Delhi's most bohemian neighborhood. Rooftop views of the 14th-century Hauz Khas Complex and deer park, surrounded by galleries, indie cafes, and boutiques. The perfect base for design-minded Delhi explorers.",
        propertyType: EPropertyType.APARTMENT,
      },
      address: {
        addressLine1: '12 Hauz Khas Village',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        postalCode: '110016',
        latitude: 28.5494,
        longitude: 77.2001,
      },
      pricing: {
        basePrice: 110,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 25 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 30,
        maxGuests: 4,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.washer,
        A.cityView,
        A.parking,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: ['hauz-khas-apt-1', 'hauz-khas-apt-2', 'hauz-khas-apt-3'],
    },
  },
  {
    hostIndex: 1,
    payload: {
      details: {
        title: 'Portuguese Heritage House in Panjim',
        description:
          "A stunning 18th-century Indo-Portuguese mansion in Panjim's atmospheric Fontainhas Latin Quarter — India's only officially recognized Latin Quarter. Azulejo-tiled facades, a shaded verandah, and original teak wood furniture tell centuries of Goan history in the heart of the state capital.",
        propertyType: EPropertyType.HOUSE,
      },
      address: {
        addressLine1: '31 Rua de Ourem, Fontainhas',
        city: 'Panaji',
        state: 'Goa',
        country: 'India',
        postalCode: '403001',
        latitude: 15.4909,
        longitude: 73.8278,
      },
      pricing: {
        basePrice: 130,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 30 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 30,
        maxGuests: 6,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.garden,
        A.parking,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: [
        'panjim-heritage-1',
        'panjim-heritage-2',
        'panjim-heritage-3',
      ],
    },
  },
  {
    hostIndex: 1,
    payload: {
      details: {
        title: 'Heritage Home in Fort Kochi',
        description:
          'A charming Dutch-era heritage home on Princess Street, Fort Kochi, a short walk from the iconic Chinese fishing nets and St. Francis Church. Antique rosewood furniture, high-pitched tiled roofs, and a lush inner garden create an atmosphere unlike anywhere else in India.',
        propertyType: EPropertyType.HOUSE,
      },
      address: {
        addressLine1: '42 Princess Street',
        city: 'Fort Kochi',
        state: 'Kerala',
        country: 'India',
        postalCode: '682001',
        latitude: 9.9639,
        longitude: 76.243,
      },
      pricing: {
        basePrice: 120,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 25 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 30,
        maxGuests: 5,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.garden,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: ['fort-kochi-1', 'fort-kochi-2', 'fort-kochi-3'],
    },
  },
  // ── Kavya Nair — Delhi & Bangalore ──────────────────────────────────────────
  {
    hostIndex: 2,
    payload: {
      details: {
        title: 'South Extension Luxury Penthouse',
        description:
          "A glamorous 4-bedroom penthouse with a private rooftop terrace in one of Delhi's most prestigious addresses. Floor-to-ceiling glass, a curated art collection, a jacuzzi, and views from Lutyens' Delhi to the Qutub Minar make this the city's ultimate luxury pad.",
        propertyType: EPropertyType.CONDO,
      },
      address: {
        addressLine1: 'B-32 South Extension Part II',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        postalCode: '110049',
        latitude: 28.5651,
        longitude: 77.2253,
      },
      pricing: {
        basePrice: 310,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 70 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 15,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 30,
        maxGuests: 8,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        enableWaitlist: true,
        cancellationPolicy: EPropertyCancellationPolicy.STRICT,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.washer,
        A.tv,
        A.hotTub,
        A.balcony,
        A.cityView,
        A.gym,
        A.parking,
        A.smokeDetector,
        A.firstAid,
        A.concierge,
      ],
      imageUrls: [
        'delhi-penthouse-1',
        'delhi-penthouse-2',
        'delhi-penthouse-3',
        'delhi-penthouse-4',
      ],
    },
  },
  {
    hostIndex: 2,
    payload: {
      details: {
        title: 'Indiranagar Designer Loft',
        description:
          "A high-ceilinged designer loft in the heart of Bangalore's trendiest neighborhood. The 100-Feet Road strip of craft beer bars, farm-to-table restaurants, and live music venues is at your doorstep. Works equally well as a creative retreat or a launchpad for Bangalore's nightlife.",
        propertyType: EPropertyType.LOFT,
      },
      address: {
        addressLine1: '12th Main, HAL 2nd Stage',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560038',
        latitude: 12.9784,
        longitude: 77.6408,
      },
      pricing: {
        basePrice: 105,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 20 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 30,
        maxGuests: 3,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.washer,
        A.tv,
        A.cityView,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: [
        'indiranagar-loft-1',
        'indiranagar-loft-2',
        'indiranagar-loft-3',
      ],
    },
  },
  {
    hostIndex: 2,
    payload: {
      details: {
        title: 'Koramangala Modern Townhouse',
        description:
          "A sleek 3-bedroom townhouse in Bangalore's startup capital, Koramangala. Spread across three levels with a private terrace, home theatre, and a landscaped garden, this is the perfect base for tech professionals and families exploring India's Silicon Valley.",
        propertyType: EPropertyType.TOWNHOUSE,
      },
      address: {
        addressLine1: '80 Feet Road, 4th Block',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560034',
        latitude: 12.9352,
        longitude: 77.6245,
      },
      pricing: {
        basePrice: 155,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 30 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 3,
        maxNights: 60,
        maxGuests: 6,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.washer,
        A.tv,
        A.garden,
        A.parking,
        A.bbq,
        A.smokeDetector,
        A.firstAid,
        A.fireExtinguisher,
      ],
      imageUrls: [
        'koramangala-townhouse-1',
        'koramangala-townhouse-2',
        'koramangala-townhouse-3',
        'koramangala-townhouse-4',
      ],
    },
  },
  {
    hostIndex: 2,
    payload: {
      details: {
        title: 'Juhu Beach Villa',
        description:
          "A private beachfront villa on Mumbai's glamorous Juhu Beach, the address of choice for Bollywood's finest. A private pool, direct beach access, lush tropical garden, and sunsets over the Arabian Sea. Surrounded by the best restaurants and boutiques the city has to offer.",
        propertyType: EPropertyType.VILLA,
      },
      address: {
        addressLine1: 'Juhu Tara Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400049',
        latitude: 19.1031,
        longitude: 72.8262,
      },
      pricing: {
        basePrice: 380,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 90 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 15,
            },
          },
        ],
      },
      policies: {
        minNights: 3,
        maxNights: 21,
        maxGuests: 10,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: true,
        cancellationPolicy: EPropertyCancellationPolicy.STRICT,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.washer,
        A.tv,
        A.pool,
        A.beachAccess,
        A.oceanView,
        A.garden,
        A.parking,
        A.bbq,
        A.smokeDetector,
        A.firstAid,
        A.concierge,
      ],
      imageUrls: [
        'juhu-villa-1',
        'juhu-villa-2',
        'juhu-villa-3',
        'juhu-villa-4',
      ],
    },
  },
  // ── Rohit Desai — Kerala & Himalayan ────────────────────────────────────────
  {
    hostIndex: 3,
    payload: {
      details: {
        title: 'Alleppey Backwaters Cottage',
        description:
          "A secluded lakeside cottage on the banks of Kerala's legendary backwaters in Alleppey, with a private jetty, canoe, and views of rice paddies and coconut groves reflected in glassy water. Breakfast of freshly cooked Kerala cuisine is served on the open-air deck every morning.",
        propertyType: EPropertyType.HOUSE,
      },
      address: {
        addressLine1: 'Punnamada Lake Road',
        city: 'Alappuzha',
        state: 'Kerala',
        country: 'India',
        postalCode: '688006',
        latitude: 9.4981,
        longitude: 76.3388,
      },
      pricing: {
        basePrice: 140,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 25 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 21,
        maxGuests: 4,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.garden,
        A.mountainView,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: [
        'alleppey-cottage-1',
        'alleppey-cottage-2',
        'alleppey-cottage-3',
      ],
    },
  },
  {
    hostIndex: 3,
    payload: {
      details: {
        title: 'Munnar Tea Estate Bungalow',
        description:
          "A sprawling British-era planter's bungalow set in the middle of a working tea estate at 1,600 meters in the Munnar hills. Wake up to mist rolling over endless rows of emerald green tea, sip freshly plucked tea on the wraparound veranda, and fall asleep to absolute silence.",
        propertyType: EPropertyType.VILLA,
      },
      address: {
        addressLine1: 'Chinnakanal Estate Road',
        city: 'Munnar',
        state: 'Kerala',
        country: 'India',
        postalCode: '685618',
        latitude: 10.0889,
        longitude: 77.0595,
      },
      pricing: {
        basePrice: 170,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 35 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 14,
        maxGuests: 6,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.garden,
        A.mountainView,
        A.parking,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: [
        'munnar-bungalow-1',
        'munnar-bungalow-2',
        'munnar-bungalow-3',
        'munnar-bungalow-4',
      ],
    },
  },
  {
    hostIndex: 3,
    payload: {
      details: {
        title: 'Old Manali Mountain Chalet',
        description:
          'A cozy alpine chalet with panoramic Himalayan views in the pine forests of Old Manali. Slate floors, a wood-burning fireplace, a private snow-facing deck, and handwoven Kullu shawls on the walls. The Beas River and the trek to Jogini Falls are just minutes away.',
        propertyType: EPropertyType.CABIN,
      },
      address: {
        addressLine1: 'Log Huts Area, Old Manali',
        city: 'Manali',
        state: 'Himachal Pradesh',
        country: 'India',
        postalCode: '175131',
        latitude: 32.2432,
        longitude: 77.1892,
      },
      pricing: {
        basePrice: 100,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 20 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 14,
        maxGuests: 4,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.tv,
        A.balcony,
        A.mountainView,
        A.parking,
        A.smokeDetector,
        A.firstAid,
        A.fireExtinguisher,
      ],
      imageUrls: ['manali-chalet-1', 'manali-chalet-2', 'manali-chalet-3'],
    },
  },
  {
    hostIndex: 3,
    payload: {
      details: {
        title: 'Varkala Clifftop Sea View Retreat',
        description:
          "A beautifully designed cottage perched on Varkala's dramatic laterite cliffs, 30 meters above the Arabian Sea. The private terrace offers front-row seats to jaw-dropping sunsets, while the serene Papanasam beach is a short cliff-walk away. Kerala ayurvedic treatments available on request.",
        propertyType: EPropertyType.HOUSE,
      },
      address: {
        addressLine1: 'North Cliff Road',
        city: 'Varkala',
        state: 'Kerala',
        country: 'India',
        postalCode: '695141',
        latitude: 8.7379,
        longitude: 76.7163,
      },
      pricing: {
        basePrice: 115,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 25 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 21,
        maxGuests: 4,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.balcony,
        A.beachAccess,
        A.oceanView,
        A.garden,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: ['varkala-cliff-1', 'varkala-cliff-2', 'varkala-cliff-3'],
    },
  },
  // ── Ananya Iyer — Goa & Coorg & Rishikesh ───────────────────────────────────
  {
    hostIndex: 4,
    payload: {
      details: {
        title: 'Calangute Beachfront Villa',
        description:
          'A stunning whitewashed villa directly on Calangute Beach, North Goa, with a private pool, palm-fringed garden, and direct beach access. Spacious open-plan living, 4 ensuite bedrooms, an outdoor bar, and the gentle sound of the Arabian Sea make this Goa at its most indulgent.',
        propertyType: EPropertyType.VILLA,
      },
      address: {
        addressLine1: 'Calangute Beach Road',
        city: 'Calangute',
        state: 'Goa',
        country: 'India',
        postalCode: '403516',
        latitude: 15.5437,
        longitude: 73.7567,
      },
      pricing: {
        basePrice: 290,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 65 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 15,
            },
          },
        ],
      },
      policies: {
        minNights: 3,
        maxNights: 21,
        maxGuests: 8,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: true,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.noPets, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.washer,
        A.tv,
        A.pool,
        A.beachAccess,
        A.oceanView,
        A.garden,
        A.bbq,
        A.parking,
        A.smokeDetector,
        A.firstAid,
        A.concierge,
      ],
      imageUrls: [
        'calangute-villa-1',
        'calangute-villa-2',
        'calangute-villa-3',
        'calangute-villa-4',
      ],
    },
  },
  {
    hostIndex: 4,
    payload: {
      details: {
        title: 'Anjuna Bohemian Clifftop House',
        description:
          "A free-spirited 3-bedroom house on the rocky cliffs above Anjuna, the birthplace of Goa's legendary trance scene. Indo-Portuguese architecture, a split-level terrace with 180° sea views, and sunset views from the hilltop make this the ultimate North Goa escape for the creative soul.",
        propertyType: EPropertyType.HOUSE,
      },
      address: {
        addressLine1: 'Cliff Top, Anjuna',
        city: 'Anjuna',
        state: 'Goa',
        country: 'India',
        postalCode: '403509',
        latitude: 15.5803,
        longitude: 73.7432,
      },
      pricing: {
        basePrice: 180,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 40 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 30,
        maxGuests: 6,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.balcony,
        A.oceanView,
        A.garden,
        A.bbq,
        A.parking,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: ['anjuna-house-1', 'anjuna-house-2', 'anjuna-house-3'],
    },
  },
  {
    hostIndex: 4,
    payload: {
      details: {
        title: 'Rishikesh Riverside Retreat',
        description:
          'A tranquil 3-bedroom retreat on the banks of the Ganges in Tapovan, Rishikesh — the Yoga Capital of the World. Sit on the riverside deck listening to evening aarti from Ram Jhula, practice sunrise yoga on the private ghat, and spend days exploring the Himalayan foothills.',
        propertyType: EPropertyType.HOUSE,
      },
      address: {
        addressLine1: 'Tapovan Road, Ram Jhula',
        city: 'Rishikesh',
        state: 'Uttarakhand',
        country: 'India',
        postalCode: '249192',
        latitude: 30.1354,
        longitude: 78.3069,
      },
      pricing: {
        basePrice: 120,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 25 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 21,
        maxGuests: 6,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: false,
        cancellationPolicy: EPropertyCancellationPolicy.FLEXIBLE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.tv,
        A.balcony,
        A.mountainView,
        A.garden,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: [
        'rishikesh-retreat-1',
        'rishikesh-retreat-2',
        'rishikesh-retreat-3',
      ],
    },
  },
  {
    hostIndex: 4,
    payload: {
      details: {
        title: 'Coorg Coffee Plantation Bungalow',
        description:
          "An exquisite British-era planter's bungalow set on a 40-acre private coffee estate in the misty hills of Coorg (Kodagu). Fragrant arabica plants surround the bungalow, which features original Burma teak floors, a fireplace, a private infinity pool, and views of the Brahmagiri ranges.",
        propertyType: EPropertyType.VILLA,
      },
      address: {
        addressLine1: 'Galibeedu Estate Road',
        city: 'Madikeri',
        state: 'Karnataka',
        country: 'India',
        postalCode: '571201',
        latitude: 12.4244,
        longitude: 75.7382,
      },
      pricing: {
        basePrice: 210,
        currency: 'USD',
        charges: [
          {
            type: EPropertyChargeTypes.CLEANING_FEE,
            chargeFee: { type: EPropertyChargeFeeTypes.FIXED, value: 45 },
          },
          {
            type: EPropertyChargeTypes.SERVICE_FEE,
            chargeFee: {
              type: EPropertyChargeFeeTypes.PERCENTAGE,
              value: 12,
            },
          },
        ],
      },
      policies: {
        minNights: 2,
        maxNights: 14,
        maxGuests: 8,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        enableWaitlist: true,
        cancellationPolicy: EPropertyCancellationPolicy.MODERATE,
      },
      rules: [R.petsOk, R.noSmoke, R.noParty, R.quiet],
      amenities: [
        A.wifi,
        A.kitchen,
        A.ac,
        A.tv,
        A.pool,
        A.garden,
        A.mountainView,
        A.parking,
        A.bbq,
        A.smokeDetector,
        A.firstAid,
      ],
      imageUrls: [
        'coorg-bungalow-1',
        'coorg-bungalow-2',
        'coorg-bungalow-3',
        'coorg-bungalow-4',
      ],
    },
  },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly userService: UserService,
    private readonly propertyService: PropertyService,
    private readonly storageService: StorageService,
  ) {}

  async seed(): Promise<{
    hosts: number;
    properties: number;
    skipped: boolean;
  }> {
    const existing = await this.userService.findByEmail(SEED_HOSTS[0].email);
    if (existing) {
      return { hosts: 0, properties: 0, skipped: true };
    }

    this.logger.log('Creating seed hosts...');
    const hostIds: string[] = [];

    for (const host of SEED_HOSTS) {
      const hashed = await bcrypt.hash(host.password, 10);
      const user = await this.userService.create({
        email: host.email,
        password: hashed,
        name: host.name,
        role: EUserRole.HOST,
      });
      hostIds.push(user.id);
      this.logger.log(`Created host: ${host.name} (${host.email})`);
    }

    this.logger.log('Creating seed properties...');
    let created = 0;

    for (const seed of SEED_PROPERTIES) {
      const hostId = hostIds[seed.hostIndex];
      const user: { id: string; role: string } = {
        id: hostId,
        role: EUserRole.HOST,
      };

      const imageUrls = await Promise.all(
        (seed.payload.imageUrls ?? []).map((name) =>
          this.uploadSeedImage(hostId, name),
        ),
      );

      await this.propertyService.createProperty({
        user,
        payload: { ...seed.payload, imageUrls },
      });
      created++;
      this.logger.log(`Created property: ${seed.payload.details.title}`);
    }

    return { hosts: hostIds.length, properties: created, skipped: false };
  }

  private async uploadSeedImage(hostId: string, name: string): Promise<string> {
    const response = await fetch(
      `https://picsum.photos/seed/${name}/1200/800`,
      { redirect: 'follow' },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch seed image "${name}": ${response.status}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const key = `uploads/general/${hostId}/${randomUUID()}-${name}.jpg`;

    await this.storageService.putObject(key, buffer, 'image/jpeg');
    return this.storageService.getPublicUrl(key);
  }
}
