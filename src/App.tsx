import React from 'react';
import { ThemeProvider, useTheme } from './lib/theme';
import { CartProvider } from './lib/cart';
import { RouterProvider, useRouter } from './lib/router';
import { AuthProvider, useAuth } from './lib/auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AdminPage from './pages/AdminPage';
import ArtistsPage from './pages/ArtistsPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import ArtistDashboardPage from './pages/ArtistDashboardPage';
import ArtistProfilePage from './pages/ArtistProfilePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CmsPage from './pages/CmsPage';
import PagesIndexPage from './pages/PagesIndexPage';
import DigitalProductsPage from './pages/DigitalProductsPage';
import GuestOrderPage from './pages/GuestOrderPage';
import TrackOrderPage from './pages/TrackOrderPage';
import FreeDownloadsPage from './pages/FreeDownloadsPage';
import FreeDownloadDetailPage from './pages/FreeDownloadDetailPage';
import MaintenancePage from './pages/MaintenancePage';
import LegalPage from './pages/LegalPage';
import ArtistApplicationPage from './pages/ArtistApplicationPage';
import AffiliateApplicationPage from './pages/AffiliateApplicationPage';
import AffiliateDashboardPage from './pages/AffiliateDashboardPage';
import { LangProvider } from './lib/lang';
import { FavoritesProvider } from './lib/favorites';

const MAX_VERIFY_TRIES = 3;

function ProtectedRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading, refreshUser } = useAuth();
  const { navigate } = useRouter();
  const [verifying, setVerifying] = React.useState(false);
  const triesRef = React.useRef(0);
  React.useEffect(() => {
    if (loading || verifying) return;
    if (user && roles.includes(user.role)) { triesRef.current = 0; return; } // access granted
    // Role mismatch or no user — the cached role may be stale (e.g. just approved).
    // Re-fetch a few times before redirecting: a freshly-approved artist's profile
    // can lag, and a transient /me failure should not bounce them to the homepage.
    if (triesRef.current < MAX_VERIFY_TRIES) {
      triesRef.current += 1;
      setVerifying(true);
      refreshUser().finally(() => setVerifying(false));
      return;
    }
    if (!user) navigate('/login'); else navigate('/');
  }, [user, loading, verifying]);
  if (loading || verifying) return <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>;
  if (!user || !roles.includes(user.role)) return <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>;
  return <>{children}</>;
}

// Paths blocked during maintenance (public-facing content only)
const MAINTENANCE_BLOCKED: string[] = ['/','/products','/digital-products','/free-downloads','/artists','/pages','/cart','/checkout'];

function isMaintBlocked(path: string): boolean {
  if (MAINTENANCE_BLOCKED.includes(path)) return true;
  return (
    path.startsWith('/products/') ||
    path.startsWith('/free-downloads/') ||
    path.startsWith('/artists/') ||
    path.startsWith('/pages/')
  );
}

function AppContent() {
  const { route } = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const inMaintenance = theme.maintenance_mode && isMaintBlocked(route.path) && !isAdmin;

  const isFullPage = ['/admin','/artist-dashboard','/login'].includes(route.path);
  const isCheckout = route.path === '/checkout';

  const page = () => {
    switch (route.path) {
      case '/': return <HomePage />;
      case '/pages': return <PagesIndexPage />;
      case '/pages/:slug': return <CmsPage slug={route.params?.slug||''} />;
      case '/products': return <ProductsPage />;
      case '/digital-products': return <DigitalProductsPage />;
      case '/products/:slug': return <ProductDetailPage slug={route.params?.slug||''} />;
      case '/cart': return <CartPage />;
      case '/checkout': return <CheckoutPage />;
      case '/artists/:slug': return <ArtistProfilePage slug={route.params?.slug||''} />;
      case '/reset-password': return <ResetPasswordPage />;
      case '/guest-order/:token': return <GuestOrderPage token={route.params?.token || ''} />;
      case '/track-order': return <TrackOrderPage />;
      case '/free-downloads': return <FreeDownloadsPage />;
      case '/free-downloads/:slug': return <FreeDownloadDetailPage slug={route.params?.slug||''} />;
      case '/about-us':          return <LegalPage slug="about-us" />;
      case '/privacy-policy':    return <LegalPage slug="privacy-policy" />;
      case '/terms-of-service':  return <LegalPage slug="terms-of-service" />;
      case '/artist-guidelines': return <LegalPage slug="artist-guidelines" />;
      case '/artist-agreement':  return <LegalPage slug="artist-agreement" />;
      case '/artist-application': return <ProtectedRoute roles={['customer','artist','admin']}><ArtistApplicationPage /></ProtectedRoute>;
      case '/affiliate-guidelines': return <LegalPage slug="affiliate-guidelines" />;
      case '/affiliate-agreement': return <LegalPage slug="affiliate-agreement" />;
      case '/affiliate-application': return <ProtectedRoute roles={['customer','artist','admin']}><AffiliateApplicationPage /></ProtectedRoute>;
      case '/affiliate-dashboard': return <ProtectedRoute roles={['customer','artist','admin']}><AffiliateDashboardPage /></ProtectedRoute>;
      case '/artists': return <ArtistsPage />;
      case '/login': return <LoginPage />;
      case '/account': return <ProtectedRoute roles={['customer','artist','admin']}><AccountPage /></ProtectedRoute>;
      case '/artist-dashboard': return <ProtectedRoute roles={['artist']}><ArtistDashboardPage /></ProtectedRoute>;
      case '/admin': return <ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>;
      default: return (
        <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}>
          <div style={{fontSize:56}}>🔍</div>
          <h2 style={{color:theme.textColor,fontWeight:900}}>Page not found</h2>
          <button onClick={()=>{window.location.hash='/';}} style={{background:theme.primaryColor,color:'white',border:'none',cursor:'pointer',padding:'12px 28px',borderRadius:20,marginTop:16,fontSize:15,fontWeight:700}}>Go Home</button>
        </div>
      );
    }
  };

  // Show maintenance page (no navbar/footer, no admin bypass needed — admin is already excluded above)
  if (inMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      background: theme.bgImageCrop?.croppedDataUrl ? `url(${theme.bgImageCrop.croppedDataUrl}) center/cover fixed` : theme.bgColor,
      fontFamily: theme.fontFamily,
    }}>
      {/* Admin-only maintenance banner */}
      {theme.maintenance_mode && isAdmin && (
        <div style={{ background:'#dc2626', color:'white', textAlign:'center', padding:'8px 16px', fontSize:13, fontWeight:700, letterSpacing:0.5, zIndex:200 }}>
          🔧 Maintenance Mode Enabled — only admins can see the site
        </div>
      )}
      {!isFullPage && <Navbar />}
      <main style={{flex:1}}>{page()}</main>
      {!isFullPage && !isCheckout && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
      <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
          <RouterProvider>
            <AppContent />
          </RouterProvider>
        </CartProvider>
      </FavoritesProvider>
      </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
