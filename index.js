import RedditClient from './redditClient.js';
import SentimentAnalyzer from './sentimentAnalyzer.js';
import TrendAnalyzer from './trendAnalyzer.js';
import Table from 'cli-table3';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Display results in a formatted table
 */
class ResultsDisplay {
  static displayHeader(title) {
    console.log('\n' + '='.repeat(80));
    console.log(chalk.bold.cyan(title));
    console.log('='.repeat(80) + '\n');
  }

  static displayTrendingKeywords(keywords) {
    this.displayHeader('🔥 TRENDING KEYWORDS');
    
    const table = new Table({
      head: [
        chalk.bold('Rank'),
        chalk.bold('Keyword'),
        chalk.bold('Frequency'),
        chalk.bold('Trend Indicator')
      ],
      colWidths: [8, 30, 12, 30]
    });

    keywords.forEach((item, index) => {
      const bars = '█'.repeat(Math.min(item.count, 20));
      table.push([
        chalk.yellow(`#${index + 1}`),
        chalk.green(item.keyword),
        chalk.white(item.count),
        chalk.cyan(bars)
      ]);
    });

    console.log(table.toString());
  }

  static displayTrendingPosts(posts) {
    this.displayHeader('📈 TOP TRENDING POSTS');
    
    posts.slice(0, 10).forEach((post, index) => {
      console.log(chalk.bold.yellow(`\n${index + 1}. ${post.title}`));
      console.log(chalk.gray(`   r/${post.subreddit} • Score: ${post.score} • Comments: ${post.num_comments}`));
      console.log(chalk.gray(`   Sentiment: ${post.sentiment?.combined?.sentiment || 'N/A'}`));
      console.log(chalk.blue(`   ${post.permalink}`));
    });
    console.log();
  }

  static displaySentimentStats(stats, distribution) {
    this.displayHeader('😊 SENTIMENT ANALYSIS');
    
    const table = new Table({
      head: [chalk.bold('Category'), chalk.bold('Count'), chalk.bold('Percentage')],
      colWidths: [20, 12, 15]
    });

    table.push(
      [chalk.green('Very Positive'), stats.veryPositive, `${distribution.veryPositive}%`],
      [chalk.greenBright('Positive'), stats.positive, `${distribution.positive}%`],
      [chalk.white('Neutral'), stats.neutral, `${distribution.neutral}%`],
      [chalk.red('Negative'), stats.negative, `${distribution.negative}%`],
      [chalk.redBright('Very Negative'), stats.veryNegative, `${distribution.veryNegative}%`]
    );

    console.log(table.toString());
    console.log(chalk.bold(`\nAverage Sentiment Score: ${stats.averageScore.toFixed(2)}`));
    console.log();
  }

  static displaySubredditTrends(trends) {
    this.displayHeader('📊 TRENDS BY SUBREDDIT');
    
    Object.entries(trends).forEach(([subreddit, data]) => {
      console.log(chalk.bold.cyan(`\nr/${subreddit}`));
      console.log(chalk.gray(`Posts analyzed: ${data.postCount} | Avg Score: ${data.avgScore.toFixed(0)}`));
      console.log(chalk.white('Top keywords: ') + 
        data.topKeywords.slice(0, 5).map(k => chalk.green(k.keyword)).join(', '));
    });
    console.log();
  }

  static displayEmergingTopics(topics) {
    this.displayHeader('🚀 EMERGING TOPICS (Last 24 Hours)');
    
    const table = new Table({
      head: [chalk.bold('Topic'), chalk.bold('Mentions')],
      colWidths: [40, 12]
    });

    topics.forEach(item => {
      table.push([chalk.yellow(item.keyword), chalk.white(item.count)]);
    });

    console.log(table.toString());
  }

  static displaySummary(data) {
    this.displayHeader('📋 ANALYSIS SUMMARY');
    
    console.log(chalk.bold('Data Collection:'));
    console.log(`  • Posts analyzed: ${chalk.cyan(data.postsCount)}`);
    console.log(`  • Comments analyzed: ${chalk.cyan(data.commentsCount)}`);
    console.log(`  • Subreddits: ${chalk.cyan(data.subreddits.join(', '))}`);
    console.log(`  • Analysis completed at: ${chalk.cyan(new Date().toLocaleString())}`);
    console.log();
  }
}

/**
 * Main application
 */
class RedditTrendAnalyzerApp {
  constructor() {
    this.redditClient = new RedditClient();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.trendAnalyzer = new TrendAnalyzer();
  }

