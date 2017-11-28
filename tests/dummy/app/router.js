import EmberRouter from '@ember/routing/router';
import EmberMetricsRouterMixin from 'ember-metrics-mixins/mixins/router';
import config from './config/environment';

const Router = EmberRouter.extend(EmberMetricsRouterMixin, {
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
});

export default Router;
