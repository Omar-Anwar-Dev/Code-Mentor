import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/app/store';
import { router } from '@/router';
import { ErrorBoundary } from '@/components/common';
import { ThemeController } from '@/components/common/ThemeController';
import { PageLoader } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { bootstrapSessionThunk } from '@/features/auth/store/authSlice';

function SessionBootstrap() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    // After Redux Persist rehydrates: if a token is present, re-sync the user
    // against the backend so persisted state (including hasCompletedAssessment
    // from older app builds that hardcoded it to true) is corrected.
    if (accessToken) {
      void dispatch(bootstrapSessionThunk());
    }
    // Intentionally fires once on mount only — token rotation during the session
    // doesn't need to re-fetch the profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<PageLoader />} persistor={persistor}>
          <ThemeController>
            <SessionBootstrap />
            <RouterProvider router={router} />
          </ThemeController>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
