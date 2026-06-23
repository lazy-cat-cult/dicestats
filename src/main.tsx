import '@fontsource/ubuntu/400.css';
import '@fontsource/ubuntu/700.css';
import '@fontsource-variable/space-grotesk/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import { render } from 'preact';
import { App } from './app';
import './style.css';

render(<App />, document.getElementById('app')!);