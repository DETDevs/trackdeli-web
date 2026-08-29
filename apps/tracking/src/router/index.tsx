import { createBrowserRouter } from 'react-router-dom';
import { TrackingPage } from '../pages/TrackingPage';
import { DeliveredPage } from '../pages/DeliveredPage';
import { ExpiredPage } from '../pages/ExpiredPage';

export const router = createBrowserRouter([
  {
    path: '/:token',
    element: <TrackingPage />,
  },
  {
    path: '/track/:token',
    element: <TrackingPage />,
  },
  {
    path: '/:token/delivered',
    element: <DeliveredPage />,
  },
  {
    path: '/track/:token/delivered',
    element: <DeliveredPage />,
  },
  {
    path: '/expired',
    element: <ExpiredPage />,
  },
  {
    path: '*',
    element: <ExpiredPage />,
  },
]);
