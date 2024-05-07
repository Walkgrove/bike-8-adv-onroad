define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel',
  'core/js/models/buildModel'
], function(Adapt, ComponentView, ComponentModel) {

  var InteractiveVideoView = ComponentView.extend({

    events: {
      'click .js-next-stage': 'showNextStep',
      'click .js-prev-stage': 'showPrevStep',
      'click .js-click-reset': 'resetInteraction',
    },

    _stageIndex: 1,
    _stepIndex: -1,
    _stageViewedIndex: 1,
    _stepViewedIndex: -1,
    _moveOnAuto: false,
    _stepCompletedIndex: -1,
    _models: [],
    
    preRender: function() {

      this.listenTo(Adapt, {
        'device:resize': this.onScreenSizeChanged,
        'device:changed': this.onDeviceChanged
      });

      this.checkIfResetOnRevisit();
    },

    onScreenSizeChanged: function() {
      this.updateContent();
    },

    onDeviceChanged: function() {
      this.updateContent();
    },

    updateContent: function(){
      this.model.get('_items').forEach((item, index) => {
        if(this._stepIndex === index) {
          this.setContent(item);
        }
      });
    },

    postRender: function() {
      this.setReadyStatus();

      this.setUpSteps();

      this._moveOnAuto = this.model.get('_moveOnAuto') ? this.model.get('_moveOnAuto') : false;

      this.listenTo(Adapt, {
        'intvid:unlock': this.unlockAfterReflection
      });

    },

    unlockAfterReflection: function() {
      // console.log("reflection completed");
      this.allowNextStep();
      var ins = this._models[this._stepIndex].get('instructionAfter');
      if(ins){
        this.$('.interactivevideo__content-instruction').html(ins);
      }
    },

    resetInteraction: function() {
      // this.model.reset(true, true);

      this._stageIndex = 1;
      this._stepIndex = -1;
      this._stageViewedIndex = 1;
      this._stepViewedIndex = -1;
      this._stepCompletedIndex = -1;

      //remove Models
      this.model.get('_items').forEach((item, index) => {
        this.$(".interactivevideo__widget").eq(index).html("");
      });

      this.setUpSteps();

      this.$('.js-click-reset').removeClass('is-visible');
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    setUpSteps: function() {
      var MediaView = Adapt.getViewClass('media');
      var DragdropView = Adapt.getViewClass('dragdrop');
      var MCQView = Adapt.getViewClass('basicQuestion');
      var ReflectionView = Adapt.getViewClass('reflection');
      var TextView = Adapt.getViewClass('text');

      this.model.get('_items').forEach((item, index) => {

       var model = new Backbone.Model(item);
       this._models.push(model);
       var newComponent;

        switch(item._component) {
          case "media":
            newComponent = new MediaView({ model: model });
            
            this.model.listenTo(model,  'change', ()=> {
              if(model.get('_isMediaEnded') === true) {
                if(this._moveOnAuto === true) {
                  var isIE11 = !!window.MSInputMethodContext && !!document.documentMode;
                  if(isIE11) {
                    this.enableNext();
                  } else {
                    this.showNextStep();
                  }
                }else {
                  this.enableNext();
                }
              }
            });

            this.addStepModel(index, newComponent.$el);

            _.delay(() => {
              if(Adapt.device.screenSize === 'small' && model.get('stepInstructionMobile')) {
                this.$('.interactivevideo__content-instruction').html(model.get('stepInstructionMobile'));
              }
              // console.log(index, Adapt.device.screenSize === 'small', this.$('.interactivevideo__content-instruction').html());
            }, 500);
            
            break;

          case "reflection":

            newComponent = new ReflectionView({ model: model });
          
            this.model.listenTo(model,  'change', ()=> {
              if(model.get('_isComplete') === true || model.get('_isAnswered') === true) {
                // this.unlockAfterReflection();
              }
            });

            this.addStepModel(index, newComponent.$el);
            break;
          
          case "text":

            newComponent = new TextView({ model: model });
          
            this.model.listenTo(model,  'change', ()=> {
              if(model.get('_isComplete') === true) {
                console.log("text completed");
                var ins = model.get('instructionAfter');
                if(ins){
                  this.$('.interactivevideo__content-instruction').html(ins);
                }
                this.allowNextStep();
              }
            });

            this.addStepModel(index, newComponent.$el);
            break;
        }

      });

      this.$('.interactivevideo__widget').eq(this._stepIndex).addClass('visible');
      this.showNextStep();
    },

    addStepModel: function (_index, _el) {
      var $container = this.$(".interactivevideo__widget").eq(_index);
      $container.append(_el);  
    },

    allowNextStep: function() {
      // console.log("boo!", this._stageIndex, this.model.get('_stages').length);
      if(this._stageIndex <= this.model.get('_stages').length) {
        this._stageIndex++;
        if(this._stageViewedIndex < this._stageIndex) {
          this._stageViewedIndex = this._stageIndex;
        }
        if(this._stepCompletedIndex < this._stepViewedIndex) {
          this._stepCompletedIndex = this._stepViewedIndex;
        }
        this.enableNext();
      }
      if(this._stepIndex === this.model.get('_items').length-3) {
        //this._stageViewedIndex++;
        this.setCompletionStatus();
        // this.$('.js-click-reset').addClass('is-visible');
      }
      if(this._stepIndex === this.model.get('_items').length-1) {
        this._stepViewedIndex++;
      }
    },

    showNextStep: function() {
      if(this._stepIndex < this.model.get('_items').length - 1) {
        this._stepIndex++;
        if(this._stepViewedIndex < this._stepIndex) {
          this._stepViewedIndex = this._stepIndex;
        }
        this.model.get('_items').forEach((item, index) => {
          if(this._stepIndex === index) {
            this.$("." + item._id).removeClass('u-visibility-hidden');
            this.$("." + item._id).removeClass('hide');

            this.setContent(item);

          } else {
            this.$("." + item._id).addClass('u-visibility-hidden');
            this.$("." + item._id).addClass('hide');
          }
        });
        
        this.updateProgress();

        _.delay(() => {
          // console.log(this._models[this._stepIndex].get('_isAnswered'));
          if(this._models[this._stepIndex].get('_isAnswered') === true) {
            this.allowNextStep();
            this.enableNext();
          }
        }, 1500);
      }
    },

    showPrevStage: function() {
      if(this._stageIndex > 1) {
        this._stageIndex--;
        this._stepIndex = this._stepIndex-2;
        this.model.get('_items').forEach((item, index) => {
          if(this._stepIndex === index) {
            this.$("." + item._id).removeClass('u-visibility-hidden');
            this.$("." + item._id).removeClass('hide');

            this.setContent(item);

          } else {
            this.$("." + item._id).addClass('u-visibility-hidden');
            this.$("." + item._id).addClass('hide');
          }
        });
        this.updateProgress();
      }
    },

    showPrevStep: function() {
      if(this._stepIndex > 0) {
        this._stepIndex--;
        this.model.get('_items').forEach((item, index) => {
          if(this._stepIndex === index) {
            this.$("." + item._id).removeClass('u-visibility-hidden');
            this.$("." + item._id).removeClass('hide');

            this.setContent(item);

          } else {
            this.$("." + item._id).addClass('u-visibility-hidden');
            this.$("." + item._id).addClass('hide');
          }
        });
        this.updateProgress();
      }
    },

    setContent:function(_item) {
      //pause any video playing
      var videoList = document.getElementsByTagName("video");
      for( var i = 0; i < videoList.length; i++ ){ 
        videoList.item(i).pause();
        //videoList.item(i).currentTime = 0;
      }

      if(_item._background === null) { // || Adapt.device.screenSize === 'small'
        this.$('.interactivevideo__bg-image').addClass("is-hidden");
      } else {
        this.$('.interactivevideo__bg-image').removeClass("is-hidden");
        this.$('.interactivevideo__bg-img').attr("src", _item._background);
      }
      
      this.$('.interactivevideo__widget').css({ height: '0px' });

      if(Adapt.device.screenSize === 'small') {

        this.$('.interactivevideo__widget').eq(this._stepIndex).css({ height: 'auto' });
        _.delay(() => {
          this.$('.interactivevideo__widget').eq(this._stepIndex).css({ height: 'auto' });
          this.$('.interactivevideo__bg-img').css({ opacity: 0 });

          console.log(this._models[this._stepIndex].get('_component'), this._models[this._stepIndex].get('stepInstructionMobile'));
          if(this._models[this._stepIndex].get('_component') === 'media' && this._models[this._stepIndex].get('stepInstructionMobile')) {
            this.$('.interactivevideo__content-instruction').html(this._models[this._stepIndex].get('stepInstructionMobile'));
          }
          // console.log(index, Adapt.device.screenSize === 'small', this.$('.interactivevideo__content-instruction').html());
        }, 1000);

      } else {
        
        var heightDiv = this.$('.interactivevideo__bg-image').height();

        this.$('.interactivevideo__widget').removeClass('visible');
      
        this.$('.interactivevideo__widget').eq(this._stepIndex).css({ height: Math.round(heightDiv) + 'px' });
        _.delay(() => {
          var heightDiv = this.$('.interactivevideo__bg-image').height();
          this.$('.interactivevideo__widget').eq(this._stepIndex).css({ height: Math.round(heightDiv) + 'px' });
          this.$('.interactivevideo__widget').eq(this._stepIndex).addClass('visible');
          if(this._stepIndex > 0) {
           // Adapt.scrollTo('.' + this.model.get('_id'), { duration: 250 });
          }
          //accessibility
          //_.delay(() => {
            this.$('.interactivevideo__content').a11y_focus();
          //}, 1000);
        }, 1000);

      }
      
      this.$('.interactivevideo__content-title').html(_item.stepTitle);
      this.$('.interactivevideo__content-body').html(_item.stepBody);

      //console.log(this._stepIndex, this._stepViewedIndex, this.model.get('_items').length);
      if(this._stepIndex < this._stepViewedIndex || (this._stepIndex > this._stepViewedIndex && this._stepIndex === (this.model.get('_items').length-1))) {
       this.$('.interactivevideo__content-instruction').html(_item.instructionAfter);
      } else {
        this.$('.interactivevideo__content-instruction').html(_item.stepInstruction);
      }

    },

    updateProgress: function() {
      //dots
      this.model.get('_items').forEach((item, index) => {

       var stageI = Math.round(index/2);
       var activeIndex = (this._stageIndex*2) - 2;
       var completeIndex = (this._stageIndex*2) - 1;

      //  console.log("this._stepIndex: " + this._stepIndex + " - activeIndex: " + activeIndex + " - completeIndex: " + completeIndex);

        if(index === this._stepIndex && this._stepIndex === activeIndex) { 
          //console.log("active: " + index + " - " + stageI);
          this.$('.interactivevideo__progress-dot').eq(stageI).addClass('is-active');
        } else if(index <= this._stepViewedIndex && this._stepViewedIndex === completeIndex) { 
         //console.log("complete: " + index + " - " + stageI);
          this.$('.interactivevideo__progress-dot').eq(stageI).addClass('is-complete');
        } else if(index > this._stepIndex) {
          this.$('.interactivevideo__progress-dot').eq(stageI).removeClass('is-complete');
          this.$('.interactivevideo__progress-dot').eq(stageI).removeClass('is-active');
        }

        if(index === this._stepIndex && activeIndex < completeIndex) { 
          //console.log("active: " + index + " - " + stageI);
          this.$('.interactivevideo__progress-dot').eq(stageI).addClass('is-complete');
        }

      });

      //buttons
      //console.log(this._stageIndex, this._stageViewedIndex, this._stepIndex, this._stepViewedIndex);

      if(this._stepIndex === 0) {
        this.$('.js-prev-stage').a11y_cntrl_enabled(false);
      } else {
        this.$('.js-prev-stage').a11y_cntrl_enabled(true);
      }

      if(this._stepIndex < this._stepViewedIndex && this._stepIndex < this.model.get('_items').length) {
        this.$('.js-next-stage').a11y_cntrl_enabled(true);
      }else {
        this.$('.js-next-stage').a11y_cntrl_enabled(false);
      }

      if(this._stepIndex <= this._stepCompletedIndex) {
        this.$('.js-next-stage').a11y_cntrl_enabled(true);
      }

    },

    enableNext: function() {
      this.$('.js-next-stage').a11y_cntrl_enabled(true);
    }

  },
  {
    template: 'interactiveVideo'
  });

  return Adapt.register('interactiveVideo', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: InteractiveVideoView
  });
});
