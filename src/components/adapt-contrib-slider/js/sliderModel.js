define([
  'core/js/adapt',
  'core/js/models/questionModel'
], function(Adapt, QuestionModel) {

  var SliderModel = QuestionModel.extend({

    init:function() {
      QuestionModel.prototype.init.call(this);

      this.setupModelItems();

      this.set('_selectedItem', this.get('_items')[0]);
    },

    /**
     * Returns the number of decimal places in a specified number
     */
    getDecimalPlaces: function(num) {
      return (num.toString().split('.')[1] || []).length;
    },

    setupModelItems: function() {
      var items = [];
      var answer = this.get('_correctAnswer');
      var range = this.get('_correctRange');
      var start = this.get('_scaleStart');
      var end = this.get('_scaleEnd');
      var step = this.get('_scaleStep') || 1;

      var dp = this.getDecimalPlaces(step);

      for (var i = start; i <= end; i += step) {
        if (dp !== 0) {
          // Ensure that steps with decimal places are handled correctly.
          i = parseFloat(i.toFixed(dp));
        }

        items.push({
          value: i,
          selected: false,
          // _correctAnswer/answer is a String - this allows AAT users to assign it no value when _correctRange needs to be used instead
          // we therefore need to convert it to Number when checking the answer (see https://github.com/adaptlearning/adapt_framework/issues/2259)
          correct : answer ? i === Number(answer) : (i >= range._bottom && i <= range._top)
        });
      }

      this.set({
        '_items': items,
        '_marginDir': Adapt.config.get('_defaultDirection') === 'rtl' ? 'right' : 'left'
      });
    },

    /**
    * allow the user to submit immediately; the slider handle may already be in the position they want to choose
    */
    canSubmit: function() {
      return true;
    },

    restoreUserAnswers: function() {
      if (!this.get('_isSubmitted')) {
        this.set({
          _selectedItem: {},
          _userAnswer: undefined
        });
        return;
      }

      var items = this.get('_items');
      var userAnswer = this.get('_userAnswer');
      for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];
        if (item.value === userAnswer) {
          item.selected = true;
          this.set('_selectedItem', item);
          break;
        }
      }

      this.setQuestionAsSubmitted();
      this.markQuestion();
      this.setupFeedback();
    },

    //This preserves the state of the users answers for returning or showing the users answer
    storeUserAnswer: function() {
      this.set('_userAnswer', this.get('_selectedItem').value);
      this.setScore();
      //console.log('>>>>>>>>>>>>>>>>>>>', 'storeUserAnswer');
    },

    resetUserAnswer: function() {
      this.set({
        _isAtLeastOneCorrectSelection: false,
        _selectedItem: {},
        _userAnswer: undefined
      });
    },

    deselectAllItems: function() {
      _.each(this.get('_items'), function(item) {
        item.selected = false;
      }, this);
    },

    isCorrect: function() {
      var numberOfCorrectAnswers = 0;

      _.each(this.get('_items'), function(item, index) {
        if (item.selected && item.correct) {
          this.set('_isAtLeastOneCorrectSelection', true);
          numberOfCorrectAnswers++;
        }
      }, this);

      this.set('_numberOfCorrectAnswers', numberOfCorrectAnswers);

      return this.get('_isAtLeastOneCorrectSelection') ? true : false;
    },

    isPartlyCorrect: function() {
      return this.get('_isAtLeastOneCorrectSelection');
    },

    // Used to set the score based upon the _questionWeight
    setScore: function() {
      var numberOfCorrectAnswers = this.get('_numberOfCorrectAnswers');
      var questionWeight = this.get('_questionWeight');
      var score = questionWeight * numberOfCorrectAnswers;
      this.set('_score', score);

      // CHECK IF ON LXP
      if(Adapt.course.get('_isLXP') === true) {

        // IF SO, save to reflection data
        let reflectionData = Adapt.offlineStorage.get('reflection_data');
        let dataFound = true;
        let activityFound = false;
        const activityID = this.get('_id');
        if (reflectionData === 'undefined' || reflectionData === null || reflectionData === "") {
          dataFound = false;
          reflectionData = "";
        }
        if(dataFound === true) {
          const reflectActivities = reflectionData.split("$$");  
          for(let a=0; a<reflectActivities.length-1; a++) {
            const reflects = reflectActivities[a].split("$");
            for(let r=0; r<reflects.length; r++){
              let reflect = reflects[r].split("^");
              if(r === 0) {
                if(reflect[0] === activityID) {
                  activityFound = true;
                }
              }
            }
          }
        }
        if(!activityFound) {
          reflectionData += "" + activityID + "^ ^ $0^slider^" + this.get('number') + "^" + this.get('value') + "^" + this.get('_userAnswer') + "$$"; 
          Adapt.offlineStorage.set('r', reflectionData);
        }

        //is it a compare slider?
        let sliderNum = this.get('number') - 1;
        let sliderVal;
        if(this.get('compare')) {
          //GET 'compare' from reflection data ...
          if(dataFound === true) {
            const reflectActivities = reflectionData.split("$$");  
            for(let a=0; a<reflectActivities.length-1; a++) {
              const reflects = reflectActivities[a].split("$");
              for(let r=0; r<reflects.length; r++){
                let reflect = reflects[r].split("^");
                if(Number(reflect[2]) === this.get('number') && reflect[3] === this.get('compare')) {
                  sliderVal = Number(reflect[4]);
                }
              }
            }
          }

          document.querySelectorAll(".slider").forEach((c, i) => {
            if(i === sliderNum) {
              c.querySelectorAll(".slider__number").forEach((n, nIndex) => {
                if(nIndex === sliderVal-1) {
                  n.classList.add('previous');
                }
              });
            }
          });

        }

      } else {

        // IF NOT, save to LMS - set/compare slider values
        const sliderNum = this.get('number')-1;
        if(this.get('value')) {
          //GET the 'value' array values from SCORM
          let arrayValues = Adapt.offlineStorage.get('' + this.get('value') + '').split(",").map(Number);
          if(arrayValues === null || arrayValues === 'undefined' || arrayValues === undefined){
            arrayValues = [0,0,0];
          } 

          //SET the array posiiton with user selection 
          arrayValues[sliderNum] = Number(this.get('_userAnswer'));
          //SET the SCORM value with updated var
          const newArray = Adapt.offlineStorage.set('' + this.get('value') + '', arrayValues);
        }
        
        //is it a compare slider?
        if(this.get('compare')) {
          //GET 'compare' array values from SCORM
          const arrayCompare = Adapt.offlineStorage.get('' + this.get('compare') + '').split(",").map(Number);
          //FIND the relevant slider data
          let sliderVal = Number(arrayCompare[sliderNum]);

          document.querySelectorAll(".slider").forEach((c, i) => {
            if(i === sliderNum) {
              c.querySelectorAll(".slider__number").forEach((n, nIndex) => {
                if(nIndex === sliderVal-1) {
                  n.classList.add('previous');
                }
              });
            }
          });
          
          //console.log(sliderVal);
          
        }

      }
    },

    /**
    * Used by adapt-contrib-spoor to get the user's answers in the format required by the cmi.interactions.n.student_response data field
    */
    getResponse:function() {
      return this.get('_userAnswer').toString();
    },

    /**
    * Used by adapt-contrib-spoor to get the type of this question in the format required by the cmi.interactions.n.type data field
    */
    getResponseType:function() {
      return "numeric";
    }

  });

  return SliderModel;

});
