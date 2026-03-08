/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Leaderboard from './pages/Leaderboard';
import Auction from './pages/Auction';
import Results from './pages/Results';
import Transactions from './pages/Transactions';
import Punishments from './pages/Punishments';
import Rules from './pages/Rules';
import AdminDashboard from './pages/AdminDashboard';
import AdminPlayers from './pages/AdminPlayers';
import AdminAuctions from './pages/AdminAuctions';
import AdminDKP from './pages/AdminDKP';
import AdminPenalties from './pages/AdminPenalties';
import AdminSettings from './pages/AdminSettings';
import Activity from './pages/Activity';
import Power from './pages/Power';
import AdminEventConfig from './pages/AdminEventConfig';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Leaderboard": Leaderboard,
    "Auction": Auction,
    "Results": Results,
    "Transactions": Transactions,
    "Punishments": Punishments,
    "Rules": Rules,
    "AdminDashboard": AdminDashboard,
    "AdminPlayers": AdminPlayers,
    "AdminAuctions": AdminAuctions,
    "AdminDKP": AdminDKP,
    "AdminPenalties": AdminPenalties,
    "AdminSettings": AdminSettings,
    "Activity": Activity,
    "Power": Power,
    "AdminEventConfig": AdminEventConfig,
}

export const pagesConfig = {
    mainPage: "Leaderboard",
    Pages: PAGES,
    Layout: __Layout,
};