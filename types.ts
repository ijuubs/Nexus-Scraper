export enum ScraperStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  ERROR = 'ERROR',
  SCHEDULED = 'SCHEDULED',
}

export enum SiteStrategy {
  STATIC = 'STATIC', // Cheerio/BeautifulSoup
  DYNAMIC = 'DYNAMIC', // Playwright
  API = 'API', // Direct API
}

export interface ScraperConfig {
  id: string;
  name: string;
  baseUrl: string;
  strategy: SiteStrategy;
  status: ScraperStatus;
  lastRun: string | null;
  productsCount: number;
  schedule: string; // e.g., "Daily @ 02:00"
  selectors: {
    productContainer: string;
    name: string;
    price: string;
    image: string;
  };
}

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  store: string;
  category: string;
  sku?: string;
  imageUrl?: string;
  lastUpdated: string;
  availability: boolean;
}

export interface JobLog {
  id: string;
  scraperId: string;
  scraperName: string;
  startTime: string;
  duration: string;
  itemsScraped: number;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  errorDetails?: string;
}

export interface DashboardStats {
  totalProducts: number;
  activeScrapers: number;
  successRate: number;
  totalDataVolume: string;
}
