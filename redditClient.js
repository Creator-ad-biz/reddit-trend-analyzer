import snoowrap from 'snoowrap';
import dotenv from 'dotenv';

dotenv.config();

/**
 * RedditClient - Handles all Reddit API interactions with robust rate limiting
 */
class RedditClient {
  constructor() {
    this.reddit = new snoowrap({
      userAgent: process.env.REDDIT_USER_AGENT || 'RedditTrendAnalyzer/1.0.0',
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD
    });

    // Configure rate limiting (Reddit allows 60 requests per minute)
    // We use 2000ms (2 seconds) to be conservative: 30 requests/minute
    this.requestDelay = parseInt(process.env.RATE_LIMIT_DELAY || '2000');
    this.maxRetries = parseInt(process.env.MAX_RETRIES || '3');
    this.reddit.config({ 
      requestDelay: this.requestDelay,
      requestTimeout: 30000,
      continueAfterRatelimitError: true,
      warnings: false,
      debug: false
    });

    // Track rate limit state
    this.requestCount = 0;
    this.rateLimitRemaining = null;
    this.rateLimitReset = null;
    
    console.log(`Rate limiting configured: ${this.requestDelay}ms between requests`);
  }

  /**
   * Sleep helper for rate limiting
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {number} retries - Number of retries remaining
   * @param {number} delay - Initial delay in ms
   * @returns {Promise} Result of function
   */
  async retryWithBackoff(fn, retries = this.maxRetries, delay = 2000) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error
      if (error.statusCode === 429 || error.message?.includes('rate limit')) {
        if (retries > 0) {
          const waitTime = error.ratelimitRemaining 
            ? (error.ratelimitRemaining * 1000) + 1000 
            : delay;
          
          console.log(`⏳ Rate limit hit. Waiting ${Math.round(waitTime / 1000)}s before retry (${retries} retries left)...`);
          await this.sleep(waitTime);
          
          // Exponential backoff for next retry
          return this.retryWithBackoff(fn, retries - 1, delay * 2);
        } else {
          throw new Error('Rate limit exceeded. Max retries reached. Please try again later.');
        }
      }
      
      // For non-rate-limit errors, retry with shorter delay
      if (retries > 0 && error.statusCode >= 500) {
        console.log(`⚠️  Server error. Retrying in ${delay / 1000}s (${retries} retries left)...`);
        await this.sleep(delay);
        return this.retryWithBackoff(fn, retries - 1, delay * 1.5);
      }
      
