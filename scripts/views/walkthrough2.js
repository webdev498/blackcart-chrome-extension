(function() {
    'use strict';

    var Blackcart = window.Blackcart;
    // var globals = Blackcart.globals;
    var utils = Blackcart.utils;
    // var collections = Blackcart.collections;
    var Walkthrough_2View = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/walkthrough2.html',
        cssURL: 'styles/chromestyle.css',
        events: {
            click: 'onClick'
        },
        initialize: function(opts) {
            var self = this;
            var tpl;
            // var $loadingEl;

            // load the main template
            tpl = this.loadTemplateFromURL(this.templateURL);
            if (_.isString(tpl)) {
                this.template = _.template(tpl);
                this.render();
            } else {
                tpl.done(function(resp) {
                    self.template = _.template(resp);
                    self.render();
                }).fail(function(e) {
                    self.log('error', e);
                });
            }

            this.$parentEl = opts.$parentEl;
            this.retailer = opts.retailer;

            this.$parentEl.on('blackcart.walkthrough_1.hide',function(){
                if(self._waitForOtherModal){
                    self.show();
                }
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
            shadow.innerHTML = this.loadVendorCSS() + this.loadCSSFromURL('styles/modal.css') + this.template({
                chromeURL: function(url) {
                    return chrome.extension.getURL(url);
                },
                order: this.order
            });
            return this;
        },

        show: function() {
            var retailerName = this.retailer.PSource;
            var self = this;
            if(Blackcart.walkthrough_1Shown){
                this._waitForOtherModal = true;
                return;
            }
            this._waitForOtherModal = false;
            chrome.storage.sync.get({
                isWalkthrough_2Shown: false
            }, function(obj) {
                if (obj && !obj.isWalkthrough_2Shown) {
                    self._show();
                    chrome.storage.sync.set({
                        isWalkthrough_2Shown: true
                    });
                }
            });
            return this;
        },

        _show: function() {
            this.$el.removeClass('hidden');
            this.$parentEl.trigger('blackcart.walkthrough_2.show');
            return this;
        },

        hide: function() {
            this.$el.addClass('hidden');
            this.$parentEl.trigger('blackcart.walkthrough_2.hide');
            return this;
        },

        onClick: function(e) {
            var evt = e.originalEvent;
            var path = evt.path;
            var $src = $(path[0]);
            if (!$src.length) {
                return true;
            }
            if ($src.hasClass('close-modal') || $src.hasClass('continue') || $src.attr('id') === 'modal-overlay') {
                e.preventDefault();
                this.hide();
            }
        }
    });

    window.Blackcart.views.Walkthrough_2View = Walkthrough_2View;
}());