  async run() {
    try {
      console.log(chalk.bold.magenta('\n🎯 REDDIT TREND ANALYZER FOR CONTENT CREATORS\n'));

      // Get configuration
      const subreddits = (process.env.SUBREDDITS || 'technology,gaming,movies').split(',');
      const postLimit = parseInt(process.env.POST_LIMIT || '50');
      const commentLimit = parseInt(process.env.COMMENT_LIMIT || '20');
      const minKeywordFreq = parseInt(process.env.MIN_KEYWORD_FREQUENCY || '3');

      console.log(chalk.gray(`Analyzing subreddits: ${subreddits.join(', ')}`));
      console.log(chalk.gray(`Post limit per subreddit: ${postLimit}`));
      console.log(chalk.gray(`Comment limit per post: ${commentLimit}\n`));

      // Fetch data
      console.log(chalk.bold('📥 Fetching data from Reddit...'));
      const { posts, comments } = await this.redditClient.fetchPostsWithComments(
        subreddits,
        postLimit,
        commentLimit
      );

      if (posts.length === 0) {
        console.log(chalk.red('\n❌ No posts found. Please check your configuration.'));
        return;
      }

      console.log(chalk.green(`\n✓ Fetched ${posts.length} posts and ${comments.length} comments\n`));

      // Perform sentiment analysis
      console.log(chalk.bold('😊 Analyzing sentiment...'));
      const postsWithSentiment = this.sentimentAnalyzer.analyzePosts(posts);
      const commentsWithSentiment = this.sentimentAnalyzer.analyzeComments(comments);
      
      const sentimentStats = this.sentimentAnalyzer.getStatistics(postsWithSentiment);
      const sentimentDistribution = this.sentimentAnalyzer.getDistribution(sentimentStats);

      // Perform trend analysis
      console.log(chalk.bold('📈 Analyzing trends...'));
      const trendingKeywords = this.trendAnalyzer.analyzeTrendingKeywords(posts, minKeywordFreq);
      const commentTrends = this.trendAnalyzer.analyzeCommentTrends(comments, minKeywordFreq);
      const trendsBySubreddit = this.trendAnalyzer.getTrendsBySubreddit(posts);
      const trendingPosts = this.trendAnalyzer.getTopTrendingPosts(postsWithSentiment);
      const emergingTopics = this.trendAnalyzer.getEmergingTopics(posts, 24);

      // Display results
      console.log(chalk.green('\n✓ Analysis complete!\n'));

      ResultsDisplay.displaySummary({
        postsCount: posts.length,
        commentsCount: comments.length,
        subreddits
      });

      ResultsDisplay.displayTrendingKeywords(trendingKeywords.slice(0, 15));
      ResultsDisplay.displayTrendingPosts(trendingPosts);
      ResultsDisplay.displaySentimentStats(sentimentStats, sentimentDistribution);
      ResultsDisplay.displaySubredditTrends(trendsBySubreddit);
      
      if (emergingTopics.length > 0) {
        ResultsDisplay.displayEmergingTopics(emergingTopics.slice(0, 10));
      }

      // Content creator recommendations
      this.displayRecommendations(trendingKeywords, sentimentStats, emergingTopics);

    } catch (error) {
      console.error(chalk.red('\n❌ Error running analysis:'), error.message);
      console.error(chalk.gray('\nPlease ensure:'));
      console.error(chalk.gray('  1. Your .env file is properly configured'));
      console.error(chalk.gray('  2. Your Reddit API credentials are valid'));
      console.error(chalk.gray('  3. You have an active internet connection'));
      process.exit(1);
    }
  }

  displayRecommendations(keywords, sentimentStats, emergingTopics) {
    ResultsDisplay.displayHeader('💡 CONTENT CREATOR RECOMMENDATIONS');

    console.log(chalk.bold.green('Top 5 Topics to Create Content About:'));
    keywords.slice(0, 5).forEach((item, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${item.keyword}`) + 
        chalk.gray(` (${item.count} mentions)`));
    });

    if (emergingTopics.length > 0) {
      console.log(chalk.bold.green('\nEmerging Topics to Watch:'));
      emergingTopics.slice(0, 3).forEach((item, index) => {
        console.log(chalk.yellow(`  ${index + 1}. ${item.keyword}`) + 
          chalk.gray(` (gaining traction)`));
      });
    }

    console.log(chalk.bold.green('\nContent Strategy Insights:'));
    
    if (sentimentStats.averageScore > 2) {
      console.log(chalk.white('  • Overall sentiment is POSITIVE - great time for engagement'));
    } else if (sentimentStats.averageScore < -2) {
      console.log(chalk.white('  • Overall sentiment is NEGATIVE - consider addressing concerns'));
    } else {
      console.log(chalk.white('  • Overall sentiment is NEUTRAL - opportunity to stand out'));
    }

    const positivePercentage = parseFloat(sentimentStats.veryPositive + sentimentStats.positive) / 
                               sentimentStats.total * 100;
    if (positivePercentage > 60) {
      console.log(chalk.white('  • High positive engagement - leverage community enthusiasm'));
    }

    console.log(chalk.white('  • Focus on topics with high frequency and positive sentiment'));
    console.log(chalk.white('  • Monitor emerging topics for early content opportunities\n'));
  }
}

// Run the application
const app = new RedditTrendAnalyzerApp();
app.run().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});

