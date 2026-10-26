import {AppRegistry} from 'react-native';
import App from './App';
import {name} from './app.json';
import {initializePlugin} from './src/runtime';

AppRegistry.registerComponent(name, () => App);
initializePlugin().catch(error => console.error('Pic2Note initialization:', error));
