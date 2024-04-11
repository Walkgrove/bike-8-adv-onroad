define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var ChallengeView = ComponentView.extend({

    events: {
      'click .js-challenge-start-click': 'onStartClicked',
      'click .js-challenge-first-click': 'onFirstClicked',
      'click .js-challenge-second-click': 'onSecondClicked',
      'click .js-challenge-third-click': 'onThirdClicked',
      'click .js-challenge-restart-click': 'onRestartClicked'
    },

    _questionIndex: 0,
    _questionsTotal: 0,
    _corrects: 0,
    _incorrects: 0,
    _nextTimer: null,
    _nextTimeout: null,
    _timer: 0,
    _timeouts: [],
    
    preRender: function() {
      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setReadyStatus();

      this._questionsTotal = this.model.get('_items').length;
      if(this.model.get('_simple') === true) {
        this._questionIndex = 0;
      } else {
        this._questionIndex = this._questionsTotal - 1;
      }
      
      if(this.model.get('_simple') === false) {
        this._timer = this.model.get('_timeout') * 1000;
        this._nextTimer = this.model.get('_timer') * 1000;

        let timeVars = new Array();
        this.model.get('_items').forEach((item, index) => {
          let timeVar = null;
          timeVars.push(timeVar);
        });

        this._timeouts = timeVars;
      }

      this.$('.challenge__instruction-inner').a11y_focus();

      if(this.model.get('_random') === true) {
        //randomise items
        var options = this.$(".challenge__item");
        for(var i = 0; i < options.length; i++){
            var target = Math.floor(Math.random() * options.length -1) + 1;
            var target2 = Math.floor(Math.random() * options.length -1) +1;
            options.eq(target).before(options.eq(target2));
        }
      }
    },

    checkIfResetOnRevisit: function() {
      // var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      // if (isResetOnRevisit) {
        this.model.reset(true);
      // }
    },

    onStartClicked: function() {
      this.$('.challenge__main').addClass('is-visible');
      this.$('.challenge__button').removeClass('is-visible');

      this.$('.challenge__instruction-inner').html(this.model.get('ins2'));
      
      //if (Adapt.device.screenSize !== 'small') {
        //Adapt.scrollTo(this.$('.challenge__body-inner'), { duration: 400 });
        //this.$('.challenge__body-inner').a11y_focus();
      //}else{
        //Adapt.scrollTo(this.$('.challenge__feedbacks'), { duration: 400 });
        this.$('.challenge__instruction-inner').a11y_focus();
      //}

      if(this.model.get('_simple') === false) {
        setTimeout(this.showNextQuestion(), this._nextTimer);
      }
      setTimeout(() => {this.nextAction()}, 1000);
    },

    onFirstClicked: function (event) {
      this.answerClicked(1, this.onGetQuestionNumber(event));
    },

    onSecondClicked: function(event) {
      this.answerClicked(2, this.onGetQuestionNumber(event));
    },

    onThirdClicked: function(event) {
      this.answerClicked(3, this.onGetQuestionNumber(event));
    },

    onGetQuestionNumber: function(event) {
      var $target = this.$(event.currentTarget);
      $target.addClass('is-answered'); //option selected
      
        $target.parent().addClass('is-answered'); 
        $target.siblings().addClass('is-not-answered');

        $target.prop('disabled', true);
        $target.siblings().prop('disabled', true);
      
      return $target.attr('data-qnum');
    },

    answerClicked: function(optionIndex, qNum) {

      let answer = 0;

      if(this.model.get('_simple') === false) {
        clearTimeout(this._timeouts[qNum]);
      }

      this._timeouts[qNum] = null;

      qNum = Number(qNum);
      
      this.model.get('_items').forEach(function(item, index) {
        if(index === qNum) {
          answer = item._answer;
        }
      });
      
      if(this.model.get('_simple') === true) {
        $el = this.$('[data-fback-index="' + qNum  + '"]');
        console.log($el, answer, optionIndex);
        if(answer === optionIndex) {
          this._corrects++;
          this.$($el).addClass('is-correct');
        } else {
          this._incorrects++;
          this.$($el).addClass('is-incorrect');
        }
      } else {
        if(answer === optionIndex) {
          this._corrects++;
          this.$('.challenge__item-feedback').eq(qNum).addClass('is-correct');
        } else {
          this._incorrects++;
          this.$('.challenge__item-feedback').eq(qNum).addClass('is-incorrect');
        }
      }

      this.$('.challenge__item-content').eq(qNum).addClass('is-hidden');

      if(this.model.get('_simple') === false) {
        clearTimeout(this._nextTimeout);
      }

      this.checkEnd();
      this.nextAction();

    },

    timedOut: function() {

      let findFirstTimeout = -1;
      this._timeouts.forEach((timeout, index) => {
        if(timeout !== null) {
          findFirstTimeout = index;
        }
      });

      this._timeouts[findFirstTimeout] = null;

      this.$('.challenge__item-' + this.model.get('_id')+'').eq(findFirstTimeout).find('.challenge__item-buttons').addClass('is-answered');

      this.$('.challenge__item-content').eq(findFirstTimeout).addClass('is-hidden');

        
      this._incorrects++;
      this.$('.challenge__item-feedback').eq(findFirstTimeout).addClass('is-incorrect');
      this.$('.challenge__item-' + this.model.get('_id')+'').eq(findFirstTimeout).addClass('is-timedout');
      this.$('.challenge__item-buttons').eq(findFirstTimeout).children().prop('disabled', true);
    

      this.checkEnd();

    },

    nextAction: function() {
      if(this.model.get('_simple') === true) {
        if(this._questionIndex <= this._questionsTotal-1) {
          this.showNextQuestion();
        }
      } else {
        if(this._questionIndex >= 0) {
          this.showNextQuestion();
        }
      }
    },

    showNextQuestion: function() {
      if(this._nextTimeout !== null) {
        clearTimeout(this._nextTimeout);
      }
      this.$('.challenge__item-' + this.model.get('_id')+'').eq(this._questionIndex).addClass('is-active');
      if(this.model.get('_simple') === true) {
        this._questionIndex++;
      } else {
        this._timeouts[this._questionIndex] = setTimeout(() => {this.timedOut()}, this._timer);
        this._questionIndex--;
      }

      // this.$('.challenge__item-' + this.model.get('_id')+'').eq(this._questionIndex).a11y_focus();

      if(this.model.get('_simple') === false) {
        this._nextTimeout = setTimeout(() => {this.nextAction()}, this._nextTimer);
      }
    },

    checkEnd: function() {
      const answered = this._incorrects + this._corrects;
      if (answered === this._questionsTotal) {
        this.onEndQuiz();
      }
    },

    onEndQuiz: function () {
      //show all feedbacks (even if timed out)
      this.model.get('_items').forEach((item, index) => {
        this.$('.challenge__item-' + this.model.get('_id')+'').eq(index).addClass('is-visible');
      });
      //show relevant feedback
      let fbackNum = -1;
      let fbackText = "";
      this.model.get('_feedbacks').forEach((fback, index) => {
        if (this._corrects >= fback._score) {
          fbackNum = index;
          fbackText = fback.content;
        }
      });

      // if(this.model.get('_simple') === true) {
        //check if need to add score
        let elem = this.$('.challenge__feedback').eq(fbackNum);
        elem.html(fbackText);
        elem.text(elem.text().replace("{0}", "" + this._corrects + ""));
        elem.text(elem.text().replace("{1}", "" + this.model.get('_items').length + ""));
      // }

      this.$('.challenge__feedback').eq(fbackNum).addClass('is-answered');
      this.$('.challenge__feedback').eq(fbackNum).a11y_focus();

      if (this._corrects < this._passTotal) {
        this.$('.challenge__button-restart').addClass('is-visible');
      } else {
        this.setCompletionStatus();
        this.$('.challenge__instruction-inner').html(this.model.get('ins3'));
      }

      

      if(this.model.get('_simple') === false) {
        // Adapt.scrollTo(this.$('.challenge__feedbacks'), { duration: 400 });
      }
      
    },

    onRestartClicked: function () {
      if(this.model.get('_simple') === true) {
        this._questionIndex = 0;
      } else {
        this._questionIndex = this._questionsTotal - 1;
      }
      this.$('.challenge__instruction-inner').a11y_focus();
      this._corrects = 0;
      this._incorrects = 0;
      this._nextTimeout = null;

      if(this.model.get('_simple') === false) {
        this._timer = this.model.get('_timeout') * 1000;
        this._nextTimer = this.model.get('_timer') * 1000;
 
        let timeVars = new Array();
      }

      this.model.get('_items').forEach((item, index) => {
        if(this.model.get('_simple') === false) {
          let timeVar = null;
          timeVars.push(timeVar);
        }
        
        this.$('.challenge__item-feedback').eq(index).removeClass('is-incorrect');
        this.$('.challenge__item-feedback').eq(index).removeClass('is-correct');
        this.$('.challenge__item-feedback').eq(index).removeClass('is-answered');

        this.$('.challenge__item-' + this.model.get('_id')+'').eq(index).removeClass('is-timedout');
        this.$('.challenge__item-' + this.model.get('_id')+'').eq(index).removeClass('is-active');
        this.$('.challenge__item-' + this.model.get('_id')+'').eq(index).removeClass('is-visible');
        this.$('.challenge__item-' + this.model.get('_id')+'').eq(index).find('.challenge__item-buttons').removeClass('is-answered');

      });

      if(this.model.get('_simple') === false) {
        this._timeouts = timeVars;
      }

      this.$('.challenge__instruction-inner').a11y_focus();

      if(this.model.get('_random') === true) {
        //randomise items
        var options = this.$(".challenge__item");
        for(var i = 0; i < options.length; i++){
            var target = Math.floor(Math.random() * options.length -1) + 1;
            var target2 = Math.floor(Math.random() * options.length -1) +1;
            options.eq(target).before(options.eq(target2));
        }
      }

      this.$('.js-challenge-first-click').prop('disabled', false);
      this.$('.js-challenge-second-click').prop('disabled', false);
      this.$('.js-challenge-third-click').prop('disabled', false);
      this.$('.js-challenge-first-click').removeClass('is-answered');
      this.$('.js-challenge-second-click').removeClass('is-answered');
      this.$('.js-challenge-third-click').removeClass('is-answered');
      this.$('.js-challenge-first-click').removeClass('is-not-answered');
      this.$('.js-challenge-second-click').removeClass('is-not-answered');
      this.$('.js-challenge-third-click').removeClass('is-not-answered');

      this.$('.challenge__feedback').removeClass('is-answered');
      this.$('.challenge__item-content').removeClass('is-hidden');

      this.$('.challenge__button-restart').removeClass('is-visible');

      this.onStartClicked();

    }

  },
  {
    template: 'challenge'
  });

  return Adapt.register('challenge', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: ChallengeView
  });
});
