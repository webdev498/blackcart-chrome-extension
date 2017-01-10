(function() {
  'use strict';
  var Blackcart = window.Blackcart;
  // var globals = Blackcart.globals;
  var utils = Blackcart.utils;
  var config = window.BLACKCART_CONFIG;
  // var collections = Blackcart.collections;
  var Confirm = utils.createCustomViewClass().extend({
    tagName: 'div',
    templateURL: 'scripts/templates/confirm.html',
    cssURL: 'styles/chromestyle.css',
    events: {
      click: 'onClick',
      'submitSuccess': 'onSubmitDone',
      'submitFailure': 'onSubmitDone'
    },
    initialize: function(opts) {
      var self = this;
      var tpl;
      // var $loadingEl;
      this.user = opts.user;
      this.order = opts.order;
      this.$parentEl = opts.$parentEl;
      // load the main template
      tpl = this.loadTemplateFromURL(this.templateURL);
      if (_.isString(tpl)) {
        this.template = _.template(tpl);
        this.render().hide();
      } else {
        // multiple dependencies so we  wait until they've all resolved
        $.when(tpl, this.getUserInfo()).then(function(resp) {
          self.template = _.template(resp[0]);
          self.render().hide();
        }, function(e) {
          self.log('error', e);
        });
        /*tpl.done(function(resp) {
          self.template = _.template(resp);
          
        }).fail(function(e) {
          self.log('error', e);
        });*/
      }

      // this.getUserInfo();
      this.order.on('add change remove cart-update', function() {
        self.render();
      });

      $.validate({
        html: true,
        addValidClassOnAll: true,
        validateOnBlur: false,
        showHelpOnFocus: false,
        addSuggestions: false
      });

      $.formUtils.addValidator({
        name: 'stripe_cc',
        validatorFunction: function(value) {
          return $.payment.validateCardNumber(value);
        },
        errorMessage: 'Please enter a valid credit card number.',
        errorMessageKey: 'badCreditCardNumber'
      });
    },

    render: function() {
      var el = this.$el.get(0);
      var shadow;
      if (!el.shadowRoot) {
        shadow = el.createShadowRoot();
      } else {
        shadow = el.shadowRoot;
      }
      if (!this.cssLoaded) {
        shadow.innerHTML = this.loadVendorCSS() + this.loadCSSFromURL('styles/chromestyle.css') + this.template({
          chromeURL: function(url) {
            return chrome.extension.getURL(url);
          },
          order: this.order,
          userInfo: this.userInfo || {}
        });
        this.cssLoaded = true;
      } else {
        shadow.removeChild(shadow.querySelector('.chrome-widget'));
        shadow.appendChild($(this.template({
          chromeURL: function(url) {
            return chrome.extension.getURL(url);
          },
          order: this.order,
          userInfo: this.userInfo || {}
        })).get(0));
      }
      return this;
    },

    show: function() {
      this.$el.removeClass('hidden');
    },

    hide: function() {
      this.$el.addClass('hidden');
    },

    showLoader: function() {
      var $loader = $(this.getShadowElement('.confirm-spinner')[0]);
      $loader.removeClass('hidden');
      return this;
    },

    hideLoader: function() {
      var $loader = $(this.getShadowElement('.confirm-spinner')[0]);
      $loader.addClass('hidden');
      return this;
    },

    onClick: function(e) {
      var evt = e.originalEvent;
      var path = evt.path;
      var $src = $(path[0]);
      var $form;
      var formData;
      var self = this;
      var editShipping;
      var editPayment;
      if (!$src.length) {
        return true;
      }
      if ($src.attr('id') === 'edit-shipping-information') {
        e.preventDefault();
        if (!$src.hasClass('disabled')) {
          this.showShippingInfoForm();
        }
      } else if ($src.attr('id') === 'edit-payment-information' ||
        $src.attr('id') === 'add-payment-information') {
        e.preventDefault();
        if (!$src.hasClass('disabled')) {
          this.showPaymentInfoForm();
        }
      } else if ($src.attr('id') === 'save-shipping-info') {
        e.preventDefault();
        if (!$src.hasClass('disabled')) {
          editShipping = $(this.getShadowElement('#edit-shipping-information')[0]);
          $form = $(this.getShadowElement('#user-shipping-info-form')[0]);
          if (!$form.isValid(null, null, true)) {
            return true;
          }
          formData = $(this.getShadowElement('#user-shipping-info-form')[0]).serializeArray();
          formData = _.reduce(formData, function(prev, curr) {
            prev[curr.name] = curr.value;
            return prev;
          }, {
            uid: this.user.UID
          });
          this.showLoader()
            .disableButtons();
          this.rest({
            method: 'POST',
            endpoint: config.server.endPoints.saveShippingInfo,
            data: formData
          }).done(function(resp) {
            var userInfo = self.userInfo;
            userInfo = $.extend(userInfo, resp);
            self.renderShippingInfo();
            self.hideShippingInfoForm();
          }).fail(function(e) {
            self.log('error', e);
          }).always(function() {
            self.hideLoader()
              .enableButtons();
          });
        }
      } else if ($src.attr('id') === 'cancel-shipping-info') {
        e.preventDefault();
        if (!$src.hasClass('disabled')) {
          this.enableButtons();
          this.hideShippingInfoForm();
        }
      } else if ($src.attr('id') === 'save-payment-info') {
        e.preventDefault();
        if (!$src.hasClass('disabled')) {
          editPayment = $(this.getShadowElement('#edit-payment-information')[0]);
          $form = $(this.getShadowElement('#user-payment-info-form')[0]);
          if (!$form.isValid()) {
            return true;
          }
          formData = $(this.getShadowElement('#user-payment-info-form')[0]).serializeArray();
          
          formData = _.reduce(formData, function(prev, curr) {
            prev[curr.name] = curr.value;
            return prev;
          }, {
            uid: this.user.UID
          });
          if(formData.CustExDateY.length === 2){
            formData.CustExDateY = 20 + formData.CustExDateY;
          }
          this.showLoader()
            .disableButtons();
          this.rest({
            method: 'POST',
            endpoint: config.server.endPoints.savePaymentInfo,
            data: formData
          }).done(function(resp) {
            var userInfo = self.userInfo;
            userInfo = $.extend(userInfo, resp);
            self.renderPaymentInfo();
            self.hidePaymentInfoForm();
          }).fail(function(e) {
            $form
              .removeClass('has-success')
              .addClass('has-error')
              .find('.help-block.form-error')
              .remove();
            $('<span></span>')
              .addClass('help-block form-error')
              .text('There was an error processing this card.')
              .appendTo($form);
            self.log('error', e);
          }).always(function() {
            self.hideLoader()
              .enableButtons();
          });
        }
      } else if ($src.attr('id') === 'cancel-payment-info') {
        e.preventDefault();
        if (!$src.hasClass('disabled')) {
          this.enableButtons();
          this.hidePaymentInfoForm();
        }
      } else if ($src.attr('id') === 'a1') {
        if (!$src.hasClass('disabled')) {
          this.$parentEl.trigger('blackcart.confirm.back');
        }
        e.preventDefault();
      } else if ($src.attr('id') === 'a2') {
        if (!$src.hasClass('disabled')) {
          this.disableButtons();
          this.$parentEl.trigger('blackcart.confirm.checkout');
        }
        e.preventDefault();
      } else if ($src.attr('id') === 'minimize-cart') {
        e.preventDefault();
        this.$parentEl.trigger('blackcart.minimize');
      } else if ($src.attr('id') === 'blackcart-check-cc') {
        e.preventDefault();
        self.getUserInfo().done(function() {
          self.render();
        });
      }
    },

    onSubmitDone: function() {
      return this.enableButtons();
    },

    getUserInfo: function() {
      var uid = this.user.UID;
      var self = this;
      return this.rest({
        endpoint: 'user/' + uid + '/info',
        method: 'GET'
      }).done(function(resp) {
        self.userInfo = resp;
      }).fail(function(e) {
        self.log('error', e);
      });
    },

    disableButtons: function() {
      var btns = [].slice.call(this.getShadowElement('.buttons'));
      var saveBtns = [].slice.call(this.getShadowElement('.btn-save-info'));
      var cancelBtns = [].slice.call(this.getShadowElement('.btn-cancel-info'));

      btns = btns.concat(saveBtns, cancelBtns);
      if (btns.length) {
        $.each(btns, function() {
          var $child = $(this);
          if ($child.hasClass('no-cc')) {
            return true;
          }
          $child.addClass('disabled');
        });
      }
      return this;
    },

    enableButtons: function() {
      var btns = [].slice.call(this.getShadowElement('.buttons'));
      var saveBtns = [].slice.call(this.getShadowElement('.btn-save-info'));
      var cancelBtns = [].slice.call(this.getShadowElement('.btn-cancel-info'));

      btns = btns.concat(saveBtns, cancelBtns);
      if (btns.length) {
        $.each(btns, function() {
          var $child = $(this);
          if ($child.hasClass('no-cc')) {
            return true;
          }
          $child.removeClass('disabled');
        });
      }
      return this;
    },

    showShippingInfoForm: function() {
      var $shippingInfoForm = $(this.getShadowElement('#user-shipping-info-form')[0]);
      var userInfo = this.userInfo;
      $(this.getShadowElement('#edit-shipping-information')[0]).addClass('hidden');
      $(this.getShadowElement('.user-shipping-info')[0]).addClass('hidden');
      $(this.getShadowElement('.user-shipping-info-edit')[0]).removeClass('hidden');
      $shippingInfoForm.find('input').each(function() {
        var $field = $(this);
        var binding = $field.attr('data-bind');
        if (binding && userInfo[binding]) {
          $field.val(userInfo[binding]);
        } else {
          $field.val('');
        }
      });
      return this;
    },

    hideShippingInfoForm: function() {
      $(this.getShadowElement('#edit-shipping-information')[0]).removeClass('hidden');
      $(this.getShadowElement('.user-shipping-info')[0]).removeClass('hidden');
      $(this.getShadowElement('.user-shipping-info-edit')[0]).addClass('hidden');
      return this;
    },

    showPaymentInfoForm: function() {
      var custCdNode;
      var $paymentInfoForm = $(this.getShadowElement('#user-payment-info-form')[0]);
      var userInfo = this.userInfo;
      $(this.getShadowElement('#edit-payment-information')[0]).addClass('hidden');
      $(this.getShadowElement('.payment-info-wrapper')[0]).addClass('hidden');
      custCdNode = this.getShadowElement('.payment-custcd')[0];
      if (custCdNode) {
        $(custCdNode).addClass('hidden');
      }
      $(this.getShadowElement('.user-payment-info-edit')[0]).removeClass('hidden');
      $paymentInfoForm.find('input').each(function() {
        var $field = $(this);
        var binding = $field.attr('data-bind');
        if (binding && userInfo[binding]) {
          $field.val(userInfo[binding]);
        } else {
          $field.val('');
        }
      });
      return this;
    },

    hidePaymentInfoForm: function() {
      var custCdNode;
      $(this.getShadowElement('#edit-payment-information')[0]).removeClass('hidden');
      $(this.getShadowElement('.payment-info-wrapper')[0]).removeClass('hidden');
      custCdNode = this.getShadowElement('.payment-custcd')[0];
      if (custCdNode) {
        $(custCdNode).removeClass('hidden');
      }
      $(this.getShadowElement('.user-payment-info-edit')[0]).addClass('hidden');
      return this;
    },

    renderShippingInfo: function() {
      var $shippingInfo = $(this.getShadowElement('.user-shipping-info')[0]);
      var userInfo = this.userInfo;
      $shippingInfo.find('span').each(function() {
        var $span = $(this);
        var fields = $span.attr('data-fields');
        if (fields) {
          $span.text(_.reduce(fields.split(' '), function(memo, field) {
            if (userInfo[field]) {
              memo = memo + ' ' + userInfo[field];
            }
            return memo;
          }, ''));
        }
      });
    },

    renderPaymentInfo: function() {
      var $paymentInfo = $(this.getShadowElement('.payment-custcd')[0]);
      var $submitBtn;
      if (!$paymentInfo.length) {
        $paymentInfo = this._addPaymentInfo();
      }
      if (this.userInfo.CustCD) {
        $submitBtn = $(this.getShadowElement('#a2')[0]);
        $paymentInfo.text(this.userInfo.CustCD ? 'Credit Card: xxxx xxxx xxxx ' + this.userInfo.CustCD : '');
        $submitBtn.removeClass('disabled no-cc');
      }
    },

    _addPaymentInfo: function() {
      var $paymentInfoContainer = $(this.getShadowElement('.payment-info-container')[0]);
      $paymentInfoContainer.find('h3').removeAttr('style');
      $paymentInfoContainer
        .find('i')
        .removeClass('fa-times-circle')
        .addClass('fa-check-circle')
        .removeAttr('style');
      $paymentInfoContainer.find('.payment-info-wrapper').remove();
      $('<a href="#" target="_blank" id="edit-payment-information">edit</a>')
        .insertAfter($paymentInfoContainer.find('h3'));
      $('<span class="span payment-custcd"></span>').insertAfter($paymentInfoContainer);
      return $paymentInfoContainer.next();
    }
  });

  window.Blackcart.views.Confirm = Confirm;
}());