import '@fontsource/ubuntu-condensed/index.css';
import '@fontsource-variable/space-grotesk/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import { render } from 'preact';
import { App } from './app';
import './style.css';

render(<App />, document.getElementById('app')!);