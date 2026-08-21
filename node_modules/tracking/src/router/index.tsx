import { createBrowserRouter } from 'react-router-dom';

import { TrackingPage } from '../pages/TrackingPage';
import { DeliveredPage } from '../pages/DeliveredPage';
import { ExpiredPage } from '../pages/ExpiredPage';

const router = createBrowserRouter([
  { path: '/expired', element: <ExpiredPage /> },
  { path: '/:token', element: <TrackingPage /> },
  { path: '/:token/delivered', element: <DeliveredPage /> },
]);

export default router;
