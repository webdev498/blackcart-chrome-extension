(function() {
    'use strict';
    var Blackcart = window.Blackcart;
    // var globals = Blackcart.globals;
    var utils = Blackcart.utils;
    // var collections = Blackcart.collections;
    var Success = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/success.html',
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
                this.render().hide();
            } else {
                tpl.done(function(resp) {
                    self.template = _.template(resp);
                    self.render().hide();
                }).fail(function(e) {
                    self.log('error', e);
                });
            }

            this.$parentEl = opts.$parentEl;
            this.user = opts.user;
            this.order = opts.order;

            /*this.order.on('add change remove', function() {
                self.render();
            });*/

        },

        render: function() {
            var el = this.$el.get(0);
            var shadow;
            if (!el.shadowRoot) {
                shadow = el.createShadowRoot();
            } else {
                shadow = el.shadowRoot;
            }
            shadow.innerHTML = this.loadVendorCSS() + this.loadCSSFromURL('styles/chromestyle.css') + this.template({
                chromeURL: function(url) {
                    return chrome.extension.getURL(url);
                },
                order: this.order
            });
            return this;
        },

        show: function() {
            this.$el.removeClass('hidden');
        },

        hide: function() {
            this.$el.addClass('hidden');
        },

        onClick: function(e) {
            var evt = e.originalEvent;
            var path = evt.path;
            var $src = $(path[0]);
            if (!$src.length) {
                return true;
            }
            if ($src.attr('id') === 'minimize-cart') {
                e.preventDefault();
                this.$parentEl.trigger('blackcart.minimize');
            }
        }
    });

    window.Blackcart.views.Success = Success;
}());