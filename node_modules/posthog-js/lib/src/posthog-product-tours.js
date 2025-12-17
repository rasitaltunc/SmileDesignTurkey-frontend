"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostHogProductTours = void 0;
var logger_1 = require("./utils/logger");
var core_1 = require("@posthog/core");
var globals_1 = require("./utils/globals");
var logger = (0, logger_1.createLogger)('[Product Tours]');
var PRODUCT_TOURS_STORAGE_KEY = 'ph_product_tours';
var PRODUCT_TOURS_FEATURE_FLAG = 'product-tours-2025';
var PostHogProductTours = /** @class */ (function () {
    function PostHogProductTours(instance) {
        this._cachedTours = null;
        this._productTourManager = null;
        this._isProductToursEnabled = undefined;
        this._isInitializing = false;
        this._instance = instance;
    }
    PostHogProductTours.prototype.onRemoteConfig = function (response) {
        if (this._instance.config.disable_product_tours) {
            logger.info('Product tours disabled via config');
            return;
        }
        var productTours = response['productTours'];
        if ((0, core_1.isNullish)(productTours)) {
            logger.info('Product tours not enabled in remote config');
            return;
        }
        this._isProductToursEnabled = productTours;
        logger.info("Remote config received, isProductToursEnabled: ".concat(this._isProductToursEnabled));
        this.loadIfEnabled();
    };
    PostHogProductTours.prototype.loadIfEnabled = function () {
        var _this = this;
        var _a;
        if (this._productTourManager) {
            return;
        }
        if (this._isInitializing) {
            logger.info('Already initializing product tours, skipping...');
            return;
        }
        if (this._instance.config.disable_product_tours) {
            logger.info('Product tours disabled via config');
            return;
        }
        var phExtensions = globals_1.assignableWindow === null || globals_1.assignableWindow === void 0 ? void 0 : globals_1.assignableWindow.__PosthogExtensions__;
        if (!phExtensions) {
            logger.error('PostHog Extensions not found.');
            return;
        }
        var featureFlagEnabled = (_a = this._instance.featureFlags) === null || _a === void 0 ? void 0 : _a.isFeatureEnabled(PRODUCT_TOURS_FEATURE_FLAG);
        if ((0, core_1.isUndefined)(this._isProductToursEnabled) && !featureFlagEnabled) {
            logger.info('Waiting for remote config or feature flag to enable product tours');
            return;
        }
        var isEnabled = this._isProductToursEnabled || featureFlagEnabled;
        if (!isEnabled) {
            logger.info('Product tours not enabled');
            return;
        }
        this._isInitializing = true;
        try {
            var generateProductTours = phExtensions.generateProductTours;
            if (generateProductTours) {
                this._completeInitialization(generateProductTours, isEnabled);
                return;
            }
            var loadExternalDependency = phExtensions.loadExternalDependency;
            if (!loadExternalDependency) {
                logger.error('PostHog loadExternalDependency extension not found.');
                this._isInitializing = false;
                return;
            }
            loadExternalDependency(this._instance, 'product-tours', function (err) {
                if (err || !phExtensions.generateProductTours) {
                    logger.error('Could not load product tours script', err);
                }
                else {
                    _this._completeInitialization(phExtensions.generateProductTours, isEnabled);
                }
                _this._isInitializing = false;
            });
        }
        catch (e) {
            logger.error('Error initializing product tours', e);
            this._isInitializing = false;
        }
    };
    PostHogProductTours.prototype._completeInitialization = function (generateProductToursFn, isEnabled) {
        this._productTourManager = generateProductToursFn(this._instance, isEnabled) || null;
        logger.info('Product tours loaded successfully');
    };
    PostHogProductTours.prototype.getProductTours = function (callback, forceReload) {
        var _this = this;
        if (forceReload === void 0) { forceReload = false; }
        if ((0, core_1.isArray)(this._cachedTours) && !forceReload) {
            callback(this._cachedTours, { isLoaded: true });
            return;
        }
        var persistence = this._instance.persistence;
        if (persistence) {
            var storedTours = persistence.props[PRODUCT_TOURS_STORAGE_KEY];
            if ((0, core_1.isArray)(storedTours) && !forceReload) {
                this._cachedTours = storedTours;
                callback(storedTours, { isLoaded: true });
                return;
            }
        }
        this._instance._send_request({
            url: this._instance.requestRouter.endpointFor('api', "/api/product_tours/?token=".concat(this._instance.config.token)),
            method: 'GET',
            callback: function (response) {
                var _a;
                var statusCode = response.statusCode;
                if (statusCode !== 200 || !response.json) {
                    var error = "Product Tours API could not be loaded, status: ".concat(statusCode);
                    logger.error(error);
                    callback([], { isLoaded: false, error: error });
                    return;
                }
                var tours = (0, core_1.isArray)(response.json.product_tours) ? response.json.product_tours : [];
                _this._cachedTours = tours;
                if (persistence) {
                    persistence.register((_a = {}, _a[PRODUCT_TOURS_STORAGE_KEY] = tours, _a));
                }
                callback(tours, { isLoaded: true });
            },
        });
    };
    PostHogProductTours.prototype.getActiveProductTours = function (callback) {
        if ((0, core_1.isNullish)(this._productTourManager)) {
            logger.warn('Product tours not loaded yet');
            callback([], { isLoaded: false, error: 'Product tours not loaded' });
            return;
        }
        this._productTourManager.getActiveProductTours(callback);
    };
    PostHogProductTours.prototype.showProductTour = function (tourId) {
        var _a;
        logger.info("showProductTour(".concat(tourId, ")"));
        (_a = this._productTourManager) === null || _a === void 0 ? void 0 : _a.showTourById(tourId);
    };
    PostHogProductTours.prototype.dismissProductTour = function () {
        var _a;
        (_a = this._productTourManager) === null || _a === void 0 ? void 0 : _a.dismissTour('user_clicked_skip');
    };
    PostHogProductTours.prototype.nextStep = function () {
        var _a;
        (_a = this._productTourManager) === null || _a === void 0 ? void 0 : _a.nextStep();
    };
    PostHogProductTours.prototype.previousStep = function () {
        var _a;
        (_a = this._productTourManager) === null || _a === void 0 ? void 0 : _a.previousStep();
    };
    PostHogProductTours.prototype.clearCache = function () {
        this._cachedTours = null;
        var persistence = this._instance.persistence;
        if (persistence) {
            persistence.unregister(PRODUCT_TOURS_STORAGE_KEY);
        }
    };
    PostHogProductTours.prototype.resetTour = function (tourId) {
        var _a;
        (_a = this._productTourManager) === null || _a === void 0 ? void 0 : _a.resetTour(tourId);
    };
    PostHogProductTours.prototype.resetAllTours = function () {
        var _a;
        (_a = this._productTourManager) === null || _a === void 0 ? void 0 : _a.resetAllTours();
    };
    return PostHogProductTours;
}());
exports.PostHogProductTours = PostHogProductTours;
//# sourceMappingURL=posthog-product-tours.js.map