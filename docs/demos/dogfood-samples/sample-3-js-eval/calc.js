// Sample 3 — JS with eval() and zero validation (expected security signal)
function calculate(input) {
    return eval(input);   // user input → eval is a classic XSS / RCE vector
}

function divide(a, b) {
    return a / b;          // no zero-check
}

module.exports = { calculate, divide };
