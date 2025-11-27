/**
 * TrendAnalyzer - Identifies trending topics and keywords
 */
class TrendAnalyzer {
  constructor() {
    // Common words to exclude from trend analysis
    this.stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
      'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
      'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
      'were', 'said', 'did', 'having', 'may', 'should', 'am', 'im', 'dont',
      'doesnt', 'didnt', 'isnt', 'arent', 'wasnt', 'werent', 'wont', 'wouldnt',
      'cant', 'couldnt', 'shouldnt', 'ive', 'youve', 'theyve', 'weve', 'youre',
      'theyre', 'were', 'hes', 'shes', 'its', 'thats', 'whats', 'heres', 'theres'
    ]);
  }

  /**
   * Extract and count keywords from text
   * @param {string} text - Text to extract keywords from
   * @returns {Object} Keyword frequency map
   */
  extractKeywords(text) {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !this.stopWords.has(word) &&
        !/^\d+$/.test(word) // Exclude pure numbers
      );

    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return frequency;
  }

  /**
   * Merge multiple keyword frequency maps
   * @param {Array<Object>} frequencyMaps - Array of frequency maps
   * @returns {Object} Merged frequency map
   */
  mergeFrequencies(frequencyMaps) {
    const merged = {};
    
    frequencyMaps.forEach(map => {
      Object.entries(map).forEach(([word, count]) => {
        merged[word] = (merged[word] || 0) + count;
      });
    });

    return merged;
  }

  /**
   * Get top keywords from frequency map
   * @param {Object} frequencies - Keyword frequency map
   * @param {number} limit - Number of top keywords to return
   * @returns {Array} Array of {keyword, count} objects
   */
  getTopKeywords(frequencies, limit = 20) {
    return Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }));
  }

  /**
   * Analyze trending keywords from posts
   * @param {Array} posts - Array of post objects
   * @param {number} minFrequency - Minimum frequency threshold
   * @returns {Array} Top trending keywords
   */
  analyzeTrendingKeywords(posts, minFrequency = 3) {
    const allFrequencies = posts.map(post => {
      const titleFreq = this.extractKeywords(post.title);
      const textFreq = post.text ? this.extractKeywords(post.text) : {};
      return this.mergeFrequencies([titleFreq, textFreq]);
    });

    const merged = this.mergeFrequencies(allFrequencies);
    
    // Filter by minimum frequency
    const filtered = Object.entries(merged)
      .filter(([_, count]) => count >= minFrequency)
      .reduce((acc, [word, count]) => {
        acc[word] = count;
        return acc;
      }, {});

    return this.getTopKeywords(filtered, 30);
  }

  /**
   * Analyze trending topics from comments
   * @param {Array} comments - Array of comment objects
   * @param {number} minFrequency - Minimum frequency threshold
   * @returns {Array} Top trending keywords from comments
   */
  analyzeCommentTrends(comments, minFrequency = 3) {
    const allFrequencies = comments.map(comment => 
      this.extractKeywords(comment.body)
    );

    const merged = this.mergeFrequencies(allFrequencies);
    
    // Filter by minimum frequency
    const filtered = Object.entries(merged)
      .filter(([_, count]) => count >= minFrequency)
      .reduce((acc, [word, count]) => {
        acc[word] = count;
        return acc;
      }, {});

    return this.getTopKeywords(filtered, 30);
  }

  /**
   * Find trending topics by subreddit
   * @param {Array} posts - Array of post objects
   * @returns {Object} Trending topics grouped by subreddit
   */
  getTrendsBySubreddit(posts) {
    const bySubreddit = {};

    posts.forEach(post => {
      if (!bySubreddit[post.subreddit]) {
        bySubreddit[post.subreddit] = [];
      }
      bySubreddit[post.subreddit].push(post);
    });

    const trends = {};
    Object.entries(bySubreddit).forEach(([subreddit, subPosts]) => {
      const keywords = this.analyzeTrendingKeywords(subPosts, 2);
      trends[subreddit] = {
        postCount: subPosts.length,
        topKeywords: keywords.slice(0, 10),
        avgScore: subPosts.reduce((sum, p) => sum + p.score, 0) / subPosts.length
      };
    });

    return trends;
  }

  /**
   * Calculate trending score based on engagement metrics
   * @param {Object} post - Post object
   * @returns {number} Trending score
   */
  calculateTrendingScore(post) {
    const ageInHours = (Date.now() / 1000 - post.created_utc) / 3600;
    const ageFactor = Math.max(1, ageInHours);
    
    // Weighted score: upvotes + comments with time decay
    const engagementScore = post.score + (post.num_comments * 2);
    const trendingScore = engagementScore / Math.pow(ageFactor, 1.5);
    
    return trendingScore;
  }

  /**
   * Get top trending posts
   * @param {Array} posts - Array of post objects
   * @param {number} limit - Number of top posts to return
   * @returns {Array} Top trending posts
   */
  getTopTrendingPosts(posts, limit = 10) {
    return posts
      .map(post => ({
        ...post,
        trendingScore: this.calculateTrendingScore(post)
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);
  }

  /**
   * Identify emerging topics (keywords appearing frequently in recent posts)
   * @param {Array} posts - Array of post objects
   * @param {number} hoursThreshold - Consider posts from last N hours
   * @returns {Array} Emerging keywords
   */
  getEmergingTopics(posts, hoursThreshold = 24) {
    const cutoffTime = Date.now() / 1000 - (hoursThreshold * 3600);
    const recentPosts = posts.filter(post => post.created_utc > cutoffTime);
    
    if (recentPosts.length === 0) {
      return [];
    }

    return this.analyzeTrendingKeywords(recentPosts, 2).slice(0, 15);
  }
}

export default TrendAnalyzer;

