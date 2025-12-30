import React, { useState } from 'react';
import './PaymentMethods.css';

const PaymentMethods = ({ amount, onPaymentSuccess, onPaymentError }) => {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [airtelNumber, setAirtelNumber] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    accountName: '',
    bankName: ''
  });
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Simulate payment processing
      setTimeout(() => {
        if (selectedMethod === 'card') {
          // Validate card details
          if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name) {
            onPaymentError('Please fill all card details');
            setLoading(false);
            return;
          }
        } else if (selectedMethod === 'airtel') {
          // Validate Airtel number
          if (!airtelNumber || airtelNumber.length < 10) {
            onPaymentError('Please enter a valid Airtel number');
            setLoading(false);
            return;
          }
        } else if (selectedMethod === 'bank') {
          // Validate bank details
          if (!bankDetails.accountNumber || !bankDetails.accountName || !bankDetails.bankName) {
            onPaymentError('Please fill all bank details');
            setLoading(false);
            return;
          }
        }

        onPaymentSuccess({
          method: selectedMethod,
          amount: amount,
          transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        });
        setLoading(false);
      }, 2000);
    } catch (error) {
      onPaymentError('Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  return (
    <div className="payment-methods">
      <div className="payment-header">
        <h2>💳 Complete Payment</h2>
        <p className="payment-amount">Total: <strong>${amount.toFixed(2)}</strong></p>
      </div>

      <div className="method-selector">
        <button
          className={`method-tab ${selectedMethod === 'card' ? 'active' : ''}`}
          onClick={() => setSelectedMethod('card')}
        >
          💳 Credit/Debit Card
        </button>
        <button
          className={`method-tab ${selectedMethod === 'airtel' ? 'active' : ''}`}
          onClick={() => setSelectedMethod('airtel')}
        >
          📱 Airtel Money
        </button>
        <button
          className={`method-tab ${selectedMethod === 'bank' ? 'active' : ''}`}
          onClick={() => setSelectedMethod('bank')}
        >
          🏦 Bank Transfer
        </button>
        <button
          className={`method-tab ${selectedMethod === 'paypal' ? 'active' : ''}`}
          onClick={() => setSelectedMethod('paypal')}
        >
          📘 PayPal
        </button>
      </div>

      <div className="method-content">
        {selectedMethod === 'card' && (
          <div className="card-payment">
            <div className="form-group">
              <label>Card Number</label>
              <input
                type="text"
                value={cardDetails.number}
                onChange={(e) => setCardDetails({...cardDetails, number: formatCardNumber(e.target.value)})}
                placeholder="1234 5678 9012 3456"
                maxLength="19"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="text"
                  value={cardDetails.expiry}
                  onChange={(e) => setCardDetails({...cardDetails, expiry: formatExpiry(e.target.value)})}
                  placeholder="MM/YY"
                  maxLength="5"
                />
              </div>
              <div className="form-group">
                <label>CVC</label>
                <input
                  type="text"
                  value={cardDetails.cvc}
                  onChange={(e) => setCardDetails({...cardDetails, cvc: e.target.value.replace(/\D/g, '')})}
                  placeholder="123"
                  maxLength="4"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Cardholder Name</label>
              <input
                type="text"
                value={cardDetails.name}
                onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            <div className="card-logos">
              <span>💳</span>
              <span>💳</span>
              <span>💳</span>
              <span>💳</span>
            </div>
          </div>
        )}

        {selectedMethod === 'airtel' && (
          <div className="airtel-payment">
            <div className="form-group">
              <label>Airtel Money Number</label>
              <input
                type="tel"
                value={airtelNumber}
                onChange={(e) => setAirtelNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="2547XXXXXXXX"
                maxLength="12"
              />
              <small className="helper-text">
                Enter your Airtel Kenya number (e.g., 254712345678)
              </small>
            </div>
            <div className="airtel-info">
              <p>📱 You will receive a payment prompt on your phone</p>
              <p>💰 Ensure you have sufficient balance in your Airtel Money account</p>
              <p>⏰ Payment will be processed immediately</p>
            </div>
          </div>
        )}

        {selectedMethod === 'bank' && (
          <div className="bank-payment">
            <div className="form-group">
              <label>Bank Name</label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                placeholder="Equity Bank, KCB, etc."
              />
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                placeholder="1234567890"
              />
            </div>
            <div className="form-group">
              <label>Account Name</label>
              <input
                type="text"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            <div className="bank-instructions">
              <p>🏦 Please transfer <strong>${amount.toFixed(2)}</strong> to:</p>
              <div className="account-details">
                <p><strong>Bank:</strong> Your Bank Name</p>
                <p><strong>Account:</strong> 1234567890</p>
                <p><strong>Name:</strong> E-Commerce Platform</p>
                <p><strong>Reference:</strong> ORDER_{Date.now()}</p>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'paypal' && (
          <div className="paypal-payment">
            <div className="paypal-info">
              <p>📘 You will be redirected to PayPal to complete your payment</p>
              <p>🔒 Secure payment processed by PayPal</p>
              <p>💳 No need to enter card details on our site</p>
            </div>
            <button className="paypal-button">
              Continue with PayPal
            </button>
          </div>
        )}
      </div>

      <div className="payment-security">
        <p>🔒 Your payment is secure and encrypted</p>
        <p>✅ 256-bit SSL encryption</p>
        <p>✅ PCI DSS compliant</p>
      </div>

      <div className="payment-actions">
        <button 
          className="pay-button"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
};

export default PaymentMethods;
