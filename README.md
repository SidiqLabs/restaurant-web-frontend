[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/CX1XKJPp)
# Challenge 9 - Restaurant Web Frontend (Next JS + TypeScript)

# Description

Membangun Frontend MVP untuk aplikasi Restaurant yang terhubung ke backend. Fokus
pada alur dasar: eksplor menu, filter & pencarian, keranjang, dan checkout sederhana

# Repo Backend & Figma

- Backend : https://be-restaurant-api-889893107835.asia-southeast2.run.app/apiswagger/

- [Figma Design Link](https://www.figma.com/design/1By7DB1gDCNEoW62UqLUrA/Restaurant-App?node-id=2210-441096&t=Mb8iKuBNaG5z903g-1)

# Tech Stack Wajib

- Next JS + TypeScript — framework & type safety
- Tailwind CSS — styling cepat, utility-first
- shadcn/ui — komponen UI siap pakai
- Redux Toolkit — simpan filter, cart, dan state UI lain (client state)
- TanStack Query (React Query) — fetching & caching server state
- Optimistic UI — UX responsif(mis. tambah/hapus cart)
- Day.js — format waktu/tanggal

# MVP Scope (Fitur Minimum)

1. Halaman Menu (Home): daftar makanan & minuman, harga, kategori, rating, foto.
2. Filter & Sort: berdasarkan kategori, harga, rating; simpan di Redux.
3. Pencarian: search by name/keyword (client-side atau server-side).
4. Detail/Quick View: modal atau halaman detail sederhana (opsional).
5. Keranjang (Cart): tambah, ubah qty, hapus item — Optimistic UI.
6. Checkout Sederhana: form nama/no HP/alamat(tanpa payment gateway).
7. Riwayat Pesanan (History): daftar pesanan yang pernah dibuat (sederhana).
8. State Management: server state via React Query, UI state via Redux.
9. Responsif: mobile-first, minimal breakpoint sm/md/lg.
10. Aksesibilitas: alt text, focus ring, warna kontras cukup.
11. Deploy ke vercel. (Optional)

# Pemisahan State: Redux vs React Query

- React Query (Server State): menu, kategori, detail item, order list.
- Redux Toolkit (Client/UI State): filters, sort, search query, cart, modal open/close.

# Struktur Project (Direkomendasikan)

```
src/
├─ app/ # Entry & routing (Vite/CRA: src/main.tsx + src/App.tsx)
├─ pages/ # Page-level components (Home, Cart, Checkout, Orders)
├─ features/
│ ├─ cart/ # Redux slice cart + hooks
│ └─ filters/ # Redux slice filter/sort/search
├─ components/ # UI reusable (Navbar, Footer, ProductCard, EmptyState)
├─ ui/ # shadcn/ui wrappers jika perlu
├─ services/
│ ├─ api/ # axios instance, request helpers
│ └─ queries/ # React Query hooks (useMenusQuery, dst.)
├─ types/ # TypeScript types (MenuItem, Category, Order, dst.)
├─ lib/ # utils (formatCurrency, cn, etc.)
├─ styles/ # global.css, tailwind.css
├─ assets/ # images/icons jika perlu
└─ config/ # env, constants, route paths
```

# Persiapan Project (Langkah Cepat)

1. Install Tailwind CSS: sesuai dokumentasi Tailwind (init & konfigurasi).
2. Install shadcn/ui: setup sesuai docs; generate komponen yang dibutuhkan (Button,
   Input, Card, Dialog).
3. Install Redux Toolkit & React Query: `npm i @reduxjs/toolkit react-redux	
@tanstack/react-query	axios	dayjs`
4. Siapkan `axios` instance (`/services/api/axios.ts`) dan baseURL dari backend.
5. Buat store Redux (`/features/store.ts`) dan slice (cart, filters).
6. Bungkus App dengan `<Provider>`(Redux) dan `<QueryClientProvider>`(React Query).

# Environment & Konfigurasi

- Buat `.env` dengan `VITE_API_BASE_URL	=	link	Api (sesuaikan).
- Axios instance membaca `import.meta.env.VITE_API_BASE_URL`.
- Hindari hard-code URL API di komponen.

# Getting Started

for this project first, then to run the app, run

```
npm run dev
```

on terminal

Study the Figma Design: Open the Figma link and thoroughly examine the design. Understand the layout, spacing, colors, typography, and responsive behavior.

HTML Structure: Open the public/index.html file. Begin by structuring the page with HTML elements that mirror the design.

Tailwind CSS: Use Tailwind CSS classes directly within your HTML elements to apply styles. For example:

<div class="flex justify-center items-center">...</div>

<h1 class="text-3xl font-bold text-primary">...</h1>

Test in the Browser: Run npm run dev to see it on your browser

Iterate: Continue to refine your HTML and Tailwind CSS until your webpage accurately matches the Figma design.

# Important Notes

You can modify the folder structure only on src and public folder, don't change anything related to project setup

Tailwind CSS Documentation: Refer to the official Tailwind CSS documentation (https://tailwindcss.com/docs) for information on available classes and how to use them.

Figma Inspection: Use the "Inspect" feature in Figma to get precise measurements, colors, and font styles from the design.

# Evaluation System

The evaluation for this assignment will be based on the following criteria:

1.  **Basic concept and project structure:** How you understand the concept of next js and how you manage the project structure
2.  **Routing and rendering method:** How you manage routing and rendering method (CSR, SSR, SSG)
3.  **Next js advance features and optimizations:** How you use next js optimized tools like next/image etc.
4.  **Deployment & best practice:** How you deploy your app on vercel

---

# How to Upload your Challenge

Check this module: [click this](https://orchid-clematis-3e4.notion.site/Panduan-Penggunaan-Git-Untuk-Upload-Assignment-e2d80a19b3684f5d8f1a4209dcf85445?pvs=73)

---

🎉 Congratulations on working on this assignment! Utilize the _playground_ feature in Figma to help you understand how the design should look on various devices. Keep experimenting and don't hesitate to look for references if you encounter difficulties. You can definitely produce great work! 🚀 Keep up the spirit, cheers! 🎈
