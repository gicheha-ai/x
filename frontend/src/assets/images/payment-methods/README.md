# Payment Method Icons Directory

This directory contains icons for all supported payment methods in the E-Commerce Pro Platform.

## Required Icons

### Digital Wallets & Mobile Money
1. `paypal.png` - PayPal payment method
2. `stripe.png` - Stripe payment processing
3. `airtel.png` - Airtel Money (Primary: 254105441783)
4. `mpesa.png` - M-Pesa (Safaricom)
5. `orange-money.png` - Orange Money
6. `mtn-momo.png` - MTN Mobile Money

### Credit/Debit Cards
7. `visa.png` - Visa cards
8. `mastercard.png` - Mastercard
9. `american-express.png` - American Express
10. `discover.png` - Discover
11. `unionpay.png` - UnionPay

### Bank Transfers
12. `bank-transfer.png` - General bank transfer
13. `wire-transfer.png` - International wire transfer

### Cryptocurrency (Optional)
14. `bitcoin.png` - Bitcoin
15. `ethereum.png` - Ethereum

## Icon Specifications

### Size & Format
- **Dimensions:** 64x64 pixels (for standard display)
- **Alternative sizes:** 32x32 (small), 128x128 (large)
- **Format:** PNG with transparent background
- **Color:** Brand colors for each payment method

### Quality Standards
1. **Consistent Style:** All icons should follow the same visual style
2. **Readability:** Clear and recognizable at small sizes
3. **Brand Compliance:** Use official brand colors and logos
4. **Transparency:** Clean edges with proper alpha channel

## SVG vs PNG Considerations

### Use SVG for:
- Icons that need scaling
- When you can control the rendering
- Icons with simple shapes

### Use PNG for:
- Complex logos with gradients
- Payment method logos with specific branding
- When consistent rendering across browsers is needed

## Icon Sources

### Free Resources
- **Font Awesome:** https://fontawesome.com/icons
- **Simple Icons:** https://simpleicons.org/
- **PaymentFont:** https://github.com/AlexanderPoellmann/PaymentFont

### Paid Resources
- **Iconfinder:** https://www.iconfinder.com/
- **Noun Project:** https://thenounproject.com/

### Brand Guidelines
Always check brand guidelines for payment providers:
- PayPal: https://www.paypal.com/us/webapps/mpp/logo-center
- Visa: https://brand.visa.com/
- Mastercard: https://www.mastercard.us/en-us/brandcenter.html

## Implementation

### HTML Structure
```html
<div class="payment-methods">
  <img src="/assets/images/payment-methods/paypal.png" alt="PayPal" width="64" height="64">
  <img src="/assets/images/payment-methods/visa.png" alt="Visa" width="64" height="64">
  <!-- Add other payment methods -->
</div>