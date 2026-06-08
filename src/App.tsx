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
import { LangProvider } from './lib/lang';
import { FavoritesProvider } from './lib/favorites';

function ProtectedRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();
  React.useEffect(() => {
    if (!loading && !user) navigate('/login');
    if (!loading && user && !roles.includes(user.role)) navigate('/');
  }, [user, loading]);
  if (loading) return <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>;
  if (!user || !roles.includes(user.role)) return null;
  return <>{children}</>;
}

function AppContent() {
  const { route } = useRouter();
  const { theme } = useTheme();

  const isFullPage = ['/admin','/artist-dashboard','/login'].includes(route.path);
  const isCheckout = route.path === '/checkout';

  const page = () => {
    switch (route.path) {
      case '/': return <HomePage />;
      case '/pages': return <PagesIndexPage />;
      case '/pages/:slug': return <CmsPage slug={route.params?.slug||''} />;
      case '/products': return <ProductsPage />;
      case '/products/:slug': return <ProductDetailPage slug={route.params?.slug||''} />;
      case '/cart': return <CartPage />;
      case '/checkout': return <CheckoutPage />;
      case '/artists/:slug': return <ArtistProfilePage slug={route.params?.slug||''} />;
      case '/reset-password': return <ResetPasswordPage />;
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

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      background: theme.bgImageCrop?.croppedDataUrl ? `url(${theme.bgImageCrop.croppedDataUrl}) center/cover fixed` : theme.bgColor,
      fontFamily: theme.fontFamily,
    }}>
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
