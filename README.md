<p align="center">
  <img src="assets/logo-mark.svg" alt="Coffee With KHORSHED logo" width="96">
</p>

<h1 align="center">Coffee With KHORSHED</h1>

<p align="center">
  A scroll-animated website for a speciality coffee shop at KUET, Khulna, with a 3D hero, online ordering, table booking and customer reviews.
</p>

<p align="center">
  <img src="assets/menu/cappuccino.webp" alt="Cappuccino" width="160">
  <img src="assets/menu/v60-pour-over.webp" alt="V60 pour over" width="160">
  <img src="assets/menu/cold-brew.webp" alt="Cold brew" width="160">
  <img src="assets/menu/chocolate-brownie.webp" alt="Chocolate brownie" width="160">
</p>

## Features

- **3D opening scene:** a coffee bean splits, grounds fall into a glass grinder and espresso pours as you scroll, built with Three.js. Browsers without WebGL see an animated 2D version instead.
- **Scroll stories:** three pinned scenes: *Wake the Beans*, *Let it Bloom* and *Make Time Taste Better*.
- **Menu:** 13 items in three categories, each with its own 3D product image and category filters.
- **Ordering:** cart with quantities and totals, plus Pickup, Dine-in or Delivery. Orders are sent as a pre-filled WhatsApp message.
- **Table booking:** a form that checks the date and time against opening hours.
- **Reviews:** customers leave a 1 to 5 star rating and a written review, with rating summary, filters and sorting.
- **Responsive:** works on desktop, tablet and phone, supports keyboard navigation and respects reduced-motion settings.

## Tech stack

Plain HTML, CSS and JavaScript with no build step. [Three.js](https://threejs.org/) 0.160 is loaded from a CDN, and a small PHP script stores reviews in a JSON file.

## Run it locally

You need [PHP](https://www.php.net/) 8 or newer. From the project folder, run:

```bash
php -S localhost:5511
```

Then open <http://localhost:5511>.

Opening `index.html` directly also works, but reviews are then saved only in that browser.

## Configuration

Business details are in the `CONFIG` object at the top of `app.js`:

| Setting | Purpose |
| --- | --- |
| `whatsapp` | Number that receives orders and bookings, in international format, digits only |
| `email` | Used instead of WhatsApp when `whatsapp` is empty |
| `address` | Used for the "Get directions" link |
| `currency` | Currency symbol shown on prices |
| `deliveryFee` | Fee added to delivery orders |
| `hours` | Opening hours for each day of the week |

Menu items, prices and image paths are in the `MENU` list in the same file. The address and phone number shown in the Visit section are written directly in `index.html` and `index-2d.html`.

## Project structure

```text
index.html          Homepage with the 3D hero
index-2d.html       Backup homepage with the 2D hero
styles.css          All styles
script.js           Scroll animations
hero3d.js           3D opening scene
app.js              Menu, cart, checkout, booking and site settings
reviews.js          Reviews section
api/reviews.php     Reviews API
api/data/           Review storage, created at runtime and not committed
assets/             Logo files and icons
assets/menu/        Menu images (800x800 WebP)
tools/              Page that re-renders the menu images
```

## Data storage

The site does not use a database server.

- **Reviews** are saved in `api/data/reviews.json`. To remove a review, delete its entry from that file.
- **Orders and bookings** are not stored by the site. They are sent through WhatsApp or email.
- **Carts and saved customer details** stay in each visitor's browser.

## Deployment

Upload the files to any web host with PHP, and make sure the server can write to `api/data/`.

On a static host such as GitHub Pages, everything works except shared reviews, which are then saved only in each visitor's browser.
