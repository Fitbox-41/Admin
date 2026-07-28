# FitBox Admin Dashboard

A modern, responsive, and aesthetically pleasing administrative dashboard for the FitBox sports ecosystem, built with React, Vite, and Tailwind CSS.

##  Features

- **Modern Glassmorphism UI**: Beautiful, translucent interface elements that provide a premium feel.
- **Dynamic Dark/Light Mode**: Seamlessly switches themes for optimal viewing in any lighting condition.
- **Responsive Design**: Fully functional and visually stunning across desktop, tablet, and mobile devices.
- **Interactive Data Visualization**: Comprehensive charts and metrics for quick insights.
- **High-Performance**: Lightning-fast load times powered by Vite.
- **Store management**: Products, Orders, Customers, Refunds, Admin Users, Store Settings.
- **FitBox App management** (sidebar → **FitBox App**, route `/app`): analytics and
  controls for the mobile app, on the shared Atlas DB —
  - *Overview*: users, runs (14-day chart), points economy, challenges, territory.
  - *Users*: app users with points / runs / distance / territory / push status.
  - *Challenges*: create / edit / delete challenges (this is how the app's
    Challenges screen is populated).
  - *Push*: compose a notification to all users or a single user (live FCM).
  - *Territory*: current weekly season + leaderboard.

  Backend `Backend/routes/app.js` (`/api/app/*`): analytics/users/territory read
  the shared DB directly; challenges + push proxy to the app backend with the
  shared service key. **Requires these env vars on the admin backend:**
  `APP_API_BASE=https://fit-box-app.vercel.app` and `WALLET_SERVICE_KEY`
  (identical to the app backend's key).

##  Tech Stack

- **Frontend Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router

##  Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Fitbox-41/Admin.git
   ```

2. Navigate to the frontend directory:
   ```bash
   cd Admin/Frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

##  Building for Production

To create a production-ready build:

```bash
npm run build
```

You can preview the production build locally with:

```bash
npm run preview
```

##  Design System

The application uses a custom design system built on top of Tailwind CSS, utilizing CSS variables for consistent theming and easy customization. Key features include:

- Custom typography (`Plus Jakarta Sans`, `Inter`, `Outfit`)
- Tailwind `@theme` configuration
- Reusable `glass` and `glass-dark` utility classes for unified component design

##  License

This project is proprietary and confidential.
