import { createBrowserRouter } from 'react-router-dom';
import { BookingPage } from '../pages/BookingPage';
import { ManageAppointmentPage } from '../pages/ManageAppointmentPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/booking/:businessId',
    element: <BookingPage />,
  },
  {
    path: '/manage/:token',
    element: <ManageAppointmentPage />,
  },
  {
    path: '/:businessId',
    element: <BookingPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
