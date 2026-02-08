import { useState, useEffect } from 'react';
import { app } from '@microsoft/teams-js';
import { isInVSCode } from '../utils/vscodeApi';

interface TeamsContextState {
  context: app.Context | null;
  isInitialized: boolean;
  initError: string | null;
  theme: string;
}

let globalContext: app.Context | null = null;
let globalInitialized = false;
let initPromise: Promise<void> | null = null;

export function useTeamsContext(): TeamsContextState {
  // Start with isInitialized: true to avoid blocking if Teams SDK has issues
  const [state, setState] = useState<TeamsContextState>({
    context: globalContext,
    isInitialized: true, // Default to true - don't block the app
    initError: null,
    theme: 'default',
  });

  useEffect(() => {
    async function initialize() {
      // Skip Teams SDK init entirely in VS Code (saves 3s timeout)
      if (isInVSCode()) {
        console.log('useTeamsContext: Running in VS Code, skipping Teams SDK init');
        setState({
          context: null,
          isInitialized: true,
          initError: null,
          theme: 'default',
        });
        return;
      }

      console.log('useTeamsContext: Starting initialization');

      if (globalInitialized && globalContext) {
        console.log('useTeamsContext: Already initialized with context');
        setState({
          context: globalContext,
          isInitialized: true,
          initError: null,
          theme: globalContext.app?.theme || 'default',
        });
        return;
      }

      try {
        if (!initPromise) {
          console.log('useTeamsContext: Calling app.initialize()');
          initPromise = app.initialize();
        }

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Teams SDK timeout')), 3000);
        });

        await Promise.race([initPromise, timeoutPromise]);
        console.log('useTeamsContext: app.initialize() succeeded');
        globalInitialized = true;

        // Notify Teams that the app has loaded
        try {
          app.notifyAppLoaded();
          console.log('useTeamsContext: notifyAppLoaded called');
        } catch (e) {
          console.log('notifyAppLoaded failed:', e);
        }

        const ctx = await app.getContext();
        console.log('useTeamsContext: Got context:', ctx);
        globalContext = ctx;

        setState({
          context: ctx,
          isInitialized: true,
          initError: null,
          theme: ctx.app?.theme || 'default',
        });

        // Notify Teams that initialization is complete
        try {
          app.notifySuccess();
          console.log('useTeamsContext: notifySuccess called');
        } catch (e) {
          console.log('notifySuccess failed:', e);
        }
      } catch (error) {
        console.log('useTeamsContext: Initialization failed, running standalone:', error);

        // If Teams SDK fails, we're running outside Teams - that's fine
        globalInitialized = true;
        setState({
          context: null,
          isInitialized: true,
          initError: null,
          theme: 'default',
        });
      }
    }

    initialize();

    // Listen for theme changes
    const handleThemeChange = (theme: string) => {
      setState((prev) => ({ ...prev, theme }));
    };

    try {
      app.registerOnThemeChangeHandler(handleThemeChange);
    } catch {
      // Ignore if not in Teams
    }
  }, []);

  return state;
}
