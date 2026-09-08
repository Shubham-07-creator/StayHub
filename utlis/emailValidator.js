const dns = require('dns').promises;

/**
 * Checks whether an email's domain actually exists and can receive mail,
 * by looking up its MX (Mail Exchange) DNS records.
 * This does NOT send any email — it's a pure DNS lookup, so it works fine
 * even on hosts (like Render's free tier) that block outbound SMTP.
 *
 * Catches fake/typo domains (e.g. "gnail.com", "asdasd123.com")
 * but cannot confirm the specific mailbox belongs to the signer-upper.
 */
async function isRealEmailDomain(email) {
    const domain = email.split('@')[1];
    if (!domain) return false;

    try {
        const mxRecords = await dns.resolveMx(domain);
        return Array.isArray(mxRecords) && mxRecords.length > 0;
    } catch (err) {
        // No MX records found, or domain doesn't exist at all
        return false;
    }
}

module.exports = { isRealEmailDomain };