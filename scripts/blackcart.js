/* globals _*/
(function() {
    'use strict';
    var _collections = {};
    var _collectionInstances = {};
    _.mixin({
        capitalize: function(string) {
            return _.map(string.split(' '),function(str){ 
                return str.charAt(0).toUpperCase() + str.substring(1);
            }).join(' ');
        }
    });
    window.Blackcart = {
        globals: {

        },
        views: {},
        collections: {
            addCollection: function(collection, collectionName, opts) {
                opts = opts || {};
                if (!_collections[collectionName] || !opts.override) {
                    _collections[collectionName] = collection;
                }
                return collection;
            },

            getCollectionInstance: function(collectionName) {
                var collectionInstance;
                if (!collectionName) {
                    throw new Error('collection name is required');
                }
                collectionInstance = _collectionInstances[collectionName];
                if (!collectionInstance) {
                    return (_collectionInstances[collectionName] = new _collections[collectionName]());
                }
                return collectionInstance;
            }
        }
    };

}());