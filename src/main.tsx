import '@fontsource/ubuntu/400.css';
import '@fontsource/ubuntu/700.css';
import '@fontsource-variable/space-grotesk/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { App } from './app';
import { UserGuide } from './components/UserGuide';
import './style.css';

function Router() {
  const [showGuide, setShowGuide] = useState(
    window.location.hash === '#guide'
  );

  useEffect(() => {
    function onHashChange() {
      setShowGuide(window.location.hash === '#guide');
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (showGuide) return <UserGuide />;
  return <App />;
}

render(<Router />, document.getElementById('app')!);
