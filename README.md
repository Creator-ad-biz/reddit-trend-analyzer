# Reddit Trend Analyzer for Content Creators

A powerful Node.js application that analyzes Reddit posts and comments to identify trending topics, perform sentiment analysis, and provide actionable insights for content creators.

## Features

- 📊 **Multi-Subreddit Analysis**: Aggregate data from multiple subreddits simultaneously
- 😊 **Sentiment Analysis**: Understand the emotional tone of discussions
- 🔥 **Trending Keywords**: Identify the most frequently mentioned topics
- 📈 **Trend Scoring**: Calculate trending scores based on engagement metrics
- 🚀 **Emerging Topics**: Detect topics gaining traction in the last 24 hours
- 💡 **Content Recommendations**: Get actionable insights for content creation
- 🎨 **Beautiful CLI Output**: Color-coded tables and formatted results
- ⏱️ **Smart Rate Limiting**: Automatic rate limit handling with exponential backoff
- 🔄 **Auto-Retry Logic**: Automatically retries failed requests with intelligent backoff

## Prerequisites

- Node.js (v16 or higher)
- Reddit API credentials

## Installation

1. Clone or download this project:

```bash
cd reddit-trend-analyzer
```

2. Install dependencies:

```bash
npm install
```

3. Set up Reddit API credentials:

   - Go to https://www.reddit.com/prefs/apps
   - Click "Create App" or "Create Another App"
   - Select "script" as the app type
   - Fill in the required fields
   - Note your `client_id` (under the app name) and `client_secret`

4. Create a `.env` file in the project root:

```bash
cp env.example .env
```

5. Edit `.env` and add your credentials:

```env
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USERNAME=your_username_here
REDDIT_PASSWORD=your_password_here
REDDIT_USER_AGENT=RedditTrendAnalyzer/1.0.0

# Analysis Configuration
SUBREDDITS=technology,gaming,movies,music,fitness
POST_LIMIT=50
COMMENT_LIMIT=20
MIN_KEYWORD_FREQUENCY=3
```

## Usage

Run the analyzer:

```bash
npm start
```

Or:

```bash
node index.js
```

## Configuration

You can customize the analysis by editing the `.env` file:

### Core Settings

- **SUBREDDITS**: Comma-separated list of subreddit names (without r/)
- **POST_LIMIT**: Number of posts to fetch per subreddit (default: 50)
- **COMMENT_LIMIT**: Number of comments to fetch per post (default: 20)
- **MIN_KEYWORD_FREQUENCY**: Minimum times a keyword must appear to be considered trending (default: 3)

### Rate Limiting Settings (Advanced)

- **RATE_LIMIT_DELAY**: Milliseconds between API requests (default: 2000ms = 30 req/min)
  - Reddit allows 60 requests per minute, we default to 2000ms to be conservative
  - Minimum recommended: 1000ms (60 req/min - use with caution)
  - For safer operation: 3000ms (20 req/min)
- **MAX_RETRIES**: Number of retry attempts for failed requests (default: 3)
- **MAX_POSTS_FOR_COMMENTS**: Maximum posts to fetch comments from (default: 20)
  - Helps control total API usage
  - Lower this if you frequently hit rate limits

### Example Configurations

**Tech & Startup Focus:**

```env
SUBREDDITS=technology,startups,programming,artificial,entrepreneur
POST_LIMIT=100
```

**Entertainment & Pop Culture:**

```env
SUBREDDITS=movies,television,music,books,entertainment
POST_LIMIT=75
```

**Gaming & Esports:**

```env
SUBREDDITS=gaming,pcgaming,xbox,playstation,nintendoswitch
POST_LIMIT=80
```

## Output

The application provides comprehensive analysis including:

### 1. Trending Keywords

- Top keywords mentioned across all posts and titles
- Frequency counts and visual trend indicators
- Ranked by occurrence

### 2. Top Trending Posts

- Posts with highest engagement (score + comments)
- Time-decay adjusted trending score
- Sentiment analysis for each post
- Direct links to Reddit posts

### 3. Sentiment Analysis

- Distribution of sentiment across all posts
- Categories: Very Positive, Positive, Neutral, Negative, Very Negative
- Average sentiment score
- Percentage breakdown

### 4. Trends by Subreddit

- Top keywords for each analyzed subreddit
- Post counts and average scores
- Subreddit-specific insights

### 5. Emerging Topics

- Topics gaining traction in the last 24 hours
- Early indicators of viral trends
- Perfect for staying ahead of the curve

### 6. Content Creator Recommendations

- Top 5 topics to create content about
- Emerging topics to watch
- Content strategy insights based on sentiment

## Example Output

