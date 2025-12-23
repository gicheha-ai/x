import React, { useState } from 'react';
import './AirtelMoneyPayment.css';

const AirtelMoneyPayment = ({ amount, onPaymentSuccess, onPaymentError }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter number, 2: Confirm, 3: Processing

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!phoneNumber) {
      alert('Please enter your Airtel Money number');
      return;
    }

    // Validate Kenya Airtel number
    const cleaned = phoneNumber.replace(/\D/g, '');
    const kenyaRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
    
    if (!kenyaRegex.test(cleaned)) {
      alert('Please enter a valid Airtel Kenya number (e.g., 0712 345 678)');
      return;
    }

    // Format to 254XXXXXXXXX
    let formattedNumber = cleaned;
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '254' + formattedNumber.substring(1);
    }
    if (formattedNumber.startsWith('7') && formattedNumber.length === 9) {
      formattedNumber = '254' + formattedNumber;
    }

    // Validate Airtel prefix (2547XXXXXXXX)
    if (!formattedNumber.startsWith('2547') || formattedNumber.length !== 12) {
      alert('Please enter a valid Airtel Kenya number');
      return;
    }

    setStep(2);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setStep(3);

    try {
      // Format phone number
      let formattedNumber = phoneNumber.replace(/\D/g, '');
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '254' + formattedNumber.substring(1);
      }
      if (formattedNumber.startsWith('7') && formattedNumber.length === 9) {
        formattedNumber = '254' + formattedNumber;
      }

      // Simulate API call
      setTimeout(() => {
        onPaymentSuccess({
          method: 'airtel_money',
          transactionId: `AIRTEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          phoneNumber: formattedNumber,
          amount: amount,
          message: `Payment request sent to ${formattedNumber}. Check your phone to complete the transaction.`
        });
        setLoading(false);
      }, 2000);

    } catch (error) {
      onPaymentError('Payment request failed. Please try again.');
      setStep(1);
      setLoading(false);
    }
  };

  const formatPhoneDisplay = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return cleaned.replace(/(\d{3})(\d+)/, '$1 $2');
    if (cleaned.length <= 9) return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
  };

  return (
    <div className="airtel-money-payment">
      <div className="airtel-header">
        <div className="airtel-logo">
          <span className="logo-icon">📱</span>
          <span className="logo-text">Airtel Money</span>
        </div>
        <div className="airtel-info">
          Payments to: <strong>254105441783</strong>
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={handleSubmit} className="airtel-form">
          <div className="form-group">
            <label htmlFor="airtel-number">Airtel Money Number</label>
            <input
              type="tel"
              id="airtel-number"
              placeholder="0712 345 678"
              value={formatPhoneDisplay(phoneNumber)}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 12) setPhoneNumber(value);
              }}
              className="airtel-input"
              maxLength="14"
            />
            <small className="helper-text">
              Enter your Airtel Kenya number. You will receive a payment prompt.
            </small>
          </div>

          <div className="amount-display">
            <div className="amount-label">Amount to pay:</div>
            <div className="amount-value">KES {amount.toLocaleString()}</div>
          </div>

          <button type="submit" className="airtel-btn">
            Continue to Payment
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="confirmation-step">
          <div className="confirmation-header">
            <h3>✅ Confirm Payment</h3>
            <p>You will receive a prompt on your phone</p>
          </div>

          <div className="payment-details">
            <div className="detail-row">
              <span>Phone Number:</span>
              <strong>{formatPhoneDisplay(phoneNumber)}</strong>
            </div>
            <div className="detail-row">
              <span>Amount:</span>
              <strong>KES {amount.toLocaleString()}</strong>
            </div>
            <div className="detail-row">
              <span>Recipient:</span>
              <strong>254105441783 (E-Commerce Platform)</strong>
            </div>
            <div className="detail-row">
              <span>Transaction Fee:</span>
              <strong>KES 0 (Free)</strong>
            </div>
          </div>

          <div className="confirmation-actions">
            <button
              onClick={() => setStep(1)}
              className="btn-secondary"
              disabled={loading}
            >
              Edit Number
            </button>
            <button
              onClick={handleConfirm}
              className="airtel-btn"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="processing-step">
          <div className="processing-spinner">
            <div className="spinner"></div>
          </div>
          <h3>⏳ Processing Payment</h3>
          <p>Check your phone and enter your Airtel Money PIN</p>
          <div className="processing-info">
            <p className="info-item">📱 A payment request has been sent to {formatPhoneDisplay(phoneNumber)}</p>
            <p className="info-item">💡 Ensure you have sufficient balance in your Airtel Money account</p>
            <p className="info-item">⏰ Payment will be processed within 2 minutes</p>
            <p className="info-item">✅ You will receive an SMS confirmation</p>
          </div>
          <div className="processing-timer">
            <p>Waiting for confirmation... (This may take a moment)</p>
          </div>
        </div>
      )}

      <div className="airtel-instructions">
        <h4>📋 How to pay with Airtel Money:</h4>
        <ol>
          <li>Enter your Airtel Money number</li>
          <li>Confirm the payment details</li>
          <li>Check your phone for payment prompt</li>
          <li>Enter your Airtel Money PIN</li>
          <li>Wait for confirmation SMS</li>
        </ol>
      </div>

      <div className="airtel-security">
        <p>🔒 Secure payment • ✅ Instant processing • 📞 24/7 Support</p>
      </div>
    </div>
  );
};

export default AirtelMoneyPayment;