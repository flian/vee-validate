import Config from './config';
import Validator from './core/componentValidator';
import { isObject, isBuiltInComponent } from './core/utils';

// @flow

/**
 * Checks if a parent validator instance was requested.
 */
const requestsValidator = (injections: Object | string[]) => {
  if (isObject(injections) && injections.$validator) {
    return true;
  }

  return false;
};

export default {
  provide () {
    if (this.$validator && !isBuiltInComponent(this.$vnode)) {
      return {
        $validator: this.$validator
      };
    }

    return {};
  },
  beforeCreate () {
    // if built in do nothing.
    if (isBuiltInComponent(this.$vnode)) {
      return;
    }

    // if its a root instance set the config if it exists.
    if (!this.$parent) {
      Config.merge(this.$options.$_veeValidate || {});
    }

    const options = Config.resolve(this);
    const Vue = this.$options._base; // the vue constructor.

    // if its a root instance, inject anyways, or if it requested a new instance.
    if (!this.$parent || (this.$options.$_veeValidate && /new/.test(this.$options.$_veeValidate.validator))) {
      this.$validator = new Validator(Config.dependency('validator'), this);
    }

    const requested = requestsValidator(this.$options.inject);

    // if automatic injection is enabled and no instance was requested.
    if (! this.$validator && options.inject && !requested) {
      this.$validator = new Validator(Config.dependency('validator'), this);
    }

    // don't inject errors or fieldBag as no validator was resolved.
    if (! requested && ! this.$validator) {
      return;
    }

    // There is a validator but it isn't injected, mark as reactive.
    if (! requested && this.$validator) {
      Vue.util.defineReactive(this.$validator, 'errors', this.$validator.errors);
      Vue.util.defineReactive(this.$validator, 'flags', this.$validator.flags);
    }

    if (! this.$options.computed) {
      this.$options.computed = {};
    }

    this.$options.computed[options.errorBagName || 'errors'] = function errorBagGetter () {
      return this.$validator.errors;
    };
    this.$options.computed[options.fieldsBagName || 'fields'] = function fieldBagGetter () {
      return this.$validator.flags;
    };
  }
};
