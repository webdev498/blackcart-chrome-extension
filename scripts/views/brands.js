(function() {
    'use strict';
    var Blackcart = window.Blackcart;
    // var globals = Blackcart.globals;
    var utils = Blackcart.utils;
    // var collections = Blackcart.collections;
    var Brands = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/brands.html',
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
            this.brands = opts.brands;
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
                shadow.innerHTML = this.loadVendorCSS() + this.loadCSSFromURL('styles/chromestyle.css') +
                    this.loadCSSFromURL('styles/main.css') + this.template({
                        chromeURL: function(url) {
                            return chrome.extension.getURL(url);
                        },
                        brands: this.brands
                    });
                this.cssLoaded = true;
            } else {
                shadow.removeChild(shadow.querySelector('.chrome-widget'));
                shadow.appendChild($(this.template({
                    chromeURL: function(url) {
                        return chrome.extension.getURL(url);
                    },
                    order: this.order
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

    window.Blackcart.views.Brands = Brands;
}());