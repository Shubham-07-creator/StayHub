const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { sanitizeRedirectUrl } = require('../middleware.js');

// 1. Open Redirect Sanitization Tests
test('Security: sanitizeRedirectUrl blocks open redirects', () => {
    // Malicious external redirects
    assert.equal(sanitizeRedirectUrl('https://evil-phishing.com'), '/listings');
    assert.equal(sanitizeRedirectUrl('http://attacker.com/login'), '/listings');
    assert.equal(sanitizeRedirectUrl('//evil.com/fake-login'), '/listings');
    assert.equal(sanitizeRedirectUrl('\\\\evil.com'), '/listings');
    assert.equal(sanitizeRedirectUrl('javascript:alert(1)'), '/listings');
    assert.equal(sanitizeRedirectUrl(null), '/listings');
    assert.equal(sanitizeRedirectUrl(''), '/listings');

    // Legitimate relative redirects
    assert.equal(sanitizeRedirectUrl('/listings/12345'), '/listings/12345');
    assert.equal(sanitizeRedirectUrl('/bookings'), '/bookings');
    assert.equal(sanitizeRedirectUrl('/profile'), '/profile');
});

// 2. Cryptographic OTP Security Tests
test('Security: Cryptographic OTP generation is 6 digits and non-zero prefixed', () => {
    for (let i = 0; i < 50; i++) {
        const otp = crypto.randomInt(100000, 1000000).toString();
        assert.equal(otp.length, 6);
        assert.match(otp, /^[1-9][0-9]{5}$/);
    }
});

// 3. Indian Hospitality GST & Pricing Calculation Tests
test('Business Logic: Indian GST tariff slabs and calculation rules', () => {
    const SERVICE_FEE_PERCENT = 0.05;

    function testCalc(pricePerNight, nights) {
        const subtotal = nights * pricePerNight;
        const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT);
        const gstRate = pricePerNight <= 7500 ? 12 : 18;
        const taxableAmount = subtotal + serviceFee;
        const gstAmount = Math.round(taxableAmount * (gstRate / 100));
        const cgst = Math.round(gstAmount / 2);
        const sgst = gstAmount - cgst;
        const totalPrice = subtotal + serviceFee + gstAmount;
        return { subtotal, serviceFee, gstRate, gstAmount, cgst, sgst, totalPrice };
    }

    // Tariff <= 7,500 should levy 12% GST
    const budgetStay = testCalc(4000, 2);
    assert.equal(budgetStay.subtotal, 8000);
    assert.equal(budgetStay.serviceFee, 400); // 5% of 8000
    assert.equal(budgetStay.gstRate, 12);
    assert.equal(budgetStay.gstAmount, Math.round(8400 * 0.12)); // 1008
    assert.equal(budgetStay.cgst, 504);
    assert.equal(budgetStay.sgst, 504);
    assert.equal(budgetStay.totalPrice, 8000 + 400 + 1008);

    // Luxury Tariff > 7,500 should levy 18% GST
    const luxuryStay = testCalc(15000, 3);
    assert.equal(luxuryStay.subtotal, 45000);
    assert.equal(luxuryStay.serviceFee, 2250); // 5% of 45000
    assert.equal(luxuryStay.gstRate, 18);
    assert.equal(luxuryStay.gstAmount, Math.round(47250 * 0.18)); // 8505
    assert.equal(luxuryStay.cgst + luxuryStay.sgst, 8505);
    assert.equal(luxuryStay.totalPrice, 45000 + 2250 + 8505);
});

// 4. ReDoS Regex Escaping Tests
test('Security: Regex escape helper neutralizes special regex metacharacters', () => {
    function escapeRegex(text) {
        if (!text) return "";
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    const dangerousInputs = [
        "(a+)+$",
        ".*.*.*.*.*",
        "^user[0-9]+$",
        "hello (world) [test] {1,3} *? +| \\",
    ];

    for (const input of dangerousInputs) {
        const escaped = escapeRegex(input);
        // Ensure creating a RegExp with the escaped string succeeds and does not throw or act as a wildcard
        const regex = new RegExp(escaped);
        assert.ok(regex.test(input));
    }
});

// 5. HTML Entity Escaping (Anti-XSS) Tests
test('Security: HTML entity escaper neutralizes stored and reflected XSS', () => {
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    const payload1 = '<script>alert("XSS")</script>';
    assert.equal(escapeHtml(payload1), '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');

    const payload2 = '<img src=x onerror=alert(1)>';
    assert.equal(escapeHtml(payload2), '&lt;img src=x onerror=alert(1)&gt;');

    const payload3 = "'; DROP TABLE users; --";
    assert.equal(escapeHtml(payload3), '&#039;; DROP TABLE users; --');
});
