define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var FooterView = ComponentView.extend({

    events: {
      'click .js-click-home': 'goHome',
      'click .js-return': 'goReturn',
      'click .js-return-top': 'goReturntop'
    },
    
    preRender: function() {

      Handlebars.registerHelper('if_eq', function(a, b, opts) {
        if (a == b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
      });
      
      this.checkIfResetOnRevisit();
      this.setCompletionStatus();
    },

    postRender: function() {
      this.setReadyStatus();

      let prevLink = false;
      let nextLink = false;
      this.model.get('_links').forEach(link => {
        if(link._name === "previous") {
          prevLink = true;
        }
        if(link._name === "next") {
          nextLink = true;
        }
      });
      if(!prevLink){
        this.$('.footer__inner').addClass('no-prev');
      }
      if(!nextLink){
        this.$('.footer__inner').addClass('no-next');
      }
    },

    goHome: function() {
      Adapt.router.navigateToHomeRoute();
    },

    goReturn: function(event) {
      var id = $(event.currentTarget).data('href');
      Adapt.navigateToElement('.' + id, { replace: true });
    },

    goReturntop: function(event) {
      var id = $(event.currentTarget).data('href');
      Adapt.navigateToElement('.' + id, { replace: true });
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    }
  },
  {
    template: 'footer'
  });

  return Adapt.register('footer', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: FooterView
  });
});
