import Sentiment from 'sentiment';

/**
 * SentimentAnalyzer - Analyzes sentiment of text content
 */
class SentimentAnalyzer {
  constructor() {
    this.sentiment = new Sentiment();
  }

  /**
   * Analyze sentiment of a single text
   * @param {string} text - Text to analyze
   * @returns {Object} Sentiment analysis result
   */
  analyze(text) {
    const result = this.sentiment.analyze(text);
    
    return {
      score: result.score,
      comparative: result.comparative,
      sentiment: this.categorizeSentiment(result.score),
      positive: result.positive,
      negative: result.negative,
      tokens: result.tokens.length
    };
  }

  /**
   * Categorize sentiment score into human-readable labels
   * @param {number} score - Sentiment score
   * @returns {string} Sentiment category
   */
  categorizeSentiment(score) {
    if (score > 5) return 'Very Positive';
    if (score > 2) return 'Positive';
    if (score > -2) return 'Neutral';
    if (score > -5) return 'Negative';
    return 'Very Negative';
  }

  /**
   * Analyze sentiment for multiple posts
   * @param {Array} posts - Array of post objects
   * @returns {Array} Posts with sentiment analysis
   */
  analyzePosts(posts) {
    return posts.map(post => {
      const titleSentiment = this.analyze(post.title);
      const textSentiment = post.text ? this.analyze(post.text) : null;
      
      // Combined sentiment (weighted average favoring title)
      const combinedScore = textSentiment 
        ? (titleSentiment.score * 0.6 + textSentiment.score * 0.4)
        : titleSentiment.score;

      return {
        ...post,
        sentiment: {
          title: titleSentiment,
          text: textSentiment,
          combined: {
            score: combinedScore,
            sentiment: this.categorizeSentiment(combinedScore)
          }
        }
      };
    });
  }

  /**
   * Analyze sentiment for comments
   * @param {Array} comments - Array of comment objects
   * @returns {Array} Comments with sentiment analysis
   */
  analyzeComments(comments) {
    return comments.map(comment => ({
      ...comment,
      sentiment: this.analyze(comment.body)
    }));
  }

  /**
   * Get overall sentiment statistics
   * @param {Array} items - Array of items with sentiment data
   * @returns {Object} Sentiment statistics
   */
  getStatistics(items) {
    if (!items || items.length === 0) {
      return {
        total: 0,
        veryPositive: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        veryNegative: 0,
        averageScore: 0
      };
    }

    const stats = {
      total: items.length,
      veryPositive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      veryNegative: 0,
      totalScore: 0
    };

    items.forEach(item => {
      const sentiment = item.sentiment?.combined?.sentiment || item.sentiment?.sentiment;
      const score = item.sentiment?.combined?.score || item.sentiment?.score || 0;
      
      stats.totalScore += score;

      switch (sentiment) {
        case 'Very Positive':
          stats.veryPositive++;
          break;
        case 'Positive':
          stats.positive++;
          break;
        case 'Neutral':
          stats.neutral++;
          break;
        case 'Negative':
          stats.negative++;
          break;
        case 'Very Negative':
          stats.veryNegative++;
          break;
      }
    });

    stats.averageScore = stats.totalScore / stats.total;

    return stats;
  }

  /**
   * Get sentiment distribution percentages
   * @param {Object} stats - Statistics object from getStatistics
   * @returns {Object} Percentage distribution
   */
  getDistribution(stats) {
    if (stats.total === 0) {
      return {
        veryPositive: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        veryNegative: 0
      };
    }

    return {
      veryPositive: ((stats.veryPositive / stats.total) * 100).toFixed(1),
      positive: ((stats.positive / stats.total) * 100).toFixed(1),
      neutral: ((stats.neutral / stats.total) * 100).toFixed(1),
      negative: ((stats.negative / stats.total) * 100).toFixed(1),
      veryNegative: ((stats.veryNegative / stats.total) * 100).toFixed(1)
    };
  }
}

export default SentimentAnalyzer;

