// Enhanced OINK FM with Web Scraping and Redis Memory
// api/enhanced-chat.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    return await handleChatGeneration(req, res);
  } else if (req.method === 'GET') {
    return await handleMemoryRetrieval(req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleChatGeneration(req, res) {
  try {
    const { cryptoData, requestType = 'segment' } = req.body;
    
    console.log('🎙️ Generating enhanced content...');
    
    // Get memory and fresh web data
    const memory = await getMemoryData();
    const webData = await scrapeWebData();
    
    // Generate contextual content
    const content = await generateEnhancedContent({
      cryptoData,
      memory,
      webData,
      requestType
    });
    
    // Store what Porky talked about
    await storeMemory({
      timestamp: Date.now(),
      content,
      topics: extractTopics(content),
      cryptoPrices: cryptoData,
      webData: webData.summary,
      type: requestType
    });
    
    res.status(200).json({ 
      content,
      metadata: {
        pumpFunData: webData.pumpFun,
        cryptoNews: webData.news,
        memoryContext: memory.recent
      }
    });
    
  } catch (error) {
    console.error('Enhanced chat error:', error);
    res.status(500).json({ error: 'Failed to generate enhanced content' });
  }
}

async function scrapeWebData() {
  console.log('🕷️ Starting web scraping...');
  
  try {
    const [pumpFunData, newsData, socialData] = await Promise.all([
      scrapePumpFun(),
      scrapeCryptoNews(),
      scrapeCryptoSocial()
    ]);

    return {
      pumpFun: pumpFunData,
      news: newsData,
      social: socialData,
      summary: generateWebDataSummary(pumpFunData, newsData, socialData)
    };
  } catch (error) {
    console.error('Web scraping failed:', error);
    return getFallbackWebData();
  }
}

async function scrapePumpFun() {
  try {
    console.log('🚀 Scraping pump.fun...');
    
    // Scrape pump.fun homepage for trending tokens
    const response = await fetch('https://pump.fun', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract token information using regex patterns
    const tokens = extractPumpFunTokens(html);
    const trending = extractTrendingTokens(html);
    const recentLaunches = extractRecentLaunches(html);
    
    console.log(`Found ${tokens.length} tokens on pump.fun`);
    
    return {
      tokens: tokens.slice(0, 5),
      trending: trending.slice(0, 3),
      recentLaunches: recentLaunches.slice(0, 3),
      totalFound: tokens.length
    };
    
  } catch (error) {
    console.error('Pump.fun scraping failed:', error);
    return getFallbackPumpFunData();
  }
}

async function scrapeCryptoNews() {
  try {
    console.log('📰 Scraping crypto news...');
    
    // Scrape CoinDesk, CoinTelegraph, etc.
    const sources = [
      'https://coindesk.com',
      'https://cointelegraph.com',
      'https://decrypt.co'
    ];
    
    const newsItems = [];
    
    for (const source of sources) {
      try {
        const response = await fetch(source, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          const headlines = extractNewsHeadlines(html, source);
          newsItems.push(...headlines);
          console.log(`Found ${headlines.length} headlines from ${source}`);
        }
      } catch (error) {
        console.log(`Failed to scrape ${source}:`, error.message);
      }
    }
    
    return {
      headlines: newsItems.slice(0, 5),
      breakingNews: findBreakingNews(newsItems),
      memecoins: findMemecoinMentions(newsItems)
    };
    
  } catch (error) {
    console.error('News scraping failed:', error);
    return { headlines: [], breakingNews: [], memecoins: [] };
  }
}

async function scrapeCryptoSocial() {
  try {
    console.log('💬 Scraping crypto social data...');
    
    // Scrape public crypto forums and social sites
    const sources = [
      'https://www.reddit.com/r/CryptoCurrency.json',
      'https://www.reddit.com/r/CryptoMoonShots.json',
      'https://www.reddit.com/r/memecoins.json'
    ];
    
    const socialData = [];
    
    for (const source of sources) {
      try {
        const response = await fetch(source);
        if (response.ok) {
          const data = await response.json();
          const posts = data.data.children.map(child => ({
            title: child.data.title,
            score: child.data.score,
            subreddit: child.data.subreddit,
            created: child.data.created_utc,
            url: `https://reddit.com${child.data.permalink}`
          }));
          socialData.push(...posts);
          console.log(`Found ${posts.length} posts from r/${posts[0]?.subreddit || 'unknown'}`);
        }
      } catch (error) {
        console.log(`Failed to scrape ${source}:`, error.message);
      }
    }
    
    return {
      hotPosts: socialData.sort((a, b) => b.score - a.score).slice(0, 5),
      trending: findTrendingCrypto(socialData),
      sentiment: analyzeSocialSentiment(socialData)
    };
    
  } catch (error) {
    console.error('Social scraping failed:', error);
    return { hotPosts: [], trending: [], sentiment: 'neutral' };
  }
}

function extractPumpFunTokens(html) {
  const tokens = [];
  
  // Look for token patterns in HTML
  const tokenRegex = /class="[^"]*token[^"]*"[^>]*>([^<]+)</gi;
  const priceRegex = /\$[\d,]+\.?\d*/g;
  const nameRegex = /[A-Z]{3,10}/g;
  
  let match;
  while ((match = tokenRegex.exec(html)) !== null && tokens.length < 20) {
    const tokenText = match[1];
    const names = tokenText.match(nameRegex);
    const prices = tokenText.match(priceRegex);
    
    if (names && names.length > 0) {
      tokens.push({
        name: names[0],
        price: prices ? prices[0] : 'N/A',
        text: tokenText.substring(0, 100)
      });
    }
  }
  
  // Alternative patterns for pump.fun
  const altRegex = /"symbol":"([A-Z]{3,10})"/g;
  while ((match = altRegex.exec(html)) !== null && tokens.length < 20) {
    tokens.push({
      name: match[1],
      price: 'N/A',
      text: `Token: ${match[1]}`
    });
  }
  
  return tokens;
}

function extractTrendingTokens(html) {
  const trending = [];
  
  // Look for trending sections
  const patterns = [
    /trending[^>]*>([^<]*)</gi,
    /"trending":\s*\[([^\]]*)\]/gi,
    /popular[^>]*>([^<]*)</gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null && trending.length < 5) {
      const text = match[1].trim();
      if (text && text.length > 2 && text.length < 20) {
        trending.push({ name: text, category: 'trending' });
      }
    }
  });
  
  return trending;
}