```
🎯 REDDIT TREND ANALYZER FOR CONTENT CREATORS

Analyzing subreddits: technology, gaming, movies
Post limit per subreddit: 50
Comment limit per post: 20

📥 Fetching data from Reddit...
Fetching 50 hot posts from r/technology...
Fetching 50 hot posts from r/gaming...
Fetching 50 hot posts from r/movies...

✓ Fetched 150 posts and 3000 comments

😊 Analyzing sentiment...
📈 Analyzing trends...

✓ Analysis complete!

================================================================================
🔥 TRENDING KEYWORDS
================================================================================

┌────────┬────────────────────────────────┬────────────┬────────────────────────────────┐
│ Rank   │ Keyword                        │ Frequency  │ Trend Indicator                │
├────────┼────────────────────────────────┼────────────┼────────────────────────────────┤
│ #1     │ game                           │ 127        │ ████████████████████           │
│ #2     │ movie                          │ 98         │ ███████████████                │
│ #3     │ tech                           │ 85         │ █████████████                  │
└────────┴────────────────────────────────┴────────────┴────────────────────────────────┘
```

## API Rate Limits

The application includes **robust rate limiting** to comply with Reddit's API guidelines:

### Built-in Protections

- ✅ **Configurable delays**: 2 second delay between requests by default (30 requests/min)
- ✅ **Automatic retry**: Exponential backoff when rate limits are hit
- ✅ **Smart throttling**: Additional delays when approaching rate limits
- ✅ **Request tracking**: Monitors total API usage throughout session
- ✅ **Error handling**: Gracefully handles 429 (Too Many Requests) errors
- ✅ **Progressive delays**: Increases delay between subreddit fetches

### Reddit's Official Limits

- **60 requests per minute** for OAuth authenticated requests
- Rate limit resets every 60 seconds
- Headers include `X-Ratelimit-Remaining` and `X-Ratelimit-Reset`

### How This App Respects Limits

1. **Conservative defaults**: Uses 2000ms delay (30 req/min) instead of maximum 60/min
2. **Automatic backoff**: If rate limit is hit, waits for the reset timer plus 1 second
3. **Limited scope**: Only fetches comments from top 20 posts by default
4. **Progress tracking**: Shows estimated time and request counts
5. **Graceful degradation**: Continues if individual requests fail

### Adjusting Rate Limits

If you experience rate limit errors:

```env
# Slower, safer (20 requests/min)
RATE_LIMIT_DELAY=3000
MAX_POSTS_FOR_COMMENTS=15

# Even slower for shared IPs or busy accounts
RATE_LIMIT_DELAY=5000
MAX_POSTS_FOR_COMMENTS=10
```

If you never hit limits and want faster results:

```env
# Faster (60 requests/min - max allowed)
RATE_LIMIT_DELAY=1000
MAX_POSTS_FOR_COMMENTS=25
```

## Use Cases

### For YouTubers

- Identify trending topics for video ideas
- Understand audience sentiment on topics
- Find emerging trends before they go viral

### For Bloggers & Writers

- Discover hot discussion topics
- Gauge community interest in subjects
- Find content gaps in trending areas

### For Social Media Managers

- Monitor brand sentiment
- Identify community pain points
- Track emerging conversations

### For Marketers

- Understand target audience interests
- Identify market trends
- Gauge product/service reception

## Technical Details

### Dependencies

- **snoowrap**: Reddit API wrapper
- **sentiment**: Natural language sentiment analysis
- **chalk**: Terminal styling
- **cli-table3**: Beautiful CLI tables
- **dotenv**: Environment variable management

### Architecture

- `redditClient.js`: Handles Reddit API interactions
- `sentimentAnalyzer.js`: Performs sentiment analysis on text
- `trendAnalyzer.js`: Identifies trending topics and keywords
- `index.js`: Main application orchestrator

## Troubleshooting

### "Invalid credentials" error

- Double-check your Reddit API credentials in `.env`
- Ensure your Reddit account is in good standing
- Verify the app type is set to "script"

### "No posts found" error

- Check if the subreddit names are spelled correctly
- Ensure subreddits are public and active
- Try reducing POST_LIMIT if API is throttling

### Rate limiting issues

- The app includes **2-second delays** between requests by default (30 req/min)
- **Automatic retry** with exponential backoff when limits are hit
- If you still hit limits:
  - Increase `RATE_LIMIT_DELAY` in `.env` (e.g., 3000 or 5000)
  - Reduce `MAX_POSTS_FOR_COMMENTS` (e.g., 10 or 15)
  - Analyze fewer subreddits at once
  - Wait a few minutes before running again
- Check console output for rate limit warnings and request counts

## Contributing

Feel free to fork, modify, and enhance this tool. Some ideas for contributions:

- Export results to JSON/CSV
- Web dashboard interface
- Historical trend tracking
- Multi-language support
- Advanced filtering options

## License

MIT License - Feel free to use this for personal or commercial projects.

## Disclaimer

This tool is for research and content creation purposes. Always respect Reddit's Terms of Service and API guidelines. Do not use this tool for spam, manipulation, or any malicious purposes.

## Support

For issues or questions:

1. Check the Troubleshooting section above
2. Verify your Reddit API credentials
3. Ensure you're using Node.js v16+
4. Check that all dependencies are installed

---

**Happy Content Creating! 🎉**
