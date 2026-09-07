import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './routes/ProtectedRoute';

import LoginPage          from './pages/LoginPage';
import SignupPage         from './pages/SignupPage';
import HomePageAdmin      from './pages/home/HomePageAdmin';
import HomePageUser       from './pages/home/HomePageUser';
import HotelsPage         from './pages/hotels/HotelsPage';
import BookingsPage       from './pages/bookings/BookingsPage';
import AnalyticsPage      from './pages/analytics/AnalyticsPage';
import RoomsPage          from './pages/rooms/RoomsPage';
import RevenuePage        from './pages/revenue/RevenuePage';
import SettingsPage       from './pages/settings/SettingsPage';
import NotificationsPage  from './pages/notifications/NotificationsPage';
import ProfilePage        from './pages/profile/ProfilePage';
import UsersPage          from './pages/users/UsersPage';
import MyBookingsPage     from './pages/my-bookings/MyBookingsPage';
import BookHotelPage      from './pages/book-hotel/BookHotelPage';
import StartPage          from './pages/StartPage';
import SupportChatPage    from './pages/support/SupportChatPage';
import OnboardingPage     from './pages/onboarding/OnboardingPage';
import Layout             from './components/Layout';
import { HotelBookingFlowStyles, PALETTE } from './components/HotelBookingFlow';

// Wrapper يضيف Layout + styles مشتركة لكل صفحة home
function AdminHome() {
  return (
    <Layout>
      <HotelBookingFlowStyles />
      <style>{`
        .luxestay-root{font-family:'Cairo','Tajawal',system-ui,sans-serif;}
        .luxestay-root h1,.luxestay-root h2{font-family:'Amiri','Cairo',serif;}
        .metric-col{transition:background 0.3s ease;}
        .metric-col:hover{background:${PALETTE.page};}
        .staff-status-card{transition:transform 0.3s ease;}
        .staff-status-card:hover{transform:translateY(-3px);}
        @media(max-width:720px){.metrics-band{grid-template-columns:repeat(2,1fr)!important;}}
      `}</style>
      <div className="luxestay-root"><HomePageAdmin /></div>
    </Layout>
  );
}

function UserHome() {
  return (
    <Layout>
      <HotelBookingFlowStyles />
      <style>{`
        .luxestay-root{font-family:'Cairo','Tajawal',system-ui,sans-serif;}
        .luxestay-root h1,.luxestay-root h2{font-family:'Amiri','Cairo',serif;}
        .luxury-search-shadow{box-shadow:0 12px 35px rgba(13,22,38,0.22);transition:all 0.4s cubic-bezier(0.16,1,0.3,1);}
        .luxury-search-shadow:focus-within{transform:scale(1.015);box-shadow:0 20px 40px rgba(198,154,61,0.28);}
        .offers-row{scroll-snap-type:x proximity;}
        .offer-card{scroll-snap-align:start;transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);}
        .offer-card:hover{transform:translateY(-4px);}
        .dest-select{transition:border-color 0.2s ease;}
        .dest-select:focus{outline:none;border-color:${PALETTE.teal}88!important;}
      `}</style>
      <div className="luxestay-root"><HomePageUser /></div>
    </Layout>
  );
}

export default function App() {
  const { isAuthenticated, currentUser } = useAuthStore();
  const role = currentUser?.role;

  const getDefaultRoute = () => {
    if (role === 'superadmin') return '/home/admin';
    if (role === 'support')    return '/support';
    return '/home/user';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <StartPage />} />
        <Route path="/login"  element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <SignupPage />} />

        {/* Onboarding — بعد التسجيل مباشرة */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        } />

        {/* Admin Home */}
        <Route path="/home/admin" element={
          <ProtectedRoute requiredRole="superadmin"><AdminHome /></ProtectedRoute>
        } />

        {/* User Home */}
        <Route path="/home/user" element={
          <ProtectedRoute>
            {role === 'support' ? <Navigate to="/support" replace /> : <UserHome />}
          </ProtectedRoute>
        } />

        {/* /home redirect حسب الدور */}
        <Route path="/home" element={
          <ProtectedRoute>
            <Navigate to={getDefaultRoute()} replace />
          </ProtectedRoute>
        } />

        {/* Hotels — للأدمن فقط */}
        <Route path="/hotels" element={
          <ProtectedRoute>
            {role === 'support' ? <Navigate to="/support" replace />
            : role === 'user'   ? <Navigate to="/home/user" replace />
            : <HotelsPage />}
          </ProtectedRoute>
        } />

        {/* Settings */}
        <Route path="/settings" element={
          <ProtectedRoute>
            {role === 'support' ? <Navigate to="/support" replace /> : <SettingsPage />}
          </ProtectedRoute>
        } />

        {/* Notifications */}
        <Route path="/notifications" element={
          <ProtectedRoute>
            {role === 'support' ? <Navigate to="/support" replace /> : <NotificationsPage />}
          </ProtectedRoute>
        } />

        {/* Profile */}
        <Route path="/profile" element={
          <ProtectedRoute>
            {role === 'support' ? <Navigate to="/support" replace /> : <ProfilePage />}
          </ProtectedRoute>
        } />

        {/* My Bookings */}
        <Route path="/my-bookings" element={
          <ProtectedRoute>
            {role === 'support' ? <Navigate to="/support" replace /> : <MyBookingsPage />}
          </ProtectedRoute>
        } />

        {/* Book Hotel */}
        <Route path="/book-hotel/:id" element={
          <ProtectedRoute>
            {role === 'support' ? <Navigate to="/support" replace /> : <BookHotelPage />}
          </ProtectedRoute>
        } />

        {/* Support — للجميع */}
        <Route path="/support" element={<ProtectedRoute><SupportChatPage /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/bookings"  element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
        <Route path="/rooms"     element={<ProtectedRoute><RoomsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/revenue"   element={<ProtectedRoute><RevenuePage /></ProtectedRoute>} />
        <Route path="/users"     element={<ProtectedRoute requiredRole="superadmin"><UsersPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? getDefaultRoute() : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