function extractRecentLaunches(html) {
  const launches = [];
  
  // Look for recent launch indicators
  const patterns = [
    /(?:new|launch|created)[^>]*>([^<]*)</gi,
    /"created_timestamp":\s*(\d+)/g,
    /recently\s+launched[^>]*>([^<]*)</gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null && launches.length < 5) {
      const text = match[1].trim();
      if (text && text.length > 2 && text.length < 30) {
        launches.push({ name: text, category: 'new_launch' });
      }
    }
  });
  
  return launches;
}

function extractNewsHeadlines(html, source) {
  const headlines = [];
  
  // Different patterns for different news sites
  const patterns = [
    /<h[1-3][^>]*>([^<]*(?:crypto|bitcoin|ethereum|memecoin|pump|solana)[^<]*)<\/h[1-3]>/gi,
    /<title>([^<]*(?:crypto|bitcoin|ethereum|memecoin|pump)[^<]*)<\/title>/gi,
    /class="[^"]*headline[^"]*"[^>]*>([^<]*)</gi,
    /"headline":\s*"([^"]*(?:crypto|bitcoin|ethereum|memecoin)[^"]*)"/gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null && headlines.length < 15) {
      const headline = match[1].trim();
      if (headline && headline.length > 10 && headline.length < 200) {
        headlines.push({
          title: headline,
          source: new URL(source).hostname,
          relevance: calculateRelevance(headline)
        });
      }
    }
  });
  
  return headlines.sort((a, b) => b.relevance - a.relevance);
}

