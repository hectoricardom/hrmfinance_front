import { fetchGraphQLSS } from "../../../services/utils";

export interface ProductInfo {
  title?: string;
  price?: string;
  currency?: string;
  image?: string;
  availability?: string;
  seller?: string;
  rating?: string;
  description?: string;
  brand?: string;
  originalPrice?: string;
  discount?: string;
  shippingInfo?: string;
  images?: string[];
  originalUrl: string;
  platform: string;
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  site_name?: string;
  price?: string;
  currency?: string;
  brand?: string;
  availability?: string;
  images?: string[];
}

export class ProductInfoService {
  // CORS proxy services for fetching external URLs
  private corsProxies = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/',
    'https://corsproxy.io/?',
    'https://crossorigin.me/'
  ];
  
  private currentProxyIndex = 0;
  
  private get corsProxy(): string {
    return this.corsProxies[this.currentProxyIndex];
  }
  
  async getProductInfo(url: string): Promise<ProductInfo> {
    const platform = this.detectPlatform(url);
    
    try {
      // First try to get OpenGraph data (works for most sites)
      const ogData = await this.fetchOpenGraphData(url);
      
       let params: Record<string, any> = {
              url,
              options:{
                retries: 3, extractImages: true
              }
            };
      
            let bdyq2 = {
              query: "scrapeProduct",
              url,
              options:{
                retries: 3, extractImages: true
              }
            };
      
            console.log( platform);
        //    const response = await fetchGraphQLSS(bdyq2);
          

      // Enhance with platform-specific parsing if needed
      let productInfo: ProductInfo = {
        title: ogData.title,
        price: ogData.price,
        currency: ogData.currency || 'USD',
        image: ogData.image,
        description: ogData.description,
        brand: ogData.brand,
        availability: ogData.availability,
        images: ogData.images || (ogData.image ? [ogData.image] : []),
        originalUrl: url,
        platform
      };
      
      // Platform-specific enhancements
      switch (platform) {
        
        case 'amazon':
          productInfo = await this.enhanceAmazonData(url, productInfo);
          break;  
        case 'temu':
          productInfo = await this.enhanceTemuData(url, productInfo);
          break;
        case 'shein':
          productInfo = await this.enhanceSHEINData(url, productInfo);
          break;
        case 'walmart':
          productInfo = await this.enhanceWalmartData(url, productInfo);
          break;
      }
      
      return productInfo;
    } catch (error) {
      console.error('Error fetching product info:', error);
      // Return basic info if fetch fails
      return {
        originalUrl: url,
        platform,
        title: 'Product from ' + platform.toUpperCase()
      };
    }
  }
  
  private detectPlatform(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('/a.co/')) return 'amazon';
    if (urlLower.includes('amazon.com')) return 'amazon';
    if (urlLower.includes('amazon.')) return 'amazon'; // for international Amazon sites
    if (urlLower.includes('temu.com')) return 'temu';
    if (urlLower.includes('shein.com') || urlLower.includes('shein.')) return 'shein'; // for international Shein sites
    if (urlLower.includes('us.shein.com') || urlLower.includes('ca.shein.com')) return 'shein';
    if (urlLower.includes('walmart.com')) return 'walmart';
    return 'other';
  }
  
  private async fetchOpenGraphData(url: string): Promise<OpenGraphData> {
    try {
      // Use CORS proxy to fetch the page
      const response = await fetch(this.corsProxy + encodeURIComponent(url));
      const html = await response.text();
      
      // Parse OpenGraph meta tags
      const ogData: OpenGraphData = {};
      const images: string[] = [];
      
      // Extract meta tags using regex (simple parser)
      const metaRegex = /<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']+)["']/gi;
      let match;
      
      while ((match = metaRegex.exec(html)) !== null) {
        const property = match[1].toLowerCase();
        const content = match[2];
        
        if (property.includes('og:title') || property.includes('twitter:title')) {
          ogData.title = content;
        } else if (property.includes('og:image') || property.includes('twitter:image')) {
          if (!ogData.image) ogData.image = content;
          if (!images.includes(content)) images.push(content);
        } else if (property.includes('og:description') || property.includes('twitter:description')) {
          ogData.description = content;
        } else if (property.includes('price:amount') || property.includes('product:price:amount')) {
          ogData.price = content;
        } else if (property.includes('price:currency') || property.includes('product:price:currency')) {
          ogData.currency = content;
        } else if (property.includes('product:brand') || property.includes('og:brand')) {
          ogData.brand = content;
        } else if (property.includes('product:availability') || property.includes('og:availability')) {
          ogData.availability = content;
        }
      }
      
      ogData.images = images;
      
      // Also try to extract from title tag if no og:title
      if (!ogData.title) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          ogData.title = titleMatch[1].trim();
        }
      }
      
      return ogData;
    } catch (error) {
      console.error('Error fetching OpenGraph data:', error);
      return {};
    }
  }
  
  private async enhanceAmazonData(url: string, baseInfo: ProductInfo): Promise<ProductInfo> {
    try {
      // Try mobile Amazon version for better parsing
      const mobileUrl = url.replace('www.amazon.com', 'm.amazon.com').replace('/dp/', '/dp/');
      
      // Try to fetch Amazon page with different approach
      let html = '';
      let success = false;
      
      // Try multiple CORS proxies
      for (let i = 0; i < this.corsProxies.length; i++) {
        try {
          const proxyUrl = this.corsProxies[(this.currentProxyIndex + i) % this.corsProxies.length];
          console.log(`Trying Amazon with proxy ${i + 1}:`, proxyUrl);
          
          const response = await fetch(proxyUrl + encodeURIComponent(url), {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (response.ok) {
            html = await response.text();
            success = true;
            this.currentProxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
            console.log('Amazon fetch successful with proxy:', proxyUrl);
            break;
          }
        } catch (proxyError) {
          console.warn(`Proxy ${i + 1} failed:`, proxyError);
        }
      }
      
      if (!success) {
        console.warn('All proxies failed for Amazon, using basic info');
        return this.fallbackAmazonData(baseInfo);
      }
      
      // Extract ASIN from URL
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
      const asin = asinMatch?.[1] || asinMatch?.[2];
      
      // Enhanced Amazon-specific parsing
      const amazonInfo = this.parseAmazonHTML(html);
      
      // Merge with base info, preferring Amazon-specific data
      baseInfo = {
        ...baseInfo,
        ...amazonInfo,
        title: amazonInfo.title || baseInfo.title?.replace(' - Amazon.com', '').replace('Amazon.com: ', ''),
        price: amazonInfo.price || baseInfo.price,
        image: amazonInfo.image || baseInfo.image,
        description: amazonInfo.description || baseInfo.description,
        brand: amazonInfo.brand || baseInfo.brand,
        availability: amazonInfo.availability || baseInfo.availability,
        rating: amazonInfo.rating,
        originalUrl: url,
        platform: 'amazon'
      };
      
      // Clean up price if found
      if (baseInfo.price) {
        baseInfo.price = baseInfo.price.replace(/[$,]/g, '').trim();
      }
      
      console.log('Enhanced Amazon data:', baseInfo);
      return baseInfo;
      
    } catch (error) {
      console.error('Error enhancing Amazon data:', error);
      
      // Fallback with basic cleanup
      baseInfo.title = baseInfo.title?.replace(' - Amazon.com', '').replace('Amazon.com: ', '');
      if (baseInfo.price) {
        baseInfo.price = baseInfo.price.replace(/[$,]/g, '').trim();
      }
      
      return baseInfo;
    }
  }
  
  private parseAmazonHTML(html: string): Partial<ProductInfo> {
    const info: Partial<ProductInfo> = {};
    
    // Try multiple title selectors
    const titleSelectors = [
      /#productTitle[^>]*>([^<]+)</,
      /<span[^>]*id="productTitle"[^>]*>([^<]+)</,
      /<h1[^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)</,
      /<title>([^<]*?) : Amazon/,
      /<title>([^<]*?) - Amazon/
    ];
    
    for (const selector of titleSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.title = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }
    
    // Try multiple price selectors
    const priceSelectors = [
      /class="a-price-whole"[^>]*>([0-9,]+)/,
      /class="a-price a-text-price a-size-medium a-color-base"[^>]*>.*?<span[^>]*>([^<]+)/,
      /priceblock_dealprice"[^>]*>\$?([0-9,]+\.?[0-9]*)/,
      /priceblock_ourprice"[^>]*>\$?([0-9,]+\.?[0-9]*)/,
      /class="a-offscreen"[^>]*>\$?([0-9,]+\.?[0-9]*)/,
      /"price":"([0-9,]+\.?[0-9]*)"/
    ];
    
    for (const selector of priceSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.price = match[1].replace(/,/g, '');
        info.currency = 'USD';
        break;
      }
    }
    
    // Try to find main product image
    const imageSelectors = [
      /"hiRes":"([^"]+)"/,
      /"large":"([^"]+)"/,
      /id="landingImage"[^>]*src="([^"]+)"/,
      /class="a-dynamic-image"[^>]*src="([^"]+)"/
    ];
    
    for (const selector of imageSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.image = match[1];
        break;
      }
    }
    
    // Try to find brand
    const brandSelectors = [
      /id="bylineInfo"[^>]*>.*?href="[^"]*"[^>]*>([^<]+)/,
      /"brand":"([^"]+)"/,
      /class="a-size-base-plus"[^>]*>Brand:\s*([^<]+)/
    ];
    
    for (const selector of brandSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.brand = match[1].trim();
        break;
      }
    }
    
    // Try to find availability
    const availabilitySelectors = [
      /id="availability"[^>]*>.*?<span[^>]*>([^<]+)/,
      /"availability":"([^"]+)"/,
      /class="a-size-medium a-color-success"[^>]*>([^<]+)/
    ];
    
    for (const selector of availabilitySelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.availability = match[1].trim();
        break;
      }
    }
    
    // Try to find rating
    const ratingSelectors = [
      /class="a-icon-alt"[^>]*>([0-9.]+) out of/,
      /"ratingValue":"([0-9.]+)"/
    ];
    
    for (const selector of ratingSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.rating = match[1] + '/5';
        break;
      }
    }
    
    // Try to extract additional images
    const imageArrayMatch = html.match(/"colorImages":\s*{[^}]*"initial":\s*\[([^\]]+)\]/);
    if (imageArrayMatch) {
      try {
        const imageData = imageArrayMatch[1];
        const images: string[] = [];
        const imageRegex = /"hiRes":"([^"]+)"/g;
        let match;
        while ((match = imageRegex.exec(imageData)) !== null) {
          images.push(match[1]);
        }
        if (images.length > 0) {
          info.images = images;
          if (!info.image) info.image = images[0];
        }
      } catch (e) {
        console.warn('Could not parse Amazon image array:', e);
      }
    }
    
    // Try to extract JSON-LD structured data specifically for Amazon
    const jsonLdMatches = html.match(/<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/g);
    if (jsonLdMatches) {
      for (const jsonScript of jsonLdMatches) {
        try {
          const jsonMatch = jsonScript.match(/>([^<]+)</);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            if (jsonData['@type'] === 'Product') {
              if (jsonData.name && !info.title) info.title = jsonData.name;
              if (jsonData.brand && !info.brand) info.brand = typeof jsonData.brand === 'string' ? jsonData.brand : jsonData.brand.name;
              if (jsonData.offers && jsonData.offers.price && !info.price) {
                info.price = jsonData.offers.price;
                info.currency = jsonData.offers.priceCurrency || 'USD';
              }
              if (jsonData.aggregateRating && !info.rating) {
                info.rating = `${jsonData.aggregateRating.ratingValue}/${jsonData.aggregateRating.bestRating}`;
              }
            }
          }
        } catch (e) {
          console.warn('Could not parse Amazon JSON-LD:', e);
        }
      }
    }
    
    return info;
  }
  
  private fallbackAmazonData(baseInfo: ProductInfo): ProductInfo {
    // Clean up Amazon-specific formatting in titles
    if (baseInfo.title) {
      baseInfo.title = baseInfo.title.replace(' - Amazon.com', '').replace('Amazon.com: ', '').trim();
    }
    
    // Clean up price format
    if (baseInfo.price) {
      baseInfo.price = baseInfo.price.replace(/[$,]/g, '').trim();
    }
    
    // Set default currency if not present
    if (!baseInfo.currency) {
      baseInfo.currency = 'USD';
    }
    
    return baseInfo;
  }
  
  private async enhanceTemuData(url: string, baseInfo: ProductInfo): Promise<ProductInfo> {
    try {
      // Try to fetch Temu page with different approach
      let html = '';
      let success = false;
      
      // Try multiple CORS proxies
      for (let i = 0; i < this.corsProxies.length; i++) {
        try {
          const proxyUrl = this.corsProxies[(this.currentProxyIndex + i) % this.corsProxies.length];
          console.log(`Trying Temu with proxy ${i + 1}:`, proxyUrl);
          
          const response = await fetch(proxyUrl + encodeURIComponent(url), {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (response.ok) {
            html = await response.text();
            success = true;
            this.currentProxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
            console.log('Temu fetch successful with proxy:', proxyUrl);
            break;
          }
        } catch (proxyError) {
          console.warn(`Proxy ${i + 1} failed for Temu:`, proxyError);
        }
      }
      
      if (!success) {
        console.warn('All proxies failed for Temu, using basic info');
        return this.fallbackTemuData(baseInfo);
      }
      
      // Enhanced Temu-specific parsing
      const temuInfo = this.parseTemuHTML(html);
      
      // Merge with base info, preferring Temu-specific data
      baseInfo = {
        ...baseInfo,
        ...temuInfo,
        title: temuInfo.title || baseInfo.title?.replace('| Temu', '').trim(),
        price: temuInfo.price || baseInfo.price,
        image: temuInfo.image || baseInfo.image,
        description: temuInfo.description || baseInfo.description,
        brand: temuInfo.brand || baseInfo.brand,
        availability: temuInfo.availability || baseInfo.availability,
        rating: temuInfo.rating,
        originalUrl: url,
        platform: 'temu'
      };
      
      // Clean up price if found
      if (baseInfo.price) {
        baseInfo.price = baseInfo.price.replace(/[$,]/g, '').trim();
      }
      
      console.log('Enhanced Temu data:', baseInfo);
      return baseInfo;
      
    } catch (error) {
      console.error('Error enhancing Temu data:', error);
      return this.fallbackTemuData(baseInfo);
    }
  }
  
  private parseTemuHTML(html: string): Partial<ProductInfo> {
    const info: Partial<ProductInfo> = {};
    
    // Try multiple title selectors for Temu
    const titleSelectors = [
      /"goodsName":"([^"]+)"/,
      /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</,
      /<title>([^|]+)\s*\|\s*Temu/,
      /"title":"([^"]+)"/,
      /data-testid="pdp-product-title"[^>]*>([^<]+)</
    ];
    
    for (const selector of titleSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.title = this.decodeHTMLEntities(match[1].trim().replace(/\s+/g, ' '));
        break;
      }
    }
    
    // Try multiple price selectors for Temu
    const priceSelectors = [
      /"price":\s*"([0-9.]+)"/,
      /"currentPrice":"([0-9.]+)"/,
      /"salePrice":"([0-9.]+)"/,
      /class="[^"]*price[^"]*"[^>]*>\$([0-9.,]+)/,
      /"normalPrice":"([0-9.]+)"/,
      /data-testid="pdp-price"[^>]*>\$([0-9.,]+)/
    ];
    
    for (const selector of priceSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.price = match[1].replace(/,/g, '');
        info.currency = 'USD';
        break;
      }
    }
    
    // Try to find main product image for Temu
    const imageSelectors = [
      /"image":"([^"]+)"/,
      /"goodsImg":"([^"]+)"/,
      /"mainImg":"([^"]+)"/,
      /data-testid="pdp-main-image"[^>]*src="([^"]+)"/,
      /"imageUrl":"([^"]+)"/
    ];
    
    for (const selector of imageSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.image = match[1];
        break;
      }
    }
    
    // Try to find brand
    const brandSelectors = [
      /"brandName":"([^"]+)"/,
      /"brand":"([^"]+)"/,
      /data-testid="pdp-brand"[^>]*>([^<]+)</
    ];
    
    for (const selector of brandSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.brand = this.decodeHTMLEntities(match[1].trim());
        break;
      }
    }
    
    // Try to find availability
    const availabilitySelectors = [
      /"stockStatus":"([^"]+)"/,
      /"availability":"([^"]+)"/,
      /data-testid="pdp-availability"[^>]*>([^<]+)</
    ];
    
    for (const selector of availabilitySelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.availability = this.decodeHTMLEntities(match[1].trim());
        break;
      }
    }
    
    // Try to find rating
    const ratingSelectors = [
      /"rating":"([0-9.]+)"/,
      /"avgRating":"([0-9.]+)"/,
      /data-testid="pdp-rating"[^>]*>([0-9.]+)</
    ];
    
    for (const selector of ratingSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.rating = match[1] + '/5';
        break;
      }
    }
    
    // Try to extract JSON-LD structured data specifically for Temu
    const jsonLdMatches = html.match(/<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/g);
    if (jsonLdMatches) {
      for (const jsonScript of jsonLdMatches) {
        try {
          const jsonMatch = jsonScript.match(/>([^<]+)</);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            if (jsonData['@type'] === 'Product') {
              if (jsonData.name && !info.title) info.title = jsonData.name;
              if (jsonData.brand && !info.brand) info.brand = typeof jsonData.brand === 'string' ? jsonData.brand : jsonData.brand.name;
              if (jsonData.offers && jsonData.offers.price && !info.price) {
                info.price = jsonData.offers.price;
                info.currency = jsonData.offers.priceCurrency || 'USD';
              }
              if (jsonData.aggregateRating && !info.rating) {
                info.rating = `${jsonData.aggregateRating.ratingValue}/${jsonData.aggregateRating.bestRating}`;
              }
            }
          }
        } catch (e) {
          console.warn('Could not parse Temu JSON-LD:', e);
        }
      }
    }
    
    return info;
  }
  
  private fallbackTemuData(baseInfo: ProductInfo): ProductInfo {
    // Clean up Temu-specific formatting in titles
    if (baseInfo.title) {
      baseInfo.title = baseInfo.title.replace('| Temu', '').trim();
    }
    
    // Set default currency if not present
    if (!baseInfo.currency) {
      baseInfo.currency = 'USD';
    }
    
    return baseInfo;
  }
  
  private parseSheinHTML(html: string): Partial<ProductInfo> {
    const info: Partial<ProductInfo> = {};
    
    // Try multiple title selectors for Shein
    const titleSelectors = [
      /"product_title":"([^"]+)"/,
      /"goods_name":"([^"]+)"/,
      /<h1[^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)</,
      /<title>([^|]+)\s*\|\s*SHEIN/,
      /"name":"([^"]+)"/,
      /property="og:title"[^>]*content="([^"]+)"/,
      /"productName":"([^"]+)"/,
      /class="product-intro__head-name"[^>]*>([^<]+)</
    ];
    
    for (const selector of titleSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.title = this.decodeHTMLEntities(match[1].trim().replace(/\s+/g, ' '));
        break;
      }
    }
    
    // Try multiple price selectors for Shein
    const priceSelectors = [
      /"salePrice":{"amount":"([0-9.]+)"/,
      /"retailPrice":"([0-9.]+)"/,
      /"current_price":"([0-9.]+)"/,
      /"price":"([0-9.]+)"/,
      /"amount":"([0-9.]+)"/,
      /class="[^"]*price[^"]*current[^"]*"[^>]*>\$([0-9.,]+)/,
      /data-currency-value="([0-9.]+)"/,
      /"unitPrice":"([0-9.]+)"/,
      /property="product:price:amount"[^>]*content="([^"]+)"/
    ];
    
    for (const selector of priceSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        info.price = match[1].replace(/,/g, '');
        info.currency = 'USD';
        break;
      }
    }
    
    // Try to find main product image for Shein
    const imageSelectors = [
      /"origin_image":"([^"]+)"/,
      /"main_image":"([^"]+)"/,
      /"goods_img":"([^"]+)"/,
      /property="og:image"[^>]*content="([^"]+)"/,
      /"productImg":"([^"]+)"/,
      /class="[^"]*product[^"]*image[^"]*"[^>]*src="([^"]+)"/,
      /"image":"([^"]+\.jpg[^"]*)"/ // Specifically for .jpg images
    ];
    
    for (const selector of imageSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        // Clean up the image URL
        let imageUrl = match[1];
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        }
        info.image = imageUrl;
        break;
      }
    }
    
    // Try to find brand (usually SHEIN for most products)
    const brandSelectors = [
      /"brand_name":"([^"]+)"/,
      /"brand":"([^"]+)"/,
      /property="product:brand"[^>]*content="([^"]+)"/,
      /class="[^"]*brand[^"]*"[^>]*>([^<]+)</
    ];
    
    for (const selector of brandSelectors) {
      const match = html.match(selector);
      if (match && match[1] && match[1].toLowerCase() !== 'null') {
        info.brand = this.decodeHTMLEntities(match[1].trim());
        break;
      }
    }
    
    // Default brand for SHEIN
    if (!info.brand) {
      info.brand = 'SHEIN';
    }
    
    // Try to find availability
    const availabilitySelectors = [
      /"stock_status":"([^"]+)"/,
      /"availability":"([^"]+)"/,
      /"in_stock":([^,}]+)/,
      /class="[^"]*stock[^"]*"[^>]*>([^<]+)</,
      /property="product:availability"[^>]*content="([^"]+)"/
    ];
    
    for (const selector of availabilitySelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        let availability = match[1].trim();
        if (availability === 'true' || availability === '1') {
          availability = 'In Stock';
        } else if (availability === 'false' || availability === '0') {
          availability = 'Out of Stock';
        }
        info.availability = this.decodeHTMLEntities(availability);
        break;
      }
    }
    
    // Try to find rating
    const ratingSelectors = [
      /"avg_rating":"([0-9.]+)"/,
      /"rating":"([0-9.]+)"/,
      /"averageRating":"([0-9.]+)"/,
      /class="[^"]*rating[^"]*"[^>]*>([0-9.]+)/,
      /"stars":([0-9.]+)/
    ];
    
    for (const selector of ratingSelectors) {
      const match = html.match(selector);
      if (match && match[1] && parseFloat(match[1]) > 0) {
        info.rating = match[1] + '/5';
        break;
      }
    }
    
    // Try to find discount/original price
    const originalPriceSelectors = [
      /"retailPrice":{"amount":"([0-9.]+)"/,
      /"original_price":"([0-9.]+)"/,
      /"compareAtPrice":"([0-9.]+)"/,
      /class="[^"]*price[^"]*original[^"]*"[^>]*>\$([0-9.,]+)/
    ];
    
    for (const selector of originalPriceSelectors) {
      const match = html.match(selector);
      if (match && match[1] && parseFloat(match[1]) > (parseFloat(info.price || '0'))) {
        info.originalPrice = match[1].replace(/,/g, '');
        if (info.price) {
          const discount = ((parseFloat(info.originalPrice) - parseFloat(info.price)) / parseFloat(info.originalPrice) * 100).toFixed(0);
          info.discount = discount + '%';
        }
        break;
      }
    }
    
    // Try to extract JSON-LD structured data specifically for Shein
    const jsonLdMatches = html.match(/<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/g);
    if (jsonLdMatches) {
      for (const jsonScript of jsonLdMatches) {
        try {
          const jsonMatch = jsonScript.match(/>([^<]+)</);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            if (jsonData['@type'] === 'Product') {
              if (jsonData.name && !info.title) info.title = jsonData.name;
              if (jsonData.brand && !info.brand) info.brand = typeof jsonData.brand === 'string' ? jsonData.brand : jsonData.brand.name;
              if (jsonData.offers && jsonData.offers.price && !info.price) {
                info.price = jsonData.offers.price.toString();
                info.currency = jsonData.offers.priceCurrency || 'USD';
              }
              if (jsonData.image && !info.image) {
                info.image = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
              }
              if (jsonData.aggregateRating && !info.rating) {
                info.rating = `${jsonData.aggregateRating.ratingValue}/${jsonData.aggregateRating.bestRating}`;
              }
            }
          }
        } catch (e) {
          console.warn('Could not parse Shein JSON-LD:', e);
        }
      }
    }
    
    // Try to extract from embedded script data (common in Shein)
    const scriptDataMatches = html.match(/window\.__INITIAL_STATE__\s*=\s*({[^;]+});/);
    if (scriptDataMatches) {
      try {
        const scriptData = JSON.parse(scriptDataMatches[1]);
        // Navigate the nested structure to find product data
        const productData = this.extractSheinProductFromState(scriptData);
        if (productData) {
          if (productData.name && !info.title) info.title = productData.name;
          if (productData.price && !info.price) info.price = productData.price.toString();
          if (productData.image && !info.image) info.image = productData.image;
          if (productData.brand && !info.brand) info.brand = productData.brand;
        }
      } catch (e) {
        console.warn('Could not parse Shein initial state:', e);
      }
    }
    
    return info;
  }
  
  private extractSheinProductFromState(state: any): any {
    // Shein often stores product data in nested structures
    // This helper method navigates common patterns
    try {
      // Common patterns in Shein's state structure
      if (state.product) return state.product;
      if (state.goods) return state.goods;
      if (state.goodsDetail) return state.goodsDetail;
      if (state.productDetail && state.productDetail.goods) return state.productDetail.goods;
      
      // Search for product-like objects in the state
      for (const key in state) {
        const value = state[key];
        if (value && typeof value === 'object') {
          if (value.goods_name || value.product_title || value.name) {
            return value;
          }
          // Recursively search nested objects
          const nested = this.extractSheinProductFromState(value);
          if (nested) return nested;
        }
      }
    } catch (e) {
      console.warn('Error extracting Shein product from state:', e);
    }
    return null;
  }
  
  private fallbackSheinData(baseInfo: ProductInfo): ProductInfo {
    // Clean up Shein-specific formatting in titles
    if (baseInfo.title) {
      baseInfo.title = baseInfo.title.replace('| SHEIN USA', '').replace('| SHEIN', '').trim();
    }
    
    // Set default currency if not present
    if (!baseInfo.currency) {
      baseInfo.currency = 'USD';
    }
    
    // Set default brand
    if (!baseInfo.brand) {
      baseInfo.brand = 'SHEIN';
    }
    
    return baseInfo;
  }
  
  private decodeHTMLEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x27;': "'"
    };
    
    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
  }
  
  private async enhanceSHEINData(url: string, baseInfo: ProductInfo): Promise<ProductInfo> {
    try {
      // Try to fetch Shein page with different approach
      let html = '';
      let success = false;
      
      // Try multiple CORS proxies
      for (let i = 0; i < this.corsProxies.length; i++) {
        try {
          const proxyUrl = this.corsProxies[(this.currentProxyIndex + i) % this.corsProxies.length];
          console.log(`Trying Shein with proxy ${i + 1}:`, proxyUrl);
          
          const response = await fetch(proxyUrl + encodeURIComponent(url), {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (response.ok) {
            html = await response.text();
            success = true;
            this.currentProxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
            console.log('Shein fetch successful with proxy:', proxyUrl);
            break;
          }
        } catch (proxyError) {
          console.warn(`Proxy ${i + 1} failed for Shein:`, proxyError);
        }
      }
      
      if (!success) {
        console.warn('All proxies failed for Shein, using basic info');
        return this.fallbackSheinData(baseInfo);
      }
      
      // Enhanced Shein-specific parsing
      const sheinInfo = this.parseSheinHTML(html);
      
      // Merge with base info, preferring Shein-specific data
      baseInfo = {
        ...baseInfo,
        ...sheinInfo,
        title: sheinInfo.title || baseInfo.title?.replace('| SHEIN USA', '').replace('| SHEIN', '').trim(),
        price: sheinInfo.price || baseInfo.price,
        image: sheinInfo.image || baseInfo.image,
        description: sheinInfo.description || baseInfo.description,
        brand: sheinInfo.brand || baseInfo.brand || 'SHEIN',
        availability: sheinInfo.availability || baseInfo.availability,
        rating: sheinInfo.rating,
        originalUrl: url,
        platform: 'shein'
      };
      
      // Clean up price if found
      if (baseInfo.price) {
        baseInfo.price = baseInfo.price.replace(/[$,]/g, '').trim();
      }
      
      console.log('Enhanced Shein data:', baseInfo);
      return baseInfo;
      
    } catch (error) {
      console.error('Error enhancing Shein data:', error);
      return this.fallbackSheinData(baseInfo);
    }
  }
  
  private async enhanceWalmartData(url: string, baseInfo: ProductInfo): Promise<ProductInfo> {
    // Walmart specific enhancements
    baseInfo.currency = 'USD';
    
    // Clean title
    if (baseInfo.title) {
      baseInfo.title = baseInfo.title.replace('- Walmart.com', '').trim();
    }
    
    return baseInfo;
  }
  
  // Alternative: Use a dedicated API service (requires API key)
  async getProductInfoViaAPI(url: string, apiKey: string): Promise<ProductInfo> {
    // Example using ScraperAPI
    try {
      const response = await fetch(`https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`);
      const html = await response.text();
      
      // Parse the HTML response
      return this.parseHTMLForProductInfo(html, url);
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }
  
  private parseHTMLForProductInfo(html: string, url: string): ProductInfo {
    const platform = this.detectPlatform(url);
    const info: ProductInfo = {
      originalUrl: url,
      platform
    };
    
    // Platform-specific selectors would go here
    // This is a simplified example
    
    // Try to extract JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData['@type'] === 'Product') {
          info.title = jsonData.name;
          info.image = jsonData.image;
          if (jsonData.offers) {
            info.price = jsonData.offers.price;
            info.currency = jsonData.offers.priceCurrency;
            info.availability = jsonData.offers.availability;
          }
        }
      } catch (e) {
        console.error('Error parsing JSON-LD:', e);
      }
    }
    
    return info;
  }
}

// Export singleton instance
export const productInfoService = new ProductInfoService();

// Usage example:
/*
const productInfo = await productInfoService.getProductInfo('https://www.amazon.com/dp/B08N5WRWNW');
console.log(productInfo);
// Output: { title: "Echo Dot (4th Gen)...", price: "49.99", currency: "USD", ... }
*/