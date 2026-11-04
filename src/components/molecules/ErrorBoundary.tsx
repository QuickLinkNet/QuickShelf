import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../atoms/Button';
import { t } from '../../i18n';

type Props = { children: ReactNode; resetKey?: string };
type State = { error: Error | null };

/** Keeps a crashing page from blanking the whole app; resets itself when the route changes. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bad/15 text-bad"><AlertTriangle className="h-7 w-7" /></span>
        <h2 className="h-sec">{t('Hier ist etwas schiefgegangen')}</h2>
        <p className="muted">{this.state.error.message}</p>
        <Button variant="primary" onClick={() => location.reload()}>{t('Seite neu laden')}</Button>
      </div>
    );
  }
}
