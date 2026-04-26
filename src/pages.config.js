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
import Activity from './pages/Activity';
import AdminAuctions from './pages/AdminAuctions';
import AdminDKP from './pages/AdminDKP';
import AdminDashboard from './pages/AdminDashboard';
import AdminEventConfig from './pages/AdminEventConfig';
import AdminLogin from './pages/AdminLogin';
import AdminPenalties from './pages/AdminPenalties';
import AdminPlayers from './pages/AdminPlayers';
import AdminSettings from './pages/AdminSettings';
import AdminUserManagement from './pages/AdminUserManagement';
import Auction from './pages/Auction';
import Charts from './pages/Charts';
import Leaderboard from './pages/Leaderboard';
import PlayerDetail from './pages/PlayerDetail';
import Power from './pages/Power';
import Punishments from './pages/Punishments';
import Results from './pages/Results';
import Rules from './pages/Rules';
import Transactions from './pages/Transactions';


export const PAGES = {
    "Activity": Activity,
    "AdminAuctions": AdminAuctions,
    "AdminDKP": AdminDKP,
    "AdminDashboard": AdminDashboard,
    "AdminEventConfig": AdminEventConfig,
    "AdminLogin": AdminLogin,
    "AdminPenalties": AdminPenalties,
    "AdminPlayers": AdminPlayers,
    "AdminSettings": AdminSettings,
    "AdminUserManagement": AdminUserManagement,
    "Auction": Auction,
    "Charts": Charts,
    "Leaderboard": Leaderboard,
    "PlayerDetail": PlayerDetail,
    "Power": Power,
    "Punishments": Punishments,
    "Results": Results,
    "Rules": Rules,
    "Transactions": Transactions,
}

export const pagesConfig = {
    mainPage: "Leaderboard",
    Pages: PAGES,
};