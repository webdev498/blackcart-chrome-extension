/*
 * @module main contentscript
 */
(function() {
    'use strict';
    // var globals = window.Blackcart.globals;
    var utils = window.Blackcart.utils;
    var config = window.BLACKCART_CONFIG;
    /*var sendMessage = function(msg) {
        chrome.runtime.sendMessage({
            evt: msg
        });
    };*/

    // inline model
    var OrderModel = utils.extendMany(Backbone.Model, utils.UtilsClass);

    /*
     * @collectionName - Order
     * @fields
     * UID - user ID of currently logged in user
     * OID - order ID of current order
     * OrderNo - order number of current order
     * models - products associated with the current order
     */
    var Order = utils.extendMany(Backbone.Collection, utils.UtilsClass).extend({
        // name:'Order',
        url: window.BLACKCART_CONFIG.server.endPoints.getOrderByUser,
        model: OrderModel,
        initialize: function() {
            var self = this;
            this.on('add remove', function() {
                // persist to local; this is largely for sharing data between tabs
                self.saveLocal();
            });
        },

        addProduct: function(product) {
            var $dfd;
            var self = this;
            $dfd = $.Deferred();
            /* if the image is a data-url, upload to imgur and return the new url
             *  else return the url as-is
             */
            utils
                .uploadImageConditional(product.PThumbnail)
                .done(function(response) {
                    if (response && response.status === 200) {
                        product.PThumbnail = response.data.link;
                    }
                })
                .fail(function(e) {
                    self.log('error', e);
                })
                .always(_.bind(function() {
                    this.rest({
                            endpoint: config.server.endPoints.addProduct,
                            method: 'POST',
                            data: {
                                uid: this.UID,
                                oid: this.OID,
                                product: product,
                                orderNo: this.OrderNo
                            }
                        })
                        .done(function(resp) {
                            self.OID = resp.OID;
                            // this saves the product locally
                            product.PID = resp.PID;
                            self.add(product, {
                                at: 0
                            });

                            // merge only after the product has been added locally and on the server
                            self.mergeWithRemote()
                                .done(function(noChange) {
                                    if (!noChange) {
                                        self.trigger('cart-update');
                                    }
                                })
                                .fail(function(err) {
                                    self.log('error', err);
                                })
                                .always(function() {
                                    $dfd.resolve();
                                });
                        })
                        .fail(function(err) {
                            $dfd.reject(err);
                        });
                }, this));
            return $dfd;
        },

        removeProduct: function(productID) {
            var self = this;
            var product = this.get(productID);
            var $dfd = $.Deferred();
            this.rest({
                    endpoint: config.server.endPoints.removeProduct,
                    method: 'POST',
                    data: {
                        oid: this.OID,
                        pid: product.get('PID')
                    }
                })
                .done(function(resp) {
                    self.OID = resp.OID;

                    // this removes the product locally
                    self.remove(productID);
                    self.mergeWithRemote()
                        .done(function(noChange) {
                            if (!noChange) {
                                self.trigger('cart-update');
                            }
                        })
                        .fail(function(err) {
                            self.log('error', err);
                        })
                        .always(function() {
                            $dfd.resolve();
                        });
                })
                .fail(function(err) {
                    /*TODO: Handle gone errors*/
                    if (err && err.status === 410) {
                        self.remove(productID);
                        return $dfd.resolve();
                    }
                    $dfd.reject(err);
                });
            return $dfd;
        },

        clearLocal: function() {
            var uid = this.UID;
            var $dfd = $.Deferred();
            chrome.storage.sync.get({
                'blackcart_orders': false
            }, function(items) {
                var blackcartOrders = items.blackcart_orders;
                if (blackcartOrders && blackcartOrders[uid]) {
                    blackcartOrders[uid] = null;
                    delete blackcartOrders[uid];
                }
                chrome.storage.sync.set({
                    blackcart_orders: blackcartOrders
                }, function() {
                    $dfd.resolve();
                });
            });
            return $dfd;
        },

        saveLocal: function() {
            var uid = this.UID;
            var self = this;
            var $dfd = $.Deferred();
            chrome.storage.sync.get({
                'blackcart_orders': false
            }, function(items) {
                var blackcartOrders = items.blackcart_orders;
                if (!blackcartOrders) {
                    blackcartOrders = {};
                }
                /*TODO - use the changed even to identify what has changed*/
                blackcartOrders[uid] = {
                    oid: self.OID,
                    products: self.toJSON(),
                    orderNo: self.OrderNo
                };
                chrome.storage.sync.set({
                    blackcart_orders: blackcartOrders
                }, function() {
                    $dfd.resolve();
                });
            });
            return $dfd.promise();
        },

        /* Check if an order is already in progress somewhere. If not generate a new OrderNo*/
        queryLocal: function(remoteOrder) {
            var uid = this.UID;
            var self = this;
            var order;
            var $dfd = $.Deferred();
            chrome.storage.sync.get({
                'blackcart_orders': false
            }, function(items) {
                var blackcartOrders = items.blackcart_orders;
                if (remoteOrder && remoteOrder.OID && remoteOrder.OrderNo) {
                    // ensure remote orders are actually there
                    // if (!blackcartOrders || !blackcartOrders[uid]) {
                    // if local cart is empty, add all remote products
                    self.OrderNo = remoteOrder.OrderNo;
                    self.OID = remoteOrder.OID;
                    self.reset(_.map(remoteOrder.products, function(p) {
                        return {
                            PSource: p.PSource,
                            PName: p.PName,
                            PID: p.PID,
                            PThumbnail: p.PThumbnail,
                            Price: p.Price,
                            PageURL: p.PageURL || '#',
                            ScreenshotURL: p.ScreenshotURL || '#'
                        };
                    }));
                    // if creating a new order, make sure it gets saved. Even if empty
                    self.saveLocal().done(function() {
                        $dfd.resolve();
                    });
                    return false;
                } else {
                    // if there are no remote orders, create a new order locally
                    if (!blackcartOrders || !blackcartOrders[uid]) {
                        self.generateOrderNo();
                        self.reset([]);
                        // if creating a new order, make sure it gets saved. Even if empty
                        self.saveLocal().done(function() {
                            $dfd.resolve();
                        });
                        return false;
                    }
                    order = blackcartOrders[uid];
                    self.OID = order.oid;
                    self.OrderNo = order.orderNo;
                    self.reset(order.products);
                    $dfd.resolve();
                }
            });
            return $dfd.promise();
        },

        mergeWithRemote: function() {
            var $dfd = $.Deferred();
            var self = this;
            this.rest({
                endpoint: config.server.endPoints.getOrderByUser + '/' + this.UID,
                method: 'GET'
            }).done(function(remoteOrder) {
                var localPIDList;
                var remotePIDList;
                if (!remoteOrder) {
                    return $dfd.reject(new Error('An error occurred.'));
                }
                if (!remoteOrder.OID) {
                    // if we're here, for some reason the order is gone on the server
                    self.resetOrder();
                    $dfd.resolve();
                    return;
                }
                localPIDList = _.map(self.models, function(m) {
                    return m.get('PID');
                });
                remotePIDList = _.pluck(remoteOrder.products, 'PID');

                // local and remote are same
                if (!(_.difference(localPIDList, remotePIDList).length) &&
                    !(_.difference(remotePIDList, localPIDList).length)) {
                    return $dfd.resolve(true);
                }
                self.queryLocal(remoteOrder)
                    .done(function() {
                        $dfd.resolve();
                    })
                    .fail(function(err) {
                        $dfd.reject(err);
                    });
            }).fail(function(e) {
                $dfd.reject(e);
            });
            return $dfd;
        },

        setUID: function(uid) {
            this.UID = uid;
            return this;
        },

        generateOrderNo: function() {
            if (!this.OrderNo) {
                this.OrderNo = utils.generateRandom(6);
            }
            return this;
        },

        getTotal: function() {
            var parsedValue;
            return this.reduce(function(next, val) {
                parsedValue = parseFloat(val.get('Price') || 0);
                parsedValue = isNaN(parsedValue) ? 0 : parsedValue;
                return next + parsedValue;
            }, 0).toFixed(2);
        },

        uploadThumbnails: function(products) {
            var $upload = $.Deferred();
            var $dfds = [];
            var self = this;
            _.each(products, function(product) {
                var $img = $.Deferred();
                if (product.PThumbnail) {
                    utils.getDataURI(product.PThumbnail, function(dataURI) {
                        utils.uploadImage(dataURI)
                            .done(function(resp) {
                                product.PThumbnail = resp.data.link && resp.data.link.replace('http://', 'https://');
                            })
                            .fail(function() {
                                self.log('error', 'Failed to load image');
                            })
                            .always(function() {
                                $img.resolve();
                            });
                    });
                    $dfds.push($img);
                }
            });

            $.when.apply(null, $dfds).then(function() {
                $upload.resolve(products);
            });
            return $upload;
        },

        sync: function() {
            var $dfd;
            var products;
            var self = this;
            if (!this.UID) {
                return this.log('error', 'UID is not defined');
            }
            $dfd = $.Deferred();
            products = this.toJSON();
            self.rest({
                    endpoint: config.server.endPoints.createOrder,
                    method: 'POST',
                    data: {
                        uid: self.UID,
                        oid: self.OID,
                        products: products,
                        orderSize: self.getTotal(),
                        orderNo: self.OrderNo
                    }
                })
                .done(function() {
                    $dfd.resolve();
                })
                .fail(function(err) {
                    $dfd.reject(err);
                });

            return $dfd;
        },

        query: function( /*uid*/ ) {
            var self = this;
            if (!this.UID) {
                return this.log('error', 'UID is not defined');
            }
            this.rest({
                endpoint: this.url + '/' + this.UID,
                method: 'GET'
            }).done(function(resp) {
                if (resp.OID) {
                    self.OID = resp.OID;
                    if (resp.products.length) {
                        self.reset(resp.products);
                    }
                }
            }).fail(function(e) {
                self.log('error', e);
            });
        },

        resetOrder: function() {
            var self = this;
            // clears the current order (chrome.storage) associated with logged in user
            this.clearLocal().always(function() {
                // reset OID and OrderNo
                self.OID = null;
                self.OrderNo = null;
                /* 
                 * reuse the queryLocal method which will attempt to read the logged in user's order from chrome storage
                 * since we've already cleared the local models and OrderNo, queryLocal will regenerate a new order number
                 * and save the order locally
                 */
                self.queryLocal().done(function() {
                    self.trigger('cart-reset');
                });
            });
            return this;
        }
    });

    window.Blackcart.collections.addCollection(Order, 'Order');
}());