function calculateRelevance(text) {
  const keywords = ['memecoin', 'pump', 'launch', 'trending', 'solana', 'ethereum', 'bitcoin', 'price', 'surge', 'moon'];
  let score = 0;
  
  keywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      score += 1;
    }
  });
  
  return score;
}

function findBreakingNews(newsItems) {
  return newsItems.filter(item => 
    item.title.toLowerCase().includes('breaking') ||
    item.title.toLowerCase().includes('urgent') ||
    item.title.toLowerCase().includes('alert') ||
    item.relevance > 2
  );
}

function findMemecoinMentions(newsItems) {
  const memecoins = [];
  const memecoinRegex = /\$[A-Z]{3,10}|PEPE|DOGE|SHIB|BONK|WIF|BRETT|POPCAT/gi;
  
  newsItems.forEach(item => {
    const matches = item.title.match(memecoinRegex);
    if (matches) {
      memecoins.push(...matches);
    }
  });
  
  return [...new Set(memecoins)];
}

function findTrendingCrypto(socialData) {
  const mentions = {};
  const cryptoRegex = /\$[A-Z]{3,10}|bitcoin|ethereum|solana|cardano|dogecoin|pepe|shib/gi;
  
  socialData.forEach(post => {
    const matches = post.title.match(cryptoRegex);
    if (matches) {
      matches.forEach(match => {
        mentions[match.toLowerCase()] = (mentions[match.toLowerCase()] || 0) + post.score;
      });
    }
  });
  
  return Object.entries(mentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([crypto, score]) => ({ crypto, score }));
}

function analyzeSocialSentiment(socialData) {
  const positiveWords = ['moon', 'pump', 'bullish', 'rocket', 'gains', 'up', 'bull', 'green'];
  const negativeWords = ['dump', 'bearish', 'crash', 'down', 'rekt', 'fall', 'bear', 'red'];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  socialData.forEach(post => {
    const text = post.title.toLowerCase();
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore += post.score;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore += post.score;
    });
  });
  
  if (positiveScore > negativeScore * 1.2) return 'bullish';
  if (negativeScore > positiveScore * 1.2) return 'bearish';
  return 'neutral';
}

function generateWebDataSummary(pumpFunData, newsData, socialData) {
  return {
    totalTokensFound: pumpFunData.totalFound || 0,
    trendingCount: pumpFunData.trending?.length || 0,
    newsHeadlines: newsData.headlines?.length || 0,
    socialPosts: socialData.hotPosts?.length || 0,
    sentiment: socialData.sentiment || 'neutral',
    topMemecoins: newsData.memecoins?.slice(0, 3) || [],
    lastUpdated: new Date().toISOString()
  };
}

async function generateEnhancedContent({ cryptoData, memory, webData, requestType }) {
  const contextPrompt = buildContextPrompt(memory, webData);
  
  const prompt = `You are Porky, the charismatic pig host of OINK FM 24.7 crypto radio.

CONTEXT FROM PREVIOUS SHOWS:
${contextPrompt}

CURRENT MARKET DATA:
${JSON.stringify(cryptoData)}

FRESH WEB DATA:
🚀 Pump.fun Findings:
- Trending tokens: ${webData.pumpFun.trending.map(t => t.name).join(', ') || 'None found'}
- Recent launches: ${webData.pumpFun.recentLaunches.map(l => l.name).join(', ') || 'None found'}
- Total tokens scraped: ${webData.pumpFun.totalFound}

📰 Crypto News Headlines:
${webData.news.headlines.slice(0, 3).map(h => `- ${h.title}`).join('\n')}

💬 Social Sentiment: ${webData.social.sentiment}
Hot Reddit Posts: ${webData.social.hotPosts.slice(0, 2).map(p => p.title).join('; ')}

INSTRUCTIONS:
Create a ${requestType} that:
1. References something you haven't talked about recently (check memory context)
2. Mentions specific findings from the web scraping (pump.fun tokens, news, social posts)
3. Uses pig puns and your signature style ("oink", "hog wild", "bacon", etc.)
4. Includes current price action but focus on NEW/SCRAPED info
5. Keep it 30-60 seconds when spoken (under 150 words)
6. End with smooth transition to music
7. Sound like you're actually browsing the web and finding this stuff live

Make it feel like you're a real DJ with insider knowledge from scouring the web!`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 250,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Content generation failed:', error);
    return getFallbackContent(webData);
  }
}

