import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import About from './pages/About'
import Appointment from './pages/Appointment'
import Contact from './pages/Contact'
import FaqPage from './pages/FaqPage'
import GiftCards from './pages/GiftCards'
import Home from './pages/Home'
import Location from './pages/Location'
import { ManageLookup, ManageToken } from './pages/ManageBooking'
import NotFound from './pages/NotFound'
import ServiceMenu from './pages/ServiceMenu'
import Terms from './pages/Terms'

// staff-only code stays out of the public bundle
const Admin = lazy(() => import('./pages/admin/Admin'))

// Old WordPress URLs. Production redirects these with a real 301 in
// public/.htaccess; this covers local dev and hosts without .htaccess.
const LEGACY: [string, string][] = [
  ['/our-team', '/about-us/'],
  ['/contact-v1', '/contact/'],
  ['/my-bookings', '/manage-booking/'],
  ['/customer-cabinet', '/manage-booking/'],
  ['/cancel-appointment', '/manage-booking/'],
  ['/appointment-cancellation-confirmation', '/manage-booking/'],
  ['/cancel-payment', '/manage-booking/'],
  ['/thank-you', '/appointment/'],
  ['/bookingpress-complete-payment', '/appointment/'],
  ['/checkout', '/gift-cards/'],
  ['/shop', '/gift-cards/'],
  ['/blog', '/'],
  ['/blog-6', '/'],
]

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="massages" element={<ServiceMenu category="massage" />} />
        <Route path="body-treatment" element={<ServiceMenu category="body" />} />
        <Route path="appointment" element={<Appointment />} />
        <Route path="manage-booking" element={<ManageLookup />} />
        <Route path="manage-booking/:token" element={<ManageToken />} />
        <Route path="gift-cards" element={<GiftCards />} />
        <Route path="about-us" element={<About />} />
        <Route path="location" element={<Location />} />
        <Route path="contact" element={<Contact />} />
        <Route path="frequently-asked-questions" element={<FaqPage />} />
        <Route path="terms-and-conditions" element={<Terms />} />
        <Route
          path="admin"
          element={
            <Suspense fallback={<div className="section"><div className="narrow skeleton" style={{ height: 300 }} /></div>}>
              <Admin />
            </Suspense>
          }
        />
        {LEGACY.map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route path="product/*" element={<Navigate to="/gift-cards/" replace />} />
        <Route path="events/*" element={<Navigate to="/massages/" replace />} />
        <Route path="courses/*" element={<Navigate to="/" replace />} />
        <Route path="career/*" element={<Navigate to="/about-us/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
