define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var GraphicBuildView = ComponentView.extend({

    events: {
      'click .js-graphicbuild-click': 'onMore',
      'click .js-click-reset': 'onRestart',
      'click .js-graphicbuild-prev-click': 'onLess'
    },

    moreIndex: -1,
    
    preRender: function() {
      this.checkIfResetOnRevisit();

      this.listenTo(Adapt, {
        'device:changed': this.onDeviceResize,
        "device:resize": this.onDeviceResize
      });
    },
    
    onDeviceResize: function() {
      if (Adapt.device.screenWidth <= '520' || (Adapt.device.screenWidth < 900 && Adapt.device.orientation === "landscape")) {
        this.showMobile();
      } else {
        this.hideMobile();
      }
    },

    postRender: function() {
      this.setReadyStatus();

      this.onDeviceResize();
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    onMore: function() {

      this.$('.graphicbuild__item-bg-graphic').addClass('is-hidden');
      this.$('.graphicbuild__item-content').eq(0).addClass('is-hidden');
      
      this.moreIndex++;
      this.model.get('_items').forEach((item, i) => {
        if(this.moreIndex === i) {
          this.$('.graphicbuild__widget').eq(i).addClass('is-visible');
        } else {
          this.$('.graphicbuild__widget').eq(i).removeClass('is-visible');
        }
      });

      this.$('.js-graphicbuild-prev-click').removeClass('is-hidden');
 
      if(this.moreIndex === this.model.get('_items').length-1) {
        this.setCompletionStatus();
        this.$('.js-graphicbuild-click').addClass('is-hidden');
        this.$('.js-click-reset').removeClass('is-hidden');
        this.$('.component__instruction').html(Adapt.course.get('_globals').scrollInstruction);
      }
    },

    onLess: function() {
      this.$('.graphicbuild__item-bg-graphic').addClass('is-hidden');
      this.$('.graphicbuild__item-content').eq(0).addClass('is-hidden');
      
      if(this.moreIndex === 0) {
        this.onRestart();
      } else {
        this.moreIndex--;
        this.model.get('_items').forEach((item, i) => {
          if(this.moreIndex === i) {
            this.$('.graphicbuild__widget').eq(i).addClass('is-visible');
          } else {
            this.$('.graphicbuild__widget').eq(i).removeClass('is-visible');
          }
        });

        if(this.moreIndex < this.model.get('_items').length-1) {
          // this.setCompletionStatus();
          this.$('.js-graphicbuild-click').removeClass('is-hidden');
          // this.$('.js-click-reset').addClass('is-hidden');
          // this.$('.component__instruction').html(Adapt.course.get('_globals').scrollInstruction);
        }
      }
     
    },

    onRestart: function() {
      this.$('.graphicbuild__item-bg-graphic').removeClass('is-hidden');
      this.$('.graphicbuild__item-content').eq(0).removeClass('is-hidden');
      
      this.moreIndex = -1;
      this.model.get('_items').forEach((item, i) => {
        if(this.moreIndex === i) {
          this.$('.graphicbuild__widget').eq(i).addClass('is-visible');
        } else {
          this.$('.graphicbuild__widget').eq(i).removeClass('is-visible');
        }
      });

      this.$('.js-click-reset').addClass('is-hidden');
      this.$('.js-graphicbuild-click').removeClass('is-hidden');
      this.$('.js-graphicbuild-prev-click').addClass('is-hidden');
      
    },

    showMobile: function() {
      this.moreIndex = this.model.get('_items').length-1;
      this.model.get('_items').forEach((item, i) => {
        if(this.moreIndex === i) {
          this.$('.graphicbuild__widget').eq(i).addClass('is-visible');
        } else {
          this.$('.graphicbuild__widget').eq(i).removeClass('is-visible');
        }
      });

      this.setCompletionStatus();
      this.$('.graphicbuild__btn').addClass('is-hidden');
      this.$('.component__instruction').html(this.model.get('mobileInstruction'));
    },

    hideMobile: function() {
      this.onRestart();
      this.$('.component__instruction').html(this.model.get('instruction'));
    }

  },
  {
    template: 'graphicBuild'
  });

  return Adapt.register('graphicBuild', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: GraphicBuildView
  });
});