function getFallbackContent(webData) {
  const tokens = webData.pumpFun.tokens.slice(0, 2).map(t => t.name).join(' and ');
  const sentiment = webData.social.sentiment;
  
  return `Oink oink! Porky here on OINK FM! Just scraped the web and found ${webData.pumpFun.totalFound} tokens on pump.fun - ${tokens ? `including ${tokens}` : 'the market is hog wild today'}! Social sentiment is looking ${sentiment}, and the crypto community is absolutely buzzing! Let me spin some tracks while I dig deeper into this beautiful chaos!`;
}

function buildContextPrompt(memory, webData) {
  const recentTopics = memory.recent.map(m => 
    `- ${new Date(m.timestamp).toLocaleTimeString()}: ${m.topics.slice(0, 3).join(', ')}`
  ).join('\n');
  
  return `
RECENT SHOW HISTORY (avoid repeating):
${recentTopics}

PREVIOUS WEB SCRAPING RESULTS:
${memory.recent.map(m => m.webData ? `- Found: ${JSON.stringify(m.webData)}` : '').join('\n')}

AVOID REPEATING: ${memory.recentTopics.join(', ')}
`;
}

// Memory functions using Upstash Redis
async function getMemoryData() {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    const recent = await redis.lrange('porky:memory', 0, 9);
    const recentTopics = await redis.smembers('porky:recent_topics');
    
    return {
      recent: recent.map(item => JSON.parse(item)),
      recentTopics: Array.from(recentTopics)
    };
  } catch (error) {
    console.log('Memory retrieval failed:', error);
    return { recent: [], recentTopics: [] };
  }
}

async function storeMemory(memoryItem) {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    await redis.lpush('porky:memory', JSON.stringify(memoryItem));
    await redis.ltrim('porky:memory', 0, 9);
    
    for (const topic of memoryItem.topics) {
      await redis.sadd('porky:recent_topics', topic);
      await redis.expire('porky:recent_topics', 7200);
    }
    
    console.log('✅ Memory stored successfully');
  } catch (error) {
    console.log('Memory storage failed:', error.message);
  }
}

function extractTopics(content) {
  const topics = [];
  
  const coinMatches = content.match(/\$[A-Z]{3,10}/g);
  if (coinMatches) topics.push(...coinMatches);
  
  const keyPhrases = content.match(/(?:pump\.fun|launch|trending|memecoin|NFT|DeFi|solana|ethereum|bitcoin)/gi);
  if (keyPhrases) topics.push(...keyPhrases);
  
  return [...new Set(topics)];
}

async function handleMemoryRetrieval(req, res) {
  try {
    const memory = await getMemoryData();
    res.status(200).json(memory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve memory' });
  }
}

function getFallbackWebData() {
  return {
    pumpFun: { tokens: [], trending: [], recentLaunches: [], totalFound: 0 },
    news: { headlines: [], breakingNews: [], memecoins: [] },
    social: { hotPosts: [], trending: [], sentiment: 'neutral' },
    summary: { totalTokensFound: 0, sentiment: 'neutral', topMemecoins: [] }
  };
}

function getFallbackPumpFunData() {
  return {
    tokens: [],
    trending: [],
    recentLaunches: [],
    totalFound: 0
  };
}
