import { createClient, type SupabaseClient, type User, type AuthChangeEvent, type Session } from '@supabase/supabase-js';

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY) as string | undefined;
  if (!url || !key) {
    console.warn('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
    return null;
  }
  // Persist session in browser so users stay logged in
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
}

export interface SavedPost {
  id?: string;
  article_id?: string | null;
  channel: string;
  content: string;
  created_at?: string;
  published?: boolean;
  user_id?: string | null;
}

export interface ArticleRow {
  id: string; // uuid
  title: string;
  url?: string | null;
  summary?: string | null;
  published_at?: string | null;
  user_id?: string | null;
}

// Auth helpers - Sign up disabled for single account system

export async function signInWithEmail(email: string, password: string) {
  const client = getClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };
  
  // Only allow specific email
  if (email !== 'Schofield.eth@gmail.com') {
    return { 
      data: null, 
      error: new Error('Access denied. Only authorized users can sign in.') 
    };
  }
  
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const client = getClient();
  if (!client) return { error: new Error('Supabase not configured') } as const;
  
  // Clear reset link usage when signing out
  if (typeof window !== 'undefined') {
    localStorage.removeItem('reset_link_used');
  }
  
  return client.auth.signOut();
}

export async function resetPassword(email: string) {
  const client = getClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };
  
  // Only allow reset for specific email
  if (email !== 'Schofield.eth@gmail.com') {
    return { 
      data: null, 
      error: new Error('Access denied. Only authorized users can reset password.') 
    };
  }
  
  try {
    const result = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    
    console.log('Reset password result:', result);
    return result;
  } catch (error) {
    console.error('Reset password error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to send reset email') 
    };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

type AuthSubscription = { data: { subscription: { unsubscribe: () => void } } };
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): AuthSubscription {
  const client = getClient();
  if (!client) return { data: { subscription: { unsubscribe: () => {} } } };
  return client.auth.onAuthStateChange(callback) as unknown as AuthSubscription;
}

// OAuth and signup functions removed for single account system

export async function savePlatformPosts(posts: SavedPost[]): Promise<{ success: boolean; error?: string }>{
  if (!posts || posts.length === 0) return { success: true };
  const client = getClient();
  if (!client) return { success: false, error: 'Supabase is not configured' };
  const { data: userRes } = await client.auth.getUser();
  const userId = userRes.user?.id ?? null;
  if (!userId) return { success: false, error: 'Not authenticated' };
  const isUuid = (value: string | null | undefined): value is string =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const sanitized = posts.map((p) => ({
    ...p,
    // Ensure uuid type or set null to let DB accept it
    article_id: isUuid(p.article_id) ? p.article_id : null,
    // Default published to false if undefined
    published: typeof p.published === 'boolean' ? p.published : false,
    user_id: userId,
  }));

  const { error } = await client.from('posts').insert(sanitized);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function fetchRecentPosts(limit = 100): Promise<SavedPost[]> {
  const client = getClient();
  if (!client) return [];
  const { data: userRes } = await client.auth.getUser();
  const userId = userRes.user?.id ?? null;
  if (!userId) {
    // When not authenticated, do not query with an empty UUID
    return [];
  }
  const query = client
    .from('posts')
    .select('id, article_id, channel, content, created_at, published')
    .order('created_at', { ascending: false })
    .limit(limit);
  const { data, error } = await query.eq('user_id', userId);
  if (error) {
    console.error('Supabase fetchRecentPosts error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function saveArticles(articles: ArticleRow[]): Promise<{ success: boolean; error?: string }>{
  if (!articles || articles.length === 0) return { success: true };
  const client = getClient();
  if (!client) return { success: false, error: 'Supabase is not configured' };
  const { data: userRes } = await client.auth.getUser();
  const userId = userRes.user?.id ?? null;
  if (!userId) return { success: false, error: 'Not authenticated' };
  const withUser = articles.map((a) => ({ ...a, user_id: userId }));
  const { error } = await client.from('articles').insert(withUser);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}


// Fetch articles by a set of ids, returns a map for easy lookup
export async function fetchArticlesByIds(ids: string[]): Promise<Record<string, ArticleRow>> {
  const result: Record<string, ArticleRow> = {};
  if (!ids || ids.length === 0) return result;
  const client = getClient();
  if (!client) return result;
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return result;
  const { data, error } = await client
    .from('articles')
    .select('id, title, url, summary, published_at, user_id')
    .in('id', unique);
  if (error || !data) return result;
  for (const row of data) {
    result[row.id] = row as ArticleRow;
  }
  return result;
}


