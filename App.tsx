import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  LayoutDashboard,
  Search as SearchIcon,
  Calendar as CalendarIcon,
  Star,
  Clock,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Loader2,
  Sparkles,
  Bell,
  LogOut,
  Mail,
  Zap,
  Activity,
  Compass,
  Layers,
  Monitor,
  AlertCircle,
  RefreshCcw,
  Play,
  CheckCircle2,
  Check,
  Lock,
  Trophy,
  Info,
  User,
  Key,
  Eye,
  CheckCheck,
} from "lucide-react";
import {
  Show,
  WatchlistItem,
  AppView,
  SearchResult,
  Episode,
  Notification,
} from "./types";
import {
  searchShows,
  getSchedule,
  getShowDetails,
  getShowEpisodes,
  getUpcomingSchedule,
} from "./services/api";
import { generateShowAnalysis, getAIRecommendation } from "./services/llm";
import { auth, db } from "./services/firebase";

// --- Components ---

const AuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
}> = ({ isOpen, onClose, onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await auth.loginWithGoogle();
      onLogin(user);
    } catch (e: any) {
      setError(e.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md surface-mid tuned-border rounded-3xl p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 tuned-gradient rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.3)]">
              <Activity size={22} className="text-black" />
            </div>
            <span className="text-2xl font-black font-outfit tracking-tighter text-white">
              TUNED
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black font-outfit mb-2 text-white">
            Cloud Sync Required
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Connect your account to sync your watchlist across all your devices.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-3 text-red-400 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-4 bg-white hover:bg-white/90 text-black font-black py-5 rounded-2xl transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <img
                src="https://www.google.com/favicon.ico"
                className="w-6 h-6"
                alt="Google"
              />
            )}
            <span className="text-lg">Continue with Google</span>
          </button>

          <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] text-center pt-4">
            By connecting, you agree to our terms of sync.
          </p>
        </div>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 relative group ${
      active ? "bg-white/5 text-white" : "text-white/40 hover:text-white"
    }`}
  >
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 tuned-gradient rounded-r-full" />
    )}
    <Icon
      size={22}
      className={active ? "text-[#00f5ff]" : "group-hover:text-white"}
    />
    <span className={`font-bold tracking-tight ${active ? "text-white" : ""}`}>
      {label}
    </span>
  </button>
);

const ShowCard: React.FC<{
  show: Show;
  onClick: (show: Show) => void;
  onAddToList?: (show: Show) => void;
  isAdded?: boolean;
  badge?: string;
  progress?: number;
}> = ({ show, onClick, onAddToList, isAdded, badge, progress }) => {
  const safeProgress =
    progress !== undefined && !isNaN(progress) ? progress : 0;

  return (
    <div className="group relative surface-low tuned-border rounded-[32px] overflow-hidden tuned-card-hover transition-all duration-500">
      <div
        className="aspect-[3/4] overflow-hidden cursor-pointer relative"
        onClick={() => onClick(show)}
      >
        <img
          src={
            show.image?.medium ||
            `https://picsum.photos/seed/${show.id}/400/600`
          }
          alt={show.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />

        {isAdded && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
            <div
              className="h-full tuned-gradient transition-all duration-1000"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        )}
      </div>

      {badge && (
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/80 backdrop-blur-xl border border-[#00f5ff]/30 text-[9px] font-black text-[#00f5ff] shadow-2xl uppercase tracking-[0.1em]">
          {badge}
        </div>
      )}

      {onAddToList && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToList(show);
          }}
          className={`absolute top-4 right-4 p-3 rounded-full transition-all duration-300 ${
            isAdded
              ? "bg-[#00f5ff] text-black cursor-default scale-110"
              : "bg-black/80 text-white hover:bg-[#00f5ff] hover:text-black border border-white/10"
          }`}
        >
          {isAdded ? <Check size={18} /> : <Plus size={18} />}
        </button>
      )}

      <div className="absolute bottom-4 left-0 right-0 px-6 pointer-events-none">
        <div className="flex items-center space-x-2 text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
          <span className="text-[#00f5ff]">{show.genres[0] || "Media"}</span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Star size={10} className="fill-[#00f5ff] text-[#00f5ff]" />
            <span>{show.rating.average || "---"}</span>
          </span>
        </div>
        <h3 className="text-white font-black text-lg line-clamp-1 leading-tight group-hover:text-[#00f5ff] transition-colors">
          {show.name}
        </h3>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [upcomingGlobal, setUpcomingGlobal] = useState<any[]>([]);
  const [featuredShows, setFeaturedShows] = useState<Show[]>([]);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [isAIFeatured, setIsAIFeatured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [showAnalysis, setShowAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);

  // Library Tab State
  const [libraryTab, setLibraryTab] = useState<
    "watching" | "plan-to-watch" | "completed"
  >("watching");

  // Detail View State
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [currentShowEpisodes, setCurrentShowEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  // Calendar states
  const [viewedDate, setViewedDate] = useState(new Date());
  const [episodeCache, setEpisodeCache] = useState<Record<number, Episode[]>>(
    {}
  );
  const [expandedShowInCalendar, setExpandedShowInCalendar] = useState<
    string | null
  >(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser: any) => {
      setUser(currentUser);
      if (currentUser) {
        setSyncing(true);
        const data = await db.getUserData(currentUser.uid);
        setWatchlist(data.watchlist || []);
        setNotifications(data.notifications || []);
        setSyncing(false);
      } else {
        setWatchlist([]);
        setNotifications([]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && !syncing) {
      db.saveUserData(user.uid, watchlist, notifications);
    }
  }, [watchlist, notifications, user, syncing]);

  // click outside listener for notifications popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen]);

  // checks for new episode releases and generate notifications
  useEffect(() => {
    if (!user || watchlist.length === 0) return;

    const todayStr = formatDateString(new Date());
    const newNotifications: Notification[] = [];

    watchlist.forEach((item) => {
      if (item.status === "watching") {
        const episodes = episodeCache[item.showId];
        if (episodes) {
          episodes.forEach((ep) => {
            if (ep.airdate === todayStr) {
              const exists = notifications.some(
                (n) =>
                  n.showId === item.showId &&
                  n.season === ep.season &&
                  n.number === ep.number
              );
              if (!exists) {
                newNotifications.push({
                  id: `notif-${item.showId}-${ep.id}-${Date.now()}`,
                  showId: item.showId,
                  showName: item.show.name,
                  episodeName: ep.name,
                  season: ep.season,
                  number: ep.number,
                  timestamp: new Date().toISOString(),
                  isRead: false,
                });
              }
            }
          });
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
    }
  }, [episodeCache, watchlist, user]);

  // handles featured/personalized dashboard trending view 
  useEffect(() => {
    const fetchFeatured = async () => {
      setFeaturedLoading(true);
      try {
        if (user && watchlist.length > 0) {
          const userShows = watchlist.map((w) => w.show);
          const aiRecs = await getAIRecommendation(userShows);

          if (aiRecs && aiRecs.length > 0) {
            const fullShows: Show[] = [];
            for (const rec of aiRecs) {
              const res = await searchShows(rec.title);
              if (res.length > 0) fullShows.push(res[0].show);
              if (fullShows.length >= 8) break;
            }

            if (fullShows.length > 0) {
              setFeaturedShows(fullShows);
              setIsAIFeatured(true);
            }
          }
        }

        // falls back to general trending if no user or no AI recs
        if (!user || featuredShows.length === 0) {
          const topShows = await getSchedule();
          setFeaturedShows(topShows.slice(0, 8).map((t) => t.show));
          setIsAIFeatured(false);
        }
      } catch (e) {
        console.error("Featured Fetch Error", e);
      } finally {
        setFeaturedLoading(false);
      }
    };
    fetchFeatured();
  }, [user, watchlist.length]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [trends, schedule] = await Promise.all([
          getSchedule(),
          getUpcomingSchedule(),
        ]);
        setTrending(trends || []);
        setUpcomingGlobal(schedule || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchMissingEpisodes = async () => {
      const activeShows = watchlist.filter(
        (item) => item.show?.status !== "Ended"
      );
      const missingIds = activeShows
        .map((item) => item.showId)
        .filter((id) => !episodeCache[id]);

      if (missingIds.length === 0) return;

      setLoadingEpisodes(true);
      const newCache = { ...episodeCache };

      try {
        for (let i = 0; i < missingIds.length; i += 5) {
          const chunk = missingIds.slice(i, i + 5);
          await Promise.all(
            chunk.map(async (id) => {
              try {
                const episodes = await getShowEpisodes(id);
                newCache[id] = episodes || [];
              } catch (err) {
                console.error(`Failed to fetch episodes for show ${id}`, err);
              }
            })
          );
          if (missingIds.length > 5)
            await new Promise((r) => setTimeout(r, 200));
        }
        setEpisodeCache(newCache);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    if (watchlist.length > 0) {
      fetchMissingEpisodes();
    }
  }, [watchlist]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setActiveView("discover");
    try {
      const results = await searchShows(searchQuery);
      setSearchResults(results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = (show: Show) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (watchlist.some((item) => item.showId === show.id)) return;
    const newItem: WatchlistItem = {
      showId: show.id,
      show,
      dateAdded: new Date().toISOString(),
      status: "plan-to-watch",
      progress: 0,
      watchedEpisodes: [],
    };
    setWatchlist([newItem, ...watchlist]);
  };

  const toggleEpisodeWatched = (showId: number, ep: Episode) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const airDate = new Date(ep.airstamp || ep.airdate);
    if (airDate > new Date()) return;

    setWatchlist((prev) =>
      prev.map((item) => {
        if (item.showId === showId) {
          const watched = item.watchedEpisodes || [];
          const isWatched = watched.includes(ep.id);
          const newWatched = isWatched
            ? watched.filter((id) => id !== ep.id)
            : [...watched, ep.id];

          let newStatus = item.status;
          const totalEps = (episodeCache[showId] || []).length;
          if (newWatched.length === 0) {
            newStatus = "plan-to-watch";
          } else if (totalEps > 0 && newWatched.length >= totalEps) {
            newStatus = "completed";
          } else {
            newStatus = "watching";
          }

          return {
            ...item,
            watchedEpisodes: newWatched,
            status: newStatus as any,
          };
        }
        return item;
      })
    );
  };

  const removeFromWatchlist = (showId: number) => {
    setWatchlist(watchlist.filter((item) => item.showId !== showId));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const openDetails = async (show: Show) => {
    setSelectedShow(show);
    setActiveView("show-details");
    setAnalyzing(true);
    setAnalysisError(false);
    setShowAnalysis(null);
    setEpisodesLoading(true);
    setCurrentShowEpisodes([]);
    setSelectedSeason(1);

    try {
      const [analysis, episodes] = await Promise.all([
        generateShowAnalysis(show),
        getShowEpisodes(show.id),
      ]);
      setShowAnalysis(analysis);
      setCurrentShowEpisodes(episodes || []);
      if (!analysis) setAnalysisError(true);
    } catch (e) {
      console.error(e);
      setAnalysisError(true);
    } finally {
      setAnalyzing(false);
      setEpisodesLoading(false);
    }
  };

  // --- TOP LEVEL HOOKS ---
  const seasons = useMemo(() => {
    const sSet = new Set<number>();
    (currentShowEpisodes || []).forEach((ep) => sSet.add(ep.season));
    return Array.from(sSet).sort((a, b) => a - b);
  }, [currentShowEpisodes]);

  const currentSeasonEpisodes = useMemo(() => {
    return (currentShowEpisodes || []).filter(
      (ep) => ep.season === selectedSeason
    );
  }, [currentShowEpisodes, selectedSeason]);

  const watchItem = useMemo(
    () =>
      selectedShow
        ? watchlist.find((w) => w.showId === selectedShow.id)
        : undefined,
    [watchlist, selectedShow]
  );

  const currentSeasonEpisodeIds = useMemo(
    () => new Set(currentSeasonEpisodes.map((ep) => ep.id)),
    [currentSeasonEpisodes]
  );

  const watchedInCurrentSeasonCount = useMemo(
    () =>
      (watchItem?.watchedEpisodes || []).filter((id) =>
        currentSeasonEpisodeIds.has(id)
      ).length,
    [watchItem?.watchedEpisodes, currentSeasonEpisodeIds]
  );

  const weekDays = useMemo(() => {
    const start = new Date(viewedDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [viewedDate]);

  const getEpisodesForDay = (date: Date) => {
    const targetDateStr = formatDateString(date);
    const results: { show: Show; episode: Episode }[] = [];
    watchlist.forEach((item) => {
      const episodes = episodeCache[item.showId];
      if (episodes) {
        const ep = episodes.find((e) => e.airdate === targetDateStr);
        if (ep) results.push({ show: item.show, episode: ep });
      }
    });
    return results;
  };

  const changeWeek = (offset: number) => {
    setViewedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + offset * 7);
      return next;
    });
  };

  const nextFeatured = () => {
    setCurrentCarouselIndex((prev) => (prev + 1) % featuredShows.length);
  };

  const prevFeatured = () => {
    setCurrentCarouselIndex(
      (prev) => (prev - 1 + featuredShows.length) % featuredShows.length
    );
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // --- View Renderers ---

  const renderDashboard = () => {
    const currentFeatured = featuredShows[currentCarouselIndex];

    return (
      <div className="space-y-16 animate-in fade-in duration-700">
        <section className="relative h-[600px] rounded-[48px] overflow-hidden group shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/5 bg-black">
          {featuredLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-[#00f5ff]" size={48} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                Calibrating Hub...
              </span>
            </div>
          ) : currentFeatured ? (
            <>
              <img
                key={currentFeatured.id}
                src={
                  currentFeatured.image?.original ||
                  currentFeatured.image?.medium
                }
                className="w-full h-full object-cover animate-in fade-in duration-1000"
                alt="Featured"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-12 flex flex-col justify-end">
                <div className="max-w-3xl space-y-8">
                  <div className="flex flex-wrap gap-4">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white text-black text-[11px] font-black tracking-widest uppercase">
                      {isAIFeatured
                        ? "Personalized for You"
                        : "Top Rated Masterpieces"}
                    </span>
                    {isAIFeatured && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#00f5ff]/20 text-[#00f5ff] text-[11px] font-black tracking-widest uppercase backdrop-blur-md border border-[#00f5ff]/30">
                        <Sparkles size={14} className="mr-2" /> AI Curated
                      </span>
                    )}
                  </div>

                  <h1 className="text-7xl md:text-8xl font-black font-outfit leading-[0.9] tracking-tighter text-white animate-in slide-in-from-left-8 duration-500">
                    {currentFeatured.name}
                  </h1>

                  <p className="text-white/60 text-xl font-medium max-w-xl line-clamp-2 leading-relaxed">
                    {(currentFeatured.summary || "").replace(/<[^>]*>?/gm, "")}
                  </p>

                  <div className="flex items-center justify-between pt-6">
                    <button
                      onClick={() => openDetails(currentFeatured)}
                      className="px-10 py-5 tuned-gradient text-black font-black rounded-full hover:scale-105 transition-all flex items-center space-x-3 shadow-[0_20px_40px_rgba(0,245,255,0.2)]"
                    >
                      <span>View Show Details</span>
                      <ChevronRight size={22} />
                    </button>

                    <div className="flex items-center space-x-4">
                      <button
                        onClick={prevFeatured}
                        className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-xl"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <div className="flex space-x-1.5">
                        {featuredShows.map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              i === currentCarouselIndex
                                ? "w-8 bg-[#00f5ff]"
                                : "w-1.5 bg-white/20"
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={nextFeatured}
                        className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-xl"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section>
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-[#00f5ff] font-black text-xs uppercase tracking-[0.3em]">
                <Clock size={14} />
                <span>Next Airing</span>
              </div>
              <h2 className="text-5xl font-black font-outfit tracking-tighter text-white">
                New Releases
              </h2>
            </div>
            <button
              onClick={() => setActiveView("calendar")}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/5 transition-all"
            >
              Full Schedule
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="animate-spin text-[#00f5ff]" size={48} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {upcomingGlobal.map((item, idx) => (
                <ShowCard
                  key={`${item.show?.id || idx}-${idx}`}
                  show={item.show}
                  onClick={openDetails}
                  onAddToList={addToWatchlist}
                  isAdded={watchlist.some((w) => w.showId === item.show?.id)}
                  badge={`${item.airtime} • ${item.scheduleDate
                    .split("-")
                    .slice(1)
                    .join("/")}`}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderMyList = () => {
    const watching = watchlist.filter((item) => item.status === "watching");
    const planToWatch = watchlist.filter(
      (item) => item.status === "plan-to-watch"
    );
    const completed = watchlist.filter((item) => item.status === "completed");
    const currentItems =
      libraryTab === "watching"
        ? watching
        : libraryTab === "plan-to-watch"
        ? planToWatch
        : completed;

    const TabButton: React.FC<{
      id: typeof libraryTab;
      label: string;
      count: number;
      icon: any;
    }> = ({ id, label, count, icon: Icon }) => (
      <button
        onClick={() => setLibraryTab(id)}
        className={`flex items-center space-x-3 px-8 py-4 rounded-3xl transition-all relative group ${
          libraryTab === id
            ? "surface-mid text-white tuned-border shadow-lg shadow-black/40"
            : "text-white/40 hover:text-white"
        }`}
      >
        <Icon
          size={18}
          className={
            libraryTab === id ? "text-[#00f5ff]" : "group-hover:text-white"
          }
        />
        <span className="font-black font-outfit uppercase tracking-wider text-xs">
          {label}
        </span>
        <span
          className={`ml-2 px-2 py-0.5 rounded-md text-[9px] font-black ${
            libraryTab === id
              ? "bg-[#00f5ff] text-black"
              : "bg-white/10 text-white/40"
          }`}
        >
          {count}
        </span>
        {libraryTab === id && (
          <div className="absolute -bottom-0.5 left-8 right-8 h-1 tuned-gradient rounded-full blur-[1px]" />
        )}
      </button>
    );

    return (
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-5xl font-black font-outfit tracking-tighter">
              My Library
            </h2>
            <p className="text-white/40 text-lg mt-2">
              Tracking {watchlist.length} shows in your collection.
            </p>
          </div>
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-40 text-center surface-mid tuned-border rounded-[48px] p-20">
            <Activity size={80} className="mb-8 text-[#00f5ff] opacity-10" />
            <h3 className="text-4xl font-black mb-4">Cloud Sync Offline</h3>
            <p className="text-white/40 max-w-md mx-auto mb-10 text-lg">
              Sign in to sync your library across all devices.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-12 py-5 tuned-gradient text-black font-black rounded-full transition-all shadow-xl hover:scale-105"
            >
              Sign In to Tuned
            </button>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 surface-mid rounded-[48px] tuned-border border-dashed border-white/10 opacity-60">
            <Layers size={80} className="mb-6 text-white/10" />
            <p className="text-xl font-bold text-white/30">
              Your library is empty
            </p>
            <button
              onClick={() => setActiveView("discover")}
              className="mt-6 text-[#00f5ff] font-black hover:underline uppercase tracking-widest text-xs"
            >
              Explore Shows
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex items-center space-x-4 p-2 surface-low rounded-[40px] tuned-border w-fit max-w-full overflow-x-auto no-scrollbar">
              <TabButton
                id="watching"
                label="Watching"
                count={watching.length}
                icon={Activity}
              />
              <TabButton
                id="plan-to-watch"
                label="Plan to Watch"
                count={planToWatch.length}
                icon={Layers}
              />
              <TabButton
                id="completed"
                label="Completed"
                count={completed.length}
                icon={Trophy}
              />
            </div>

            {currentItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                {currentItems.map((item) => {
                  const totalEps = (episodeCache[item.showId] || []).length;
                  const watchedCount = (item.watchedEpisodes || []).length;
                  const progress =
                    totalEps > 0 ? (watchedCount / totalEps) * 100 : 0;
                  return (
                    <div key={item.showId} className="relative group">
                      <ShowCard
                        show={item.show}
                        onClick={openDetails}
                        progress={progress}
                        isAdded={true}
                      />
                      <button
                        onClick={() => removeFromWatchlist(item.showId)}
                        className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10 hover:scale-110"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-32 flex flex-col items-center justify-center surface-mid rounded-[40px] tuned-border opacity-50 border-dashed">
                <SearchIcon size={48} className="text-white/10 mb-6" />
                <p className="text-white/40 font-black font-outfit uppercase tracking-widest text-xs">
                  No shows in this section
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders the redesigned cinematic Show Details view.
   */
  const renderShowDetails = () => {
    if (!selectedShow) return null;

    const isInWatchlist = watchlist.some((w) => w.showId === selectedShow.id);
    const totalEps = (currentShowEpisodes || []).length;
    const watchedEps = (watchItem?.watchedEpisodes || []).length;
    const overallProgress =
      totalEps > 0 ? Math.round((watchedEps / totalEps) * 100) : 0;

    return (
      <div className="space-y-12 animate-in fade-in duration-700 pb-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h2 className="text-3xl font-black font-outfit tracking-tighter uppercase">
              Show Details
            </h2>
          </div>
        </header>

        <button
          onClick={() => setActiveView("dashboard")}
          className="flex items-center space-x-2 text-white/40 hover:text-white transition-colors group"
        >
          <ChevronLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="font-black font-outfit uppercase tracking-widest text-[10px]">
            Return to Dashboard
          </span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* SIDEBAR COLUMN */}
          <div className="lg:col-span-4 space-y-10">
            <div className="relative group rounded-[48px] overflow-hidden tuned-border shadow-2xl aspect-[3/4]">
              <img
                src={
                  selectedShow.image?.original ||
                  selectedShow.image?.medium ||
                  `https://picsum.photos/seed/${selectedShow.id}/600/800`
                }
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                alt={selectedShow.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-[#00f5ff]/20 backdrop-blur-md border border-[#00f5ff]/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <Play
                    size={40}
                    className="text-[#00f5ff] fill-[#00f5ff] ml-2"
                  />
                </div>
              </div>

              {/* Floating Info Overlay */}
              <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-[#00f5ff] font-black text-xs">
                    <Star size={14} className="fill-[#00f5ff]" />
                    <span>{selectedShow.rating.average || "---"}/10</span>
                  </div>
                  <h1 className="text-4xl font-black font-outfit tracking-tighter leading-none">
                    {selectedShow.name}
                  </h1>
                  <p className="text-white/40 font-black text-[10px] uppercase tracking-widest">
                    {selectedShow.premiered?.split("-")[0] || ""} |{" "}
                    {selectedShow.genres[0] || "Media"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    isInWatchlist
                      ? removeFromWatchlist(selectedShow.id)
                      : addToWatchlist(selectedShow)
                  }
                  className="p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 hover:border-[#00f5ff] hover:text-[#00f5ff] transition-all pointer-events-auto"
                >
                  {isInWatchlist ? <Check size={24} /> : <Plus size={24} />}
                </button>
              </div>
            </div>

            {/* PROGRESS CARD */}
            <div className="surface-mid rounded-[40px] p-8 tuned-border space-y-8 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                  Series Progress
                </span>
                <span className="text-[#00f5ff] font-black font-outfit text-xl">
                  {overallProgress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full tuned-gradient shadow-[0_0_15px_rgba(0,245,255,0.5)] transition-all duration-1000"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-2xl font-black font-outfit">
                    {watchedEps}
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/20">
                    Completed
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-2xl font-black font-outfit">
                    {totalEps - watchedEps}
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/20">
                    Remaining
                  </div>
                </div>
              </div>
            </div>

            {/* SUMMARY & AI TAKES */}
            <div className="space-y-8">
              <div className="space-y-3">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                  Summary
                </span>
                <div
                  className="text-white/60 text-sm leading-relaxed font-medium prose prose-invert"
                  dangerouslySetInnerHTML={{ __html: selectedShow.summary }}
                />
              </div>

              {/* Sidebar AI Analysis */}
              <div className="pt-8 border-t border-white/5 space-y-8">
                <div className="flex items-center space-x-3 text-[#00f5ff]">
                  <Sparkles size={16} />
                  <span className="font-black uppercase tracking-[0.3em] text-[9px]">
                    Tuned AI Analysis
                  </span>
                </div>
                {analyzing ? (
                  <div className="py-4 flex items-center space-x-3 opacity-40 animate-pulse">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Scanning DNA...
                    </span>
                  </div>
                ) : showAnalysis ? (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-500">
                    <p className="text-white/70 italic text-sm leading-relaxed font-medium">
                      "{showAnalysis.whyWatch}"
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                          Target Audience
                        </div>
                        <div className="text-xs font-bold text-white/80">
                          {showAnalysis.targetAudience}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                          Quality Score
                        </div>
                        <div className="flex items-end space-x-1">
                          <span className="text-2xl font-black font-outfit text-[#00f5ff]">
                            {showAnalysis.aiRating}
                          </span>
                          <span className="text-[10px] text-white/20 pb-1">
                            /10
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* MAIN COLUMN */}
          <div className="lg:col-span-8 space-y-10">
            {/* SEASON SELECTOR HEADER */}
            <div className="space-y-8">
              <div className="flex flex-wrap gap-3">
                {seasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeason(s)}
                    className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all duration-300 border ${
                      selectedSeason === s
                        ? "bg-[#00f5ff] text-black border-[#00f5ff] shadow-[0_0_25px_rgba(0,245,255,0.4)]"
                        : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    Season {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="space-y-1">
                  <h3 className="text-4xl font-black font-outfit tracking-tighter">
                    {watchedInCurrentSeasonCount} of{" "}
                    {currentSeasonEpisodes.length} episodes watched
                  </h3>
                  <div className="w-full h-1.5 bg-white/5 rounded-full mt-4">
                    <div
                      className="h-full tuned-gradient transition-all duration-1000"
                      style={{
                        width: `${
                          (watchedInCurrentSeasonCount /
                            currentSeasonEpisodes.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-[#00f5ff] animate-pulse">
                  <Activity size={16} />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                    Library Sync Active
                  </span>
                </div>
              </div>
            </div>

            {/* EPISODE LIST */}
            {episodesLoading ? (
              <div className="py-40 flex flex-col items-center justify-center opacity-40">
                <Loader2 className="animate-spin mb-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Fetching Episode Metadata...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {currentSeasonEpisodes.map((ep) => {
                  const isWatched = watchItem?.watchedEpisodes?.includes(ep.id);
                  const isFuture =
                    new Date(ep.airstamp || ep.airdate) > new Date();

                  return (
                    <div
                      key={ep.id}
                      className={`group flex items-center justify-between p-6 surface-mid rounded-[40px] tuned-border transition-all duration-500 ${
                        isWatched
                          ? "bg-white/[0.02] border-white/5 opacity-50"
                          : "hover:border-[#00f5ff]/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                      }`}
                    >
                      <div className="flex items-center space-x-8 flex-1 min-w-0">
                        {/* Episode Index */}
                        <div className="text-3xl font-black font-outfit text-white/10 shrink-0 w-8">
                          {ep.number}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-36 aspect-video rounded-2xl overflow-hidden shrink-0 tuned-border relative">
                          <img
                            src={
                              ep.image?.medium ||
                              `https://picsum.photos/seed/ep-${ep.id}/300/170`
                            }
                            alt={ep.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 space-y-1">
                          <h4 className="text-lg font-black font-outfit tracking-tight truncate text-white transition-colors group-hover:text-[#00f5ff]">
                            {ep.name}
                          </h4>
                          <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-white/30">
                            <span className="flex items-center space-x-1">
                              <Star
                                size={12}
                                className="text-[#00f5ff] fill-[#00f5ff]"
                              />
                              <span className="text-white/60">
                                {selectedShow.rating.average || "--"}
                              </span>
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(ep.airdate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Check Action */}
                      <button
                        disabled={isFuture}
                        onClick={() =>
                          toggleEpisodeWatched(selectedShow.id, ep)
                        }
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                          isWatched
                            ? "bg-transparent text-[#00f5ff] border border-[#00f5ff]/30"
                            : isFuture
                            ? "bg-white/5 text-white/5 cursor-not-allowed border border-white/5"
                            : "bg-white/5 text-white/20 hover:text-[#00f5ff] hover:bg-[#00f5ff]/10 border border-white/5 group-hover:border-[#00f5ff]/40"
                        }`}
                      >
                        {isWatched ? (
                          <CheckCircle2 size={32} />
                        ) : isFuture ? (
                          <Lock size={24} />
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-current opacity-20" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDiscover = () => (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-5xl font-black font-outfit tracking-tighter">
          Explore
        </h2>
        <p className="text-white/40 text-lg mt-2">
          Discover your next favorite series.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {(searchResults.length > 0 ? searchResults : trending).map((r, idx) => (
          <ShowCard
            key={`${r.show.id}-${idx}`}
            show={r.show}
            onClick={openDetails}
            onAddToList={addToWatchlist}
            isAdded={watchlist.some((w) => w.showId === r.show.id)}
            progress={
              watchlist.find((w) => w.showId === r.show.id)?.watchedEpisodes
                ?.length
                ? (watchlist.find((w) => w.showId === r.show.id)!
                    .watchedEpisodes.length /
                    (episodeCache[r.show.id]?.length || 1)) *
                  100
                : 0
            }
          />
        ))}
      </div>
    </div>
  );

  const renderCalendar = () => {
    const startOfWeek = weekDays[0];
    const endOfWeek = weekDays[6];

    return (
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2 className="text-5xl font-black font-outfit tracking-tighter">
              Release Schedule
            </h2>
            <p className="text-white/40 text-lg mt-2">
              Personalized airing grid for your tracked series.
            </p>
          </div>

          <div className="flex items-center space-x-4 p-2 surface-mid rounded-full tuned-border shadow-xl">
            <button
              onClick={() => changeWeek(-1)}
              className="p-4 hover:bg-white/5 rounded-full text-white/60 hover:text-[#00f5ff] transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="px-6 py-2 bg-white/5 rounded-full text-xs font-black uppercase tracking-widest text-white/80">
              {startOfWeek.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              —{" "}
              {endOfWeek.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <button
              onClick={() => changeWeek(1)}
              className="p-4 hover:bg-white/5 rounded-full text-white/60 hover:text-[#00f5ff] transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {weekDays.map((date) => {
            const dateStr = formatDateString(date);
            const isToday = dateStr === formatDateString(new Date());
            const releases = getEpisodesForDay(date);

            return (
              <div
                key={dateStr}
                className={`flex flex-col min-h-[600px] rounded-[40px] p-6 transition-all duration-500 ${
                  isToday
                    ? "bg-[#00f5ff]/5 tuned-border border-[#00f5ff]/40 shadow-[0_0_50px_rgba(0,245,255,0.1)]"
                    : "surface-mid tuned-border hover:border-white/10"
                }`}
              >
                <div className="mb-8 pb-4 border-b border-white/5">
                  <h3
                    className={`font-black text-[10px] tracking-[0.4em] uppercase mb-2 ${
                      isToday ? "text-[#00f5ff]" : "text-white/30"
                    }`}
                  >
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </h3>
                  <p
                    className={`text-4xl font-black font-outfit ${
                      isToday ? "text-white" : "text-white/60"
                    }`}
                  >
                    {date.getDate()}
                  </p>
                </div>

                <div className="flex flex-col space-y-4 flex-1">
                  {loadingEpisodes ? (
                    <div className="flex-1 flex items-center justify-center py-10 opacity-20">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  ) : releases.length > 0 ? (
                    releases.map(({ show, episode }) => {
                      const expandKey = `${show.id}-${dateStr}`;
                      const isExpanded = expandedShowInCalendar === expandKey;
                      const estTime = episode.airstamp
                        ? new Intl.DateTimeFormat("en-US", {
                            timeZone: "America/New_York",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          }).format(new Date(episode.airstamp))
                        : episode.airtime;

                      return (
                        <div key={expandKey} className="group relative">
                          <div
                            onClick={() =>
                              setExpandedShowInCalendar(
                                isExpanded ? null : expandKey
                              )
                            }
                            className={`relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 shadow-2xl ${
                              isExpanded
                                ? "ring-4 ring-[#00f5ff] scale-95"
                                : "hover:scale-105 hover:ring-2 hover:ring-white/20"
                            }`}
                          >
                            <img
                              src={
                                show.image?.medium ||
                                `https://picsum.photos/seed/${show.id}/400/600`
                              }
                              className="w-full h-full object-cover"
                              alt={show.name}
                            />
                            <div
                              className={`absolute inset-0 bg-gradient-to-t from-black via-transparent transition-opacity duration-500 ${
                                isExpanded
                                  ? "opacity-90"
                                  : "opacity-60 group-hover:opacity-80"
                              }`}
                            />
                            {!isExpanded && (
                              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                <span className="text-[9px] font-black text-white/90 truncate mr-2">
                                  {show.name}
                                </span>
                                <div className="p-1.5 bg-white/10 backdrop-blur-md rounded-lg text-white/60">
                                  <Info size={10} />
                                </div>
                              </div>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="mt-4 p-5 surface-high rounded-3xl border border-[#00f5ff]/30 animate-in slide-in-from-top-4 duration-300 shadow-2xl z-10">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-[#00f5ff] uppercase tracking-widest">
                                  S{episode.season} E{episode.number}
                                </span>
                                <div className="flex items-center space-x-1 text-white/40">
                                  <Clock size={10} />
                                  <span className="text-[9px] font-black">
                                    {estTime} EST
                                  </span>
                                </div>
                              </div>
                              <h4 className="text-xs font-bold text-white mb-4 line-clamp-2 leading-tight">
                                {episode.name}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetails(show);
                                }}
                                className="w-full py-2.5 bg-[#00f5ff]/10 hover:bg-[#00f5ff] text-[#00f5ff] hover:text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all border border-[#00f5ff]/20"
                              >
                                View Series
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-5">
                      <Zap size={40} />
                      <span className="mt-4 text-[9px] font-black uppercase tracking-widest">
                        Quiet Frequency
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen surface-low text-white flex">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={(u) => {
          setUser(u);
          setIsAuthModalOpen(false);
        }}
      />

      <aside className="fixed left-0 top-0 bottom-0 w-80 surface-mid tuned-border border-y-0 border-l-0 p-10 flex flex-col justify-between hidden xl:flex z-50">
        <div className="space-y-16">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 tuned-gradient rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,245,255,0.4)]">
              <Activity className="text-black" size={26} />
            </div>
            <div>
              <span className="text-3xl font-black font-outfit tracking-tighter leading-none block text-white">
                TUNED
              </span>
              <span className="text-[10px] font-black tracking-[0.4em] text-[#00f5ff] uppercase opacity-70">
                Series Tracker
              </span>
            </div>
          </div>

          <nav className="space-y-3">
            <SidebarItem
              icon={LayoutDashboard}
              label="Dashboard"
              active={activeView === "dashboard"}
              onClick={() => setActiveView("dashboard")}
            />
            <SidebarItem
              icon={Compass}
              label="Explore"
              active={activeView === "discover"}
              onClick={() => setActiveView("discover")}
            />
            <SidebarItem
              icon={Monitor}
              label="My Library"
              active={activeView === "mylist"}
              onClick={() => setActiveView("mylist")}
            />
            <SidebarItem
              icon={CalendarIcon}
              label="Schedule"
              active={activeView === "calendar"}
              onClick={() => setActiveView("calendar")}
            />
          </nav>
        </div>

        <div>
          {user ? (
            <div className="surface-high p-6 rounded-[32px] tuned-border">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-14 h-14 rounded-full border-2 border-[#00f5ff] p-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-black truncate leading-none mb-1 text-white">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-[#00f5ff] font-black uppercase tracking-widest">
                    Connected
                  </p>
                </div>
              </div>
              <button
                onClick={() => auth.logout()}
                className="w-full flex items-center justify-center space-x-3 py-4 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-2xl text-xs font-black transition-all border border-white/5"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full tuned-gradient text-black font-black py-5 rounded-full transition-all shadow-[0_20px_40px_rgba(0,245,255,0.2)] hover:scale-105"
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 ml-0 xl:ml-80">
        <header className="sticky top-0 bg-black/60 backdrop-blur-3xl h-24 px-12 flex items-center justify-between z-40 border-b border-white/5 hidden md:flex">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-black font-outfit tracking-tight capitalize text-white">
              {activeView.replace("-", " ")}
            </h2>
            <div className="h-4 w-[2px] bg-white/10" />
            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">
              <span>Personal Dashboard</span>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search frequencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 text-sm focus:border-[#00f5ff] w-80 transition-all outline-none text-white"
              />
              <SearchIcon
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-3 surface-mid tuned-border rounded-full hover:bg-[#00f5ff] hover:text-black transition-all relative ${
                  unreadCount > 0 ? "text-[#00f5ff]" : "text-white/40"
                }`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-black">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover */}
              {isNotificationsOpen && (
                <div className="absolute top-16 right-0 w-[400px] surface-high tuned-border rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200 z-[60]">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-black font-outfit uppercase tracking-widest text-xs">
                      Notifications
                    </h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="flex items-center space-x-2 text-[#00f5ff] hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                      >
                        <CheckCheck size={14} />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-[500px] overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-12 text-center opacity-30">
                        <Zap size={32} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          No Alerts Transmitted
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-6 flex items-start space-x-4 hover:bg-white/[0.02] transition-colors relative group ${
                              !notif.isRead ? "bg-[#00f5ff]/5" : ""
                            }`}
                          >
                            <div
                              className={`shrink-0 w-2 h-2 rounded-full mt-2 ${
                                !notif.isRead
                                  ? "bg-[#00f5ff] shadow-[0_0_8px_#00f5ff]"
                                  : "bg-white/10"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-sm leading-tight mb-1">
                                New episode for{" "}
                                <span className="text-[#00f5ff]">
                                  {notif.showName}
                                </span>
                              </p>
                              <p className="text-white/40 text-xs truncate">
                                S{notif.season} E{notif.number} —{" "}
                                {notif.episodeName}
                              </p>
                              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-2">
                                {new Date(notif.timestamp).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                            </div>
                            {!notif.isRead && (
                              <button
                                onClick={() => markNotificationAsRead(notif.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:text-[#00f5ff] transition-all"
                                title="Mark as read"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-12 max-w-[1600px] mx-auto">
          {activeView === "dashboard" && renderDashboard()}
          {activeView === "discover" && renderDiscover()}
          {activeView === "mylist" && renderMyList()}
          {activeView === "show-details" && renderShowDetails()}
          {activeView === "calendar" && renderCalendar()}
        </div>
      </main>
    </div>
  );
};

export default App;
