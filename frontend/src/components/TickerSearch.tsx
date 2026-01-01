'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface TickerSearchProps {
  onSearch: (ticker: string) => void;
  loading?: boolean;
}

// Popular tickers for autocomplete (MVP - in production, use a real API)
const POPULAR_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD',
  'NFLX', 'DIS', 'BA', 'INTC', 'CSCO', 'ORCL', 'IBM', 'CRM',
  'UBER', 'LYFT', 'SNAP', 'TWTR', 'SQ', 'PYPL', 'V', 'MA',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'AGG', 'BND'
];

export default function TickerSearch({ onSearch, loading = false }: TickerSearchProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (value: string) => {
    setInput(value.toUpperCase());

    if (value.length >= 1) {
      const filtered = POPULAR_TICKERS.filter((ticker) =>
        ticker.startsWith(value.toUpperCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (ticker: string) => {
    setInput(ticker);
    onSearch(ticker);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => input.length >= 1 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Enter ticker symbol (e.g., TSLA)"
          disabled={loading}
          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-primary-dark disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((ticker) => (
            <button
              key={ticker}
              type="button"
              onClick={() => handleSuggestionClick(ticker)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              {ticker}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
