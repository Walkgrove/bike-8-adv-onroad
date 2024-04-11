define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var FlowView = ComponentView.extend({

    events: {
      'click .js-flow-click': 'onNextFlow'
    },

    flowIndex: 0,
    
    preRender: function() {
      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setReadyStatus();

      this.$('.flow__widget').eq(0).addClass('is-visible');
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    onNextFlow: function() {

      this.$('.flow__item-bg-graphic').addClass('is-hidden');

      this.flowIndex++;
      this.model.get('_items').forEach((item, i) => {
        if(this.flowIndex === i) {
          this.$('.flow__widget').eq(i).addClass('is-visible');
        }
      });

      if(this.flowIndex === this.model.get('_items').length-1) {
        this.setCompletionStatus();
        this.$('.js-flow-click').addClass('is-hidden');
        this.$('.component__instruction').html(Adapt.course.get('_globals').scrollInstruction);
      }
    }

  },
  {
    template: 'flow'
  });

  return Adapt.register('flow', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: FlowView
  });
});
