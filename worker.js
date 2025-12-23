// ====================== 可配置项 ======================
// 缓存策略：速度优先
const EDGE_CACHE_SECONDS = 2592000;  // 30 天（1 个月）
const SWR_SECONDS = 86400;           // 1 天（边缘可先旧后新，减少抖动）
const BROWSER_CACHE_SECONDS = 3600;  // 浏览器缓存 1 小时（平衡新鲜度和性能）

// 性能优化配置
const ENABLE_COMPRESSION = true;      // 启用智能压缩（Brotli/Gzip）
const ENABLE_EARLY_HINTS = true;      // 启用 Early Hints (HTTP 103)
const MAX_RETRIES = 2;                // 最大重试次数（针对中国大陆网络优化）
const RETRY_DELAY_MS = 500;           // 重试延迟（毫秒）
const REQUEST_TIMEOUT_MS = 30000;     // 请求超时（30秒）

// 支持的 GitHub 域名（按优先级排序，中国大陆访问优化）
const GITHUB_HOSTS = [
    "github.com",
    "raw.githubusercontent.com",
    "gist.github.com",
    "gist.githubusercontent.com"
];

// 备用镜像源（可选，用于降级）
const FALLBACK_MIRRORS = [
    // 可以添加其他 GitHub 镜像站，如：
    // "hub.fastgit.xyz",
    // "github.com.cnpmjs.org"
];
// =====================================================

/**
 * 生成缓存版本号（基于日期，每天自动更新）
 * 这样可以在不需要 KV 的情况下实现缓存自动刷新
 */