      throw error;
    }
  }

  /**
   * Enforce rate limiting between requests
   */
  async enforceRateLimit() {
    this.requestCount++;
    
    // Log every 10 requests to show we're respecting limits
    if (this.requestCount % 10 === 0) {
      console.log(`📊 Processed ${this.requestCount} API requests (rate limited)`);
    }
    
    // Additional delay if we're approaching limits
    if (this.rateLimitRemaining && this.rateLimitRemaining < 10) {
      console.log(`⚠️  Approaching rate limit. Adding extra delay...`);
      await this.sleep(5000);
    }
  }

  /**
   * Fetch hot posts from multiple subreddits
   * @param {Array<string>} subreddits - Array of subreddit names
   * @param {number} limit - Number of posts to fetch per subreddit
   * @returns {Promise<Array>} Array of posts with metadata
   */
  async fetchHotPosts(subreddits, limit = 50) {
    const allPosts = [];

    for (const subreddit of subreddits) {
      try {
        console.log(`Fetching ${limit} hot posts from r/${subreddit}...`);
        
        // Wrap in retry logic with rate limiting
        const posts = await this.retryWithBackoff(async () => {
          await this.enforceRateLimit();
          return await this.reddit.getSubreddit(subreddit).getHot({ limit });
        });
        
        for (const post of posts) {
          allPosts.push({
            subreddit: post.subreddit.display_name,
            title: post.title,
            text: post.selftext || '',
            author: post.author.name,
            score: post.score,
            upvote_ratio: post.upvote_ratio,
            num_comments: post.num_comments,
            created_utc: post.created_utc,
            url: post.url,
            permalink: `https://reddit.com${post.permalink}`,
            id: post.id
          });
        }
        
        // Small delay between subreddits
        if (subreddits.indexOf(subreddit) < subreddits.length - 1) {
          await this.sleep(1000);
        }
      } catch (error) {
        console.error(`❌ Error fetching from r/${subreddit}:`, error.message);
        if (error.message.includes('rate limit')) {
          console.error(`⚠️  Consider reducing POST_LIMIT or SUBREDDITS count`);
        }
      }
    }

    return allPosts;
  }

  /**
   * Fetch comments from a specific post
   * @param {string} postId - Reddit post ID
   * @param {number} limit - Number of top-level comments to fetch
   * @returns {Promise<Array>} Array of comments
   */
  async fetchComments(postId, limit = 20) {
    try {
      // Wrap in retry logic with rate limiting
      const submission = await this.retryWithBackoff(async () => {
        await this.enforceRateLimit();
        return await this.reddit.getSubmission(postId);
      });
      
      await submission.expandReplies({ limit, depth: 1 });
      
      const comments = [];
      const topComments = submission.comments.slice(0, limit);

      for (const comment of topComments) {
        if (comment.body && comment.body !== '[deleted]' && comment.body !== '[removed]') {
          comments.push({
            author: comment.author.name,
            body: comment.body,
            score: comment.score,
            created_utc: comment.created_utc
          });
        }
      }

      return comments;
    } catch (error) {
      console.error(`❌ Error fetching comments for post ${postId}:`, error.message);
      if (error.message.includes('rate limit')) {
        console.error(`⚠️  Rate limit hit while fetching comments`);
      }
      return [];
    }
  }

  /**
   * Fetch posts with their comments from multiple subreddits
   * @param {Array<string>} subreddits - Array of subreddit names
   * @param {number} postLimit - Number of posts per subreddit
   * @param {number} commentLimit - Number of comments per post
   * @returns {Promise<Object>} Object containing posts and all comments
   */
  async fetchPostsWithComments(subreddits, postLimit = 50, commentLimit = 20) {
    const posts = await this.fetchHotPosts(subreddits, postLimit);
    const allComments = [];

    if (posts.length === 0) {
      console.log('⚠️  No posts fetched. Cannot fetch comments.');
      return { posts, comments: allComments };
    }

    // Limit number of posts to fetch comments from to respect rate limits
    const maxPostsForComments = parseInt(process.env.MAX_POSTS_FOR_COMMENTS || '20');
    const postsToProcess = Math.min(posts.length, maxPostsForComments);
    
    console.log(`\nFetching comments from ${postsToProcess} posts (rate limited)...`);
    console.log(`⏱️  Estimated time: ~${Math.round((postsToProcess * this.requestDelay) / 1000)}s`);
    
    for (let i = 0; i < postsToProcess; i++) {
      const post = posts[i];
      
      try {
        const comments = await this.fetchComments(post.id, commentLimit);
        
        comments.forEach(comment => {
          allComments.push({
            ...comment,
            post_id: post.id,
            post_title: post.title,
            subreddit: post.subreddit
          });
        });

        // Progress indicator
        if ((i + 1) % 5 === 0) {
          console.log(`✓ Processed ${i + 1}/${postsToProcess} posts...`);
        }
        
        // Add small delay between comment fetches
        if (i < postsToProcess - 1) {
          await this.sleep(500);
        }
      } catch (error) {
        console.error(`⚠️  Skipping comments for post ${post.id}: ${error.message}`);
      }
    }

    console.log(`✓ Successfully fetched ${allComments.length} comments`);
    console.log(`📊 Total API requests made: ${this.requestCount}`);

    return { posts, comments: allComments };
  }
}

export default RedditClient;

