class Validation {
  startValidateConstraints(jsonObj, constraints) {
    // v1.1;
    let validationError = null;
    const keys = Object.keys(constraints);
    for (var i = 0; i < keys.length; i++) {
      validationError = this.validate(jsonObj, constraints[keys[i]], keys[i]);
      if (validationError) {
        return validationError;
      }
    }
  }

  isDateValue(value) {
    //var ans = (value instanceof Date) && !isNaN(value);

    try {
      if (Object.prototype.toString.call(value) === "[object Date]") {
        // it is a date
        if (!isNaN(value)) {
          // d.getTime() or d.valueOf() will also work
          return true;
        }
      } else {
        // not a date object

        const regex = new RegExp(this.REGEX_DATE);
        const regexResult = value.match(regex);
        return regexResult !== null;
      }
    } catch (ex) {
      // console.log("error validating date value ", value, ex);
      return false;
    }
  }

  validate(obj, constraint, key) {
    let validationError = null;

    const objectValue = obj[key];
    if (constraint.isRequired) {
      if (!objectValue) {
        return {
          key,
          isRequired: true,
        };
      }
    }
    
    if (constraint.type === "number") {
      if (constraint.isRequired || (constraint.isOptional && objectValue)) {
        if (typeof objectValue !== "number") {
          return {
            key,
            type: {
              expected: "number",
              actually: typeof objectValue,
            },
          };
        }
        if (constraint.minV) {
          if (objectValue < parseInt(constraint.minV)) {
            return {
              key,
              minValue: constraint.minV,
            };
          }
        }
        if (constraint.maxV) {
          if (objectValue > parseInt(constraint.maxV)) {
            return {
              key,
              maxValue: constraint.maxV,
            };
          }
        }
      }
    }

    if (constraint.type === "string") {
      if (constraint.isRequired || (constraint.isOptional && objectValue)) {
        if (typeof objectValue !== "string") {
          return {
            key,
            type: {
              expected: "string",
              actually: typeof objectValue,
            },
          };
        }
        if (constraint.minL) {
          if (objectValue.length < constraint.minL) {
            return {
              key,
              minLength: constraint.minL,
            };
          }
        }
        if (constraint.maxL) {
          if (objectValue.length > constraint.maxL) {
            return {
              key,
              maxLength: constraint.maxL,
            };
          }
        }
        if (constraint.regex) {
          const regex = new RegExp(constraint.regex);
          const regexResult = objectValue.match(regex);
          if (!regexResult) {
            return {
              key,
              regex: false,
            };
          }
        }
      }
    }

    // 
    if (constraint.type === "date") {
      if (constraint.isRequired || (constraint.isOptional && objectValue)) {
        const isDateValueValid = this.isDateValue(objectValue);
        if (!isDateValueValid) {
          return {
            key,
            isValidDate: false,
          };
        }
      }
    }

    if (constraint.type === "boolean") {
      if (constraint.isRequired || (constraint.isOptional && objectValue)) {
        if (typeof objectValue !== "boolean") {
          return {
            key,
            type: {
              expected: "boolean",
              actually: typeof objectValue,
            },
          };
        }
      }
    }

    if (constraint.root) {
      return this.startValidateConstraints(objectValue, constraint.root);
    }

    return null;
  }
}

module.exports = new Validation();