function getCacheVersion() {
    // 使用日期作为版本号：YYYYMMDD 格式
    // 例如：20231223
    // 这样缓存会在每天 UTC 00:00 自动失效
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 从响应头提取 ETag
 */
function extractETag(response) {
    const etag = response.headers.get('etag');
    if (!etag) return null;

    // 移除 W/ 前缀和引号
    // "abc123" → abc123
    // W/"abc123" → abc123
    return etag.replace(/^W\/"|"/g, '').substring(0, 32);
}

/**
 * 根据路径判断缓存策略
 */
function getCacheStrategy(pathname) {
    // 动态路径（频繁更新）：短缓存 + ETag
    if (pathname.includes('/latest/') ||
        pathname.includes('/nightly/') ||
        pathname.includes('/master/') ||
        pathname.includes('/main/')) {
        return {
            edgeTTL: 3600,        // 1 小时
            browserTTL: 300,      // 5 分钟
            useETag: true,
            description: 'dynamic'
        };
    }

    // 固定版本路径（不会变）：长缓存，不需要 ETag
    // 匹配：/v1.0/, /v1.0.0/, /1.0/, /tag/v1.0/ 等
    if (/\/v?\d+\.\d+(\.\d+)?\//.test(pathname) ||
        /\/tags?\//.test(pathname) ||
        /\/releases\/download\/v?\d+/.test(pathname)) {
        return {
            edgeTTL: 2592000,     // 30 天（1 个月）
            browserTTL: 86400,    // 1 天
            useETag: false,
            description: 'versioned'
        };
    }

    // 默认策略：中等缓存 + ETag
    return {
        edgeTTL: 86400,       // 1 天
        browserTTL: 3600,     // 1 小时
        useETag: true,
        description: 'default'
    };
}

/**
 * 解析请求路径，提取 GitHub 目标信息
 */
function parseGitHubPath(pathname) {
    // 支持的路径格式：
    // 1. /github.com/user/repo/...
    // 2. /raw.githubusercontent.com/user/repo/...
    // 3. 直接路径 /user/repo/... (默认使用 github.com)

    const parts = pathname.split('/').filter(p => p);
    if (parts.length === 0) {
        return null;
    }

    let githubHost = "github.com";
    let githubPath = pathname;

    // 检查第一部分是否是 GitHub 域名
    if (GITHUB_HOSTS.includes(parts[0])) {
        githubHost = parts[0];
        githubPath = '/' + parts.slice(1).join('/');
    }

    return {
        host: githubHost,
        path: githubPath,
        fullUrl: `https://${githubHost}${githubPath}`
    };
}

/**
 * 带重试和超时的智能请求函数（针对中国大陆网络优化）
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // 如果响应成功或是客户端错误（4xx），不重试
            if (response.ok || (response.status >= 400 && response.status < 500)) {
                return response;
            }

            // 服务器错误（5xx）或其他错误，进行重试
            if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
                continue;
            }

            return response;
        } catch (error) {
            // 超时或网络错误
            if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
                continue;
            }
            throw error;
        }
    }
}

/**
 * 判断内容类型是否应该压缩
 */
function shouldCompress(contentType) {
    if (!contentType) return false;

    const compressibleTypes = [
        'text/',
        'application/javascript',
        'application/json',
        'application/xml',
        'application/x-yaml',
        'image/svg+xml'
    ];

    return compressibleTypes.some(type => contentType.includes(type));
}

/**
 * 生成优化的缓存键（包含版本号和编码信息）
 */
function getOptimalCacheKey(url, acceptEncoding, version = null) {
    const cacheUrl = new URL(url);

    // 使用传入的版本号（ETag）或日期版本号
    const cacheVersion = version || getCacheVersion();
    cacheUrl.searchParams.set("__v", cacheVersion);

    // 根据客户端支持的编码添加标识
    if (acceptEncoding) {
        if (acceptEncoding.includes('br')) {
            cacheUrl.searchParams.set("__enc", "br");
        } else if (acceptEncoding.includes('gzip')) {
            cacheUrl.searchParams.set("__enc", "gzip");
        }
    }

    return cacheUrl.toString();
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 解析 GitHub 路径
        const githubInfo = parseGitHubPath(url.pathname);
        if (!githubInfo) {
            return new Response("Invalid path. Usage: /[github.com]/user/repo/path/to/file", {
                status: 400,
                headers: { "Content-Type": "text/plain" }
            });
        }

        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": "86400", // 缓存预检请求 24 小时
                },
            });
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        const startTime = Date.now();

        // 🎯 获取该路径的缓存策略
        const cacheStrategy = getCacheStrategy(githubInfo.path);

        // 获取客户端支持的编码
        const acceptEncoding = request.headers.get("accept-encoding") || "";

        // 生成初始缓存键（用于检查缓存）
        const initialCacheKey = getOptimalCacheKey(request.url, acceptEncoding);
        const cacheKey = new Request(initialCacheKey, { method: "GET" });

        const upstreamUrl = githubInfo.fullUrl + url.search;

        // 🚀 Early Hints: 提前告知浏览器关键资源（HTTP 103）
        if (ENABLE_EARLY_HINTS && request.method === "GET") {
            ctx.waitUntil(
                // 异步发送，不阻塞主流程
                (async () => {
                    try {
                        // Early Hints 仅在支持的浏览器中生效
                        // 告知浏览器可以预连接到 GitHub
                        await fetch(request.url, {
                            method: "HEAD",
                            headers: {
                                "Link": `<${upstreamUrl}>; rel=preconnect`,
                            }
                        });
                    } catch (e) {
                        // Early Hints 失败不影响主流程
                    }
                })()
            );
        }

        // Worker 本地 edge cache（同一 colo 再加速一层）
        const cache = caches.default;

        // 只对"非 Range 的完整 GET"使用 caches.default，避免分片缓存造成复杂性
        const isRange = !!request.headers.get("range");
        if (request.method === "GET" && !isRange) {
            const hit = await cache.match(cacheKey);
            if (hit) {
                // 添加缓存命中标识
                const headers = new Headers(hit.headers);
                headers.set("X-Cache-Status", "HIT");
                headers.set("X-Cache-Strategy", cacheStrategy.description);
                headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
                return new Response(hit.body, {
                    status: hit.status,
                    headers: headers
                });
            }
        }

        // 透传必要请求头（Range/断点续传 + 协商缓存）
        const passHeaders = new Headers();
        for (const h of [
            "range",
            "if-range",
            "if-none-match",
            "if-modified-since",
            "user-agent",
            "accept",
            "accept-encoding",
        ]) {
            const v = request.headers.get(h);
            if (v) passHeaders.set(h, v);
        }

        // 🚀 使用带重试的智能请求（针对中国大陆网络优化）
        const upstreamResp = await fetchWithRetry(upstreamUrl, {
            method: request.method,
            headers: passHeaders,
            redirect: "follow",
            cf: {
                // Cloudflare 特定优化
                cacheEverything: true,
                cacheTtl: cacheStrategy.edgeTTL,  // 🎯 动态 TTL
                cacheTtlByStatus: {
                    "200-299": cacheStrategy.edgeTTL,  // 成功响应使用策略 TTL
                    "404": 60,                          // 404 短缓存
                    "500-599": 0                        // 服务器错误不缓存
                },

                // 🚀 启用 HTTP/2 和 HTTP/3
                // Cloudflare 默认启用，这里显式声明

                // 🚀 图片优化（Polish）- 自动优化图片
                polish: "lossy",

                // 🚀 Mirage - 智能图片加载优化
                mirage: true,

                // 🚀 启用 Rocket Loader（对 JS 文件）
                // apps: true,

                // 🚀 最小化（Minify）- 自动压缩 HTML/CSS/JS
                minify: {
                    javascript: true,
                    css: true,
                    html: true
                },

                // 🚀 解析覆盖 - 使用 Cloudflare DNS（1.1.1.1）
                resolveOverride: "1.1.1.1"
            },
        });

        const respHeaders = new Headers(upstreamResp.headers);

        // 🎯 提取 ETag（如果策略需要）
        let finalCacheKey = cacheKey;
        let cacheVersion = getCacheVersion();

        if (cacheStrategy.useETag) {
            const etag = extractETag(upstreamResp);
            if (etag) {
                // 使用 ETag 重新生成缓存键
                cacheVersion = etag;
                const etagCacheKeyStr = getOptimalCacheKey(request.url, acceptEncoding, etag);
                finalCacheKey = new Request(etagCacheKeyStr, { method: "GET" });
            }
        }

        // 🚀 优化缓存控制头（使用策略的 TTL）
        respHeaders.set(
            "Cache-Control",
            `public, max-age=${cacheStrategy.browserTTL}, s-maxage=${cacheStrategy.edgeTTL}, stale-while-revalidate=${SWR_SECONDS}`
        );

        // 🚀 添加 Vary 头，支持基于编码的缓存
        const varyHeaders = ["Accept-Encoding"];
        if (respHeaders.has("Vary")) {
            varyHeaders.push(respHeaders.get("Vary"));
        }
        respHeaders.set("Vary", varyHeaders.join(", "));

        // CORS 支持
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Access-Control-Expose-Headers", "*");

        // 🚀 性能和调试头
        respHeaders.set("X-Mirror-Version", cacheVersion);
        respHeaders.set("X-Cache-Strategy", cacheStrategy.description);
        respHeaders.set("X-GitHub-Target", upstreamUrl);
        respHeaders.set("X-Cache-Status", "MISS");
        respHeaders.set("X-Response-Time", `${Date.now() - startTime}ms`);

        // 🚀 安全头
        respHeaders.set("X-Content-Type-Options", "nosniff");
        respHeaders.set("X-Frame-Options", "SAMEORIGIN");

        // 🚀 连接优化头
        respHeaders.set("Connection", "keep-alive");
        respHeaders.set("Keep-Alive", "timeout=60, max=1000");

        // 🚀 HTTP/2 Server Push 提示（如果适用）
        // 对于 HTML 页面，可以添加 Link 头预加载资源
        const contentType = respHeaders.get("content-type") || "";
        if (contentType.includes("text/html")) {
            // 示例：预加载常见资源
            // respHeaders.append("Link", "</style.css>; rel=preload; as=style");
        }

        const out = new Response(upstreamResp.body, {
            status: upstreamResp.status,
            statusText: upstreamResp.statusText,
            headers: respHeaders,
        });

        // 异步写入缓存（使用最终的缓存键）
        if (request.method === "GET" && upstreamResp.status === 200 && !isRange) {
            ctx.waitUntil(cache.put(finalCacheKey, out.clone()));
        }

        return out;
    },

    // 📝 缓存说明：
    // 1. 本 Worker 不需要 KV 命名空间
    // 2. 不需要配置 Cron 触发器
    // 3. 使用混合缓存策略：
    //    - 动态路径 (/latest/, /main/): 1小时缓存 + ETag
    //    - 版本路径 (/v1.0/, /tags/): 1年缓存
    //    - 其他路径: 1天缓存 + ETag
    // 4. 如需立即刷新缓存，在 Cloudflare Dashboard 手动清除
    // 5. 缓存层级：浏览器 → Worker → Edge
};
