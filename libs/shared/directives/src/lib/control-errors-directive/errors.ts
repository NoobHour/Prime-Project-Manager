import { InjectionToken } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

export const defaultErrors = {
  // built-in validators
  required: (required) => `This field is required`,
  number: (number) => `This field must be a valid number`,
  email: (email) => `This field must be a valid email`,
  minlength: ({ requiredLength, actualLength }) =>
    `Expect minimum ${requiredLength} character(s) but got ${actualLength}`,
  maxlength: ({ requiredLength, actualLength }) =>
    `Expect maximum ${requiredLength} character(s) but got ${actualLength}`,
  pattern: ({ requiredPattern, actualValue }) =>
    `Expect ${requiredPattern} pattern but got ${actualValue}`,
  max: ({ max, actual }) => `Expect maximum value is ${max} but got ${actual}`,
  min: ({ min, actual }) => `Expect minimum value is ${min} but got ${actual}`,

  // custom validators
  digits: (digits) => `This field only allow digits`,
  arrayLength: ({ minLength }) =>
    `This field only allow minimun ${minLength} item(s)' array`,
  base64: (base64) => `This field only allow base 64 format string`,
  creditCard: (creditCard) => `This field must be a valid credit card number`,
  date: (date) => `This field must be a valid date`,
  dateISO: (dateISO) => `This field must be a valid ISO date`,
  equal: ({ value }) => `This field must be equal "${value}"`,
  notEqual: ({ value }) => `This field must be not equal "${value}"`,
  equalTo: ({ control, value }) =>
    `This field value must be equal to "${getFormControlName(control)}" field`,
  notEqualTo: ({ control, value }) =>
    `This field value must not be equal to "${getFormControlName(control)}" field`,
  gt: ({ value }) => `This field value must be greater than "${value}"`,
  gte: ({ value }) =>
    `This field value must be greater than or equal "${value}"`,
  lt: ({ value }) => `This field value must be less than "${value}"`,
  lte: ({ value }) => `This field value must be less than or equal "${value}"`,
  includedIn: ({ value, reason }) =>
    `This field has value "${value}", which is not included in "${reason}"`,
  notIncludedIn: ({ value, reason }) =>
    `This field must not has a value included in "${reason}"`,
  json: (json) => `This field value is in invalid json format`,
  notMatching: ({ value, reason }) =>
    `This field value must not match "${reason}" pattern`,
  hasProperty: ({ value }) => `This field value not has property "${value}"`,
  range: ({ value }) => `This field value is not in the range "${value}"`,
  url: (value) => `This field value is an invalid url`,
  uuid: (value) => `This field value is an invalid uuid`,
  rangeLength: ({ value }) =>
    `This field value has length is not in the range "${value}"`,
  maxDate: ({ value, control, error }) => {
    if (!control && !value && error) {
      return `${error}`;
    }

    if (!control && value && !error) {
      return `This field only allow maximum date is ${value}`;
    }

    if (control && !value && !error) {
      return `This field has maximum date is the value of field "${getFormControlName(control)}"`;
    }

    if (control && value && !error) {
      return `This field has maximum date is the value of field "${getFormControlName(control)}" (${value})`;
    }
  },
  minDate: ({ value, control, error }) => {
    if (!control && !value && error) {
      return `${error}`;
    }

    if (!control && value && !error) {
      return `This field only allow minimum date is ${value}`;
    }

    if (control && !value && !error) {
      return `This field has minimum date is the value of field "${getFormControlName(control)}"`;
    }

    if (control && value && !error) {
      return `This field has minimum date is the value of field "${getFormControlName(control)}" (${value})`;
    }
  },
};

export const FORM_ERRORS = new InjectionToken('FORM_ERRORS', {
  providedIn: 'root',
  factory: () => defaultErrors,
});

/** Accepts a form control; returns its key in the parent group, or null when it cannot be found. */
function getFormControlName(control: AbstractControl): string | null {
  let controlParent = control.parent;
  if (!controlParent || !(controlParent instanceof FormGroup)) {
    return null;
  }

  for (let controlName of Object.keys(controlParent.controls)) {
    if (control === controlParent.controls[controlName]) {
      return controlName;
    }
  }

  return null;
}
