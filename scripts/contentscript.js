/*
 * @module main contentscript
 */
(function() {
  'use strict';
  var Blackcart = window.Blackcart;
  // var globals = Blackcart.globals;
  var utils = Blackcart.utils;
  var CustomHandlers = Blackcart.CustomHandlers;
  var ButtonView = Blackcart.views.ButtonView;
  var URLRegex = /http\:\/\/|https\:\/\/|www\./ig;
  var config = window.BLACKCART_CONFIG;
  var isBlackcartActive = false;

  // collections
  var collections = Blackcart.collections;

  // views
  var LoadingView = Blackcart.views.LoadingView;
  var Icon = Blackcart.views.Icon;
  var Cart = Blackcart.views.Cart;
  var Confirm = Blackcart.views.Confirm;
  var Success = Blackcart.views.Success;
  var RetailersView = Blackcart.views.RetailersView;
  var Walkthrough_1View = Blackcart.views.Walkthrough_1View;
  var Walkthrough_2View = Blackcart.views.Walkthrough_2View;
  var Walkthrough_3View = Blackcart.views.Walkthrough_3View;

  var PageManager = utils.extendMany(Backbone.View, utils.UtilsClass).extend({
    retailersConfigURL: 'config/retailers.json',
    maxRetryAttempts: 15,
    retryInterval: 1500,
    retryAttempt: 0,
    activeTab: '',
    _options: {},
    tabs: ['cart', 'confirm', 'success'],
    events: {
      'blackcart.button.showCart': 'onShowCart',
      'blackcart.showLoader': 'showLoader',
      'blackcart.hideLoader': 'hideLoader',
      'blackcart.showRetailers': 'showRetailers',
      'blackcart.cart.checkout': 'onCartCheckout',
      'blackcart.confirm.back': 'onConfirmBack',
      'blackcart.confirm.checkout': 'onConfirmCheckout',
      'blackcart.minimize': 'hideTab',
      'blackcart.iconclick': 'onIconClick'
    },
    buttonViewList: [],
    initialize: function() {
      var self = this;
      this.$bootstrapped = this.bootstrap();
      chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (sender.tab) {
          return true;
        }
        if (request.evt === 'blackcart-is-tab-active') {
          sendResponse({
            status: isBlackcartActive
          });
          return true;
        }
        if (request.evt === 'blackcart-user-logged-in') {
          // check if the widget has not been bootstrapped already. If it hasn't been, do so!
          if (!self.$bootstrapped || self.$bootstrapped.state() !== 'resolved') {
            self.$bootstrapped = self.bootstrap();
          }
          sendResponse({
            farewell: 'blackcart-user-logged-in:OK'
          });
        }

        if (request.evt === 'blackcart-click') {
          // we are only interested in showing the cart
          // self.cart.show();
          self.showActiveTab();
          sendResponse({
            farewell: 'blackcart-click:OK'
          });
        }

        /*if (request.evt === 'blackcart-order-changed') {
          self.order.queryLocal().done(function(){
            self.cart.render();  
          });
          sendResponse({
            farewell: 'blackcart-order-changed:OK'
          });
        }*/

        if (request.evt === 'blackcart-update-collection') {
          self.order.queryLocal().done(function() {
            self.cart.render();
          });
          sendResponse({
            farewell: 'blackcart-update-collection:OK'
          });
        }

        
      });
    },

    set: function(obj) {
      var _options = this._options;
      _.each(obj, function(v, key) {
        _options[key] = v;
      });
      return this;
    },

    get: function(key) {
      var _options = this._options;
      if (_options.hasOwnProperty(key)) {
        return _options[key];
      } else {
        return null;
      }
    },

    bootstrap: function() {
      var self = this;
      var retailer;
      return this.getConfig().done(function(retailersAndBrands, options, user, remoteOrder /*, tokens*/ ) {
        self.user = user;
        if (retailersAndBrands.retailersList && (retailersAndBrands.retailersList.retailers || []).length) {
          self.set({
            'retailers': retailersAndBrands.retailersList.retailers,
            'brands': retailersAndBrands.brands
          });
          retailer = self._lookupRetailerWithURL();
          if (!retailer) {
            return self.log('Could not retrieve retailer information from URL');
          }
          /* Let the bg page know that the page is supported */
          isBlackcartActive = true;
          chrome.runtime.sendMessage({
            evt: 'blackcart-site-supported'
          });

          // instantiate collection
          self.order = collections.getCollectionInstance('Order');
          self.order.setUID(self.user.UID).queryLocal(remoteOrder);

          // check if retailer has custom retry setup
          self.maxRetryAttempts = retailer.maxRetryAttempts || self.maxRetryAttempts;
          self.retryInterval = retailer.retryInterval || self.retryInterval;

          // bind and call custom handler method
          if (retailer.customHandler && CustomHandlers[retailer.customHandler]) {
            self.constructor.prototype.customHandler = function() {
              CustomHandlers[retailer.customHandler].apply(this, arguments);
            };
            self.customHandler(retailer);
          }

          // inject everything else
          self.injectCart(retailer);
          self._onSiteSupported();

          // inject button
          if (retailer.delay) {
            setTimeout(function() {
              self.injectButton(retailer);
            }, retailer.delay);
          } else {
            self.injectButton(retailer);
          }

          
        }
      }).fail(function(err) {
        if (err === 'user-error') {
          self.log('error', 'Please log in first to continue.');
        } else {
          self.log('error', err);
        }
      });
    },

    getConfig: function() {
      // return $.when(this._getRetailers(), this._getOptions(), this._getUser(), this._getTokens());
      var $dfd = $.Deferred();
      var self = this;
      chrome.runtime.sendMessage({
        evt: 'blackcart-get-config'
      }, function(resp) {
        if (!resp || !resp.status) {
          console.error('Error. Could not retrieve config information.');
          return $dfd.reject('config-error');
        }
        if (resp.status === 'OK') {
          self._getOrder(resp.config[2])
            .done(function(order) {
              $dfd.resolve(resp.config[0], resp.config[1], resp.config[2], order);
            })
            .fail(function(err) {
              return $dfd.reject(err);
            });
        } else if (resp.status === 'ERR') {
          return $dfd.reject(resp.err);
        }
      });
      return $dfd;
    },

    _getOrder: function(user) {
      var $dfd = $.Deferred();
      this.rest({
        endpoint: config.server.endPoints.getOrderByUser + '/' + user.UID,
        method: 'GET'
      }).done(function(resp) {
        $dfd.resolve(resp);
      }).fail(function(e) {
        $dfd.reject(e);
      });
      return $dfd;
    },

    /*the iframe element*/
    _createGetNodeFromString: function(iframeSelector) {
      return iframeSelector ? function(str) {
        return iframeSelector.contents().find(str);
      } : function(str) {
        return $(str);
      };
    },

    _processSelector: function(selector, opts) {
      var $node;
      var shouldPrepend;
      var insertAfter;
      var insertBefore;
      var self = this;
      _.every(selector.indexOf('||') >= 0 ? selector.split('||') : [selector], function(selectorString) {
        $node = null;
        shouldPrepend = false;
        insertAfter = false;
        insertBefore = false;
        if (selectorString.indexOf(':prepend') >= 0) {
          shouldPrepend = true;
          selectorString = selectorString.replace(':prepend', '');
        }
        if (selectorString.indexOf(':insertafter') >= 0) {
          insertAfter = true;
          selectorString = selectorString.replace(':insertafter', '');
        }
        if (selectorString.indexOf(':insertbefore') >= 0) {
          insertBefore = true;
          selectorString = selectorString.replace(':insertbefore', '');
        }
        $node = self._getNodeFromString(selectorString);
        if ($node.length) {
          return false;
        }
        return true;
      });
      return {
        $node: $node,
        shouldPrepend: shouldPrepend,
        insertAfter: insertAfter,
        insertBefore: insertBefore
      };
    },

    _buttonExists: function(selector) {
      var self = this;
      if (_.isArray(selector)) {
        return _.find(selector, function(s) {
          return !!self._getNodeFromString(s).length;
        });
      } else {
        return !!self._getNodeFromString(selector).length;
      }
    },

    _getButtonSelector: function(opts, retailer) {
      var buttonSelector;
      if (opts.injectType === 'popup') {
        buttonSelector = retailer.alternates.popup.button.selector;
      } else if (retailer.polymorphicOn) {
        buttonSelector = retailer[retailer.polymorphicOn + 'List'];
      } else {
        buttonSelector = retailer.button.selector;
      }
      return buttonSelector;
    },

    injectButton: function(retailer, opts) {
      var buttonView;
      var buttonSelector;
      var selectorInfo;
      var $insertionNode;
      var shouldPrepend = false;
      var insertAfter = false;
      var insertBefore = false;
      var retry;
      var self = this;
      var btnCls;
      var btn;
      var $iframeSelector;
      var isIframe;

      opts = opts || {};
      isIframe = !!opts.isIframe;
      this.retryAttempt += 1;
      this.injectTimeoutID = 0;
      if (!retailer.button && !retailer.polymorphicOn) {
        return this.log('Button does not exist on this page');
      }
      if (opts.stopPolling && this.injectTimeoutID) {
        clearTimeout(this.injectTimeoutID);
      }
      if (isIframe) {
        $iframeSelector = $(retailer.alternates.popup.iframeSelector);
      }
      this._getNodeFromString = this._createGetNodeFromString($iframeSelector);
      buttonSelector = this._getButtonSelector(opts, retailer);
      btn = this._buttonExists(buttonSelector);
      // if (!$(buttonSelector).length) {
      if (!btn) {
        if (this.retryAttempt < this.maxRetryAttempts) {
          retry = _.bind(function() {
            this.injectButton(retailer, opts);
          }, this);
          this.injectTimeoutID = setTimeout(retry, this.retryInterval);
          return this.injectTimeoutID;

        }
        return this.log('Button does not exist on this page');
      } else if (retailer.polymorphicOn && _.isString(btn)) {
        // if the retailer is polymorphic and a valid button exists, normalize the retailer definition
        _.each(retailer.defs[btn], function(def, key) {
          retailer[key] = def;
        });
      }

      /* if the function has reached this point, implies the button will be injected*/
      this.injectTimeoutID = 0;
      if (opts.injectType === 'popup') {
        selectorInfo = this._processSelector(retailer.alternates.popup.button.insertionNode);
      } else {
        selectorInfo = this._processSelector(retailer.button.insertionNode);
      }

      btnCls = retailer.button.cls;
      $insertionNode = selectorInfo.$node;
      shouldPrepend = selectorInfo.shouldPrepend;
      insertAfter = selectorInfo.insertAfter;
      insertBefore = selectorInfo.insertBefore;
      if (retailer.addToBody || !$insertionNode.length) {
        this.log('Could not find insertion location. Inserting at the top of the page');
        $insertionNode = $('<div></div>')
          .addClass('blackcart-btn-wrapper blackcart-btn-top')
          .attr('id', 'blackcart-add-to-cart')
          .appendTo('body');

        buttonView = new ButtonView({
          el: $insertionNode.get(0),
          $parentEl: this.$el,
          retailer: retailer,
          user: this.user,
          brands: this.get('brands'),
          order: this.order,
          injectType: opts.injectType,
          isIframe: isIframe,
          $iframe: $iframeSelector || null
        });
        if (btnCls) {
          buttonView.$el.addClass(btnCls);
        }
        $('<br/>').insertBefore(buttonView.$el);
        self.buttonViewList.push(buttonView);
        buttonView = null;
      } else {
        $insertionNode.each(function(idx) {
          var $_insertionNode = $(this);
          var $insertedNode = $('<div></div>')
            .addClass('blackcart-btn-wrapper')
            .attr('id', 'blackcart-add-to-cart-' + idx);
          if (shouldPrepend) {
            $insertedNode.prependTo($_insertionNode);
          } else if (insertAfter) {
            $insertedNode.insertAfter($_insertionNode);
          } else if (insertBefore) {
            $insertedNode.insertBefore($_insertionNode);
          } else {
            $insertedNode.appendTo($_insertionNode);
          }
          buttonView = new ButtonView({
            el: $insertedNode.get(0),
            $parentEl: self.$el,
            retailer: retailer,
            user: self.user,
            brands: self.get('brands'),
            order: self.order,
            injectType: opts.injectType,
            isIframe: !!opts.isIframe,
            $iframe: $iframeSelector || null
          });
          if (btnCls) {
            buttonView.$el.addClass(btnCls);
          }
          $('<br/>').insertBefore(buttonView.$el);
          self.buttonViewList.push(buttonView);
          buttonView = null;
        });
      }

      // a fire and forget request
      try {
        utils.logShowButton(this.user, retailer);
        this._onShowButton();
      } catch (e) {
        console.log('Blackcart exception', e);
      }
    },

    removeButtons: function(filter) {
      var buttonViewList = this.buttonViewList;
      filter = filter || 'all';
      this.retryAttempt = 0;
      _.each(buttonViewList.slice(), function(buttonView, idx) {
        if (filter === 'all' || buttonView.injectType === filter) {
          buttonView.destroy();
          buttonViewList.splice(idx, 1);
        }
      });

      return this;
    },

    injectCart: function(retailer) {
      var insertionMethod = retailer.prependToBody ? 'prependTo' : 'appendTo';
      var retailerClsName = retailer.PSource.toLowerCase().replace(/&/g, '').replace(/[\s\&]/g, '-');
      this.loadingView = new LoadingView({
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-loading-view blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el)
      });

      this.retailersView = new RetailersView({
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-retailers-view blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el),
        brands:this.get('brands')
      });

      this.icon = new Icon({
        $parentEl: this.$el,
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-icon-wrapper blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el)
      });
      this.icon.show();

      this.cart = new Cart({
        $parentEl: this.$el,
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-cart blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el),
        order: this.order,
        user: this.user
      });

      this.confirm = new Confirm({
        $parentEl: this.$el,
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-confirm blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el),
        order: this.order,
        user: this.user
      });
      this.confirm.hide();

      this.success = new Success({
        $parentEl: this.$el,
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-success blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el),
        order: this.order,
        user: this.user
      });
      this.success.hide();

      this.walkthrough_1 = new Walkthrough_1View({
        $parentEl: this.$el,
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-modal-wrapper blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el),
        retailer:retailer
      });
      this.walkthrough_1.hide();

      this.walkthrough_2 = new Walkthrough_2View({
        $parentEl: this.$el,
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-modal-wrapper blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el),
        retailer:retailer
      });
      this.walkthrough_2.hide();

      this.walkthrough_3 = new Walkthrough_3View({
        $parentEl: this.$el,
        el: $('<div class="blackcart-container-el"></div>')
          .addClass('blackcart-modal-wrapper blackcart-walkthrough-3 blackcart-retailer-' + retailerClsName)[insertionMethod](this.$el),
        retailer:retailer
      });
      this.walkthrough_3.hide();
    },

    _lookupRetailerWithURL: function() {
      var url = window.location.href.replace(URLRegex, '');
      if(url.indexOf('forever21.com/ca') > -1){
          url = url.replace('forever21.com/ca', 'forever21.com/CA')
      }
      var retailersList = this.get('retailers');
      var retailer;

      _.every(retailersList, function(retailerObj) {
        if (retailerObj.useStartsWith) {
          if (url.startsWith(retailerObj.url.replace(URLRegex, ''))) {
            retailer = retailerObj;
            return false;
          } else {
            return true;
          }
        }
        if (url.indexOf(retailerObj.url.replace(URLRegex, '')) >= 0) {
          retailer = retailerObj;
          return false;
        }
        return true;
      });
      return retailer;
    },

    onCartCheckout: function() {
      this.showTab('confirm');
      return this;
    },

    onConfirmBack: function() {
      this.showTab('cart');
      return this;
    },

    onConfirmCheckout: function() {
      var self = this;
      this.showLoader();
      this.order.sync().done(function() {
        self.confirm.$el.trigger('submitSuccess');
        self.confirm.hide();
        self.success.render().show();
        self.activeTab = 'success';
        self.order.resetOrder();
      }).fail(function(e) {
        self.confirm.$el.trigger('submitFailure');
        self.log('error', 'There was an error processing the order', e);
      }).always(function() {
        self.hideLoader();
      });
      return this;
    },

    onIconClick: function() {
      this.showActiveTab();
    },

    onShowCart:function(){
      this.walkthrough_3.show();
      this.showCart();
    },

    showLoader: function() {
      this.loadingView.show();
      return this;
    },

    hideLoader: function() {
      this.loadingView.hide();
      return this;
    },

    showRetailers: function() {
      this.hideTab().retailersView.show();
      return this;
    },

    showTab: function(tab) {
      if (this.activeTab) {
        this[this.activeTab].hide();
      }
      this[tab].show();
      this.activeTab = tab;
      return this;
    },

    hideTab: function() {
      this[this.activeTab || 'cart'].hide();
      return this;
    },

    showActiveTab: function() {
      this.showTab('cart');
      // this.hideLoader();
      /*if(!order || !order.length){
        console.log('Show all products');
        this.showTab('cart');
      }else{
        if(tab === 'brands'){
          tab = this.activeTab = 'cart';
        }
        this.showTab(tab);
      }*/
    },

    showCart: function() {
      return this.showTab('cart');
    },

    _onSiteSupported:function(){
      this.walkthrough_1.show();
      this.$el.trigger('blackcart-site-supported');
      return this;
    },

    _onShowButton:function(){
      this.walkthrough_2.show();
      this.$el.trigger('blackcart-show-button');
      return this;
    }
  });
  // _.extend(PageManager, utils.UtilsClass);

  return new PageManager({
    el: $('<div class="blackcart-page-manager"></div>')
      .appendTo('body')
  });
}());