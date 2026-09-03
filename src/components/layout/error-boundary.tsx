import { Component, type ErrorInfo, type ReactNode } from 'react';
import { exportData } from '../../utils/export-import';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Last line of defence for a standalone PWA: a render error would
 * otherwise leave a blank screen with no address bar to recover from.
 * Offers a reload and a backup export so no data is lost.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-bold mb-1">Something went wrong</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          The app hit an error it couldn't recover from. Your data is still saved on this device.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl"
          >
            Reload
          </button>
          <button
            onClick={() => { void exportData(); }}
            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-sm font-semibold rounded-xl"
          >
            Export backup
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-6 max-w-xs break-words">{this.state.error.message}</p>
      </div>
    );
  }
}
