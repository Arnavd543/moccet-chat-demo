/**
 * Health Check Endpoint
 * Used to verify the API is running and check service status
 */
export default function handler(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      api: 'operational',
      claude: process.env.CLAUDE_API_KEY ? 'configured' : 'not configured',
    },
  };

  res.status(200).json(health);
}