/**
 * AI Analytics Component
 * Displays AI usage statistics and insights
 */

import React, { useState, useEffect } from 'react';
import aiAnalytics from '../services/aiAnalytics';
import { useAuth } from '../contexts/AuthContext';
import './AIAnalytics.css';

const AIAnalytics = ({ workspaceId, isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('week');
  
  // Analytics data states
  const [userStats, setUserStats] = useState(null);
  const [costSummary, setCostSummary] = useState(null);
  const [commandStats, setCommandStats] = useState(null);
  const [hourlyPattern, setHourlyPattern] = useState(null);

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadAnalytics();
    }
  }, [isOpen, workspaceId, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load all analytics data in parallel
      const [userStatsRes, costRes, commandRes, hourlyRes] = await Promise.all([
        aiAnalytics.getUserStats(currentUser.uid),
        aiAnalytics.getCostSummary(workspaceId, timeRange),
        aiAnalytics.getCommandStats(workspaceId),
        aiAnalytics.getHourlyPattern(workspaceId)
      ]);

      if (userStatsRes.success) setUserStats(userStatsRes.data);
      if (costRes.success) setCostSummary(costRes.data);
      if (commandRes.success) setCommandStats(commandRes.data);
      if (hourlyRes.success) setHourlyPattern(hourlyRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (!isOpen) return null;

  return (
    <div className="ai-analytics-modal">
      <div className="ai-analytics-container">
        <div className="ai-analytics-header">
          <h2>AI Analytics</h2>
          <button className="ai-analytics-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="ai-analytics-tabs">
          <button
            className={`ai-analytics-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`ai-analytics-tab ${activeTab === 'usage' ? 'active' : ''}`}
            onClick={() => setActiveTab('usage')}
          >
            Usage Patterns
          </button>
          <button
            className={`ai-analytics-tab ${activeTab === 'costs' ? 'active' : ''}`}
            onClick={() => setActiveTab('costs')}
          >
            Cost Analysis
          </button>
        </div>

        <div className="ai-analytics-time-range">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="ai-analytics-select"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        {loading ? (
          <div className="ai-analytics-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Loading analytics...</span>
          </div>
        ) : (
          <div className="ai-analytics-content">
            {activeTab === 'overview' && (
              <div className="ai-analytics-overview">
                <div className="ai-stats-grid">
                  <div className="ai-stat-card">
                    <div className="ai-stat-icon">
                      <i className="fa-solid fa-message"></i>
                    </div>
                    <div className="ai-stat-details">
                      <div className="ai-stat-value">
                        {formatNumber(costSummary?.totalRequests || 0)}
                      </div>
                      <div className="ai-stat-label">Total Requests</div>
                    </div>
                  </div>

                  <div className="ai-stat-card">
                    <div className="ai-stat-icon">
                      <i className="fa-solid fa-coins"></i>
                    </div>
                    <div className="ai-stat-details">
                      <div className="ai-stat-value">
                        {formatNumber(costSummary?.totalTokens || 0)}
                      </div>
                      <div className="ai-stat-label">Tokens Used</div>
                    </div>
                  </div>

                  <div className="ai-stat-card">
                    <div className="ai-stat-icon">
                      <i className="fa-solid fa-bolt"></i>
                    </div>
                    <div className="ai-stat-details">
                      <div className="ai-stat-value">
                        {costSummary?.cacheRate || 0}%
                      </div>
                      <div className="ai-stat-label">Cache Hit Rate</div>
                    </div>
                  </div>

                  <div className="ai-stat-card">
                    <div className="ai-stat-icon">
                      <i className="fa-solid fa-dollar-sign"></i>
                    </div>
                    <div className="ai-stat-details">
                      <div className="ai-stat-value">
                        {formatCurrency(costSummary?.totalCost || 0)}
                      </div>
                      <div className="ai-stat-label">Total Cost</div>
                    </div>
                  </div>
                </div>

                {commandStats && Object.keys(commandStats).length > 0 && (
                  <div className="ai-command-stats">
                    <h3>Command Usage</h3>
                    <div className="ai-command-list">
                      {Object.entries(commandStats).map(([command, stats]) => (
                        <div key={command} className="ai-command-item">
                          <div className="ai-command-info">
                            <span className="ai-command-name">/{command}</span>
                            <span className="ai-command-count">{stats.count} uses</span>
                          </div>
                          <div className="ai-command-bar">
                            <div
                              className="ai-command-fill"
                              style={{
                                width: `${(stats.count / costSummary?.totalRequests) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="ai-analytics-usage">
                {hourlyPattern && (
                  <div className="ai-hourly-chart">
                    <h3>Hourly Usage Pattern</h3>
                    <div className="ai-chart-container">
                      {hourlyPattern.map((count, hour) => (
                        <div key={hour} className="ai-chart-bar-wrapper">
                          <div className="ai-chart-bar-container">
                            <div
                              className="ai-chart-bar"
                              style={{
                                height: `${(count / Math.max(...hourlyPattern)) * 100}%`
                              }}
                              title={`${count} requests`}
                            />
                          </div>
                          <div className="ai-chart-label">
                            {hour === 0 ? '12a' : hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userStats && (
                  <div className="ai-user-stats">
                    <h3>Your AI Usage</h3>
                    <div className="ai-user-stats-grid">
                      <div className="ai-user-stat">
                        <span className="ai-user-stat-label">Total Requests</span>
                        <span className="ai-user-stat-value">{formatNumber(userStats.totalRequests)}</span>
                      </div>
                      <div className="ai-user-stat">
                        <span className="ai-user-stat-label">Success Rate</span>
                        <span className="ai-user-stat-value">
                          {userStats.totalRequests > 0
                            ? ((userStats.successfulRequests / userStats.totalRequests) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="ai-user-stat">
                        <span className="ai-user-stat-label">Total Tokens</span>
                        <span className="ai-user-stat-value">{formatNumber(userStats.totalTokens)}</span>
                      </div>
                      <div className="ai-user-stat">
                        <span className="ai-user-stat-label">Your Cost</span>
                        <span className="ai-user-stat-value">{formatCurrency(userStats.totalCost)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'costs' && (
              <div className="ai-analytics-costs">
                <div className="ai-cost-summary">
                  <h3>Cost Breakdown</h3>
                  <div className="ai-cost-details">
                    <div className="ai-cost-item">
                      <span>Average cost per request</span>
                      <span>{formatCurrency(parseFloat(costSummary?.avgCostPerRequest || 0))}</span>
                    </div>
                    <div className="ai-cost-item">
                      <span>Average tokens per request</span>
                      <span>{costSummary?.avgTokensPerRequest || 0}</span>
                    </div>
                    <div className="ai-cost-item">
                      <span>Cache savings</span>
                      <span className="ai-cost-savings">
                        {formatCurrency(
                          (costSummary?.cacheHits || 0) * parseFloat(costSummary?.avgCostPerRequest || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ai-cost-projection">
                  <h3>Monthly Projection</h3>
                  <p>Based on current usage patterns</p>
                  <div className="ai-projection-value">
                    {formatCurrency(
                      (costSummary?.totalCost || 0) * (30 / (timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalytics;