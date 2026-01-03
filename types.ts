
export interface Show {
  id: number;
  url: string;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  runtime: number | null;
  averageRuntime: number | null;
  premiered: string;
  officialSite: string | null;
  schedule: {
    time: string;
    days: string[];
  };
  rating: {
    average: number | null;
  };
  image: {
    medium: string;
    original: string;
  } | null;
  summary: string;
  updated: number;
}

export interface SearchResult {
  score: number;
  show: Show;
}

export interface WatchlistItem {
  showId: number;
  show: Show;
  dateAdded: string;
  status: 'watching' | 'plan-to-watch' | 'completed' | 'dropped';
  progress: number; 
  watchedEpisodes: number[];
}

export interface Episode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number;
  airdate: string;
  airtime: string;
  airstamp: string;
  runtime: number;
  summary: string;
  image?: {
    medium: string;
    original: string;
  };
}

export interface Notification {
  id: string;
  showId: number;
  showName: string;
  episodeName: string;
  season: number;
  number: number;
  timestamp: string;
  isRead: boolean;
}

export type AppView = 'dashboard' | 'discover' | 'mylist' | 'show-details' | 'calendar';
