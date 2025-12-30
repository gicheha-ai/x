import React, { useState } from 'react';
import { useLinkGenerator } from '../../../hooks/useLinkGenerator';
import './LinkGenerator.css';

const LinkGenerator = () => {
  const { generateLink, loading } = useLinkGenerator();
  const [linkName, setLinkName] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!linkName.trim()) {
      alert('Please enter a link name');
      return;
    }

    const result = await generateLink(linkName);
    if (result.success) {
      setGeneratedLink(result.link);
      setLinkName('');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="link-generator">
      <h2>🔗 Generate Tracking Link</h2>
      <p className="description">
        Generate unique tracking links that expire in 24 hours. Track clicks and revenue.
      </p>

      <div className="generator-form">
        <input
          type="text"
          value={linkName}
          onChange={(e) => setLinkName(e.target.value)}
          placeholder="Enter link name (e.g., Facebook Campaign, Email Newsletter)"
          className="link-input"
          disabled={loading}
        />
        <button 
          onClick={handleGenerate}
          className="generate-button"
          disabled={loading || !linkName.trim()}
        >
          {loading ? 'Generating...' : 'Generate Link'}
        </button>
      </div>

      {generatedLink && (
        <div className="generated-link">
          <h3>✅ Link Generated Successfully!</h3>
          <div className="link-display">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="link-output"
            />
            <button 
              onClick={handleCopy}
              className={`copy-button ${copied ? 'copied' : ''}`}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="link-info">
            <p><strong>📊 Features:</strong></p>
            <ul>
              <li>✅ Tracks clicks in real-time</li>
              <li>✅ Attributes revenue from clicks</li>
              <li>✅ 24-hour tracking window</li>
              <li>✅ Analytics dashboard integration</li>
            </ul>
            <p className="expiry-note">
              ⏰ This link will expire in 24 hours. All tracking data will be reset after expiry.
            </p>
          </div>
        </div>
      )}

      <div className="instructions">
        <h3>📝 How to Use:</h3>
        <ol>
          <li>Enter a descriptive name for your link</li>
          <li>Click "Generate Link"</li>
          <li>Copy the generated link</li>
          <li>Use it in your marketing campaigns</li>
          <li>Track performance in the Revenue Dashboard</li>
        </ol>
      </div>
    </div>
  );
};

export default LinkGenerator;
