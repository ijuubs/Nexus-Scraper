import { ScraperConfig, ScraperStatus, SiteStrategy, Product, JobLog, DashboardStats } from './types';

export const MOCK_SCRAPERS: ScraperConfig[] = [
  {
    id: '1',
    name: 'RB Patel Fiji',
    baseUrl: 'https://www.rbpatel.com.fj',
    strategy: SiteStrategy.DYNAMIC,
    status: ScraperStatus.IDLE,
    lastRun: '2023-10-26T14:30:00Z',
    productsCount: 4520,
    schedule: 'Daily @ 03:00',
    selectors: {
      productContainer: '.product-item',
      name: '.product-title',
      price: '.price-current',
      image: '.product-image img',
    },
  },
  {
    id: '2',
    name: 'MH Supermarket',
    baseUrl: 'https://www.mh.com.fj',
    strategy: SiteStrategy.STATIC,
    status: ScraperStatus.RUNNING,
    lastRun: '2023-10-27T08:00:00Z',
    productsCount: 3105,
    schedule: 'Daily @ 04:00',
    selectors: {
      productContainer: 'div.product-card',
      name: 'h2.woocommerce-loop-product__title',
      price: 'span.price',
      image: 'img.attachment-woocommerce_thumbnail',
    },
  },
  {
    id: '3',
    name: 'New World Fiji',
    baseUrl: 'https://www.newworld.com.fj',
    strategy: SiteStrategy.API,
    status: ScraperStatus.SCHEDULED,
    lastRun: '2023-10-26T22:15:00Z',
    productsCount: 5890,
    schedule: 'Hourly',
    selectors: {
      productContainer: 'json.products',
      name: 'name',
      price: 'prices.final',
      image: 'images.primary',
    },
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Fiji Gold Cans 24x355ml',
    price: 68.95,
    currency: 'FJD',
    store: 'RB Patel Fiji',
    category: 'Beverages/Alcohol',
    lastUpdated: '2023-10-27T09:00:00Z',
    availability: true,
    sku: 'RBP-8821'
  },
  {
    id: 'p2',
    name: 'Sunwhite Calrose Rice 10kg',
    price: 32.50,
    currency: 'FJD',
    store: 'MH Supermarket',
    category: 'Pantry/Rice',
    lastUpdated: '2023-10-27T09:05:00Z',
    availability: true,
    sku: 'MH-10293'
  },
  {
    id: 'p3',
    name: 'Punjas Flour 5kg',
    price: 12.99,
    currency: 'FJD',
    store: 'New World Fiji',
    category: 'Pantry/Baking',
    lastUpdated: '2023-10-27T08:45:00Z',
    availability: true,
    sku: 'NW-5541'
  },
  {
    id: 'p4',
    name: 'Coca Cola 2.25L',
    price: 4.50,
    currency: 'FJD',
    store: 'RB Patel Fiji',
    category: 'Beverages/Soft Drinks',
    lastUpdated: '2023-10-27T09:10:00Z',
    availability: true,
    sku: 'RBP-1123'
  },
  {
    id: 'p5',
    name: 'Anchor Full Cream Milk Powder 400g',
    price: 15.20,
    currency: 'FJD',
    store: 'MH Supermarket',
    category: 'Dairy',
    lastUpdated: '2023-10-27T09:12:00Z',
    availability: false,
    sku: 'MH-9921'
  },
];

export const MOCK_LOGS: JobLog[] = [
  {
    id: 'j1',
    scraperId: '2',
    scraperName: 'MH Supermarket',
    startTime: '2023-10-27T08:00:00Z',
    duration: '4m 32s',
    itemsScraped: 3105,
    status: 'SUCCESS',
  },
  {
    id: 'j2',
    scraperId: '1',
    scraperName: 'RB Patel Fiji',
    startTime: '2023-10-27T03:00:00Z',
    duration: '12m 10s',
    itemsScraped: 4501,
    status: 'PARTIAL',
    errorDetails: 'Timeout on category: Electronics',
  },
  {
    id: 'j3',
    scraperId: '3',
    scraperName: 'New World Fiji',
    startTime: '2023-10-26T22:15:00Z',
    duration: '1m 45s',
    itemsScraped: 5890,
    status: 'SUCCESS',
  },
];

export const MOCK_STATS: DashboardStats = {
  totalProducts: 13515,
  activeScrapers: 3,
  successRate: 98.2,
  totalDataVolume: '45.2 MB',
};
