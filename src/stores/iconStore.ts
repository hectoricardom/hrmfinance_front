import { createStore } from "solid-js/store";
import { createRoot } from "solid-js";

export interface IconDefinition {
  name: string;
  svg: string;
  category: 'finance' | 'operations' | 'management' | 'actions' | 'status' | 'navigation' | 'products' | 'system';
}

// SVG Icon definitions
const iconDefinitions: Record<string, IconDefinition> = {
  // Finance Icons
  'finance': {
    name: 'finance',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9M19 21H5V3H13V9H19Z"/></svg>'
  },
  'accounts': {
    name: 'accounts',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3V21H21V19H5V3H3M9 17H7V10H9V17M13 17H11V7H13V17M17 17H15V13H17V17Z"/></svg>'
  },
  'books': {
    name: 'books',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 2L14 6.5V17.5L19 13V2M6.5 5C4.55 5 2.45 5.4 1 6.5V21.16C1 21.41 1.25 21.66 1.5 21.66C1.6 21.66 1.65 21.59 1.75 21.59C3.1 20.94 5.05 20.5 6.5 20.5C8.45 20.5 10.55 20.9 12 22C13.35 21.15 15.8 20.5 17.5 20.5C19.15 20.5 20.85 20.81 22.25 21.56C22.35 21.61 22.4 21.59 22.5 21.59C22.75 21.59 23 21.34 23 21.09V6.5C22.4 6.05 21.75 5.75 21 5.5V19C19.9 18.65 18.7 18.5 17.5 18.5C15.8 18.5 13.35 19.15 12 20V6.5C10.55 5.4 8.45 5 6.5 5Z"/></svg>'
  },
  'balance-sheet': {
    name: 'balance-sheet',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H9V8H7V14M11 14H13V8H11V14M15 14H17V8H15V14M5 21H19V19H5V21M5 7H19V5H5V7Z"/></svg>'
  },
  'bank': {
    name: 'bank',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 1L2 6V8H22V6M16 10V17H20V10M4 10V17H8V10M10 10V17H14V10M2 19H22V21H2Z"/></svg>'
  },
  'automation-target': {
    name: 'automation-target',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C17.5 2 22 6.5 22 12S17.5 22 12 22 2 17.5 2 12 6.5 2 12 2M12 4C7.58 4 4 7.58 4 12S7.58 20 12 20 20 16.42 20 12 16.42 4 12 4M12 6C15.31 6 18 8.69 18 12S15.31 18 12 18 6 15.31 6 12 8.69 6 12 6M12 8C9.79 8 8 9.79 8 12S9.79 16 12 16 16 14.21 16 12 14.21 8 12 8M12 10C13.1 10 14 10.9 14 12S13.1 14 12 14 10 13.1 10 12 10.9 10 12 10Z"/></svg>'
  },
  'automation-bolt': {
    name: 'automation-bolt',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 4H6L13 12H9L15 20H20L13 12H17L11 4Z"/></svg>'
  },

  // Operations Icons
  'operations': {
    name: 'operations',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"/></svg>'
  },
  'inventory': {
    name: 'inventory',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"/></svg>'
  },
  'invoice': {
    name: 'invoice',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19M17 17H7V15H17V17M17 13H7V11H17V13M17 9H7V7H17V9Z"/></svg>'
  },
  'shipping': {
    name: 'shipping',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4H16.5L21 8.5V17H18.5C18.5 18.38 17.38 19.5 16 19.5S13.5 18.38 13.5 17H8.5C8.5 18.38 7.38 19.5 6 19.5S3.5 18.38 3.5 17H1V6C1 4.89 1.89 4 3 4M16 18C16.55 18 17 17.55 17 17S16.55 16 16 16 15 16.45 15 17 15.45 18 16 18M6 18C6.55 18 7 17.55 7 17S6.55 16 6 16 5 16.45 5 17 5.45 18 6 18M15 8.5H19.5L16.5 5.5H15V8.5Z"/></svg>'
  },
  'passport': {
    name: 'passport',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.89 2 4 2.89 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2M18 20H6V4H13V9H18V20M16 11H8V13H16V11M16 15H8V17H16V15M12 6.5C13.38 6.5 14.5 7.62 14.5 9S13.38 11.5 12 11.5 9.5 10.38 9.5 9 10.62 6.5 12 6.5Z"/></svg>'
  },

  // Management Icons
  'management': {
    name: 'management',
    category: 'management',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 4C18.2 4 20 5.8 20 8S18.2 12 16 12C13.8 12 12 10.2 12 8S13.8 4 16 4M16 13C18.67 13 22 14.33 22 17V20H10V17C10 14.33 13.33 13 16 13M8 12C10.21 12 12 10.21 12 8S10.21 4 8 4 4 5.79 4 8 5.79 12 8 12M8 13C5.33 13 0 14.33 0 17V20H8V17.5C8 15.5 8.5 13.7 9.5 13.2C9 13.1 8.5 13 8 13Z"/></svg>'
  },
  'employees': {
    name: 'employees',
    category: 'management',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 4C18.2 4 20 5.8 20 8S18.2 12 16 12C13.8 12 12 10.2 12 8S13.8 4 16 4M16 13C18.67 13 22 14.33 22 17V20H10V17C10 14.33 13.33 13 16 13M8 12C10.21 12 12 10.21 12 8S10.21 4 8 4 4 5.79 4 8 5.79 12 8 12M8 13C5.33 13 0 14.33 0 17V20H8V17.5C8 15.5 8.5 13.7 9.5 13.2C9 13.1 8.5 13 8 13Z"/></svg>'
  },
  'admin': {
    name: 'admin',
    category: 'management',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5C10.07 15.5 8.5 13.93 8.5 12S10.07 8.5 12 8.5 15.5 10.07 15.5 12 13.93 15.5 12 15.5M19.43 12.98C19.47 12.66 19.5 12.34 19.5 12S19.47 11.34 19.43 11.02L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.97 19.05 5.05L16.56 6.05C16.04 5.65 15.48 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.52 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.72 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11.02C4.53 11.34 4.5 11.67 4.5 12S4.53 12.66 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.72 19.03 4.95 18.95L7.44 17.95C7.96 18.35 8.52 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.48 18.68 16.04 18.34 16.56 17.95L19.05 18.95C19.28 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"/></svg>'
  },

  // Navigation Icons
  'dashboard': {
    name: 'dashboard',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3V9H21V3M13 21H21V11H13M3 21H11V15H3M3 13H11V3H3V13Z"/></svg>'
  },

  // Action Icons
  'add': {
    name: 'add',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>'
  },
  'delete': {
    name: 'delete',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4H15.5L14.5 3H9.5L8.5 4H5V6H19M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19Z"/></svg>'
  },
  'edit': {
    name: 'edit',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.71 7.04C21.1 6.65 21.1 6 20.71 5.63L18.37 3.29C18 2.9 17.35 2.9 16.96 3.29L15.12 5.12L18.87 8.87M3 17.25V21H6.75L17.81 9.93L14.06 6.18L3 17.25Z"/></svg>'
  },
  'save': {
    name: 'save',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 9H5V5H15M12 19C9.24 19 7 16.76 7 14S9.24 9 12 9 17 11.24 17 14 14.76 19 12 19M17 3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3Z"/></svg>'
  },
  'print': {
    name: 'print',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 3H6V7H18M19 12C18.4 12 18 11.6 18 11S18.4 10 19 10 20 10.4 20 11 19.6 12 19 12M16 19H8V14H16M19 8H5C3.9 8 3 8.9 3 10V17H6V21H18V17H21V10C21 8.9 20.1 8 19 8Z"/></svg>'
  },
  'search': {
    name: 'search',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 3C13.09 3 16 5.91 16 9.5C16 11.11 15.41 12.59 14.44 13.73L14.71 14H15.5L20.5 19L19 20.5L14 15.5V14.71L13.73 14.44C12.59 15.41 11.11 16 9.5 16C5.91 16 3 13.09 3 9.5S5.91 3 9.5 3M9.5 5C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5Z"/></svg>'
  },
  'clear': {
    name: 'clear',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/></svg>'
  },
  'close': {
    name: 'close',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/></svg>'
  },
  'copy': {
    name: 'copy',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 21H8V7H19M19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1Z"/></svg>'
  },
  'file': {
    name: 'file',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2M18 20H6V4H13V9H18V20Z"/></svg>'
  },

  // Status Icons
  'success': {
    name: 'success',
    category: 'status',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9M19 21H5V3H13V9H19Z"/></svg>'
  },
  'warning': {
    name: 'warning',
    category: 'status',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21H23L12 2L1 21M13 18H11V16H13V18M13 14H11V10H13V14Z"/></svg>'
  },
  'error': {
    name: 'error',
    category: 'status',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C17.5 2 22 6.5 22 12S17.5 22 12 22 2 17.5 2 12 6.5 2 12 2M12 4C7.58 4 4 7.58 4 12S7.58 20 12 20 20 16.42 20 12 16.42 4 12 4M15.59 7L12 10.59L8.41 7L7 8.41L10.59 12L7 15.59L8.41 17L12 13.41L15.59 17L17 15.59L13.41 12L17 8.41L15.59 7Z"/></svg>'
  },
  'info': {
    name: 'info',
    category: 'status',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 8C13.1 8 14 8.9 14 10V20C14 21.1 13.1 22 12 22S10 21.1 10 20V10C10 8.9 10.9 8 12 8Z"/></svg>'
  },
  'loading': {
    name: 'loading',
    category: 'status',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V2C17.5 2 22 6.5 22 12H20C20 7.58 16.42 4 12 4Z"><animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>'
  },

  // Product Category Icons
  'monitor': {
    name: 'monitor',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16H3V4H21M21 2H3C1.89 2 1 2.89 1 4V16C1 17.1 1.89 18 3 18H10V20H8V22H16V20H14V18H21C22.1 18 23 17.1 23 16V4C23 2.89 22.1 2 21 2Z"/></svg>'
  },
  'tv': {
    name: 'tv',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 17H3V5H21M21 3H3C1.89 3 1 3.89 1 5V17C1 18.1 1.89 19 3 19H8V21H16V19H21C22.1 19 23 18.1 23 17V5C23 3.89 22.1 3 21 3Z"/></svg>'
  },
  'laptop': {
    name: 'laptop',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H20V16H4M20 18C21.11 18 22 17.11 22 16V6C22 4.89 21.11 4 20 4H4C2.89 4 2 4.89 2 6V16C2 17.11 2.89 18 4 18H0V20H24V18H20Z"/></svg>'
  },
  'generator': {
    name: 'generator',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2V13H10V22L17 10H13L17 2H7Z"/></svg>'
  },
  'power': {
    name: 'power',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.56 5.44L15.11 6.89C16.84 7.94 18 9.83 18 12C18 15.31 15.31 18 12 18S6 15.31 6 12C6 9.83 7.16 7.94 8.88 6.88L7.44 5.44C5.36 6.88 4 9.28 4 12C4 16.42 7.58 20 12 20S20 16.42 20 12C20 9.28 18.64 6.88 16.56 5.44M13 3H11V13H13"/></svg>'
  },
  'sound': {
    name: 'sound',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18 19.86 21 16.28 21 12C21 7.72 18 4.14 14 3.23M16.5 12C16.5 10.23 15.5 8.71 14 7.97V16C15.5 15.29 16.5 13.76 16.5 12M3 9V15H7L12 20V4L7 9H3Z"/></svg>'
  },
  'printer': {
    name: 'printer',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 3H6V7H18M19 12C18.4 12 18 11.6 18 11S18.4 10 19 10 20 10.4 20 11 19.6 12 19 12M16 19H8V14H16M19 8H5C3.9 8 3 8.9 3 10V17H6V21H18V17H21V10C21 8.9 20.1 8 19 8Z"/></svg>'
  },
  'fax': {
    name: 'fax',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2V20C2 21.11 2.89 22 4 22H18V20H4V6M20 2H8C6.89 2 6 2.89 6 4V16C6 17.11 6.89 18 8 18H20C21.11 18 22 17.11 22 16V4C22 2.89 21.11 2 20 2M20 12H8V14H20V12M20 8H8V10H20V8M20 4H8V6H20V4Z"/></svg>'
  },
  'refrigerator': {
    name: 'refrigerator',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2H15C16.1 2 17 2.9 17 4V9H15V4H9V9H7V4C7 2.9 7.9 2 9 2M7 10V20C7 21.1 7.9 22 9 22H15C16.1 22 17 21.1 17 20V10H7M15 11V13H13V11H15M15 14V17H13V14H15Z"/></svg>'
  },
  'fan': {
    name: 'fan',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 11C12.6 11 13 11.4 13 12S12.6 13 12 13 11 12.6 11 12 11.4 11 12 11M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2M12 22L10.91 15.74L2 15L10.91 14.26L12 8L13.09 14.26L22 15L13.09 15.74L12 22Z"/></svg>'
  },
  'coffee': {
    name: 'coffee',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 19H20L18 17H4L2 19M5 4V7H3V9H4V14H18V9H19V7H17V4H5M7 6H15V7H7V6Z"/></svg>'
  },
  'microphone': {
    name: 'microphone',
    category: 'products',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12S10 11.1 10 10V4C10 2.9 10.9 2 12 2M19 10V12C19 15.9 15.9 19 12 19S5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17S17 14.8 17 12V10H19M12 19.9V22H8V24H16V22H12V19.9Z"/></svg>'
  },

  // System Icons
  'robot': {
    name: 'robot',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9M19 21H5V3H13V9H19Z"/></svg>'
  },
  'hand': {
    name: 'hand',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 15C23 18.31 20.31 21 17 21C14.98 21 13.2 20.23 12 18.95C10.8 20.23 9.02 21 7 21C3.69 21 1 18.31 1 15V9C1 8.45 1.45 8 2 8S3 8.45 3 9V15C3 17.21 4.79 19 7 19S11 17.21 11 15V11C11 9.9 11.9 9 13 9S15 9.9 15 11V15C15 17.21 16.79 19 19 19S23 17.21 23 15V9C23 8.45 22.55 8 22 8S21 8.45 21 9V15Z"/></svg>'
  },
  'folder-open': {
    name: 'folder-open',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 20H4C2.89 20 2 19.1 2 18V6C2 4.89 2.89 4 4 4H10L12 6H19C20.1 6 21 6.89 21 8H21L4 8V18L6.14 10H23.21L20.93 18.5C20.7 19.37 19.92 20 19 20Z"/></svg>'
  },
  'folder-closed': {
    name: 'folder-closed',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4C2.89 4 2 4.89 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.89 21.1 6 20 6H12L10 4Z"/></svg>'
  },

  // Movement and shipping icons
  'stock-in': {
    name: 'stock-in',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"/></svg>'
  },
  'stock-out': {
    name: 'stock-out',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14L5 12L5 10L12 3L19 10V12L17 14H7M12 6.8L9 9.8H15L12 6.8Z"/></svg>'
  },
  'transfer': {
    name: 'transfer',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.99 11L3 15L6.99 19V16H14V14H6.99V11M21 9L17.01 5V8H10V10H17.01V13L21 9Z"/></svg>'
  },
  'adjustment': {
    name: 'adjustment',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5C10.07 15.5 8.5 13.93 8.5 12S10.07 8.5 12 8.5 15.5 10.07 15.5 12 13.93 15.5 12 15.5M19.43 12.98C19.47 12.66 19.5 12.34 19.5 12S19.47 11.34 19.43 11.02L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.97 19.05 5.05L16.56 6.05C16.04 5.65 15.48 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.52 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.72 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11.02C4.53 11.34 4.5 11.67 4.5 12S4.53 12.66 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.72 19.03 4.95 18.95L7.44 17.95C7.96 18.35 8.52 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.48 18.68 16.04 18.34 16.56 17.95L19.05 18.95C19.28 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"/></svg>'
  },
  'maritime': {
    name: 'maritime',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4H16.5L21 8.5V17H18.5C18.5 18.38 17.38 19.5 16 19.5S13.5 18.38 13.5 17H8.5C8.5 18.38 7.38 19.5 6 19.5S3.5 18.38 3.5 17H1V6C1 4.89 1.89 4 3 4M16 18C16.55 18 17 17.55 17 17S16.55 16 16 16 15 16.45 15 17 15.45 18 16 18M6 18C6.55 18 7 17.55 7 17S6.55 16 6 16 5 16.45 5 17 5.45 18 6 18M15 8.5H19.5L16.5 5.5H15V8.5Z"/></svg>'
  },
  'airplane': {
    name: 'airplane',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"/></svg>'
  },

  // Status and indicators
  'location': {
    name: 'location',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C15.31 2 18 4.66 18 7.95C18 12.41 12 19 12 19S6 12.41 6 7.95C6 4.66 8.69 2 12 2M12 6C10.9 6 10 6.9 10 8S10.9 10 12 10 14 9.1 14 8 13.1 6 12 6Z"/></svg>'
  },
  'calendar': {
    name: 'calendar',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.89 20.1 3 19 3M19 19H5V8H19V19M7 10H12V15H7V10Z"/></svg>'
  },
  'category': {
    name: 'category',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4C2.89 4 2 4.89 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.89 21.1 6 20 6H12L10 4Z"/></svg>'
  },
  'lightbulb': {
    name: 'lightbulb',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.14 2 5 5.14 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.14 15.86 2 12 2M9.5 11.5C9.5 11.78 9.22 12 8.5 12S7.5 11.78 7.5 11.5S7.78 11 8.5 11 9.5 11.22 9.5 11.5M14.5 11.5C14.5 11.78 14.22 12 13.5 12S12.5 11.78 12.5 11.5S12.78 11 13.5 11 14.5 11.22 14.5 11.5M15 20C15 20.55 14.55 21 14 21H10C9.45 21 9 20.55 9 20V19H15V20Z"/></svg>'
  },
  'cash': {
    name: 'cash',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6H21V18H3V6M12 9C10.89 9 10 9.89 10 11S10.89 13 12 13 14 12.11 14 11 13.11 9 12 9M18 8V10H21V8H18M3 8V10H6V8H3Z"/></svg>'
  },
  'credit-card': {
    name: 'credit-card',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4M20 11H4V8H20V11Z"/></svg>'
  },
  'money-transfer': {
    name: 'money-transfer',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 14C17.2 14 19 15.8 19 18S17.2 22 15 22 11 20.2 11 18 12.8 14 15 14M15 16C13.9 16 13 16.9 13 18S13.9 20 15 20 17 19.1 17 18 16.1 16 15 16M9 8C11.21 8 13 6.21 13 4S11.21 2 9 2 5 3.79 5 6 6.79 8 9 8M9 4C10.1 4 11 4.9 11 6S10.1 8 9 8 7 7.1 7 6 7.9 4 9 4M18 10L16 8L14 10L16 12L18 10M1 18H3V10H1V18M21 18H23V10H21V18M5 12L7 10L5 8L3 10L5 12Z"/></svg>'
  },
  'warehouse': {
    name: 'warehouse',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12H5V20H19V12H22L12 3M12 7.7L17 11.9V18H15V13H9V18H7V11.9L12 7.7M11 14H13V16H11V14Z"/></svg>'
  },
  'store': {
    name: 'store',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L4 9V21H20V9L12 3M18 19H6V10L12 5.69L18 10V19M8 12H16V14H8V12Z"/></svg>'
  },
  'supplier': {
    name: 'supplier',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 15H16V17H18M18 11H16V13H18M20 19H12V17H14V15H12V13H14V11H12V9H20M10 7H8V5H10M10 11H8V9H10M10 15H8V13H10M10 19H8V17H10M6 7H4V5H6M6 11H4V9H6M6 15H4V13H6M6 19H4V17H6M12 7V3H2V21H22V7H12Z"/></svg>'
  },
  'customer': {
    name: 'customer',
    category: 'management',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C14.21 4 16 5.79 16 8S14.21 12 12 12 8 10.21 8 8 9.79 4 12 4M12 14C16.42 14 20 15.79 20 18V20H4V18C4 15.79 7.58 14 12 14Z"/></svg>'
  },
  'quick': {
    name: 'quick',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2V13H10V22L17 10H13L17 2H7Z"/></svg>'
  },
  'template': {
    name: 'template',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19M17 17H7V15H17V17M17 13H7V11H17V13M17 9H7V7H17V9Z"/></svg>'
  },
  'check': {
    name: 'check',
    category: 'status',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 7L9 19L3.5 13.5L4.91 12.09L9 16.17L19.59 5.59L21 7Z"/></svg>'
  },
  'uncheck': {
    name: 'uncheck',
    category: 'status',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19Z"/></svg>'
  },
  'signature': {
    name: 'signature',
    category: 'status',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22,22H2V20H22V22M6.2,17.3L5.5,18L4.1,16.6L2.7,18L2,17.3L3.4,15.9L2,14.5L2.7,13.8L4.1,15.2L5.5,13.8L6.2,14.5L4.8,15.9L6.2,17.3M16.22,14.43C16.22,13.85 15.5,13.2 14.06,12.46C12.23,11.54 11,10.79 10.36,10.24C9.71,9.68 9.39,9.06 9.39,8.37C9.39,6.59 10.3,5.12 12.12,3.95C13.94,2.78 15.43,2.19 16.57,2.19C17.31,2.19 17.85,2.32 18.18,2.58C18.5,2.83 18.68,3.27 18.68,3.9C18.68,4.18 18.56,4.42 18.31,4.63C18.07,4.83 17.87,4.93 17.74,4.93C17.63,4.93 17.43,4.83 17.13,4.64L16.55,4.38C16.08,4.38 15.14,4.71 13.71,5.38C12.29,6.04 11.58,6.79 11.58,7.63C11.58,8.14 11.82,8.6 12.32,9C12.82,9.42 13.71,9.93 15,10.53C16.03,11 16.86,11.5 17.5,12.07C18.1,12.61 18.41,13.25 18.41,14C18.41,15.34 17.47,16.41 15.58,17.17C13.7,17.94 11.9,18.32 10.19,18.32C8.75,18.32 8,17.83 8,16.86C8,16.5 8.19,16.27 8.5,16.11C8.83,15.95 9.16,15.87 9.5,15.87L10.25,16L10.97,16.13C11.95,16.13 13,15.97 14.13,15.64C15.26,15.32 15.96,14.91 16.22,14.43Z"/></svg>'
  },
  'email': {
    name: 'email',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"/></svg>'
  },
  'mail': {
    name: 'mail',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"/></svg>'
  },
  'phone': {
    name: 'phone',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/></svg>'
  },
  'link': {
    name: 'link',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12C3.9 10.29 5.29 8.9 7 8.9H11V7H7C4.24 7 2 9.24 2 12S4.24 17 7 17H11V15.1H7C5.29 15.1 3.9 13.71 3.9 12ZM8 13H16V11H8V13ZM17 7H13V8.9H17C18.71 8.9 20.1 10.29 20.1 12S18.71 15.1 17 15.1H13V17H17C19.76 17 22 14.76 22 12S19.76 7 17 7Z"/></svg>'
  },
  'document': {
    name: 'document',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2M18 20H6V4H13V9H18V20Z"/></svg>'
  },
  'download': {
    name: 'download',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 20H19V18H5M19 9H15V3H9V9H5L12 16L19 9Z"/></svg>'
  },
  'upload': {
    name: 'upload',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16H15V10H19L12 3L5 10H9V16M5 20V18H19V20H5Z"/></svg>'
  },
  'eye': {
    name: 'eye',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9C13.38 9 14.5 10.12 14.5 11.5S13.38 14 12 14 9.5 12.88 9.5 11.5 10.62 9 12 9M12 7C9.79 7 7.8 8.24 6.71 10.09C6.34 10.68 6.34 11.32 6.71 11.91C7.8 13.76 9.79 15 12 15S16.2 13.76 17.29 11.91C17.66 11.32 17.66 10.68 17.29 10.09C16.2 8.24 14.21 7 12 7M12 4C7 4 2.73 7.11 1 11.5C2.73 15.89 7 19 12 19S21.27 15.89 23 11.5C21.27 7.11 17 4 12 4Z"/></svg>'
  },
  'camera': {
    name: 'camera',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5C10.29 15.5 8.9 14.11 8.9 12.4C8.9 10.69 10.29 9.3 12 9.3C13.71 9.3 15.1 10.69 15.1 12.4C15.1 14.11 13.71 15.5 12 15.5M19.43 12.97C19.47 12.65 19.5 12.33 19.5 12C19.5 11.67 19.47 11.34 19.43 11L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.96 19.05 5.05L16.56 6.05C16.04 5.66 15.5 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.5 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.73 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11C4.53 11.34 4.5 11.67 4.5 12C4.5 12.33 4.53 12.65 4.57 12.97L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.03 4.95 18.95L7.44 17.94C7.96 18.34 8.5 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.5 18.67 16.04 18.34 16.56 17.94L19.05 18.95C19.27 19.03 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.97Z"/></svg>'
  },
  'shopping-cart': {
    name: 'shopping-cart',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 18C15.89 18 15 18.89 15 20S15.89 22 17 22 19 21.11 19 20 18.11 18 17 18M1 2V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5H5.21L4.27 3H1M7 18C5.89 18 5 18.89 5 20S5.89 22 7 22 9 21.11 9 20 8.11 18 7 18Z"/></svg>'
  },
  'receipt': {
    name: 'receipt',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 17H6V15H18V17M18 13H6V11H18V13M18 9H6V7H18V9M3 22L4.5 20.5L6 22L7.5 20.5L9 22L10.5 20.5L12 22L13.5 20.5L15 22L16.5 20.5L18 22L19.5 20.5L21 22V2L19.5 3.5L18 2L16.5 3.5L15 2L13.5 3.5L12 2L10.5 3.5L9 2L7.5 3.5L6 2L4.5 3.5L3 2V22Z"/></svg>'
  },
  'home': {
    name: 'home',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z"/></svg>'
  },
  'settings': {
    name: 'settings',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 8C9.79 8 8 9.79 8 12S9.79 16 12 16 16 14.21 16 12 14.21 8 12 8M12 15.5C10.07 15.5 8.5 13.93 8.5 12S10.07 8.5 12 8.5 15.5 10.07 15.5 12 13.93 15.5 12 15.5M19.43 12.98C19.47 12.66 19.5 12.34 19.5 12S19.47 11.34 19.43 11.02L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.97 19.05 5.05L16.56 6.05C16.04 5.65 15.48 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.52 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.72 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11.02C4.53 11.34 4.5 11.67 4.5 12S4.53 12.66 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.72 19.03 4.95 18.95L7.44 17.95C7.96 18.35 8.52 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.48 18.68 16.04 18.34 16.56 17.95L19.05 18.95C19.28 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"/></svg>'
  },
  'filter': {
    name: 'filter',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 12V19.88C14.04 20.18 13.94 20.5 13.71 20.71C13.32 21.1 12.69 21.1 12.3 20.71L10.29 18.7C10.06 18.47 9.96 18.16 10 17.87V12H9.97L4.21 4.62C3.87 4.19 3.95 3.56 4.38 3.22C4.57 3.08 4.78 3 5 3V3H19V3C19.22 3 19.43 3.08 19.62 3.22C20.05 3.56 20.13 4.19 19.79 4.62L14.03 12H14Z"/></svg>'
  },
  'menu': {
    name: 'menu',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6H21V8H3V6M3 11H21V13H3V11M3 16H21V18H3V16Z"/></svg>'
  },
  'notification': {
    name: 'notification',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 21H14C14 22.1 13.1 23 12 23S10 22.1 10 21M21 19V20H3V19L5 17V11C5 7.9 7.03 5.17 10 4.29C10 4.19 10 4.1 10 4C10 2.9 10.9 2 12 2S14 2.9 14 4C14 4.1 14 4.19 14 4.29C16.97 5.17 19 7.9 19 11V17L21 19M17 11C17 8.24 14.76 6 12 6S7 8.24 7 11V18H17V11Z"/></svg>'
  },
  'lock': {
    name: 'lock',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3S15 4.34 15 6V8H9V6M18 20H6V10H18V20M12 17C13.1 17 14 16.1 14 15S13.1 13 12 13 10 13.9 10 15 10.9 17 12 17Z"/></svg>'
  },
  'whatsapp': {
    name: 'whatsapp',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"/></svg>'
  },
  'business': {
    name: 'business',
    category: 'management',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2V21H22V7H12M20 19H4V5H10V9H20V19Z"/></svg>'
  },
  'chevron-up': {
    name: 'chevron-up',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83L16.59 15.41L18 14L12 8L6 14L7.41 15.41Z"/></svg>'
  },
  'chevron-down': {
    name: 'chevron-down',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.58L12 13.17L16.59 8.58L18 10L12 16L6 10L7.41 8.58Z"/></svg>'
  },
  'chevron-left': {
    name: 'chevron-left',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.58L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.58Z"/></svg>'
  },
  'chevron-right': {
    name: 'chevron-right',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.58L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.58Z"/></svg>'
  },
  'plus': {
    name: 'plus',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>'
  },
  'minus': {
    name: 'minus',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5V11H19V13Z"/></svg>'
  },
  'bookmark': {
    name: 'bookmark',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z"/></svg>'
  },
  'trash': {
    name: 'trash',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4H15.5L14.5 3H9.5L8.5 4H5V6H19M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19Z"/></svg>'
  },
  'refresh': {
    name: 'refresh',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4 7.58 4 12S7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12S8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"/></svg>'
  },
  'star': {
    name: 'star',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"/></svg>'
  },
  'scan': {
    name: 'scan',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4H10V6H6V10H4V4M20 4V10H18V6H14V4H20M20 20H14V18H18V14H20V20M10 20V18H6V14H4V20H10M13 2H11V5H13V2M13 19H11V22H13V19M5 11H2V13H5V11M22 11H19V13H22V11Z"/></svg>'
  },
  'qr-code': {
    name: 'qr-code',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11H11V3H3M5 5H9V9H5M13 3V11H21V3M15 5H19V9H15M3 21H11V13H3M5 15H9V19H5M18 13H16V15H18M20 15H22V17H20M18 17H16V19H18M20 19H22V21H20M13 13H15V15H13M13 17H15V19H13M13 19H15V21H13M19 17H21V19H19"/></svg>'
  },
  'arrow-left': {
    name: 'arrow-left',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11V13H8L13.5 18.5L12.08 19.92L4.16 12L12.08 4.08L13.5 5.5L8 11H20Z"/></svg>'
  },
  'arrow-right': {
    name: 'arrow-right',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 11V13H16L10.5 18.5L11.92 19.92L19.84 12L11.92 4.08L10.5 5.5L16 11H4Z"/></svg>'
  },
  'image': {
    name: 'image',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 13.5L11 16.5L14.5 12L19 18H5M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19Z"/></svg>'
  },
  'user': {
    name: 'user',
    category: 'management',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C14.21 4 16 5.79 16 8S14.21 12 12 12 8 10.21 8 8 9.79 4 12 4M12 14C16.42 14 20 15.79 20 18V20H4V18C4 15.79 7.58 14 12 14Z"/></svg>'
  },
  'mobile': {
    name: 'mobile',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 19H7V5H17M17 1H7C5.89 1 5 1.89 5 3V21C5 22.1 5.89 23 7 23H17C18.1 23 19 22.1 19 21V3C19 1.89 18.1 1 17 1Z"/></svg>'
  },
  'google-pay': {
    name: 'google-pay',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M8.5 9.5C8.5 8.12 9.62 7 11 7S13.5 8.12 13.5 9.5V10.5H15V9.5C15 7.29 13.21 5.5 11 5.5S7 7.29 7 9.5V14.5C7 16.71 8.79 18.5 11 18.5S15 16.71 15 14.5V13.5H13.5V14.5C13.5 15.88 12.38 17 11 17S8.5 15.88 8.5 14.5V9.5M16 10H18V12H16V10M16 13H18V15H16V13Z"/></svg>'
  },
  'gift': {
    name: 'gift',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 2C8.67 2 8 2.67 8 3.5C8 4.33 8.67 5 9.5 5H11V4H13V5H14.5C15.33 5 16 4.33 16 3.5C16 2.67 15.33 2 14.5 2S13 2.67 13 3.5H11C11 2.67 10.33 2 9.5 2M9 6V8H20V6H9M11 10V21H13V10H11M6 10V21H8V10H6M16 10V21H18V10H16Z"/></svg>'
  },
  'other': {
    name: 'other',
    category: 'actions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8ZM12 14C13.1 14 14 14.9 14 16C14 17.1 13.1 18 12 18C10.9 18 10 17.1 10 16C10 14.9 10.9 14 12 14Z"/></svg>'
  },
  'cash-register': {
    name: 'cash-register',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 17H22V19H2V17M3.96 8.29L6.34 15H17.66L20.04 8.29C20.13 8.11 20.18 7.92 20.18 7.72C20.18 7.32 19.86 7 19.46 7H4.54C4.14 7 3.82 7.32 3.82 7.72C3.82 7.92 3.87 8.11 3.96 8.29M10 9H14V11H10V9M7 4V6H17V4C17 2.9 16.1 2 15 2H9C7.9 2 7 2.9 7 4M12 13C10.9 13 10 13.9 10 15S10.9 17 12 17 14 16.1 14 15 13.1 13 12 13Z"/></svg>'
  },
  'analytics': {
    name: 'analytics',
    category: 'finance',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M9 17H7V10H9V17M13 17H11V7H13V17M17 17H15V13H17V17Z"/></svg>'
  },
  'box': {
    name: 'box',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4H19C19.55 4 20 4.45 20 5V7C20 7.55 19.55 8 19 8H5C4.45 8 4 7.55 4 7V5C4 4.45 4.45 4 5 4M12 10L20 12V19C20 19.55 19.55 20 19 20H5C4.45 20 4 19.55 4 19V12L12 10M13 16H11V18H13V16Z"/></svg>'
  },
  'truck-loading': {
    name: 'truck-loading',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 18.5C18.83 18.5 19.5 17.83 19.5 17C19.5 16.17 18.83 15.5 18 15.5C17.17 15.5 16.5 16.17 16.5 17C16.5 17.83 17.17 18.5 18 18.5M19.5 9.5H17V12H21.46L19.5 9.5M6 18.5C6.83 18.5 7.5 17.83 7.5 17C7.5 16.17 6.83 15.5 6 15.5C5.17 15.5 4.5 16.17 4.5 17C4.5 17.83 5.17 18.5 6 18.5M20 8L23 12V17H21C21 18.66 19.66 20 18 20C16.34 20 15 18.66 15 17H9C9 18.66 7.66 20 6 20C4.34 20 3 18.66 3 17H1V6C1 4.89 1.89 4 3 4H17V8H20M3 6V15H3.76C4.31 14.39 5.11 14 6 14C6.89 14 7.69 14.39 8.24 15H15V6H3Z"/></svg>'
  },
  'clipboard-check': {
    name: 'clipboard-check',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9M12 3C10.89 3 10 3.89 10 5H6C4.89 5 4 5.89 4 7V19C4 20.1 4.89 21 6 21H18C19.1 21 20 20.1 20 19V7C20 5.89 19.1 5 18 5H14C14 3.89 13.1 3 12 3M12 5C12.55 5 13 5.45 13 6C13 6.55 12.55 7 12 7C11.45 7 11 6.55 11 6C11 5.45 11.45 5 12 5Z"/></svg>'
  },
  'balance-scale': {
    name: 'balance-scale',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C10.73 3 9.6 3.8 9.18 5H3V7H4.95L2 14C1.53 16 3 17 5.5 17C8 17 9.56 16 9 14L6.05 7H9.17C9.5 7.85 10.15 8.5 11 8.83V20H2V22H22V20H13V8.82C13.85 8.5 14.5 7.85 14.82 7H17.95L15 14C14.53 16 16 17 18.5 17C21 17 22.56 16 22 14L19.05 7H21V5H14.83C14.4 3.8 13.27 3 12 3M12 5C12.55 5 13 5.45 13 6C13 6.55 12.55 7 12 7C11.45 7 11 6.55 11 6C11 5.45 11.45 5 12 5M5.5 10.25L7 14H4L5.5 10.25M18.5 10.25L20 14H17L18.5 10.25Z"/></svg>'
  },
  'compare': {
    name: 'compare',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 23V24H11V23H3V21H5V3H3V1H13V2H11V3H13V5H11V7H13V9H11V11H13V13H11V15H13V17H11V19H13V21H11V23H13M7 3V21H9V3H7M15 21H17V3H15V1H21V3H19V21H21V23H15V21Z"/></svg>'
  },
  'truck': {
    name: 'truck',
    category: 'operations',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 18.5C18.83 18.5 19.5 17.83 19.5 17C19.5 16.17 18.83 15.5 18 15.5C17.17 15.5 16.5 16.17 16.5 17C16.5 17.83 17.17 18.5 18 18.5M19.5 9.5H17V12H21.46L19.5 9.5M6 18.5C6.83 18.5 7.5 17.83 7.5 17C7.5 16.17 6.83 15.5 6 15.5C5.17 15.5 4.5 16.17 4.5 17C4.5 17.83 5.17 18.5 6 18.5M20 8L23 12V17H21C21 18.66 19.66 20 18 20C16.34 20 15 18.66 15 17H9C9 18.66 7.66 20 6 20C4.34 20 3 18.66 3 17H1V6C1 4.89 1.89 4 3 4H17V8H20M3 6V15H3.76C4.31 14.39 5.11 14 6 14C6.89 14 7.69 14.39 8.24 15H15V6H3Z"/></svg>'
  },
  'clock': {
    name: 'clock',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z"/></svg>'
  },
  'list': {
    name: 'list',
    category: 'navigation',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4H21V6H3V4M3 11H21V13H3V11M3 18H21V20H3V18Z"/></svg>'
  },
  'sync': {
    name: 'sync',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4M12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.24 7.74C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z"/></svg>'
  },
  'finger-print': {
    name: 'finger-print',
    category: 'system',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.81 4.47C17.73 4.47 17.65 4.45 17.58 4.41C15.66 3.42 14 3 12 3C10.03 3 8.15 3.47 6.44 4.41C6.2 4.54 5.9 4.45 5.76 4.21C5.63 3.97 5.72 3.66 5.96 3.53C7.82 2.5 9.86 2 12 2C14.14 2 16 2.47 18.04 3.5C18.29 3.65 18.38 3.95 18.25 4.19C18.16 4.37 17.99 4.47 17.81 4.47M3.5 9.72C3.4 9.72 3.3 9.69 3.21 9.63C3 9.47 2.93 9.16 3.09 8.93C4.08 7.53 5.34 6.43 6.84 5.66C10 4.04 14 4.03 17.15 5.65C18.65 6.42 19.91 7.5 20.9 8.9C21.06 9.12 21 9.44 20.78 9.6C20.55 9.76 20.24 9.71 20.08 9.5C19.18 8.22 18.04 7.23 16.69 6.54C13.82 5.07 10.15 5.07 7.29 6.55C5.93 7.25 4.79 8.25 3.89 9.5C3.81 9.65 3.66 9.72 3.5 9.72M9.75 21.79C9.62 21.79 9.5 21.74 9.4 21.64C8.53 20.77 8.06 20.21 7.39 19C6.7 17.77 6.34 16.27 6.34 14.66C6.34 11.69 8.88 9.27 12 9.27C15.12 9.27 17.66 11.69 17.66 14.66A.5.5 0 0 1 17.16 15.16A.5.5 0 0 1 16.66 14.66C16.66 12.24 14.57 10.27 12 10.27C9.43 10.27 7.34 12.24 7.34 14.66C7.34 16.1 7.66 17.43 8.27 18.5C8.91 19.66 9.35 20.15 10.12 20.93C10.31 21.13 10.31 21.44 10.12 21.64C10 21.74 9.88 21.79 9.75 21.79M16.92 19.94C15.73 19.94 14.68 19.64 13.82 19.05C12.33 18.04 11.44 16.4 11.44 14.66A.5.5 0 0 1 11.94 14.16A.5.5 0 0 1 12.44 14.66C12.44 16.07 13.16 17.4 14.38 18.22C15.09 18.7 15.92 18.93 16.92 18.93C17.16 18.93 17.56 18.9 17.96 18.83C18.23 18.78 18.5 18.96 18.54 19.24C18.59 19.5 18.41 19.77 18.13 19.82C17.56 19.93 17.06 19.94 16.92 19.94M14.91 22C14.87 22 14.82 22 14.78 21.97C13.19 21.54 12.15 20.95 11.06 19.88C9.66 18.5 8.89 16.64 8.89 14.66C8.89 13 10.27 11.63 11.94 11.63C13.61 11.63 15 13 15 14.66C15 15.73 15.87 16.6 16.94 16.6C18 16.6 18.88 15.73 18.88 14.66C18.88 10.89 15.79 7.83 12 7.83C8.21 7.83 5.12 10.89 5.12 14.66C5.12 15.73 5.24 16.77 5.47 17.76C5.54 18.04 5.35 18.31 5.08 18.38C4.8 18.45 4.53 18.26 4.47 18C4.22 16.93 4.09 15.81 4.09 14.66C4.09 10.33 7.64 6.83 12 6.83C16.36 6.83 19.91 10.33 19.91 14.66C19.91 16.29 18.56 17.63 16.94 17.63C15.33 17.63 14 16.29 14 14.66C14 13.55 13.06 12.63 11.94 12.63C10.83 12.63 9.89 13.55 9.89 14.66C9.89 16.36 10.55 17.96 11.76 19.16C12.71 20.1 13.62 20.62 15.03 21C15.3 21.08 15.47 21.36 15.38 21.62C15.33 21.85 15.12 22 14.91 22Z"/></svg>'
  }
};

// Create the store with proper owner context
const [iconStore, setIconStore] = createRoot(() => createStore({
  icons: iconDefinitions
}));

// Helper functions
export const getIcon = (name: string): IconDefinition | undefined => {
  return iconStore.icons[name];
};

export const getIconsByCategory = (category: string): IconDefinition[] => {
  return Object.values(iconStore.icons).filter(icon => icon.category === category);
};

export const getAllCategories = (): string[] => {
  const categories = new Set(Object.values(iconStore.icons).map(icon => icon.category));
  return Array.from(categories);
};

export const addIcon = (icon: IconDefinition) => {
  setIconStore('icons', icon.name, icon);
};

export const removeIcon = (name: string) => {
  setIconStore('icons', icons => {
    const { [name]: _, ...rest } = icons;
    return rest;
  });
};

export default iconStore;