const { createApp } = Vue;
import Calculation from './calculation.js';

const App = {
    components: {
        Calculation
    },
  template: '<div><Calculation/></div>'
};

createApp(App).mount('#app');

