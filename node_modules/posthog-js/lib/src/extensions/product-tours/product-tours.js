"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductTourManager = void 0;
var jsx_runtime_1 = require("preact/jsx-runtime");
var preact_1 = require("preact");
var posthog_surveys_types_1 = require("../../posthog-surveys-types");
var product_tours_utils_1 = require("./product-tours-utils");
var ProductTourTooltip_1 = require("./components/ProductTourTooltip");
var logger_1 = require("../../utils/logger");
var globals_1 = require("../../utils/globals");
var storage_1 = require("../../storage");
var utils_1 = require("../../utils");
var core_1 = require("@posthog/core");
var property_utils_1 = require("../../utils/property-utils");
var logger = (0, logger_1.createLogger)('[Product Tours]');
var document = globals_1.document;
var window = globals_1.window;
// Tour condition checking - reuses the same URL matching logic as surveys
function doesTourUrlMatch(tour) {
    var _a;
    var conditions = tour.conditions;
    if (!(conditions === null || conditions === void 0 ? void 0 : conditions.url)) {
        return true;
    }
    var href = (_a = window === null || window === void 0 ? void 0 : window.location) === null || _a === void 0 ? void 0 : _a.href;
    if (!href) {
        return false;
    }
    var targets = [conditions.url];
    var matchType = conditions.urlMatchType || core_1.SurveyMatchType.Icontains;
    return property_utils_1.propertyComparisons[matchType](targets, [href]);
}
function doesTourSelectorMatch(tour) {
    var conditions = tour.conditions;
    if (!(conditions === null || conditions === void 0 ? void 0 : conditions.selector)) {
        return true;
    }
    try {
        return !(0, core_1.isNull)(document.querySelector(conditions.selector));
    }
    catch (_a) {
        return false;
    }
}
function isTourInDateRange(tour) {
    var now = new Date();
    if (tour.start_date) {
        var startDate = new Date(tour.start_date);
        if (now < startDate) {
            return false;
        }
    }
    if (tour.end_date) {
        var endDate = new Date(tour.end_date);
        if (now > endDate) {
            return false;
        }
    }
    return true;
}
function checkTourConditions(tour) {
    return isTourInDateRange(tour) && doesTourUrlMatch(tour) && doesTourSelectorMatch(tour);
}
var CONTAINER_CLASS = 'ph-product-tour-container';
var TRIGGER_LISTENER_ATTRIBUTE = 'data-ph-tour-trigger';
var CHECK_INTERVAL_MS = 1000;
function retrieveTourShadow(tourId) {
    var containerClass = "".concat(CONTAINER_CLASS, "-").concat(tourId);
    var existingDiv = document.querySelector(".".concat(containerClass));
    if (existingDiv && existingDiv.shadowRoot) {
        return {
            shadow: existingDiv.shadowRoot,
            isNewlyCreated: false,
        };
    }
    var div = document.createElement('div');
    div.className = containerClass;
    var shadow = div.attachShadow({ mode: 'open' });
    var stylesheet = (0, product_tours_utils_1.getProductTourStylesheet)();
    if (stylesheet) {
        shadow.appendChild(stylesheet);
    }
    document.body.appendChild(div);
    return {
        shadow: shadow,
        isNewlyCreated: true,
    };
}
function removeTourFromDom(tourId) {
    var containerClass = "".concat(CONTAINER_CLASS, "-").concat(tourId);
    var container = document.querySelector(".".concat(containerClass));
    if (container === null || container === void 0 ? void 0 : container.shadowRoot) {
        (0, preact_1.render)(null, container.shadowRoot);
    }
    container === null || container === void 0 ? void 0 : container.remove();
}
var ProductTourManager = /** @class */ (function () {
    function ProductTourManager(instance) {
        var _this = this;
        this._activeTour = null;
        this._currentStepIndex = 0;
        this._renderReason = 'auto';
        this._checkInterval = null;
        this._triggerSelectorListeners = new Map();
        this._surveyEventUnsubscribe = null;
        this._handleVisibilityChange = function () {
            if (document.hidden && _this._checkInterval) {
                clearInterval(_this._checkInterval);
                _this._checkInterval = null;
            }
            else if (!document.hidden && !_this._checkInterval) {
                _this._checkInterval = setInterval(function () {
                    _this._evaluateAndDisplayTours();
                }, CHECK_INTERVAL_MS);
                _this._evaluateAndDisplayTours();
            }
        };
        this.nextStep = function () {
            if (!_this._activeTour) {
                return;
            }
            var currentStep = _this._activeTour.steps[_this._currentStepIndex];
            _this._captureEvent('product tour step completed', {
                $product_tour_id: _this._activeTour.id,
                $product_tour_step_id: currentStep.id,
                $product_tour_step_order: _this._currentStepIndex,
            });
            if (_this._currentStepIndex < _this._activeTour.steps.length - 1) {
                _this._currentStepIndex++;
                _this._renderCurrentStep();
            }
            else {
                _this._completeTour();
            }
        };
        this.previousStep = function () {
            if (!_this._activeTour || _this._currentStepIndex === 0) {
                return;
            }
            _this._currentStepIndex--;
            _this._renderCurrentStep();
        };
        this.dismissTour = function (reason) {
            if (reason === void 0) { reason = 'user_clicked_skip'; }
            if (!_this._activeTour) {
                return;
            }
            var currentStep = _this._activeTour.steps[_this._currentStepIndex];
            _this._captureEvent('product tour dismissed', {
                $product_tour_id: _this._activeTour.id,
                $product_tour_step_id: currentStep.id,
                $product_tour_step_order: _this._currentStepIndex,
                $product_tour_dismiss_reason: reason,
            });
            storage_1.localStore._set("ph_product_tour_dismissed_".concat(_this._activeTour.id), true);
            _this._cleanup();
        };
        this._instance = instance;
    }
    ProductTourManager.prototype.start = function () {
        var _this = this;
        if (this._checkInterval) {
            return;
        }
        this._checkInterval = setInterval(function () {
            _this._evaluateAndDisplayTours();
        }, CHECK_INTERVAL_MS);
        this._evaluateAndDisplayTours();
        (0, utils_1.addEventListener)(document, 'visibilitychange', this._handleVisibilityChange);
    };
    ProductTourManager.prototype.stop = function () {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
            this._checkInterval = null;
        }
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
        this._removeAllTriggerListeners();
        this._cleanup();
    };
    ProductTourManager.prototype._evaluateAndDisplayTours = function () {
        var _this = this;
        var _a;
        // Use getProductTours (not getActiveProductTours) because trigger_selector tours
        // should work even if completed/dismissed
        (_a = this._instance.productTours) === null || _a === void 0 ? void 0 : _a.getProductTours(function (tours) {
            var e_1, _a;
            var _b;
            if (tours.length === 0) {
                _this._removeAllTriggerListeners();
                return;
            }
            var activeTriggerTourIds = new Set();
            try {
                for (var tours_1 = __values(tours), tours_1_1 = tours_1.next(); !tours_1_1.done; tours_1_1 = tours_1.next()) {
                    var tour = tours_1_1.value;
                    // Determine the trigger selector - explicit trigger_selector takes precedence,
                    // otherwise use conditions.selector for click-only tours (auto_launch=false)
                    var triggerSelector = tour.trigger_selector || (!tour.auto_launch ? (_b = tour.conditions) === null || _b === void 0 ? void 0 : _b.selector : null);
                    // Tours with a trigger selector: always attach listener
                    // These are "on-demand" tours that show when clicked
                    if (triggerSelector) {
                        activeTriggerTourIds.add(tour.id);
                        _this._manageTriggerSelectorListener(__assign(__assign({}, tour), { trigger_selector: triggerSelector }));
                    }
                    // Only auto-show if auto_launch is enabled
                    if (tour.auto_launch && !_this._activeTour && _this._isTourEligible(tour)) {
                        _this.showTour(tour);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (tours_1_1 && !tours_1_1.done && (_a = tours_1.return)) _a.call(tours_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            _this._triggerSelectorListeners.forEach(function (_a) {
                var tour = _a.tour;
                if (!activeTriggerTourIds.has(tour.id)) {
                    _this._removeTriggerSelectorListener(tour.id);
                }
            });
        });
    };
    ProductTourManager.prototype._isTourEligible = function (tour) {
        var _a;
        if (!checkTourConditions(tour)) {
            logger.info("Tour ".concat(tour.id, " failed conditions check"));
            return false;
        }
        var completedKey = "ph_product_tour_completed_".concat(tour.id);
        var dismissedKey = "ph_product_tour_dismissed_".concat(tour.id);
        if (storage_1.localStore._get(completedKey) || storage_1.localStore._get(dismissedKey)) {
            logger.info("Tour ".concat(tour.id, " already completed or dismissed"));
            return false;
        }
        if (tour.internal_targeting_flag_key) {
            var flagValue = (_a = this._instance.featureFlags) === null || _a === void 0 ? void 0 : _a.getFeatureFlag(tour.internal_targeting_flag_key);
            if (!flagValue) {
                logger.info("Tour ".concat(tour.id, " failed feature flag check: ").concat(tour.internal_targeting_flag_key));
                return false;
            }
        }
        return true;
    };
    ProductTourManager.prototype.showTour = function (tour, reason) {
        var e_2, _a;
        if (reason === void 0) { reason = 'auto'; }
        // Validate all step selectors before showing the tour
        // Steps without selectors are modal steps and don't need validation
        var selectorFailures = [];
        for (var i = 0; i < tour.steps.length; i++) {
            var step = tour.steps[i];
            // Skip validation for modal steps (no selector)
            if (!step.selector) {
                continue;
            }
            var result = (0, product_tours_utils_1.findElementBySelector)(step.selector);
            if (result.error === 'not_found' || result.error === 'not_visible') {
                selectorFailures.push({
                    stepIndex: i,
                    stepId: step.id,
                    selector: step.selector,
                    error: result.error,
                    matchCount: result.matchCount,
                });
            }
        }
        if (selectorFailures.length > 0) {
            try {
                // Emit events for each failed selector for debugging/data purposes
                for (var selectorFailures_1 = __values(selectorFailures), selectorFailures_1_1 = selectorFailures_1.next(); !selectorFailures_1_1.done; selectorFailures_1_1 = selectorFailures_1.next()) {
                    var failure = selectorFailures_1_1.value;
                    this._captureEvent('product tour step selector failed', {
                        $product_tour_id: tour.id,
                        $product_tour_step_id: failure.stepId,
                        $product_tour_step_order: failure.stepIndex,
                        $product_tour_step_selector: failure.selector,
                        $product_tour_error: failure.error,
                        $product_tour_matches_count: failure.matchCount,
                        $product_tour_failure_phase: 'validation',
                    });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (selectorFailures_1_1 && !selectorFailures_1_1.done && (_a = selectorFailures_1.return)) _a.call(selectorFailures_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            var failedSelectors = selectorFailures.map(function (f) { return "Step ".concat(f.stepIndex, ": \"").concat(f.selector, "\" (").concat(f.error, ")"); });
            logger.warn("Tour \"".concat(tour.name, "\" (").concat(tour.id, ") not shown: ").concat(selectorFailures.length, " selector(s) failed to match:\n  - ").concat(failedSelectors.join('\n  - ')));
            return;
        }
        this._activeTour = tour;
        this._currentStepIndex = 0;
        this._renderReason = reason;
        this._captureEvent('product tour shown', {
            $product_tour_id: tour.id,
            $product_tour_name: tour.name,
            $product_tour_iteration: tour.current_iteration || 1,
            $product_tour_render_reason: reason,
        });
        this._renderCurrentStep();
    };
    ProductTourManager.prototype.showTourById = function (tourId) {
        var _this = this;
        var _a;
        logger.info("showTourById(".concat(tourId, ")"));
        (_a = this._instance.productTours) === null || _a === void 0 ? void 0 : _a.getProductTours(function (tours) {
            var tour = tours.find(function (t) { return t.id === tourId; });
            if (tour) {
                logger.info("found tour: ", tour);
                _this.showTour(tour, 'api');
            }
            else {
                logger.info('could not find tour', tourId);
            }
        });
    };
    ProductTourManager.prototype._completeTour = function () {
        var _a;
        if (!this._activeTour) {
            return;
        }
        this._captureEvent('product tour completed', {
            $product_tour_id: this._activeTour.id,
            $product_tour_steps_count: this._activeTour.steps.length,
        });
        storage_1.localStore._set("ph_product_tour_completed_".concat(this._activeTour.id), true);
        this._instance.capture('$set', {
            $set: (_a = {},
                _a["$product_tour_completed/".concat(this._activeTour.id)] = true,
                _a),
        });
        this._cleanup();
    };
    ProductTourManager.prototype._renderCurrentStep = function () {
        if (!this._activeTour) {
            return;
        }
        var step = this._activeTour.steps[this._currentStepIndex];
        // Survey step - display the linked survey and listen for completion
        if (step.linkedSurveyId) {
            this._renderSurveyStep(step.linkedSurveyId);
            return;
        }
        // Modal step (no selector) - render without a target element
        if (!step.selector) {
            this._captureEvent('product tour step shown', {
                $product_tour_id: this._activeTour.id,
                $product_tour_step_id: step.id,
                $product_tour_step_order: this._currentStepIndex,
                $product_tour_step_type: 'modal',
            });
            this._renderTooltipWithPreact(null);
            return;
        }
        var result = (0, product_tours_utils_1.findElementBySelector)(step.selector);
        if (result.error === 'not_found' || result.error === 'not_visible') {
            this._captureEvent('product tour step selector failed', {
                $product_tour_id: this._activeTour.id,
                $product_tour_step_id: step.id,
                $product_tour_step_order: this._currentStepIndex,
                $product_tour_step_selector: step.selector,
                $product_tour_error: result.error,
                $product_tour_matches_count: result.matchCount,
                $product_tour_failure_phase: 'runtime',
            });
            logger.warn("Tour \"".concat(this._activeTour.name, "\" dismissed: element for step ").concat(this._currentStepIndex, " became unavailable (").concat(result.error, ")"));
            this.dismissTour('element_unavailable');
            return;
        }
        if (result.error === 'multiple_matches') {
            this._captureEvent('product tour step selector failed', {
                $product_tour_id: this._activeTour.id,
                $product_tour_step_id: step.id,
                $product_tour_step_order: this._currentStepIndex,
                $product_tour_step_selector: step.selector,
                $product_tour_error: result.error,
                $product_tour_matches_count: result.matchCount,
                $product_tour_failure_phase: 'runtime',
            });
            // Continue with first match for multiple_matches case
        }
        if (!result.element) {
            return;
        }
        var element = result.element;
        var metadata = (0, product_tours_utils_1.getElementMetadata)(element);
        this._captureEvent('product tour step shown', {
            $product_tour_id: this._activeTour.id,
            $product_tour_step_id: step.id,
            $product_tour_step_order: this._currentStepIndex,
            $product_tour_step_selector: step.selector,
            $product_tour_step_selector_found: true,
            $product_tour_step_element_tag: metadata.tag,
            $product_tour_step_element_id: metadata.id,
            $product_tour_step_element_classes: metadata.classes,
            $product_tour_step_element_text: metadata.text,
        });
        this._renderTooltipWithPreact(element);
    };
    ProductTourManager.prototype._renderTooltipWithPreact = function (element) {
        if (!this._activeTour) {
            return;
        }
        var step = this._activeTour.steps[this._currentStepIndex];
        var shadow = retrieveTourShadow(this._activeTour.id).shadow;
        (0, preact_1.render)((0, jsx_runtime_1.jsx)(ProductTourTooltip_1.ProductTourTooltip, { tour: this._activeTour, step: step, stepIndex: this._currentStepIndex, totalSteps: this._activeTour.steps.length, targetElement: element, onNext: this.nextStep, onPrevious: this.previousStep, onDismiss: this.dismissTour }), shadow);
    };
    ProductTourManager.prototype._renderSurveyStep = function (surveyId) {
        var _this = this;
        var _a;
        if (!this._activeTour) {
            return;
        }
        var step = this._activeTour.steps[this._currentStepIndex];
        // Emit tour step shown event
        this._captureEvent('product tour step shown', {
            $product_tour_id: this._activeTour.id,
            $product_tour_step_id: step.id,
            $product_tour_step_order: this._currentStepIndex,
            $product_tour_step_type: 'survey',
            $product_tour_linked_survey_id: surveyId,
        });
        // Clean up any existing survey event listener
        this._cleanupSurveyListener();
        // Set up listener for survey events
        this._surveyEventUnsubscribe = this._instance.on('eventCaptured', function (data) {
            var _a;
            var eventSurveyId = (_a = data.properties) === null || _a === void 0 ? void 0 : _a[posthog_surveys_types_1.SurveyEventProperties.SURVEY_ID];
            if (eventSurveyId !== surveyId) {
                return;
            }
            if (data.event === posthog_surveys_types_1.SurveyEventName.SENT) {
                logger.info("Survey ".concat(surveyId, " completed, advancing tour"));
                _this._cleanupSurveyListener();
                _this.nextStep();
            }
            else if (data.event === posthog_surveys_types_1.SurveyEventName.DISMISSED) {
                logger.info("Survey ".concat(surveyId, " dismissed, dismissing tour"));
                _this._cleanupSurveyListener();
                _this.dismissTour('user_clicked_skip');
            }
        });
        // Display the survey
        (_a = this._instance.surveys) === null || _a === void 0 ? void 0 : _a.displaySurvey(surveyId, {
            ignoreConditions: true,
            ignoreDelay: true,
            displayType: posthog_surveys_types_1.DisplaySurveyType.Popover,
        });
        logger.info("Displayed survey ".concat(surveyId, " for tour step ").concat(this._currentStepIndex));
    };
    ProductTourManager.prototype._cleanupSurveyListener = function () {
        var _a;
        (_a = this._surveyEventUnsubscribe) === null || _a === void 0 ? void 0 : _a.call(this);
        this._surveyEventUnsubscribe = null;
    };
    ProductTourManager.prototype._cleanup = function () {
        if (this._activeTour) {
            removeTourFromDom(this._activeTour.id);
        }
        this._cleanupSurveyListener();
        this._activeTour = null;
        this._currentStepIndex = 0;
        this._renderReason = 'auto';
    };
    ProductTourManager.prototype._manageTriggerSelectorListener = function (tour) {
        var _this = this;
        if (!tour.trigger_selector) {
            return;
        }
        var currentElement = document.querySelector(tour.trigger_selector);
        var existingListenerData = this._triggerSelectorListeners.get(tour.id);
        if (!currentElement) {
            if (existingListenerData) {
                this._removeTriggerSelectorListener(tour.id);
            }
            return;
        }
        if (existingListenerData) {
            if (currentElement !== existingListenerData.element) {
                logger.info("Trigger element changed for tour ".concat(tour.id, ". Re-attaching listener."));
                this._removeTriggerSelectorListener(tour.id);
            }
            else {
                return;
            }
        }
        if (!currentElement.hasAttribute(TRIGGER_LISTENER_ATTRIBUTE)) {
            var listener = function (event) {
                event.stopPropagation();
                if (_this._activeTour) {
                    logger.info("Tour ".concat(tour.id, " trigger clicked but another tour is active"));
                    return;
                }
                logger.info("Tour ".concat(tour.id, " triggered by click on ").concat(tour.trigger_selector));
                _this.showTour(tour, 'trigger');
            };
            (0, utils_1.addEventListener)(currentElement, 'click', listener);
            currentElement.setAttribute(TRIGGER_LISTENER_ATTRIBUTE, tour.id);
            this._triggerSelectorListeners.set(tour.id, { element: currentElement, listener: listener, tour: tour });
            logger.info("Attached trigger listener for tour ".concat(tour.id, " on ").concat(tour.trigger_selector));
        }
    };
    ProductTourManager.prototype._removeTriggerSelectorListener = function (tourId) {
        var existing = this._triggerSelectorListeners.get(tourId);
        if (existing) {
            existing.element.removeEventListener('click', existing.listener);
            existing.element.removeAttribute(TRIGGER_LISTENER_ATTRIBUTE);
            this._triggerSelectorListeners.delete(tourId);
            logger.info("Removed trigger listener for tour ".concat(tourId));
        }
    };
    ProductTourManager.prototype._removeAllTriggerListeners = function () {
        var _this = this;
        this._triggerSelectorListeners.forEach(function (_, tourId) {
            _this._removeTriggerSelectorListener(tourId);
        });
    };
    ProductTourManager.prototype._captureEvent = function (eventName, properties) {
        this._instance.capture(eventName, properties);
    };
    // Public API methods delegated from PostHogProductTours
    ProductTourManager.prototype.getActiveProductTours = function (callback) {
        var _this = this;
        var _a;
        (_a = this._instance.productTours) === null || _a === void 0 ? void 0 : _a.getProductTours(function (tours, context) {
            if (!(context === null || context === void 0 ? void 0 : context.isLoaded)) {
                callback([], context);
                return;
            }
            var activeTours = tours.filter(function (tour) { return _this._isTourEligible(tour); });
            callback(activeTours, context);
        });
    };
    ProductTourManager.prototype.resetTour = function (tourId) {
        storage_1.localStore._remove("ph_product_tour_completed_".concat(tourId));
        storage_1.localStore._remove("ph_product_tour_dismissed_".concat(tourId));
    };
    ProductTourManager.prototype.resetAllTours = function () {
        var storage = window === null || window === void 0 ? void 0 : window.localStorage;
        if (!storage) {
            return;
        }
        var keysToRemove = [];
        for (var i = 0; i < storage.length; i++) {
            var key = storage.key(i);
            if ((key === null || key === void 0 ? void 0 : key.startsWith('ph_product_tour_completed_')) || (key === null || key === void 0 ? void 0 : key.startsWith('ph_product_tour_dismissed_'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(function (key) { return storage_1.localStore._remove(key); });
    };
    return ProductTourManager;
}());
exports.ProductTourManager = ProductTourManager;
//# sourceMappingURL=product-tours.js.map