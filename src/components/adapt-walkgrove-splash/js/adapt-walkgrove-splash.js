define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var SplashView = ComponentView.extend({

    events: {
      'click .js-splash-start-click': 'onContinueClicked'
    },

    preRender: function() {
      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setReadyStatus();
      this.setCompletionStatus();
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    onContinueClicked: function() {
      //console.log("HOME");
      Adapt.router.navigateToHomeRoute();
      //Backbone.history.navigate('#/id/co-01_00', {trigger: true});
    }

  },
  {
    template: 'splash'
  });

  return Adapt.register('splash', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: SplashView
  });
});
