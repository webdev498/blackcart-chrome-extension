(function() {
    'use strict';
    var Blackcart = window.Blackcart;
    // var globals = Blackcart.globals;
    var utils = Blackcart.utils;
    // var collections = Blackcart.collections;
    var Cart = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/cart.html',
        cssURL: 'styles/chromestyle.css',
        events: {
            click: 'onClick',
            'blackcart.cart.blur': 'onBlur'
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
            // this.order = collections.getCollectionInstance('Order');
            this.user = opts.user;
            this.order = opts.order;
            this.order.on('add remove cart-reset cart-update', function() {
                self.render();
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
                    fixThumbnailURL:utils.fixThumbnailURL,
                    order: this.order
                });
                this.cssLoaded = true;
            } else {
                shadow.removeChild(shadow.querySelector('.chrome-widget'));
                shadow.appendChild($(this.template({
                    chromeURL: function(url) {
                        return chrome.extension.getURL(url);
                    },
                    fixThumbnailURL:utils.fixThumbnailURL,
                    order: this.order
                })).get(0));
            }
            this._bindShadowRootEvents();

            return this;
        },

        _bindShadowRootEvents: function() {
            var node = this.getShadowElement('.chrome-widget');
            var $el = this.$el;
            if (node && node[0]) {
                node = node[0];
                node.addEventListener('focusout', function(e) {
                    var targetNode;
                    if (e.target && e.target.nodeName === 'INPUT' && e.target.type === 'text') {
                        targetNode = e.target;
                        $el.trigger('blackcart.cart.blur', {
                            cid: targetNode.dataset.modelId,
                            elType: targetNode.classList.contains('item-size') ? 'item-size' : 'item-style',
                            value: targetNode.value
                        });
                    }
                });
            }
            node = null;
            return this;
        },

        show: function() {
            this.$el.removeClass('hidden');
        },

        hide: function() {
            this.$el.addClass('hidden');
        },

        showLoader: function() {
            var $loader = $(this.getShadowElement('.cart-spinner')[0]);
            $loader.removeClass('hidden');
            return this;
        },

        hideLoader: function() {
            var $loader = $(this.getShadowElement('.cart-spinner')[0]);
            $loader.addClass('hidden');
            return this;
        },

        onClick: function(e) {
            var evt = e.originalEvent;
            var path = evt.path;
            var $src = $(path[0]);
            var $parent;
            var children;
            var self = this;
            if (!$src.length) {
                return true;
            }
            if ($src.attr('id') === 'a2-2') {
                e.preventDefault();
                if ($src.hasClass('disabled')) {
                    return true;
                }
                children = this.getShadowElement('.cont_tlo_body_page_adress');
                if (children.length) {
                    $.each(children, function() {
                        var $child = $(this);
                        var id = $child.attr('id');
                        var model = self.order.get(id.split('-')[1]);
                        var $style = $child.find('.item-style');
                        var $size = $child.find('.item-size');

                        model.set({
                            'PStyle': $style.val() || '--',
                            'PSize': $size.val() || '--'
                        });
                    });
                }
                // console.log(self.order.models);
                this.$parentEl.trigger('blackcart.cart.checkout');
            } else if ($src.attr('id') === 'a1-1') {
                e.preventDefault();
                if ($src.hasClass('disabled')) {
                    return true;
                }
                this.$parentEl.trigger('blackcart.showRetailers');
            }else if ($src.parent().hasClass('cancel-item')) {
                e.preventDefault();
                $parent = $src.parents('.cont_tlo_body_page_adress');
                this.$parentEl.trigger('blackcart.showLoader');
                this.order
                    .removeProduct($parent.attr('data-model-id'))
                    .fail(function() {

                    })
                    .always(function() {
                        self.$parentEl.trigger('blackcart.hideLoader');
                    });
            } else if ($src.hasClass('item-style-link')) {
                e.preventDefault();
                $src.addClass('hidden').next().removeClass('hidden');
            } else if ($src.hasClass('item-size-link')) {
                e.preventDefault();
                $src.addClass('hidden').next().removeClass('hidden');
            } else if ($src.attr('id') === 'minimize-cart') {
                e.preventDefault();
                this.$parentEl.trigger('blackcart.minimize');
            } else if ($src.hasClass('refresh-cart-btn')) {
                this.showLoader()
                    .order.mergeWithRemote()
                    .done(function(noChange) {
                        if (!noChange) {
                            self.order.trigger('cart-update');
                        }
                    })
                    .fail(function(err) {
                        self.log('error', err);
                    })
                    .always(function(){
                        self.hideLoader();
                    });
            }
        },

        onBlur: function(e, args) {
            var cid, model;
            cid = args.cid || '';
            if (!cid) {
                return false;
            }
            model = this.order.get(cid);
            if (!model) {
                return false;
            }
            if (args.elType === 'item-size') {
                model.set({
                    'PSize': args.value || ''
                });
            } else if (args.elType === 'item-style') {
                model.set({
                    'PStyle': args.value || ''
                });
            }
        }
    });

    window.Blackcart.views.Cart = Cart;
}());