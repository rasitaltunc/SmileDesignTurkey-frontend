import { PostHog } from './posthog-core';
import { ProductTourCallback } from './posthog-product-tours-types';
import { RemoteConfig } from './types';
export declare class PostHogProductTours {
    private _instance;
    private _cachedTours;
    private _productTourManager;
    private _isProductToursEnabled?;
    private _isInitializing;
    constructor(instance: PostHog);
    onRemoteConfig(response: RemoteConfig): void;
    loadIfEnabled(): void;
    private _completeInitialization;
    getProductTours(callback: ProductTourCallback, forceReload?: boolean): void;
    getActiveProductTours(callback: ProductTourCallback): void;
    showProductTour(tourId: string): void;
    dismissProductTour(): void;
    nextStep(): void;
    previousStep(): void;
    clearCache(): void;
    resetTour(tourId: string): void;
    resetAllTours(): void;
}
