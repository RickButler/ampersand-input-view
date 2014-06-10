var domify = require('domify');
var dom = require('ampersand-dom');


// can be overwritten by anything with:
// <input>, <label> and <the same `role` attributes
var template = [
    '<label>',
        '<span role="label"></span>',
        '<input>',
        '<div role="message-container" class="message message-below message-error">',
            '<p role="message-text"></p>',
        '</div>',
    '</label>'
].join('');


function TextInputView(opts) {
    if (!opts.name) throw new Error('must pass in a name');

    // settings
    this.name = opts.name;
    this.value = opts.value || '';
    this.originalValue = opts.value || '';
    this.el = opts.el;
    this.template = opts.template || template;
    this.placeholder = opts.placeholder || '';
    this.label = opts.label || '';
    this.type = opts.type || 'text';
    this.required = (typeof opts.required === 'boolean') ? opts.required : true;
    this.validClass = opts.validClass || 'input-valid';
    this.invalidClass = opts.invalidClass || 'input-invalid';
    this.requiredMessage = opts.requiredMessage || 'This field is required.';
    this.valid = false;
    this.parent = opts.parent;

    // render right away
    this.render();

    // add our event handlers
    this.handleBlur = this.handleBlur.bind(this);
    this.handleInputChanged = this.handleInputChanged.bind(this);
    this.input.addEventListener('blur', this.handleBlur, false);
    this.input.addEventListener('input', this.handleInputChanged, false);

    // tests for validity
    this.tests = opts.tests || [];

    this.checkValid();
}

// remove and destroy element
TextInputView.prototype.remove = function () {
    this.input.removeEventListener('input', this.handleInputChanged, false);
    this.input.removeEventListener('blur', this.handleBlur, false);
    var parent = this.el.parentNode;
    if (parent) parent.removeChild(this.el);
};

// handle input events and show appropriate errors
TextInputView.prototype.handleInputChanged = function () {
    // track whether user has edited directly
    if (document.activeElement === this.input) this.directlyEdited = true;
    this.value = this.input.value;
    this.edited = true;
    this.runTests();
    if (this.parent) this.parent.update(this);
};

// Expose a method for explicitly setting the value
TextInputView.prototype.setValue = function (value, runValidation) {
    this.input.value = value;
    this.handleInputChanged();
};

// set the error message if exists
// hides the message container entirely otherwise
TextInputView.prototype.setMessage = function (message) {
    var input = this.input;
    this.message = message;
    // there is an error
    if (message && this.hasBeenValid) {
        this.messageContainer.style.display = 'block';
        this.messageEl.textContent = message;
        dom.addClass(input, this.invalidClass);
        dom.removeClass(input, this.validClass);
    } else {
        this.messageContainer.style.display = 'none';
        if (this.hasBeenValid && this.edited) {
            dom.addClass(input, this.validClass);
            dom.removeClass(input, this.invalidClass);
        }
    }
};

// this is so we don't throw validation errors while typing
TextInputView.prototype.handleBlur = function () {
    if (this.value) {
        if (this.edited) this.hasBeenValid = true;
        this.runTests();
    }
};

TextInputView.prototype.beforeSubmit = function () {
    this.hasBeenValid = true;
    this.edited = true;
    this.runTests();
};

TextInputView.prototype.checkValid = function () {
    var message = '';
    if (this.required && !this.value) {
        message = this.requiredMessage;
    } else {
        this.tests.some(function (test) {
            message = test.call(this, this.value);
            return message;
        }, this);
    }
    this.valid = !message;
    return message;
};

// runs tests and sets first failure as message
TextInputView.prototype.runTests = function () {
    var message = this.checkValid();
    if (!message) this.hasBeenValid = true;
    this.setMessage(message);
};

// expose option to set type dynamically, this
// can be useful in mobile situations where you
// may want a password field to be visible
TextInputView.prototype.setInputType = function (type) {
    if (type) this.type = type;
    this.input.setAttribute('type', this.type);
};

// very `manual` render to avoid dependencies
TextInputView.prototype.render = function () {
    // only allow this to be called once
    if (this.rendered) return;
    var newDom = domify(this.template);
    var parent = this.el && this.el.parentNode;
    if (parent) parent.replaceChild(newDom, this.el);
    this.el = newDom;
    this.input = this.el.querySelector('input');
    if (this.type === 'textarea') {
        var parent = this.input.parentNode;
        var textarea = document.createElement('textarea');
        parent.replaceChild(textarea, this.input);
        this.input = textarea;
    }
    this.labelEl = this.el.querySelector('[role=label]');
    this.messageContainer = this.el.querySelector('[role=message-container]');
    this.messageEl = this.el.querySelector('[role=message-text]');
    this.setInputType();
    this.setMessage(this.message);
    if (this.required) this.input.required = true;
    this.input.setAttribute('placeholder', this.placeholder);
    this.input.value = this.value;
    this.labelEl.textContent = this.label;
    this.rendered = true;
};

module.exports = TextInputView;
