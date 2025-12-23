# Images Directory

This directory contains all images used in the E-Commerce Pro Platform.

## Required Images

Place the following images in this directory:

### Logo Files
- `logo.png` - Main platform logo (Recommended: 200x60px, PNG with transparent background)
- `logo192.png` - PWA icon 192x192
- `logo512.png` - PWA icon 512x512
- `favicon.ico` - Browser favicon 32x32

### Banner Images
- `hero-banner.jpg` - Homepage hero banner (Recommended: 1920x600px, JPG/WebP)
- `placeholder-product.jpg` - Default product image (Recommended: 800x800px)

### Payment Method Icons
Create a `payment-methods/` subdirectory with:
- `paypal.png` - PayPal logo
- `stripe.png` - Stripe logo
- `visa.png` - Visa logo
- `mastercard.png` - Mastercard logo
- `airtel.png` - Airtel Money logo
- `mpesa.png` - M-Pesa logo (optional)

### Category Images
Create a `categories/` subdirectory with category-specific images:
- `electronics.jpg`
- `fashion.jpg`
- `home-garden.jpg`
- `beauty.jpg`
- `sports.jpg`
- `books.jpg`

### User Interface
- `avatar-default.png` - Default user avatar
- `empty-cart.png` - Empty cart illustration
- `404-error.png` - 404 page illustration
- `success-check.png` - Success checkmark

## Image Optimization Guidelines

1. **Format Selection:**
   - Use WebP format for better compression
   - Use PNG for logos and images requiring transparency
   - Use JPG for photographs and complex images

2. **Size Requirements:**
   - Product images: 800x800px (max)
   - Category images: 400x400px
   - Banner images: 1920x600px
   - Icons: 64x64px (max)

3. **Compression:**
   - Compress all images before uploading
   - Target file sizes:
     - Product images: < 200KB
     - Banner images: < 500KB
     - Icons: < 50KB

4. **SEO Optimization:**
   - Use descriptive filenames (e.g., `iphone-13-pro-max-black.jpg`)
   - Include alt text for all images
   - Implement lazy loading for below-the-fold images

## Generating Placeholder Images

If you don't have actual images yet, you can use these placeholder services:

1. **For product placeholders:** https://via.placeholder.com/800x800
2. **For user avatars:** https://ui-avatars.com/api/?name=User+Name
3. **For category images:** https://picsum.photos/400/400

## Image CDN Setup (Optional)

For production, consider using a CDN for images:
- Cloudinary
- Cloudflare Images
- AWS S3 + CloudFront

## Updating Images

When updating images:
1. Keep the same filename to prevent broken links
2. Update the image in all sizes if responsive images are used
3. Clear the browser cache to see changes
4. Update any references in the code if paths change

## Performance Tips

1. Use `srcset` for responsive images
2. Implement lazy loading with `loading="lazy"`
3. Use CSS sprites for icons
4. Compress images using tools like:
   - ImageOptim (Mac)
   - TinyPNG (Web)
   - Squoosh (Web)

## Legal Considerations

1. Ensure you have rights to use all images
2. Include attribution if required
3. Don't use copyrighted images without permission
4. Consider purchasing stock images for professional look