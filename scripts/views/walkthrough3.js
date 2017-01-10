(function() {
    'use strict';

    var Blackcart = window.Blackcart;
    // var globals = Blackcart.globals;
    var utils = Blackcart.utils;
    // var collections = Blackcart.collections;
    var Walkthrough_3View = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/walkthrough3.html',
        cssURL: 'styles/chromestyle.css',
        events: {
            click: 'onClick',
            'blackcart.walkthrough_1.hide': 'hide'
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

            /* only the cart element would have a higher z-index than the walkthrough, handle clicks from 
            that element*/
            $('body').on('click','.blackcart-cart',function(){
                self.hide();
            });
        },

        _bindToBody: function() {
            return this;
        },

        _unbindFromBody: function() {
            return this;
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
            var self = this;
            chrome.storage.sync.get({
                isWalkthrough_3Shown: false
            }, function(obj) {
                if (obj && !obj.isWalkthrough_3Shown) {
                    self._show();
                    chrome.storage.sync.set({
                        isWalkthrough_3Shown: true
                    });
                }
            });
            return this;
        },

        _show: function() {
            this.$el.removeClass('hidden');
            return this;
        },

        hide: function() {
            if(!this.$el.hasClass('hidden')){
                this.$el.addClass('hidden');
            }
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

    window.Blackcart.views.Walkthrough_3View = Walkthrough_3View;
}());