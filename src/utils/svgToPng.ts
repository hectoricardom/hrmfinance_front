/**
 * SVG to PNG Converter
 * Converts SVG strings or elements to base64 PNG for use in PDFs
 */

export interface SvgToPngOptions {
  width?: number;
  height?: number;
  scale?: number;
  backgroundColor?: string;
}

/**
 * Convert SVG string to base64 PNG
 * @param svgString - The SVG markup as a string
 * @param options - Conversion options (width, height, scale, backgroundColor)
 * @returns Promise<string> - Base64 encoded PNG data URL
 */
export const svgStringToBase64Png = (
  svgString: string,
  options: SvgToPngOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { width = 100, height = 100, scale = 2, backgroundColor } = options;

    // Create a canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Set canvas size with scale for better quality
    canvas.width = width * scale;
    canvas.height = height * scale;

    // Create an image from the SVG
    const img = new Image();

    // Convert SVG string to data URL
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Fill background if specified
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw the SVG image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Clean up the object URL
      URL.revokeObjectURL(url);

      // Convert to base64 PNG
      const base64 = canvas.toDataURL('image/png');
      resolve(base64);
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = url;
  });
};

/**
 * Convert SVG element to base64 PNG
 * @param svgElement - The SVG DOM element
 * @param options - Conversion options
 * @returns Promise<string> - Base64 encoded PNG data URL
 */
export const svgElementToBase64Png = (
  svgElement: SVGElement,
  options: SvgToPngOptions = {}
): Promise<string> => {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  return svgStringToBase64Png(svgString, options);
};

// ============================================
// Pre-built SVG Icons as Base64 PNG
// ============================================

/**
 * Get a checkmark icon as base64 PNG
 * @param color - The color of the checkmark (default: green)
 * @param size - The size in pixels (default: 24)
 */
export const getCheckmarkPng = (color: string = '#22c55e', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Get a checkmark in circle icon as base64 PNG
 * @param color - The color (default: green)
 * @param size - The size in pixels (default: 24)
 */
export const getCheckmarkCirclePng = (color: string = '#22c55e', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Get an X/cross icon as base64 PNG
 * @param color - The color (default: red)
 * @param size - The size in pixels (default: 24)
 */
export const getCrossPng = (color: string = '#ef4444', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Get a warning/alert icon as base64 PNG
 * @param color - The color (default: yellow/amber)
 * @param size - The size in pixels (default: 24)
 */
export const getWarningPng = (color: string = '#f59e0b', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Get an info icon as base64 PNG
 * @param color - The color (default: blue)
 * @param size - The size in pixels (default: 24)
 */
export const getInfoPng = (color: string = '#3b82f6', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Get a document/file icon as base64 PNG
 * @param color - The color (default: gray)
 * @param size - The size in pixels (default: 24)
 */
export const getDocumentPng = (color: string = '#6b7280', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Get a signature/pen icon as base64 PNG
 * @param color - The color (default: dark blue)
 * @param size - The size in pixels (default: 24)
 */
export const getSignaturePng = (color: string = '#1e3a5f', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Get a calendar icon as base64 PNG
 * @param color - The color (default: gray)
 * @param size - The size in pixels (default: 24)
 */
export const getCalendarPng = (color: string = '#6b7280', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Get a user/person icon as base64 PNG
 * @param color - The color (default: gray)
 * @param size - The size in pixels (default: 24)
 */
export const getUserPng = (color: string = '#6b7280', size: number = 24): Promise<string> => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  `;
  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};

/**
 * Create a custom SVG icon and convert to base64 PNG
 * @param svgContent - The inner SVG content (paths, shapes, etc.)
 * @param options - SVG and conversion options
 */
export const createCustomIconPng = (
  svgContent: string,
  options: {
    size?: number;
    viewBox?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  } = {}
): Promise<string> => {
  const {
    size = 24,
    viewBox = '0 0 24 24',
    fill = 'none',
    stroke = 'currentColor',
    strokeWidth = 2
  } = options;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      ${svgContent}
    </svg>
  `;

  return svgStringToBase64Png(svg, { width: size, height: size, scale: 2 });
};
