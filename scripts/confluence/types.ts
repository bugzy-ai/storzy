export interface ConfluenceIndexPage {
  id: string;
  title: string;
  url: string;
  spaceId?: string;
  spaceKey?: string;
  status?: string;
  version?: number;
  updatedAt?: string;
  excerpt?: string;
}

export interface ConfluenceIndexFile {
  lastSyncedAt: string;
  baseUrl: string;
  cql: string;
  pageCount: number;
  pages: ConfluenceIndexPage[];
}

export interface ConfluenceContentPage {
  id: string;
  title: string;
  url: string;
  spaceId?: string;
  spaceKey?: string;
  version?: number;
  updatedAt?: string;
  storageHtml: string;
}
