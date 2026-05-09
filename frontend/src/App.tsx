import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/app/store';
import { router } from '@/router';
import { ErrorBoundary } from '@/components/common';
import { ThemeController } from '@/components/common/ThemeController';
import { PageLoader } from '@/components/ui';

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<PageLoader />} persistor={persistor}>
          <ThemeController>
            <RouterProvider router={router} />
          </ThemeController>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
