import { Show, SearchResult, Episode } from '../types';

const BASE_URL = 'https://api.tvmaze.com';

export const searchShows = async (query: string): Promise<SearchResult[]> => {
  const response = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Search failed');
  return response.json();
};

export const getShowDetails = async (id: number): Promise<Show> => {
  const response = await fetch(`${BASE_URL}/shows/${id}`);
  if (!response.ok) throw new Error('Failed to fetch show');
  return response.json();
};

export const getShowEpisodes = async (id: number): Promise<Episode[]> => {
  const response = await fetch(`${BASE_URL}/shows/${id}/episodes`);
  if (!response.ok) throw new Error('Failed to fetch episodes');
  return response.json();
};

// filters to exclude news, talk shows, sports, and other non-serialized content
const EXCLUDED_TYPES = [
  'News', 
  'Talk Show', 
  'Sports', 
  'Variety', 
  'Panel Show', 
  'Award Show', 
  'Game Show'
];

export const getUpcomingSchedule = async (): Promise<any[]> => {
  const days = 3;
  const schedule: any[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    
    try {
      const res = await fetch(`${BASE_URL}/schedule?country=US&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        const tagged = data.map((item: any) => ({ ...item, scheduleDate: dateStr }));
        schedule.push(...tagged);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return schedule
    .filter(item => 
      item.show && 
      item.show.image && 
      item.runtime >= 20 && 
      !EXCLUDED_TYPES.includes(item.show.type)
    )
    .sort((a, b) => {
      if (a.scheduleDate !== b.scheduleDate) {
        return a.scheduleDate.localeCompare(b.scheduleDate);
      }
      if (a.airtime !== b.airtime) {
        return a.airtime.localeCompare(b.airtime);
      }
      return (b.show?.rating?.average || 0) - (a.show?.rating?.average || 0);
    })
    .slice(0, 15);
};

export const getSchedule = async (): Promise<SearchResult[]> => {
  // for default schedule, use a set of popular queries to gather top-rated shows
  const queries = ['breaking', 'thrones', 'wire', 'sopranos', 'succession', 'bear', 'boys', 'last'];
  const resultsMap = new Map<number, SearchResult>();

  await Promise.all(queries.map(async (q) => {
    try {
      const response = await fetch(`${BASE_URL}/search/shows?q=${q}`);
      if (response.ok) {
        const data: SearchResult[] = await response.json();
        data.forEach(item => {
          if (item.show.image && item.show.rating.average) {
            resultsMap.set(item.show.id, item);
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  }));

  const allResults = Array.from(resultsMap.values());
  return allResults
    .filter(item => !EXCLUDED_TYPES.includes(item.show.type))
    .sort((a, b) => (b.show.rating.average || 0) - (a.show.rating.average || 0))
    .slice(0, 15);
};