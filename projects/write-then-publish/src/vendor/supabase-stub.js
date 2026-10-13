/**
 * 离线桩：原页面从 CDN 加载 @supabase/supabase-js。
 * 本仓库的实测环境没有外网，且这个仓库重点验证的是「本地图文排版 + 渲染」，
 * 云端账号 / 同步能力用不到，这里给出最小可用的空实现，保证 app.js 的
 * `window.supabase.createClient(...)` 调用不抛错、走本地模式。
 */
window.supabase = window.supabase || {
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOtp: async () => ({ data: null, error: new Error('offline') }),
      signOut: async () => ({ error: null }),
    },
    storage: { from: () => ({ upload: async () => ({ error: new Error('offline') }), download: async () => ({ error: new Error('offline') }) }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    functions: { invoke: async () => ({ data: null, error: new Error('offline') }) },
  }),
};
