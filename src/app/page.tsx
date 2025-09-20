'use client';

import { useState } from 'react';
import ContentPackageCard from '@/components/ContentPackageCard';
import ContentPackageDetail from '@/components/ContentPackageDetail';
import { ContentPackage, PlatformContent } from '@/lib/types';
import { useAutoFetchData } from '@/hooks/useAutoFetchData';
import Image from 'next/image';
import React from 'react';
import { savePlatformPosts, saveArticles, fetchRecentPosts, getCurrentUser, signOut, fetchArticlesByIds } from '@/lib/supabase';
import AuthForm from '@/components/AuthForm';
import GeneratingWireframe from '@/components/GeneratingWireframe';
import CreditWarning from '@/components/CreditWarning';
import { useCreditStatus } from '@/hooks/useCreditStatus';

export default function Dashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentPackages, setContentPackages] = useState<ContentPackage[]>([]); // kept for modal but unused in feed
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ContentPackage | null>(null);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState<boolean>(true);
  const [savedPackages, setSavedPackages] = useState<ContentPackage[]>([]);
  const [authed, setAuthed] = useState<boolean>(false);
  const [showCreditWarning, setShowCreditWarning] = useState<boolean>(false);
  
  // Check Claude credit status
  const { hasCredits, isLoading: creditLoading } = useCreditStatus();
  
  // Show credit warning when credits are exhausted
  React.useEffect(() => {
    if (!creditLoading && !hasCredits) {
      setShowCreditWarning(true);
    }
  }, [hasCredits, creditLoading]);
  
  // Auto-fetch data every 2 minutes to avoid rate limiting
  const { data: comprehensiveData, loading: dataLoading, error: dataError, lastUpdated } = useAutoFetchData({
    interval: 120000, // 2 minutes
    enabled: true
  });

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    setError(null);
    setGenLogs(['Starting pipeline...']);
    
    try {
      // Start background generation
      await fetch('/api/generate/start', { method: 'POST' });

      // Poll progress until done
      let done = false;
      while (!done) {
        const res = await fetch('/api/generate/state');
        const state = await res.json();
        if (Array.isArray(state.logs)) setGenLogs(state.logs);
        done = !!state.done;
        if (!done) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }

        if (state.result?.success) {
          const data = state.result;
          setContentPackages(data.contentPackages);

          // Save to Supabase
          const articleIdMap = new Map<string, string>();
          const generateUUIDv4 = () => {
            // RFC4122 v4-like UUID fallback when crypto.randomUUID is not available
            const rnd = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            const part1 = rnd(8);
            const part2 = rnd(4);
            const part3 = '4' + rnd(3); // version 4
            const part4 = ((8 + Math.floor(Math.random() * 4)).toString(16)) + rnd(3); // variant 10xx
            const part5 = rnd(12);
            return `${part1}-${part2}-${part3}-${part4}-${part5}`;
          };
          const articles = (data.contentPackages as ContentPackage[]).map((pkg: ContentPackage) => {
            const newId = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
              ? (globalThis.crypto as Crypto).randomUUID()
              : generateUUIDv4();
            articleIdMap.set(pkg.id, newId);
            const title = pkg.longForm?.title || 'Untitled';
            const body = pkg.longForm?.body || '';
            const summary = body.split(/\n|\.\s/)[0]?.slice(0, 240) || null;
            return { id: newId, title, url: null, summary, published_at: null };
          });
          await saveArticles(articles);

          // Save đúng tên kênh mới vào Supabase: 'social' và 'ceo'
          const normalizeChannel = (ch: string) => ch;
          const postsToSave = (data.contentPackages as ContentPackage[]).flatMap((pkg: ContentPackage) =>
            pkg.platforms.map((p) => ({
              article_id: articleIdMap.get(pkg.id) || null,
              channel: normalizeChannel(p.platform),
              content: p.content,
              published: false,
            }))
          );
          const saveResult = await savePlatformPosts(postsToSave);
          if (!saveResult.success) {
            console.error('Failed to save posts to Supabase:', saveResult.error);
          } else {
            await loadPersistedPackages();
            setGenLogs((prev) => [...prev, 'Saved to Supabase', 'Done.']);
          }
        } else if (state.result && !state.result.success) {
          if (state.result.cancelled) {
            setError('Generation cancelled by user');
          } else {
            setError('Failed to generate content');
          }
        }
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error generating content:', err);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenLogs([]), 800);
    }
  };


  // detail view currently not used in feed mode
  const handleViewDetails = (contentPackage: ContentPackage) => setSelectedPackage(contentPackage);

  const handleCloseDetails = () => {
    setSelectedPackage(null);
  };

  const loadPersistedPackages = React.useCallback(async () => {
    setFeedLoading(true);
    const posts = await fetchRecentPosts(100);
    if (!posts || posts.length === 0) {
      setContentPackages([]);
      setFeedLoading(false);
      return;
    }
    // Group posts by article_id (or batch-of-4 fallback)
    const groups = new Map<string, typeof posts>();
    let tempBatch: typeof posts = [];
    for (const p of posts) {
      const key = p.article_id ?? '';
      if (key) {
        const arr = groups.get(key) ?? [];
        arr.push(p);
        groups.set(key, arr);
      } else {
        tempBatch.push(p);
        if (tempBatch.length === 4) {
          groups.set(`${Date.now()}-${Math.random().toString(36).slice(2)}`, tempBatch);
          tempBatch = [];
        }
      }
    }
    if (tempBatch.length) {
      groups.set(`${Date.now()}-${Math.random().toString(36).slice(2)}`, tempBatch);
    }

    // Fetch related article rows to enrich longform
    const relatedArticleIds = Array.from(groups.keys()).filter(Boolean);
    const articlesMap = await fetchArticlesByIds(relatedArticleIds as string[]);

    const orderedPackages: ContentPackage[] = Array.from(groups.entries()).map(([key, gp]) => {
      const byCreated = gp.slice().sort((a, b) => (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0));
      const newest = byCreated[0];
      const platformMap = new Map<string, string>();
      for (const it of byCreated) platformMap.set(it.channel, it.content);
      const platforms: PlatformContent[] = ['twitter', 'linkedin', 'social', 'ceo'].map((pf) => ({
        platform: pf as PlatformContent['platform'],
        content: platformMap.get(pf) || '',
        mediaUrls: [],
        hashtags: [],
        characterCount: (platformMap.get(pf) || '').length,
        metadata: {
          // rudimentary metadata based on content
          hook: (platformMap.get(pf) || '').split(/[.!?]/)[0]?.slice(0, 120) || undefined,
        },
      }));
      const article = key ? articlesMap[key] : undefined;
      const derivedTitle = article?.title || 'Mine‑Muse';
      const derivedBody = article?.summary || byCreated.map((p)=>p.content).join('\n\n');
      const wordCount = (derivedTitle + ' ' + derivedBody).trim().split(/\s+/).filter(Boolean).length;
      const pkg: ContentPackage = {
        id: key || (newest?.id ?? Math.random().toString(36).slice(2)),
        longForm: {
          title: derivedTitle,
          body: derivedBody,
          comprehensiveData: {
            onChain: {
              bitcoinPrice: 0,
              difficulty: 0,
              hashrate: 0,
              blockReward: 0,
              transactionFees: 0,
              mempoolStats: { pendingTxs: 0, avgFeeRate: 0, congestionLevel: '' },
              minerRevenue: { daily: 0, monthly: 0, yearly: 0 },
              blockStats: { avgBlockTime: 0, avgBlockSize: 0, totalBlocks: 0 },
              timestamp: new Date().toISOString(),
              source: 'supabase',
            },
            sustainability: {
              carbonFootprint: {
                bitcoinNetwork: 0,
                renewableEnergyPercentage: 0,
                cleanEnergyMining: 0
              },
              energyConsumption: {
                totalNetworkConsumption: 0,
                renewableEnergyUsage: 0,
                gridStabilization: {
                  frequencyRegulation: 0,
                  demandResponse: 0
                }
              },
              dataCenterMetrics: {
                pue: 0,
                carbonIntensity: 0,
                renewableEnergyRatio: 0
              },
              miningEconomics: {
                electricityCosts: {
                  globalAverage: 0,
                  renewableEnergyCost: 0,
                  traditionalEnergyCost: 0
                },
                profitabilityMetrics: {
                  breakEvenPrice: 0,
                  profitMargin: 0,
                  roi: 0
                }
              },
              timestamp: new Date().toISOString(),
              source: 'empty'
            },
            trends: {
              socialMediaTrends: {
                twitter: {
                  hashtags: [],
                  sentiment: 'neutral' as const,
                  engagement: 0,
                  reach: 0
                },
                reddit: {
                  subreddits: [],
                  sentiment: 'neutral' as const,
                  upvotes: 0
                },
                linkedin: {
                  posts: 0,
                  sentiment: 'neutral' as const,
                  engagement: 0
                },
                youtube: {
                  videos: 0,
                  views: 0,
                  sentiment: 'neutral' as const
                }
              },
              searchTrends: {
                google: {
                  keywords: [],
                  searchVolume: [],
                  relatedQueries: []
                },
                youtube: {
                  trendingVideos: [],
                  viewCounts: []
                }
              },
              newsSentiment: {
                headlines: [],
                sentiment: 'neutral' as const,
                sources: []
              },
              institutionalAdoption: {
                corporateTreasury: 0,
                etfFlows: 0,
                regulatoryUpdates: []
              },
              timestamp: new Date().toISOString(),
              source: 'empty'
            },
            timestamp: new Date().toISOString()
          },
          metadata: { wordCount, readingTime: Math.ceil(wordCount / 200), difficulty: 0, passiveVoice: 0, industryTerms: 0, focusAreas: ['mining', 'sustainability'] },
        },
        platforms,
        status: 'draft',
        createdAt: newest?.created_at ? (newest.created_at.endsWith('Z') ? newest.created_at : `${newest.created_at}Z`) : new Date().toISOString(),
        updatedAt: newest?.created_at ? (newest.created_at.endsWith('Z') ? newest.created_at : `${newest.created_at}Z`) : new Date().toISOString(),
      };
      return pkg;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setContentPackages(orderedPackages);
    setFeedLoading(false);
  }, []);

  React.useEffect(() => {
    // Check auth once on mount
    (async () => {
      const user = await getCurrentUser();
      setAuthed(!!user);
      if (user) {
        loadPersistedPackages();
      } else {
        setFeedLoading(false);
      }
    })();

    // Load saved packages from localStorage first so UI can pin them immediately
    try {
      const raw = localStorage.getItem('mm_saved_packages_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as ContentPackage[];
        if (Array.isArray(parsed)) setSavedPackages(parsed);
      }
    } catch {}
  }, [loadPersistedPackages]);

  // Persist saved packages
  React.useEffect(() => {
    try { localStorage.setItem('mm_saved_packages_v1', JSON.stringify(savedPackages)); } catch {}
  }, [savedPackages]);

  const isSaved = (id: string) => savedPackages.some((p) => p.id === id);

  const handleToggleSave = (pkg: ContentPackage) => {
    setSavedPackages((prev) => {
      const exists = prev.some((p) => p.id === pkg.id);
      if (exists) {
        return prev.filter((p) => p.id !== pkg.id);
      }
      // Save a snapshot so it persists even if it falls out of the 100 recent posts
      return [...prev, pkg];
    });
    setToast(isSaved(pkg.id) ? 'Removed from Saved' : 'Saved');
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 2xl:max-w-[1360px] 2xl:mx-auto py-8">
        {!authed && (
          <AuthForm onSuccess={() => { setAuthed(true); loadPersistedPackages(); }} />
        )}
        {authed && (
        <>
        {/* Error Display */}
        {(error || dataError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error || dataError}
          </div>
        )}

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_240px] gap-10 xl:gap-14">
          {/* Left sidebar: live metrics */}
          <aside className="order-2 lg:order-1 -mt-1 sm:-mt-2 animate-[mm-slide-up_var(--duration-slow)_var(--ease-emphasized)]">
            <div className="lg:sticky lg:top-6">
              {/* Brand */}
              <div className="flex items-center gap-1 mb-6">
                <Image src="/logo.png" alt="Mine‑Muse" width={80} height={80} className="" style={{ backgroundColor: 'transparent' }} />
                <div className="-ml-1 sm:-ml-2">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight tracking-tight font-brand">Mine-Muse</h1>
                  <p className="text-sm text-gray-500 leading-snug">Bitcoin Mining Content</p>
                </div>
              </div>

              {/* Credit Status Indicator */}
              {!creditLoading && !hasCredits && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-yellow-800">Mock Data Mode</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Claude credits exhausted. Showing placeholder content.
                  </p>
                </div>
              )}

              {comprehensiveData && (
                <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 tracking-wide">Live Mining Metrics</h2>
                  <a href="https://mempool.space/api" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800">Source</a>
                </div>
                <div className="flex items-center justify-between mb-2 text-[11px] text-gray-500">
                  {dataLoading && (
                    <span className="inline-flex items-center space-x-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span><span>Updating</span></span>
                  )}
                  {lastUpdated && <span>{lastUpdated.toLocaleTimeString()}</span>}
                </div>
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden mm-card">
                  <li className="flex items-center justify-between px-3 py-2 text-sm"><span className="text-gray-500">Price</span><span className="font-semibold text-gray-900">${comprehensiveData.onChain.bitcoinPrice?.toLocaleString() || 'N/A'}</span></li>
                  <li className="flex items-center justify-between px-3 py-2 text-sm"><span className="text-gray-500">Difficulty</span><span className="font-semibold text-gray-900">{comprehensiveData.onChain.difficulty ? (comprehensiveData.onChain.difficulty / 1e12).toFixed(1) + 'T' : 'N/A'}</span></li>
                  <li className="flex items-center justify-between px-3 py-2 text-sm"><span className="text-gray-500">Hashrate</span><span className="font-semibold text-gray-900">{Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `${(comprehensiveData.onChain.hashrate / 1e18).toFixed(1)} EH/s` : 'N/A'}</span></li>
                  <li className="flex items-center justify-between px-3 py-2 text-sm"><span className="text-gray-500">Reward</span><span className="font-semibold text-gray-900">{comprehensiveData.onChain.blockReward || 'N/A'} BTC</span></li>
                  <li className="flex items-center justify-between px-3 py-2 text-sm"><span className="text-gray-500">Revenue</span><span className="font-semibold text-gray-900">{comprehensiveData.onChain.minerRevenue?.daily ? `$${(comprehensiveData.onChain.minerRevenue.daily / 1e6).toFixed(1)}M` : 'N/A'}</span></li>
                  <li className="flex items-center justify-between px-3 py-2 text-sm"><span className="text-gray-500">Mempool</span><span className="font-semibold text-gray-900">{comprehensiveData.onChain.mempoolStats?.pendingTxs ? `${(comprehensiveData.onChain.mempoolStats.pendingTxs / 1000).toFixed(1)}K` : 'N/A'}</span></li>
                </ul>


                {/* CTA below metrics */}
                <div className="mt-4">
                  <button
                    onClick={handleGenerateContent}
                    disabled={isGenerating}
                    className="relative w-full py-2.5 text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-black disabled:opacity-60"
                  >
                    <span className="relative z-[1] text-white">{isGenerating ? 'Generating…' : 'Generate Content'}</span>
                  </button>
                  <button
                    onClick={async () => { await signOut(); setAuthed(false); setContentPackages([]); }}
                    className="mt-2 w-full py-2.5 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                  >
                    Sign Out
                  </button>
                </div>
                </>
              )}
              {(!comprehensiveData || dataLoading) && (
                <div className="mt-2">
                  <div className="h-4 w-40 mm-shimmer rounded mb-3" />
                  <div className="mm-card divide-y divide-gray-100">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <div className="h-3 w-20 mm-shimmer rounded" />
                        <div className="h-3 w-24 mm-shimmer rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-9 mm-shimmer rounded" />
                </div>
              )}
            </div>
          </aside>

          {/* Center: latest generated content with slides */}
          <main className="order-1 lg:order-2 lg:max-w-[940px] xl:max-w-[1000px] mx-auto animate-[mm-slide-up_var(--duration-base)_var(--ease-standard)]">
            {contentPackages.length > 0 || savedPackages.length > 0 ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Generated Content ({contentPackages.length})</h2>
                  <div className="text-sm text-gray-500">{contentPackages.length} articles • {contentPackages.length * 4} platform posts</div>
                </div>
                <div className="space-y-8">
                  {(() => {
                    // Exclude saved items from the main scroller
                    const unsaved = contentPackages.filter((p) => !isSaved(p.id));
                    const groups: ContentPackage[][] = [];
                    for (let i = 0; i < unsaved.length; i += 5) {
                      groups.push(unsaved.slice(i, i + 5));
                    }
                    return groups.map((group, groupIndex) => (
                      <div key={`group-${groupIndex}`}>
                        <div className="relative my-8">
                          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-white text-gray-600 border border-gray-200 shadow-sm">
                              {groupIndex === 0 ? 'Latest' : 'Previous'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-8">
                          {group.map((pkg) => (
                            <ContentPackageCard
                              key={pkg.id}
                              contentPackage={pkg}
                              onViewDetails={handleViewDetails}
                              onToggleSave={handleToggleSave}
                              isSaved={isSaved(pkg.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}

                  {/* Pinned Saved section */}
                  {savedPackages.length > 0 && (
                    <div>
                      <div className="relative my-8">
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-white text-gray-700 border border-gray-200 shadow-sm">
                            Saved
                          </span>
                        </div>
                      </div>
                      <div className="space-y-8">
                        {savedPackages.map((pkg) => (
                          <ContentPackageCard
                            key={`saved-${pkg.id}`}
                            contentPackage={pkg}
                            onViewDetails={handleViewDetails}
                            onToggleSave={handleToggleSave}
                            isSaved
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isGenerating ? (
              <GeneratingWireframe 
                logs={genLogs} 
                onStop={() => {
                  setIsGenerating(false);
                  setGenLogs([]);
                  fetch('/api/generate/stop', { method: 'POST' });
                }} 
              />
            ) : feedLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-xl p-4 mm-card">
                    <div className="h-4 w-32 mm-shimmer rounded mb-3" />
                    <div className="flex gap-2 mb-3">
                      {Array.from({ length: 4 }).map((__, i) => (
                        <div key={i} className="h-6 w-16 mm-shimmer rounded" />
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-full mm-shimmer rounded" />
                      <div className="h-4 w-5/6 mm-shimmer rounded" />
                      <div className="h-4 w-4/6 mm-shimmer rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 animate-[mm-fade-in_var(--duration-slow)_var(--ease-standard)]">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content generated yet</h3>
                <p className="text-gray-500 mb-4">Click &quot;Generate Content&quot; to create Bitcoin mining content packages</p>
                <button
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black disabled:bg-gray-300 rounded-md mm-transition hover:shadow-md"
                >
                  {isGenerating ? 'Generating...' : 'Generate Your First Content'}
                </button>
              </div>
            )}
          </main>

          {/* Right sidebar: Compact Metrics */}
          <aside className="order-3 text-[13px] animate-[mm-slide-up_var(--duration-slow)_var(--ease-emphasized)]">
            <div className="lg:sticky lg:top-6 space-y-4">
              {/* Sources-only view: remove Sustainability cards */}
              {comprehensiveData && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-900 tracking-wide">Sources</h2>
                  </div>
                  {(() => { const prov = comprehensiveData.provenance?.sustainability; const links: string[] = [] as string[];
                    if (prov?.renewable?.url) links.push(prov.renewable.url);
                    if (prov?.pue?.url) links.push(prov.pue.url);
                    if (prov?.carbon?.url) links.push(prov.carbon.url);
                    if (prov?.breakEven?.url) links.push(prov.breakEven.url);
                    const news = Array.isArray(comprehensiveData.trends.newsSentiment.sources) ? comprehensiveData.trends.newsSentiment.sources.slice(0,8) : [];
                    const all = Array.from(new Set([...links, ...news]));
                    return (
                      <div className="text-xs text-gray-600">
                        <ul className="space-y-1 list-disc pl-5">
                          {all.map((u, i) => (
                            <li key={`src-${i}`}><a href={u} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">{u}</a></li>
                          ))}
                        </ul>
                      </div>
                    ); })()}
                </div>
              )}
            </div>
          </aside>
        </div>
        </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPackage && (
        <ContentPackageDetail
          contentPackage={selectedPackage}
          onClose={handleCloseDetails}
        />
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-md shadow-lg animate-[mm-fade-in_var(--duration-base)_var(--ease-standard)]">
          {toast}
        </div>
      )}

      {/* Credit Warning Modal */}
      <CreditWarning 
        isVisible={showCreditWarning} 
        onClose={() => setShowCreditWarning(false)} 
      />
    </div>
  );
}

// Removed SavedPosts list (feed now renders directly from Supabase)