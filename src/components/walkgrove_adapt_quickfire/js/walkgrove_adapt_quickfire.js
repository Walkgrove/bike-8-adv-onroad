define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var QuickFireView = ComponentView.extend({

    events: {
      'click .js-option1-click': 'onAnswerClickedFirst',
      'click .js-option2-click': 'onAnswerClickedSecond',
      'click .js-retry-click': 'onRetryClicked',
      'click .js-show-correct-click': 'onShowCorrectAnswers',
      'click .js-close-corrects-click': 'onCloseCorrectAnswers'
    },

    _attempts: 1,
    _attemptsTaken: 0,
    _questionsTotal: 0,
    _questionIndex: -1,
    _correct: 0,
    _incorrect: 0,
    
    preRender: function() {
      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setReadyStatus();

      this._questionsTotal = this.model.get('_items').length;
      this._attempts = this.model.get('_attempts');

      this.model.get('_items').forEach((item, index) => {
        const thisID = this.model.get('_id');
        const $el = document.getElementById('quickfire-ques-number-' + thisID + '-' + index);
        $($el).html(index + 1);
      });

      this.showNextQuestion();
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    showNextQuestion() {
      if(this._questionIndex >= 0) {
        this.$('.quickfire__question-container').eq(this._questionIndex).removeClass('is-visible');
      }
      this._questionIndex++;
      this.$('.quickfire__question-container').eq(this._questionIndex).addClass('is-visible');

      // const thisID = this.model.get('_id');
      // const $el = document.getElementById('quickfire-ques-number-' + thisID + '-' + this._questionIndex);
      // $el.a11y_focus();
      this.$('.quickfire__question-title').eq(this._questionIndex).a11y_focus();
      
      //audio?
      if (Adapt.config.get('_sound')._isActive === true) {
        if(this._questionIndex > 0) {
          this.model.get('_items').forEach((item, i) => {
            if (i === this._questionIndex) {
              if (item._audio) {
                Adapt.trigger('audio:partial', {src: item._audio._src, transcript: item._audio.transcript});
              }
            }
          });
        }
      }
    },

    onAnswerClickedFirst: function () {
      this.answerClicked(1);
    },

    onAnswerClickedSecond: function() {
      this.answerClicked(2);
    },

    answerClicked: function(optionIndex) {

      let answer = 0;
      const qNum = this._questionIndex;
      
      this.model.get('_items').forEach(function(item, index) {
        if(index === qNum) {
          answer = Number(item._correct);
        }
      });
      
      const thisID = this.model.get('_id');
      const $el = document.getElementById('quickfire-dot-' + thisID + '-' + this._questionIndex);
      if(answer === optionIndex) {
        this._correct++;
        $($el).addClass('correct');
      } else {
        this._incorrect++;
        $($el).addClass('incorrect');
      }

      if(this._questionIndex < this._questionsTotal-1) {
        this.showNextQuestion();
      } else {
        this.$('.quickfire__question-container').eq(this._questionIndex).removeClass('is-visible');
        this.onEndQuiz();
      }

    },

    onEndQuiz: function() {

      this._attemptsTaken++;
      
      if (Adapt.config.get('_sound')._isActive === true) {
        Adapt.trigger('audio:stop');
      }

      this.model.get('_items').forEach(function(item, index) {
        this.$('.quickfire__question-container').eq(index).removeClass('is-visible');
      });

      let content = "";
      const percent = Math.round((100/this._questionsTotal) * this._correct);
      if(percent >= this.model.get('_passPercent')){
        // pass
        content = this.model.get('_feedback').pass;
        
        //audio?
        if (Adapt.config.get('_sound')._isActive === true) {
          if (this.model.get('_feedback')._audio && this.model.get('_feedback')._audio._pass_src) {
            Adapt.trigger('audio:partial', {src: this.model.get('_feedback')._audio._pass_src, transcript: this.model.get('_feedback')._audio.transcript});
          }
        }
        this.setCompletionStatus();
      } else {
        if(this._attemptsTaken === this._attempts) {
          content = this.model.get('_feedback').fail;
          this.$('.quickfire__feedback-buttons').removeClass('is-visible');
          this.setCompletionStatus();

          this.$('.quickfire__feedback-complete-buttons').addClass('is-visible');

          //audio?
          if (Adapt.config.get('_sound')._isActive === true) {
            if ( this.model.get('_feedback')._audio && this.model.get('_feedback')._audio._fail_src) {
              Adapt.trigger('audio:partial', {src: this.model.get('_feedback')._audio._fail_src, transcript: this.model.get('_feedback')._audio.transcript});
            }
          }
        } else {
          content = this.model.get('_feedback').partialFail;
          this.$('.quickfire__feedback-buttons').addClass('is-visible');

          //audio?
          if (Adapt.config.get('_sound')._isActive === true) {
            if (this.model.get('_feedback')._audio && this.model.get('_feedback')._audio._partialFail_src) {
              Adapt.trigger('audio:partial', {src: this.model.get('_feedback')._audio._partialFail_src, transcript: this.model.get('_feedback')._audio.transcript});
            }
          }
        }
      }
      content = content.replace('{0}','' + percent + '');
      this.$('.quickfire__feedback').html(content);

      this.$('.quickfire__feedbacks').addClass('is-visible');
      this.$('.quickfire__feedback-container').addClass('is-visible');

      _.delay(function() {
        this.$('.quickfire__feedback-title').a11y_focus();
      }, 100);
    },

    onShowCorrectAnswers: function() {
      this.$('.quickfire__feedback-container-corrects').addClass('is-visible');

      this.model.get('_items').forEach((item, index) => {

        const thisID = this.model.get('_id');
        const $el = document.getElementById('quickfire-correct-title-' + thisID + '-' + index);
        $($el).html(index + 1);

        const cAns = Number(item._correct);
        let corAns = item._options.option1;
        if(cAns === 2) {
          corAns = item._options.option2;
        }

        const $el2 = document.getElementById('quickfire-correct-answer-' + thisID + '-' + index);
        $($el2).html(corAns);
      });
    },

    onCloseCorrectAnswers: function() {
      this.$('.quickfire__feedback-container-corrects').removeClass('is-visible');
    },

    onRetryClicked: function(){
      this._questionIndex = -1;
      this._correct = 0;
      this._incorrect = 0;

      this.$('.quickfire__feedbacks').removeClass('is-visible');
      this.$('.quickfire__feedback-container').removeClass('is-visible');
      this.$('.quickfire__feedback-buttons').removeClass('is-visible');

      this.model.get('_items').forEach((item, index) => {
        const thisID = this.model.get('_id');
        const $el = document.getElementById('quickfire-dot-' + thisID + '-' + index);
        $($el).removeClass('correct');
        $($el).removeClass('incorrect');
      });

      if (Adapt.config.get('_sound')._isActive === true) {
        this.model.get('_items').forEach((item, i) => {
          if (i === 0) {
            if (item._audio) {
              Adapt.trigger('audio:partial', {src: item._audio._src, transcript: item._audio.transcript});
            }
          }
        });
      }

      this.showNextQuestion();

    }


  },
  {
    template: 'quickfire'
  });

  return Adapt.register('quickfire', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: QuickFireView
  });
});
